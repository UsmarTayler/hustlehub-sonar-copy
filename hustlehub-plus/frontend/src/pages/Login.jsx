import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { loginUser } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import HubGraphic from '../components/HubGraphic';
import './AuthLayout.css';

function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState([]);
  const [generalError, setGeneralError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const justRegistered = location.state?.registered;

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  function fieldError(fieldName) {
    return errors.find((err) => err.field === fieldName)?.message;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors([]);
    setGeneralError('');
    setLoading(true);

    try {
      const response = await loginUser(formData.email, formData.password);
      login(response.data.user, response.data.token);
      navigate('/gigs');
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

  return (
    <div className="auth-shell">
      <div className="auth-brand-panel">
        <div className="auth-brand-name">Hustle<span>Hub+</span></div>
        <p className="auth-brand-tagline">
          Pick up where you <span className="accent">left off</span>.
        </p>
        <HubGraphic />
      </div>

      <div className="auth-form-panel">
        <div className="auth-form-card">
          <h1>Welcome back</h1>
          <p className="auth-subtext">
            {justRegistered ? 'Account created — log in to continue.' : 'Log in to manage your gigs and bookings.'}
          </p>

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-field">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" value={formData.email} onChange={handleChange} />
              {fieldError('email') && <p className="error-text">{fieldError('email')}</p>}
            </div>

            <div className="form-field">
              <label htmlFor="password">Password</label>
              <input id="password" name="password" type="password" value={formData.password} onChange={handleChange} />
              {fieldError('password') && <p className="error-text">{fieldError('password')}</p>}
            </div>

            {generalError && <p className="error-text">{generalError}</p>}

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Logging in...' : 'Log in'}
            </button>
          </form>

          <p className="auth-switch">Don't have an account? <Link to="/register">Create one</Link></p>
        </div>
      </div>
    </div>
  );
}

export default Login;