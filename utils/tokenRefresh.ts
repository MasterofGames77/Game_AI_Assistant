/**
 * Token refresh utility
 * Handles automatic token refresh before expiration and on 401 errors
 */

// Track if a refresh is in progress to prevent multiple simultaneous refreshes
let refreshPromise: Promise<boolean> | null = null;
let lastRefreshTime: number = 0;
const REFRESH_COOLDOWN = 5000; // Don't refresh more than once every 5 seconds

// Track if refresh token is permanently invalid (expired/revoked)
// Once we know it's invalid, don't try again until user logs in again
let refreshTokenInvalid: boolean = false;
let refreshTokenInvalidTime: number = 0;
const REFRESH_INVALID_COOLDOWN = 5 * 60 * 1000; // Don't retry for 5 minutes after failure

// Track when user last logged in to prevent immediate refresh attempts
let lastLoginTime: number = 0;
const LOGIN_GRACE_PERIOD = 10 * 1000; // 10 seconds grace period after login

/**
 * Refresh the access token using the refresh token
 * @returns Promise<boolean> - true if refresh succeeded, false otherwise
 */
export async function refreshAccessToken(): Promise<boolean> {
  // If refresh token is known to be invalid, don't try again
  const now = Date.now();
  if (refreshTokenInvalid) {
    // Check if enough time has passed to retry (user might have logged in again)
    if (now - refreshTokenInvalidTime < REFRESH_INVALID_COOLDOWN) {
      return false;
    }
    // Reset invalid flag after cooldown period
    refreshTokenInvalid = false;
  }

  // If a refresh is already in progress, wait for it
  if (refreshPromise) {
    try {
      return await refreshPromise;
    } catch {
      return false;
    }
  }

  // Check cooldown to prevent excessive refresh attempts
  if (now - lastRefreshTime < REFRESH_COOLDOWN) {
    // Too soon to refresh again, return last result
    return false;
  }

  // Start new refresh
  refreshPromise = (async () => {
    try {
      lastRefreshTime = now;
      
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include', // Include cookies (refresh token)
        headers: {
          'Content-Type': 'application/json',
        },
      });

          if (response.ok) {
            const data = await response.json();
            // Record successful refresh
            recordTokenRefresh();
            // Reset invalid flag on successful refresh
            refreshTokenInvalid = false;
            refreshTokenInvalidTime = 0;
            // Dispatch event to notify components that token was refreshed
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('tokenRefreshed', { detail: data }));
            }
            return true;
          } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.error || 'Token refresh failed';
        
        // If refresh token expired or was revoked, mark as invalid and clear localStorage
        if (
          errorMessage.includes('expired') ||
          errorMessage.includes('revoked') ||
          errorMessage.includes('not found') ||
          errorMessage.includes('Session has been revoked') ||
          errorMessage.includes('Invalid refresh token')
        ) {
          // Mark refresh token as invalid to prevent repeated attempts
          refreshTokenInvalid = true;
          refreshTokenInvalidTime = Date.now();
          
          // Clear user data from localStorage
          if (typeof window !== 'undefined') {
            localStorage.removeItem('username');
            localStorage.removeItem('userId');
            localStorage.removeItem('userEmail');
            clearTokenRefreshRecord();
            
            // Dispatch event to notify components that session expired
            window.dispatchEvent(new CustomEvent('sessionExpired'));
          }
        }
        
        return false;
      }
    } catch (error) {
      console.error('[Token Refresh] Error refreshing token:', error);
      return false;
    } finally {
      // Clear the promise after a delay to allow other requests to use the refreshed token
      setTimeout(() => {
        refreshPromise = null;
      }, 1000);
    }
  })();

  return await refreshPromise;
}

/**
 * Check if token is likely expired (based on 15-minute expiration)
 * This is a client-side estimate - actual validation happens on the server
 */
export function isTokenLikelyExpired(): boolean {
  // We can't read the JWT expiration from httpOnly cookies, so we use a heuristic
  // Access tokens expire after 15 minutes, so we refresh proactively at 14 minutes
  // Store last refresh time in sessionStorage (cleared on tab close)
  if (typeof window === 'undefined') return false;
  
  // Don't check if we're in the grace period after login
  const now = Date.now();
  if (lastLoginTime > 0 && (now - lastLoginTime) < LOGIN_GRACE_PERIOD) {
    return false; // Token is fresh after login
  }
  
  const lastRefresh = sessionStorage.getItem('lastTokenRefresh');
  if (!lastRefresh) {
    // No record of refresh, but if we just logged in, assume it's valid
    // Only assume expired if it's been more than the grace period since login
    if (lastLoginTime > 0 && (now - lastLoginTime) < LOGIN_GRACE_PERIOD) {
      return false;
    }
    // Otherwise, assume it might be expired (but don't be too aggressive)
    // Return false to avoid immediate refresh attempts on page load
    return false;
  }
  
  const lastRefreshTime = parseInt(lastRefresh, 10);
  const timeSinceRefresh = now - lastRefreshTime;
  
  // Refresh if it's been more than 14 minutes (840000ms)
  // This gives us a 1-minute buffer before the 15-minute expiration
  return timeSinceRefresh > 14 * 60 * 1000;
}

/**
 * Record that a token refresh occurred
 */
export function recordTokenRefresh(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('lastTokenRefresh', Date.now().toString());
  }
}

/**
 * Record that a user just logged in
 * This prevents immediate token refresh attempts
 */
export function recordLogin(): void {
  lastLoginTime = Date.now();
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('lastTokenRefresh', Date.now().toString());
  }
}

/**
 * Clear token refresh record (on logout)
 */
export function clearTokenRefreshRecord(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('lastTokenRefresh');
  }
  // Reset invalid flag when user logs out or logs in again
  refreshTokenInvalid = false;
  refreshTokenInvalidTime = 0;
  // Reset login time
  lastLoginTime = 0;
}

/**
 * Proactively refresh token if it's likely expired
 * Call this before making authenticated API calls
 */
export async function ensureTokenValid(): Promise<boolean> {
  // Don't try to refresh if we know the refresh token is invalid
  if (refreshTokenInvalid) {
    const now = Date.now();
    if (now - refreshTokenInvalidTime < REFRESH_INVALID_COOLDOWN) {
      return false;
    }
    // Reset after cooldown
    refreshTokenInvalid = false;
  }
  
  if (isTokenLikelyExpired()) {
    return await refreshAccessToken();
  }
  return true;
}

