import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToWingmanDB } from '../../utils/databaseConnections';
import User from '../../models/User';
import mongoose from 'mongoose';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    if (mongoose.connection.readyState !== 1) {
      await connectToWingmanDB();
    }

    // Find the user we know exists
    const user = await User.findOne({ email: 'mgambardella16@gmail.com' });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Return the current user structure
    return res.status(200).json({
      message: 'Current database structure for mgambardella16@gmail.com',
      user: {
        _id: user._id,
        userId: user.userId,
        username: user.username,
        email: user.email,
        password: user.password ? '[HASHED]' : null,
        passwordResetToken: user.passwordResetToken,
        passwordResetExpires: user.passwordResetExpires,
        requiresPasswordSetup: user.requiresPasswordSetup,
        hasProAccess: user.hasProAccess,
        conversationCount: user.conversationCount,
        subscription: user.subscription,
        // Show which fields exist
        hasPasswordField: user.password !== undefined,
        hasPasswordResetTokenField: user.passwordResetToken !== undefined,
        hasPasswordResetExpiresField: user.passwordResetExpires !== undefined,
        hasRequiresPasswordSetupField: user.requiresPasswordSetup !== undefined,
      }
    });
  } catch (error) {
    console.error('Error checking database structure:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
