import type { NextApiRequest, NextApiResponse } from 'next';
import { clearAuthCookies, getTokenFromCookies, ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '../../../utils/session';
import { blacklistToken } from '../../../utils/tokenBlacklist';
import { verifyAccessToken, verifyRefreshToken } from '../../../utils/jwt';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get tokens from cookies before clearing them
    const accessToken = getTokenFromCookies(req.headers.cookie, ACCESS_TOKEN_COOKIE);
    const refreshToken = getTokenFromCookies(req.headers.cookie, REFRESH_TOKEN_COOKIE);

    // Blacklist tokens if they exist and are valid
    if (accessToken) {
      try {
        const decoded = await verifyAccessToken(accessToken);
        await blacklistToken(
          accessToken,
          decoded.userId,
          decoded.username,
          'access',
          'logout'
        );
      } catch (error) {
        // Token might be expired or invalid, that's okay - just continue
        // We still want to clear cookies even if token is already invalid
      }
    }

    if (refreshToken) {
      try {
        const decoded = await verifyRefreshToken(refreshToken);
        await blacklistToken(
          refreshToken,
          decoded.userId,
          decoded.username,
          'refresh',
          'logout'
        );
      } catch (error) {
        // Token might be expired or invalid, that's okay - just continue
      }
    }

    // Clear authentication cookies
    clearAuthCookies(res);

    return res.status(200).json({
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Error in logout API:', error);
    
    // Even if blacklisting fails, clear cookies
    clearAuthCookies(res);
    
    return res.status(200).json({
      message: 'Logged out successfully',
      // Note: Tokens may not have been blacklisted if error occurred
    });
  }
}
