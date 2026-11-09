const mongoose = require('mongoose');

let isConnected = false;

async function connectDB() {
  if (isConnected) {
    console.log('MongoDB already connected');
    return;
  }

  const atlasURI = process.env.MONGODB_URI_ATLAS;
  const localURI = process.env.MONGODB_URI_LOCAL || 'mongodb://localhost:27017/hustlehub';

  // Try Atlas first if configured
  if (atlasURI) {
    try {
      console.log('Attempting to connect to MongoDB Atlas...');
      await mongoose.connect(atlasURI);
      isConnected = true;
      console.log('MongoDB Atlas connected successfully');
      setupConnectionEvents();
      return;
    } catch (error) {
      console.warn('Atlas connection failed:', error.message);
      console.log('Falling back to local MongoDB...');
    }
  }

  // Fall back to local MongoDB
  try {
    console.log('Connecting to local MongoDB at:', localURI);
    await mongoose.connect(localURI);
    isConnected = true;
    console.log('Local MongoDB connected successfully');
    setupConnectionEvents();
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    console.log('Server running without MongoDB. Some features may not work.');
  }
}

function setupConnectionEvents() {
  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected');
    isConnected = false;
  });
}

async function disconnectDB() {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
    console.log('MongoDB disconnected');
  }
}

module.exports = { connectDB, disconnectDB };