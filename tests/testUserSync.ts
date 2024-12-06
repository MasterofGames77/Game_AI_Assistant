// import { syncUserData } from '../utils/checkProAccess';
// import { connectToWingmanDB, connectToSplashDB } from '../utils/databaseConnections';
// import dotenv from 'dotenv';

// dotenv.config({ path: '.env.local' });

// async function testUserSync() {
//   try {
//     // 1. Test with existing user in splash database
//     console.log('\nTest 1: Syncing existing user...');
//     const splashDB = await connectToSplashDB();
//     const wingmanDB = await connectToWingmanDB();
    
//     // Get a test user from splash database
//     const testUser = await splashDB.db?.collection('users').findOne({ isApproved: true });
    
//     if (testUser) {
//       console.log('Found test user:', testUser.email);
//       await syncUserData(testUser.userId, testUser.email);
      
//       // Verify user was synced
//       const syncedUser = await wingmanDB.db?.collection('users').findOne({ userId: testUser.userId });
//       console.log('Synced user data:', syncedUser);
//     }

//     // 2. Test with non-existent user
//     console.log('\nTest 2: Testing non-existent user...');
//     await syncUserData('non-existent-user', 'test@example.com');

//     // 3. Test with invalid data
//     console.log('\nTest 3: Testing with invalid data...');
//     try {
//       await syncUserData('');
//       console.log('Should have thrown an error for empty userId');
//     } catch (error) {
//       console.log('Successfully caught error for invalid data');
//     }

//   } catch (error) {
//     console.error('Test failed:', error);
//   } finally {
//     process.exit();
//   }
// }

// testUserSync(); 