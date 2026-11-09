import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getGigById, updateGig } from '../services/gigService';
import { useAuth } from '../context/AuthContext';
import GigForm from '../components/GigForm';
import './EditGig.css';

function EditGig() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [gig, setGig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchGig() {
      try {
        const response = await getGigById(id);
        if (cancelled) return;
        const fetched = response.data;
        // Only the owner can edit — the backend enforces this too, but
        // checking here avoids rendering a form that will always 403.
        if (
          user &&
          String(user.id) !== String(fetched.freelancerId) &&
          user.role !== 'admin'
        ) {
          setForbidden(true);
        } else {
          setGig(fetched);
        }
      } catch (err) {
        if (cancelled) return;
        const status = err.response?.status;
        if (status === 404) {
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
  }, [id, user]);

  async function handleUpdate(payload) {
    await updateGig(id, payload);
    navigate('/my-gigs');
  }

  if (loading) {
    return <p className="edit-gig-loading">Loading gig…</p>;
  }

  if (notFound) {
    return (
      <div className="edit-gig-page">
        <h1>Gig not found</h1>
        <p className="edit-gig-subtext">
          This gig may have been removed, or the link is incorrect.
        </p>
        <Link to="/my-gigs" className="edit-gig-back">
          ← Back to my gigs
        </Link>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="edit-gig-page">
        <h1>Not authorised</h1>
        <p className="edit-gig-subtext">
          You can only edit gigs you created.
        </p>
        <Link to="/my-gigs" className="edit-gig-back">
          ← Back to my gigs
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="edit-gig-page">
        <p className="error-text">{error}</p>
        <Link to="/my-gigs" className="edit-gig-back">
          ← Back to my gigs
        </Link>
      </div>
    );
  }

  if (!gig) return null;

  return (
    <div className="edit-gig-page">
      <Link to="/my-gigs" className="edit-gig-back">
        ← Back to my gigs
      </Link>

      <div className="edit-gig-card">
        <GigForm
          heading="Edit gig"
          subtext="Update the details of this listing. Changes go live immediately."
          submitLabel="Save changes"
          submittingLabel="Saving…"
          cancelTo="/my-gigs"
          initialValues={{
            title: gig.title,
            description: gig.description,
            price: gig.price,
            category: gig.category,
            duration: gig.duration || '',
          }}
          onSubmit={handleUpdate}
        />
      </div>
    </div>
  );
}

export default EditGig;