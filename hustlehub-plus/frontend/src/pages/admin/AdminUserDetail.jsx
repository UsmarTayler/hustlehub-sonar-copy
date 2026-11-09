import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  getUser,
  updateUserRole,
  updateUserStatus,
  deleteUser,
} from '../../services/adminService';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/StatusBadge';
import ConfirmModal from '../../components/ConfirmModal';
import './AdminUserDetail.css';

const ROLE_OPTIONS = ['client', 'freelancer', 'admin'];
const STATUS_OPTIONS = ['active', 'suspended', 'banned'];

function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function AdminUserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [userRow, setUserRow] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  const [pendingDelete, setPendingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      setNotFound(false);
      try {
        const response = await getUser(id);
        if (cancelled) return;
        setUserRow(response.data.user);
        setStats(response.data.stats || null);
      } catch (err) {
        if (cancelled) return;
        if (err.response?.status === 404) {
          setNotFound(true);
        } else {
          setError(
            err.response?.data?.message ||
              'Unable to load this user right now.'
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
  }, [id]);

  const isSelf = userRow && currentUser && String(currentUser.id) === String(userRow._id);

  async function handleRoleChange(nextRole) {
    if (!userRow || nextRole === userRow.role) return;
    setBusy(true);
    setActionError('');

    const previousRole = userRow.role;
    setUserRow((prev) => ({ ...prev, role: nextRole }));

    try {
      const response = await updateUserRole(userRow._id, nextRole);
      if (response.data) setUserRow((prev) => ({ ...prev, ...response.data }));
    } catch (err) {
      setUserRow((prev) => ({ ...prev, role: previousRole }));
      setActionError(
        err.response?.data?.message || 'Could not update this user.'
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleStatusChange(nextStatus) {
    if (!userRow || nextStatus === userRow.status) return;
    setBusy(true);
    setActionError('');

    const previousStatus = userRow.status;
    setUserRow((prev) => ({ ...prev, status: nextStatus }));

    try {
      const response = await updateUserStatus(userRow._id, nextStatus);
      if (response.data) setUserRow((prev) => ({ ...prev, ...response.data }));
    } catch (err) {
      setUserRow((prev) => ({ ...prev, status: previousStatus }));
      setActionError(
        err.response?.data?.message || 'Could not update this user.'
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmDelete() {
    if (!userRow) return;
    setDeleting(true);
    setActionError('');
    try {
      await deleteUser(userRow._id);
      setPendingDelete(false);
      navigate('/admin/users');
    } catch (err) {
      setActionError(
        err.response?.data?.message || 'Could not delete this user.'
      );
      setPendingDelete(false);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return <p className="admin-user-detail-loading">Loading user…</p>;
  }

  if (notFound) {
    return (
      <div className="admin-user-detail-status">
        <span className="admin-user-detail-code">404</span>
        <h1>User not found</h1>
        <p className="admin-user-detail-text">
          This account may have been deleted, or the link is incorrect.
        </p>
        <Link to="/admin/users" className="admin-btn primary">
          Back to users
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-user-detail-status">
        <h1>Something went wrong</h1>
        <p className="admin-user-detail-text">{error}</p>
        <Link to="/admin/users" className="admin-btn primary">
          Back to users
        </Link>
      </div>
    );
  }

  if (!userRow) return null;

  return (
    <div className="admin-user-detail">
      <Link to="/admin/users" className="admin-user-detail-back">
        ← Back to users
      </Link>

      <section className="admin-user-detail-card">
        <header className="admin-user-detail-header">
          <div>
            <div className="admin-user-detail-title-row">
              <h1>{userRow.name}</h1>
              <StatusBadge status={userRow.status} />
              {isSelf && <span className="admin-self-badge">You</span>}
            </div>
            <p className="admin-user-detail-email">{userRow.email}</p>
          </div>
        </header>

        <dl className="admin-user-detail-meta">
          <div className="detail-row">
            <dt>Role</dt>
            <dd>{userRow.role}</dd>
          </div>
          <div className="detail-row">
            <dt>Status</dt>
            <dd>{userRow.status}</dd>
          </div>
          <div className="detail-row">
            <dt>Joined</dt>
            <dd>{formatDateTime(userRow.createdAt)}</dd>
          </div>
          <div className="detail-row">
            <dt>Last updated</dt>
            <dd>{formatDateTime(userRow.updatedAt)}</dd>
          </div>
        </dl>
      </section>

      {stats && (
        <section className="admin-user-detail-card">
          <h2 className="admin-user-detail-section-title">Activity counts</h2>
          <p className="admin-user-detail-section-subtext">
            Totals only. Individual gigs and bookings are not shown here.
          </p>
          <div className="admin-user-detail-stats">
            <div className="admin-stat-card">
              <span className="admin-stat-label">Gigs</span>
              <span className="admin-stat-value">{stats.gigCount}</span>
            </div>
            <div className="admin-stat-card">
              <span className="admin-stat-label">Bookings</span>
              <span className="admin-stat-value">{stats.bookingCount}</span>
            </div>
          </div>
        </section>
      )}

      <section className="admin-user-detail-card">
        <h2 className="admin-user-detail-section-title">Actions</h2>

        {isSelf && (
          <p className="admin-user-detail-warning">
            You cannot change your own role, status or delete your own
            account.
          </p>
        )}

        <div className="admin-user-detail-actions">
          <div className="admin-inline-field">
            <label htmlFor="detail-role" className="admin-inline-label">
              Role
            </label>
            <select
              id="detail-role"
              value={userRow.role}
              onChange={(e) => handleRoleChange(e.target.value)}
              disabled={busy || isSelf}
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-inline-field">
            <label htmlFor="detail-status" className="admin-inline-label">
              Status
            </label>
            <select
              id="detail-status"
              value={userRow.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={busy || isSelf}
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
            onClick={() => setPendingDelete(true)}
            disabled={busy || isSelf}
          >
            Delete user
          </button>
        </div>

        {actionError && <p className="error-text">{actionError}</p>}
      </section>

      <ConfirmModal
        open={pendingDelete}
        title="Delete this user?"
        message={
          <>
            <strong>{userRow.name}</strong> ({userRow.email}) will be
            permanently removed. This is refused if the user still has gigs
            or bookings — ban instead in that case.
          </>
        }
        confirmLabel="Delete user"
        cancelLabel="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(false)}
        busy={deleting}
      />
    </div>
  );
}

export default AdminUserDetail;