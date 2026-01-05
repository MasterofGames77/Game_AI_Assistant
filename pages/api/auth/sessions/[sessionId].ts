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

    // Get the session to find the refresh token hash before revoking
    const { connectToWingmanDB } = await import('../../../../utils/databaseConnections');
    const Session = (await import('../../../../models/Session')).default;
    const mongoose = await import('mongoose');
    
    // Ensure database connection
    if (mongoose.default.connection.readyState !== 1) {
      await connectToWingmanDB();
    }

    // Find the session to get the refresh token hash
    const session = await Session.findOne({
      sessionId,
      userId,
      isActive: true,
    }).lean();

    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        message: 'The specified session was not found or has already been revoked.',
      });
    }

    // Revoke the session (mark as inactive)
    const revoked = await revokeSession(sessionId, userId);

    if (!revoked) {
      return res.status(404).json({
        error: 'Session not found',
        message: 'The specified session was not found or has already been revoked.',
      });
    }

    // Blacklist all tokens associated with this session's refresh token hash
    // We can't get the actual token, but we can blacklist by hash pattern
    // The refresh endpoint will check if the session is inactive and block refresh
    // For additional security, we could implement token blacklisting by hash,
    // but marking the session inactive and blocking refresh is sufficient
    
    // Note: The refresh endpoint now blocks refresh if isActive is false,
    // so the session cannot be reactivated. The access token will expire naturally
    // (15 minutes), and the refresh token cannot be used because refresh is blocked.

    return res.status(200).json({
      message: 'Session revoked successfully',
      sessionId,
      note: 'The session has been revoked. The user will be logged out on that device when they try to refresh their token.',
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

