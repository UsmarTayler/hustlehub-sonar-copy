require('dotenv').config({ override: true });

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');

const STRONG_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,128}$/;

async function connectWithFallback() {
  const candidates = [
    process.env.MONGODB_URI_ATLAS,
    process.env.MONGODB_URI_LOCAL,
    'mongodb://localhost:27017/hustlehub',
  ].filter(Boolean);

  let lastErr;
  for (const uri of candidates) {
    const safe = uri.replace(/\/\/.*@/, '//***@');
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      console.log('Connected to MongoDB:', safe);
      return;
    } catch (err) {
      console.warn('Connection failed for', safe, '-', err.message);
      lastErr = err;
    }
  }
  throw lastErr || new Error('No MongoDB URI available');
}

async function main() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  const name = (process.env.ADMIN_NAME || 'Administrator').trim();

  if (!email) {
    console.error('ADMIN_EMAIL is required');
    process.exit(1);
  }
  if (!password) {
    console.error('ADMIN_PASSWORD is required');
    process.exit(1);
  }
  if (!STRONG_PASSWORD.test(password)) {
    console.error('ADMIN_PASSWORD must be 8-128 chars with upper, lower, digit and special character');
    process.exit(1);
  }

  await connectWithFallback();

  let user = await User.findOne({ email });

  if (user) {
    if (user.role === 'admin' && user.status === 'active') {
      console.log('An active admin with this email already exists. Nothing to do.');
    } else {
      user.role = 'admin';
      user.status = 'active';
      await user.save();
      console.log('Promoted existing user to admin:', email);
    }
  } else {
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await User.create({
      name,
      email,
      password: hashedPassword,
      role: 'admin',
      status: 'active',
    });
    console.log('Created admin:', email);
  }

  await mongoose.disconnect();
  console.log('Done.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});