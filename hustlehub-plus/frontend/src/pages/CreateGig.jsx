import { useNavigate, Link } from 'react-router-dom';
import { createGig } from '../services/gigService';
import GigForm from '../components/GigForm';
import './CreateGig.css';

function CreateGig() {
  const navigate = useNavigate();

  async function handleCreate(payload) {
    await createGig(payload);
    navigate('/my-gigs');
  }

  return (
    <div className="create-gig-page">
      <Link to="/my-gigs" className="create-gig-back">
        ← Back to my gigs
      </Link>

      <div className="create-gig-card">
        <GigForm
          heading="Create a gig"
          subtext="Describe what you offer, how long it takes, and what you charge."
          submitLabel="Publish gig"
          submittingLabel="Publishing…"
          cancelTo="/my-gigs"
          onSubmit={handleCreate}
        />
      </div>
    </div>
  );
}

export default CreateGig;