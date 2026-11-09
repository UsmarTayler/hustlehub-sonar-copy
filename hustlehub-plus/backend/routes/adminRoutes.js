const express = require('express');
const router = express.Router();

const authenticateToken = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/adminMiddleware');
const { validate } = require('../middleware/validators');
const {
  listQueryValidationRules,
  activityFilterValidationRules,
  userIdValidationRules,
  gigIdValidationRules,
  bookingIdValidationRules,
  updateUserRoleValidationRules,
  updateUserStatusValidationRules,
  updateGigStatusAdminValidationRules,
  updateBookingStatusAdminValidationRules
} = require('../middleware/adminValidators');

const {
  listUsers,
  getUser,
  updateUserRole,
  updateUserStatus,
  deleteUser
} = require('../controllers/adminUserController');

const {
  listGigs,
  updateGigStatus,
  deleteGig,
  listBookings,
  updateBookingStatus,
  deleteBooking
} = require('../controllers/adminResourceController');

const { getDashboardStats } = require('../controllers/adminStatsController');
const { listActivity, getActivityStats } = require('../controllers/adminActivityController');


router.use(authenticateToken);
router.use(requireAdmin);

// Dashboard
router.get('/stats', getDashboardStats);

// Users
router.get('/users', listQueryValidationRules, validate, listUsers);
router.get('/users/:id', userIdValidationRules, validate, getUser);
router.patch('/users/:id/role', updateUserRoleValidationRules, validate, updateUserRole);
router.patch('/users/:id/status', updateUserStatusValidationRules, validate, updateUserStatus);
router.delete('/users/:id', userIdValidationRules, validate, deleteUser);

// Activity
router.get('/activity', listQueryValidationRules, activityFilterValidationRules, validate, listActivity);
router.get('/activity/stats', getActivityStats);

// Gigs
router.get('/gigs', listQueryValidationRules, validate, listGigs);
router.patch('/gigs/:id/status', updateGigStatusAdminValidationRules, validate, updateGigStatus);
router.delete('/gigs/:id', gigIdValidationRules, validate, deleteGig);

// Bookings
router.get('/bookings', listQueryValidationRules, validate, listBookings);
router.put('/bookings/:id/status', updateBookingStatusAdminValidationRules, validate, updateBookingStatus);
router.delete('/bookings/:id', bookingIdValidationRules, validate, deleteBooking);

// Income and transactions are intentionally not exposed here.

module.exports = router;