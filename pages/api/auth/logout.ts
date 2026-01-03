import type { NextApiRequest, NextApiResponse } from 'next';
import { clearAuthCookies, getTokenFromCookies, ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '../../../utils/session';
import { blacklistToken } from '../../../utils/tokenBlacklist';
import { verifyAccessToken, verifyRefreshToken } from '../../../utils/jwt';

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
              // Token might be expired or invalid - that's okay
              console.warn('Error blacklisting access token:', error instanceof Error ? error.message : error);
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
              // Token might be expired or invalid - that's okay
              console.warn('Error blacklisting refresh token:', error instanceof Error ? error.message : error);
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
