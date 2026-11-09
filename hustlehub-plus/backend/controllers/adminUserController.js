const User = require('../models/User');
const Gig = require('../models/Gig');
const Booking = require('../models/Booking');
const { logActivity } = require('../middleware/auditLog');


const USER_PROJECTION = '-password';

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildUserFilter(q) {
  var filter = {};
  if (q.role) filter.role = q.role;
  if (q.status) filter.status = q.status;
  if (q.search) {
    var safe = escapeRegex(q.search);
    filter.$or = [
      { name: { $regex: safe, $options: 'i' } },
      { email: { $regex: safe, $options: 'i' } },
    ];
  }
  return filter;
}

async function countAdmins(filter) {
  var base = { role: 'admin' };
  if (filter) Object.assign(base, filter);
  return User.countDocuments(base);
}

async function listUsers(req, res) {
  try {
    const page = req.query.page || 1;
    const limit = req.query.limit || 20;
    const sortDir = req.query.sort === 'oldest' ? 1 : -1;
    const filter = buildUserFilter(req.query);

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .select(USER_PROJECTION)
      .sort({ createdAt: sortDir })
      .skip((page - 1) * limit)
      .limit(limit);

    return res.status(200).json({
      success: true,
      count: users.length,
      total: total,
      page: page,
      pages: Math.ceil(total / limit) || 1,
      data: users
    });
  } catch (error) {
    console.error('Admin list users error:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while fetching users'
    });
  }
}

async function getUser(req, res) {
  try {
    const user = await User.findById(req.params.id).select(USER_PROJECTION);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

   
    const gigCount = await Gig.countDocuments({ freelancerId: user._id });
    const bookingCount = await Booking.countDocuments({
      $or: [{ clientId: user._id }, { freelancerId: user._id }]
    });

    return res.status(200).json({
      success: true,
      data: {
        user: user,
        stats: {
          gigCount: gigCount,
          bookingCount: bookingCount
        }
      }
    });
  } catch (error) {
    console.error('Admin get user error:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while fetching the user'
    });
  }
}

async function updateUserRole(req, res) {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (id === String(req.user.id)) {
      return res.status(400).json({
        success: false,
        message: 'You cannot change your own role'
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    
    if (user.role === 'admin' && role !== 'admin') {
      const admins = await countAdmins({ status: 'active' });
      if (admins <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot demote the last active admin'
        });
      }
    }

    const previousRole = user.role;
    user.role = role;
    await user.save();

    logActivity(req, 'admin.user.role_changed', {
      targetType: 'User',
      targetId: user._id,
      metadata: { from: previousRole, to: role, email: user.email }
    });

    return res.status(200).json({
      success: true,
      message: 'User role updated',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    console.error('Admin update user role error:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while updating the user role'
    });
  }
}

async function updateUserStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (id === String(req.user.id)) {
      return res.status(400).json({
        success: false,
        message: 'You cannot change your own status'
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    
    if (user.role === 'admin' && status !== 'active') {
      const admins = await countAdmins({ status: 'active' });
      if (admins <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot suspend or ban the last active admin'
        });
      }
    }

    const previousStatus = user.status;
    user.status = status;
    await user.save();

    logActivity(req, 'admin.user.status_changed', {
      targetType: 'User',
      targetId: user._id,
      metadata: { from: previousStatus, to: status, email: user.email }
    });

    return res.status(200).json({
      success: true,
      message: 'User status updated',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    console.error('Admin update user status error:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while updating the user status'
    });
  }
}

async function deleteUser(req, res) {
  try {
    const { id } = req.params;

    if (id === String(req.user.id)) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role === 'admin') {
      const admins = await countAdmins({ status: 'active' });
      if (admins <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete the last active admin'
        });
      }
    }

    
    const gigCount = await Gig.countDocuments({ freelancerId: user._id });
    if (gigCount > 0) {
      return res.status(409).json({
        success: false,
        message: 'User has ' + gigCount + ' gig(s). Ban instead of deleting, or remove the gigs first.'
      });
    }

    const bookingCount = await Booking.countDocuments({
      $or: [{ clientId: user._id }, { freelancerId: user._id }]
    });
    if (bookingCount > 0) {
      return res.status(409).json({
        success: false,
        message: 'User has ' + bookingCount + ' booking(s). Ban instead of deleting.'
      });
    }

    const snapshot = { id: user._id, name: user.name, email: user.email, role: user.role, status: user.status };

    await User.findByIdAndDelete(user._id);

    logActivity(req, 'admin.user.deleted', {
      targetType: 'User',
      targetId: user._id,
      metadata: snapshot
    });

    return res.status(200).json({
      success: true,
      message: 'User deleted',
      data: snapshot
    });
  } catch (error) {
    console.error('Admin delete user error:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while deleting the user'
    });
  }
}

module.exports = {
  listUsers,
  getUser,
  updateUserRole,
  updateUserStatus,
  deleteUser
};