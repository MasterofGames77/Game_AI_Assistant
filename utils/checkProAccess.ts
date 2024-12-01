// import { connectToSplashDB, connectToWingmanDB } from './databaseConnections';
// import { Schema, Document } from 'mongoose';

// // WingmanDB User interface
// interface IWingmanUser extends Document {
//   userId: string;
//   email: string;
//   hasProAccess: boolean;
// }

// // Splash Page User interface
// interface ISplashUser extends Document {
//   email: string;
//   isApproved: boolean;
// }

// // WingmanDB User schema
// const wingmanUserSchema = new Schema<IWingmanUser>({
//   userId: { type: String, required: true },
//   email: { type: String, required: true },
//   hasProAccess: { type: Boolean, default: false },
// });

// // SplashDB User schema
// const splashUserSchema = new Schema<ISplashUser>({
//   email: { type: String, required: true, unique: true },
//   isApproved: { type: Boolean, default: false },
// });

// // Check and synchronize Pro Access
// const checkProAccess = async (userId: string): Promise<void> => {
//   try {
//     // Connect to Wingman DB
//     const wingmanDB = await connectToWingmanDB();
//     const WingmanUserModel = wingmanDB.model<IWingmanUser>('User', wingmanUserSchema);

//     // Find the user in Wingman DB
//     const wingmanUser = await WingmanUserModel.findOne({ userId });
//     if (!wingmanUser) {
//       throw new Error(`User with ID ${userId} not found in Wingman DB.`);
//     }

//     // Connect to Splash Page DB
//     const splashDB = await connectToSplashDB();
//     const SplashUserModel = splashDB.model<ISplashUser>('User', splashUserSchema);

//     // Find the user in Splash Page DB by email
//     const splashUser = await SplashUserModel.findOne({ email: wingmanUser.email });
//     if (!splashUser) {
//       throw new Error(`User with email ${wingmanUser.email} not found in Splash Page DB.`);
//     }

//     // Check if the user is approved and grant Pro Access
//     if (splashUser.isApproved && !wingmanUser.hasProAccess) {
//       wingmanUser.hasProAccess = true;
//       await wingmanUser.save();
//       console.log(`${wingmanUser.email} has been granted Pro Access in Wingman DB.`);
//     } else if (splashUser.isApproved) {
//       console.log(`${wingmanUser.email} already has Pro Access.`);
//     } else {
//       console.log(`${wingmanUser.email} is not approved in Splash Page DB.`);
//     }
//   } catch (error) {
//     console.error('Error checking Pro Access:', error);
//   }
// };

// export default checkProAccess;