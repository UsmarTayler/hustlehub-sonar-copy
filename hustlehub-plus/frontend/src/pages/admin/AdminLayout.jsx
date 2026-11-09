import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './AdminLayout.css';


const TABS = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/activity', label: 'Activity' },
  { to: '/admin/gigs', label: 'Gigs' },
  { to: '/admin/bookings', label: 'Bookings' },
];

function AdminLayout() {
  const { user } = useAuth();

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div className="admin-header-text">
          <span className="admin-eyebrow">Admin</span>
          <h1>Control centre</h1>
          <p className="admin-subtext">
            {user?.name ? `Signed in as ${user.name}. ` : ''}
            Manage users, monitor activity and keep the marketplace tidy.
          </p>
        </div>
      </header>

      <nav className="admin-tabs" aria-label="Admin sections">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `admin-tab ${isActive ? 'active' : ''}`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}

export default AdminLayout;