const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  gigId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Gig',
    required: true
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  clientName: {
    type: String,
    required: true,
    trim: true
  },
  freelancerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  freelancerName: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  bookingDate: {
    type: Date,
    default: Date.now
  },
  message: {
    type: String,
    trim: true,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// DO NOT add a findById static method here - Mongoose provides it already

bookingSchema.statics.findByClient = function(clientId) {
  return this.find({ clientId }).sort({ createdAt: -1 });
};

bookingSchema.statics.findByFreelancer = function(freelancerId) {
  return this.find({ freelancerId }).sort({ createdAt: -1 });
};

bookingSchema.statics.findByGig = function(gigId) {
  return this.find({ gigId }).sort({ createdAt: -1 });
};

bookingSchema.statics.updateStatus = function(id, status) {
  return this.findByIdAndUpdate(
    id,
    { status },
    { new: true }
  );
};

bookingSchema.statics.getBookingsByDateRange = function(startDate, endDate) {
  return this.find({
    createdAt: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  });
};

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;