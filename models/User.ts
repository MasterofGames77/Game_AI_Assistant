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
    firstQuestion: { type: Number, default: 0 },         // Ask a question for the first time (First Question Achievement)
    frequentAsker: { type: Number, default: 0 },          // Ask 10 questions in a single day (Frequent Asker Achievement)
    rpgEnthusiast: { type: Number, default: 0 },          // Ask 5 questions about of RPG's (RPG Enthusiast)
    bossBuster: { type: Number, default: 0 },             // Ask 10 questions specifically about boss fights (Boss Battle Achievement)
    strategySpecialist: {type: Number, default: 0 },      // Ask 5 questions about strategy games (Strategy Specialist)
    actionAficionado: { type: Number, default: 0 },        // Ask 5 questiions about action games (Action Aficionado)
    adventureAddict: { type: Number, default: 0 },        // Ask 5 questions about adventure games (Adventure Addict)
    shooterSpecialist: { type: Number, default: 0 },      // Ask 5 questions about First-Person or Third-Person Shooter Games (Shooter Specialist)
    puzzlePro: { type: Number, default: 0 },              // Ask 5 questions about puzzle games (Puzzle Pro)
    racingExpert: { type: Number, default: 0 },            // Ask 5 questions about racing games (Racing Expert)
    stealthSpecialist: { type: Number, default: 0 },       // Ask 5 questions about stealth games (Stealth Specialist)
    horrorHero: { type: Number, default: 0 },             // Ask 5 questions about horror games (Horror Hero)
    triviaMaster: { type: Number, default: 0 },           // Ask trivia-related questions about 5 different games (Trivia Master)
    totalQuestions: { type: Number, default: 0 },         // Track total questions asked for general achievements
    dailyExplorer: { type: Number, default: 0 },          // Ask a question each day in the week (Daily Explorer Achievement)
    speedrunner: { type: Number, default: 0 },            // Track questions related to speedrunning (Speedrunner Achievement)
    collectorPro: { type: Number, default: 0 },          // Track questions about finding collectibles (Collector Pro Achievement)
    dataDiver: { type: Number, default: 0 },              // Request gameplay analytics or insights 5 times (Data Diver Achievement)
    performanceTweaker: { type: Number, default: 0 },     // Ask questions about improving game performance (Performance Tweaker Achievement)
    conversationalist: { type: Number, default: 0 },      // Ask 50 questions over time (Conversationalist Achievement)
  },
}, { collection: 'userID' });

const User = mongoose.models.User || mongoose.model('User', UserSchema);

export default User;