import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToWingmanDB } from '../../../utils/databaseConnections';
import User from '../../../models/User';
import { hashPassword, validatePassword } from '../../../utils/passwordUtils';
import mongoose from 'mongoose';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { token, newPassword } = req.body;

  // Validate required fields
  if (!token || !newPassword) {
    return res.status(400).json({ 
      message: 'Reset token and new password are required' 
    });
  }

  // Validate password strength
  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.isValid) {
    return res.status(400).json({ 
      message: passwordValidation.message 
    });
  }

  try {
    // Connect to database
    if (mongoose.connection.readyState !== 1) {
      await connectToWingmanDB();
    }

    // Find user by reset token and check if it's still valid
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() } // Token must not be expired
    });

    if (!user) {
      return res.status(400).json({ 
        message: 'Invalid or expired reset token' 
      });
    }

    // Hash the new password
    const hashedPassword = await hashPassword(newPassword);

    // Update user with new password and clear reset token
    await User.findOneAndUpdate(
      { _id: user._id },
      {
        password: hashedPassword,
        passwordResetToken: undefined,
        passwordResetExpires: undefined,
        requiresPasswordSetup: false // They've now set their password
      }
    );

    return res.status(200).json({
      message: 'Password has been reset successfully. You can now sign in with your new password.'
    });

  } catch (error) {
    console.error('Error in reset-password API:', error);
    
    return res.status(500).json({
      message: 'Error resetting password. Please try again.',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
