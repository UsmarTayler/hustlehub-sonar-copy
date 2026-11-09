const { body, validationResult } = require('express-validator');

const registerValidationRules = [
  // A whitelist pattern is used instead of .escape(). escape() rewrites the
  // value into HTML entities before it is stored, so a name like O'Brien is
  // saved as O&#x27;Brien and reads wrongly everywhere that is not HTML.
  // Validating the input and encoding on output keeps the stored data clean
  // while still rejecting anything that looks like markup.
  body('name')
    .exists({ values: 'falsy' }).withMessage('Name is required').bail()
    .isString().withMessage('Name is invalid').bail()
    .trim()
    .matches(/^[A-Za-z][A-Za-z'\-\s]{1,49}$/)
    .withMessage('Name may contain letters, spaces, hyphens and apostrophes only, between 2 and 50 characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),
  // The password is never trimmed. Leading and trailing spaces are legitimate
  // characters and removing them silently changes what the user typed.
  // The upper bound matters too: bcrypt only uses the first 72 bytes, so
  // anything longer gives no extra protection.
  body('password')
    .exists({ values: 'falsy' }).withMessage('Password is required').bail()
    .isString().withMessage('Password is invalid').bail()
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,128}$/)
    .withMessage('Password must be 8 to 128 characters and include an uppercase letter, a lowercase letter, a number and a special character'),
  // Admin is deliberately not accepted. Allowing an arbitrary role on a public
  // endpoint would let anyone register themselves as an administrator.
  body('role')
    .optional({ values: 'falsy' })
    .trim()
    .toLowerCase()
    .isIn(['client', 'freelancer']).withMessage('Role must be either client or freelancer'),
];

const loginValidationRules = [
  body('email')
    .exists({ values: 'falsy' }).withMessage('Email is required').bail()
    .isString().withMessage('Email is invalid').bail()
    .trim()
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),
  // isString matters here. notEmpty on its own accepts an object, so a body
  // like { "password": { "$gt": "" } } would reach bcrypt.compare and throw.
  // The strength rules are deliberately not repeated on login: applying them
  // would tell an attacker which guesses are even shaped like a real password.
  body('password')
    .exists({ values: 'falsy' }).withMessage('Password is required').bail()
    .isString().withMessage('Password is invalid').bail()
    .isLength({ max: 128 }).withMessage('Password is invalid'),
];

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(function(err) {
        return {
          field: err.path,
          message: err.msg,
        };
      }),
    });
  }
  next();
}

module.exports = { registerValidationRules, loginValidationRules, validate };