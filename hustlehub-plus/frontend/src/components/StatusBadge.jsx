import './StatusBadge.css';


const LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  active: 'Active',
  booked: 'Booked',
  inactive: 'Inactive',
  suspended: 'Suspended',
  banned: 'Banned',
};

function StatusBadge({ status }) {
  const key = String(status || '').toLowerCase();
  const label = LABELS[key] || status || 'Unknown';
  return (
    <span className={`status-badge status-${key}`}>
      {label}
    </span>
  );
}

export default StatusBadge;