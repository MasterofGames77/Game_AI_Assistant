import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToWingmanDB } from '../../../utils/databaseConnections';
import User from '../../../models/User';
import { comparePassword } from '../../../utils/passwordUtils';
import mongoose from 'mongoose';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { identifier, password } = req.body; // identifier can be username or email

  // Validate required fields
  if (!identifier) {
    return res.status(400).json({ 
      message: 'Username or email is required' 
    });
  }

  try {
    // Connect to database
    if (mongoose.connection.readyState !== 1) {
      await connectToWingmanDB();
    }

    // Find user by username or email
    const user = await User.findOne({
      $or: [
        { username: identifier },
        { email: identifier }
      ]
    });

    if (!user) {
      return res.status(401).json({ 
        message: 'Invalid username/email or password' 
      });
    }

    // Check if user has a password (new user) or not (legacy user)
    if (!user.password) {
      // Legacy user - no password required for now
      // Return special flag to indicate password setup is needed
      const { password: _, ...userResponse } = user.toObject();
      
      return res.status(200).json({
        message: 'Signed in successfully',
        user: userResponse,
        requiresPasswordSetup: true,
        isLegacyUser: true
      });
    }

    // New user with password - validate password
    if (!password) {
      return res.status(400).json({ 
        message: 'Password is required' 
      });
    }

    // Compare provided password with stored hash
    const isPasswordValid = await comparePassword(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ 
        message: 'Invalid username/email or password' 
      });
    }

    // Successful authentication
    const { password: _, ...userResponse } = user.toObject();

    return res.status(200).json({
      message: 'Signed in successfully',
      user: userResponse,
      requiresPasswordSetup: false,
      isLegacyUser: false
    });

  } catch (error) {
    console.error('Error in signin API:', error);
    
    return res.status(500).json({
      message: 'Error signing in. Please try again.',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
