const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { validate } = require('../middleware/validators');
const {
  createBookingValidationRules,
  updateBookingStatusValidationRules,
  bookingIdValidationRules
} = require('../middleware/bookingValidators');
const {
  createBooking,
  getMyBookings,
  getFreelancerBookings,
  getBookingById,
  updateBookingStatus
} = require('../controllers/bookingController');

router.use(authenticateToken);

router.post('/', authorize('client', 'admin'), createBookingValidationRules, validate, createBooking);
router.get('/my-bookings', authorize('client', 'admin'), getMyBookings);
router.get('/freelancer-bookings', authorize('freelancer', 'admin'), getFreelancerBookings);
router.get('/:id', bookingIdValidationRules, validate, getBookingById);
router.put('/:id/status', authorize('freelancer', 'admin'), updateBookingStatusValidationRules, validate, updateBookingStatus);

module.exports = router;