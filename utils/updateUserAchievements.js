// const mongoose = require('mongoose');
// require('dotenv').config();

// // Define User Schema
// const userSchema = new mongoose.Schema({
//   email: String,
//   userId: String,
//   achievements: Array,
//   progress: {
//     firstQuestion: Number,
//     frequentAsker: Number,
//     rpgEnthusiast: Number,
//     bossBuster: Number,
//     strategySpecialist: Number,
//     actionAficionado: Number,
//     battleRoyale: Number,
//     sportsChampion: Number,
//     adventureAddict: Number,
//     shooterSpecialist: Number,
//     puzzlePro: Number,
//     racingExpert: Number,
//     stealthSpecialist: Number,
//     horrorHero: Number,
//     triviaMaster: Number,
//     totalQuestions: Number,
//     dailyExplorer: Number,
//     speedrunner: Number,
//     collectorPro: Number,
//     dataDiver: Number,
//     performanceTweaker: Number,
//     conversationalist: Number
//   }
// });

// const User = mongoose.model('User', userSchema);

// const updateAchievementsForUser = async (email) => {
//   try {
//     await mongoose.connect(process.env.MONGODB_URI);
//     console.log('Connected to MongoDB');

//     const update = {
//       $set: {
//         achievements: [],
//         progress: {
//           firstQuestion: 0,
//           frequentAsker: 0,
//           rpgEnthusiast: 0,
//           bossBuster: 0,
//           strategySpecialist: 0,
//           actionAficionado: 0,
//           battleRoyale: 0,
//           sportsChampion: 0,
//           adventureAddict: 0,
//           shooterSpecialist: 0,
//           puzzlePro: 0,
//           racingExpert: 0,
//           stealthSpecialist: 0,
//           horrorHero: 0,
//           triviaMaster: 0,
//           totalQuestions: 0,
//           dailyExplorer: 0,
//           speedrunner: 0,
//           collectorPro: 0,
//           dataDiver: 0,
//           performanceTweaker: 0,
//           conversationalist: 0
//         }
//       }
//     };

//     const result = await User.updateOne({ email }, update);
//     console.log(`Updated user with email ${email}:`, result.modifiedCount ? 'Success' : 'No user found');
//   } catch (error) {
//     console.error('Error updating user:', error);
//   } finally {
//     await mongoose.connection.close();
//     console.log('Disconnected from MongoDB');
//   }
// };

// // Run the update for the specific email
// updateAchievementsForUser(""); 