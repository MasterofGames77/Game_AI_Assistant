# Quick Verification Checklist

## 🚀 Start Your Application

1. Make sure your Next.js app is running (`npm run dev`)
2. Ensure your database connections are working
3. Verify the application loads without errors

## ✅ Core Functionality Tests

### 1. User Registration & Early Access

- [ ] **Test**: Create a new user via the sign-in modal
- [ ] **Expected**: User gets early access (free period) if before Dec 31, 2025
- [ ] **Check**: User appears in sidebar with Pro status
- [ ] **Verify**: Database shows subscription data

### 2. Pro Access Checking

- [ ] **Test**: Check if Pro access works for different user types
- [ ] **Expected**: Early access users have Pro features
- [ ] **Check**: `/api/checkProAccess` returns correct status
- [ ] **Verify**: Subscription status details are returned

### 3. Subscription Status Display

- [ ] **Test**: Look at ProStatus component in sidebar
- [ ] **Expected**: Shows correct status badge and info
- [ ] **Check**: Warning indicators for expiring subscriptions
- [ ] **Verify**: Action buttons appear appropriately

### 4. API Endpoints

- [ ] **Test**: `/api/checkProAccess` with valid username
- [ ] **Expected**: Returns `hasProAccess` and `subscriptionStatus`
- [ ] **Test**: `/api/checkEarlyAccessExpiration` with early access user
- [ ] **Expected**: Returns warning level and days remaining
- [ ] **Test**: `/api/transitionEarlyAccess` with eligible user
- [ ] **Expected**: Returns transition eligibility and data
- [ ] **Test**: `/api/accountData` with valid username
- [ ] **Expected**: Returns user account data and subscription info

### 5. Database Verification

- [ ] **Check**: User documents have subscription field
- [ ] **Verify**: Early access users have correct dates
- [ ] **Confirm**: Subscription status methods work
- [ ] **Test**: Database indexes are created

### 6. Conversation Count Consistency

- [ ] **Test**: Check conversation counts on main page vs account dashboard
- [ ] **Expected**: Both pages show the same number of conversations
- [ ] **Check**: `/api/getConversation` and `/api/accountData` return consistent counts
- [ ] **Verify**: Counts are based on actual Question documents, not cached values

## 🔧 Manual Testing Steps

### Step 1: Create Test Users

```javascript
// In browser console, run the test script
// Load the test script first, then:
subscriptionTests.runAllTests();

// Or run the conversation count test directly:
// node tests/testConversationCount.js
```

### Step 2: Test Specific Scenarios

```javascript
// Test subscription system
subscriptionTests.runAllTests();

// Test account dashboard
accountTests.runAccountTests();

// Test navigation functionality
navigationTests.testNavigation();

// Test a specific user
subscriptionTests.manualTests.testUserStatus("your-username");

// Test account data for specific user
accountTests.manualAccountTests.testUserAccountData("your-username");

// Test early access expiration
subscriptionTests.manualTests.testUserExpiration("your-username");

// Test navigation buttons
navigationTests.manualTests.testNavigateToAccount();
navigationTests.manualTests.testNavigateBack();

// Test conversation count consistency
conversationTests.testConversationCountConsistency();

// Create test users
subscriptionTests.manualTests.createTestUser("testuser123", "test@example.com");
accountTests.manualAccountTests.createAccountTestUser(
  "accountuser123",
  "account@example.com"
);
```

### Step 3: Database Checks

```javascript
// In MongoDB shell or Compass:
// Check user subscription data
db.users.findOne(
  { username: "your-username" },
  { subscription: 1, hasProAccess: 1 }
);

// Check early access users
db.users.find({ "subscription.earlyAccessGranted": true });

// Check subscription status distribution
db.users.aggregate([
  { $group: { _id: "$subscription.status", count: { $sum: 1 } } },
]);
```

## 🐛 Common Issues to Check

### Issue 1: Database Connection Errors

- **Symptom**: API calls fail with database errors
- **Check**: Database connection strings in environment
- **Fix**: Verify MongoDB connection in `utils/databaseConnections.ts`

### Issue 2: Subscription Data Not Created

- **Symptom**: Users don't have subscription field
- **Check**: `syncUser.ts` early access logic
- **Fix**: Verify deadline dates and eligibility logic

### Issue 3: Pro Access Not Working

- **Symptom**: Users don't get Pro features
- **Check**: `checkProAccess` function in `proAccessUtil.ts`
- **Fix**: Verify subscription status checking logic

### Issue 4: API Endpoints Not Responding

- **Symptom**: 404 or 500 errors on API calls
- **Check**: API route files exist and are properly exported
- **Fix**: Verify file structure and exports

### Issue 5: TypeScript Errors

- **Symptom**: Build errors or type warnings
- **Check**: Type definitions in `types.ts`
- **Fix**: Add missing type definitions

## 📊 Expected Results

### For Early Access Users (before Dec 31, 2025):

```json
{
  "hasProAccess": true,
  "subscriptionStatus": {
    "type": "free_period",
    "status": "Free Period Active",
    "expiresAt": "2026-12-31T23:59:59.999Z",
    "daysUntilExpiration": 365,
    "canUpgrade": true,
    "showWarning": false
  }
}
```

### For Regular Users (after Dec 31, 2025):

```json
{
  "hasProAccess": false,
  "subscriptionStatus": {
    "type": "no_subscription",
    "status": "No Active Subscription",
    "canUpgrade": true
  }
}
```

## 🎯 Success Criteria

### ✅ All Tests Pass

- [ ] User creation works with subscription data
- [ ] Early access users get free period
- [ ] Pro access checking returns correct results
- [ ] Subscription status display works
- [ ] API endpoints respond correctly
- [ ] Database stores subscription data properly
- [ ] No TypeScript errors
- [ ] No console errors in browser

### ✅ User Experience

- [ ] Users can sign in normally
- [ ] Pro status shows correctly in sidebar
- [ ] Early access users see appropriate status
- [ ] Warning messages appear for expiring subscriptions
- [ ] Action buttons work as expected

### ✅ System Integration

- [ ] All existing functionality still works
- [ ] Database queries are optimized
- [ ] Error handling is graceful
- [ ] Logging provides useful information

## 🚨 If Tests Fail

1. **Check Console Logs**: Look for error messages
2. **Verify Database**: Ensure connections and data
3. **Test Individual Components**: Isolate the failing part
4. **Review Recent Changes**: Check what was modified
5. **Compare with Working State**: Revert if necessary

## 📝 Next Steps After Successful Testing

1. **Stripe Integration**: Set up payment processing
2. **Checkout Flow**: Implement payment collection
3. **Customer Portal**: Add subscription management
4. **Email Notifications**: Set up automated alerts
5. **Production Deployment**: Move to live environment

---

**Remember**: This is a comprehensive system, so take your time testing each component. The goal is to ensure everything works correctly before moving to the next implementation phase.
