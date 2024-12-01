// import mongoose from 'mongoose';

// let wingmanDB: mongoose.Connection;
// let splashDB: mongoose.Connection;

// // Connect to Wingman Database
// export const connectToWingmanDB = async (): Promise<mongoose.Connection> => {
//   const wingmanUri = process.env.MONGODB_URI_WINGMAN;

//   if (!wingmanUri) {
//     throw new Error('MONGODB_URI_WINGMAN is not defined in the environment variables');
//   }

//   if (!wingmanDB || wingmanDB.readyState === 0) {
//     try {
//       wingmanDB = mongoose.createConnection(wingmanUri);

//       wingmanDB.on('connected', () => {
//         console.log('Connected to Wingman DB');
//       });

//       wingmanDB.on('error', (error) => {
//         console.error('Error connecting to Wingman DB:', error);
//       });
//     } catch (error) {
//       throw new Error(`Failed to connect to Wingman DB: ${(error as Error).message}`);
//     }
//   }

//   return wingmanDB;
// };

// // Connect to Splash Page Database
// export const connectToSplashDB = async (): Promise<mongoose.Connection> => {
//   const splashUri = process.env.MONGO_URI;

//   if (!splashUri) {
//     throw new Error('MONGO_URI is not defined in the environment variables');
//   }

//   if (!splashDB || splashDB.readyState === 0) {
//     try {
//       splashDB = mongoose.createConnection(splashUri);

//       splashDB.on('connected', () => {
//         console.log('Connected to Splash Page DB');
//       });

//       splashDB.on('error', (error) => {
//         console.error('Error connecting to Splash Page DB:', error);
//       });
//     } catch (error) {
//       throw new Error(`Failed to connect to Splash Page DB: ${(error as Error).message}`);
//     }
//   }

//   return splashDB;
// };