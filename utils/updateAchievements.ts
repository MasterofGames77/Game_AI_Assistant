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
    if (!user) {
      console.log('User not found');
      return;
    }

    console.log('Found user:', user.email);

    // Get all questions for this user
    const questions = await Question.find({ userId: user.userId });
    console.log(`Found ${questions.length} questions for user`);

    // Initialize progress with all possible fields
    const progress: Record<string, number> = {
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
      racingExpert: 0,
      stealthSpecialist: 0,
      horrorHero: 0,
      triviaMaster: 0,
      storySeeker: 0,
      beatEmUpBrawler: 0,
      rhythmMaster: 0,
      totalQuestions: questions.length,
      dailyExplorer: 0,
      speedrunner: 0,
      collectorPro: 0,
      dataDiver: 0,
      performanceTweaker: 0,
      conversationalist: 0
    };

    // Process each question to update progress using the enhanced checkQuestionType
    console.log('Processing questions for achievement tracking...');
    for (const question of questions) {
      const type = await checkQuestionType(question.question);
      if (type && type in progress) {
        progress[type]++;
        console.log(`Detected ${type} for question: "${question.question.substring(0, 50)}..."`);
      }
    }

    console.log('Calculated progress:', progress);

    // Update user's progress
    const updateResult = await User.findOneAndUpdate(
      { 
        $or: [
          { email },
          { userId: user.userId }
        ]
      },
      { 
        $set: { progress }
      },
      { new: true }
    );

    if (updateResult) {
      // Now check and award achievements based on the progress
      const newAchievements = await checkAndAwardAchievements(user.userId, progress);
      console.log('Awarded achievements:', newAchievements);
    }

    console.log('Update completed for user:', email);
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
  console.log('Starting achievement update for all users...');
  
  try {
    await connectToMongoDB();
    console.log('Connected to MongoDB successfully');

    // First, get all users
    const users = await User.find({});
    console.log(`Found ${users.length} users to process`);

    // Process each user
    for (const user of users) {
      console.log(`Processing user: ${user.email || user.userId}`);
      
      try {
        // Get user's questions to calculate progress
        const questions = await Question.find({ userId: user.userId });
        console.log(`Found ${questions.length} questions for user`);

        // Initialize progress with all possible fields
        const progress: Record<string, number> = {
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
          shooterSpecialist: 0,
          puzzlePro: 0,
          racingExpert: 0,
          stealthSpecialist: 0,
          horrorHero: 0,
          triviaMaster: 0,
          storySeeker: 0,
          beatEmUpBrawler: 0,
          rhythmMaster: 0,
          totalQuestions: questions.length,
          dailyExplorer: 0,
          speedrunner: 0,
          collectorPro: 0,
          dataDiver: 0,
          performanceTweaker: 0,
          conversationalist: 0
        };
        
        // Process each question to update progress using the enhanced checkQuestionType
        console.log('Processing questions for achievement tracking...');
        for (const q of questions) {
          const type = await checkQuestionType(q.question);
          if (type && type in progress) {
            progress[type]++;
            console.log(`Detected ${type} for question: "${q.question.substring(0, 50)}..."`);
          }
        }

        console.log(`Updated progress for user:`, progress);

        // Update user's progress
        const updateResult = await User.findOneAndUpdate(
          { userId: user.userId },
          { 
            $set: { progress }
          },
          { new: true }
        );

        // Check and award achievements
        if (updateResult) {
          const newAchievements = await checkAndAwardAchievements(user.userId, progress);
          if (newAchievements.length > 0) {
            console.log(`Awarded ${newAchievements.length} new achievements to user ${user.email || user.userId}`);
          }
        }

        console.log(`Completed processing for user: ${user.email || user.userId}`);
      } catch (userError) {
        console.error(`Error processing user ${user.email || user.userId}:`, userError);
        // Continue with next user even if one fails
        continue;
      }
    }

    console.log('Successfully completed achievement update for all users');
  } catch (error) {
    console.error('Error in updateAchievementsForAllUsers:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('Closed MongoDB connection');
  }
};

// Verify update function
const verifyUpdate = async (userId: string) => {
  await connectToMongoDB();
  try {
    const user = await User.findOne({ userId });
    console.log('User data:', {
      userId: user?.userId,
      hasAchievements: !!user?.achievements,
      hasProgress: !!user?.progress
    });
  } finally {
    await mongoose.connection.close();
  }
};

// Update achievements from history
const updateAchievementsFromHistory = async (userId: string) => {
  await connectToMongoDB();
  
  try {
    const questions = await Question.find({ userId });
    const progress: Record<string, number> = {};
    
    // Process questions sequentially due to async nature
    for (const q of questions) {
      const type = await checkQuestionType(q.question);
      if (type) {
        progress[type] = (progress[type] || 0) + 1;
      }
    }
    
    // Update user's progress
    const user = await User.findOneAndUpdate(
      { userId },
      { $set: { progress } },
      { new: true }
    );
    
    if (user) {
      await checkAndAwardAchievements(userId, user.progress, null);
    }
    
    console.log('Updated achievements from history for user:', userId);
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