import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToWingmanDB } from '../../../utils/databaseConnections';
import User from '../../../models/User';
import { generateResetToken } from '../../../utils/passwordUtils';
import { sendPasswordResetEmail } from '../../../utils/emailService';
import mongoose from 'mongoose';

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { email } = req.body;

  // Validate required fields
  if (!email) {
    return res.status(400).json({ 
      message: 'Email is required' 
    });
  }

  // Validate email format
  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ 
      message: 'Please enter a valid email address' 
    });
  }

  try {
    // Connect to database
    if (mongoose.connection.readyState !== 1) {
      await connectToWingmanDB();
    }

    // Find user by email
    const user = await User.findOne({ email });

    // Always return success message for security (don't reveal if email exists)
    // But only send email if user actually exists
    if (user) {
      // Generate reset token
      const resetToken = generateResetToken();
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      // Update user with reset token
      await User.findOneAndUpdate(
        { email },
        {
          passwordResetToken: resetToken,
          passwordResetExpires: resetExpires
        }
      );

      // Send password reset email
      const emailSent = await sendPasswordResetEmail(email, resetToken, user.username);
      
      if (!emailSent) {
        console.error(`Failed to send password reset email to ${email}`);
        // Still return success to user for security
      }
    }

    // Always return success message (security best practice)
    return res.status(200).json({
      message: 'If an account with that email exists, we\'ve sent a password reset link.'
    });

  } catch (error) {
    console.error('Error in forgot-password API:', error);
    
    // Still return success message for security
    return res.status(200).json({
      message: 'If an account with that email exists, we\'ve sent a password reset link.'
    });
  }
}
