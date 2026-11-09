import { Link, useLocation } from 'react-router-dom';
import './NotFound.css';

function NotFound() {
  const location = useLocation();

  return (
    <div className="not-found-page">
      <div className="not-found-card">
        <span className="not-found-code">404</span>
        <h1>Page not found</h1>
        <p className="not-found-subtext">
          We couldn’t find <span className="not-found-path">{location.pathname}</span>.
          The link may be broken, or the page may have been moved.
        </p>

        <div className="not-found-actions">
          <Link to="/gigs" className="not-found-btn primary">
            Browse gigs
          </Link>
          <Link to="/" className="not-found-btn secondary">
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default NotFound;