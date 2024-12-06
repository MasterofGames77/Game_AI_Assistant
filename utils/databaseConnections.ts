import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

let wingmanDB: mongoose.Connection;
let splashDB: mongoose.Connection;

export const connectToWingmanDB = async (): Promise<mongoose.Connection> => {
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

export const connectToSplashDB = async (): Promise<mongoose.Connection> => {
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