/**
 * Generate personalized recommendations based on stored user patterns
 * Uses the patterns stored in the User model to provide tailored suggestions
 */

import User from '../models/User';
import { fetchRecommendations } from './aiHelper';

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

