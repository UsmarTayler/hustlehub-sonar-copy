import { useState, useEffect } from 'react';
import { listActivity } from '../../services/adminService';
import './AdminActivity.css';

const TARGET_OPTIONS = ['User', 'Gig', 'Booking'];
const PAGE_SIZE = 25;

// Actions the backend currently emits. Used as a dropdown hint so an admin
// can filter without having to remember the exact dotted names. Free-text
// filtering is still possible via the "Custom" option, which reveals an
// input field.
const COMMON_ACTIONS = [
  'user.registered',
  'user.login',
  'user.login_blocked',
  'gig.created',
  'gig.updated',
  'gig.deleted',
  'booking.created',
  'booking.status_changed',
  'admin.user.role_changed',
  'admin.user.status_changed',
  'admin.user.deleted',
  'admin.gig.status_changed',
  'admin.gig.deleted',
  'admin.booking.status_changed',
  'admin.booking.deleted',
];

function humaniseAction(action) {
  if (!action) return 'Activity';
  const parts = String(action).split('.');
  const last = parts[parts.length - 1] || action;
  return last
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function isAdminAction(action) {
  return String(action || '').startsWith('admin.');
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

// Renders the metadata object as a compact, comma-separated key: value list.
// Values are stringified defensively — the backend stores Mixed, so anything
// could be in there.
function renderMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') return null;
  const entries = Object.entries(metadata).filter(
    ([, v]) => v !== undefined && v !== null && v !== ''
  );
  if (entries.length === 0) return null;

  return (
    <ul className="admin-activity-meta">
      {entries.map(([key, value]) => (
        <li key={key} className="admin-activity-meta-item">
          <span className="admin-activity-meta-key">{key}</span>
          <span className="admin-activity-meta-value">
            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function AdminActivity() {
  const [entries, setEntries] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [actionFilter, setActionFilter] = useState('');
  const [actionCustom, setActionCustom] = useState('');
  const [targetFilter, setTargetFilter] = useState('');
  const [actorFilter, setActorFilter] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const effectiveAction = actionFilter === '__custom__' ? actionCustom.trim() : actionFilter;

  // Reset to page 1 when filters change.
  useEffect(() => {
    setPage(1);
  }, [effectiveAction, targetFilter, actorFilter]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const params = { page, limit: PAGE_SIZE };
        if (effectiveAction) params.action = effectiveAction;
        if (targetFilter) params.targetType = targetFilter;
        if (actorFilter) params.actorId = actorFilter;

        const response = await listActivity(params);
        if (cancelled) return;

        setEntries(response.data || []);
        setPages(response.pages || 1);
        setTotal(response.total || 0);
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
              'Unable to load activity right now.'
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
  }, [page, effectiveAction, targetFilter, actorFilter]);

  function clearFilters() {
    setActionFilter('');
    setActionCustom('');
    setTargetFilter('');
    setActorFilter('');
  }

  const hasFilters = effectiveAction || targetFilter || actorFilter;

  return (
    <div className="admin-activity">
      <header className="admin-activity-header">
        <div>
          <h2>Activity log</h2>
          <p className="admin-activity-subtext">
            Every login, gig change, booking event and admin action, newest
            first. Income is never recorded here.
          </p>
        </div>
        <span className="admin-activity-count">
          {total} {total === 1 ? 'entry' : 'entries'}
        </span>
      </header>

      <div className="admin-activity-filters">
        <div className="admin-filter-field">
          <label htmlFor="activity-action">Action</label>
          <select
            id="activity-action"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="">All</option>
            {COMMON_ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
            <option value="__custom__">Custom…</option>
          </select>
        </div>

        {actionFilter === '__custom__' && (
          <div className="admin-filter-field">
            <label htmlFor="activity-action-custom">Custom action</label>
            <input
              id="activity-action-custom"
              type="text"
              value={actionCustom}
              onChange={(e) => setActionCustom(e.target.value)}
              placeholder="e.g. user.login"
              maxLength={100}
            />
          </div>
        )}

        <div className="admin-filter-field">
          <label htmlFor="activity-target">Target</label>
          <select
            id="activity-target"
            value={targetFilter}
            onChange={(e) => setTargetFilter(e.target.value)}
          >
            <option value="">All</option>
            {TARGET_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="admin-filter-field grow">
          <label htmlFor="activity-actor">Actor ID</label>
          <input
            id="activity-actor"
            type="text"
            value={actorFilter}
            onChange={(e) => setActorFilter(e.target.value)}
            placeholder="24-character user id"
            maxLength={24}
          />
        </div>

        <div className="admin-filter-actions">
          {hasFilters && (
            <button
              type="button"
              className="admin-btn ghost"
              onClick={clearFilters}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {loading && <p className="admin-activity-loading">Loading activity…</p>}
      {error && <p className="error-text">{error}</p>}

      {!loading && !error && entries.length === 0 && (
        <p className="empty-state">
          {hasFilters
            ? 'No activity matches those filters.'
            : 'No activity recorded yet.'}
        </p>
      )}

      {!loading && !error && entries.length > 0 && (
        <>
          <ul className="admin-activity-list">
            {entries.map((entry) => (
              <li
                key={entry._id}
                className={`admin-activity-row ${
                  isAdminAction(entry.action) ? 'admin-action' : ''
                }`}
              >
                <div className="admin-activity-main">
                  <div className="admin-activity-title-row">
                    <span className="admin-activity-action">
                      {humaniseAction(entry.action)}
                    </span>
                    <span className="admin-activity-action-raw">
                      {entry.action}
                    </span>
                    {isAdminAction(entry.action) && (
                      <span className="admin-activity-tag">Admin</span>
                    )}
                  </div>

                  <p className="admin-activity-actor">
                    {entry.actorName || 'Anonymous'}
                    {entry.actorRole ? ` · ${entry.actorRole}` : ''}
                    {entry.ipAddress ? ` · ${entry.ipAddress}` : ''}
                  </p>

                  {entry.targetType && (
                    <p className="admin-activity-target">
                      <span className="admin-activity-target-label">
                        Target:
                      </span>{' '}
                      {entry.targetType}
                      {entry.targetId ? (
                        <span className="admin-activity-target-id">
                          {' '}
                          {String(entry.targetId)}
                        </span>
                      ) : null}
                    </p>
                  )}

                  {renderMetadata(entry.metadata)}
                </div>

                <span className="admin-activity-time">
                  {formatDateTime(entry.createdAt)}
                </span>
              </li>
            ))}
          </ul>

          {pages > 1 && (
            <div className="admin-pagination">
              <button
                type="button"
                className="admin-btn ghost"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
              >
                ← Prev
              </button>
              <span className="admin-page-indicator">
                Page {page} of {pages}
              </span>
              <button
                type="button"
                className="admin-btn ghost"
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page >= pages || loading}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default AdminActivity;