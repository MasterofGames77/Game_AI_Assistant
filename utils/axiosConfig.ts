import axios from 'axios';
import { refreshAccessToken, recordTokenRefresh } from './tokenRefresh';

// Configure axios to send cookies with all requests
// This is required for the new cookie-based authentication system
axios.defaults.withCredentials = true;

// Track if we're currently refreshing to prevent multiple simultaneous refreshes
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (error?: any) => void;
}> = [];

const processQueue = (error: any, tokenRefreshed: boolean = false) => {
  failedQueue.forEach((prom) => {
    if (tokenRefreshed) {
      prom.resolve();
    } else {
      prom.reject(error);
    }
  });
  failedQueue = [];
};

// Add request interceptor to refresh token proactively before expiration
axios.interceptors.request.use(
  async (config) => {
    // Only check token validity for authenticated endpoints (not public APIs)
    if (config.url && !config.url.includes('/api/auth/') && !config.url.includes('/api/health/')) {
      // Check if token is likely expired and refresh proactively
      const { ensureTokenValid } = await import('./tokenRefresh');
      await ensureTokenValid();
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle authentication errors
axios.interceptors.response.use(
  (response) => {
    // If the request was successful, just return the response
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized errors
    if (error.response?.status === 401 && originalRequest) {
      // Check if this is an authentication error (not rate limiting or other 401s)
      const errorMessage = error.response?.data?.message || '';
      const isAuthError = 
        errorMessage.includes('Authentication required') ||
        errorMessage.includes('sign in') ||
        errorMessage.includes('Token expired') ||
        errorMessage.includes('Invalid token') ||
        errorMessage.includes('Token has been revoked');

      if (isAuthError) {
        // If we're already refreshing, queue this request
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then(() => {
              // Retry the original request after token refresh
              return axios(originalRequest);
            })
            .catch((err) => {
              return Promise.reject(err);
            });
        }

        // Mark that we're refreshing
        isRefreshing = true;

        try {
          // Attempt to refresh the token
          const refreshed = await refreshAccessToken();
          
          if (refreshed) {
            // Record successful refresh
            recordTokenRefresh();
            
            // Process queued requests
            processQueue(null, true);
            
            // Retry the original request
            return axios(originalRequest);
          } else {
            // Refresh failed - clear queue and reject
            processQueue(error, false);
            
            // Check if we're already on the sign-in page to avoid redirect loops
            if (typeof window !== 'undefined' && !window.location.pathname.includes('/signin')) {
              // Dispatch session expired event for components to handle
              window.dispatchEvent(new CustomEvent('sessionExpired'));
            }
            
            return Promise.reject(error);
          }
        } catch (refreshError) {
          // Refresh attempt failed
          processQueue(error, false);
          
          // Check if we're already on the sign-in page to avoid redirect loops
          if (typeof window !== 'undefined' && !window.location.pathname.includes('/signin')) {
            // Dispatch session expired event for components to handle
            window.dispatchEvent(new CustomEvent('sessionExpired'));
          }
          
          return Promise.reject(error);
        } finally {
          isRefreshing = false;
        }
      }
    }
    
    // Return the error so it can be handled by the calling code
    return Promise.reject(error);
  }
);

/**
 * Helper function to determine if an error is retryable
 * Retries on timeouts and 5xx server errors (transient failures)
 */
function isRetryableError(error: any): boolean {
  // Retry on timeout or 5xx errors
  return (
    error.code === 'ECONNABORTED' ||
    error.code === 'ETIMEDOUT' ||
    (error.response?.status >= 500 && error.response?.status < 600)
  );
}

/**
 * External API client with timeout and retry logic
 * Use this for all external API calls (RAWG, IGDB, etc.) to prevent hanging requests
 */
export const externalApiClient = axios.create({
  timeout: 15000, // 15 seconds default timeout for external APIs
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add retry interceptor for transient failures
externalApiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    // Don't retry if already retried or not a retryable error
    if (config.__retryCount >= 3 || !isRetryableError(error)) {
      // Log final failure with context
      if (config.__retryCount >= 3) {
        console.error('[External API] Max retries reached', {
          url: config?.url,
          method: config?.method,
          error: error.message,
          retryCount: config.__retryCount,
          timestamp: new Date().toISOString(),
          operation: 'external-api-call'
        });
      }
      return Promise.reject(error);
    }

    // Increment retry count
    config.__retryCount = (config.__retryCount || 0) + 1;
    const delay = Math.pow(2, config.__retryCount) * 1000; // Exponential backoff: 2s, 4s, 8s

    console.log(
      `[External API] Retrying request (attempt ${config.__retryCount}/3) after ${delay}ms`,
      {
        url: config?.url,
        method: config?.method,
        error: error.message,
        retryCount: config.__retryCount,
        delay,
        timestamp: new Date().toISOString(),
        operation: 'external-api-retry'
      }
    );
    
    await new Promise((resolve) => setTimeout(resolve, delay));

    return externalApiClient(config);
  }
);

export default axios;
