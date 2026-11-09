import { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { getBookingById } from '../services/gigService';
import './BookingSuccess.css';

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

function BookingSuccess() {
  const { id } = useParams();
  const location = useLocation();

  
  const passedTransaction = location.state?.transaction || null;

  const [booking, setBooking] = useState(null);
  const [transaction, setTransaction] = useState(passedTransaction);
  const [gigDetails, setGigDetails] = useState(null);
  const [loading, setLoading] = useState(!passedTransaction);
  const [error, setError] = useState('');

  useEffect(() => {
    
    if (passedTransaction) return;

    let cancelled = false;
    async function fetchBooking() {
      try {
        const response = await getBookingById(id);
        if (cancelled) return;
        setBooking(response.data.booking);
        setTransaction(response.data.transaction);
        setGigDetails(response.data.gigDetails);
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
              'Unable to load this booking right now.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchBooking();
    return () => {
      cancelled = true;
    };
  }, [id, passedTransaction]);

  if (loading) {
    return <p className="booking-success-loading">Loading confirmation…</p>;
  }

  if (error) {
    return (
      <div className="booking-success-page">
        <p className="error-text">{error}</p>
        <Link to="/gigs" className="booking-success-link">
          ← Back to marketplace
        </Link>
      </div>
    );
  }

  
  const amount = transaction?.amount ?? booking?.amount;
  const gigTitle =
    gigDetails?.title ||
    booking?.gigDetails?.title ||
    'your gig';
  const txStatus = transaction?.status || 'completed';
  const txMethod = transaction?.paymentMethod || 'simulated';
  const txRef = transaction?._id
    ? `TXN-${String(transaction._id).slice(-8).toUpperCase()}`
    : '—';

  return (
    <div className="booking-success-page">
      <div className="booking-success-card">
        <div className="booking-success-icon" aria-hidden="true">✓</div>

        <h1>Booking confirmed</h1>
        <p className="booking-success-subtext">
          Your booking for <strong>{gigTitle}</strong> is confirmed.
        </p>

        <div className="booking-success-payment">
          Payment confirmed: R{amount}
        </div>

        <dl className="booking-success-details">
          <div className="detail-row">
            <dt>Amount</dt>
            <dd>R{amount}</dd>
          </div>
          <div className="detail-row">
            <dt>Payment method</dt>
            <dd>{txMethod}</dd>
          </div>
          <div className="detail-row">
            <dt>Payment status</dt>
            <dd>{txStatus}</dd>
          </div>
          <div className="detail-row">
            <dt>Transaction reference</dt>
            <dd className="mono">{txRef}</dd>
          </div>
          {booking?.bookingDate && (
            <div className="detail-row">
              <dt>Booking date</dt>
              <dd>{formatDate(booking.bookingDate)}</dd>
            </div>
          )}
          {booking?.status && (
            <div className="detail-row">
              <dt>Booking status</dt>
              <dd>{booking.status}</dd>
            </div>
          )}
        </dl>

        <div className="booking-success-actions">
          <Link to="/bookings" className="booking-success-btn primary">
            View my bookings
          </Link>
          <Link to="/gigs" className="booking-success-btn secondary">
            Back to marketplace
          </Link>
        </div>
      </div>
    </div>
  );
}

export default BookingSuccess;