import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isAdmin = user?.role === 'admin';
  const isFreelancer = user?.role === 'freelancer';
  const isClient = user?.role === 'client';

  // Browse Gigs is the client-facing entry point. Freelancers and admins have
  // their own tools in the nav, so the marketplace link would only be noise
  // for them. Logged-out visitors still see it — it is the public landing
  // page. Freelancers can still reach /gigs by direct URL; this only hides
  // the nav item, it does not block the route.
  const showBrowseGigs = !user || isClient;

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <nav className="navbar">
      <Link to="/gigs" className="navbar-brand">
        Hustle<span>Hub+</span>
      </Link>

      <div className="navbar-links">
        {showBrowseGigs && <Link to="/gigs">Browse Gigs</Link>}

        {isClient && <Link to="/bookings">My Bookings</Link>}

        {isFreelancer && (
          <>
            <Link to="/my-gigs">My Gigs</Link>
            <Link to="/freelancer-bookings">Bookings Received</Link>
            <Link to="/income">Income</Link>
          </>
        )}

        {isAdmin && (
          <Link to="/admin" className="navbar-admin-link">
            Admin
          </Link>
        )}

        {user ? (
          <>
            <span className="navbar-user">{user.name}</span>
            <button className="navbar-logout" onClick={handleLogout}>
              Log out
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Log in</Link>
            <Link to="/register" className="navbar-cta">Sign up</Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;