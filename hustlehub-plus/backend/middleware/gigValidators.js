const { body, param } = require('express-validator');

// Whitelist patterns. A value has to match an allowed shape to get through,
// rather than being checked against a list of banned characters. A blacklist
// only rejects the attacks we already thought of.
const TITLE = /^[A-Za-z0-9][A-Za-z0-9 .,'&()/+#:-]{2,99}$/;
const SAFE_TEXT = /^[^<>{}\\`]{1,2000}$/;
const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

// isString is applied before anything else on every field. notEmpty accepts an
// object, so without a type check a payload like { "price": { "$gt": "" } }
// passes validation and reaches the database as a query operator.
const createGigValidationRules = [
  body('title')
    .exists({ values: 'falsy' }).withMessage('Title is required').bail()
    .isString().withMessage('Title is invalid').bail()
    .trim()
    .matches(TITLE).withMessage('Title must be 3 to 100 characters and cannot contain < > { } or \\'),
  body('description')
    .exists({ values: 'falsy' }).withMessage('Description is required').bail()
    .isString().withMessage('Description is invalid').bail()
    .trim()
    .isLength({ min: 10, max: 2000 }).withMessage('Description must be between 10 and 2000 characters').bail()
    .matches(SAFE_TEXT).withMessage('Description cannot contain < > { } or backticks'),
  body('price')
    .exists({ values: 'falsy' }).withMessage('Price is required').bail()
    .isFloat({ min: 0, max: 1000000 }).withMessage('Price must be a number between 0 and 1000000')
    .toFloat(),
  body('category')
    .exists({ values: 'falsy' }).withMessage('Category is required').bail()
    .isString().withMessage('Category is invalid').bail()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('Category must be between 2 and 50 characters').bail()
    .matches(/^[A-Za-z][A-Za-z \-&]{1,49}$/).withMessage('Category may contain letters, spaces, hyphens and ampersands only'),
  body('duration')
    .optional({ values: 'falsy' })
    .isString().withMessage('Duration is invalid').bail()
    .trim()
    .isLength({ max: 100 }).withMessage('Duration is too long').bail()
    .matches(SAFE_TEXT).withMessage('Duration cannot contain < > { } or backticks'),
];

// Every field optional, because an update may change only one of them, but
// anything supplied still has to be valid.
const updateGigValidationRules = [
  param('id').matches(OBJECT_ID).withMessage('Invalid gig id'),
  body('title').optional({ values: 'falsy' }).isString().withMessage('Title is invalid').bail()
    .trim().matches(TITLE).withMessage('Title must be 3 to 100 characters and cannot contain < > { } or \\'),
  body('description').optional({ values: 'falsy' }).isString().withMessage('Description is invalid').bail()
    .trim().isLength({ min: 10, max: 2000 }).withMessage('Description must be between 10 and 2000 characters').bail()
    .matches(SAFE_TEXT).withMessage('Description cannot contain < > { } or backticks'),
  body('price').optional({ values: 'falsy' })
    .isFloat({ min: 0, max: 1000000 }).withMessage('Price must be a number between 0 and 1000000').toFloat(),
  body('category').optional({ values: 'falsy' }).isString().withMessage('Category is invalid').bail()
    .trim().matches(/^[A-Za-z][A-Za-z \-&]{1,49}$/).withMessage('Category may contain letters, spaces, hyphens and ampersands only'),
  body('duration').optional({ values: 'falsy' }).isString().withMessage('Duration is invalid').bail()
    .trim().isLength({ max: 100 }).withMessage('Duration is too long'),
  // status is restricted to the values the schema allows, so a client cannot
  // put a gig into a state the application does not recognise.
  body('status').optional({ values: 'falsy' })
    .isIn(['active', 'booked', 'completed', 'inactive']).withMessage('Status must be active, booked, completed or inactive'),
];

const gigIdValidationRules = [
  param('id').matches(OBJECT_ID).withMessage('Invalid gig id'),
];

module.exports = { createGigValidationRules, updateGigValidationRules, gigIdValidationRules };
