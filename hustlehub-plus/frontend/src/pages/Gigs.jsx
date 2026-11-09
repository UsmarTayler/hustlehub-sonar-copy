import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllGigs } from '../services/gigService';
import './Gigs.css';

function formatRand(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return 'R—';
  return `R${n.toLocaleString('en-ZA', { maximumFractionDigits: 2 })}`;
}

function Gigs() {
  const [gigs, setGigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function fetchGigs() {
      try {
        const response = await getAllGigs();
        if (!cancelled) setGigs(response.data || []);
      } catch {
        if (!cancelled) {
          setError('Unable to load gigs right now. Please try again shortly.');
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

  return (
    <div className="gigs-page">
      <h1>Browse Gigs</h1>
      <p className="gigs-subtext">
        Find the right freelancer for your next project.
      </p>

      {loading && <p className="gigs-subtext">Loading gigs…</p>}
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && gigs.length === 0 && (
        <p className="empty-state">No gigs available yet. Check back soon.</p>
      )}

      <div className="gigs-grid">
        {gigs.map((gig) => {
          const freelancer =
            gig.freelancerName || gig.freelancer?.name || 'Freelancer';

          return (
            <Link
              key={gig._id}
              to={`/gigs/${gig._id}`}
              className="gig-card-link"
            >
              <article className="gig-card">
                <div className="gig-card-top">
                  <h3 className="gig-title">{gig.title}</h3>
                  <span className="gig-price">{formatRand(gig.price)}</span>
                </div>

                {gig.category && (
                  <span className="gig-category">{gig.category}</span>
                )}

                <p className="gig-description">{gig.description}</p>

                <footer className="gig-card-footer">
                  <span className="gig-offered-label">Offered by</span>
                  <span className="gig-freelancer">{freelancer}</span>
                </footer>
              </article>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default Gigs;