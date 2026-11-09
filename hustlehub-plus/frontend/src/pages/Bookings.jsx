import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMyBookings } from '../services/gigService';
import StatusBadge from '../components/StatusBadge';
import './Bookings.css';

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

// Client-only page. Freelancers have their own view at /freelancer-bookings.
function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function fetchBookings() {
      try {
        const response = await getMyBookings();
        if (!cancelled) setBookings(response.data || []);
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
              'Unable to load bookings right now. Please try again shortly.'
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

  return (
    <div className="bookings-page">
      <h1>My Bookings</h1>
      <p className="bookings-subtext">Gigs you have booked so far.</p>

      {loading && <p>Loading bookings…</p>}
      {error && <p className="error-text">{error}</p>}

      {!loading && !error && bookings.length === 0 && (
        <p className="empty-state">
          You haven't booked any gigs yet.{' '}
          <Link to="/gigs">Browse the marketplace</Link>.
        </p>
      )}

      {!loading && !error && bookings.length > 0 && (
        <ul className="bookings-list">
          {bookings.map((booking) => {
            const gigTitle =
              booking.gigDetails?.title || 'Gig no longer available';
            return (
              <li key={booking._id} className="booking-row">
                <div>
                  <h3>{gigTitle}</h3>
                  <p className="booking-meta">
                    by {booking.freelancerName || 'Freelancer'}
                    {booking.bookingDate && (
                      <> · {formatDate(booking.bookingDate)}</>
                    )}
                  </p>
                </div>
                <div className="booking-right">
                  <span className="booking-price">R{booking.amount}</span>
                  <StatusBadge status={booking.status} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default Bookings;