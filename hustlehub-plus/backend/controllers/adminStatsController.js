const User = require('../models/User');
const Gig = require('../models/Gig');
const Booking = require('../models/Booking');
const ActivityLog = require('../models/ActivityLog');

// Dashboard counters. No income or transaction data appears here, by design.
async function getDashboardStats(req, res) {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      bannedUsers,
      clientCount,
      freelancerCount,
      adminCount,
      newUsers7d,
      totalGigs,
      activeGigs,
      bookedGigs,
      totalBookings,
      pendingBookings,
      confirmedBookings,
      completedBookings,
      cancelledBookings,
      recentActivity,
      activityByAction
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ status: 'active' }),
      User.countDocuments({ status: 'suspended' }),
      User.countDocuments({ status: 'banned' }),
      User.countDocuments({ role: 'client' }),
      User.countDocuments({ role: 'freelancer' }),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      Gig.countDocuments({}),
      Gig.countDocuments({ status: 'active' }),
      Gig.countDocuments({ status: 'booked' }),
      Booking.countDocuments({}),
      Booking.countDocuments({ status: 'pending' }),
      Booking.countDocuments({ status: 'confirmed' }),
      Booking.countDocuments({ status: 'completed' }),
      Booking.countDocuments({ status: 'cancelled' }),
      ActivityLog.find({}).sort({ createdAt: -1 }).limit(10),
      ActivityLog.countByActionSince(thirtyDaysAgo)
    ]);

    return res.status(200).json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          suspended: suspendedUsers,
          banned: bannedUsers,
          byRole: { client: clientCount, freelancer: freelancerCount, admin: adminCount },
          newLast7Days: newUsers7d
        },
        gigs: {
          total: totalGigs,
          active: activeGigs,
          booked: bookedGigs
        },
        bookings: {
          total: totalBookings,
          pending: pendingBookings,
          confirmed: confirmedBookings,
          completed: completedBookings,
          cancelled: cancelledBookings
        },
        recentActivity: recentActivity,
        activityByAction: activityByAction.map(function(row) {
          return { action: row._id, count: row.count };
        })
      }
    });
  } catch (error) {
    console.error('Admin dashboard stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while fetching dashboard stats'
    });
  }
}

module.exports = { getDashboardStats };