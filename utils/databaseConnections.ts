import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Convert URL to file path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from repo root (.env / .env.local)
// NOTE: scripts run via `tsx` do NOT automatically load Next.js env files.
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Database connection instances
// let wingmanDB: mongoose.Connection;
let splashDB: mongoose.Connection;

// Connect to main application database (Wingman)
export const connectToWingmanDB = async (): Promise<mongoose.Connection> => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined');
    }

    if (mongoose.connection.readyState === 1) {
      return mongoose.connection;
    }

    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000, // Timeout after 10s
      socketTimeoutMS: 45000, // Close sockets after 45s
      maxPoolSize: 10,
    });

    console.log('Connected to MongoDB');
    return mongoose.connection;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

// Connect to splash page database
export const connectToSplashDB = async (): Promise<mongoose.Connection> => {
  // Only create new connection if none exists or previous connection closed
  if (!splashDB || splashDB.readyState === 0) {
    try {
      console.log('Connecting to Splash DB...');
      splashDB = await mongoose.createConnection(process.env.SPLASH_PAGE_MONGO_URI as string);
      console.log('Connected to Splash DB');
    } catch (error) {
      console.error('Error connecting to Splash DB:', error);
      throw error;
    }
  }
  return splashDB;
};