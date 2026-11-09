import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerUser } from '../services/authService';
import './AuthLayout.css';
import HubGraphic from '../components/HubGraphic';

function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'client',
  });
  const [errors, setErrors] = useState([]);
  const [generalError, setGeneralError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors([]);
    setGeneralError('');
    setLoading(true);

    try {
      await registerUser(
        formData.name,
        formData.email,
        formData.password,
        formData.role
      );
      navigate('/login', { state: { registered: true } });
    } catch (err) {
      const response = err.response?.data;
      if (response?.errors) {
        setErrors(response.errors);
      } else if (response?.message) {
        setGeneralError(response.message);
      } else {
        setGeneralError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  function fieldError(fieldName) {
    return errors.find((err) => err.field === fieldName)?.message;
  }

  return (
    <div className="auth-shell">
      <div className="auth-brand-panel">
        <div className="auth-brand-name">
          Hustle<span>Hub+</span>
        </div>
        <p className="auth-brand-tagline">
          Where your skills meet their <span className="accent">next client</span>.
        </p>
        <HubGraphic />
      </div>

      <div className="auth-form-panel">
        <div className="auth-form-card">
          <h1>Create your account</h1>
          <p className="auth-subtext">
            Join as a freelancer or client — takes less than a minute.
          </p>

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-field">
              <label htmlFor="name">Name</label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
              />
              {fieldError('name') && (
                <p className="error-text">{fieldError('name')}</p>
              )}
            </div>

            <div className="form-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
              />
              {fieldError('email') && (
                <p className="error-text">{fieldError('email')}</p>
              )}
            </div>

            <div className="form-field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
              />
              {fieldError('password') && (
                <p className="error-text">{fieldError('password')}</p>
              )}
            </div>

            {/* Role toggle. Values match the backend enum: the register
                validator only accepts 'client' or 'freelancer'. Admin is
                never offered here — the backend downgrades it silently. */}
            <fieldset className="role-fieldset">
              <legend>I'm joining as</legend>
              <div className="role-options">
                <label
                  className={`role-option ${
                    formData.role === 'client' ? 'selected' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value="client"
                    checked={formData.role === 'client'}
                    onChange={handleChange}
                  />
                  <span className="role-title">Client</span>
                  <span className="role-desc">I want to book gigs</span>
                </label>

                <label
                  className={`role-option ${
                    formData.role === 'freelancer' ? 'selected' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value="freelancer"
                    checked={formData.role === 'freelancer'}
                    onChange={handleChange}
                  />
                  <span className="role-title">Freelancer</span>
                  <span className="role-desc">I want to offer gigs</span>
                </label>
              </div>
              {fieldError('role') && (
                <p className="error-text">{fieldError('role')}</p>
              )}
            </fieldset>

            {generalError && <p className="error-text">{generalError}</p>}

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;