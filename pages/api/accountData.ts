import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToWingmanDB } from '../../utils/databaseConnections';
import User from '../../models/User';
import Question from '../../models/Question';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ message: 'Username is required' });
    }

    await connectToWingmanDB();

    const user = await User.findOne({ username }).select('-__v');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Count actual Question documents for accurate conversation count
    const actualConversationCount = await Question.countDocuments({ username });

    // Return user data without sensitive information
    const userData = {
      user: {
        username: user.username,
        email: user.email,
        password: user.password, // Include password field for hasPassword check
        conversationCount: actualConversationCount, // Use actual count instead of user.conversationCount
        hasProAccess: user.hasProAccess,
        achievements: user.achievements || [],
        progress: user.progress || {},
        subscription: user.subscription || null,
        healthMonitoring: user.healthMonitoring || null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    };

    return res.status(200).json(userData);
  } catch (error) {
    console.error('Error fetching account data:', error);
    return res.status(500).json({
      message: 'Error fetching account data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 