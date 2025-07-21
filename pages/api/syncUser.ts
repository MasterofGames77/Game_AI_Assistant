import type { NextApiRequest, NextApiResponse } from 'next';
import { syncUserData } from '../../utils/proAccessUtil';
import { connectToWingmanDB } from '../../utils/databaseConnections';
import User from '../../models/User';
import mongoose from 'mongoose';
import { containsOffensiveContent } from '../../utils/contentModeration';
import { handleContentViolation } from '../../utils/violationHandler';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { userId, email, username } = req.body;

  if (!userId || !email) {
    return res.status(400).json({ message: 'userId and email are required' });
  }

  if (userId === username || email === username) {
    return res.status(400).json({ message: "Invalid userId or email" });
  }

  try {
    if (mongoose.connection.readyState !== 1) {
      await connectToWingmanDB();
    }

    // Check for offensive content in username
    if (username) {
      const contentCheck = await containsOffensiveContent(username, userId);
      if (contentCheck.isOffensive) {
        // Add a warning to the user's violation record
        const violationResult = await handleContentViolation(username, contentCheck.offendingWords);
        return res.status(400).json({ 
          message: 'Username contains offensive content. Please try a different username.',
          offendingWords: contentCheck.offendingWords,
          violationResult
        });
      }
    }

    // Find user by userId
    let user = await User.findOne({ userId });

    // If user exists but has no username, require one to be set
    if (user && !user.username) {
      if (!username) {
        return res.status(400).json({ message: 'Username required for legacy user' });
      }
      // Check if username is taken by another user
      const usernameTaken = await User.findOne({ username, userId: { $ne: userId } });
      if (usernameTaken) {
        return res.status(409).json({ message: 'Username is already taken' });
      }
      // Update legacy user with new username
      user.username = username;
      await user.save();
      await syncUserData(userId, email);
      return res.status(200).json({ message: 'Username set for legacy user', user });
    }

    // If user does not exist, require username for new user
    if (!user && !username) {
      return res.status(400).json({ message: 'Username is required for new users' });
    }

    // Find user by username
    const userByUsername = await User.findOne({ username });

    if (userByUsername) {
      // If the username is taken by the same userId, allow sign-in
      if (userByUsername.userId === userId) {
        // This is the same user, treat as sign-in
        return res.status(200).json({ message: 'Signed in', user: userByUsername });
      } else {
        // Username is taken by someone else
        return res.status(409).json({ message: 'Username is already taken' });
      }
    }

    // If username is not taken, create or update user
    user = await User.findOneAndUpdate(
      { userId },
      {
        userId,
        email,
        username,
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
    ).exec();

    // Sync user data (this will handle early access eligibility)
    await syncUserData(userId, email);
    
    // Fetch the updated user to get the latest subscription data
    const updatedUser = await User.findOne({ userId });
    
    // Check if user is eligible for early access and set up subscription
    if (updatedUser && !updatedUser.subscription?.earlyAccessGranted) {
      const earlyAccessDeadline = new Date('2025-12-31T23:59:59.999Z');
      const currentDate = new Date();
      
      // Check if user signed up before the deadline
      if (currentDate <= earlyAccessDeadline) {
        const earlyAccessStartDate = new Date('2025-12-31T23:59:59.999Z');
        const earlyAccessEndDate = new Date('2026-12-31T23:59:59.999Z');
        
        // Update user with early access subscription
        await User.findOneAndUpdate(
          { userId },
          {
            hasProAccess: true,
            subscription: {
              status: 'free_period',
              earlyAccessGranted: true,
              earlyAccessStartDate,
              earlyAccessEndDate,
              transitionToPaid: false,
              currentPeriodStart: earlyAccessStartDate,
              currentPeriodEnd: earlyAccessEndDate
            }
          }
        );
        
        // Fetch the final updated user
        const finalUser = await User.findOne({ userId });
        return res.status(200).json({ 
          message: 'User data synced successfully - Early access granted!', 
          user: finalUser,
          earlyAccessGranted: true
        });
      }
    }
    
    return res.status(200).json({ message: 'User data synced successfully', user: updatedUser });
  } catch (error) {
    console.error('Error in syncUser API:', error);
    res.status(500).json({
      message: 'Error syncing user data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 