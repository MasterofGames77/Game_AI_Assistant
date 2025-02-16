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

    // Force update with $set instead of $setOnInsert
    const update = {
      $set: {
        achievements: [],
        progress: {
          firstQuestion: 0,
          frequentAsker: 0,
          rpgEnthusiast: 0,
          bossBuster: 0,
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
          totalQuestions: user.conversationCount || 0,
          dailyExplorer: 0,
          speedrunner: 0,
          collectorPro: 0,
          dataDiver: 0,
          performanceTweaker: 0,
          conversationalist: 0
        }
      }
    };

    // Update using both email and userId to ensure we get the right user
    const result = await User.findOneAndUpdate(
      { 
        $or: [
          { email },
          { userId: user.userId }
        ]
      },
      update,
      { new: true }
    );
    
    console.log(`Updated user:`, result);
  } catch (error) {
    console.error('Error updating user:', error);
  } finally {
    await mongoose.connection.close();
  }
};

// Update all users with new achievements progress
const updateAchievementsForAllUsers = async () => {
  await connectToMongoDB();

  const update = {
    $set: {
      achievements: [],
      progress: {
        firstQuestion: 0,
        frequentAsker: 0,
        rpgEnthusiast: 0,
        bossBuster: 0,
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
        totalQuestions: 0,
        dailyExplorer: 0,
        speedrunner: 0,
        collectorPro: 0,
        dataDiver: 0,
        performanceTweaker: 0,
        conversationalist: 0
      }
    }
  };

  try {
    // Update all users by adding the progress field to each document
    const result = await User.updateMany({}, update);
    console.log(`Updated ${result.modifiedCount} users with new achievements progress.`);
  } catch (error) {
    console.error('Error updating users:', error);
  } finally {
    await mongoose.connection.close();
  }
};

export const verifyUpdate = async (userId: string) => {
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
export const updateAchievementsFromHistory = async (userId: string) => {
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

// Export both functions
export { updateAchievementsForUser, updateAchievementsForAllUsers };