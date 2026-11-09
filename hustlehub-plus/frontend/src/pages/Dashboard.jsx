import { useState, useEffect } from 'react';
import { getMyGigs, createGig, deleteGig } from '../services/gigService';
import './Dashboard.css';

function Dashboard() {
  const [gigs, setGigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ title: '', description: '', price: '' });
  const [formErrors, setFormErrors] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  async function loadGigs() {
    try {
      const response = await getMyGigs();
      setGigs(response.data || []);
    } catch {
      setError('Unable to load your gigs right now.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGigs();
  }, []);

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  function fieldError(fieldName) {
    return formErrors.find((err) => err.field === fieldName)?.message;
  }

  async function handleCreateGig(e) {
    e.preventDefault();
    setFormErrors([]);
    setSubmitting(true);
    try {
      await createGig({ ...formData, price: Number(formData.price) });
      setFormData({ title: '', description: '', price: '' });
      loadGigs();
    } catch (err) {
      const response = err.response?.data;
      if (response?.errors) {
        setFormErrors(response.errors);
      } else {
        setFormErrors([{ field: 'general', message: response?.message || 'Could not create gig.' }]);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(gigId) {
    if (!confirm('Remove this gig listing?')) return;
    try {
      await deleteGig(gigId);
      setGigs(gigs.filter((g) => g.id !== gigId));
    } catch (err) {
      alert(err.response?.data?.message || 'Could not delete gig.');
    }
  }

  return (
    <div className="dashboard-page">
      <h1>Your Dashboard</h1>
      <p className="dashboard-subtext">Manage your listings and see what's coming in.</p>

      <div className="dashboard-grid">
        <section className="dashboard-card">
          <h2>Create a Gig</h2>
          <form onSubmit={handleCreateGig} noValidate>
            <div className="form-field">
              <label htmlFor="title">Title</label>
              <input id="title" name="title" value={formData.title} onChange={handleChange} />
              {fieldError('title') && <p className="error-text">{fieldError('title')}</p>}
            </div>

            <div className="form-field">
              <label htmlFor="description">Description</label>
              <textarea id="description" name="description" rows="3" value={formData.description} onChange={handleChange} />
              {fieldError('description') && <p className="error-text">{fieldError('description')}</p>}
            </div>

            <div className="form-field">
              <label htmlFor="price">Price (R)</label>
              <input id="price" name="price" type="number" min="0" value={formData.price} onChange={handleChange} />
              {fieldError('price') && <p className="error-text">{fieldError('price')}</p>}
            </div>

            {fieldError('general') && <p className="error-text">{fieldError('general')}</p>}

            <button type="submit" className="submit-btn" disabled={submitting}>
              {submitting ? 'Publishing...' : 'Publish Gig'}
            </button>
          </form>
        </section>

        <section className="dashboard-card">
          <h2>Your Listings</h2>
          {loading && <p>Loading...</p>}
          {error && <p className="error-text">{error}</p>}
          {!loading && !error && gigs.length === 0 && (
            <p className="empty-state">No gigs listed yet — create your first one.</p>
          )}
          <div className="my-gigs-list">
            {gigs.map((gig) => (
              <div key={gig.id} className="my-gig-row">
                <div>
                  <h3>{gig.title}</h3>
                  <span className="gig-price">R{gig.price}</span>
                </div>
                <button className="delete-btn" onClick={() => handleDelete(gig.id)}>Remove</button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default Dashboard;