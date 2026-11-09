const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  freelancerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentMethod: {
    type: String,
    default: 'simulated'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'completed'
  },
  transactionDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// DO NOT add a findById static method here - Mongoose provides it already

transactionSchema.statics.findByClient = function(clientId) {
  return this.find({ clientId }).sort({ createdAt: -1 });
};

transactionSchema.statics.findByFreelancer = function(freelancerId) {
  return this.find({ freelancerId }).sort({ createdAt: -1 });
};

transactionSchema.statics.findByBooking = function(bookingId) {
  return this.find({ bookingId });
};

transactionSchema.statics.getTotalIncomeByFreelancer = async function(freelancerId) {
  const transactions = await this.find({ 
    freelancerId, 
    status: 'completed' 
  });
  return transactions.reduce(function(total, t) { return total + t.amount; }, 0);
};

transactionSchema.statics.getTransactionSummary = async function(freelancerId) {
  const transactions = await this.find({ freelancerId });
  const completedTransactions = transactions.filter(function(t) { return t.status === 'completed'; });
  
  return {
    totalIncome: completedTransactions.reduce(function(total, t) { return total + t.amount; }, 0),
    totalTransactions: transactions.length,
    completedTransactions: completedTransactions.length,
    pendingTransactions: transactions.filter(function(t) { return t.status === 'pending'; }).length,
    averageTransactionAmount: completedTransactions.length > 0 
      ? completedTransactions.reduce(function(total, t) { return total + t.amount; }, 0) / completedTransactions.length 
      : 0
  };
};

transactionSchema.statics.updateStatus = function(id, status) {
  return this.findByIdAndUpdate(
    id,
    { status },
    { new: true }
  );
};

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;