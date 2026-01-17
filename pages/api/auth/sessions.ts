import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth, AuthenticatedRequest } from '../../../middleware/auth';
import { getTokenFromCookies, REFRESH_TOKEN_COOKIE } from '../../../utils/session';
import { getUserSessions, createOrUpdateSession } from '../../../utils/sessionManagement';
import { hashToken } from '../../../utils/tokenBlacklist';
import User from '../../../models/User';

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
      // Log for debugging (production-safe - no sensitive data)
      if (process.env.NODE_ENV === 'development') {
        console.log('[Sessions API] Auth failed:', {
          hasCookie: !!req.headers.cookie,
          cookieHeader: req.headers.cookie ? 'present' : 'missing',
        });
      }
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

      // Get all active sessions first
      let sessions = await getUserSessions(userId, currentRefreshTokenHash);

      // If we have a refresh token but no active sessions, try to create/update the session
      // This handles cases where session creation failed during login but user is still authenticated
      // SAFETY: createOrUpdateSession will:
      // - Update existing session if found by refreshTokenHash (prevents duplicates)
      // - NOT reactivate inactive sessions (they stay inactive after logout)
      // - Create new session only if none exists with this token hash
      if (currentRefreshToken && currentRefreshTokenHash && sessions.length === 0) {
        try {
          const user = await User.findOne({ userId });
          if (user && user.username) {
            // Try to create/update session if it doesn't exist
            // This uses the current refresh token, so it will only match/create a session for THIS token
            // Old sessions from previous logins remain inactive and won't be reactivated
            await createOrUpdateSession(req, userId, user.username, currentRefreshToken);
            // Re-fetch sessions after creating
            sessions = await getUserSessions(userId, currentRefreshTokenHash);
          }
        } catch (error) {
          // Log but don't fail - session creation is non-blocking
          console.error('[Sessions API] Error ensuring session exists:', error);
        }
      }

      // Debug logging (development only)
      if (process.env.NODE_ENV === 'development') {
        console.log('[Sessions API]', {
          userId,
          hasRefreshToken: !!currentRefreshToken,
          hasRefreshTokenHash: !!currentRefreshTokenHash,
          sessionsFound: sessions.length,
          sessionDetails: sessions.map((s: any) => ({
            sessionId: s.sessionId?.substring(0, 8) + '...',
            isActive: s.isActive,
            isCurrentSession: s.isCurrentSession,
            lastActivity: s.lastActivity,
          })),
        });
      }

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

