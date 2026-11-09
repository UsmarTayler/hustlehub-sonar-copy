import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  listGigs,
  updateGigStatus,
  deleteGigAdmin,
} from '../../services/adminService';
import StatusBadge from '../../components/StatusBadge';
import ConfirmModal from '../../components/ConfirmModal';
import './AdminGigs.css';

const STATUS_OPTIONS = ['active', 'booked', 'completed', 'inactive'];
const PAGE_SIZE = 20;

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function AdminGigs() {
  const [gigs, setGigs] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rowError, setRowError] = useState({});
  const [busyId, setBusyId] = useState(null);

  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, search]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const params = { page, limit: PAGE_SIZE };
        if (statusFilter) params.status = statusFilter;
        if (search) params.search = search;

        const response = await listGigs(params);
        if (cancelled) return;

        setGigs(response.data || []);
        setPages(response.pages || 1);
        setTotal(response.total || 0);
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
              'Unable to load gigs right now.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [page, statusFilter, search]);

  async function handleStatusChange(gig, nextStatus) {
    if (nextStatus === gig.status) return;
    setBusyId(gig._id);
    setRowError((prev) => ({ ...prev, [gig._id]: '' }));

    const previousStatus = gig.status;
    setGigs((prev) =>
      prev.map((g) => (g._id === gig._id ? { ...g, status: nextStatus } : g))
    );

    try {
      const response = await updateGigStatus(gig._id, nextStatus);
      const updated = response.data;
      if (updated) {
        setGigs((prev) =>
          prev.map((g) => (g._id === gig._id ? { ...g, ...updated } : g))
        );
      }
    } catch (err) {
      setGigs((prev) =>
        prev.map((g) =>
          g._id === gig._id ? { ...g, status: previousStatus } : g
        )
      );
      setRowError((prev) => ({
        ...prev,
        [gig._id]:
          err.response?.data?.message || 'Could not update this gig.',
      }));
    } finally {
      setBusyId(null);
    }
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    setRowError((prev) => ({ ...prev, [pendingDelete._id]: '' }));
    try {
      await deleteGigAdmin(pendingDelete._id);
      setGigs((prev) => prev.filter((g) => g._id !== pendingDelete._id));
      setTotal((t) => Math.max(0, t - 1));
      setPendingDelete(null);
    } catch (err) {
      setRowError((prev) => ({
        ...prev,
        [pendingDelete._id]:
          err.response?.data?.message || 'Could not delete this gig.',
      }));
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    setSearch(searchInput.trim());
  }

  function clearFilters() {
    setSearchInput('');
    setSearch('');
    setStatusFilter('');
  }

  const hasFilters = search || statusFilter;

  return (
    <div className="admin-gigs">
      <header className="admin-gigs-header">
        <div>
          <h2>Gigs</h2>
          <p className="admin-gigs-subtext">
            All listings across the marketplace. Change a gig's status, or
            delete it if it has no active bookings.
          </p>
        </div>
        <span className="admin-gigs-count">
          {total} {total === 1 ? 'gig' : 'gigs'}
        </span>
      </header>

      <form className="admin-gigs-filters" onSubmit={handleSearchSubmit}>
        <div className="admin-filter-field grow">
          <label htmlFor="gig-search">Search</label>
          <input
            id="gig-search"
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Title or freelancer name"
            maxLength={100}
          />
        </div>

        <div className="admin-filter-field">
          <label htmlFor="gig-status-filter">Status</label>
          <select
            id="gig-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="admin-filter-actions">
          <button type="submit" className="admin-btn primary">
            Search
          </button>
          {hasFilters && (
            <button
              type="button"
              className="admin-btn ghost"
              onClick={clearFilters}
            >
              Clear
            </button>
          )}
        </div>
      </form>

      {loading && <p className="admin-gigs-loading">Loading gigs…</p>}
      {error && <p className="error-text">{error}</p>}

      {!loading && !error && gigs.length === 0 && (
        <p className="empty-state">
          {hasFilters ? 'No gigs match those filters.' : 'No gigs yet.'}
        </p>
      )}

      {!loading && !error && gigs.length > 0 && (
        <>
          <ul className="admin-gigs-list">
            {gigs.map((gig) => {
              const busy = busyId === gig._id;

              return (
                <li key={gig._id} className="admin-gig-row">
                  <div className="admin-gig-main">
                    <div className="admin-gig-title-row">
                      <Link
                        to={`/gigs/${gig._id}`}
                        className="admin-gig-title"
                      >
                        {gig.title}
                      </Link>
                      <StatusBadge status={gig.status} />
                    </div>

                    <p className="admin-gig-meta">
                      <span className="admin-gig-category">
                        {gig.category}
                      </span>
                      <span className="admin-gig-dot">·</span>
                      <span className="admin-gig-price">R{gig.price}</span>
                      <span className="admin-gig-dot">·</span>
                      <span>
                        by {gig.freelancerName || 'Freelancer'}
                      </span>
                      {gig.createdAt && (
                        <>
                          <span className="admin-gig-dot">·</span>
                          <span>{formatDate(gig.createdAt)}</span>
                        </>
                      )}
                    </p>

                    {rowError[gig._id] && (
                      <p className="error-text">{rowError[gig._id]}</p>
                    )}
                  </div>

                  <div className="admin-gig-actions">
                    <div className="admin-inline-field">
                      <label
                        htmlFor={`gig-status-${gig._id}`}
                        className="admin-inline-label"
                      >
                        Status
                      </label>
                      <select
                        id={`gig-status-${gig._id}`}
                        value={gig.status}
                        onChange={(e) =>
                          handleStatusChange(gig, e.target.value)
                        }
                        disabled={busy}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      className="admin-btn danger"
                      onClick={() => setPendingDelete(gig)}
                      disabled={busy}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          {pages > 1 && (
            <div className="admin-pagination">
              <button
                type="button"
                className="admin-btn ghost"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
              >
                ← Prev
              </button>
              <span className="admin-page-indicator">
                Page {page} of {pages}
              </span>
              <button
                type="button"
                className="admin-btn ghost"
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page >= pages || loading}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      <ConfirmModal
        open={!!pendingDelete}
        title="Delete this gig?"
        message={
          pendingDelete ? (
            <>
              <strong>{pendingDelete.title}</strong> by{' '}
              {pendingDelete.freelancerName || 'Freelancer'} will be
              permanently removed. This is refused if the gig has any
              pending or confirmed bookings — mark it inactive instead.
            </>
          ) : null
        }
        confirmLabel="Delete gig"
        cancelLabel="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
        busy={deleting}
      />
    </div>
  );
}

export default AdminGigs;