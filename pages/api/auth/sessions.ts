import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth, AuthenticatedRequest } from '../../../middleware/auth';
import { getTokenFromCookies, REFRESH_TOKEN_COOKIE } from '../../../utils/session';
import { getUserSessions } from '../../../utils/sessionManagement';
import { hashToken } from '../../../utils/tokenBlacklist';

/**
 * Sessions Endpoint
 * 
 * GET /api/auth/sessions
 * - Returns all active sessions for the authenticated user
 * - Marks the current session
 * 
 * DELETE /api/auth/sessions
 * - Revokes all sessions except the current one
 */
export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    // Require authentication
    const authResult = await requireAuth(req, res);
    
    if (!authResult.authenticated || !authResult.userId) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please sign in to view sessions',
      });
    }

    const userId = authResult.userId;

    if (req.method === 'GET') {
      // Get current session's refresh token hash to mark it
      const currentRefreshToken = getTokenFromCookies(req.headers.cookie, REFRESH_TOKEN_COOKIE);
      const currentRefreshTokenHash = currentRefreshToken ? hashToken(currentRefreshToken) : undefined;

      // Get all active sessions
      const sessions = await getUserSessions(userId, currentRefreshTokenHash);

      // Format sessions for response
      const formattedSessions = sessions.map((session: any) => ({
        sessionId: session.sessionId,
        deviceInfo: session.deviceInfo,
        ipAddress: session.ipAddress,
        location: session.location,
        lastActivity: session.lastActivity,
        createdAt: session.createdAt,
        isCurrentSession: session.isCurrentSession || false,
      }));

      return res.status(200).json({
        sessions: formattedSessions,
        count: formattedSessions.length,
      });
    } else if (req.method === 'DELETE') {
      // Revoke all sessions except current one
      const currentRefreshToken = getTokenFromCookies(req.headers.cookie, REFRESH_TOKEN_COOKIE);
      
      const { revokeAllUserSessions } = await import('../../../utils/sessionManagement');
      const revokedCount = await revokeAllUserSessions(
        userId,
        currentRefreshToken || undefined
      );

      return res.status(200).json({
        message: 'All other sessions have been revoked',
        revokedCount,
        note: 'Your current session remains active. Please sign in again on other devices.',
      });
    } else {
      return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in sessions API:', error);
    
    return res.status(500).json({
      error: 'Error processing request',
      message: 'An error occurred while processing your request. Please try again.',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

