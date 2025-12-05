import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAccessToken, extractTokenFromHeader } from '../utils/jwt';
import { getTokenFromCookies, ACCESS_TOKEN_COOKIE } from '../utils/session';

export interface AuthenticatedRequest extends NextApiRequest {
  userId?: string;
  username?: string;
  userEmail?: string;
}

/**
 * Authentication middleware to protect API routes
 * Verifies JWT token from cookies or Authorization header
 */
export const requireAuth = async (
  req: AuthenticatedRequest,
  res: NextApiResponse
): Promise<{ authenticated: boolean; userId?: string; username?: string; userEmail?: string }> => {
  try {
    // Try to get token from cookies first (preferred method)
    let token = getTokenFromCookies(req.headers.cookie, ACCESS_TOKEN_COOKIE);

    // Fallback to Authorization header if no cookie
    if (!token) {
      token = extractTokenFromHeader(req.headers.authorization);
    }

    if (!token) {
      // Log for debugging (only in development)
      // Commented out for production
      // if (process.env.NODE_ENV === 'development') {
      //   console.log('[Auth] No token found in cookies or headers');
      //   console.log('[Auth] Cookie header:', req.headers.cookie ? 'present' : 'missing');
      // }
      return { authenticated: false };
    }

    // Verify the token
    const decoded = verifyAccessToken(token);

    // Attach user info to request object
    req.userId = decoded.userId;
    req.username = decoded.username;
    req.userEmail = decoded.email;

    return {
      authenticated: true,
      userId: decoded.userId,
      username: decoded.username,
      userEmail: decoded.email,
    };
  } catch (error) {
    // Token is invalid or expired
    // Commented out for production
    // if (process.env.NODE_ENV === 'development') {
    //   console.log('[Auth] Token verification failed:', error instanceof Error ? error.message : 'Unknown error');
    // }
    return { authenticated: false };
  }
};

/**
 * Middleware wrapper to protect API route handlers
 * Usage: export default withAuth(handler)
 */
export const withAuth = (
  handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>
) => {
  return async (req: AuthenticatedRequest, res: NextApiResponse) => {
    const authResult = await requireAuth(req, res);

    if (!authResult.authenticated) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please sign in to access this resource',
      });
    }

    return handler(req, res);
  };
};

/**
 * Optional authentication - doesn't fail if not authenticated
 * Useful for routes that work differently for authenticated vs anonymous users
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: NextApiResponse
): Promise<{ authenticated: boolean; userId?: string; username?: string; userEmail?: string }> => {
  try {
    return await requireAuth(req, res);
  } catch {
    return { authenticated: false };
  }
}; 