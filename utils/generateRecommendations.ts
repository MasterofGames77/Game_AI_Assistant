/**
 * Generate personalized recommendations based on stored user patterns
 * Uses the patterns stored in the User model to provide tailored suggestions
 * 
 * Phase 3 Step 1: Main Recommendation Engine
 */

import User from '../models/User';
import { fetchRecommendations, analyzeGameplayPatterns, extractQuestionMetadata } from './aiHelper';

/**
 * Map internal genre names (from checkQuestionType) to RAWG API genre slugs
 * RAWG API uses specific genre slugs like "racing", "action", "rpg", etc.
 */
function mapGenreToRAWGSlug(internalGenre: string): string | null {
  const genreMapping: { [key: string]: string } = {
    // Direct mappings to RAWG API genre slugs
    // Note: RAWG API uses slugs like "racing", "action", "rpg", etc.
    'racingRenegade': 'racing',
    'rpgEnthusiast': 'rpg', // RAWG uses "rpg" not "role-playing-games-rpg"
    'actionAficionado': 'action',
    'shooterSpecialist': 'shooter',
    'strategySpecialist': 'strategy',
    'adventureAddict': 'adventure',
    'puzzlePro': 'puzzle',
    'simulationSpecialist': 'simulation',
    'sportsChampion': 'sports',
    'fightingFanatic': 'fighting',
    'platformerPro': 'platformer',
    'survivalSpecialist': 'survival',
    'horrorHero': 'horror',
    'stealthExpert': 'stealth',
    'battleRoyale': 'battle-royale',
    'storySeeker': 'adventure', // Visual novels often categorized as adventure
    'beatEmUpBrawler': 'action', // Beat 'em ups are action games
    'rhythmMaster': 'indie', // Rhythm games - use indie as fallback (RAWG may not have "music" genre)
    'sandboxBuilder': 'indie', // Sandbox games often indie
    'bossBuster': 'action', // Boss fights are typically in action games
    'collectorPro': 'adventure', // Collection is common in adventure games
    'dataDiver': 'strategy', // Data analysis often in strategy games
    'performanceTweaker': 'indie', // Technical questions - use indie as fallback
    'speedrunner': 'action', // Speedrunning spans many genres, default to action
  };

  return genreMapping[internalGenre] || null;
}

/**
 * Generate personalized game recommendations based on user patterns
 */
export const generatePersonalizedGameRecommendations = async (
  username: string
): Promise<{
  games: string[];
  reason: string;
  basedOn: string[];
}> => {
  try {
    const user = await User.findOne({ username }).lean() as any;
    
    if (!user || !user?.progress?.personalized?.preferenceProfile) {
      // Fallback to basic recommendations if no personalized data
      return {
        games: [],
        reason: 'Not enough data for personalized recommendations yet',
        basedOn: [],
      };
    }

    const preferences = user.progress.personalized.preferenceProfile;
    const patterns = user.progress.personalized.gameplayPatterns;

    // Get dominant genres
    const dominantGenres = preferences.dominantGenres || [];
    const recentInterests = preferences.recentInterests || [];

    // Prioritize recent interests over dominant genres
    const genresToSearch = recentInterests.length > 0 
      ? [...recentInterests, ...dominantGenres].slice(0, 3)
      : dominantGenres.slice(0, 3);

    if (genresToSearch.length === 0) {
      return {
        games: [],
        reason: 'No genre preferences detected yet',
        basedOn: [],
      };
    }

    // Fetch recommendations for top genres
    // Map internal genre names to RAWG API slugs
    const allRecommendations: string[] = [];
    const basedOn: string[] = [];

    for (const internalGenre of genresToSearch) {
      try {
        // Map internal genre to RAWG API slug
        const rawgGenreSlug = mapGenreToRAWGSlug(internalGenre);
        
        if (!rawgGenreSlug) {
          // Skip if no mapping found
          console.log(`[Recommendations] No RAWG mapping for genre: ${internalGenre}`);
          continue;
        }

        const games = await fetchRecommendations(rawgGenreSlug);
        if (games.length > 0) {
          allRecommendations.push(...games.slice(0, 5)); // Get top 5 per genre
          basedOn.push(internalGenre); // Keep original genre name for display
        }
      } catch (error) {
        console.error(`[Recommendations] Error fetching games for genre ${internalGenre}:`, error);
      }
    }

    // Remove duplicates and limit to 10 recommendations
    const uniqueGames = Array.from(new Set(allRecommendations)).slice(0, 10);

    // Generate reason based on user's preferences
    let reason = 'Based on your ';
    if (recentInterests.length > 0) {
      reason += `recent interest in ${recentInterests[0]}`;
    } else if (dominantGenres.length > 0) {
      reason += `preference for ${dominantGenres[0]}`;
    }
    if (patterns?.difficultyPreference === 'prefers_challenge') {
      reason += ' and your preference for challenging games';
    }

    return {
      games: uniqueGames,
      reason,
      basedOn,
    };
  } catch (error) {
    console.error('[Recommendations] Error generating personalized recommendations:', error);
    return {
      games: [],
      reason: 'Error generating recommendations',
      basedOn: [],
    };
  }
};

/**
 * Generate personalized tips based on user's playstyle
 */
export const generatePersonalizedTips = async (
  username: string,
  currentQuestion?: string
): Promise<{
  tips: string[];
  basedOn: string;
}> => {
  try {
    const user = await User.findOne({ username }).lean() as any;
    
    if (!user || !user?.progress?.personalized) {
      return {
        tips: [],
        basedOn: 'No personalized data available',
      };
    }

    const preferences = user.progress.personalized.preferenceProfile;
    const patterns = user.progress.personalized.gameplayPatterns;
    const tips: string[] = [];

    // Tips based on learning style
    if (preferences?.learningStyle === 'tactical') {
      tips.push('💡 Try focusing on strategy guides and build optimization for deeper understanding');
    } else if (preferences?.learningStyle === 'exploratory') {
      tips.push('🗺️ Explore different game genres to expand your gaming horizons');
    }

    // Tips based on difficulty preference
    if (preferences?.difficultyPreference === 'prefers_challenge') {
      tips.push('🎯 Consider trying speedrun challenges or achievement hunting for extra difficulty');
    } else if (preferences?.difficultyPreference === 'casual') {
      tips.push('🎮 Focus on story-driven games and exploration for a more relaxed experience');
    }

    // Tips based on playstyle tags
    if (preferences?.playstyleTags?.includes('completionist')) {
      tips.push('🏆 Check out achievement guides and 100% completion walkthroughs');
    }
    if (preferences?.playstyleTags?.includes('strategist')) {
      tips.push('⚔️ Look for meta builds and optimal strategies for your favorite games');
    }
    if (preferences?.playstyleTags?.includes('explorer')) {
      tips.push('🗺️ Try open-world games with rich exploration mechanics');
    }

    // Tips based on session frequency
    if (patterns?.sessionFrequency === 'daily') {
      tips.push('📅 You\'re very active! Consider setting gaming goals to track your progress');
    } else if (patterns?.sessionFrequency === 'sporadic') {
      tips.push('⏰ Try shorter gaming sessions with focused objectives');
    }

    // Tips based on genre diversity
    if (patterns?.genreDiversity && patterns.genreDiversity < 0.3) {
      tips.push('🎲 Consider exploring different game genres to diversify your experience');
    }

    return {
      tips: tips.slice(0, 5), // Limit to 5 tips
      basedOn: `Your ${preferences?.learningStyle || 'gaming'} style and ${preferences?.difficultyPreference || 'preferences'}`,
    };
  } catch (error) {
    console.error('[Recommendations] Error generating personalized tips:', error);
    return {
      tips: [],
      basedOn: 'Error generating tips',
    };
  }
};

// ============================================================================
// Phase 3 Step 1: Main Recommendation Engine - Helper Functions
// ============================================================================

/**
 * Extract context from current question for recommendation personalization
 * Returns simplified context object with key information
 */
async function extractQuestionContext(question: string): Promise<{
  detectedGame?: string;
  detectedGenre?: string[];
  questionCategory?: string;
  difficultyHint?: string;
  interactionType?: string;
}> {
  try {
    // Use existing extractQuestionMetadata function
    const metadata = await extractQuestionMetadata(question);
    return {
      detectedGame: metadata.detectedGame,
      detectedGenre: metadata.detectedGenre,
      questionCategory: metadata.questionCategory,
      difficultyHint: metadata.difficultyHint,
      interactionType: metadata.interactionType,
    };
  } catch (error) {
    console.error('[Recommendations] Error extracting question context:', error);
    return {};
  }
}

/**
 * Generate game recommendations based on patterns and preferences
 * Wrapper around generatePersonalizedGameRecommendations that accepts patterns
 */
async function generateGameRecommendations(
  patterns: Awaited<ReturnType<typeof analyzeGameplayPatterns>>,
  preferences: any
): Promise<{
  games: string[];
  reason: string;
  basedOn: string[];
}> {
  try {
    // If we have preferences from User model, use existing function
    // Otherwise, generate recommendations from patterns directly
    if (preferences && preferences.dominantGenres && preferences.dominantGenres.length > 0) {
      // Use stored preferences (this would require username, so we'll handle differently)
      // For now, we'll generate from patterns
    }

    // Generate recommendations from patterns
    const topGenres = patterns.genreAnalysis.topGenres.slice(0, 3);
    const allRecommendations: string[] = [];
    const basedOn: string[] = [];

    for (const genreData of topGenres) {
      try {
        const rawgGenreSlug = mapGenreToRAWGSlug(genreData.genre);
        if (!rawgGenreSlug) {
          continue;
        }

        const games = await fetchRecommendations(rawgGenreSlug);
        if (games.length > 0) {
          allRecommendations.push(...games.slice(0, 5));
          basedOn.push(genreData.genre);
        }
      } catch (error) {
        console.error(`[Recommendations] Error fetching games for genre ${genreData.genre}:`, error);
      }
    }

    const uniqueGames = Array.from(new Set(allRecommendations)).slice(0, 10);

    let reason = 'Based on your ';
    if (topGenres.length > 0) {
      reason += `preference for ${topGenres[0].genre}`;
    }
    if (patterns.difficulty.challengeSeeking === 'seeking_challenge') {
      reason += ' and your preference for challenging games';
    }

    return {
      games: uniqueGames,
      reason,
      basedOn,
    };
  } catch (error) {
    console.error('[Recommendations] Error generating game recommendations:', error);
    return {
      games: [],
      reason: 'Error generating recommendations',
      basedOn: [],
    };
  }
}

/**
 * Generate strategy tips based on user patterns and current question context
 */
function generateStrategyTips(
  patterns: Awaited<ReturnType<typeof analyzeGameplayPatterns>>,
  context: Awaited<ReturnType<typeof extractQuestionContext>>
): {
  tips: string[];
  category: string;
} {
  const tips: string[] = [];
  const category = context.questionCategory || 'general_gameplay';

  // Tips based on question category
  if (category === 'boss_fight') {
    tips.push('💪 Study boss attack patterns and identify safe windows for counterattacks');
    tips.push('🛡️ Consider defensive builds or equipment that resist the boss\'s damage type');
  } else if (category === 'strategy') {
    tips.push('📊 Analyze your current build and identify optimization opportunities');
    tips.push('⚔️ Experiment with different loadouts to find what works best for your playstyle');
  } else if (category === 'level_walkthrough') {
    tips.push('🗺️ Take time to explore - hidden areas often contain valuable resources');
    tips.push('💡 Look for environmental clues and visual indicators for secrets');
  } else if (category === 'item_lookup') {
    tips.push('🔍 Check multiple sources - item locations can vary by game version');
    tips.push('📦 Consider item synergies when building your inventory');
  } else if (category === 'achievement') {
    tips.push('🏆 Plan your achievement route to minimize backtracking');
    tips.push('⏱️ Some achievements may require multiple playthroughs - plan accordingly');
  }

  // Tips based on difficulty level
  if (context.difficultyHint === 'beginner') {
    tips.push('📚 Start with basic strategies and gradually increase complexity');
    tips.push('🎯 Focus on fundamentals before attempting advanced techniques');
  } else if (context.difficultyHint === 'advanced') {
    tips.push('⚡ Look for speedrun techniques and optimization strategies');
    tips.push('🎖️ Consider challenge runs or self-imposed restrictions for extra difficulty');
  }

  // Tips based on user's challenge-seeking behavior
  if (patterns.difficulty.challengeSeeking === 'seeking_challenge') {
    tips.push('🔥 Try harder difficulty modes or challenge runs for increased difficulty');
  } else if (patterns.difficulty.challengeSeeking === 'easing_up') {
    tips.push('😌 Consider lowering difficulty or using accessibility options if available');
  }

  // Tips based on learning speed
  if (patterns.behavior.learningSpeed === 'fast') {
    tips.push('🚀 You learn quickly! Try experimenting with advanced strategies');
  } else if (patterns.behavior.learningSpeed === 'slow') {
    tips.push('📖 Take your time - practice and repetition will improve your skills');
  }

  return {
    tips: tips.slice(0, 5), // Limit to 5 tips
    category,
  };
}

/**
 * Generate learning path recommendations based on user patterns
 */
function generateLearningPath(
  patterns: Awaited<ReturnType<typeof analyzeGameplayPatterns>>
): {
  suggestions: string[];
  nextSteps: string[];
} {
  const suggestions: string[] = [];
  const nextSteps: string[] = [];

  // Learning path based on current difficulty level
  const currentLevel = patterns.difficulty.currentLevel;
  
  if (currentLevel === 'beginner') {
    suggestions.push('📚 Focus on understanding core game mechanics');
    suggestions.push('🎯 Practice basic skills before moving to advanced techniques');
    nextSteps.push('Try intermediate-level challenges once comfortable with basics');
    nextSteps.push('Explore different game genres to broaden your experience');
  } else if (currentLevel === 'intermediate') {
    suggestions.push('⚔️ Experiment with different playstyles and strategies');
    suggestions.push('🏆 Challenge yourself with harder content or achievement hunting');
    nextSteps.push('Consider advanced strategies and optimization techniques');
    nextSteps.push('Try speedrunning or challenge runs for extra difficulty');
  } else if (currentLevel === 'advanced') {
    suggestions.push('🔥 Master advanced techniques and optimization strategies');
    suggestions.push('🎖️ Share your knowledge by helping other players');
    nextSteps.push('Consider competitive play or leaderboard challenges');
    nextSteps.push('Explore modding or game creation for deeper engagement');
  }

  // Learning path based on challenge-seeking behavior
  if (patterns.difficulty.challengeSeeking === 'seeking_challenge') {
    suggestions.push('💪 Look for harder games or difficulty modes');
    nextSteps.push('Try games known for their difficulty (Souls-like, roguelikes)');
  } else if (patterns.difficulty.challengeSeeking === 'easing_up') {
    suggestions.push('😌 Focus on story-driven or exploration-focused games');
    nextSteps.push('Consider games with accessibility options or difficulty settings');
  }

  // Learning path based on genre diversity
  if (patterns.genreAnalysis.genreDiversity < 0.3) {
    suggestions.push('🎲 Explore different game genres to diversify your experience');
    nextSteps.push('Try genres you haven\'t explored yet based on your preferences');
  } else if (patterns.genreAnalysis.genreDiversity > 0.7) {
    suggestions.push('🌟 You have diverse interests! Consider specializing in a favorite genre');
    nextSteps.push('Deep dive into your most enjoyed genre for mastery');
  }

  // Learning path based on question types
  const topQuestionType = patterns.behavior.questionTypes[0];
  if (topQuestionType) {
    if (topQuestionType.category === 'achievement') {
      suggestions.push('🏆 Focus on completion strategies and achievement guides');
      nextSteps.push('Plan achievement routes for maximum efficiency');
    } else if (topQuestionType.category === 'strategy') {
      suggestions.push('⚔️ Deep dive into build optimization and meta strategies');
      nextSteps.push('Study advanced tactics and team compositions');
    } else if (topQuestionType.category === 'boss_fight') {
      suggestions.push('💪 Master boss fight mechanics and patterns');
      nextSteps.push('Practice challenging boss encounters');
    }
  }

  return {
    suggestions: suggestions.slice(0, 5),
    nextSteps: nextSteps.slice(0, 3),
  };
}

// ============================================================================
// Phase 3 Step 1: Main Recommendation Engine - Orchestrator Function
// ============================================================================

/**
 * Main function to generate personalized recommendations
 * Phase 3 Step 1: Creates comprehensive recommendations based on user patterns
 * 
 * @param username - User's username
 * @param currentQuestion - Current question being asked (optional, for context)
 * @returns Comprehensive recommendation object with games, tips, strategies, and learning paths
 */
export const generatePersonalizedRecommendations = async (
  username: string,
  currentQuestion?: string
): Promise<{
  gameRecommendations: {
    games: string[];
    reason: string;
    basedOn: string[];
  };
  strategyTips: {
    tips: string[];
    category: string;
  };
  learningPath: {
    suggestions: string[];
    nextSteps: string[];
  };
  personalizedTips: {
    tips: string[];
    basedOn: string;
  };
}> => {
  try {
    // 1. Get user patterns (fresh analysis)
    const patterns = await analyzeGameplayPatterns(username);

    // 2. Get user preferences from stored data
    const user = await User.findOne({ username }).lean() as any;
    const preferences = user?.progress?.personalized?.preferenceProfile;

    // 3. Analyze current question for context (if provided)
    const context = currentQuestion 
      ? await extractQuestionContext(currentQuestion)
      : {};

    // 4. Generate all recommendation types
    const gameRecommendations = await generateGameRecommendations(patterns, preferences);
    const strategyTips = generateStrategyTips(patterns, context);
    const learningPath = generateLearningPath(patterns);
    const personalizedTips = await generatePersonalizedTips(username, currentQuestion);

    return {
      gameRecommendations,
      strategyTips,
      learningPath,
      personalizedTips,
    };
  } catch (error) {
    console.error('[Recommendations] Error generating personalized recommendations:', error);
    
    // Return safe defaults on error
    return {
      gameRecommendations: {
        games: [],
        reason: 'Error generating recommendations',
        basedOn: [],
      },
      strategyTips: {
        tips: [],
        category: 'general_gameplay',
      },
      learningPath: {
        suggestions: [],
        nextSteps: [],
      },
      personalizedTips: {
        tips: [],
        basedOn: 'Error generating tips',
      },
    };
  }
};

