import axios from 'axios';

// Configure axios to send cookies with all requests
// This is required for the new cookie-based authentication system
axios.defaults.withCredentials = true;

// Add response interceptor to handle authentication errors
axios.interceptors.response.use(
  (response) => {
    // If the request was successful, just return the response
    return response;
  },
  (error) => {
    // Handle 401 Unauthorized errors
    if (error.response?.status === 401) {
      // Check if we're already on the sign-in page to avoid redirect loops
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/signin')) {
        // Only redirect if it's an authentication error (not other 401s like rate limiting)
        const errorMessage = error.response?.data?.message || '';
        if (errorMessage.includes('Authentication required') || errorMessage.includes('sign in')) {
          // Don't redirect immediately - let the component handle it
          // This prevents the flash of redirect
          // Commented out for production
          // console.log('[Auth] 401 error detected, authentication required');
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
