const Transaction = require('../models/Transaction');
const Booking = require('../models/Booking');

async function getIncomeSummary(req, res) {
  try {
    const summary = await Transaction.getTransactionSummary(req.user.id);
    
    return res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Get income summary error:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while fetching income summary'
    });
  }
}

async function getTransactionHistory(req, res) {
  try {
    const transactions = await Transaction.findByFreelancer(req.user.id);
    
    const transactionsWithDetails = await Promise.all(transactions.map(async function(transaction) {
      const booking = await Booking.findById(transaction.bookingId);
      return {
        ...transaction.toObject(),
        bookingDetails: booking ? {
          clientName: booking.clientName,
          bookingDate: booking.bookingDate,
          message: booking.message
        } : null
      };
    }));
    
    return res.status(200).json({
      success: true,
      count: transactionsWithDetails.length,
      data: transactionsWithDetails
    });
  } catch (error) {
    console.error('Get transaction history error:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while fetching transaction history'
    });
  }
}

async function getIncomeByPeriod(req, res) {
  try {
    const { period } = req.query;
    const transactions = await Transaction.findByFreelancer(req.user.id);
    const completedTransactions = transactions.filter(function(t) { return t.status === 'completed'; });
    
    const groupedIncome = {};
    completedTransactions.forEach(function(transaction) {
      const date = new Date(transaction.transactionDate);
      let key;
      
      switch (period) {
        case 'monthly':
          key = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
          break;
        case 'quarterly':
          var quarter = Math.floor(date.getMonth() / 3) + 1;
          key = date.getFullYear() + '-Q' + quarter;
          break;
        case 'yearly':
          key = '' + date.getFullYear();
          break;
        default:
          key = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
      }
      
      if (!groupedIncome[key]) {
        groupedIncome[key] = {
          period: key,
          totalAmount: 0,
          transactionCount: 0,
          transactions: []
        };
      }
      
      groupedIncome[key].totalAmount += transaction.amount;
      groupedIncome[key].transactionCount++;
      groupedIncome[key].transactions.push(transaction);
    });
    
    var result = Object.values(groupedIncome).sort(function(a, b) {
      return a.period.localeCompare(b.period);
    });
    
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get income by period error:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while fetching income by period'
    });
  }
}

function calculateEstimatedTax(income, taxRate) {
  taxRate = taxRate || 25;
  var taxAmount = income * (taxRate / 100);
  return {
    totalIncome: income,
    taxRate: taxRate,
    estimatedTax: taxAmount,
    netIncome: income - taxAmount
  };
}

async function getTaxEstimation(req, res) {
  try {
    var totalIncome = await Transaction.getTotalIncomeByFreelancer(req.user.id);
    
    var taxRate = 25;
    var taxBrackets = [];
    
    if (totalIncome <= 0) {
      taxRate = 0;
    } else if (totalIncome <= 5000) {
      taxRate = 15;
      taxBrackets.push({ bracket: '0 - 5,000', rate: 15 });
    } else if (totalIncome <= 15000) {
      taxRate = 25;
      taxBrackets = [
        { bracket: '0 - 5,000', rate: 15 },
        { bracket: '5,001 - 15,000', rate: 25 }
      ];
    } else if (totalIncome <= 50000) {
      taxRate = 35;
      taxBrackets = [
        { bracket: '0 - 5,000', rate: 15 },
        { bracket: '5,001 - 15,000', rate: 25 },
        { bracket: '15,001 - 50,000', rate: 35 }
      ];
    } else {
      taxRate = 45;
      taxBrackets = [
        { bracket: '0 - 5,000', rate: 15 },
        { bracket: '5,001 - 15,000', rate: 25 },
        { bracket: '15,001 - 50,000', rate: 35 },
        { bracket: '50,001+', rate: 45 }
      ];
    }
    
    var taxInfo = calculateEstimatedTax(totalIncome, taxRate);
    
    return res.status(200).json({
      success: true,
      data: {
        totalIncome: taxInfo.totalIncome,
        taxRate: taxInfo.taxRate,
        estimatedTax: taxInfo.estimatedTax,
        netIncome: taxInfo.netIncome,
        taxBrackets: taxBrackets,
        currency: 'ZAR',
        year: new Date().getFullYear(),
        disclaimer: 'This is a simplified tax estimation. Please consult a tax professional for accurate calculations.'
      }
    });
  } catch (error) {
    console.error('Get tax estimation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while calculating tax estimation'
    });
  }
}

module.exports = {
  getIncomeSummary,
  getTransactionHistory,
  getIncomeByPeriod,
  getTaxEstimation
};