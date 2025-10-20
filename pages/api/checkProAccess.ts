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
      
      // Debug: Find all users with this username to see what's happening
      const allUsers = await User.find({ 
        $or: [
          { username },
          { userId },
          ...(userId ? [{ userId }] : [])
        ]
      });
      
      // console.log('checkProAccess - all users found:', allUsers.map(u => ({
      //   // username: u.username,
      //   // userId: u.userId,
      //   // hasProAccess: u.hasProAccess,
      //   // subscription: u.subscription
      // }))); // Commented out for production
      
      const user = allUsers.find(u => u.hasProAccess) || allUsers[0];

      // If user has Pro access, get detailed subscription status
      if (user && user.hasProAccess) {
        // console.log('checkProAccess - user found with Pro access:', {
        //   // username: user.username,
        //   // hasProAccess: user.hasProAccess,
        //   // subscription: user.subscription,
        //   // hasGetSubscriptionStatus: typeof user.getSubscriptionStatus === 'function'
        // }); // Commented out for production
        
        try {
          subscriptionStatus = user.getSubscriptionStatus();
          // console.log('checkProAccess - user.getSubscriptionStatus() returned:', subscriptionStatus); // Commented out for production
        } catch (error) {
          console.error('Error calling getSubscriptionStatus:', error);
          subscriptionStatus = null;
        }
      } else {
        // console.log('checkProAccess - no user found or no Pro access:', {
        //   userFound: !!user,
        //   hasProAccess: user?.hasProAccess,
        //   allUsersCount: allUsers.length
        // }); // Commented out for production
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