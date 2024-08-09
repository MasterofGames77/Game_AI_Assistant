import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local file
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const connectToMongoDB = async () => {
  if (mongoose.connection.readyState === 0) {
    try {
      console.log('Attempting to connect to MongoDB...');
      await mongoose.connect(process.env.MONGODB_URI as string);
      console.log('Connected to MongoDB');
    } catch (error) {
      console.error('MongoDB connection error:', error);
      throw new Error('MongoDB connection error');
    }
  } else {
    console.log('Already connected to MongoDB');
  }
};

export default connectToMongoDB;