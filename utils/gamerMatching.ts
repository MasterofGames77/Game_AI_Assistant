import { connectToWingmanDB } from './databaseConnections';
import User from '../models/User';

/**
 * Gamer Matching Utility
 * 
 * Provides functions to match EXPERT gamers to COMMON gamers based on:
 * - Direct mapping (helpsCommonGamer field)
 * - Shared favorite games
 * - Shared genres
 * - Skill level and expertise
 */

export interface MatchingResult {
  expertUsername: string;
  matchType: 'direct' | 'game' | 'genre' | 'fallback';
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

/**
 * Find the best EXPERT gamer to reply to a COMMON gamer's post
 * Uses a priority-based matching system
 * 
 * @param commonGamerUsername - Username of the COMMON gamer who created the post
 * @param gameTitle - Game title from the post (optional)
 * @param genre - Genre of the game (optional)
 * @returns MatchingResult with the best EXPERT gamer, or null if none found
 */
export async function findMatchingExpert(
  commonGamerUsername: string,
  gameTitle?: string,
  genre?: string
): Promise<MatchingResult | null> {
  try {
    await connectToWingmanDB();

    // Get all EXPERT gamers
    const expertGamers = await User.find({ 'gamerProfile.type': 'expert' })
      .lean();

    if (expertGamers.length === 0) {
      return null;
    }

    // Priority 1: EXPERT gamer mapped to help this COMMON gamer (direct mapping)
    const mappedExpert = expertGamers.find((expert: any) => 
      expert.gamerProfile?.helpsCommonGamer === commonGamerUsername
    );

    if (mappedExpert) {
      console.log(`[MATCHING] Found direct mapping: EXPERT ${mappedExpert.username} → COMMON ${commonGamerUsername}`);
      return {
        expertUsername: mappedExpert.username,
        matchType: 'direct',
        confidence: 'high',
        reason: `Directly mapped to help ${commonGamerUsername}`
      };
    }

    // Priority 2: EXPERT gamer with matching game title
    if (gameTitle) {
      const gameTitleLower = gameTitle.toLowerCase();
      const gameMatchExpert = expertGamers.find((expert: any) => 
        expert.gamerProfile?.favoriteGames?.some((game: any) => 
          game.gameTitle?.toLowerCase() === gameTitleLower
        )
      );

      if (gameMatchExpert) {
        console.log(`[MATCHING] Found game match: EXPERT ${gameMatchExpert.username} for game ${gameTitle}`);
        return {
          expertUsername: gameMatchExpert.username,
          matchType: 'game',
          confidence: 'high',
          reason: `Has ${gameTitle} in favorite games`
        };
      }
    }

    // Priority 3: EXPERT gamer with matching genre
    if (genre) {
      const genreMatchExpert = expertGamers.find((expert: any) => 
        expert.gamerProfile?.favoriteGames?.some((game: any) => 
          game.genre?.toLowerCase() === genre.toLowerCase()
        )
      );

      if (genreMatchExpert) {
        console.log(`[MATCHING] Found genre match: EXPERT ${genreMatchExpert.username} for genre ${genre}`);
        return {
          expertUsername: genreMatchExpert.username,
          matchType: 'genre',
          confidence: 'medium',
          reason: `Has ${genre} games in favorite games`
        };
      }
    }

    // Fallback: Return first available EXPERT gamer
    if (expertGamers.length > 0) {
      const fallbackExpert = expertGamers[0];
      console.log(`[MATCHING] Using fallback EXPERT ${fallbackExpert.username}`);
      return {
        expertUsername: fallbackExpert.username,
        matchType: 'fallback',
        confidence: 'low',
        reason: 'No specific match found, using first available EXPERT'
      };
    }

    return null;
  } catch (error) {
    console.error('[MATCHING] Error finding matching EXPERT:', error);
    return null;
  }
}

/**
 * Find all EXPERT gamers who could help with a specific game
 * Returns ranked list by match quality
 * 
 * @param gameTitle - Game title to match
 * @returns Array of MatchingResult sorted by confidence (high to low)
 */
export async function findExpertsForGame(gameTitle: string): Promise<MatchingResult[]> {
  try {
    await connectToWingmanDB();

    const expertGamers = await User.find({ 'gamerProfile.type': 'expert' })
      .lean();

    if (expertGamers.length === 0) {
      return [];
    }

    const gameTitleLower = gameTitle.toLowerCase();
    const matches: MatchingResult[] = [];

    for (const expert of expertGamers) {
      const favoriteGames = expert.gamerProfile?.favoriteGames || [];
      const hasGame = favoriteGames.some((game: any) => 
        game.gameTitle?.toLowerCase() === gameTitleLower
      );

      if (hasGame) {
        matches.push({
          expertUsername: expert.username,
          matchType: 'game',
          confidence: 'high',
          reason: `Has ${gameTitle} in favorite games`
        });
      }
    }

    // Sort by confidence (high, medium, low)
    const confidenceOrder = { high: 3, medium: 2, low: 1 };
    matches.sort((a, b) => 
      confidenceOrder[b.confidence] - confidenceOrder[a.confidence]
    );

    return matches;
  } catch (error) {
    console.error('[MATCHING] Error finding experts for game:', error);
    return [];
  }
}

/**
 * Find all EXPERT gamers who could help with a specific genre
 * Returns ranked list by match quality
 * 
 * @param genre - Genre to match
 * @returns Array of MatchingResult sorted by confidence (high to low)
 */
export async function findExpertsForGenre(genre: string): Promise<MatchingResult[]> {
  try {
    await connectToWingmanDB();

    const expertGamers = await User.find({ 'gamerProfile.type': 'expert' })
      .lean();

    if (expertGamers.length === 0) {
      return [];
    }

    const genreLower = genre.toLowerCase();
    const matches: MatchingResult[] = [];

    for (const expert of expertGamers) {
      const favoriteGames = expert.gamerProfile?.favoriteGames || [];
      const hasGenre = favoriteGames.some((game: any) => 
        game.genre?.toLowerCase() === genreLower
      );

      if (hasGenre) {
        matches.push({
          expertUsername: expert.username,
          matchType: 'genre',
          confidence: 'medium',
          reason: `Has ${genre} games in favorite games`
        });
      }
    }

    // Sort by confidence (high, medium, low)
    const confidenceOrder = { high: 3, medium: 2, low: 1 };
    matches.sort((a, b) => 
      confidenceOrder[b.confidence] - confidenceOrder[a.confidence]
    );

    return matches;
  } catch (error) {
    console.error('[MATCHING] Error finding experts for genre:', error);
    return [];
  }
}

/**
 * Get the direct mapping between a COMMON gamer and their EXPERT helper
 * 
 * @param commonGamerUsername - Username of the COMMON gamer
 * @returns Username of the mapped EXPERT gamer, or null if not found
 */
export async function getMappedExpert(commonGamerUsername: string): Promise<string | null> {
  try {
    await connectToWingmanDB();

    const expertGamer = await User.findOne({
      'gamerProfile.type': 'expert',
      'gamerProfile.helpsCommonGamer': commonGamerUsername
    })
      .select('username')
      .lean() as any;

    return expertGamer ? expertGamer.username : null;
  } catch (error) {
    console.error('[MATCHING] Error getting mapped expert:', error);
    return null;
  }
}

/**
 * Get all COMMON gamers that a specific EXPERT is mapped to help
 * (Currently one-to-one, but this function supports future expansion)
 * 
 * @param expertUsername - Username of the EXPERT gamer
 * @returns Array of COMMON gamer usernames
 */
export async function getHelpedCommonGamers(expertUsername: string): Promise<string[]> {
  try {
    await connectToWingmanDB();

    const expert = await User.findOne({ username: expertUsername })
      .select('gamerProfile.helpsCommonGamer')
      .lean() as any;

    if (!expert || !expert.gamerProfile?.helpsCommonGamer) {
      return [];
    }

    return [expert.gamerProfile.helpsCommonGamer];
  } catch (error) {
    console.error('[MATCHING] Error getting helped common gamers:', error);
    return [];
  }
}

/**
 * Check if an EXPERT gamer has a specific game in their favorites
 * 
 * @param expertUsername - Username of the EXPERT gamer
 * @param gameTitle - Game title to check
 * @returns true if the EXPERT has the game in favorites
 */
export async function expertHasGame(
  expertUsername: string,
  gameTitle: string
): Promise<boolean> {
  try {
    await connectToWingmanDB();

    const expert = await User.findOne({ username: expertUsername })
      .select('gamerProfile.favoriteGames')
      .lean() as any;

    if (!expert || !expert.gamerProfile?.favoriteGames) {
      return false;
    }

    const gameTitleLower = gameTitle.toLowerCase();
    return expert.gamerProfile.favoriteGames.some((game: any) =>
      game.gameTitle?.toLowerCase() === gameTitleLower
    );
  } catch (error) {
    console.error('[MATCHING] Error checking if expert has game:', error);
    return false;
  }
}

/**
 * Check if an EXPERT gamer has a specific genre in their favorites
 * 
 * @param expertUsername - Username of the EXPERT gamer
 * @param genre - Genre to check
 * @returns true if the EXPERT has the genre in favorites
 */
export async function expertHasGenre(
  expertUsername: string,
  genre: string
): Promise<boolean> {
  try {
    await connectToWingmanDB();

    const expert = await User.findOne({ username: expertUsername })
      .select('gamerProfile.favoriteGames')
      .lean() as any;

    if (!expert || !expert.gamerProfile?.favoriteGames) {
      return false;
    }

    const genreLower = genre.toLowerCase();
    return expert.gamerProfile.favoriteGames.some((game: any) =>
      game.genre?.toLowerCase() === genreLower
    );
  } catch (error) {
    console.error('[MATCHING] Error checking if expert has genre:', error);
    return false;
  }
}

/**
 * Get matching score between a COMMON gamer and an EXPERT gamer
 * Higher score = better match
 * 
 * @param commonGamerUsername - Username of the COMMON gamer
 * @param expertUsername - Username of the EXPERT gamer
 * @returns Score from 0-100 (100 = perfect match)
 */
export async function getMatchingScore(
  commonGamerUsername: string,
  expertUsername: string
): Promise<number> {
  try {
    await connectToWingmanDB();

    const [commonGamer, expert] = await Promise.all([
      User.findOne({ username: commonGamerUsername }).lean(),
      User.findOne({ username: expertUsername }).lean()
    ]) as any[];

    if (!commonGamer || !expert || !commonGamer.gamerProfile || !expert.gamerProfile) {
      return 0;
    }

    let score = 0;

    // Direct mapping: +50 points
    if (expert.gamerProfile.helpsCommonGamer === commonGamerUsername) {
      score += 50;
    }

    // Shared games: +20 points per game
    const commonGames = commonGamer.gamerProfile.favoriteGames || [];
    const expertGames = expert.gamerProfile.favoriteGames || [];
    
    for (const commonGame of commonGames) {
      const hasGame = expertGames.some((expertGame: any) =>
        expertGame.gameTitle?.toLowerCase() === commonGame.gameTitle?.toLowerCase()
      );
      if (hasGame) {
        score += 20;
      }
    }

    // Shared genres: +5 points per genre
    const commonGenres = new Set<string>(
      commonGames.map((game: any) => game.genre?.toLowerCase()).filter(Boolean)
    );
    const expertGenres = new Set<string>(
      expertGames.map((game: any) => game.genre?.toLowerCase()).filter(Boolean)
    );
    
    const sharedGenres = Array.from(commonGenres).filter(genre => expertGenres.has(genre));
    score += sharedGenres.length * 5;

    // Cap at 100
    return Math.min(score, 100);
  } catch (error) {
    console.error('[MATCHING] Error calculating matching score:', error);
    return 0;
  }
}

