const Gig = require('../models/Gig');
const Booking = require('../models/Booking');
const Transaction = require('../models/Transaction');
const { logActivity } = require('../middleware/auditLog');
const logger = require('../utils/logger');

async function createBooking(req, res) {
  try {
    const { gigId, bookingDate, message } = req.body;
    
    if (!gigId) return res.status(400).json({ success: false, message: 'Gig ID is required' });
    const gig = await Gig.findById(gigId);
    if (!gig) return res.status(404).json({ success: false, message: 'Gig not found' });
    if (gig.status !== 'active') return res.status(400).json({ success: false, message: 'This gig is not available for booking' });
    if (gig.freelancerId.toString() === req.user.id) return res.status(403).json({ success: false, message: 'You cannot book your own gig' });

    const newBooking = new Booking({
      gigId: gig._id, clientId: req.user.id, clientName: req.user.name || 'Client',
      freelancerId: gig.freelancerId, freelancerName: gig.freelancerName,
      amount: gig.price, bookingDate: bookingDate || new Date(),
      message: message || '', status: 'pending'
    });

    await newBooking.save();
    
    const transaction = new Transaction({
      bookingId: newBooking._id, clientId: req.user.id, freelancerId: gig.freelancerId,
      amount: gig.price, paymentMethod: 'simulated', status: 'completed'
    });

    await transaction.save();

    logActivity(req, 'booking.created', {
      targetType: 'Booking', targetId: newBooking._id, metadata: { gigId: gig._id, amount: gig.price }
    });
    
    logger.info('Booking created and transaction processed', { 
      bookingId: newBooking._id, amount: gig.price, client: req.user.email, gigTitle: gig.title
    });
    
    const updatedBooking = await Booking.updateStatus(newBooking._id, 'confirmed');
    await Gig.updateGig(gig._id, { status: 'booked' });
    
    return res.status(201).json({
      success: true, message: 'Booking created and payment processed successfully',
      data: { booking: updatedBooking, transaction: transaction }
    });
  } catch (error) {
    console.error('Create booking error:', error);
    return res.status(500).json({ success: false, message: 'Something went wrong while creating the booking' });
  }
}

async function getMyBookings(req, res) {
  try {
    const bookings = await Booking.findByClient(req.user.id);
    const bookingsWithDetails = await Promise.all(bookings.map(async function(booking) {
      const gig = await Gig.findById(booking.gigId);
      return { ...booking.toObject(), gigDetails: gig ? { title: gig.title, description: gig.description, category: gig.category } : null };
    }));
    return res.status(200).json({ success: true, count: bookingsWithDetails.length, data: bookingsWithDetails });
  } catch (error) {
    console.error('Get my bookings error:', error);
    return res.status(500).json({ success: false, message: 'Something went wrong while fetching your bookings' });
  }
}

async function getFreelancerBookings(req, res) {
  try {
    const bookings = await Booking.findByFreelancer(req.user.id);
    const bookingsWithDetails = await Promise.all(bookings.map(async function(booking) {
      const gig = await Gig.findById(booking.gigId);
      return { ...booking.toObject(), gigDetails: gig ? { title: gig.title, description: gig.description, category: gig.category } : null };
    }));
    return res.status(200).json({ success: true, count: bookingsWithDetails.length, data: bookingsWithDetails });
  } catch (error) {
    console.error('Get freelancer bookings error:', error);
    return res.status(500).json({ success: false, message: 'Something went wrong while fetching bookings' });
  }
}

async function getBookingById(req, res) {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (booking.clientId.toString() !== req.user.id && booking.freelancerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'You do not have permission to view this booking' });
    }
    const gig = await Gig.findById(booking.gigId);
    const transaction = await Transaction.findByBooking(booking._id);
    return res.status(200).json({
      success: true,
      data: { booking, gigDetails: gig ? { title: gig.title, description: gig.description, category: gig.category, price: gig.price } : null, transaction: transaction.length > 0 ? transaction[0] : null }
    });
  } catch (error) {
    console.error('Get booking error:', error);
    return res.status(500).json({ success: false, message: 'Something went wrong while fetching the booking' });
  }
}

async function updateBookingStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) return res.status(400).json({ success: false, message: 'Status is required' });
    
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (booking.freelancerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'You can only update bookings for your gigs' });
    }
    
    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status. Valid statuses: ' + validStatuses.join(', ') });
    
    const updatedBooking = await Booking.updateStatus(id, status);
    logActivity(req, 'booking.status_changed', { targetType: 'Booking', targetId: id, metadata: { to: status } });
    
    if (status === 'completed') {
      const gig = await Gig.findById(booking.gigId);
      if (gig) await Gig.updateGig(gig._id, { status: 'active' });
    }
    return res.status(200).json({ success: true, message: 'Booking status updated successfully', data: updatedBooking });
  } catch (error) {
    console.error('Update booking status error:', error);
    return res.status(500).json({ success: false, message: 'Something went wrong while updating the booking status' });
  }
}

module.exports = { createBooking, getMyBookings, getFreelancerBookings, getBookingById, updateBookingStatus };