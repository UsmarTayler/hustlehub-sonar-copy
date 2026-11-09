import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './ProtectedRoute.css';

function ProtectedRoute({ children, requiredRole }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <p className="protected-loading">Loading…</p>;
  }

  if (!user) {
    return (
      <Navigate to="/login" replace state={{ from: location.pathname }} />
    );
  }

  // Admin is treated as a superset of every role, mirroring the backend
  // authorize() middleware.
  if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
    return (
      <div className="protected-denied">
        <h1>Not authorised</h1>
        <p>You need a {requiredRole} account to view this page.</p>
      </div>
    );
  }

  return children;
}

export default ProtectedRoute;