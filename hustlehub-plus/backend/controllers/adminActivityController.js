const ActivityLog = require('../models/ActivityLog');

function buildFilter(q) {
  var filter = {};
  if (q.action) filter.action = q.action;
  if (q.targetType) filter.targetType = q.targetType;
  if (q.actorId) filter.actorId = q.actorId;
  return filter;
}

async function listActivity(req, res) {
  try {
    const page = req.query.page || 1;
    const limit = req.query.limit || 20;
    const sortDir = req.query.sort === 'oldest' ? 1 : -1;
    const filter = buildFilter(req.query);

    const total = await ActivityLog.countDocuments(filter);
    const entries = await ActivityLog.find(filter)
      .sort({ createdAt: sortDir })
      .skip((page - 1) * limit)
      .limit(limit);

    return res.status(200).json({
      success: true,
      count: entries.length,
      total: total,
      page: page,
      pages: Math.ceil(total / limit) || 1,
      data: entries
    });
  } catch (error) {
    console.error('Admin list activity error:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while fetching activity'
    });
  }
}

async function getActivityStats(req, res) {
  try {
    const now = Date.now();
    const last7 = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const last30 = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const [last7Days, last30Days] = await Promise.all([
      ActivityLog.countByActionSince(last7),
      ActivityLog.countByActionSince(last30)
    ]);

    return res.status(200).json({
      success: true,
      data: {
        last7Days: last7Days.map(function(r) { return { action: r._id, count: r.count }; }),
        last30Days: last30Days.map(function(r) { return { action: r._id, count: r.count }; })
      }
    });
  } catch (error) {
    console.error('Admin activity stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while fetching activity stats'
    });
  }
}

module.exports = { listActivity, getActivityStats };