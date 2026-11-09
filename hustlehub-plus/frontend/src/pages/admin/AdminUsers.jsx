import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  listUsers,
  updateUserRole,
  updateUserStatus,
  deleteUser,
} from '../../services/adminService';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/StatusBadge';
import ConfirmModal from '../../components/ConfirmModal';
import './AdminUsers.css';

const ROLE_OPTIONS = ['client', 'freelancer', 'admin'];
const STATUS_OPTIONS = ['active', 'suspended', 'banned'];
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

function AdminUsers() {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rowError, setRowError] = useState({}); // { [id]: message }
  const [busyId, setBusyId] = useState(null);

  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Any change to filters resets to page 1, otherwise the user can end up
  // looking at page 4 of a 1-page result and seeing nothing.
  useEffect(() => {
    setPage(1);
  }, [search, roleFilter, statusFilter]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const params = { page, limit: PAGE_SIZE };
        if (search) params.search = search;
        if (roleFilter) params.role = roleFilter;
        if (statusFilter) params.status = statusFilter;

        const response = await listUsers(params);
        if (cancelled) return;

        setUsers(response.data || []);
        setPages(response.pages || 1);
        setTotal(response.total || 0);
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
              'Unable to load users right now.'
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
  }, [page, search, roleFilter, statusFilter]);

  function isSelf(userRow) {
    return currentUser && String(currentUser.id) === String(userRow._id);
  }

  function isLastAdminCandidate(userRow) {
    // Client-side hint only. The backend is the source of truth and will
    // refuse the action, but disabling the control avoids a pointless 400.
    if (userRow.role !== 'admin' || userRow.status !== 'active') return false;
    const activeAdmins = users.filter(
      (u) => u.role === 'admin' && u.status === 'active'
    );
    return activeAdmins.length <= 1;
  }

  async function handleRoleChange(userRow, nextRole) {
    if (nextRole === userRow.role) return;
    setBusyId(userRow._id);
    setRowError((prev) => ({ ...prev, [userRow._id]: '' }));

    const previousRole = userRow.role;
    setUsers((prev) =>
      prev.map((u) => (u._id === userRow._id ? { ...u, role: nextRole } : u))
    );

    try {
      const response = await updateUserRole(userRow._id, nextRole);
      const updated = response.data;
      if (updated) {
        setUsers((prev) =>
          prev.map((u) => (u._id === userRow._id ? { ...u, ...updated } : u))
        );
      }
    } catch (err) {
      setUsers((prev) =>
        prev.map((u) =>
          u._id === userRow._id ? { ...u, role: previousRole } : u
        )
      );
      setRowError((prev) => ({
        ...prev,
        [userRow._id]:
          err.response?.data?.message || 'Could not update this user.',
      }));
    } finally {
      setBusyId(null);
    }
  }

  async function handleStatusChange(userRow, nextStatus) {
    if (nextStatus === userRow.status) return;
    setBusyId(userRow._id);
    setRowError((prev) => ({ ...prev, [userRow._id]: '' }));

    const previousStatus = userRow.status;
    setUsers((prev) =>
      prev.map((u) =>
        u._id === userRow._id ? { ...u, status: nextStatus } : u
      )
    );

    try {
      const response = await updateUserStatus(userRow._id, nextStatus);
      const updated = response.data;
      if (updated) {
        setUsers((prev) =>
          prev.map((u) => (u._id === userRow._id ? { ...u, ...updated } : u))
        );
      }
    } catch (err) {
      setUsers((prev) =>
        prev.map((u) =>
          u._id === userRow._id ? { ...u, status: previousStatus } : u
        )
      );
      setRowError((prev) => ({
        ...prev,
        [userRow._id]:
          err.response?.data?.message || 'Could not update this user.',
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
      await deleteUser(pendingDelete._id);
      setUsers((prev) => prev.filter((u) => u._id !== pendingDelete._id));
      setTotal((t) => Math.max(0, t - 1));
      setPendingDelete(null);
    } catch (err) {
      setRowError((prev) => ({
        ...prev,
        [pendingDelete._id]:
          err.response?.data?.message || 'Could not delete this user.',
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
    setRoleFilter('');
    setStatusFilter('');
  }

  const hasFilters = search || roleFilter || statusFilter;

  return (
    <div className="admin-users">
      <header className="admin-users-header">
        <div>
          <h2>Users</h2>
          <p className="admin-users-subtext">
            Change roles, suspend or ban accounts, and remove users who have
            no gigs or bookings.
          </p>
        </div>
        <span className="admin-users-count">
          {total} {total === 1 ? 'user' : 'users'}
        </span>
      </header>

      <form className="admin-users-filters" onSubmit={handleSearchSubmit}>
        <div className="admin-filter-field grow">
          <label htmlFor="admin-search">Search</label>
          <input
            id="admin-search"
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Name or email"
            maxLength={100}
          />
        </div>

        <div className="admin-filter-field">
          <label htmlFor="admin-role-filter">Role</label>
          <select
            id="admin-role-filter"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">All</option>
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="admin-filter-field">
          <label htmlFor="admin-status-filter">Status</label>
          <select
            id="admin-status-filter"
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

      {loading && <p className="admin-users-loading">Loading users…</p>}
      {error && <p className="error-text">{error}</p>}

      {!loading && !error && users.length === 0 && (
        <p className="empty-state">
          {hasFilters
            ? 'No users match those filters.'
            : 'No users yet.'}
        </p>
      )}

      {!loading && !error && users.length > 0 && (
        <>
          <ul className="admin-users-list">
            {users.map((userRow) => {
              const self = isSelf(userRow);
              const lastAdmin = isLastAdminCandidate(userRow);
              const busy = busyId === userRow._id;

              return (
                <li key={userRow._id} className="admin-user-row">
                  <div className="admin-user-main">
                    <div className="admin-user-title-row">
                      <Link
                        to={`/admin/users/${userRow._id}`}
                        className="admin-user-name"
                      >
                        {userRow.name}
                      </Link>
                      <StatusBadge status={userRow.status} />
                      {self && (
                        <span className="admin-self-badge">You</span>
                      )}
                    </div>

                    <p className="admin-user-meta">
                      <span className="admin-user-email">{userRow.email}</span>
                      <span className="admin-user-dot">·</span>
                      <span>Joined {formatDate(userRow.createdAt)}</span>
                    </p>

                    {rowError[userRow._id] && (
                      <p className="error-text">{rowError[userRow._id]}</p>
                    )}
                  </div>

                  <div className="admin-user-actions">
                    <div className="admin-inline-field">
                      <label
                        htmlFor={`role-${userRow._id}`}
                        className="admin-inline-label"
                      >
                        Role
                      </label>
                      <select
                        id={`role-${userRow._id}`}
                        value={userRow.role}
                        onChange={(e) =>
                          handleRoleChange(userRow, e.target.value)
                        }
                        disabled={busy || self || lastAdmin}
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r} value={r}>
                            {r.charAt(0).toUpperCase() + r.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="admin-inline-field">
                      <label
                        htmlFor={`status-${userRow._id}`}
                        className="admin-inline-label"
                      >
                        Status
                      </label>
                      <select
                        id={`status-${userRow._id}`}
                        value={userRow.status}
                        onChange={(e) =>
                          handleStatusChange(userRow, e.target.value)
                        }
                        disabled={busy || self || lastAdmin}
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
                      onClick={() => setPendingDelete(userRow)}
                      disabled={busy || self}
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
        title="Delete this user?"
        message={
          pendingDelete ? (
            <>
              <strong>{pendingDelete.name}</strong> ({pendingDelete.email})
              will be permanently removed. This is refused if the user still
              has gigs or bookings — ban instead in that case.
            </>
          ) : null
        }
        confirmLabel="Delete user"
        cancelLabel="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
        busy={deleting}
      />
    </div>
  );
}

export default AdminUsers;