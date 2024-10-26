// import mongoose from 'mongoose';

// // Connection to Video Game Wingman Database (main MongoDB)
// export const connectToWingmanDB = async () => {
//   const wingmanUri = process.env.MONGODB_URI_WINGMAN;

//   if (!wingmanUri) {
//     throw new Error('MONGODB_URI_WINGMAN is not defined in the environment variables');
//   }

//   if (mongoose.connection.readyState === 0) {
//     try {
//       await mongoose.connect(wingmanUri);  // Main Wingman DB URI
//       console.log('Connected to Wingman DB');
//     } catch (error) {
//       console.error('Error connecting to Wingman DB:', error);
//     }
//   }
// };

// // Connection to Splash Page MongoDB
// export const connectToSplashDB = async () => {
//   const splashUri = process.env.MONGO_URI;

//   if (!splashUri) {
//     throw new Error('MONGO_URI is not defined in the environment variables');
//   }

//   const splashConnection = mongoose.createConnection(splashUri);

//   splashConnection.on('connected', () => {
//     console.log('Connected to Splash Page DB');
//   });

//   splashConnection.on('error', (error) => {
//     console.error('Error connecting to Splash Page DB:', error);
//   });

//   return splashConnection;
// };