import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getGigById, createBooking } from '../services/gigService';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/ConfirmModal';
import StatusBadge from '../components/StatusBadge';
import './GigDetail.css';

function GigDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [gig, setGig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);

  // Booking form state
  const [bookingDate, setBookingDate] = useState('');
  const [message, setMessage] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function fetchGig() {
      try {
        const response = await getGigById(id);
        if (!cancelled) setGig(response.data);
      } catch (err) {
        if (cancelled) return;
        // Distinguish "this gig does not exist" from "something went
        // wrong on our side". The backend returns 404 with
        // { success: false, message: 'Gig not found' }.
        if (err.response?.status === 404) {
          setNotFound(true);
        } else {
          setError(
            err.response?.data?.message ||
              'Unable to load this gig right now.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchGig();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // The freelancer who owns the gig should not be able to book it —
  // the backend rejects this with a 403, so we hide the form up front.
  const isOwner = user && gig && String(user.id) === String(gig.freelancerId);
  const canBook = !!user && !isOwner && gig && gig.status === 'active';

  function openConfirm(e) {
    e.preventDefault();
    setBookingError('');
    setShowConfirm(true);
  }

  async function handleConfirmBooking() {
    setSubmitting(true);
    setBookingError('');
    try {
      const payload = { gigId: gig._id };
      if (bookingDate)
        payload.bookingDate = new Date(bookingDate).toISOString();
      if (message) payload.message = message;

      const response = await createBooking(payload);
      const bookingId = response.data.booking._id;
      navigate(`/booking/success/${bookingId}`, {
        state: { transaction: response.data.transaction },
      });
    } catch (err) {
      setBookingError(
        err.response?.data?.message ||
          'Booking failed. Please try again.'
      );
      setShowConfirm(false);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p className="gig-detail-loading">Loading gig…</p>;
  }

  if (notFound) {
    return (
      <div className="gig-detail-page">
        <div className="gig-detail-status-card">
          <span className="gig-detail-status-code">404</span>
          <h1>Gig not found</h1>
          <p className="gig-detail-status-text">
            This gig may have been removed, or the link is incorrect.
          </p>
          <Link to="/gigs" className="gig-detail-status-btn">
            Back to marketplace
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="gig-detail-page">
        <div className="gig-detail-status-card">
          <h1>Something went wrong</h1>
          <p className="gig-detail-status-text">{error}</p>
          <Link to="/gigs" className="gig-detail-status-btn">
            Back to marketplace
          </Link>
        </div>
      </div>
    );
  }

  if (!gig) return null;

  return (
    <div className="gig-detail-page">
      <Link to="/gigs" className="gig-detail-back">
        ← Back to marketplace
      </Link>

      <div className="gig-detail-grid">
        <section className="gig-detail-main">
          <div className="gig-detail-header">
            <h1>{gig.title}</h1>
            <span className="gig-detail-price">R{gig.price}</span>
          </div>

          <div className="gig-detail-meta">
            <StatusBadge status={gig.status} />
            <span className="gig-detail-category">{gig.category}</span>
            <span className="gig-detail-duration">{gig.duration}</span>
          </div>

          <p className="gig-detail-description">{gig.description}</p>

          <div className="gig-detail-freelancer">
            <span className="gig-detail-label">Offered by</span>
            <span className="gig-detail-freelancer-name">
              {gig.freelancerName || 'Freelancer'}
            </span>
          </div>
        </section>

        <aside className="gig-detail-aside">
          {!user && (
            <div className="gig-detail-cta-card">
              <h2>Want this gig?</h2>
              <p>Log in or create an account to book it.</p>
              <Link to="/login" className="gig-detail-cta-btn">
                Log in to book
              </Link>
            </div>
          )}

          {user && isOwner && (
            <div className="gig-detail-cta-card">
              <h2>Your gig</h2>
              <p>You can’t book your own listing.</p>
              <Link to="/my-gigs" className="gig-detail-cta-btn">
                Manage my gigs
              </Link>
            </div>
          )}

          {user && !isOwner && gig.status !== 'active' && (
            <div className="gig-detail-cta-card">
              <h2>Not available</h2>
              <p>This gig is currently {gig.status}.</p>
            </div>
          )}

          {canBook && (
            <div className="gig-detail-cta-card">
              <h2>Book this gig</h2>
              <p className="gig-detail-cta-price">
                You’ll be charged <strong>R{gig.price}</strong> on
                confirmation.
              </p>

              <form onSubmit={openConfirm}>
                <div className="form-field">
                  <label htmlFor="bookingDate">
                    Preferred date (optional)
                  </label>
                  <input
                    id="bookingDate"
                    type="date"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="message">
                    Message to freelancer (optional)
                  </label>
                  <textarea
                    id="message"
                    rows="3"
                    maxLength={1000}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Share any details about the work you need."
                  />
                </div>

                {bookingError && (
                  <p className="error-text">{bookingError}</p>
                )}

                <button type="submit" className="submit-btn">
                  Book for R{gig.price}
                </button>
              </form>
            </div>
          )}
        </aside>
      </div>

      <ConfirmModal
        open={showConfirm}
        title="Confirm booking"
        message={
          <>
            Confirm <strong>R{gig.price}</strong> for {gig.title}?
          </>
        }
        confirmLabel={`Pay R${gig.price}`}
        cancelLabel="Cancel"
        onConfirm={handleConfirmBooking}
        onCancel={() => setShowConfirm(false)}
        busy={submitting}
      />
    </div>
  );
}

export default GigDetail;