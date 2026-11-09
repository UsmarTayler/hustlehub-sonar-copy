import { useState, useEffect } from 'react';
import {
  getFreelancerBookings,
  updateBookingStatus,
} from '../services/gigService';
import StatusBadge from '../components/StatusBadge';
import './FreelancerBookings.css';

const STATUS_OPTIONS = ['pending', 'confirmed', 'completed', 'cancelled'];

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

function FreelancerBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rowError, setRowError] = useState({}); // { [bookingId]: message }
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchBookings() {
      try {
        const response = await getFreelancerBookings();
        if (!cancelled) setBookings(response.data || []);
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
    fetchBookings();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleStatusChange(booking, nextStatus) {
    if (nextStatus === booking.status) return;

    setUpdatingId(booking._id);
    setRowError((prev) => ({ ...prev, [booking._id]: '' }));

    // Optimistic update: keep the previous value so we can revert on error.
    const previousStatus = booking.status;
    setBookings((prev) =>
      prev.map((b) =>
        b._id === booking._id ? { ...b, status: nextStatus } : b
      )
    );

    try {
      const response = await updateBookingStatus(booking._id, nextStatus);
      // Server returns the canonical booking; sync in case anything
      // differs (e.g. timestamps the schema added).
      const updated = response.data;
      if (updated) {
        setBookings((prev) =>
          prev.map((b) => (b._id === booking._id ? updated : b))
        );
      }
    } catch (err) {
      // Revert on failure.
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
      setUpdatingId(null);
    }
  }

  return (
    <div className="freelancer-bookings-page">
      <header className="freelancer-bookings-header">
        <h1>Bookings received</h1>
        <p className="freelancer-bookings-subtext">
          Clients who have booked your gigs. Update a booking’s status as
          the work progresses.
        </p>
      </header>

      {loading && <p>Loading bookings…</p>}
      {error && <p className="error-text">{error}</p>}

      {!loading && !error && bookings.length === 0 && (
        <p className="empty-state">
          No bookings yet — once a client books one of your gigs it will
          appear here.
        </p>
      )}

      {!loading && !error && bookings.length > 0 && (
        <ul className="freelancer-bookings-list">
          {bookings.map((booking) => {
            const gigTitle =
              booking.gigDetails?.title || 'Gig no longer available';
            const busy = updatingId === booking._id;

            return (
              <li key={booking._id} className="freelancer-booking-row">
                <div className="freelancer-booking-main">
                  <div className="freelancer-booking-title-row">
                    <h3>{gigTitle}</h3>
                    <StatusBadge status={booking.status} />
                  </div>

                  <p className="freelancer-booking-meta">
                    <span className="meta-label">Client:</span>{' '}
                    <span>{booking.clientName}</span>
                    <span className="meta-dot">·</span>
                    <span className="meta-label">Booked:</span>{' '}
                    <span>{formatDate(booking.bookingDate)}</span>
                    <span className="meta-dot">·</span>
                    <span className="meta-label">Amount:</span>{' '}
                    <span className="freelancer-booking-amount">
                      R{booking.amount}
                    </span>
                  </p>

                  {booking.message && (
                    <p className="freelancer-booking-message">
                      “{booking.message}”
                    </p>
                  )}

                  {rowError[booking._id] && (
                    <p className="error-text">{rowError[booking._id]}</p>
                  )}
                </div>

                <div className="freelancer-booking-actions">
                  <label
                    htmlFor={`status-${booking._id}`}
                    className="status-label"
                  >
                    Status
                  </label>
                  <select
                    id={`status-${booking._id}`}
                    value={booking.status}
                    onChange={(e) =>
                      handleStatusChange(booking, e.target.value)
                    }
                    disabled={busy}
                    className="status-select"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </option>
                    ))}
                  </select>
                  {busy && <span className="status-saving">Saving…</span>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default FreelancerBookings;