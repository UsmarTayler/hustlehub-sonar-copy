const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../utils/jwt');
const { logActivity } = require('../middleware/auditLog');
const logger = require('../utils/logger');

async function register(req, res) {
  try {
    const { name, email, password, role = 'client' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: role === 'admin' ? 'client' : role
    });

    await user.save();

    logActivity(req, 'user.registered', {
      actorId: user._id, actorName: user.name, actorRole: user.role,
      targetType: 'User', targetId: user._id, metadata: { email: user.email }
    });

    return res.status(201).json({
      success: true, message: 'User registered successfully',
      data: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ success: false, message: 'Something went wrong during registration' });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      logger.warn('Failed login attempt - User not found', { email });
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const passwordMatches = await user.comparePassword(password);
    if (!passwordMatches) {
      logger.warn('Failed login attempt - Incorrect password', { email });
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (user.status && user.status !== 'active') {
      logActivity(req, 'user.login_blocked', {
        actorId: user._id, actorName: user.name, actorRole: user.role,
        targetType: 'User', targetId: user._id, metadata: { reason: user.status, email: user.email }
      });
      logger.warn('Blocked login attempt', { email, status: user.status });
      return res.status(403).json({ success: false, message: 'This account has been ' + user.status });
    }

    const token = generateToken({ id: user._id, name: user.name, email: user.email, role: user.role });

    logActivity(req, 'user.login', {
      actorId: user._id, actorName: user.name, actorRole: user.role,
      targetType: 'User', targetId: user._id, metadata: { email: user.email }
    });

    logger.info('User logged in successfully', { email: user.email, role: user.role });

    return res.status(200).json({
      success: true, message: 'Login successful',
      data: { token, user: { id: user._id, name: user.name, email: user.email, role: user.role, status: user.status } },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Something went wrong during login' });
  }
}

async function profile(req, res) {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return res.status(200).json({
      success: true, message: 'Profile retrieved successfully',
      data: { id: user._id, name: user.name, email: user.email, role: user.role, status: user.status, createdAt: user.createdAt }
    });
  } catch (error) {
    console.error('Profile error:', error);
    return res.status(500).json({ success: false, message: 'Something went wrong while fetching profile' });
  }
}

module.exports = { register, login, profile };