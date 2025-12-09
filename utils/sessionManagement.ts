import { connectToWingmanDB } from './databaseConnections';
import Session from '../models/Session';
import { hashToken } from './tokenBlacklist';
import { getDeviceInfo, getIpAddress } from './deviceInfo';
import { NextApiRequest } from 'next';
import mongoose from 'mongoose';
import crypto from 'crypto';

/**
 * Session Management Utilities
 * 
 * Functions to create, update, and manage user sessions.
 */

/**
 * Create or update a session record
 * 
 * @param req - Next.js API request object
 * @param userId - User ID
 * @param username - Username
 * @param refreshToken - Refresh token (will be hashed)
 * @returns Session document
 */
export async function createOrUpdateSession(
  req: NextApiRequest,
  userId: string,
  username: string,
  refreshToken: string
): Promise<any> {
  try {
    // Ensure database connection
    if (mongoose.connection.readyState !== 1) {
      await connectToWingmanDB();
    }

    // Hash the refresh token to use as session identifier
    const refreshTokenHash = hashToken(refreshToken);
    
    // Generate a unique session ID (combination of userId and token hash)
    const sessionId = crypto
      .createHash('sha256')
      .update(`${userId}:${refreshTokenHash}`)
      .digest('hex')
      .substring(0, 32);

    // Extract device information
    const deviceInfo = getDeviceInfo(req);
    const ipAddress = getIpAddress(req);

    // Check if session already exists by refreshTokenHash (primary lookup)
    let existingSession = await Session.findOne({ refreshTokenHash });

    if (existingSession) {
      // Update existing session
      existingSession.lastActivity = new Date();
      existingSession.isActive = true;
      existingSession.deviceInfo = deviceInfo;
      existingSession.ipAddress = ipAddress;
      await existingSession.save();
      return existingSession;
    }

    // Also check by sessionId in case of collisions (defensive check)
    existingSession = await Session.findOne({ sessionId });

    if (existingSession) {
      // Session with this ID exists but different refreshTokenHash
      // This can happen during token refresh - update it with new hash
      existingSession.refreshTokenHash = refreshTokenHash;
      existingSession.lastActivity = new Date();
      existingSession.isActive = true;
      existingSession.deviceInfo = deviceInfo;
      existingSession.ipAddress = ipAddress;
      await existingSession.save();
      return existingSession;
    }

    // Create new session - use findOneAndUpdate with upsert to handle race conditions
    try {
      const session = await Session.findOneAndUpdate(
        { sessionId },
        {
          sessionId,
          userId,
          username,
          refreshTokenHash,
          deviceInfo,
          ipAddress,
          lastActivity: new Date(),
          isActive: true,
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );
      return session;
    } catch (error: any) {
      // If duplicate key error, try to find and update existing session
      if (error.code === 11000) {
        // Duplicate key - find existing session and update it
        const existing = await Session.findOne({ sessionId });
        if (existing) {
          existing.refreshTokenHash = refreshTokenHash;
          existing.lastActivity = new Date();
          existing.isActive = true;
          existing.deviceInfo = deviceInfo;
          existing.ipAddress = ipAddress;
          await existing.save();
          return existing;
        }
      }
      // Re-throw if it's not a duplicate key error or we can't find the session
      throw error;
    }
  } catch (error) {
    console.error('Error creating/updating session:', error);
    // Don't throw - session creation failure shouldn't break authentication
    // Return null to indicate failure, but don't block authentication
    return null;
  }
}

/**
 * Get all active sessions for a user
 * 
 * @param userId - User ID
 * @param currentRefreshTokenHash - Optional: hash of current session's refresh token
 * @returns Array of session documents (as plain objects)
 */
export async function getUserSessions(
  userId: string,
  currentRefreshTokenHash?: string
): Promise<any[]> {
  try {
    // Ensure database connection
    if (mongoose.connection.readyState !== 1) {
      await connectToWingmanDB();
    }

    // Get all active sessions for the user, sorted by last activity
    const sessions = await Session.find({
      userId,
      isActive: true,
    })
      .sort({ lastActivity: -1 })
      .lean();

    // Debug logging (development only)
    if (process.env.NODE_ENV === 'development') {
      console.log('[getUserSessions]', {
        userId,
        sessionsFound: sessions.length,
        sessionIds: sessions.map((s: any) => s.sessionId?.substring(0, 8) + '...'),
      });
    }

    // Mark current session if provided
    // Note: currentRefreshTokenHash is already hashed when passed from API endpoint
    if (currentRefreshTokenHash) {
      return sessions.map((session: any) => ({
        ...session,
        isCurrentSession: session.refreshTokenHash === currentRefreshTokenHash,
      }));
    }

    return sessions;
  } catch (error) {
    console.error('Error getting user sessions:', error);
    return [];
  }
}

/**
 * Revoke a specific session
 * 
 * @param sessionId - Session ID to revoke
 * @param userId - User ID (for security - ensure user can only revoke their own sessions)
 * @returns True if session was revoked, false otherwise
 */
export async function revokeSession(
  sessionId: string,
  userId: string
): Promise<boolean> {
  try {
    // Ensure database connection
    if (mongoose.connection.readyState !== 1) {
      await connectToWingmanDB();
    }

    // Find and deactivate the session (ensure it belongs to the user)
    const session = await Session.findOne({
      sessionId,
      userId,
      isActive: true,
    });

    if (!session) {
      return false;
    }

    session.isActive = false;
    await session.save();

    return true;
  } catch (error) {
    console.error('Error revoking session:', error);
    return false;
  }
}

/**
 * Revoke all sessions for a user (except optionally the current one)
 * 
 * @param userId - User ID
 * @param exceptRefreshTokenHash - Optional: hash of refresh token to keep active
 * @returns Number of sessions revoked
 */
export async function revokeAllUserSessions(
  userId: string,
  exceptRefreshTokenHash?: string
): Promise<number> {
  try {
    // Ensure database connection
    if (mongoose.connection.readyState !== 1) {
      await connectToWingmanDB();
    }

    const query: any = {
      userId,
      isActive: true,
    };

    // If we want to keep the current session active, exclude it
    if (exceptRefreshTokenHash) {
      const currentHash = hashToken(exceptRefreshTokenHash);
      query.refreshTokenHash = { $ne: currentHash };
    }

    // Deactivate all matching sessions
    const result = await Session.updateMany(query, {
      $set: { isActive: false },
    });

    return result.modifiedCount || 0;
  } catch (error) {
    console.error('Error revoking all user sessions:', error);
    return 0;
  }
}

/**
 * Cleanup old inactive sessions (older than specified days)
 * 
 * @param daysOld - Number of days old sessions should be before cleanup
 * @returns Number of sessions deleted
 */
export async function cleanupOldSessions(daysOld: number = 30): Promise<number> {
  try {
    // Ensure database connection
    if (mongoose.connection.readyState !== 1) {
      await connectToWingmanDB();
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    // Delete old inactive sessions
    const result = await Session.deleteMany({
      isActive: false,
      lastActivity: { $lt: cutoffDate },
    });

    return result.deletedCount || 0;
  } catch (error) {
    console.error('Error cleaning up old sessions:', error);
    return 0;
  }
}

