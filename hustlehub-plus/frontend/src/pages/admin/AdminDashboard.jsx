import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDashboardStats } from '../../services/adminService';
import './AdminDashboard.css';


function humaniseAction(action) {
  if (!action) return 'Activity';
  const parts = String(action).split('.');
  const last = parts[parts.length - 1] || action;
  return last
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StatCard({ label, value, accent }) {
  return (
    <div className={`admin-stat-card ${accent ? 'accent' : ''}`}>
      <span className="admin-stat-label">{label}</span>
      <span className="admin-stat-value">{value ?? 0}</span>
    </div>
  );
}

function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await getDashboardStats();
        if (!cancelled) setStats(response.data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
              'Unable to load dashboard stats right now.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <p className="admin-loading">Loading dashboard…</p>;
  }

  if (error) {
    return <p className="error-text">{error}</p>;
  }

  if (!stats) return null;

  const { users, gigs, bookings, recentActivity, activityByAction } = stats;

  return (
    <div className="admin-dashboard">
      {/* Users */}
      <section className="admin-section">
        <div className="admin-section-header">
          <h2>Users</h2>
          <Link to="/admin/users" className="admin-section-link">
            Manage users →
          </Link>
        </div>

        <div className="admin-stats-grid">
          <StatCard label="Total" value={users.total} accent />
          <StatCard label="Active" value={users.active} />
          <StatCard label="Suspended" value={users.suspended} />
          <StatCard label="Banned" value={users.banned} />
          <StatCard label="New (7 days)" value={users.newLast7Days} />
        </div>

        <div className="admin-role-split">
          <span>
            <span className="admin-role-label">Clients</span>
            <span className="admin-role-value">{users.byRole.client}</span>
          </span>
          <span>
            <span className="admin-role-label">Freelancers</span>
            <span className="admin-role-value">{users.byRole.freelancer}</span>
          </span>
          <span>
            <span className="admin-role-label">Admins</span>
            <span className="admin-role-value">{users.byRole.admin}</span>
          </span>
        </div>
      </section>

      {/* Gigs */}
      <section className="admin-section">
        <div className="admin-section-header">
          <h2>Gigs</h2>
          <Link to="/admin/gigs" className="admin-section-link">
            Manage gigs →
          </Link>
        </div>

        <div className="admin-stats-grid">
          <StatCard label="Total" value={gigs.total} accent />
          <StatCard label="Active" value={gigs.active} />
          <StatCard label="Booked" value={gigs.booked} />
        </div>
      </section>

      {/* Bookings */}
      <section className="admin-section">
        <div className="admin-section-header">
          <h2>Bookings</h2>
          <Link to="/admin/bookings" className="admin-section-link">
            Manage bookings →
          </Link>
        </div>

        <div className="admin-stats-grid">
          <StatCard label="Total" value={bookings.total} accent />
          <StatCard label="Pending" value={bookings.pending} />
          <StatCard label="Confirmed" value={bookings.confirmed} />
          <StatCard label="Completed" value={bookings.completed} />
          <StatCard label="Cancelled" value={bookings.cancelled} />
        </div>
      </section>

      {/* Activity by action (last 30 days) */}
      {activityByAction?.length > 0 && (
        <section className="admin-section">
          <div className="admin-section-header">
            <h2>Activity (last 30 days)</h2>
            <Link to="/admin/activity" className="admin-section-link">
              View full log →
            </Link>
          </div>

          <ul className="admin-action-list">
            {activityByAction.slice(0, 8).map((row) => (
              <li key={row.action} className="admin-action-row">
                <span className="admin-action-name">
                  {humaniseAction(row.action)}
                </span>
                <span className="admin-action-count">{row.count}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Recent activity */}
      <section className="admin-section">
        <div className="admin-section-header">
          <h2>Recent activity</h2>
        </div>

        {recentActivity?.length === 0 ? (
          <p className="empty-state">No activity recorded yet.</p>
        ) : (
          <ul className="admin-recent-list">
            {recentActivity.map((entry) => (
              <li key={entry._id} className="admin-recent-row">
                <div className="admin-recent-main">
                  <span className="admin-recent-action">
                    {humaniseAction(entry.action)}
                  </span>
                  <span className="admin-recent-actor">
                    by {entry.actorName || 'System'}
                    {entry.actorRole ? ` · ${entry.actorRole}` : ''}
                  </span>
                </div>
                <span className="admin-recent-time">
                  {formatDateTime(entry.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default AdminDashboard;