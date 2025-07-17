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

    // 1. Check if user has active subscription using new subscription system
    if (appUser && appUser.hasActiveProAccess && appUser.hasActiveProAccess()) {
      return true;
    }

    // 2. Legacy check: If user has Pro in application DB (backward compatibility)
    if (appUser && appUser.hasProAccess) {
      return true;
    }

    // 3. Check early access eligibility from Splash DB
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
        // If user is eligible for early access, update their subscription data
        if (appUser && !appUser.subscription?.earlyAccessGranted) {
          const earlyAccessStartDate = new Date('2025-12-31T23:59:59.999Z');
          const earlyAccessEndDate = new Date('2026-12-31T23:59:59.999Z');
          
          await AppUser.findOneAndUpdate(
            { _id: appUser._id },
            {
              hasProAccess: true,
              subscription: {
                status: 'free_period',
                earlyAccessGranted: true,
                earlyAccessStartDate,
                earlyAccessEndDate,
                transitionToPaid: false,
                currentPeriodStart: earlyAccessStartDate,
                currentPeriodEnd: earlyAccessEndDate
              }
            }
          );
        }
        return true;
      }
    }

    // 4. Otherwise, no Pro access
    return false;
  } catch (error) {
    console.error('Error checking Pro access:', error);
    return false;
  }
};

export const syncUserData = async (userId: string, email?: string): Promise<void> => {
  try {
    // Connect to databases
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
      const earlyAccessStartDate = new Date('2025-12-31T23:59:59.999Z');
      const earlyAccessEndDate = new Date('2026-12-31T23:59:59.999Z');
      
      const isEarlyUser = (typeof splashUser.position === 'number' && splashUser.position <= 5000);
      const isBeforeDeadline = signupDate <= proDeadline;
      const hasProAccess = isEarlyUser || isBeforeDeadline;

      // Update or create user in Wingman DB with all required fields
      await AppUser.findOneAndUpdate(
        { userId: splashUser.userId },
        {
          userId: splashUser.userId,
          email: splashUser.email,
          hasProAccess, // Use the calculated hasProAccess value
          conversationCount: 0,
          // Add subscription data for early access users
          ...(hasProAccess && {
            subscription: {
              status: 'free_period',
              earlyAccessGranted: true,
              earlyAccessStartDate,
              earlyAccessEndDate,
              transitionToPaid: false,
              currentPeriodStart: earlyAccessStartDate,
              currentPeriodEnd: earlyAccessEndDate
            }
          }),
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
              sandboxBuilder: 0,
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
      // Handle case where user is not in Splash DB
      // This could be a new user or a user who signed up after the deadline
      await AppUser.findOneAndUpdate(
        { userId },
        {
          userId,
          email,
          hasProAccess: false,
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
              sandboxBuilder: 0,
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
    }
  } catch (error) {
    console.error('Error syncing user data:', error);
  }
};