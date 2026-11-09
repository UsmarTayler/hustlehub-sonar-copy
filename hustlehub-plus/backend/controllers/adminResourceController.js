
const Gig = require('../models/Gig');
const Booking = require('../models/Booking');
const { logActivity } = require('../middleware/auditLog');

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function paginate(req) {
  const page = req.query.page || 1;
  const limit = req.query.limit || 20;
  return { page: page, limit: limit, skip: (page - 1) * limit };
}

// ---------- Gigs ----------

async function listGigs(req, res) {
  try {
    const { page, limit, skip } = paginate(req);
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.search) {
      const safe = escapeRegex(req.query.search);
      filter.$or = [
        { title: { $regex: safe, $options: 'i' } },
        { freelancerName: { $regex: safe, $options: 'i' } }
      ];
    }

    const total = await Gig.countDocuments(filter);
    const gigs = await Gig.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      count: gigs.length,
      total: total,
      page: page,
      pages: Math.ceil(total / limit) || 1,
      data: gigs
    });
  } catch (error) {
    console.error('Admin list gigs error:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while fetching gigs'
    });
  }
}

async function updateGigStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const gig = await Gig.findById(id);
    if (!gig) {
      return res.status(404).json({ success: false, message: 'Gig not found' });
    }

    const previousStatus = gig.status;
    gig.status = status;
    await gig.save();

    logActivity(req, 'admin.gig.status_changed', {
      targetType: 'Gig',
      targetId: gig._id,
      metadata: { from: previousStatus, to: status, title: gig.title }
    });

    return res.status(200).json({
      success: true,
      message: 'Gig status updated',
      data: gig
    });
  } catch (error) {
    console.error('Admin update gig status error:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while updating the gig status'
    });
  }
}

async function deleteGig(req, res) {
  try {
    const { id } = req.params;

    const gig = await Gig.findById(id);
    if (!gig) {
      return res.status(404).json({ success: false, message: 'Gig not found' });
    }

    // Refuse if the gig has any non-terminal bookings. Deleting it would
    // orphan confirmed or completed bookings.
    const liveBookings = await Booking.countDocuments({
      gigId: gig._id,
      status: { $in: ['pending', 'confirmed'] }
    });
    if (liveBookings > 0) {
      return res.status(409).json({
        success: false,
        message: 'Gig has ' + liveBookings + ' active booking(s). Mark it inactive instead.'
      });
    }

    const snapshot = { id: gig._id, title: gig.title, freelancerName: gig.freelancerName };

    await Gig.findByIdAndDelete(gig._id);

    logActivity(req, 'admin.gig.deleted', {
      targetType: 'Gig',
      targetId: gig._id,
      metadata: snapshot
    });

    return res.status(200).json({
      success: true,
      message: 'Gig deleted',
      data: snapshot
    });
  } catch (error) {
    console.error('Admin delete gig error:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while deleting the gig'
    });
  }
}

// ---------- Bookings ----------

async function listBookings(req, res) {
  try {
    const { page, limit, skip } = paginate(req);
    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const total = await Booking.countDocuments(filter);
    const bookings = await Booking.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      count: bookings.length,
      total: total,
      page: page,
      pages: Math.ceil(total / limit) || 1,
      data: bookings
    });
  } catch (error) {
    console.error('Admin list bookings error:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while fetching bookings'
    });
  }
}

async function updateBookingStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const previousStatus = booking.status;
    booking.status = status;
    await booking.save();

    logActivity(req, 'admin.booking.status_changed', {
      targetType: 'Booking',
      targetId: booking._id,
      metadata: { from: previousStatus, to: status }
    });

    return res.status(200).json({
      success: true,
      message: 'Booking status updated',
      data: booking
    });
  } catch (error) {
    console.error('Admin update booking status error:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while updating the booking status'
    });
  }
}

async function deleteBooking(req, res) {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const snapshot = { id: booking._id, status: booking.status, amount: booking.amount };

    await Booking.findByIdAndDelete(booking._id);

    logActivity(req, 'admin.booking.deleted', {
      targetType: 'Booking',
      targetId: booking._id,
      metadata: snapshot
    });

    return res.status(200).json({
      success: true,
      message: 'Booking deleted',
      data: snapshot
    });
  } catch (error) {
    console.error('Admin delete booking error:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while deleting the booking'
    });
  }
}

module.exports = {
  listGigs,
  updateGigStatus,
  deleteGig,
  listBookings,
  updateBookingStatus,
  deleteBooking
};