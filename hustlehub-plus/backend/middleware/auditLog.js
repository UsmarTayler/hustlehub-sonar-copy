const ActivityLog = require('../models/ActivityLog');


function logActivity(req, action, options) {
  var opts = options || {};

  var entry = {
    action: action,
    actorId: opts.actorId || (req.user && req.user.id) || null,
    actorName: opts.actorName || (req.user && req.user.name) || 'Anonymous',
    actorRole: opts.actorRole || (req.user && req.user.role) || 'anonymous',
    targetType: opts.targetType || null,
    targetId: opts.targetId || null,
    metadata: opts.metadata || {},
    ipAddress: req.ip || null
  };

  ActivityLog.create(entry).catch(function(err) {
    console.error('Activity log failed:', err.message);
  });
}

module.exports = { logActivity };