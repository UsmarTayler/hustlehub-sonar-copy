const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  actorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  actorName: {
    type: String,
    trim: true,
    default: 'System'
  },
  actorRole: {
    type: String,
    trim: true,
    default: 'system'
  },
  
  action: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  targetType: {
    type: String,
    trim: true,
    default: null,
    index: true
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },

  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: {
    type: String,
    trim: true,
    default: null
  }
}, {
  timestamps: true
});


activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ actorId: 1, createdAt: -1 });
activityLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });



activityLogSchema.statics.list = function(filter, options) {
  var query = this.find(filter).sort({ createdAt: -1 });
  if (options && options.skip) query = query.skip(options.skip);
  if (options && options.limit) query = query.limit(options.limit);
  return query;
};

activityLogSchema.statics.countAll = function(filter) {
  return this.countDocuments(filter || {});
};


activityLogSchema.statics.countByActionSince = async function(since) {
  return this.aggregate([
    { $match: { createdAt: { $gte: since } } },
    { $group: { _id: '$action', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
};

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

module.exports = ActivityLog;