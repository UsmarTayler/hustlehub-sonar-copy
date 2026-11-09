const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { query } = require('express-validator');
const { validate } = require('../middleware/validators');
const {
  getIncomeSummary,
  getTransactionHistory,
  getIncomeByPeriod,
  getTaxEstimation
} = require('../controllers/incomeController');

router.use(authenticateToken);
router.use(authorize('freelancer', 'admin'));

router.get('/summary', getIncomeSummary);
router.get('/transactions', getTransactionHistory);
// The period is restricted to the values the controller understands, so an
// unexpected value cannot reach the query logic.
router.get(
  '/by-period',
  query('period')
    .optional({ values: 'falsy' })
    .isString().withMessage('Period is invalid').bail()
    .trim()
    .toLowerCase()
    .isIn(['monthly', 'quarterly', 'yearly'])
    .withMessage('Period must be monthly, quarterly or yearly'),
  validate,
  getIncomeByPeriod
);
router.get('/tax-estimation', getTaxEstimation);

module.exports = router;