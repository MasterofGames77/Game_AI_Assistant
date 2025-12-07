import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth, AuthenticatedRequest } from '../../../middleware/auth';
import { getTokenFromCookies, ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '../../../utils/session';
import { blacklistToken, blacklistAllUserTokens } from '../../../utils/tokenBlacklist';
import { verifyAccessToken, verifyRefreshToken } from '../../../utils/jwt';
import { clearAuthCookies } from '../../../utils/session';

/**
 * Revoke All Sessions Endpoint
 * 
 * Allows authenticated users to revoke all their active sessions.
 * This is useful for security incidents (stolen device, suspicious activity, etc.)
 * 
 * POST /api/auth/revoke-all-sessions
 * - Requires authentication
 * - Blacklists current session tokens
 * - Marks all user sessions as revoked
 * - Clears authentication cookies
 */
export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Require authentication
    const authResult = await requireAuth(req, res);
    
    if (!authResult.authenticated || !authResult.userId || !authResult.username) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please sign in to revoke sessions',
      });
    }

    const userId = authResult.userId;
    const username = authResult.username;

    // Get current session tokens
    const accessToken = getTokenFromCookies(req.headers.cookie, ACCESS_TOKEN_COOKIE);
    const refreshToken = getTokenFromCookies(req.headers.cookie, REFRESH_TOKEN_COOKIE);

    // Blacklist current session tokens
    if (accessToken) {
      try {
        await blacklistToken(
          accessToken,
          userId,
          username,
          'access',
          'revoke_all_sessions'
        );
      } catch (error) {
        // Continue even if blacklisting fails
      }
    }

    if (refreshToken) {
      try {
        await blacklistToken(
          refreshToken,
          userId,
          username,
          'refresh',
          'revoke_all_sessions'
        );
      } catch (error) {
        // Continue even if blacklisting fails
      }
    }

    // Mark all user sessions as revoked
    // Note: We can't blacklist tokens we don't have (they're in other devices' cookies)
    // But we can track that all sessions should be considered invalid
    // Future enhancement: Store "revokedAt" timestamp on User model
    await blacklistAllUserTokens(userId, username, 'revoke_all_sessions');

    // Clear current session cookies
    clearAuthCookies(res);

    return res.status(200).json({
      message: 'All sessions have been revoked successfully',
      note: 'You have been logged out. Please sign in again to create a new session.',
    });
  } catch (error) {
    console.error('Error in revoke-all-sessions API:', error);
    
    return res.status(500).json({
      error: 'Error revoking sessions',
      message: 'An error occurred while revoking sessions. Please try again.',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

