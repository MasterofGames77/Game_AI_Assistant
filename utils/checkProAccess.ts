// import { connectToSplashDB } from '../utils/databaseConnections';
// import User, { IUser } from '../models/User';  // Import the Video Game Wingman User model

// const checkProAccess = async (userId: string) => {
//   // Find the user in the Wingman DB
//   const wingmanUser = await User.findOne({ userId }) as IUser | null;

//   if (!wingmanUser) {
//     throw new Error('User not found in Video Game Wingman database.');
//   }

//   // Use explicit connection to Splash DB
//   const splashConnection = await connectToSplashDB();
//   const SplashUser = splashConnection.model('User', User.schema);

//   // Find the user by email in the splash page DB
//   const splashUser = await SplashUser.findOne({ email: wingmanUser.email });

//   // Check if the user is approved in the splash page DB
//   if (splashUser && splashUser.isApproved) {
//     if (!wingmanUser.hasProAccess) {
//       wingmanUser.hasProAccess = true;
//       await wingmanUser.save();
//       console.log(`${wingmanUser.email} has been granted Pro Access in Video Game Wingman.`);
//     } else {
//       console.log(`${wingmanUser.email} already has Pro Access.`);
//     }
//   } else {
//     console.log(`${wingmanUser.email} does not have Pro Access in the splash page.`);
//   }

//   // Close the Splash DB connection after use
//   splashConnection.close();
// };

// export default checkProAccess;
