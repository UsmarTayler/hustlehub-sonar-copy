const mongoose = require('mongoose');

const gigSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
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
  duration: {
    type: String,
    trim: true,
    default: 'To be discussed'
  },
  status: {
    type: String,
    enum: ['active', 'booked', 'completed', 'inactive'],
    default: 'active'
  },
  bookings: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  }]
}, {
  timestamps: true
});

// DO NOT add a findById static method here - Mongoose provides it already

gigSchema.statics.findAllActive = function() {
  return this.find({ status: 'active' }).sort({ createdAt: -1 });
};

gigSchema.statics.findByFreelancer = function(freelancerId) {
  return this.find({ freelancerId }).sort({ createdAt: -1 });
};

gigSchema.statics.findByCategory = function(category) {
  // The category comes from the query string, so regex metacharacters are
  // escaped to stop it being used as a pattern (or to crash with a bad one).
  const escaped = String(category).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return this.find({
    category: { $regex: new RegExp('^' + escaped + '$', 'i') },
    status: 'active' 
  });
};

gigSchema.statics.updateGig = function(id, updateData) {
  return this.findByIdAndUpdate(
    id,
    updateData,
    { new: true, runValidators: true }
  );
};

gigSchema.statics.deleteGig = function(id) {
  return this.findByIdAndUpdate(
    id,
    { status: 'inactive' },
    { new: true }
  );
};

gigSchema.methods.isOwner = function(userId) {
  return this.freelancerId.toString() === userId.toString();
};

const Gig = mongoose.model('Gig', gigSchema);

module.exports = Gig;