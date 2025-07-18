import type { NextApiRequest, NextApiResponse } from 'next';
import { checkProAccess } from '../../utils/proAccessUtil';
import { connectToWingmanDB } from '../../utils/databaseConnections';
import User from '../../models/User';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { username, userId } = req.body;

    if (!username) {
      return res.status(400).json({ message: 'Username is required' });
    }

    // Check basic Pro access
    const hasProAccess = await checkProAccess(username, userId);

    // Get detailed subscription information
    let subscriptionStatus = null;
    if (hasProAccess) {
      await connectToWingmanDB();
      const user = await User.findOne({ 
        $or: [
          { username },
          { userId },
          ...(userId ? [{ userId }] : [])
        ]
      });

      if (user && user.getSubscriptionStatus) {
        subscriptionStatus = user.getSubscriptionStatus();
      }
    }

    return res.status(200).json({ 
      hasProAccess,
      subscriptionStatus
    });
  } catch (error) {
    console.error('Error checking Pro access:', error);
    return res.status(500).json({ 
      message: 'Error checking Pro access',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 