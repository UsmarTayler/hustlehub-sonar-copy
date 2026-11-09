require('dotenv').config();
const express = require('express');
const path = require('path');
const https = require('https');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { loadCredentials } = require('./config/ssl');
const { connectDB } = require('./config/db');
const sanitizeRequest = require('./middleware/sanitize');
const logger = require('./utils/logger');

const app = express();

if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY));

connectDB();

app.use(helmet({
  hsts: process.env.NODE_ENV === 'production' ? { maxAge: 31536000, includeSubDomains: true } : false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", 'https://fonts.googleapis.com'],
      imgSrc: ["'self'", 'data:'], fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      connectSrc: ["'self'"], objectSrc: ["'none'"], baseUri: ["'self'"], formAction: ["'self'"], frameAncestors: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
}));

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000,http://localhost:5443').split(',').map(o => o.trim());
app.use(cors({ origin: allowedOrigins }));

const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: 'draft-7', legacyHeaders: false, message: { success: false, message: 'Too many requests from this IP, please try again later.' } });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, skipSuccessfulRequests: true, standardHeaders: 'draft-7', legacyHeaders: false, message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' } });
const bookingLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: 'draft-7', legacyHeaders: false, message: { success: false, message: 'Too many booking requests. Please try again later.' } });

app.use('/api', generalLimiter);
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(sanitizeRequest);

app.use('/api/auth', authLimiter, require('./routes/authRoutes'));
app.use('/api/gigs', require('./routes/gigRoutes'));
app.use('/api/bookings', bookingLimiter, require('./routes/bookingRoutes'));
app.use('/api/income', require('./routes/incomeRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: 'HustleHub+ API is running', version: '2.0.0', timestamp: new Date().toISOString() });
});

app.use(express.static(path.join(__dirname, '..', 'frontend', 'dist')));
app.get(/^(?!\/api).*/, (req, res) => { res.sendFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html')); });

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use((err, req, res, next) => {
  logger.error('Unhandled Server Error', { message: err.message, path: req.originalUrl, method: req.method });
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);

  res.status(err.status || 500).json({
    success: false,
    message: err.status ? err.message : 'Something went wrong. Please try again later.',
  });
});

const PORT = process.env.PORT || 5443;

try {
  const credentials = loadCredentials();
  https.createServer(credentials, app).listen(PORT, () => {
    console.log('Server running over HTTPS on port ' + PORT);
    console.log('Environment: ' + (process.env.NODE_ENV || 'development'));
    console.log('API available at: https://localhost:' + PORT);
  });
} catch {
  console.log('SSL certificate not found, falling back to HTTP');
  app.listen(PORT, () => {
    console.log('Server running over HTTP on port ' + PORT);
    console.log('Environment: ' + (process.env.NODE_ENV || 'development'));
    console.log('API available at: http://localhost:' + PORT);
  });
}

module.exports = app;