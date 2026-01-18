import connectToMongoDB from './mongodb';
import User from '../models/User';
import mongoose from 'mongoose';
import Question from '../models/Question';
import { checkQuestionType, checkAndAwardAchievements } from '../pages/api/assistant';

const updateAchievementsForUser = async (email: string) => {
  await connectToMongoDB();

  try {
    // First, get the current user data
    const user = await User.findOne({ email });
    if (!user || !user.username) {
      // Handle missing username (legacy user)
      throw new Error('User does not have a username');
    }

    // console.log('Found user:', user.email); // Commented out for production

    // Get all questions for this user
    const questions = await Question.find({ username: user.username });
    // console.log(`Found ${questions.length} questions for user`); // Commented out for production

    // Initialize progress with all possible fields
    const progress: Record<string, any> = {
      firstQuestion: 0,
      frequentAsker: 0,
      rpgEnthusiast: 0,
      bossBuster: 0,
      platformerPro: 0,
      survivalSpecialist: 0,
      strategySpecialist: 0,
      actionAficionado: 0,
      battleRoyaleMaster: 0,
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
      shootemUpSniper: 0,
      rogueRenegade: 0,
      totalQuestions: questions.length,
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
    };

    // Process each question to update progress using the enhanced checkQuestionType
    // console.log('Processing questions for achievement tracking...'); // Commented out for production
    for (const question of questions) {
      const types = await checkQuestionType(question.question);
      for (const type of types) {
        if (type in progress) {
          progress[type]++;
          // console.log(`Detected ${type} for question: "${question.question.substring(0, 50)}..."`); // Commented out for production
        }
      }
    }

    // console.log('Calculated progress:', progress); // Commented out for production

    // Update user's progress
    const updateResult = await User.findOneAndUpdate(
      { username: user.username },
      { $set: { progress } },
      { new: true }
    );

    if (updateResult) {
      // Now check and award achievements based on the progress
      const newAchievements = await checkAndAwardAchievements(user.username, progress);
      // console.log('Awarded achievements:', newAchievements); // Commented out for production
    }

    // console.log('Update completed for user:', email); // Commented out for production
    return updateResult;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
  }
};

// Create a new endpoint specifically for updating a single user by email
const createUpdateUserEndpoint = async (req: any, res: any) => {
  if (!req.query.email) {
    return res.status(400).json({ message: 'Email parameter is required' });
  }

  try {
    const result = await updateAchievementsForUser(req.query.email);
    if (!result) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.status(200).json({
      message: 'Successfully updated user achievements',
      progress: result.progress,
      achievements: result.achievements
    });
  } catch (error) {
    console.error('Error in update endpoint:', error);
    return res.status(500).json({
      message: 'Error updating achievements',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Update all users with new achievements progress
const updateAchievementsForAllUsers = async () => {
  // console.log('Starting achievement update for all users...'); // Commented out for production

  try {
    await connectToMongoDB();
    // console.log('Connected to MongoDB successfully'); // Commented out for production

    // First, get all users
    const users = await User.find({});
    // console.log(`Found ${users.length} users to process`); // Commented out for production

    // Process each user
    for (const user of users) {
      // console.log(`Processing user: ${user.email || user.username}`); // Commented out for production

      try {
        // Get user's questions to calculate progress
        const questions = await Question.find({ username: user.username });
        // console.log(`Found ${questions.length} questions for user`); // Commented out for production

        // Initialize progress with all possible fields
        const progress: Record<string, any> = {
          firstQuestion: 0,
          frequentAsker: 0,
          rpgEnthusiast: 0,
          bossBuster: 0,
          platformerPro: 0,
          survivalSpecialist: 0,
          strategySpecialist: 0,
          actionAficionado: 0,
          battleRoyaleMaster: 0,
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
          shootemUpSniper: 0,
          rogueRenegade: 0,
          totalQuestions: questions.length,
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
        };

        // Process each question to update progress using the enhanced checkQuestionType
        // console.log('Processing questions for achievement tracking...'); // Commented out for production
        for (const q of questions) {
          const types = await checkQuestionType(q.question);
          for (const type of types) {
            if (type in progress) {
              progress[type]++;
              // console.log(`Detected ${type} for question: "${q.question.substring(0, 50)}..."`); // Commented out for production
            }
          }
        }

        // console.log(`Updated progress for user:`, progress); // Commented out for production

        // Update user's progress
        const updateResult = await User.findOneAndUpdate(
          { username: user.username },
          {
            $set: { progress }
          },
          { new: true }
        );

        // Check and award achievements
        if (updateResult) {
          const newAchievements = await checkAndAwardAchievements(user.username, progress);
          if (newAchievements.length > 0) {
            // console.log(`Awarded ${newAchievements.length} new achievements to user ${user.email || user.username}`); // Commented out for production
          }
        }

        // console.log(`Completed processing for user: ${user.email || user.username}`); // Commented out for production
      } catch (userError) {
        console.error(`Error processing user ${user.email || user.username}:`, userError);
        // Continue with next user even if one fails
        continue;
      }
    }

    // console.log('Successfully completed achievement update for all users'); // Commented out for production
  } catch (error) {
    console.error('Error in updateAchievementsForAllUsers:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    // console.log('Closed MongoDB connection'); // Commented out for production
  }
};

// Verify update function
const verifyUpdate = async (username: string) => {
  await connectToMongoDB();
  try {
    const user = await User.findOne({ username });
    // console.log('User data:', {
    //   username: user?.username,
    //   hasAchievements: !!user?.achievements,
    //   hasProgress: !!user?.progress
    // }); // Commented out for production
  } finally {
    await mongoose.connection.close();
  }
};

// Update achievements from history
const updateAchievementsFromHistory = async (username: string) => {
  await connectToMongoDB();

  try {
    const questions = await Question.find({ username });
    const progress: Record<string, number> = {};

    // Process questions sequentially due to async nature
    for (const q of questions) {
      const types = await checkQuestionType(q.question);
      for (const type of types) {
        progress[type] = (progress[type] || 0) + 1;
      }
    }

    // Update user's progress
    const user = await User.findOneAndUpdate(
      { username },
      { $set: { progress } },
      { new: true }
    );

    if (user) {
      await checkAndAwardAchievements(user.username, user.progress, null);
    }

    // console.log('Updated achievements from history for user:', username); // Commented out for production
  } catch (error) {
    console.error('Error updating achievements from history:', error);
  } finally {
    await mongoose.connection.close();
  }
};

// Export all functions in one place
export {
  updateAchievementsForUser,
  updateAchievementsForAllUsers,
  updateAchievementsFromHistory,
  verifyUpdate,
  createUpdateUserEndpoint
};
