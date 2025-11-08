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
 * Generate quick tips based on current question
 * Phase 3 Step 2: Enhanced Personalized Tips - Quick Tips
 */
async function generateQuickTips(
  currentQuestion?: string,
  context?: Awaited<ReturnType<typeof extractQuestionContext>>
): Promise<string[]> {
  const tips: string[] = [];
  
  if (!currentQuestion) {
    return tips;
  }

  const questionLower = currentQuestion.toLowerCase();
  const category = context?.questionCategory;
  const difficulty = context?.difficultyHint;

  // Quick tips based on question category - natural, conversational language
  if (category === 'boss_fight') {
    tips.push('💡 Quick tip: Most bosses follow predictable attack patterns. Watch for 2-3 distinct moves and learn their timing.');
    tips.push('⚡ Pro tip: Save your strongest attacks for when the boss is vulnerable or stunned for maximum damage.');
  } else if (category === 'strategy') {
    tips.push('💡 Quick tip: Test new builds in safe areas first before taking on challenging content.');
    tips.push('⚡ Pro tip: Keep an eye on patch notes - meta builds can change significantly with game updates.');
  } else if (category === 'level_walkthrough') {
    tips.push('💡 Quick tip: Check your map regularly. Many secrets are marked but easy to overlook.');
    tips.push('⚡ Pro tip: Don\'t skip NPCs - they often drop hints about hidden locations and collectibles.');
  } else if (category === 'item_lookup') {
    tips.push('💡 Quick tip: Item locations can vary between game versions, so check multiple sources if something doesn\'t match.');
    tips.push('⚡ Pro tip: Some items are missable. Save before important story moments to avoid missing out.');
  } else if (category === 'achievement') {
    tips.push('💡 Quick tip: Plan your achievement route ahead of time to minimize backtracking.');
    tips.push('⚡ Pro tip: Some achievements require multiple playthroughs, so plan your approach accordingly.');
  }

  // Quick tips based on difficulty - natural language
  if (difficulty === 'beginner') {
    tips.push('📚 Quick tip: Don\'t rush through the game. Take your time to understand the core mechanics - it\'ll pay off later.');
  } else if (difficulty === 'advanced') {
    tips.push('⚡ Quick tip: Study speedrun techniques and route optimizations for ideas on how to improve your gameplay.');
  }

  // Quick tips based on question keywords - conversational
  if (questionLower.includes('how to') || questionLower.includes('best way')) {
    tips.push('💡 Quick tip: There\'s usually multiple ways to approach challenges. Don\'t be afraid to experiment and find what works for you!');
  }
  if (questionLower.includes('stuck') || questionLower.includes('can\'t')) {
    tips.push('💡 Quick tip: If you\'re stuck, take a short break and come back with fresh eyes. Sometimes a new perspective is all you need.');
  }

  return tips;
}

/**
 * Generate insights about playing style
 * Phase 3 Step 2: Enhanced Personalized Tips - Playstyle Insights
 */
function generatePlaystyleInsights(
  patterns: Awaited<ReturnType<typeof analyzeGameplayPatterns>>,
  preferences?: any
): string[] {
  const insights: string[] = [];
  const playstyleTags = preferences?.playstyleTags || [];
  const explorationDepth = patterns.behavior.explorationDepth;
  const learningSpeed = patterns.behavior.learningSpeed;
  const topQuestionType = patterns.behavior.questionTypes[0];

  // Insights about exploration style - natural language
  if (explorationDepth > 0.7) {
    insights.push('🌟 Insight: You\'re clearly an explorer! You enjoy discovering secrets and hidden areas, which shows a thorough approach to gaming.');
  } else if (explorationDepth < 0.3) {
    insights.push('🎯 Insight: You prefer focused, goal-oriented gameplay. Consider trying more exploration for variety - you might discover new favorite aspects of games.');
  }

  // Insights about learning style - conversational
  if (learningSpeed === 'fast') {
    insights.push('🚀 Insight: You learn quickly and adapt well to new challenges. You\'re ready to tackle advanced techniques and push your skills further.');
  } else if (learningSpeed === 'slow') {
    insights.push('📖 Insight: You prefer taking your time to fully understand game mechanics. This methodical approach often leads to deeper understanding and mastery.');
  }

  // Insights about playstyle tags - complete thoughts
  if (playstyleTags.includes('completionist')) {
    insights.push('🏆 Insight: You\'re a completionist at heart. You enjoy thorough exploration and achievement hunting, which shows your dedication to fully experiencing every game you play.');
  }
  if (playstyleTags.includes('strategist')) {
    insights.push('⚔️ Insight: You\'re a natural strategist. You enjoy optimizing builds and analyzing game mechanics, which means you likely spend time theorycrafting and planning your approach before diving in.');
  }
  if (playstyleTags.includes('explorer')) {
    insights.push('🗺️ Insight: You\'re an explorer by nature. You enjoy discovering new areas and secrets, which suggests you take your time to fully appreciate the worlds developers create.');
  }

  // Insights about question patterns - complete thoughts
  if (topQuestionType?.category === 'boss_fight') {
    insights.push('💪 Insight: You focus on challenging content and enjoy overcoming difficult obstacles. This shows you\'re not afraid to push your limits and learn from tough encounters.');
  } else if (topQuestionType?.category === 'strategy') {
    insights.push('📊 Insight: You focus on optimization and enjoy perfecting your approach. This suggests you value efficiency and are always looking for ways to improve your gameplay.');
  } else if (topQuestionType?.category === 'achievement') {
    insights.push('🏅 Insight: You focus on completion and enjoy achieving 100% completion. This shows you have a methodical approach and appreciate the satisfaction of finishing everything a game has to offer.');
  }

  // Insights about genre diversity - complete thoughts
  const genreDiversity = patterns.genreAnalysis.genreDiversity;
  if (genreDiversity > 0.7) {
    insights.push('🎲 Insight: You have diverse gaming interests and enjoy exploring different genres. This versatility means you\'re open to new experiences and can adapt to various gameplay styles.');
  } else if (genreDiversity < 0.3) {
    insights.push('🎯 Insight: You prefer focusing on specific genres, which shows you know what you like. Consider branching out occasionally - you might discover new favorite aspects of gaming you didn\'t know existed.');
  }

  return insights;
}

/**
 * Generate optimization suggestions
 * Phase 3 Step 2: Enhanced Personalized Tips - Optimization Suggestions
 */
function generateOptimizationSuggestions(
  patterns: Awaited<ReturnType<typeof analyzeGameplayPatterns>>,
  preferences?: any
): string[] {
  const suggestions: string[] = [];
  const currentLevel = patterns.difficulty.currentLevel;
  const topGenre = patterns.genreAnalysis.topGenres[0]?.genre || '';
  const playstyleTags = preferences?.playstyleTags || [];
  const topQuestionType = patterns.behavior.questionTypes[0];

  // Optimization suggestions based on difficulty level - natural language
  if (currentLevel === 'intermediate') {
    suggestions.push('⚡ Optimization: Study meta builds and optimal strategies for your favorite games to take your gameplay to the next level.');
    suggestions.push('📊 Optimization: Take time to analyze your playstyle and identify specific areas where you can improve.');
  } else if (currentLevel === 'advanced') {
    suggestions.push('🔥 Optimization: Focus on mastering frame-perfect techniques and route optimization to maximize your efficiency.');
    suggestions.push('⚡ Optimization: Study speedrun strategies and techniques - even if you\'re not speedrunning, these can significantly improve your gameplay.');
  }

  // Optimization suggestions based on genre
  if (topGenre.includes('rpg') || topGenre.includes('RPG')) {
    suggestions.push('⚔️ Optimization: Focus on stat allocation and gear synergies for optimal builds');
  } else if (topGenre.includes('shooter') || topGenre.includes('action')) {
    suggestions.push('🎯 Optimization: Master weapon recoil patterns and optimal loadouts');
  } else if (topGenre.includes('strategy') || topGenre.includes('Strategy')) {
    suggestions.push('📊 Optimization: Learn optimal build orders and resource management');
  }

  // Optimization suggestions based on playstyle
  if (playstyleTags.includes('strategist')) {
    suggestions.push('📈 Optimization: Deep dive into theorycrafting and build optimization');
  }
  if (playstyleTags.includes('completionist')) {
    suggestions.push('🏆 Optimization: Plan efficient routes for achievement hunting and completion');
  }

  // Optimization suggestions based on question patterns
  if (topQuestionType?.category === 'strategy') {
    suggestions.push('⚔️ Optimization: Experiment with different builds to find optimal combinations');
  }
  if (topQuestionType?.category === 'boss_fight') {
    suggestions.push('💪 Optimization: Study boss patterns and optimize your approach for each phase');
  }

  return suggestions;
}

/**
 * Generate common mistakes to avoid
 * Phase 3 Step 2: Enhanced Personalized Tips - Common Mistakes
 */
function generateCommonMistakes(
  patterns: Awaited<ReturnType<typeof analyzeGameplayPatterns>>,
  preferences?: any,
  context?: Awaited<ReturnType<typeof extractQuestionContext>>
): string[] {
  const mistakes: string[] = [];
  const currentLevel = patterns.difficulty.currentLevel;
  const topQuestionType = patterns.behavior.questionTypes[0];
  const category = context?.questionCategory;
  const playstyleTags = preferences?.playstyleTags || [];

  // Common mistakes based on difficulty level
  if (currentLevel === 'beginner') {
    mistakes.push('⚠️ Avoid: Rushing through tutorials - take time to understand mechanics');
    mistakes.push('⚠️ Avoid: Ignoring game tips and hints - they\'re there to help you');
    mistakes.push('⚠️ Avoid: Skipping difficulty settings - start at appropriate level');
  } else if (currentLevel === 'intermediate') {
    mistakes.push('⚠️ Avoid: Sticking to one strategy - experiment with different approaches');
    mistakes.push('⚠️ Avoid: Ignoring meta changes - game balance updates affect optimal strategies');
  } else if (currentLevel === 'advanced') {
    mistakes.push('⚠️ Avoid: Over-optimizing too early - sometimes fun > efficiency');
    mistakes.push('⚠️ Avoid: Ignoring fundamentals - advanced techniques build on basics');
  }

  // Common mistakes based on question category
  if (category === 'boss_fight' || topQuestionType?.category === 'boss_fight') {
    mistakes.push('⚠️ Avoid: Being too aggressive - learn patterns before going all-out');
    mistakes.push('⚠️ Avoid: Not adapting to phase changes - bosses often have multiple phases');
  }
  if (category === 'strategy' || topQuestionType?.category === 'strategy') {
    mistakes.push('⚠️ Avoid: Copying builds blindly - understand why they work');
    mistakes.push('⚠️ Avoid: Ignoring your playstyle - optimal builds should match how you play');
  }
  if (category === 'achievement' || topQuestionType?.category === 'achievement') {
    mistakes.push('⚠️ Avoid: Missing missable achievements - check guides before starting');
    mistakes.push('⚠️ Avoid: Not planning routes - backtracking wastes time');
  }

  // Common mistakes based on playstyle
  if (playstyleTags.includes('completionist')) {
    mistakes.push('⚠️ Avoid: Burning out on completion - take breaks between long sessions');
  }
  if (playstyleTags.includes('strategist')) {
    mistakes.push('⚠️ Avoid: Over-analyzing - sometimes action > theory');
  }

  // Common mistakes based on learning speed
  if (patterns.behavior.learningSpeed === 'fast') {
    mistakes.push('⚠️ Avoid: Skipping fundamentals - even fast learners need solid basics');
  } else if (patterns.behavior.learningSpeed === 'slow') {
    mistakes.push('⚠️ Avoid: Comparing yourself to others - everyone learns at their own pace');
  }

  return mistakes;
}

/**
 * Generate personalized tips based on user's playstyle
 * Phase 3 Step 2: Enhanced Personalized Tips
 * Includes: quick tips, playstyle insights, optimization suggestions, common mistakes
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
      // Even without stored data, we can provide quick tips from current question
      if (currentQuestion) {
        const context = await extractQuestionContext(currentQuestion);
        const quickTips = await generateQuickTips(currentQuestion, context);
        if (quickTips.length > 0) {
          return {
            tips: quickTips.slice(0, 3),
            basedOn: 'Your current question',
          };
        }
      }
      
      return {
        tips: [],
        basedOn: 'No personalized data available',
      };
    }

    const preferences = user.progress.personalized.preferenceProfile;
    const patterns = user.progress.personalized.gameplayPatterns;
    const tips: string[] = [];

    // Get fresh patterns for more accurate insights
    const freshPatterns = await analyzeGameplayPatterns(username);
    const context = currentQuestion ? await extractQuestionContext(currentQuestion) : undefined;

    // 1. Quick tips based on current question
    const quickTips = await generateQuickTips(currentQuestion, context);
    tips.push(...quickTips);

    // 2. Insights about their playing style
    const playstyleInsights = generatePlaystyleInsights(freshPatterns, preferences);
    tips.push(...playstyleInsights);

    // 3. Optimization suggestions
    const optimizationSuggestions = generateOptimizationSuggestions(freshPatterns, preferences);
    tips.push(...optimizationSuggestions);

    // 4. Common mistakes to avoid
    const commonMistakes = generateCommonMistakes(freshPatterns, preferences, context);
    tips.push(...commonMistakes);

    // Fallback: Basic tips if no specific tips generated
    if (tips.length === 0) {
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

      // Tips based on session frequency
      if (patterns?.sessionFrequency === 'daily') {
        tips.push('📅 You\'re very active! Consider setting gaming goals to track your progress');
      } else if (patterns?.sessionFrequency === 'sporadic') {
        tips.push('⏰ Try shorter gaming sessions with focused objectives');
      }
    }

    // Remove duplicates and limit to 8 tips (increased for comprehensive suggestions)
    const uniqueTips = Array.from(new Set(tips));

    // Generate basedOn description - more natural wording
    const basedOnParts: string[] = [];
    
    // Build natural description
    if (preferences?.learningStyle && preferences?.difficultyPreference) {
      // Format: "Your [learningStyle] style and [difficultyPreference] preferences"
      const styleLabel = preferences.learningStyle === 'tactical' ? 'tactical' : 
                        preferences.learningStyle === 'exploratory' ? 'exploratory' : 
                        'gaming';
      const difficultyLabel = preferences.difficultyPreference === 'prefers_challenge' ? 'challenge-seeking' :
                             preferences.difficultyPreference === 'casual' ? 'casual' :
                             preferences.difficultyPreference === 'balanced' ? 'balanced' : '';
      
      if (currentQuestion) {
        basedOnParts.push(`Your ${styleLabel} style, ${difficultyLabel} preferences, and current question`);
      } else {
        basedOnParts.push(`Your ${styleLabel} style and ${difficultyLabel} preferences`);
      }
    } else if (preferences?.learningStyle) {
      const styleLabel = preferences.learningStyle === 'tactical' ? 'tactical' : 
                        preferences.learningStyle === 'exploratory' ? 'exploratory' : 
                        'gaming';
      if (currentQuestion) {
        basedOnParts.push(`Your ${styleLabel} style and current question`);
      } else {
        basedOnParts.push(`Your ${styleLabel} style`);
      }
    } else if (preferences?.difficultyPreference) {
      const difficultyLabel = preferences.difficultyPreference === 'prefers_challenge' ? 'challenge-seeking' :
                             preferences.difficultyPreference === 'casual' ? 'casual' :
                             preferences.difficultyPreference === 'balanced' ? 'balanced' : '';
      if (currentQuestion) {
        basedOnParts.push(`Your ${difficultyLabel} preferences and current question`);
      } else {
        basedOnParts.push(`Your ${difficultyLabel} preferences`);
      }
    } else if (currentQuestion) {
      basedOnParts.push('Your current question and gaming patterns');
    } else {
      basedOnParts.push('Your gaming style and preferences');
    }
    
    const basedOn = basedOnParts[0] || 'Your gaming preferences';

    return {
      tips: uniqueTips.slice(0, 8),
      basedOn,
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
 * Check if a game is released (not in the future)
 */
function isGameReleased(game: any): boolean {
  if (!game.released) {
    return false; // No release date = likely unreleased
  }
  
  try {
    const releaseDate = new Date(game.released);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of today
    
    // Game is released if release date is today or in the past
    return releaseDate <= today;
  } catch (error) {
    return false; // Invalid date = assume unreleased
  }
}

/**
 * Fetch similar games to a given game title using RAWG API
 * Uses game search and then finds similar games based on tags/genres
 * Filters out unreleased games
 */
async function fetchSimilarGames(gameTitle: string): Promise<string[]> {
  try {
    const axios = (await import('axios')).default;
    const searchUrl = `https://api.rawg.io/api/games?key=${process.env.RAWG_API_KEY}&search=${encodeURIComponent(gameTitle)}&page_size=1`;
    
    const searchResponse = await axios.get(searchUrl);
    if (!searchResponse.data?.results || searchResponse.data.results.length === 0) {
      return [];
    }

    const game = searchResponse.data.results[0];
    if (!game.id) {
      return [];
    }

    // Get similar games using the game's genres and tags
    // RAWG doesn't have a direct "similar games" endpoint, so we'll use genres
    const genres = game.genres?.map((g: any) => g.slug).join(',') || '';
    if (!genres) {
      return [];
    }

    // Fetch games with same genres, excluding the original game
    const similarUrl = `https://api.rawg.io/api/games?key=${process.env.RAWG_API_KEY}&genres=${genres}&page_size=20&ordering=-rating`;
    const similarResponse = await axios.get(similarUrl);
    
    if (similarResponse.data?.results) {
      // Filter out the original game, unreleased games, and return similar ones
      return similarResponse.data.results
        .filter((g: any) => {
          const isNotOriginal = g.name.toLowerCase() !== gameTitle.toLowerCase();
          const isReleased = isGameReleased(g);
          return isNotOriginal && isReleased;
        })
        .map((g: any) => g.name)
        .slice(0, 5);
    }

    return [];
  } catch (error) {
    console.error(`[Recommendations] Error fetching similar games for "${gameTitle}":`, error);
    return [];
  }
}

/**
 * Fetch trending games in a specific genre using RAWG API
 * Uses ordering by rating and release date to get popular/trending games
 * Filters out unreleased games
 */
async function fetchTrendingGames(genre: string): Promise<string[]> {
  try {
    const axios = (await import('axios')).default;
    const rawgGenreSlug = mapGenreToRAWGSlug(genre);
    if (!rawgGenreSlug) {
      return [];
    }

    // Fetch trending games: ordered by rating (popular) and recent releases
    const url = `https://api.rawg.io/api/games?key=${process.env.RAWG_API_KEY}&genres=${encodeURIComponent(rawgGenreSlug)}&ordering=-rating,-released&page_size=20`;
    
    const response = await axios.get(url);
    if (response.data?.results && response.data.results.length > 0) {
      // Filter out unreleased games
      return response.data.results
        .filter((game: any) => isGameReleased(game))
        .map((game: any) => game.name)
        .slice(0, 5);
    }

    return [];
  } catch (error) {
    console.error(`[Recommendations] Error fetching trending games for genre "${genre}":`, error);
    return [];
  }
}

/**
 * Get games the user has asked about from their question history
 */
async function getUserAskedGames(username: string): Promise<string[]> {
  try {
    const Question = (await import('../models/Question')).default;
    const questions = await Question.find({ username, detectedGame: { $exists: true, $ne: null } })
      .select('detectedGame')
      .lean();

    // Get unique game titles
    const games = Array.from(new Set(
      questions
        .map((q: any) => q.detectedGame)
        .filter((game: any) => game && game.trim())
    ));

    return games.slice(0, 5); // Return top 5 most asked about games
  } catch (error) {
    console.error('[Recommendations] Error fetching user asked games:', error);
    return [];
  }
}

/**
 * Generate game recommendations based on patterns and preferences
 * Phase 3 Step 2: Enhanced Game Recommendations
 * Includes: similar games, genre preferences, difficulty progression, trending games
 */
async function generateGameRecommendations(
  patterns: Awaited<ReturnType<typeof analyzeGameplayPatterns>>,
  preferences: any,
  username?: string
): Promise<{
  games: string[];
  reason: string;
  basedOn: string[];
}> {
  try {
    const allRecommendations: string[] = [];
    const basedOn: string[] = [];
    const recommendationSources: string[] = [];

    // 1. Similar games to those they've asked about
    if (username) {
      const userAskedGames = await getUserAskedGames(username);
      if (userAskedGames.length > 0) {
        for (const game of userAskedGames.slice(0, 2)) { // Limit to 2 games to avoid too many API calls
          try {
            const similarGames = await fetchSimilarGames(game);
            if (similarGames.length > 0) {
              allRecommendations.push(...similarGames);
              basedOn.push(`similar to ${game}`);
              recommendationSources.push('similar_games');
            }
          } catch (error) {
            console.error(`[Recommendations] Error fetching similar games for "${game}":`, error);
          }
        }
      }
    }

    // 2. Based on genre preferences (existing logic)
    const topGenres = patterns.genreAnalysis.topGenres.slice(0, 3);
    for (const genreData of topGenres) {
      try {
        const rawgGenreSlug = mapGenreToRAWGSlug(genreData.genre);
        if (!rawgGenreSlug) {
          continue;
        }

        const games = await fetchRecommendations(rawgGenreSlug);
        if (games.length > 0) {
          allRecommendations.push(...games.slice(0, 4)); // Reduced from 5 to make room for other sources
          basedOn.push(genreData.genre);
          recommendationSources.push('genre_preference');
        }
      } catch (error) {
        console.error(`[Recommendations] Error fetching games for genre ${genreData.genre}:`, error);
      }
    }

    // 3. Trending games in their preferred genres
    if (topGenres.length > 0) {
      for (const genreData of topGenres.slice(0, 2)) { // Limit to 2 genres for trending
        try {
          const trendingGames = await fetchTrendingGames(genreData.genre);
          if (trendingGames.length > 0) {
            allRecommendations.push(...trendingGames.slice(0, 3));
            basedOn.push(`trending ${genreData.genre}`);
            recommendationSources.push('trending');
          }
        } catch (error) {
          console.error(`[Recommendations] Error fetching trending games for genre "${genreData.genre}":`, error);
        }
      }
    }

    // Remove duplicates and limit to 10 recommendations
    const uniqueGames = Array.from(new Set(allRecommendations)).slice(0, 10);

    // Generate reason based on recommendation sources
    let reason = 'Based on ';
    const reasons: string[] = [];
    
    if (recommendationSources.includes('similar_games')) {
      reasons.push('games similar to ones you\'ve asked about');
    }
    if (recommendationSources.includes('genre_preference')) {
      if (topGenres.length > 0) {
        reasons.push(`your preference for ${topGenres[0].genre}`);
      }
    }
    if (recommendationSources.includes('trending')) {
      reasons.push('trending games in your favorite genres');
    }

    if (reasons.length > 0) {
      reason += reasons.join(', ');
    } else {
      reason += 'your gaming preferences';
    }

    // Add difficulty progression consideration
    if (patterns.difficulty.challengeSeeking === 'seeking_challenge') {
      reason += ' and your preference for challenging games';
    } else if (patterns.difficulty.challengeSeeking === 'easing_up') {
      reason += ' with a focus on accessible gameplay';
    }

    return {
      games: uniqueGames,
      reason,
      basedOn: Array.from(new Set(basedOn)), // Remove duplicate basedOn entries
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
 * Generate personalized loadout suggestions based on genre, difficulty, and playstyle
 * Phase 3 Step 2: Enhanced Strategy Tips - Loadout Suggestions
 */
function generateLoadoutSuggestions(
  patterns: Awaited<ReturnType<typeof analyzeGameplayPatterns>>,
  context: Awaited<ReturnType<typeof extractQuestionContext>>,
  preferences?: any
): string[] {
  const suggestions: string[] = [];
  const topGenre = patterns.genreAnalysis.topGenres[0]?.genre || '';
  const difficulty = context.difficultyHint || patterns.difficulty.currentLevel;
  const playstyleTags = preferences?.playstyleTags || [];

  // RPG loadout suggestions
  if (topGenre.includes('rpg') || topGenre.includes('RPG')) {
    if (difficulty === 'beginner') {
      suggestions.push('⚔️ Start with a balanced build: equal focus on offense and defense');
      suggestions.push('🛡️ Prioritize health and defense stats early - survivability is key');
    } else if (difficulty === 'intermediate') {
      if (playstyleTags.includes('strategist')) {
        suggestions.push('📊 Focus on a specialized build: choose one primary stat and maximize it');
        suggestions.push('🔮 Consider hybrid builds that combine two complementary playstyles');
      } else {
        suggestions.push('⚖️ Experiment with different stat distributions to find your preferred playstyle');
      }
    } else if (difficulty === 'advanced') {
      suggestions.push('🎯 Min-max your build: focus on one primary stat and optimize gear synergies');
      suggestions.push('⚡ Look for meta builds and optimal stat allocations for your class');
    }
  }

  // Shooter/Action loadout suggestions
  if (topGenre.includes('shooter') || topGenre.includes('action') || topGenre.includes('Action')) {
    if (difficulty === 'beginner') {
      suggestions.push('🔫 Use versatile weapons: assault rifles or SMGs for balanced gameplay');
      suggestions.push('🛡️ Equip armor that boosts survivability over damage');
    } else if (difficulty === 'intermediate') {
      if (playstyleTags.includes('strategist')) {
        suggestions.push('🎯 Build a loadout for specific map types: long-range for open maps, close-range for tight spaces');
        suggestions.push('⚔️ Create weapon combinations that cover different engagement ranges');
      } else {
        suggestions.push('🔄 Experiment with different weapon classes to find your comfort zone');
      }
    } else if (difficulty === 'advanced') {
      suggestions.push('⚡ Optimize for TTK (time-to-kill): use meta weapons and attachments');
      suggestions.push('🎖️ Master weapon recoil patterns and create loadouts that minimize weaknesses');
    }
  }

  // Strategy game loadout suggestions
  if (topGenre.includes('strategy') || topGenre.includes('Strategy')) {
    if (difficulty === 'beginner') {
      suggestions.push('🏰 Focus on economy: prioritize resource generation over early aggression');
      suggestions.push('⚖️ Build a balanced army composition: mix of units for versatility');
    } else if (difficulty === 'intermediate') {
      suggestions.push('📊 Study unit counters: build compositions that counter common strategies');
      suggestions.push('⚔️ Create specialized builds for specific matchups or scenarios');
    } else if (difficulty === 'advanced') {
      suggestions.push('🎯 Master meta compositions: learn optimal unit combinations for current patch');
      suggestions.push('⚡ Optimize build orders and resource allocation for maximum efficiency');
    }
  }

  return suggestions;
}

/**
 * Generate combat strategies based on question patterns
 * Phase 3 Step 2: Enhanced Strategy Tips - Combat Strategies
 * Only uses historical patterns when there's no current question context
 */
function generateCombatStrategies(
  patterns: Awaited<ReturnType<typeof analyzeGameplayPatterns>>,
  context: Awaited<ReturnType<typeof extractQuestionContext>>
): string[] {
  const strategies: string[] = [];
  const topQuestionType = patterns.behavior.questionTypes[0];
  const category = context.questionCategory || 'general_gameplay';
  const hasCurrentQuestion = !!context.questionCategory;

  // Only use combat strategies based on current question context
  // When no question context, skip historical pattern-based combat strategies
  // (genre-based tips will be used instead)
  if (hasCurrentQuestion) {
    // Combat strategies based on current question category
    if (category === 'boss_fight') {
      strategies.push('💪 Study attack patterns: learn boss telegraphs and safe positioning');
      strategies.push('⏱️ Master dodge timing: practice i-frames and perfect dodges');
      strategies.push('🔄 Adapt your strategy: switch between aggressive and defensive play based on boss phase');
      
      if (patterns.difficulty.challengeSeeking === 'seeking_challenge') {
        strategies.push('🔥 Try no-hit runs: perfect your timing for maximum challenge');
      }
    }

    if (category === 'strategy') {
      strategies.push('📊 Analyze your playstyle: identify strengths and build around them');
      strategies.push('⚔️ Learn combo systems: master attack chains and optimal rotations');
      strategies.push('🛡️ Balance offense and defense: know when to be aggressive vs. defensive');
      
      if (patterns.behavior.learningSpeed === 'fast') {
        strategies.push('🚀 Experiment with advanced techniques: frame-perfect inputs and optimization');
      }
    }
  }

  // General combat strategies based on difficulty (only when we have a current question)
  // These are too generic for general gameplay - genre tips are better
  if (hasCurrentQuestion && patterns.difficulty.currentLevel === 'beginner') {
    strategies.push('🎯 Focus on fundamentals: master basic attacks and movement first');
    strategies.push('📚 Learn enemy patterns: observe before engaging');
  } else if (hasCurrentQuestion && patterns.difficulty.currentLevel === 'advanced') {
    strategies.push('⚡ Optimize DPS rotations: maximize damage output with perfect timing');
    strategies.push('🎖️ Master advanced mechanics: parries, counters, and combo extensions');
  }

  return strategies;
}

/**
 * Generate exploration tips based on playstyle
 * Phase 3 Step 2: Enhanced Strategy Tips - Exploration Tips
 */
function generateExplorationTips(
  patterns: Awaited<ReturnType<typeof analyzeGameplayPatterns>>,
  preferences?: any
): string[] {
  const tips: string[] = [];
  const playstyleTags = preferences?.playstyleTags || [];
  const explorationDepth = patterns.behavior.explorationDepth;

  // Exploration tips for explorers
  if (playstyleTags.includes('explorer') || explorationDepth > 0.7) {
    tips.push('🗺️ Take your time: explore every corner - hidden areas often contain valuable rewards');
    tips.push('💡 Look for visual clues: environmental storytelling often hints at secrets');
    tips.push('🔍 Check behind waterfalls, under bridges, and in corners - developers love hiding things there');
    
    if (patterns.difficulty.currentLevel === 'advanced') {
      tips.push('🎯 Master sequence breaking: find ways to access areas early for speedrun routes');
    }
  } else if (explorationDepth < 0.3) {
    // Tips for users who don't explore much
    tips.push('🗺️ Try exploring more: hidden areas often contain powerful items or shortcuts');
    tips.push('💡 Follow side paths: main routes aren\'t always the most rewarding');
  }

  // Exploration tips based on question patterns
  const topQuestionType = patterns.behavior.questionTypes[0];
  if (topQuestionType?.category === 'level_walkthrough') {
    tips.push('🗺️ Use maps and guides: mark important locations as you explore');
    tips.push('💡 Look for collectibles: many games reward thorough exploration');
  }

  // Exploration tips based on genre
  const topGenre = patterns.genreAnalysis.topGenres[0]?.genre || '';
  if (topGenre.includes('adventure') || topGenre.includes('Adventure')) {
    tips.push('🌟 Talk to NPCs: they often provide hints about hidden locations');
    tips.push('🔍 Check your map regularly: many secrets are marked but easy to miss');
  }

  return tips;
}

/**
 * Generate achievement hunting strategies
 * Phase 3 Step 2: Enhanced Strategy Tips - Achievement Strategies
 */
function generateAchievementStrategies(
  patterns: Awaited<ReturnType<typeof analyzeGameplayPatterns>>,
  preferences?: any
): string[] {
  const strategies: string[] = [];
  const playstyleTags = preferences?.playstyleTags || [];
  const topQuestionType = patterns.behavior.questionTypes[0];

  // Achievement strategies for completionists
  if (playstyleTags.includes('completionist') || topQuestionType?.category === 'achievement') {
    strategies.push('🏆 Plan your route: identify achievements that can be completed together');
    strategies.push('📋 Create a checklist: track which achievements you\'ve completed');
    strategies.push('⏱️ Some achievements require multiple playthroughs - plan accordingly');
    
    if (patterns.difficulty.currentLevel === 'advanced') {
      strategies.push('⚡ Optimize achievement runs: combine speedrun techniques with achievement hunting');
    }
  }

  // General achievement tips
  if (topQuestionType?.category === 'achievement') {
    strategies.push('🎯 Focus on missable achievements first: complete story-based ones before free-roam');
    strategies.push('💡 Check achievement descriptions: many have hidden requirements or conditions');
    strategies.push('🔄 Save before challenging achievements: allows retries without full restarts');
  }

  // Achievement tips based on difficulty
  if (patterns.difficulty.challengeSeeking === 'seeking_challenge') {
    strategies.push('🔥 Try achievement combinations: complete multiple challenging achievements in one run');
  }

  return strategies;
}

/**
 * Generate strategy tips based on user patterns and current question context
 * Phase 3 Step 2: Enhanced Strategy Tips
 * Includes: personalized loadout suggestions, combat strategies, exploration tips, achievement hunting
 */
function generateStrategyTips(
  patterns: Awaited<ReturnType<typeof analyzeGameplayPatterns>>,
  context: Awaited<ReturnType<typeof extractQuestionContext>>,
  preferences?: any
): {
  tips: string[];
  category: string;
} {
  const tips: string[] = [];
  const category = context.questionCategory || 'general_gameplay';

  // When no question context, prioritize genre-based personalized tips
  // When question context exists, use category-specific tips
  if (category === 'general_gameplay') {
    // No question context - use personalized genre-based tips
    const topGenre = patterns.genreAnalysis.topGenres[0]?.genre || '';
    const currentLevel = patterns.difficulty.currentLevel;
    const playstyleTags = preferences?.playstyleTags || [];
    
    // Genre-specific general tips (prioritize these)
    if (topGenre.includes('platformer') || topGenre.includes('Platformer')) {
      tips.push('🎮 Platformer tip: Master the movement mechanics first - precise jumps and timing are key to success in platformers.');
      tips.push('⚡ Pro tip: Learn to read level design patterns. Most platformers use visual cues to guide you toward secrets and optimal paths.');
    } else if (topGenre.includes('action') || topGenre.includes('Action')) {
      tips.push('⚔️ Action game tip: Practice your dodge and parry timing. These defensive skills are often more important than pure offense.');
      tips.push('🎯 Pro tip: Learn enemy attack patterns and find safe windows to counterattack for maximum efficiency.');
    } else if (topGenre.includes('adventure') || topGenre.includes('Adventure')) {
      tips.push('🗺️ Adventure game tip: Take your time to explore and talk to NPCs. Adventure games reward thorough exploration with story depth and hidden content.');
      tips.push('💡 Pro tip: Pay attention to environmental storytelling - developers often hide clues about puzzles and secrets in the world itself.');
    } else if (topGenre.includes('rpg') || topGenre.includes('RPG')) {
      tips.push('⚔️ RPG tip: Don\'t rush through the story. Take time to complete side quests and explore - they often provide valuable rewards and character development.');
      tips.push('📊 Pro tip: Experiment with different character builds early on. Finding a playstyle that matches your preferences makes the game much more enjoyable.');
    }
    
    // Add loadout suggestions if relevant to genre
    const loadoutSuggestions = generateLoadoutSuggestions(patterns, context, preferences);
    tips.push(...loadoutSuggestions);
    
    // Difficulty-based general tips
    if (currentLevel === 'intermediate') {
      tips.push('📈 Since you\'re at an intermediate level, try experimenting with different strategies. Don\'t be afraid to step outside your comfort zone.');
    } else if (currentLevel === 'advanced') {
      tips.push('🔥 As an advanced player, focus on optimization and efficiency. Study high-level play to discover techniques you might not have considered.');
    }
    
    // Playstyle-based general tips
    if (playstyleTags.includes('explorer')) {
      tips.push('🗺️ Your exploratory nature means you\'ll find more secrets than most. Keep checking those corners and hidden paths!');
    }
    if (playstyleTags.includes('strategist')) {
      tips.push('📊 Your strategic mindset means you enjoy planning. Take time to analyze game mechanics and plan your approach before diving in.');
    }
    
    // Add exploration and achievement tips (these are always relevant)
    const explorationTips = generateExplorationTips(patterns, preferences);
    tips.push(...explorationTips);
    
    const achievementStrategies = generateAchievementStrategies(patterns, preferences);
    tips.push(...achievementStrategies);
  } else {
    // Question context exists - use category-specific tips
    // 1. Personalized loadout suggestions
    const loadoutSuggestions = generateLoadoutSuggestions(patterns, context, preferences);
    tips.push(...loadoutSuggestions);

    // 2. Combat strategies based on question patterns
    const combatStrategies = generateCombatStrategies(patterns, context);
    tips.push(...combatStrategies);

    // 3. Exploration tips for their playstyle
    const explorationTips = generateExplorationTips(patterns, preferences);
    tips.push(...explorationTips);

    // 4. Achievement hunting strategies
    const achievementStrategies = generateAchievementStrategies(patterns, preferences);
    tips.push(...achievementStrategies);
  }

  // Fallback: Tips based on question category (if no specific tips generated)
  if (tips.length === 0) {
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

  // Remove duplicates and limit to 8 tips (increased from 5 for more comprehensive suggestions)
  const uniqueTips = Array.from(new Set(tips));
  
  return {
    tips: uniqueTips.slice(0, 8),
    category,
  };
}

/**
 * Generate suggested progression for games based on user patterns
 * Phase 3 Step 2: Enhanced Learning Paths - Game Progression
 */
function generateGameProgression(
  patterns: Awaited<ReturnType<typeof analyzeGameplayPatterns>>,
  preferences?: any
): string[] {
  const progression: string[] = [];
  const currentLevel = patterns.difficulty.currentLevel;
  const topGenre = patterns.genreAnalysis.topGenres[0]?.genre || '';
  const playstyleTags = preferences?.playstyleTags || [];

  // Game progression suggestions based on difficulty level
  if (currentLevel === 'beginner') {
    progression.push('📚 Start with tutorial-friendly games: focus on games with comprehensive tutorials');
    progression.push('🎮 Progress from story mode to normal difficulty before attempting hard modes');
    progression.push('🔄 Complete one game fully before moving to the next to build confidence');
  } else if (currentLevel === 'intermediate') {
    progression.push('⚔️ Try games with multiple difficulty settings: gradually increase challenge');
    progression.push('🏆 Move from single-player to multiplayer modes to test your skills');
    progression.push('📈 Progress through game series in order: build on mechanics you\'ve learned');
    
    if (playstyleTags.includes('completionist')) {
      progression.push('🏅 Complete games 100% before moving on: builds mastery and understanding');
    }
  } else if (currentLevel === 'advanced') {
    progression.push('🔥 Tackle games known for difficulty: Souls-like, roguelikes, or hardcore modes');
    progression.push('⚡ Try speedrunning: apply your skills to time-based challenges');
    progression.push('🎖️ Master entire game series: become an expert in your favorite franchises');
  }

  // Genre-specific progression
  if (topGenre.includes('rpg') || topGenre.includes('RPG')) {
    progression.push('📖 Progress from linear RPGs to open-world: build exploration skills gradually');
    progression.push('⚔️ Move from turn-based to action RPGs: develop real-time combat skills');
  } else if (topGenre.includes('shooter') || topGenre.includes('action')) {
    progression.push('🎯 Start with single-player campaigns, then move to multiplayer');
    progression.push('🔫 Progress from casual shooters to competitive FPS games');
  } else if (topGenre.includes('strategy') || topGenre.includes('Strategy')) {
    progression.push('📊 Move from turn-based to real-time strategy: develop faster decision-making');
    progression.push('🏰 Progress from single-player campaigns to multiplayer matches');
  }

  return progression;
}

/**
 * Generate skill building recommendations based on user patterns
 * Phase 3 Step 2: Enhanced Learning Paths - Skill Building
 */
function generateSkillBuilding(
  patterns: Awaited<ReturnType<typeof analyzeGameplayPatterns>>,
  preferences?: any
): string[] {
  const skills: string[] = [];
  const currentLevel = patterns.difficulty.currentLevel;
  const topQuestionType = patterns.behavior.questionTypes[0];
  const learningSpeed = patterns.behavior.learningSpeed;
  const playstyleTags = preferences?.playstyleTags || [];

  // Skill building based on difficulty level
  if (currentLevel === 'beginner') {
    skills.push('🎯 Build fundamental skills: movement, basic combat, and resource management');
    skills.push('📚 Learn game mechanics: understand core systems before advanced techniques');
    skills.push('⏱️ Develop timing skills: practice reaction times and pattern recognition');
  } else if (currentLevel === 'intermediate') {
    skills.push('⚔️ Master advanced combat: learn combo systems and optimal rotations');
    skills.push('📊 Develop strategic thinking: analyze situations and plan ahead');
    skills.push('🔄 Improve adaptability: learn to adjust strategies based on context');
    
    if (topQuestionType?.category === 'boss_fight') {
      skills.push('💪 Build boss fight skills: pattern recognition, dodge timing, and phase transitions');
    }
    if (topQuestionType?.category === 'strategy') {
      skills.push('📈 Develop optimization skills: min-maxing, build theory, and meta analysis');
    }
  } else if (currentLevel === 'advanced') {
    skills.push('⚡ Master frame-perfect techniques: precise timing and execution');
    skills.push('🎖️ Develop speedrun skills: route optimization and execution consistency');
    skills.push('🔥 Build challenge run expertise: self-imposed restrictions and difficulty mastery');
  }

  // Skill building based on learning speed
  if (learningSpeed === 'fast') {
    skills.push('🚀 Challenge yourself with advanced techniques: you learn quickly, push boundaries');
    skills.push('📚 Study high-level play: watch expert players and analyze their strategies');
  } else if (learningSpeed === 'slow') {
    skills.push('📖 Focus on one skill at a time: master each before moving to the next');
    skills.push('🔄 Practice consistently: repetition builds muscle memory and understanding');
  }

  // Skill building based on playstyle
  if (playstyleTags.includes('strategist')) {
    skills.push('📊 Develop analytical skills: study game mechanics and optimal strategies');
    skills.push('⚔️ Build theorycrafting abilities: understand build synergies and meta trends');
  }
  if (playstyleTags.includes('explorer')) {
    skills.push('🗺️ Develop exploration skills: learn to find secrets and hidden areas');
    skills.push('💡 Build observation skills: notice environmental clues and patterns');
  }
  if (playstyleTags.includes('completionist')) {
    skills.push('🏆 Develop completion skills: efficient routing and achievement planning');
    skills.push('📋 Build organization skills: track progress and manage multiple objectives');
  }

  return skills;
}

/**
 * Generate next challenges to tackle based on user patterns
 * Phase 3 Step 2: Enhanced Learning Paths - Next Challenges
 */
function generateNextChallenges(
  patterns: Awaited<ReturnType<typeof analyzeGameplayPatterns>>,
  preferences?: any
): string[] {
  const challenges: string[] = [];
  const currentLevel = patterns.difficulty.currentLevel;
  const challengeSeeking = patterns.difficulty.challengeSeeking;
  const topQuestionType = patterns.behavior.questionTypes[0];
  const playstyleTags = preferences?.playstyleTags || [];

  // Challenges based on current difficulty level
  if (currentLevel === 'beginner') {
    challenges.push('🎯 Complete a game on normal difficulty without lowering it');
    challenges.push('🏆 Try a game in a genre you haven\'t explored yet');
    challenges.push('⚔️ Master one specific game mechanic you\'ve been struggling with');
  } else if (currentLevel === 'intermediate') {
    challenges.push('🔥 Attempt a game on hard difficulty or highest available setting');
    challenges.push('⚡ Try a speedrun challenge: complete a game as fast as possible');
    challenges.push('🏅 Complete all achievements in one of your favorite games');
    
    if (topQuestionType?.category === 'boss_fight') {
      challenges.push('💪 Defeat a boss without taking damage: perfect your timing');
    }
    if (topQuestionType?.category === 'strategy') {
      challenges.push('📊 Create and optimize a build from scratch: test your theorycrafting');
    }
  } else if (currentLevel === 'advanced') {
    challenges.push('🔥 Try a no-death run: complete a game without dying');
    challenges.push('⚡ Attempt a world record or top leaderboard position');
    challenges.push('🎖️ Master a game series: complete all games in a franchise');
    challenges.push('💪 Try challenge runs: no upgrades, minimal items, or other restrictions');
  }

  // Challenges based on challenge-seeking behavior
  if (challengeSeeking === 'seeking_challenge') {
    challenges.push('🔥 Try games known for extreme difficulty: Souls-like, roguelikes, or hardcore modes');
    challenges.push('⚡ Attempt self-imposed challenges: no healing, no upgrades, or other restrictions');
    challenges.push('💪 Master games with no difficulty settings: learn to adapt to fixed challenge');
  } else if (challengeSeeking === 'easing_up') {
    challenges.push('😌 Try story-focused games: enjoy narrative without intense challenge');
    challenges.push('🎮 Explore games with accessibility options: find comfortable difficulty levels');
  }

  // Challenges based on playstyle
  if (playstyleTags.includes('completionist')) {
    challenges.push('🏆 Complete a game 100%: all achievements, collectibles, and side content');
    challenges.push('📋 Plan and execute an efficient completion route');
  }
  if (playstyleTags.includes('strategist')) {
    challenges.push('📊 Master a meta build: learn and optimize a top-tier strategy');
    challenges.push('⚔️ Win a competitive match using only theorycrafted strategies');
  }

  return challenges;
}

/**
 * Generate practice areas for improvement based on user patterns
 * Phase 3 Step 2: Enhanced Learning Paths - Practice Areas
 */
function generatePracticeAreas(
  patterns: Awaited<ReturnType<typeof analyzeGameplayPatterns>>,
  preferences?: any
): string[] {
  const practiceAreas: string[] = [];
  const currentLevel = patterns.difficulty.currentLevel;
  const topQuestionType = patterns.behavior.questionTypes[0];
  const learningSpeed = patterns.behavior.learningSpeed;
  const topGenre = patterns.genreAnalysis.topGenres[0]?.genre || '';

  // Practice areas based on difficulty level
  if (currentLevel === 'beginner') {
    practiceAreas.push('🎯 Practice basic movement and controls: master the fundamentals');
    practiceAreas.push('⚔️ Practice combat in safe areas: build confidence before challenging content');
    practiceAreas.push('📚 Practice understanding game systems: read tutorials and experiment');
  } else if (currentLevel === 'intermediate') {
    practiceAreas.push('⚔️ Practice advanced combat techniques: combos, parries, and optimal rotations');
    practiceAreas.push('📊 Practice build optimization: experiment with different stat distributions');
    practiceAreas.push('⏱️ Practice timing and reaction: improve your response to game events');
    
    if (topQuestionType?.category === 'boss_fight') {
      practiceAreas.push('💪 Practice boss patterns: learn attack telegraphs and safe positioning');
      practiceAreas.push('🔄 Practice phase transitions: master boss fight flow');
    }
  } else if (currentLevel === 'advanced') {
    practiceAreas.push('⚡ Practice frame-perfect inputs: master precise timing and execution');
    practiceAreas.push('🎯 Practice route optimization: find faster paths and better strategies');
    practiceAreas.push('🔥 Practice challenge runs: test your skills under restrictions');
  }

  // Practice areas based on question patterns
  if (topQuestionType?.category === 'strategy') {
    practiceAreas.push('📊 Practice theorycrafting: analyze builds and optimize strategies');
    practiceAreas.push('⚔️ Practice different playstyles: experiment with various approaches');
  }
  if (topQuestionType?.category === 'level_walkthrough') {
    practiceAreas.push('🗺️ Practice exploration: develop skills for finding secrets and hidden areas');
    practiceAreas.push('💡 Practice observation: learn to spot environmental clues');
  }

  // Practice areas based on learning speed
  if (learningSpeed === 'slow') {
    practiceAreas.push('🔄 Practice consistently: set aside regular time for skill development');
    practiceAreas.push('📖 Practice one skill at a time: focus on mastery before moving on');
  }

  // Genre-specific practice areas
  if (topGenre.includes('rpg') || topGenre.includes('RPG')) {
    practiceAreas.push('⚔️ Practice different character builds: experiment with stat allocations');
    practiceAreas.push('📊 Practice resource management: optimize inventory and economy');
  } else if (topGenre.includes('shooter') || topGenre.includes('action')) {
    practiceAreas.push('🎯 Practice aim and accuracy: improve your shooting skills');
    practiceAreas.push('🔄 Practice movement: master strafing, dodging, and positioning');
  } else if (topGenre.includes('strategy') || topGenre.includes('Strategy')) {
    practiceAreas.push('📊 Practice decision-making: improve speed and quality of choices');
    practiceAreas.push('⚔️ Practice unit management: master micro and macro strategies');
  }

  return practiceAreas;
}

/**
 * Generate learning path recommendations based on user patterns
 * Phase 3 Step 2: Enhanced Learning Paths
 * Includes: suggested progression, skill building, next challenges, practice areas
 */
function generateLearningPath(
  patterns: Awaited<ReturnType<typeof analyzeGameplayPatterns>>,
  preferences?: any
): {
  suggestions: string[];
  nextSteps: string[];
} {
  const suggestions: string[] = [];
  const nextSteps: string[] = [];

  // 1. Suggested progression for games
  const gameProgression = generateGameProgression(patterns, preferences);
  suggestions.push(...gameProgression);

  // 2. Skill building recommendations
  const skillBuilding = generateSkillBuilding(patterns, preferences);
  suggestions.push(...skillBuilding);

  // 3. Next challenges to tackle
  const nextChallenges = generateNextChallenges(patterns, preferences);
  nextSteps.push(...nextChallenges);

  // 4. Practice areas for improvement
  const practiceAreas = generatePracticeAreas(patterns, preferences);
  nextSteps.push(...practiceAreas);

  // Fallback: Basic learning path if no specific suggestions generated
  if (suggestions.length === 0) {
    const currentLevel = patterns.difficulty.currentLevel;
    
    if (currentLevel === 'beginner') {
      suggestions.push('📚 Focus on understanding core game mechanics');
      suggestions.push('🎯 Practice basic skills before moving to advanced techniques');
    } else if (currentLevel === 'intermediate') {
      suggestions.push('⚔️ Experiment with different playstyles and strategies');
      suggestions.push('🏆 Challenge yourself with harder content or achievement hunting');
    } else if (currentLevel === 'advanced') {
      suggestions.push('🔥 Master advanced techniques and optimization strategies');
      suggestions.push('🎖️ Share your knowledge by helping other players');
    }
  }

  // Fallback: Basic next steps if none generated
  if (nextSteps.length === 0) {
    const currentLevel = patterns.difficulty.currentLevel;
    
    if (currentLevel === 'beginner') {
      nextSteps.push('Try intermediate-level challenges once comfortable with basics');
      nextSteps.push('Explore different game genres to broaden your experience');
    } else if (currentLevel === 'intermediate') {
      nextSteps.push('Consider advanced strategies and optimization techniques');
      nextSteps.push('Try speedrunning or challenge runs for extra difficulty');
    } else if (currentLevel === 'advanced') {
      nextSteps.push('Consider competitive play or leaderboard challenges');
      nextSteps.push('Explore modding or game creation for deeper engagement');
    }
  }

  // Remove duplicates and limit results
  const uniqueSuggestions = Array.from(new Set(suggestions));
  const uniqueNextSteps = Array.from(new Set(nextSteps));

  return {
    suggestions: uniqueSuggestions.slice(0, 6), // Increased from 5 to 6 for more comprehensive suggestions
    nextSteps: uniqueNextSteps.slice(0, 4), // Increased from 3 to 4 for more comprehensive next steps
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
    const gameRecommendations = await generateGameRecommendations(patterns, preferences, username);
    const strategyTips = generateStrategyTips(patterns, context, preferences);
    const learningPath = generateLearningPath(patterns, preferences);
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

