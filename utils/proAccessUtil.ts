import { connectToSplashDB, connectToWingmanDB } from './databaseConnections';
import { Schema } from 'mongoose';
import User from '../models/User';
import { ISplashUser } from '../types';
import connectToMongoDB from './mongodb';

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
  
  // Always grant Pro access for LegendaryRenegade (Master account)
  if (identifier === "LegendaryRenegade") return true;
  
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

    // PRIORITY 1: Check main application database first
    if (appUser) {
      // 1. Check if user has active subscription using new subscription system
      if (appUser.hasActiveProAccess && appUser.hasActiveProAccess()) {
        console.log('Pro access granted via hasActiveProAccess() method for user:', appUser.username);
        return true;
      }

      // 2. Legacy check: If user has Pro in application DB (backward compatibility)
      if (appUser.hasProAccess) {
        console.log('Pro access granted via hasProAccess field for user:', appUser.username);
        return true;
      }

      // 3. Check if user has active subscription status
      if (appUser.subscription?.status === 'active' && appUser.subscription?.currentPeriodEnd && appUser.subscription.currentPeriodEnd > new Date()) {
        console.log('Pro access granted via active subscription for user:', appUser.username);
        return true;
      }

      // 4. Check if user has canceled subscription but still has access until period end
      if (appUser.subscription?.status === 'canceled' && appUser.subscription?.cancelAtPeriodEnd && appUser.subscription?.currentPeriodEnd && appUser.subscription.currentPeriodEnd > new Date()) {
        console.log('Pro access granted via canceled subscription (active until period end) for user:', appUser.username);
        return true;
      }
    }

    // PRIORITY 2: Check early access eligibility from Splash DB (only if not found in main app)
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

    // PRIORITY 3: Otherwise, no Pro access
    return false;
  } catch (error) {
    console.error('Error checking Pro access:', error);
    return false;
  }
};

export const syncUserData = async (userId: string, email?: string): Promise<void> => {
  try {
    // Clean the email if it has malformed parameters attached
    if (email) {
      // Handle various malformed email formats
      if (email.includes("?")) {
        // Extract the actual email (everything before the first ?)
        email = email.split("?")[0];
        console.log("Cleaned malformed email in syncUserData:", email);
      }
      
      // Additional cleanup for any remaining malformed parameters
      if (email.includes("?earlyAccess=true")) {
        email = email.replace("?earlyAccess=true", "");
        console.log("Cleaned remaining malformed parameters from email in syncUserData");
      }
    }

    // Connect to databases
    await connectToMongoDB(); // Ensure MongoDB is connected
    const splashDB = await connectToSplashDB();

    // Use unique model names to avoid conflicts
    const AppUser = User;
    const SplashUser = splashDB.models.SplashUser || splashDB.model<ISplashUser>('SplashUser', splashUserSchema);

    // First check if user already exists in Wingman DB
    const existingWingmanUser = await AppUser.findOne({ userId });
    
    if (existingWingmanUser) {
      console.log('User already exists in Wingman DB, updating Discord info:', {
        userId,
        existingEmail: existingWingmanUser.email,
        discordEmail: email,
        hasProAccess: existingWingmanUser.hasProAccess
      });
      
      // Update the existing user with Discord email if different
      if (email && email !== existingWingmanUser.email) {
        await AppUser.findOneAndUpdate(
          { userId },
          { 
            email: email, // Update with Discord email
            $addToSet: { 
              linkedAccounts: { 
                platform: 'discord', 
                email: email,
                linkedAt: new Date()
              }
            }
          }
        );
        console.log('Updated user with Discord email');
      }
      return; // User already exists, no need to create new one
    }

    // Check Splash DB for early access users
    const splashUser = email 
      ? await SplashUser.findOne({ email })
      : await SplashUser.findOne({ userId });

    // Also check Wingman DB by email as fallback
    let existingWingmanUserByEmail = null;
    if (email) {
      existingWingmanUserByEmail = await AppUser.findOne({ email });
    }

    // If we found an existing Wingman user by email, update their userId to Discord ID
    if (existingWingmanUserByEmail) {
      console.log('Found existing Wingman user by email, updating with Discord ID:', {
        existingUserId: existingWingmanUserByEmail.userId,
        discordUserId: userId,
        email: email,
        hasProAccess: existingWingmanUserByEmail.hasProAccess
      });
      
      // Update the existing user with Discord userId
      await AppUser.findOneAndUpdate(
        { email },
        { 
          userId: userId, // Update with Discord userId
          $addToSet: { 
            linkedAccounts: { 
              platform: 'discord', 
              userId: userId,
              linkedAt: new Date()
            }
          }
        }
      );
      console.log('Updated existing user with Discord ID');
      return; // User already exists, no need to create new one
    }

    if (splashUser) {
      // Check pro access eligibility
      let signupDate: Date | null = null;
      
      // Only try to parse date if userId contains a date format (not Discord IDs)
      if (splashUser.userId.includes('-') && splashUser.userId.split('-').length > 1) {
        try {
          const datePart = splashUser.userId.split('-')[1];
          if (!isNaN(Date.parse(datePart))) {
            signupDate = new Date(datePart);
          }
        } catch (error) {
          console.log('Could not parse date from userId:', splashUser.userId);
        }
      }
      
      const proDeadline = new Date('2025-12-31T23:59:59.999Z');
      const earlyAccessStartDate = new Date('2025-12-31T23:59:59.999Z');
      const earlyAccessEndDate = new Date('2026-12-31T23:59:59.999Z');
      
      const isEarlyUser = (typeof splashUser.position === 'number' && splashUser.position <= 5000);
      const isBeforeDeadline = signupDate ? signupDate <= proDeadline : false;
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
      // This could be a new user, Discord user, or a user who signed up after the deadline
      console.log('User not found in Splash DB, creating basic user record:', { userId, email });
      
      await AppUser.findOneAndUpdate(
        { userId },
        {
          userId,
          email: email || `discord-${userId}@example.com`,
          username: `discord-${userId}`, // Give Discord users a unique username
          hasProAccess: false, // Discord users start without Pro access
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
    // Don't throw the error, just log it to prevent the callback from failing
    // The user can still proceed with Discord authentication
  }
};