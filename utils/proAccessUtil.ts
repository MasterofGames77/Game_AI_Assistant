import { connectToSplashDB, connectToWingmanDB } from './databaseConnections';
import { Schema } from 'mongoose';
import User from '../models/User';
import { ISplashUser } from '../types';

// SplashDB User schema
const splashUserSchema = new Schema<ISplashUser>({
  email: { type: String, required: true },
  isApproved: { type: Boolean, default: false },
  userId: { type: String, required: true },
});

// Check pro access for a user
export const checkProAccess = async (identifier: string, userId?: string): Promise<boolean> => {
  // Always grant Pro access for test/dev user (with username)
  if (identifier === "test-user" || identifier === "TestUser1") return true;
  try {
    await connectToWingmanDB();
    const splashDB = await connectToSplashDB();

    const AppUser = User;
    const SplashUser = splashDB.models.SplashUser || splashDB.model<ISplashUser>('SplashUser', splashUserSchema);

    // Build query
    const query = { $or: [
      { username: identifier },
      { userId: identifier },
      { email: identifier },
      ...(userId ? [{ userId }] : [])
    ]};

    // Find user in both DBs
    const [appUser, splashUser] = await Promise.all([
      AppUser.findOne(query),
      SplashUser.findOne(query)
    ]);

    if (appUser) {
    }
    if (splashUser) {
    }

    // 1. If user has Pro in application DB, grant Pro
    if (appUser && appUser.hasProAccess) return true;

    // 2. If user is in Splash DB and eligible, grant Pro
    if (splashUser) {
      // Check deadline logic
      const proDeadline = new Date('2025-12-31T23:59:59.999Z');
      let signupDate: Date | null = null;
      if (splashUser.userId && splashUser.userId.includes('-')) {
        // Extract date from userId if possible
        const datePart = splashUser.userId.split('-')[1];
        if (!isNaN(Date.parse(datePart))) {
          signupDate = new Date(datePart);
        }
      }
      const isEarlyUser = typeof splashUser.position === 'number' && splashUser.position <= 5000;
      const isBeforeDeadline = signupDate && signupDate <= proDeadline;

      if (
        splashUser.hasProAccess ||
        splashUser.isApproved ||
        isEarlyUser ||
        isBeforeDeadline
      ) {
        return true;
      }
    }

    // 3. Otherwise, no Pro
    return false;
  } catch (error) {
    return false;
  }
};

export const syncUserData = async (userId: string, email?: string): Promise<void> => {
  try {
    // Connect to databases
    // const wingmanDB = await connectToWingmanDB();
    const splashDB = await connectToSplashDB();

    // Use unique model names to avoid conflicts
    const AppUser = User;
    const SplashUser = splashDB.models.SplashUser || splashDB.model<ISplashUser>('SplashUser', splashUserSchema);

    // First check Splash DB
    const splashUser = email 
      ? await SplashUser.findOne({ email })
      : await SplashUser.findOne({ userId });

    if (splashUser) {
      // Check pro access eligibility
      const signupDate = new Date(splashUser.userId.split('-')[1]); // Extract date from userId
      const proDeadline = new Date('2025-12-31T23:59:59.999Z');
      const hasProAccess = (
        (typeof splashUser.position === 'number' && splashUser.position <= 5000) || // First 5000 users
        signupDate <= proDeadline // Or signed up before deadline
      );

      // Update or create user in Wingman DB with all required fields
      await AppUser.findOneAndUpdate(
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
              conversationalist: 0,
              proAchievements: {
                gameMaster: 0,
                speedDemon: 0,
                communityLeader: 0,
                achievementHunter: 0,
                proStreak: 0,
                expertAdvisor: 0,
                genreSpecialist: 0,
                proContributor: 0
              }
            }
          }
        },
        { 
          upsert: true, 
          new: true,
          setDefaultsOnInsert: true 
        }
      );
    } else {
    }
  } catch (error) {
  }
};