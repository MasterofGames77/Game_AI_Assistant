import type { NextApiResponse } from 'next';
import { generateAccessToken, generateRefreshToken, ACCESS_TOKEN_EXPIRY, REFRESH_TOKEN_EXPIRY } from './jwt';

// Cookie configuration
const COOKIE_OPTIONS = {
  httpOnly: true, // Prevents JavaScript access (XSS protection)
  secure: process.env.NODE_ENV === 'production', // HTTPS only in production
  sameSite: 'strict' as const, // CSRF protection
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

  // Set access token cookie
  res.setHeader(
    'Set-Cookie',
    `${ACCESS_TOKEN_COOKIE}=${accessToken}; HttpOnly; Secure=${COOKIE_OPTIONS.secure}; SameSite=${COOKIE_OPTIONS.sameSite}; Path=${COOKIE_OPTIONS.path}; Expires=${accessTokenExpiry.toUTCString()}`
  );

  // Set refresh token cookie
  res.setHeader(
    'Set-Cookie',
    `${REFRESH_TOKEN_COOKIE}=${refreshToken}; HttpOnly; Secure=${COOKIE_OPTIONS.secure}; SameSite=${COOKIE_OPTIONS.sameSite}; Path=${COOKIE_OPTIONS.path}; Expires=${refreshTokenExpiry.toUTCString()}`
  );
};

/**
 * Clear authentication cookies (logout)
 */
export const clearAuthCookies = (res: NextApiResponse): void => {
  const pastDate = new Date(0).toUTCString();

  res.setHeader(
    'Set-Cookie',
    `${ACCESS_TOKEN_COOKIE}=; HttpOnly; Secure=${COOKIE_OPTIONS.secure}; SameSite=${COOKIE_OPTIONS.sameSite}; Path=${COOKIE_OPTIONS.path}; Expires=${pastDate}`
  );

  res.setHeader(
    'Set-Cookie',
    `${REFRESH_TOKEN_COOKIE}=; HttpOnly; Secure=${COOKIE_OPTIONS.secure}; SameSite=${COOKIE_OPTIONS.sameSite}; Path=${COOKIE_OPTIONS.path}; Expires=${pastDate}`
  );
};

/**
 * Extract token from cookies
 */
export const getTokenFromCookies = (cookieHeader: string | undefined, cookieName: string): string | null => {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(';').map(c => c.trim());
  const tokenCookie = cookies.find(c => c.startsWith(`${cookieName}=`));

  if (!tokenCookie) {
    return null;
  }

  return tokenCookie.substring(cookieName.length + 1);
};
