import type { NextApiRequest, NextApiResponse } from 'next';
import { clearAuthCookies, getTokenFromCookies, ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '../../../utils/session';
import { blacklistToken, hashToken } from '../../../utils/tokenBlacklist';
import { verifyAccessToken, verifyRefreshToken } from '../../../utils/jwt';
import { connectToWingmanDB } from '../../../utils/databaseConnections';
import Session from '../../../models/Session';
import mongoose from 'mongoose';

/**
 * Helper function to add timeout to promises
 * Prevents operations from hanging indefinitely
 */
function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${operation} timed out after ${timeoutMs}ms`)),
        timeoutMs
      )
    ),
  ]);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get tokens from cookies before clearing them
    const accessToken = getTokenFromCookies(req.headers.cookie, ACCESS_TOKEN_COOKIE);
    const refreshToken = getTokenFromCookies(req.headers.cookie, REFRESH_TOKEN_COOKIE);

    // Blacklist tokens if they exist and are valid
    // Use timeout to prevent hanging on database operations
    // Run both operations in parallel to reduce total time
    const blacklistPromises: Promise<void>[] = [];

    if (accessToken) {
      blacklistPromises.push(
        withTimeout(
          (async () => {
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
              // Token might be expired, invalid, or already revoked - that's okay, logout should still proceed
              const errorMessage = error instanceof Error ? error.message : String(error);
              // Only log if it's not a common expected error (expired/invalid/revoked tokens are normal)
              if (
                !errorMessage.includes('expired') && 
                !errorMessage.includes('Invalid') && 
                !errorMessage.includes('revoked')
              ) {
                console.warn('Error blacklisting access token:', errorMessage);
              }
              // Silently continue - expired/invalid/revoked tokens don't need to be blacklisted
            }
          })(),
          3000, // 3 second timeout per token
          'Access token blacklisting'
        ).catch(() => {
          // Timeout or error - continue with logout
        })
      );
    }

    if (refreshToken) {
      blacklistPromises.push(
        withTimeout(
          (async () => {
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
              // Token might be expired, invalid, or already revoked - that's okay, logout should still proceed
              const errorMessage = error instanceof Error ? error.message : String(error);
              // Only log if it's not a common expected error (expired/invalid/revoked tokens are normal)
              if (
                !errorMessage.includes('expired') && 
                !errorMessage.includes('Invalid') && 
                !errorMessage.includes('revoked')
              ) {
                console.warn('Error blacklisting refresh token:', errorMessage);
              }
              // Silently continue - expired/invalid/revoked tokens don't need to be blacklisted
            }
          })(),
          3000, // 3 second timeout per token
          'Refresh token blacklisting'
        ).catch(() => {
          // Timeout or error - continue with logout
        })
      );
    }

    // Wait for all blacklisting operations (with timeouts) to complete or timeout
    // This ensures we don't wait longer than 3 seconds total
    await Promise.allSettled(blacklistPromises);

    // Mark the current session and all sessions from the same device as inactive (non-blocking)
    // This ensures the session doesn't show up in Active Sessions after logout
    // We mark by refreshTokenHash AND by device/IP to catch all sessions from this device
    if (refreshToken) {
      try {
        // Ensure database connection
        if (mongoose.connection.readyState !== 1) {
          await connectToWingmanDB();
        }

        // Hash the refresh token to find the session
        const refreshTokenHash = hashToken(refreshToken);
        
        // First, find the current session to get device info
        const currentSession = await Session.findOne({ refreshTokenHash }).lean();
        
        // Type guard: ensure currentSession is a single object, not an array
        if (currentSession && !Array.isArray(currentSession) && typeof currentSession === 'object' && 'userId' in currentSession) {
          // Get device info from request to match sessions from same device
          const { getDeviceInfo, getIpAddress } = await import('../../../utils/deviceInfo');
          const deviceInfo = getDeviceInfo(req);
          const ipAddress = getIpAddress(req);
          
          // Mark ALL sessions from this device/IP as inactive
          // This catches cases where token rotation created new sessions
          // We match by userId + device info to deactivate all sessions from this device
          const deviceMatch: any = {
            userId: (currentSession as any).userId,
            isActive: true, // Only mark active sessions
          };
          
          // Match by IP address (most reliable for same device)
          if (ipAddress && ipAddress !== '::1' && !ipAddress.includes('127.0.0.1')) {
            deviceMatch.ipAddress = ipAddress;
          }
          
          // Also match by user agent if available (helps identify same browser/device)
          if (deviceInfo.userAgent) {
            deviceMatch['deviceInfo.userAgent'] = deviceInfo.userAgent;
          }
          
          // Mark all matching sessions as inactive
          const updateResult = await Session.updateMany(
            deviceMatch,
            { $set: { isActive: false } }
          ).maxTimeMS(2000); // 2 second timeout

          // Log for debugging (development only)
          if (process.env.NODE_ENV === 'development') {
            console.log('[Logout] Session deactivation result:', {
              matchedCount: updateResult.matchedCount,
              modifiedCount: updateResult.modifiedCount,
              refreshTokenHashPrefix: refreshTokenHash.substring(0, 8) + '...',
              ipAddress,
              userAgent: deviceInfo.userAgent?.substring(0, 50) + '...',
            });
          }
        } else {
          // Fallback: if we can't find the session, try to mark by refreshTokenHash anyway
          // This handles edge cases where session lookup fails
          const fallbackResult = await Session.updateOne(
            { refreshTokenHash },
            { $set: { isActive: false } }
          ).maxTimeMS(2000);
          
          if (process.env.NODE_ENV === 'development') {
            console.log('[Logout] Fallback session deactivation:', {
              matchedCount: fallbackResult.matchedCount,
              modifiedCount: fallbackResult.modifiedCount,
            });
          }
        }
      } catch (sessionError) {
        // Log but don't fail logout - session deactivation is best effort
        console.warn('Error deactivating session on logout:', sessionError instanceof Error ? sessionError.message : sessionError);
      }
    }

    // Always clear authentication cookies, even if blacklisting failed or timed out
    clearAuthCookies(res);

    return res.status(200).json({
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Error in logout API:', error);
    
    // Even if everything fails, clear cookies
    clearAuthCookies(res);
    
    return res.status(200).json({
      message: 'Logged out successfully',
      // Note: Tokens may not have been blacklisted if error occurred
    });
  }
}
