/**
 * Utility function to store gameplay patterns in the User model
 * Maps pattern analysis results to the User model's personalized field structure
 */

import User from '../models/User';

/**
 * Map pattern analysis results to User model structure
 */
function mapPatternsToUserModel(patterns: {
  frequency: {
    totalQuestions: number;
    questionsPerWeek: number;
    peakActivityTimes: number[];
    sessionPattern: 'daily' | 'weekly' | 'sporadic';
  };
  difficulty: {
    progression: number[];
    currentLevel: 'beginner' | 'intermediate' | 'advanced';
    challengeSeeking: 'seeking_challenge' | 'maintaining' | 'easing_up';
  };
  genreAnalysis: {
    topGenres: Array<{ genre: string; count: number; percentage: number }>;
    genreDiversity: number;
    recentTrends: Array<{ genre: string; change: 'increasing' | 'decreasing' | 'stable'; trend: number }>;
  };
  behavior: {
    questionTypes: Array<{ category: string; count: number; percentage: number }>;
    learningSpeed: 'fast' | 'moderate' | 'slow';
    explorationDepth: number;
  };
}) {
  // Map to preferenceProfile
  const preferenceProfile = {
    // Top 3 genres by activity
    dominantGenres: patterns.genreAnalysis.topGenres
      .slice(0, 3)
      .map(g => g.genre),
    
    // Learning style based on behavior
    learningStyle: patterns.behavior.learningSpeed === 'fast' 
      ? 'tactical' 
      : patterns.behavior.explorationDepth > 0.5 
        ? 'exploratory' 
        : 'visual',
    
    // Difficulty preference based on challenge-seeking behavior
    difficultyPreference: patterns.difficulty.challengeSeeking === 'seeking_challenge'
      ? 'prefers_challenge'
      : patterns.difficulty.challengeSeeking === 'easing_up'
        ? 'casual'
        : 'balanced',
    
    // Playstyle tags based on question types and behavior
    playstyleTags: (() => {
      const tags: string[] = [];
      const topQuestionType = patterns.behavior.questionTypes[0];
      
      if (topQuestionType) {
        if (topQuestionType.category === 'achievement') tags.push('completionist');
        if (topQuestionType.category === 'strategy') tags.push('strategist');
        if (topQuestionType.category === 'boss_fight') tags.push('challenge_seeker');
        if (topQuestionType.category === 'level_walkthrough') tags.push('explorer');
      }
      
      if (patterns.behavior.learningSpeed === 'fast') tags.push('quick_learner');
      if (patterns.behavior.explorationDepth > 0.7) tags.push('explorer');
      if (patterns.difficulty.currentLevel === 'advanced') tags.push('expert');
      
      return tags;
    })(),
    
    // Recent interests (genres with increasing trends)
    recentInterests: patterns.genreAnalysis.recentTrends
      .filter(t => t.change === 'increasing')
      .slice(0, 5)
      .map(t => t.genre),
    
    // Seasonal trends (could be enhanced with actual date analysis)
    seasonalTrends: [] as string[], // Placeholder - could analyze by month
  };

  // Map to gameplayPatterns
  const gameplayPatterns = {
    avgQuestionsPerSession: patterns.frequency.questionsPerWeek / 7, // Approximate
    sessionFrequency: patterns.frequency.sessionPattern,
    difficultyProgression: patterns.difficulty.progression,
    genreDiversity: patterns.genreAnalysis.genreDiversity,
    engagementDepth: patterns.behavior.explorationDepth, // Using exploration depth as engagement metric
  };

  return {
    preferenceProfile,
    gameplayPatterns,
  };
}

/**
 * Store gameplay patterns in the User model
 * Updates the user's personalized data with the latest pattern analysis
 */
export const storeUserPatterns = async (
  username: string,
  patterns: Parameters<typeof mapPatternsToUserModel>[0]
): Promise<void> => {
  try {
    const user = await User.findOne({ username });
    
    if (!user) {
      console.error(`[Store Patterns] User not found: ${username}`);
      return;
    }

    // Map patterns to User model structure
    const personalizedData = mapPatternsToUserModel(patterns);

    // Update user's personalized data
    // Use $set to update nested fields without overwriting the entire object
    await User.findOneAndUpdate(
      { username },
      {
        $set: {
          'progress.personalized.preferenceProfile': personalizedData.preferenceProfile,
          'progress.personalized.gameplayPatterns': personalizedData.gameplayPatterns,
          'progress.personalized.recommendationHistory.lastAnalysisTime': new Date(),
        },
      },
      { new: true }
    );

    // console.log(`[Store Patterns] Successfully stored patterns for user: ${username}`);
  } catch (error) {
    console.error(`[Store Patterns] Error storing patterns for user ${username}:`, error);
    // Don't throw - this is a background operation
  }
};

