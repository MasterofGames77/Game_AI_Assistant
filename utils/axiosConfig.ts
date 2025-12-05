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

export default axios;
