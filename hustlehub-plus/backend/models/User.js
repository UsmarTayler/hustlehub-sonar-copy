const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    // Admin is a valid role but is never assigned at registration, see the
    // register validator. New accounts default to the least privileged role.
    enum: ['client', 'freelancer', 'admin'],
    default: 'client'
  },
  status: {
  type: String,
  enum: ['active', 'suspended', 'banned'],
  default: 'active'
},
  // Account lockout (see utils/lockout.js)
  failedLoginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date, default: null }

}, {
  timestamps: true
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  const bcrypt = require('bcryptjs');
  return await bcrypt.compare(candidatePassword, this.password);
};

// Static methods
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

const User = mongoose.model('User', userSchema);

module.exports = User;
