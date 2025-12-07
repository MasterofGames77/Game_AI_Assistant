import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyRefreshToken } from '../../../utils/jwt';
import { getTokenFromCookies, REFRESH_TOKEN_COOKIE, setAuthCookies } from '../../../utils/session';
import { blacklistToken } from '../../../utils/tokenBlacklist';
import { connectToWingmanDB } from '../../../utils/databaseConnections';
import User from '../../../models/User';
import mongoose from 'mongoose';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get refresh token from cookies
    const refreshToken = getTokenFromCookies(req.headers.cookie, REFRESH_TOKEN_COOKIE);

    if (!refreshToken) {
      return res.status(401).json({
        message: 'Refresh token not found',
      });
    }

    // Verify refresh token (now includes blacklist check)
    const decoded = await verifyRefreshToken(refreshToken);

    // Connect to database to verify user still exists
    if (mongoose.connection.readyState !== 1) {
      await connectToWingmanDB();
    }

    const user = await User.findOne({ userId: decoded.userId });

    if (!user) {
      return res.status(401).json({
        message: 'User not found',
      });
    }

    // Token rotation: Blacklist the old refresh token before issuing new ones
    // This prevents refresh token reuse (security best practice)
    await blacklistToken(
      refreshToken,
      user.userId,
      user.username,
      'refresh',
      'token_rotation'
    );

    // Generate new tokens
    setAuthCookies(res, user.userId, user.username, user.email);

    return res.status(200).json({
      message: 'Token refreshed successfully',
      user: {
        userId: user.userId,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Error in refresh API:', error);

    if (error instanceof Error) {
      if (error.message.includes('expired')) {
        return res.status(401).json({
          message: 'Refresh token expired. Please sign in again.',
        });
      }
      
      if (error.message.includes('revoked')) {
        return res.status(401).json({
          message: 'Refresh token has been revoked. Please sign in again.',
        });
      }
    }

    return res.status(401).json({
      message: 'Invalid refresh token',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
