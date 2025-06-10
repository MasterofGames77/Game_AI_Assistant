import { connectToSplashDB, connectToWingmanDB } from './databaseConnections';
import { Schema, Document } from 'mongoose';
import mongoose from 'mongoose';

// WingmanDB User interface (from models/User.ts)
interface IWingmanUser extends Document {
    userId: string;
    email: string;
    conversationCount: number;
    hasProAccess: boolean;
    achievements: Array<{
      name: string;
      dateEarned: Date;
    }>;
    progress: {
      firstQuestion: number;
      frequentAsker: number;
      rpgEnthusiast?: number;
      bossBuster?: number;
      platformerPro?: number;
      survivalSpecialist?: number;
      strategySpecialist?: number;
      actionAficionado?: number;
      battleRoyale?: number;
      sportsChampion?: number;
      adventureAddict?: number;
      fightingFanatic?: number;
      simulationSpecialist?: number;
      shooterSpecialist?: number;
      puzzlePro?: number;
      racingRengade?: number;
      stealthExpert?: number;
      horrorHero?: number;
      triviaMaster?: number;
      storySeeker?: number;
      beatEmUpBrawler?: number;
      rhythmMaster?: number;
      totalQuestions?: number;
      dailyExplorer?: number;
      speedrunner?: number;
      collectorPro?: number;
      dataDiver?: number;
      performanceTweaker?: number;
      conversationalist?: number;
  };
}

// SplashDB User interface (from splash page backend)
interface ISplashUser extends Document {
    email: string;
    userId: string;
    position: number | null;
    isApproved: boolean;
    hasProAccess: boolean;
}

// WingmanDB User schema
const wingmanUserSchema = new Schema<IWingmanUser>({
  userId: { type: String, required: true },
  email: { type: String, required: true },
  hasProAccess: { type: Boolean, default: false },
});

// SplashDB User schema
const splashUserSchema = new Schema<ISplashUser>({
  email: { type: String, required: true },
  isApproved: { type: Boolean, default: false },
  userId: { type: String, required: true },
});

// Check pro access for a user
export const checkProAccess = async (username: string): Promise<boolean> => {
  try {
    const wingmanDB = await connectToWingmanDB();
    const splashDB = await connectToSplashDB();

    const WingmanUser = wingmanDB.model<IWingmanUser>('User', wingmanUserSchema);
    const SplashUser = splashDB.model<ISplashUser>('User', splashUserSchema);

    // Try to find by username first
    const [wingmanUser, splashUser] = await Promise.all([
      WingmanUser.findOne({ username }),
      SplashUser.findOne({ username })
    ]);

    // Optionally, fallback to userId for legacy support
    // if (!wingmanUser && userId) { ... }

    return !!(
      (wingmanUser && wingmanUser.hasProAccess) ||
      (splashUser && (splashUser.hasProAccess || splashUser.isApproved))
    );
  } catch (error) {
    console.error('Error checking pro access:', error);
    return false;
  }
};

export const syncUserData = async (userId: string, email?: string): Promise<void> => {
  try {
    // Connect to databases
    await connectToWingmanDB(); // Just connect without storing the reference
    await connectToSplashDB();

    // Check if models already exist before compiling
    const WingmanUser = mongoose.models.User || mongoose.model('User', wingmanUserSchema);
    const SplashUser = mongoose.models.SplashUser || mongoose.model('SplashUser', splashUserSchema);

    // First check Splash DB
    const splashUser = email 
      ? await SplashUser.findOne({ email })
      : await SplashUser.findOne({ userId });

    if (splashUser) {
      // Check pro access eligibility
      const signupDate = new Date(splashUser.userId.split('-')[1]); // Extract date from userId
      const proDeadline = new Date('2025-07-31T23:59:59.999Z');
      const hasProAccess = (
        (typeof splashUser.position === 'number' && splashUser.position <= 5000) || // First 5000 users
        signupDate <= proDeadline // Or signed up before deadline
      );

      // Update or create user in Wingman DB with all required fields
      await WingmanUser.findOneAndUpdate(
        { userId: splashUser.userId },
        {
          userId: splashUser.userId,
          email: splashUser.email,
          hasProAccess, // Use the calculated hasProAccess value
          conversationCount: 0,
          $setOnInsert: {
            achievements: [],
            progress: {
              firstQuestion: 0,
              frequentAsker: 0,
              rpgEnthusiast: 0,
              bossBuster: 0,
              platformerPro: 0,
              survivalSpecialist: 0,
              strategySpecialist: 0,
              actionAficionado: 0,
              battleRoyale: 0,
              sportsChampion: 0,
              adventureAddict: 0,
              fightingFanatic: 0,
              simulationSpecialist: 0,
              shooterSpecialist: 0,
              puzzlePro: 0,
              racingRenegade: 0,
              stealthExpert: 0,
              horrorHero: 0,
              triviaMaster: 0,
              storySeeker: 0,
              beatEmUpBrawler: 0,
              rhythmMaster: 0,
              totalQuestions: 0,
              dailyExplorer: 0,
              speedrunner: 0,
              collectorPro: 0,
              dataDiver: 0,
              performanceTweaker: 0,
              conversationalist: 0
            }
          }
        },
        { 
          upsert: true, 
          new: true,
          setDefaultsOnInsert: true 
        }
      );
      console.log('User data synced from Splash DB to Wingman DB');
    } else {
      console.log('User not found in Splash DB');
    }
  } catch (error) {
    console.error('Error syncing user data:', error);
  }
};