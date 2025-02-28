import type { NextApiRequest, NextApiResponse } from 'next';
import { syncUserData } from '../../utils/checkProAccess';
import { connectToWingmanDB } from '../../utils/databaseConnections';
import User from '../../models/User';
import mongoose from 'mongoose';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { userId, email } = req.body;

  if (!userId || !email) {
    return res.status(400).json({ message: 'userId and email are required' });
  }

  try {
    // Ensure mongoose is connected
    if (mongoose.connection.readyState !== 1) {
      await connectToWingmanDB();
    }
    
    // Check if the user already exists
    const existingUser = await User.findOne({ userId });
    if (existingUser) {
      return res.status(200).json({ message: 'User already exists', user: existingUser });
    }

    // Create a new user
    const user = await User.findOneAndUpdate(
      { userId },
      { 
        userId,
        email,
        $setOnInsert: {
          conversationCount: 0,
          hasProAccess: false,
          achievements: [],
          progress: {}
        }
      },
      { 
        upsert: true, 
        new: true,
        maxTimeMS: 5000
      }
    ).exec(); // Add .exec() to ensure proper promise handling

    await syncUserData(userId, email);
    res.status(200).json({ message: 'User data synced successfully', user });
  } catch (error) {
    console.error('Error in syncUser API:', error);
    res.status(500).json({ 
      message: 'Error syncing user data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 