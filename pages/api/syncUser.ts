import type { NextApiRequest, NextApiResponse } from 'next';
import { syncUserData } from '../../utils/checkProAccess';
import { connectToWingmanDB } from '../../utils/databaseConnections';
import User from '../../models/User';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { userId, email } = req.body;

  if (!userId || !email) {
    return res.status(400).json({ message: 'userId and email are required' });
  }

  try {
    // First connect to the Wingman database
    const db = await connectToWingmanDB();
    
    // Create or update user document
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
      { upsert: true, new: true }
    );

    await syncUserData(userId, email);
    res.status(200).json({ message: 'User data synced successfully', user });
  } catch (error) {
    console.error('Error in syncUser API:', error);
    res.status(500).json({ message: 'Error syncing user data' });
  }
} 