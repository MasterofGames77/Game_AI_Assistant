// Subscription System Testing Script
// Run this in the browser console or as a Node.js script

const BASE_URL = 'http://localhost:3000' / "https://assistant.videogamewingman.com"; // Adjust for your environment

// Test utilities
const testAPI = async (endpoint, data) => {
  try {
    const response = await fetch(`${BASE_URL}/api/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (error) {
    console.error(`Error testing ${endpoint}:`, error);
    return { error: error.message };
  }
};

// Test 1: User Model and Subscription Schema
const testUserModel = async () => {
  console.log('🧪 Testing User Model...');
  
  // Test creating a new user
  const newUser = await testAPI('syncUser', {
    userId: 'test-user-' + Date.now(),
    email: 'test@example.com',
    username: 'testuser-' + Date.now()
  });
  
  console.log('New user creation result:', newUser);
  
  // Test Pro access checking
  if (newUser.user?.username) {
    const proAccess = await testAPI('checkProAccess', {
      username: newUser.user.username
    });
    console.log('Pro access check result:', proAccess);
  }
};

// Test 2: Early Access User Creation
const testEarlyAccessUser = async () => {
  console.log('🧪 Testing Early Access User Creation...');
  
  const earlyUser = await testAPI('syncUser', {
    userId: 'early-user-' + Date.now(),
    email: 'early@example.com',
    username: 'earlyuser-' + Date.now()
  });
  
  console.log('Early access user result:', earlyUser);
  
  if (earlyUser.user?.username) {
    const proAccess = await testAPI('checkProAccess', {
      username: earlyUser.user.username
    });
    console.log('Early access Pro check:', proAccess);
  }
};

// Test 3: Subscription Status Display
const testSubscriptionStatus = async () => {
  console.log('🧪 Testing Subscription Status...');
  
  // Test with a known username (replace with actual test user)
  const testUsername = 'testuser-' + Date.now();
  
  // First create a user
  await testAPI('syncUser', {
    userId: 'status-test-' + Date.now(),
    email: 'status@example.com',
    username: testUsername
  });
  
  // Then check their status
  const status = await testAPI('checkProAccess', {
    username: testUsername
  });
  
  console.log('Subscription status result:', status);
  
  // Test early access expiration
  const expiration = await testAPI('checkEarlyAccessExpiration', {
    username: testUsername
  });
  
  console.log('Early access expiration result:', expiration);
};

// Test 4: Transition Flow
const testTransitionFlow = async () => {
  console.log('🧪 Testing Transition Flow...');
  
  const testUsername = 'transition-test-' + Date.now();
  
  // Create a user first
  const userResult = await testAPI('syncUser', {
    userId: 'transition-user-' + Date.now(),
    email: 'transition@example.com',
    username: testUsername
  });
  
  console.log('User creation for transition test:', userResult);
  
  // Wait a moment for database to update
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test transition eligibility
  const transition = await testAPI('transitionEarlyAccess', {
    username: testUsername
  });
  
  console.log('Transition eligibility result:', transition);
  
  // Also test with a user that should be eligible (near expiration)
  console.log('🧪 Testing with user near expiration...');
  const nearExpirationUser = await testAPI('syncUser', {
    userId: 'near-expiration-' + Date.now(),
    email: 'near-expiration@example.com',
    username: 'near-expiration-' + Date.now()
  });
  
  if (nearExpirationUser.user?.username) {
    const nearExpirationTransition = await testAPI('transitionEarlyAccess', {
      username: nearExpirationUser.user.username
    });
    console.log('Near expiration transition result:', nearExpirationTransition);
  }
};

// Test 5: Error Handling
const testErrorHandling = async () => {
  console.log('🧪 Testing Error Handling...');
  
  // Test with invalid username (empty string)
  console.log('Testing with empty username...');
  const invalidResult = await testAPI('checkProAccess', {
    username: ''
  });
  console.log('Empty username result (expected error):', invalidResult);
  
  // Test with non-existent user
  console.log('Testing with non-existent user...');
  const nonExistentResult = await testAPI('checkProAccess', {
    username: 'nonexistentuser12345'
  });
  console.log('Non-existent user result (expected no access):', nonExistentResult);
  
  // Test with missing username parameter
  console.log('Testing with missing username parameter...');
  const missingParamResult = await testAPI('checkProAccess', {});
  console.log('Missing parameter result (expected error):', missingParamResult);
};

// Test 6: Database Verification
const testDatabaseQueries = async () => {
  console.log('🧪 Testing Database Queries...');
  
  // This would need to be run in a database environment
  console.log('Database queries would be tested here');
  console.log('Use MongoDB queries from the testing plan to verify data');
};

// Main test runner
const runAllTests = async () => {
  console.log('🚀 Starting Subscription System Tests...\n');
  
  try {
    await testUserModel();
    console.log('\n');
    
    await testEarlyAccessUser();
    console.log('\n');
    
    await testSubscriptionStatus();
    console.log('\n');
    
    await testTransitionFlow();
    console.log('\n');
    
    await testErrorHandling();
    console.log('\n');
    
    await testDatabaseQueries();
    console.log('\n');
    
    console.log('✅ All tests completed!');
    console.log('📋 Check the console output above for results');
    console.log('📝 Review the SUBSCRIPTION_SYSTEM_TESTS.md file for detailed testing procedures');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  }
};

// Manual test functions for specific scenarios
const manualTests = {
  // Test specific user subscription status
  testUserStatus: async (username) => {
    console.log(`🧪 Testing status for user: ${username}`);
    const result = await testAPI('checkProAccess', { username });
    console.log('Result:', result);
    return result;
  },
  
  // Test early access expiration for specific user
  testUserExpiration: async (username) => {
    console.log(`🧪 Testing expiration for user: ${username}`);
    const result = await testAPI('checkEarlyAccessExpiration', { username });
    console.log('Result:', result);
    return result;
  },
  
  // Test transition for specific user
  testUserTransition: async (username) => {
    console.log(`🧪 Testing transition for user: ${username}`);
    const result = await testAPI('transitionEarlyAccess', { username });
    console.log('Result:', result);
    return result;
  },
  
  // Create a test user
  createTestUser: async (username, email) => {
    console.log(`🧪 Creating test user: ${username}`);
    const result = await testAPI('syncUser', {
      userId: 'manual-test-' + Date.now(),
      email: email || username + '@example.com',
      username: username
    });
    console.log('Result:', result);
    return result;
  }
};

// Export for use in browser console or Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runAllTests, manualTests };
} else {
  // Browser environment
  window.subscriptionTests = { runAllTests, manualTests };
  console.log('📚 Subscription tests loaded!');
  console.log('Run: subscriptionTests.runAllTests() to start testing');
  console.log('Or use: subscriptionTests.manualTests.testUserStatus("username") for specific tests');
}

// Auto-run if this is the main module
if (typeof require !== 'undefined' && require.main === module) {
  runAllTests();
} 