import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  conversationCount: { type: Number, required: true, default: 0 },  // Track the number of conversations
  hasProAccess: { type: Boolean, default: false },  // Whether the user has Pro Access

  achievements: [
    {
      name: { type: String, required: true },         // Name of the achievement (e.g., "RPG Enthusiast")
      dateEarned: { type: Date, required: true },     // Date the achievement was earned
    },
  ],

  progress: {
    rpgQuestions: { type: Number, default: 0 },       // Track number of RPG-related questions for "RPG Enthusiast"
    totalQuestions: { type: Number, default: 0 },     // Track total questions asked for general achievements
    dailyQuestion: {type: Number, default: 0 },        // Track if user asks a question each day in the week
    speedQuestion: {type: Number, default: 0 },        // Track how many questions the user asks relating to speedrunning
    collectorQuestion: {type: Number, default: 0 },    // Track questions about finding collectibles or secrets in games
    dataQuestion: {type: Number, default: 0 },        // Request gameplay analytics or insights 5 times
    performanceQuestion: {type: Number, default: 0 }, // Ask questions about improving game performance.
  },
}, { collection: 'userID' });

const User = mongoose.models.User || mongoose.model('User', UserSchema);

export default User;