import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth, AuthenticatedRequest } from '../../../../middleware/auth';
import { revokeSession } from '../../../../utils/sessionManagement';
import { blacklistToken } from '../../../../utils/tokenBlacklist';
import { getTokenFromCookies, REFRESH_TOKEN_COOKIE } from '../../../../utils/session';
import { hashToken } from '../../../../utils/tokenBlacklist';

/**
 * Individual Session Endpoint
 * 
 * DELETE /api/auth/sessions/[sessionId]
 * - Revokes a specific session
 * - Requires authentication
 * - Users can only revoke their own sessions
 */
export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
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
    const sessionId = req.query.sessionId as string;

    if (!sessionId) {
      return res.status(400).json({
        error: 'Session ID required',
        message: 'Please provide a session ID to revoke',
      });
    }

    // Revoke the session
    const revoked = await revokeSession(sessionId, userId);

    if (!revoked) {
      return res.status(404).json({
        error: 'Session not found',
        message: 'The specified session was not found or has already been revoked.',
      });
    }

    // Note: We can't blacklist the refresh token for this session because we don't have it
    // The session record being marked as inactive will prevent it from being used
    // The token will naturally expire after 7 days

    return res.status(200).json({
      message: 'Session revoked successfully',
      sessionId,
    });
  } catch (error) {
    console.error('Error in session revocation API:', error);
    
    return res.status(500).json({
      error: 'Error revoking session',
      message: 'An error occurred while revoking the session. Please try again.',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

