// Navigation Testing Script
// Run this in the browser console to test the navigation functionality

const BASE_URL = 'http://localhost:3000' / "https://assistant.videogamewingman.com"; // Adjust for your environment

// Test utilities
const testNavigation = async () => {
  console.log('🧪 Testing Navigation Functionality...');
  
  // Test 1: Check if Account button is present in sidebar
  console.log('1. Checking for Account button in sidebar...');
  const accountButton = document.querySelector('button[aria-label="Go to Account Dashboard"]');
  if (accountButton) {
    console.log('✅ Account button found in sidebar');
    console.log('Button text:', accountButton.textContent?.trim());
  } else {
    console.log('❌ Account button not found in sidebar');
  }
  
  // Test 2: Check if Back button is present on account page
  console.log('\n2. Checking for Back button on account page...');
  const backButton = document.querySelector('button[aria-label="Back to main page"]');
  if (backButton) {
    console.log('✅ Back button found on account page');
    console.log('Button text:', backButton.textContent?.trim());
  } else {
    console.log('❌ Back button not found on account page (you may not be on /account page)');
  }
  
  // Test 3: Test navigation functionality
  console.log('\n3. Testing navigation functionality...');
  console.log('Current URL:', window.location.href);
  
  if (window.location.pathname === '/') {
    console.log('📍 Currently on main page');
    console.log('💡 Click the "Account" button in the sidebar to test navigation to /account');
  } else if (window.location.pathname === '/account') {
    console.log('📍 Currently on account page');
    console.log('💡 Click the "Back to Assistant" button to test navigation back to /');
  } else {
    console.log('📍 Currently on:', window.location.pathname);
    console.log('💡 Navigate to / to test the Account button, or /account to test the Back button');
  }
};

// Manual test functions
const manualTests = {
  // Test navigation to account page
  testNavigateToAccount: () => {
    console.log('🧪 Testing navigation to account page...');
    const accountButton = document.querySelector('button[aria-label="Go to Account Dashboard"]');
    if (accountButton) {
      console.log('Clicking Account button...');
      accountButton.click();
      console.log('✅ Account button clicked');
    } else {
      console.log('❌ Account button not found');
    }
  },
  
  // Test navigation back to main page
  testNavigateBack: () => {
    console.log('🧪 Testing navigation back to main page...');
    const backButton = document.querySelector('button[aria-label="Back to main page"]');
    if (backButton) {
      console.log('Clicking Back button...');
      backButton.click();
      console.log('✅ Back button clicked');
    } else {
      console.log('❌ Back button not found (you may not be on /account page)');
    }
  },
  
  // Check button styling and responsiveness
  testButtonResponsiveness: () => {
    console.log('🧪 Testing button responsiveness...');
    
    // Test Account button
    const accountButton = document.querySelector('button[aria-label="Go to Account Dashboard"]');
    if (accountButton) {
      const styles = window.getComputedStyle(accountButton);
      console.log('Account button styles:');
      console.log('- Width:', styles.width);
      console.log('- Height:', styles.height);
      console.log('- Background:', styles.background);
      console.log('- Color:', styles.color);
      console.log('- Border radius:', styles.borderRadius);
    }
    
    // Test Back button
    const backButton = document.querySelector('button[aria-label="Back to main page"]');
    if (backButton) {
      const styles = window.getComputedStyle(backButton);
      console.log('Back button styles:');
      console.log('- Width:', styles.width);
      console.log('- Height:', styles.height);
      console.log('- Background:', styles.background);
      console.log('- Color:', styles.color);
      console.log('- Border radius:', styles.borderRadius);
    }
  }
};

// Export for use in browser console or Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testNavigation, manualTests };
} else {
  // Browser environment
  window.navigationTests = { testNavigation, manualTests };
  console.log('📚 Navigation tests loaded!');
  console.log('Run: navigationTests.testNavigation() to start testing');
  console.log('Or use: navigationTests.manualTests.testNavigateToAccount() for specific tests');
}

// Auto-run if this is the main module
if (typeof require !== 'undefined' && require.main === module) {
  testNavigation();
} 