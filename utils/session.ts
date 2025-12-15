import type { NextApiRequest, NextApiResponse } from 'next';
import { serialize } from 'cookie';
import { generateAccessToken, generateRefreshToken, verifyAccessToken, extractTokenFromHeader } from './jwt';
import { createOrUpdateSession } from './sessionManagement';

// Cookie configuration
const COOKIE_OPTIONS = {
  httpOnly: true, // Prevents JavaScript access (XSS protection)
  secure: process.env.NODE_ENV === 'production', // HTTPS only in production
  // Use 'lax' in production for better compatibility with proxies/redirects
  // 'strict' can cause issues when behind Cloudflare or other proxies
  sameSite: (process.env.NODE_ENV === 'production' ? 'lax' : 'strict') as 'lax' | 'strict',
  path: '/',
};

// Cookie names
export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

/**
 * Set authentication cookies
 */
export const setAuthCookies = (
  res: NextApiResponse,
  userId: string,
  username: string,
  email?: string
): void => {
  // Generate tokens
  const accessToken = generateAccessToken({ userId, username, email });
  const refreshToken = generateRefreshToken({ userId, username, email });

  // Calculate expiration times
  const accessTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // Use cookie library's serialize function for proper formatting
  const accessTokenCookie = serialize(ACCESS_TOKEN_COOKIE, accessToken, {
    httpOnly: COOKIE_OPTIONS.httpOnly,
    secure: COOKIE_OPTIONS.secure,
    sameSite: COOKIE_OPTIONS.sameSite,
    path: COOKIE_OPTIONS.path,
    expires: accessTokenExpiry,
  });

  const refreshTokenCookie = serialize(REFRESH_TOKEN_COOKIE, refreshToken, {
    httpOnly: COOKIE_OPTIONS.httpOnly,
    secure: COOKIE_OPTIONS.secure,
    sameSite: COOKIE_OPTIONS.sameSite,
    path: COOKIE_OPTIONS.path,
    expires: refreshTokenExpiry,
  });

  // Set both cookies as an array
  // Next.js should handle this correctly, but if only one appears in response,
  // it may be a proxy/HTTP/2 issue (Cloudflare/Heroku)
  const cookiesArray = [accessTokenCookie, refreshTokenCookie];
  
  // Try using appendHeader if available (for HTTP/2 compatibility)
  if (typeof (res as any).appendHeader === 'function') {
    res.setHeader('Set-Cookie', accessTokenCookie);
    (res as any).appendHeader('Set-Cookie', refreshTokenCookie);
  } else {
    // Standard approach: set both as array
    res.setHeader('Set-Cookie', cookiesArray);
  }
  
  // Debug: Verify both cookies are being set (development only)
  // Commented out for production
  // if (process.env.NODE_ENV === 'development') {
  //   const setCookieHeaders = res.getHeader('Set-Cookie');
  //   const headerCount = Array.isArray(setCookieHeaders) ? setCookieHeaders.length : setCookieHeaders ? 1 : 0;
  //   console.log('[setAuthCookies] Setting cookies:', {
  //     accessTokenLength: accessToken.length,
  //     refreshTokenLength: refreshToken.length,
  //     accessTokenCookieStartsWith: accessTokenCookie.substring(0, 30),
  //     refreshTokenCookieStartsWith: refreshTokenCookie.substring(0, 30),
  //     headerCount,
  //   });
  // }
};

/**
 * Clear authentication cookies (logout)
 */
export const clearAuthCookies = (res: NextApiResponse): void => {
  const pastDate = new Date(0);

  // Use cookie library's serialize function to clear cookies
  const accessTokenCookie = serialize(ACCESS_TOKEN_COOKIE, '', {
    httpOnly: COOKIE_OPTIONS.httpOnly,
    secure: COOKIE_OPTIONS.secure,
    sameSite: COOKIE_OPTIONS.sameSite,
    path: COOKIE_OPTIONS.path,
    expires: pastDate,
  });

  const refreshTokenCookie = serialize(REFRESH_TOKEN_COOKIE, '', {
    httpOnly: COOKIE_OPTIONS.httpOnly,
    secure: COOKIE_OPTIONS.secure,
    sameSite: COOKIE_OPTIONS.sameSite,
    path: COOKIE_OPTIONS.path,
    expires: pastDate,
  });

  // Clear cookies - append to existing Set-Cookie headers
  const existingSetCookie = res.getHeader('Set-Cookie');
  let cookiesToSet: string[];
  
  if (Array.isArray(existingSetCookie)) {
    // Filter to ensure all values are strings
    const existingStrings = existingSetCookie.filter((c): c is string => typeof c === 'string');
    cookiesToSet = [...existingStrings, accessTokenCookie, refreshTokenCookie];
  } else if (typeof existingSetCookie === 'string') {
    cookiesToSet = [existingSetCookie, accessTokenCookie, refreshTokenCookie];
  } else {
    cookiesToSet = [accessTokenCookie, refreshTokenCookie];
  }
  
  res.setHeader('Set-Cookie', cookiesToSet);
};

/**
 * Set authentication cookies with custom domain (for cross-domain authentication)
 */
export const setAuthCookiesWithDomain = (
  res: NextApiResponse,
  userId: string,
  username: string,
  email: string | undefined,
  domain: string
): void => {
  // Generate tokens
  const accessToken = generateAccessToken({ userId, username, email });
  const refreshToken = generateRefreshToken({ userId, username, email });

  // Calculate expiration times
  const accessTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // Use cookie library's serialize function for proper formatting with domain
  const accessTokenCookie = serialize(ACCESS_TOKEN_COOKIE, accessToken, {
    httpOnly: COOKIE_OPTIONS.httpOnly,
    secure: COOKIE_OPTIONS.secure,
    sameSite: 'lax', // Use 'lax' for cross-domain cookies
    path: COOKIE_OPTIONS.path,
    domain: domain,
    expires: accessTokenExpiry,
  });

  const refreshTokenCookie = serialize(REFRESH_TOKEN_COOKIE, refreshToken, {
    httpOnly: COOKIE_OPTIONS.httpOnly,
    secure: COOKIE_OPTIONS.secure,
    sameSite: 'lax', // Use 'lax' for cross-domain cookies
    path: COOKIE_OPTIONS.path,
    domain: domain,
    expires: refreshTokenExpiry,
  });

  // Set both cookies
  if (typeof (res as any).appendHeader === 'function') {
    res.setHeader('Set-Cookie', accessTokenCookie);
    (res as any).appendHeader('Set-Cookie', refreshTokenCookie);
  } else {
    res.setHeader('Set-Cookie', [accessTokenCookie, refreshTokenCookie]);
  }
};

/**
 * Set authentication cookies and create/update session record
 * This is the preferred method for new logins and token refreshes
 */
export const setAuthCookiesWithSession = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  username: string,
  email?: string
): Promise<void> => {
  // Generate tokens
  const accessToken = generateAccessToken({ userId, username, email });
  const refreshToken = generateRefreshToken({ userId, username, email });

  // Create or update session record (non-blocking - don't fail if this errors)
  try {
    await createOrUpdateSession(req, userId, username, refreshToken);
  } catch (error) {
    // Log error but don't fail authentication
    console.error('Error creating session record:', error);
  }

  // Calculate expiration times
  const accessTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // Use cookie library's serialize function for proper formatting
  const accessTokenCookie = serialize(ACCESS_TOKEN_COOKIE, accessToken, {
    httpOnly: COOKIE_OPTIONS.httpOnly,
    secure: COOKIE_OPTIONS.secure,
    sameSite: COOKIE_OPTIONS.sameSite,
    path: COOKIE_OPTIONS.path,
    expires: accessTokenExpiry,
  });

  const refreshTokenCookie = serialize(REFRESH_TOKEN_COOKIE, refreshToken, {
    httpOnly: COOKIE_OPTIONS.httpOnly,
    secure: COOKIE_OPTIONS.secure,
    sameSite: COOKIE_OPTIONS.sameSite,
    path: COOKIE_OPTIONS.path,
    expires: refreshTokenExpiry,
  });

  // Set both cookies as an array
  if (typeof (res as any).appendHeader === 'function') {
    res.setHeader('Set-Cookie', accessTokenCookie);
    (res as any).appendHeader('Set-Cookie', refreshTokenCookie);
  } else {
    // Standard approach: set both as array
    res.setHeader('Set-Cookie', [accessTokenCookie, refreshTokenCookie]);
  }
};

/**
 * Extract token from cookies
 * Handles cases where multiple cookies with the same name exist (e.g., root domain and subdomain)
 * Prefers the most specific cookie (exact domain match)
 */
export const getTokenFromCookies = (cookieHeader: string | undefined, cookieName: string): string | null => {
  if (!cookieHeader) {
    return null;
  }

  // Split cookies - they're separated by semicolons
  const cookies = cookieHeader.split(';').map(c => c.trim());
  
  // Find all cookies matching the name
  const matchingCookies = cookies.filter(c => c.startsWith(`${cookieName}=`));
  
  if (matchingCookies.length === 0) {
    return null;
  }
  
  // If multiple cookies exist, prefer the first one (browsers typically send most specific first)
  // Extract value from the first matching cookie
  const tokenCookie = matchingCookies[0];
  const value = tokenCookie.substring(cookieName.length + 1);
  
  // If there are multiple cookies, log a warning in development
  if (process.env.NODE_ENV === 'development' && matchingCookies.length > 1) {
    console.warn(`[getTokenFromCookies] Multiple ${cookieName} cookies found, using first one`);
  }
  
  return value;
};

/**
 * Get session information from request
 * Extracts and verifies JWT token from cookies or Authorization header
 * Returns session object with userId, username, and email, or null if not authenticated
 */
export const getSession = async (
  req: NextApiRequest
): Promise<{ userId: string; username: string; email?: string } | null> => {
  try {
    // Try to get token from cookies first (preferred method)
    let token = getTokenFromCookies(req.headers.cookie, ACCESS_TOKEN_COOKIE);

    // Fallback to Authorization header if no cookie
    if (!token) {
      token = extractTokenFromHeader(req.headers.authorization);
    }

    if (!token) {
      return null;
    }

    // Verify the token
    const decoded = await verifyAccessToken(token);

    return {
      userId: decoded.userId,
      username: decoded.username,
      email: decoded.email,
    };
  } catch (error) {
    // Token is invalid or expired
    return null;
  }
};
