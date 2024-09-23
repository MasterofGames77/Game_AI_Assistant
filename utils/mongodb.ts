import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local file
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const MAX_RETRIES = 5; // Set a limit for retries
let retries = 0;

const connectToMongoDB = async (): Promise<void> => {
  if (mongoose.connection.readyState === 0) {
    while (retries < MAX_RETRIES) {
      try {
        console.log(`[${new Date().toISOString()}] Attempting to connect to MongoDB...`);
        await mongoose.connect(process.env.MONGODB_URI as string); // No need for deprecated options
        console.log('Connected to MongoDB');
        break; // Exit loop on successful connection
      } catch (error) {
        retries += 1;
        console.error(`MongoDB connection error: ${error}. Retry ${retries}/${MAX_RETRIES}`);
        if (retries >= MAX_RETRIES) {
          throw new Error('Max retries reached. MongoDB connection failed.');
        }
        await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds before retrying
      }
    }
  } else {
    console.log('Already connected to MongoDB');
  }
};

// Listen for connection errors after initial connection
mongoose.connection.on('error', (err) => {
  console.error(`MongoDB connection error after initial connect: ${err}`);
});

export default connectToMongoDB;