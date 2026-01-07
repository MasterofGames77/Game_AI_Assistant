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
              // Token might be expired or invalid - that's okay, logout should still proceed
              const errorMessage = error instanceof Error ? error.message : String(error);
              // Only log if it's not a common expected error (expired/invalid tokens are normal)
              if (!errorMessage.includes('expired') && !errorMessage.includes('Invalid')) {
                console.warn('Error blacklisting access token:', errorMessage);
              }
              // Silently continue - expired/invalid tokens don't need to be blacklisted
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
              // Token might be expired or invalid - that's okay, logout should still proceed
              const errorMessage = error instanceof Error ? error.message : String(error);
              // Only log if it's not a common expected error (expired/invalid tokens are normal)
              if (!errorMessage.includes('expired') && !errorMessage.includes('Invalid')) {
                console.warn('Error blacklisting refresh token:', errorMessage);
              }
              // Silently continue - expired/invalid tokens don't need to be blacklisted
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

    // Mark the current session as inactive (non-blocking)
    // This ensures the session doesn't show up in Active Sessions after logout
    if (refreshToken) {
      try {
        // Ensure database connection
        if (mongoose.connection.readyState !== 1) {
          await connectToWingmanDB();
        }

        // Hash the refresh token to find the session
        const refreshTokenHash = hashToken(refreshToken);
        
        // Mark session as inactive (remove isActive: true filter to catch all sessions with this token)
        // This ensures we mark it inactive even if there's a race condition
        const updateResult = await Session.updateOne(
          { refreshTokenHash },
          { $set: { isActive: false } }
        ).maxTimeMS(2000); // 2 second timeout

        // Log for debugging (development only)
        if (process.env.NODE_ENV === 'development') {
          console.log('[Logout] Session deactivation result:', {
            matchedCount: updateResult.matchedCount,
            modifiedCount: updateResult.modifiedCount,
            refreshTokenHashPrefix: refreshTokenHash.substring(0, 8) + '...',
          });
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
