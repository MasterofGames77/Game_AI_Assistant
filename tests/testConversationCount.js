import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

async function testConversationCountConsistency() {
  console.log('🔍 Testing Conversation Count Consistency...\n');

  try {
    // Test username
    const testUsername = 'TestUser1';
    
    // Step 1: Get conversation count from main page (getConversation API)
    console.log('1. Fetching conversation count from main page...');
    const mainPageResponse = await axios.get(`${BASE_URL}/api/getConversation?username=${testUsername}`);
    const mainPageCount = mainPageResponse.data.pagination.total;
    console.log(`   Main page count: ${mainPageCount}`);

    // Step 2: Get conversation count from account dashboard (accountData API)
    console.log('2. Fetching conversation count from account dashboard...');
    const accountResponse = await axios.post(`${BASE_URL}/api/accountData`, {
      username: testUsername
    });
    const accountCount = accountResponse.data.user.conversationCount;
    console.log(`   Account dashboard count: ${accountCount}`);

    // Step 3: Compare counts
    console.log('\n3. Comparing counts...');
    if (mainPageCount === accountCount) {
      console.log('✅ SUCCESS: Conversation counts match!');
      console.log(`   Both pages show: ${mainPageCount} conversations`);
    } else {
      console.log('❌ ERROR: Conversation counts do not match!');
      console.log(`   Main page: ${mainPageCount}`);
      console.log(`   Account dashboard: ${accountCount}`);
      console.log(`   Difference: ${Math.abs(mainPageCount - accountCount)}`);
    }

    // Step 4: Additional verification - check if counts are reasonable
    console.log('\n4. Verifying count validity...');
    if (mainPageCount >= 0 && accountCount >= 0) {
      console.log('✅ Counts are valid (non-negative)');
    } else {
      console.log('❌ ERROR: Invalid negative counts detected');
    }

    // Step 5: Check if the user exists and has data
    console.log('\n5. Verifying user data...');
    if (accountResponse.data.user.username === testUsername) {
      console.log('✅ User data is accessible');
    } else {
      console.log('❌ ERROR: User data mismatch');
    }

    console.log('\n📊 Test Summary:');
    console.log(`   Main page API: ${mainPageCount} conversations`);
    console.log(`   Account API: ${accountCount} conversations`);
    console.log(`   Consistency: ${mainPageCount === accountCount ? '✅ MATCH' : '❌ MISMATCH'}`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

// Manual test functions
const manualTests = {
  async testWithDifferentUser() {
    console.log('\n🧪 Manual Test: Different User');
    console.log('Testing with a different username...');
    
    try {
      const differentUsername = 'TestUser2';
      
      const mainResponse = await axios.get(`${BASE_URL}/api/getConversation?username=${differentUsername}`);
      const accountResponse = await axios.post(`${BASE_URL}/api/accountData`, {
        username: differentUsername
      });
      
      const mainCount = mainResponse.data.pagination.total;
      const accountCount = accountResponse.data.user.conversationCount;
      
      console.log(`   User: ${differentUsername}`);
      console.log(`   Main page: ${mainCount}`);
      console.log(`   Account dashboard: ${accountCount}`);
      console.log(`   Match: ${mainCount === accountCount ? '✅' : '❌'}`);
      
    } catch (error) {
      console.error('   Error:', error.message);
    }
  },

  async testWithNonExistentUser() {
    console.log('\n🧪 Manual Test: Non-existent User');
    console.log('Testing with a user that does not exist...');
    
    try {
      const nonExistentUser = 'NonExistentUser123';
      
      const mainResponse = await axios.get(`${BASE_URL}/api/getConversation?username=${nonExistentUser}`);
      const accountResponse = await axios.post(`${BASE_URL}/api/accountData`, {
        username: nonExistentUser
      });
      
      const mainCount = mainResponse.data.pagination.total;
      const accountCount = accountResponse.data.user.conversationCount;
      
      console.log(`   User: ${nonExistentUser}`);
      console.log(`   Main page: ${mainCount}`);
      console.log(`   Account dashboard: ${accountCount}`);
      console.log(`   Both should be 0: ${mainCount === 0 && accountCount === 0 ? '✅' : '❌'}`);
      
    } catch (error) {
      console.error('   Error:', error.message);
    }
  }
};

// Run the main test
testConversationCountConsistency()
  .then(() => {
    console.log('\n🎯 Conversation Count Consistency Test Complete!');
    console.log('\nTo run manual tests, call:');
    console.log('   manualTests.testWithDifferentUser()');
    console.log('   manualTests.testWithNonExistentUser()');
  })
  .catch(console.error);

// Export for manual testing
export {
  testConversationCountConsistency,
  manualTests
}; 