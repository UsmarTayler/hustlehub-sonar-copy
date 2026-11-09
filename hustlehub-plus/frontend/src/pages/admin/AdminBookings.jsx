import { useState, useEffect } from 'react';
import {
  listBookings,
  updateBookingStatusAdmin,
  deleteBookingAdmin,
} from '../../services/adminService';
import StatusBadge from '../../components/StatusBadge';
import ConfirmModal from '../../components/ConfirmModal';
import './AdminBookings.css';

const STATUS_OPTIONS = ['pending', 'confirmed', 'completed', 'cancelled'];
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

function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rowError, setRowError] = useState({});
  const [busyId, setBusyId] = useState(null);

  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const params = { page, limit: PAGE_SIZE };
        if (statusFilter) params.status = statusFilter;

        const response = await listBookings(params);
        if (cancelled) return;

        setBookings(response.data || []);
        setPages(response.pages || 1);
        setTotal(response.total || 0);
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
              'Unable to load bookings right now.'
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
  }, [page, statusFilter]);

  async function handleStatusChange(booking, nextStatus) {
    if (nextStatus === booking.status) return;
    setBusyId(booking._id);
    setRowError((prev) => ({ ...prev, [booking._id]: '' }));

    const previousStatus = booking.status;
    setBookings((prev) =>
      prev.map((b) =>
        b._id === booking._id ? { ...b, status: nextStatus } : b
      )
    );

    try {
      const response = await updateBookingStatusAdmin(
        booking._id,
        nextStatus
      );
      const updated = response.data;
      if (updated) {
        setBookings((prev) =>
          prev.map((b) => (b._id === booking._id ? { ...b, ...updated } : b))
        );
      }
    } catch (err) {
      setBookings((prev) =>
        prev.map((b) =>
          b._id === booking._id ? { ...b, status: previousStatus } : b
        )
      );
      setRowError((prev) => ({
        ...prev,
        [booking._id]:
          err.response?.data?.message ||
          'Could not update this booking.',
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
      await deleteBookingAdmin(pendingDelete._id);
      setBookings((prev) => prev.filter((b) => b._id !== pendingDelete._id));
      setTotal((t) => Math.max(0, t - 1));
      setPendingDelete(null);
    } catch (err) {
      setRowError((prev) => ({
        ...prev,
        [pendingDelete._id]:
          err.response?.data?.message || 'Could not delete this booking.',
      }));
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="admin-bookings">
      <header className="admin-bookings-header">
        <div>
          <h2>Bookings</h2>
          <p className="admin-bookings-subtext">
            Every booking across the marketplace. Update a booking's status
            or remove it entirely.
          </p>
        </div>
        <span className="admin-bookings-count">
          {total} {total === 1 ? 'booking' : 'bookings'}
        </span>
      </header>

      <div className="admin-bookings-filters">
        <div className="admin-filter-field">
          <label htmlFor="booking-status-filter">Status</label>
          <select
            id="booking-status-filter"
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

        {statusFilter && (
          <div className="admin-filter-actions">
            <button
              type="button"
              className="admin-btn ghost"
              onClick={() => setStatusFilter('')}
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {loading && (
        <p className="admin-bookings-loading">Loading bookings…</p>
      )}
      {error && <p className="error-text">{error}</p>}

      {!loading && !error && bookings.length === 0 && (
        <p className="empty-state">
          {statusFilter
            ? 'No bookings match that status.'
            : 'No bookings yet.'}
        </p>
      )}

      {!loading && !error && bookings.length > 0 && (
        <>
          <ul className="admin-bookings-list">
            {bookings.map((booking) => {
              const busy = busyId === booking._id;

              return (
                <li key={booking._id} className="admin-booking-row">
                  <div className="admin-booking-main">
                    <div className="admin-booking-title-row">
                      <h3 className="admin-booking-title">
                        {booking.gigDetails?.title ||
                          'Gig no longer available'}
                      </h3>
                      <StatusBadge status={booking.status} />
                    </div>

                    <p className="admin-booking-meta">
                      <span className="admin-booking-party">
                        <span className="admin-booking-party-label">
                          Client:
                        </span>{' '}
                        {booking.clientName || 'Client'}
                      </span>
                      <span className="admin-booking-dot">·</span>
                      <span className="admin-booking-party">
                        <span className="admin-booking-party-label">
                          Freelancer:
                        </span>{' '}
                        {booking.freelancerName || 'Freelancer'}
                      </span>
                      <span className="admin-booking-dot">·</span>
                      <span className="admin-booking-amount">
                        R{booking.amount}
                      </span>
                      {booking.bookingDate && (
                        <>
                          <span className="admin-booking-dot">·</span>
                          <span>{formatDate(booking.bookingDate)}</span>
                        </>
                      )}
                    </p>

                    {booking.message && (
                      <p className="admin-booking-message">
                        “{booking.message}”
                      </p>
                    )}

                    {rowError[booking._id] && (
                      <p className="error-text">{rowError[booking._id]}</p>
                    )}
                  </div>

                  <div className="admin-booking-actions">
                    <div className="admin-inline-field">
                      <label
                        htmlFor={`booking-status-${booking._id}`}
                        className="admin-inline-label"
                      >
                        Status
                      </label>
                      <select
                        id={`booking-status-${booking._id}`}
                        value={booking.status}
                        onChange={(e) =>
                          handleStatusChange(booking, e.target.value)
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
                      onClick={() => setPendingDelete(booking)}
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
        title="Delete this booking?"
        message={
          pendingDelete ? (
            <>
              The booking for{' '}
              <strong>{pendingDelete.gigDetails?.title || 'this gig'}</strong>{' '}
              between {pendingDelete.clientName || 'the client'} and{' '}
              {pendingDelete.freelancerName || 'the freelancer'} will be
              permanently removed. This is a hard delete and cannot be
              undone.
            </>
          ) : null
        }
        confirmLabel="Delete booking"
        cancelLabel="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
        busy={deleting}
      />
    </div>
  );
}

export default AdminBookings;