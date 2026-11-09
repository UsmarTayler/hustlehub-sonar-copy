const { body, param } = require('express-validator');

const SAFE_TEXT = /^[^<>{}\\`]{0,1000}$/;
const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

const createBookingValidationRules = [
  body('gigId')
    .exists({ values: 'falsy' }).withMessage('Gig ID is required').bail()
    .isString().withMessage('Gig ID is invalid').bail()
    .matches(OBJECT_ID).withMessage('Invalid gig id'),
  body('bookingDate')
    .optional({ values: 'falsy' })
    .isISO8601().withMessage('Booking date must be a valid date')
    .toDate(),
  body('message')
    .optional({ values: 'falsy' })
    .isString().withMessage('Message is invalid').bail()
    .trim()
    .isLength({ max: 1000 }).withMessage('Message must be 1000 characters or fewer').bail()
    .matches(SAFE_TEXT).withMessage('Message cannot contain < > { } or backticks'),
];

// The amount is deliberately not accepted from the request. It is taken from
// the gig being booked, so a client cannot book a gig and set their own price.
const updateBookingStatusValidationRules = [
  param('id').matches(OBJECT_ID).withMessage('Invalid booking id'),
  body('status')
    .exists({ values: 'falsy' }).withMessage('Status is required').bail()
    .isString().withMessage('Status is invalid').bail()
    .trim()
    .toLowerCase()
    .isIn(['pending', 'confirmed', 'completed', 'cancelled'])
    .withMessage('Status must be pending, confirmed, completed or cancelled'),
];

const bookingIdValidationRules = [
  param('id').matches(OBJECT_ID).withMessage('Invalid booking id'),
];

module.exports = {
  createBookingValidationRules,
  updateBookingStatusValidationRules,
  bookingIdValidationRules,
};
