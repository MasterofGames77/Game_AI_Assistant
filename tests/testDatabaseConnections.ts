// import { connectToWingmanDB, connectToSplashDB } from '../utils/databaseConnections';
// import dotenv from 'dotenv';

// dotenv.config({ path: '.env.local' });

// async function testConnections() {
//   try {
//     console.log('Testing Wingman DB connection...');
//     const wingmanDB = await connectToWingmanDB();
//     console.log('Wingman DB Connection State:', wingmanDB.readyState);
    
//     console.log('\nTesting Splash DB connection...');
//     const splashDB = await connectToSplashDB();
//     console.log('Splash DB Connection State:', splashDB.readyState);
    
//     // Test query on both databases
//     const wingmanUsers = await wingmanDB.db?.collection('users').countDocuments();
//     const splashUsers = await splashDB.db?.collection('users').countDocuments();
    
//     console.log('\nDatabase Statistics:');
//     console.log('Wingman DB Users:', wingmanUsers);
//     console.log('Splash DB Users:', splashUsers);
    
//   } catch (error) {
//     console.error('Test failed:', error);
//   } finally {
//     process.exit();
//   }
// }

// testConnections(); 