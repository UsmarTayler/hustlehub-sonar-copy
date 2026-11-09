const { body, param, query } = require('express-validator');

const OBJECT_ID = /^[0-9a-fA-F]{24}$/;
const SAFE_SEARCH = /^[A-Za-z0-9 .,'&()/+#:_-]{1,100}$/;


const listQueryValidationRules = [
  query('page')
    .optional({ values: 'falsy' })
    .isInt({ min: 1, max: 100000 }).withMessage('Page must be a positive integer')
    .toInt(),
  query('limit')
    .optional({ values: 'falsy' })
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
    .toInt(),
  query('search')
    .optional({ values: 'falsy' })
    .isString().withMessage('Search must be a string').bail()
    .trim()
    .matches(SAFE_SEARCH).withMessage('Search contains unsupported characters'),
  query('sort')
    .optional({ values: 'falsy' })
    .isString().withMessage('Sort must be a string').bail()
    .trim()
    .isIn(['newest', 'oldest']).withMessage('Sort must be newest or oldest'),
];

const userIdValidationRules = [
  param('id').matches(OBJECT_ID).withMessage('Invalid user id'),
];

const gigIdValidationRules = [
  param('id').matches(OBJECT_ID).withMessage('Invalid gig id'),
];

const bookingIdValidationRules = [
  param('id').matches(OBJECT_ID).withMessage('Invalid booking id'),
];

const updateUserRoleValidationRules = [
  param('id').matches(OBJECT_ID).withMessage('Invalid user id'),
  body('role')
    .exists({ values: 'falsy' }).withMessage('Role is required').bail()
    .isString().withMessage('Role is invalid').bail()
    .trim()
    .toLowerCase()
    .isIn(['client', 'freelancer', 'admin'])
    .withMessage('Role must be client, freelancer or admin'),
];

const updateUserStatusValidationRules = [
  param('id').matches(OBJECT_ID).withMessage('Invalid user id'),
  body('status')
    .exists({ values: 'falsy' }).withMessage('Status is required').bail()
    .isString().withMessage('Status is invalid').bail()
    .trim()
    .toLowerCase()
    .isIn(['active', 'suspended', 'banned'])
    .withMessage('Status must be active, suspended or banned'),
];

const updateGigStatusAdminValidationRules = [
  param('id').matches(OBJECT_ID).withMessage('Invalid gig id'),
  body('status')
    .exists({ values: 'falsy' }).withMessage('Status is required').bail()
    .isString().withMessage('Status is invalid').bail()
    .trim()
    .toLowerCase()
    .isIn(['active', 'booked', 'completed', 'inactive'])
    .withMessage('Status must be active, booked, completed or inactive'),
];

const updateBookingStatusAdminValidationRules = [
  param('id').matches(OBJECT_ID).withMessage('Invalid booking id'),
  body('status')
    .exists({ values: 'falsy' }).withMessage('Status is required').bail()
    .isString().withMessage('Status is invalid').bail()
    .trim()
    .toLowerCase()
    .isIn(['pending', 'confirmed', 'completed', 'cancelled'])
    .withMessage('Status must be pending, confirmed, completed or cancelled'),
];

const activityFilterValidationRules = [
  query('action')
    .optional({ values: 'falsy' })
    .isString().withMessage('Action must be a string').bail()
    .trim()
    .isLength({ max: 100 }).withMessage('Action is too long').bail()
    .matches(/^[a-z0-9._-]+$/i).withMessage('Action contains unsupported characters'),
  query('targetType')
    .optional({ values: 'falsy' })
    .isString().withMessage('Target type must be a string').bail()
    .trim()
    .isIn(['User', 'Gig', 'Booking']).withMessage('Target type must be User, Gig or Booking'),
  query('actorId')
    .optional({ values: 'falsy' })
    .isString().withMessage('Actor id is invalid').bail()
    .matches(OBJECT_ID).withMessage('Invalid actor id'),
];

module.exports = {
  listQueryValidationRules,
  activityFilterValidationRules,
  userIdValidationRules,
  gigIdValidationRules,
  bookingIdValidationRules,
  updateUserRoleValidationRules,
  updateUserStatusValidationRules,
  updateGigStatusAdminValidationRules,
  updateBookingStatusAdminValidationRules,
};