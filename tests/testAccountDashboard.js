// Account Dashboard Testing Script
// Run this in the browser console to test the account dashboard

const BASE_URL = 'http://localhost:3000' || "https://assistant.videogamewingman.com"; // Adjust for your environment

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

// Test 1: Account Data API
const testAccountDataAPI = async () => {
  console.log('🧪 Testing Account Data API...');
  
  // Test with a known username (replace with actual test user)
  const testUsername = 'testuser-' + Date.now();
  
  // First create a user
  const userResult = await testAPI('syncUser', {
    userId: 'account-test-' + Date.now(),
    email: 'account@example.com',
    username: testUsername
  });
  
  console.log('User creation for account test:', userResult);
  
  // Wait a moment for database to update
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test account data API
  const accountData = await testAPI('accountData', {
    username: testUsername
  });
  
  console.log('Account data result:', accountData);
  
  // Test with non-existent user
  const nonExistentResult = await testAPI('accountData', {
    username: 'nonexistentuser12345'
  });
  
  console.log('Non-existent user result (expected 404):', nonExistentResult);
};

// Test 2: Account Dashboard Integration
const testAccountDashboardIntegration = async () => {
  console.log('🧪 Testing Account Dashboard Integration...');
  
  const testUsername = 'dashboard-test-' + Date.now();
  
  // Create a user
  const userResult = await testAPI('syncUser', {
    userId: 'dashboard-user-' + Date.now(),
    email: 'dashboard@example.com',
    username: testUsername
  });
  
  console.log('User creation for dashboard test:', userResult);
  
  // Wait for database update
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test both account data and subscription status
  const accountData = await testAPI('accountData', {
    username: testUsername
  });
  
  const subscriptionData = await testAPI('checkProAccess', {
    username: testUsername
  });
  
  console.log('Account data:', accountData);
  console.log('Subscription data:', subscriptionData);
  
  // Verify data structure
  if (accountData.user && subscriptionData.hasProAccess !== undefined) {
    console.log('✅ Account dashboard integration working correctly');
    console.log('User data structure:', {
      username: accountData.user.username,
      email: accountData.user.email,
      conversationCount: accountData.user.conversationCount,
      hasProAccess: subscriptionData.hasProAccess,
      subscriptionStatus: subscriptionData.subscriptionStatus
    });
  } else {
    console.log('❌ Account dashboard integration has issues');
  }
};

// Test 3: Error Handling
const testAccountErrorHandling = async () => {
  console.log('🧪 Testing Account Error Handling...');
  
  // Test with empty username
  const emptyUsernameResult = await testAPI('accountData', {
    username: ''
  });
  console.log('Empty username result (expected error):', emptyUsernameResult);
  
  // Test with missing username
  const missingUsernameResult = await testAPI('accountData', {});
  console.log('Missing username result (expected error):', missingUsernameResult);
  
  // Test with invalid method (GET instead of POST)
  try {
    const response = await fetch(`${BASE_URL}/api/accountData`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    const result = await response.json();
    console.log('GET method result (expected 405):', result);
  } catch (error) {
    console.log('GET method error:', error.message);
  }
};

// Main test runner
const runAccountTests = async () => {
  console.log('🚀 Starting Account Dashboard Tests...\n');
  
  try {
    await testAccountDataAPI();
    console.log('\n');
    
    await testAccountDashboardIntegration();
    console.log('\n');
    
    await testAccountErrorHandling();
    console.log('\n');
    
    console.log('✅ All account dashboard tests completed!');
    console.log('📋 Check the console output above for results');
    console.log('🌐 Visit /account in your browser to see the dashboard');
    
  } catch (error) {
    console.error('❌ Account dashboard test suite failed:', error);
  }
};

// Manual test functions for specific scenarios
const manualAccountTests = {
  // Test account data for specific user
  testUserAccountData: async (username) => {
    console.log(`🧪 Testing account data for user: ${username}`);
    const result = await testAPI('accountData', { username });
    console.log('Result:', result);
    return result;
  },
  
  // Test subscription status for specific user
  testUserSubscriptionStatus: async (username) => {
    console.log(`🧪 Testing subscription status for user: ${username}`);
    const result = await testAPI('checkProAccess', { username });
    console.log('Result:', result);
    return result;
  },
  
  // Create a test user for account testing
  createAccountTestUser: async (username, email) => {
    console.log(`🧪 Creating account test user: ${username}`);
    const result = await testAPI('syncUser', {
      userId: 'account-test-' + Date.now(),
      email: email || username + '@example.com',
      username: username
    });
    console.log('Result:', result);
    return result;
  }
};

// Export for use in browser console or Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runAccountTests, manualAccountTests };
} else {
  // Browser environment
  window.accountTests = { runAccountTests, manualAccountTests };
  console.log('📚 Account dashboard tests loaded!');
  console.log('Run: accountTests.runAccountTests() to start testing');
  console.log('Or use: accountTests.manualAccountTests.testUserAccountData("username") for specific tests');
}

// Auto-run if this is the main module
if (typeof require !== 'undefined' && require.main === module) {
  runAccountTests();
} 