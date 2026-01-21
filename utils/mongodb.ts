import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from repo root (.env / .env.local)
// NOTE: scripts run via `tsx` do NOT automatically load Next.js env files.
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MAX_RETRIES = 5; // Set a limit for retries
let retries = 0;
let errorListenerAttached = false; // Track if error listener has been attached

const connectToMongoDB = async (): Promise<void> => {
  // Set max listeners to prevent memory leak warnings
  // This is safe since we're reusing the same connection across multiple API routes
  // Increased to 50 to handle Next.js hot reloading and multiple module instances
  if (mongoose.connection.setMaxListeners) {
    mongoose.connection.setMaxListeners(50); // Increase from default 10 to 50
  }
  
  // Only attach error listener once, even if module is imported multiple times
  // Check if listener already exists by counting existing listeners
  const existingErrorListeners = mongoose.connection.listenerCount('error');
  if (existingErrorListeners === 0) {
    mongoose.connection.on('error', (err) => {
      console.error(`MongoDB connection error after initial connect: ${err}`);
    });
    errorListenerAttached = true;
  } else if (!errorListenerAttached) {
    // If listeners exist but flag isn't set, set it to prevent future additions
    errorListenerAttached = true;
  }
  
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

export default connectToMongoDB;