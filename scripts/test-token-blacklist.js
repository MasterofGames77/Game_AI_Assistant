/**
 * Token Blacklist Testing Script
 * 
 * Automated tests for token blacklisting functionality.
 * 
 * Usage:
 *   node scripts/test-token-blacklist.js
 * 
 * Prerequisites:
 *   - Application must be running
 *   - Set BASE_URL environment variable (default: http://localhost:3000)
 *   - Have test user credentials ready
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Test configuration
const TEST_CONFIG = {
  username: process.env.TEST_USERNAME || 'testuser',
  password: process.env.TEST_PASSWORD || 'testpassword',
  email: process.env.TEST_EMAIL || 'test@example.com',
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`Test: ${name}`, 'cyan');
  log('='.repeat(60), 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// Helper to extract cookies from response
function extractCookies(response) {
  const cookies = {};
  const setCookieHeaders = response.headers['set-cookie'] || [];
  
  setCookieHeaders.forEach(cookie => {
    const [nameValue] = cookie.split(';');
    const [name, value] = nameValue.split('=');
    if (name && value) {
      cookies[name.trim()] = value.trim();
    }
  });
  
  return cookies;
}

// Helper to make authenticated request
async function makeRequest(url, options = {}) {
  const defaultOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  };
  
  const mergedOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };
  
  // Add cookies to headers if provided
  if (options.cookies) {
    const cookieString = Object.entries(options.cookies)
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
    mergedOptions.headers['Cookie'] = cookieString;
  }
  
  try {
    const response = await fetch(url, mergedOptions);
    const data = await response.json().catch(() => ({}));
    return {
      status: response.status,
      data,
      headers: response.headers,
      ok: response.ok,
    };
  } catch (error) {
    return {
      status: 0,
      error: error.message,
      ok: false,
    };
  }
}

// Test 1: Login and get tokens
async function testLogin() {
  logTest('Test 1: Login and Get Tokens');
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/auth/signin`, {
      method: 'POST',
      body: JSON.stringify({
        username: TEST_CONFIG.username,
        password: TEST_CONFIG.password,
      }),
    });
    
    if (!response.ok || response.status !== 200) {
      logError(`Login failed: ${response.status} - ${JSON.stringify(response.data)}`);
      return null;
    }
    
    const cookies = extractCookies(response);
    
    if (!cookies.access_token || !cookies.refresh_token) {
      logError('Tokens not found in cookies');
      logInfo('Response headers:', JSON.stringify(response.headers, null, 2));
      return null;
    }
    
    logSuccess('Login successful');
    logInfo(`Access token: ${cookies.access_token.substring(0, 20)}...`);
    logInfo(`Refresh token: ${cookies.refresh_token.substring(0, 20)}...`);
    
    return cookies;
  } catch (error) {
    logError(`Login test failed: ${error.message}`);
    return null;
  }
}

// Test 2: Verify token works
async function testTokenVerification(cookies) {
  logTest('Test 2: Verify Token Works');
  
  if (!cookies) {
    logWarning('Skipping - no cookies from login');
    return false;
  }
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/auth/verify`, {
      method: 'GET',
      cookies,
    });
    
    if (response.ok && response.data.authenticated) {
      logSuccess('Token verification successful');
      logInfo(`User: ${response.data.user?.username || 'unknown'}`);
      return true;
    } else {
      logError(`Token verification failed: ${response.status} - ${JSON.stringify(response.data)}`);
      return false;
    }
  } catch (error) {
    logError(`Token verification test failed: ${error.message}`);
    return false;
  }
}

// Test 3: Logout and verify token is blacklisted
async function testLogoutBlacklist(cookies) {
  logTest('Test 3: Logout and Verify Token Blacklisting');
  
  if (!cookies) {
    logWarning('Skipping - no cookies from login');
    return false;
  }
  
  try {
    // Logout
    const logoutResponse = await makeRequest(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      cookies,
    });
    
    if (!logoutResponse.ok) {
      logError(`Logout failed: ${logoutResponse.status} - ${JSON.stringify(logoutResponse.data)}`);
      return false;
    }
    
    logSuccess('Logout successful');
    
    // Wait a moment for blacklist to be processed
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Try to use the old token (should fail)
    const verifyResponse = await makeRequest(`${BASE_URL}/api/auth/verify`, {
      method: 'GET',
      cookies, // Using old cookies
    });
    
    if (verifyResponse.ok && verifyResponse.data.authenticated) {
      logError('Token still works after logout (should be blacklisted)');
      return false;
    } else {
      logSuccess('Token correctly blacklisted after logout');
      logInfo(`Response: ${verifyResponse.status} - ${verifyResponse.data.message || 'Unauthorized'}`);
      return true;
    }
  } catch (error) {
    logError(`Logout blacklist test failed: ${error.message}`);
    return false;
  }
}

// Test 4: Token refresh rotation
async function testTokenRotation() {
  logTest('Test 4: Token Refresh Rotation');
  
  // Login first
  const cookies = await testLogin();
  if (!cookies) {
    logWarning('Skipping - login failed');
    return false;
  }
  
  try {
    // Refresh token
    const refreshResponse = await makeRequest(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      cookies,
    });
    
    if (!refreshResponse.ok) {
      logError(`Token refresh failed: ${refreshResponse.status} - ${JSON.stringify(refreshResponse.data)}`);
      return false;
    }
    
    logSuccess('Token refresh successful');
    
    const newCookies = extractCookies(refreshResponse);
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Try to use old refresh token (should fail)
    const oldRefreshResponse = await makeRequest(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      cookies, // Using old cookies
    });
    
    if (oldRefreshResponse.ok) {
      logError('Old refresh token still works (should be blacklisted)');
      return false;
    } else {
      logSuccess('Old refresh token correctly blacklisted');
      logInfo(`Response: ${oldRefreshResponse.status} - ${oldRefreshResponse.data.message || 'Unauthorized'}`);
      return true;
    }
  } catch (error) {
    logError(`Token rotation test failed: ${error.message}`);
    return false;
  }
}

// Test 5: Revoke all sessions
async function testRevokeAllSessions() {
  logTest('Test 5: Revoke All Sessions');
  
  // Login first
  const cookies = await testLogin();
  if (!cookies) {
    logWarning('Skipping - login failed');
    return false;
  }
  
  try {
    // Revoke all sessions
    const revokeResponse = await makeRequest(`${BASE_URL}/api/auth/revoke-all-sessions`, {
      method: 'POST',
      cookies,
    });
    
    if (!revokeResponse.ok) {
      logError(`Revoke all sessions failed: ${revokeResponse.status} - ${JSON.stringify(revokeResponse.data)}`);
      return false;
    }
    
    logSuccess('Revoke all sessions successful');
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Try to use tokens (should fail)
    const verifyResponse = await makeRequest(`${BASE_URL}/api/auth/verify`, {
      method: 'GET',
      cookies, // Using old cookies
    });
    
    if (verifyResponse.ok && verifyResponse.data.authenticated) {
      logError('Token still works after revoke all sessions (should be blacklisted)');
      return false;
    } else {
      logSuccess('Tokens correctly blacklisted after revoke all sessions');
      return true;
    }
  } catch (error) {
    logError(`Revoke all sessions test failed: ${error.message}`);
    return false;
  }
}

// Test 6: Cleanup job
async function testCleanupJob() {
  logTest('Test 6: Cleanup Job');
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/cron/cleanup-token-blacklist`, {
      method: 'GET',
    });
    
    if (!response.ok) {
      logError(`Cleanup job failed: ${response.status} - ${JSON.stringify(response.data)}`);
      return false;
    }
    
    logSuccess('Cleanup job ran successfully');
    logInfo(`Deleted: ${response.data.deletedCount || 0} expired entries`);
    logInfo(`Stats: ${JSON.stringify(response.data.stats, null, 2)}`);
    
    return true;
  } catch (error) {
    logError(`Cleanup job test failed: ${error.message}`);
    return false;
  }
}

// Main test runner
async function runTests() {
  log('\n' + '='.repeat(60), 'cyan');
  log('Token Blacklist Testing Suite', 'cyan');
  log('='.repeat(60), 'cyan');
  logInfo(`Base URL: ${BASE_URL}`);
  logInfo(`Test User: ${TEST_CONFIG.username}`);
  log('');
  
  const results = {
    login: false,
    verification: false,
    logout: false,
    rotation: false,
    revoke: false,
    cleanup: false,
  };
  
  // Run tests
  const cookies = await testLogin();
  results.login = cookies !== null;
  
  if (cookies) {
    results.verification = await testTokenVerification(cookies);
    results.logout = await testLogoutBlacklist(cookies);
  }
  
  results.rotation = await testTokenRotation();
  results.revoke = await testRevokeAllSessions();
  results.cleanup = await testCleanupJob();
  
  // Summary
  log('\n' + '='.repeat(60), 'cyan');
  log('Test Results Summary', 'cyan');
  log('='.repeat(60), 'cyan');
  
  Object.entries(results).forEach(([test, passed]) => {
    if (passed) {
      logSuccess(`${test}: PASSED`);
    } else {
      logError(`${test}: FAILED`);
    }
  });
  
  const passedCount = Object.values(results).filter(Boolean).length;
  const totalCount = Object.keys(results).length;
  
  log('');
  if (passedCount === totalCount) {
    logSuccess(`All tests passed! (${passedCount}/${totalCount})`);
  } else {
    logWarning(`Some tests failed: ${passedCount}/${totalCount} passed`);
  }
  
  log('');
  logInfo('Note: Some tests may fail if:');
  logInfo('  - Test user credentials are incorrect');
  logInfo('  - Application is not running');
  logInfo('  - Database is not connected');
  logInfo('  - Environment variables are not set');
  log('');
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
  logError('This script requires Node.js 18+ or a fetch polyfill');
  logInfo('Install node-fetch: npm install node-fetch');
  process.exit(1);
}

// Run tests
runTests().catch(error => {
  logError(`Test suite failed: ${error.message}`);
  console.error(error);
  process.exit(1);
});

