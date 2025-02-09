import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Convert URL to file path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local file
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

// Database connection instances
let wingmanDB: mongoose.Connection;
let splashDB: mongoose.Connection;

// Connect to main application database (Wingman)
export const connectToWingmanDB = async (): Promise<mongoose.Connection> => {
  // Only create new connection if none exists or previous connection closed
  if (!wingmanDB || wingmanDB.readyState === 0) {
    try {
      console.log('Connecting to Wingman DB...');
      wingmanDB = await mongoose.createConnection(process.env.MONGODB_URI as string);
      console.log('Connected to Wingman DB');
    } catch (error) {
      console.error('Error connecting to Wingman DB:', error);
      throw error;
    }
  }
  return wingmanDB;
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