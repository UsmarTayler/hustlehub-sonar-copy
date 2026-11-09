import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMyGigs, deleteGig } from '../services/gigService';
import StatusBadge from '../components/StatusBadge';
import ConfirmModal from '../components/ConfirmModal';
import './MyGigs.css';

function MyGigs() {
  const [gigs, setGigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Confirm-delete state
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function fetchGigs() {
      try {
        const response = await getMyGigs();
        if (!cancelled) setGigs(response.data || []);
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
              'Unable to load your gigs right now.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchGigs();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteGig(pendingDelete._id);
      // Backend does a soft delete — the gig is returned with
      // status: 'inactive'. Update it in place rather than removing it,
      // so the freelancer can still see (and audit) the listing.
      setGigs((prev) =>
        prev.map((g) =>
          g._id === pendingDelete._id ? { ...g, status: 'inactive' } : g
        )
      );
      setPendingDelete(null);
    } catch (err) {
      setDeleteError(
        err.response?.data?.message || 'Could not delete this gig.'
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="my-gigs-page">
      <header className="my-gigs-header">
        <div>
          <h1>My Gigs</h1>
          <p className="my-gigs-subtext">
            Manage your listings and keep track of what’s live.
          </p>
        </div>
        <Link to="/gigs/create" className="my-gigs-create-btn">
          + Create gig
        </Link>
      </header>

      {loading && <p>Loading your gigs…</p>}
      {error && <p className="error-text">{error}</p>}

      {!loading && !error && gigs.length === 0 && (
        <p className="empty-state">
          You haven’t created any gigs yet —{' '}
          <Link to="/gigs/create">create your first one</Link>.
        </p>
      )}

      {!loading && !error && gigs.length > 0 && (
        <ul className="my-gigs-list">
          {gigs.map((gig) => (
            <li key={gig._id} className="my-gig-row">
              <div className="my-gig-main">
                <div className="my-gig-title-row">
                  <h3>{gig.title}</h3>
                  <StatusBadge status={gig.status} />
                </div>
                <p className="my-gig-meta">
                  <span className="my-gig-category">{gig.category}</span>
                  <span className="my-gig-dot">·</span>
                  <span className="my-gig-price">R{gig.price}</span>
                  {gig.duration && (
                    <>
                      <span className="my-gig-dot">·</span>
                      <span>{gig.duration}</span>
                    </>
                  )}
                </p>
              </div>

              <div className="my-gig-actions">
                {gig.status !== 'inactive' && (
                  <Link
                    to={`/gigs/${gig._id}/edit`}
                    className="my-gig-btn ghost"
                  >
                    Edit
                  </Link>
                )}
                <Link to={`/gigs/${gig._id}`} className="my-gig-btn ghost">
                  View
                </Link>
                {gig.status !== 'inactive' && (
                  <button
                    type="button"
                    className="my-gig-btn danger"
                    onClick={() => {
                      setDeleteError('');
                      setPendingDelete(gig);
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {deleteError && <p className="error-text">{deleteError}</p>}

      <ConfirmModal
        open={!!pendingDelete}
        title="Remove this gig?"
        message={
          pendingDelete ? (
            <>
              <strong>{pendingDelete.title}</strong> will be marked inactive
              and hidden from the marketplace. Existing bookings are not
              affected.
            </>
          ) : null
        }
        confirmLabel="Remove gig"
        cancelLabel="Keep it"
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
        busy={deleting}
      />
    </div>
  );
}

export default MyGigs;