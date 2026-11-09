const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { validate } = require('../middleware/validators');
const {
  createGigValidationRules,
  updateGigValidationRules,
  gigIdValidationRules
} = require('../middleware/gigValidators');
const {
  createGig,
  getAllGigs,
  getGigById,
  getMyGigs,
  updateGig,
  deleteGig
} = require('../controllers/gigController');

// Public routes. Anyone can browse the marketplace without an account.
router.get('/', getAllGigs);

// my-gigs must be declared before /:id. Express matches routes in order, so
// with /:id first a request for /my-gigs is read as a gig with the id
// "my-gigs" and never reaches this handler. It carries its own auth because
// it sits above the router.use below.
router.get('/my-gigs', authenticateToken, authorize('freelancer', 'admin'), getMyGigs);

router.get('/:id', gigIdValidationRules, validate, getGigById);

// Everything past this point requires a valid token.
router.use(authenticateToken);

router.post('/', authorize('freelancer', 'admin'), createGigValidationRules, validate, createGig);
router.put('/:id', authorize('freelancer', 'admin'), updateGigValidationRules, validate, updateGig);
router.delete('/:id', authorize('freelancer', 'admin'), gigIdValidationRules, validate, deleteGig);

module.exports = router;