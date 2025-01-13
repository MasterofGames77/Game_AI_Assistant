import connectToMongoDB from './mongodb';
import User from '../models/User';
import mongoose from 'mongoose';

const updateAchievementsForUser = async (email: string) => {
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
    // Force update the user's achievements and progress
    const result = await User.updateOne(
      { email },
      update,
      { upsert: false } // Don't create if doesn't exist
    );
    console.log(`Updated user with email ${email}:`, result.modifiedCount ? 'Success' : 'No update needed');
  } catch (error) {
    console.error('Error updating user:', error);
  } finally {
    await mongoose.connection.close();
  }
};

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

// Export both functions
export { updateAchievementsForUser, updateAchievementsForAllUsers };

// Run the update for your specific email
updateAchievementsForUser("mgambardella16@gmail.com");