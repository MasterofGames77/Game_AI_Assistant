import User from '../models/User';
import Forum from '../models/Forum';
import Question from '../models/Question';
import { fetchRecommendations } from './aiHelper';
import { Achievement } from '../types';

/**
 * Get achievements for weekly digest
 * - First email: returns all current achievements
 * - Subsequent emails: returns only achievements earned in the past week
 */
export async function getWeeklyAchievements(
  username: string,
  isFirstEmail: boolean
): Promise<Array<{ name: string; dateEarned: Date }>> {
  try {
    const user = await User.findOne({ username });
    if (!user || !user.achievements || user.achievements.length === 0) {
      return [];
    }

    if (isFirstEmail) {
      // First email: return all achievements
      return user.achievements.map((ach: Achievement) => ({
        name: ach.name,
        dateEarned: ach.dateEarned
      }));
    } else {
      // Subsequent emails: only return achievements from the past week
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      return user.achievements
        .filter((ach: Achievement) => new Date(ach.dateEarned) >= oneWeekAgo)
        .map((ach: Achievement) => ({
          name: ach.name,
          dateEarned: ach.dateEarned
        }));
    }
  } catch (error) {
    console.error(`[Weekly Digest] Error getting achievements for ${username}:`, error);
    return [];
  }
}

/**
 * Get forum activity for the past week
 * Returns posts created by the user in the past 7 days
 */
export async function getWeeklyForumActivity(
  username: string
): Promise<Array<{
  forumTitle: string;
  gameTitle: string;
  message: string;
  timestamp: Date;
  likes: number;
}>> {
  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Find all forums where user has posted in the past week
    const forums = await Forum.find({
      $or: [
        { isPrivate: false },
        { allowedUsers: username }
      ],
      'metadata.status': 'active',
      'posts.username': username,
      'posts.timestamp': { $gte: oneWeekAgo },
      'posts.metadata.status': 'active'
    }).lean();

    const activities: Array<{
      forumTitle: string;
      gameTitle: string;
      message: string;
      timestamp: Date;
      likes: number;
    }> = [];

    for (const forum of forums) {
      if (!forum.posts || !Array.isArray(forum.posts)) continue;

      const userPosts = forum.posts.filter((post: any) => {
        const postDate = new Date(post.timestamp);
        return (
          post.username === username &&
          postDate >= oneWeekAgo &&
          post.metadata?.status === 'active'
        );
      });

      for (const post of userPosts) {
        activities.push({
          forumTitle: forum.title || 'Untitled Forum',
          gameTitle: forum.gameTitle || 'Unknown Game',
          message: post.message || '',
          timestamp: new Date(post.timestamp),
          likes: post.metadata?.likes || 0
        });
      }
    }

    // Sort by timestamp (most recent first)
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Limit to top 10 most recent activities
    return activities.slice(0, 10);
  } catch (error) {
    console.error(`[Weekly Digest] Error getting forum activity for ${username}:`, error);
    return [];
  }
}

/**
 * Get game recommendations for the weekly digest
 * Uses user's question history to provide personalized recommendations
 * Recommendations vary each week based on user's recent questions
 */
export async function getWeeklyGameRecommendations(
  username: string
): Promise<string[]> {
  try {
    // Get user's recent questions (last 50) to understand their interests
    const recentQuestionsRaw = await Question.find({ username })
      .sort({ timestamp: -1 })
      .limit(50)
      .select('detectedGame detectedGenre question timestamp')
      .lean();
    
    // Type guard and mapping to ensure proper types
    const recentQuestions = recentQuestionsRaw
      .filter((q: any) => q && q.timestamp)
      .map((q: any) => ({
        detectedGame: q.detectedGame || undefined,
        detectedGenre: Array.isArray(q.detectedGenre) ? q.detectedGenre : undefined,
        question: q.question || undefined,
        timestamp: new Date(q.timestamp)
      }));

    // Extract unique games and genres from user's questions
    const gamesAskedAbout = new Set<string>();
    const genreCounts: { [key: string]: number } = {};

    for (const q of recentQuestions) {
      // Collect games they've asked about
      if (q.detectedGame) {
        gamesAskedAbout.add(q.detectedGame);
      }

      // Count genres from their questions
      if (q.detectedGenre && Array.isArray(q.detectedGenre)) {
        for (const genre of q.detectedGenre) {
          genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        }
      }
    }

    // Map achievement names to actual genre names that fetchRecommendations expects
    const achievementToGenreMap: { [key: string]: string } = {
      'actionAficionado': 'Action',
      'adventureAddict': 'Adventure',
      'rpgEnthusiast': 'RPG',
      'platformerPro': 'Platformer',
      'strategySpecialist': 'Strategy',
      'shooterSpecialist': 'Shooter',
      'puzzlePro': 'Puzzle',
      'racingRenegade': 'Racing',
      'racing': 'Racing',
      'fightingFanatic': 'Fighting',
      'sportsChampion': 'Sports',
      'horrorHero': 'Horror',
      'stealthExpert': 'Stealth',
      'simulationSpecialist': 'Simulation',
      'survivalSpecialist': 'Survival',
      'sandboxBuilder': 'Simulation', // Sandbox games often fall under Simulation
      'shootemUpSniper': 'Shoot em Up',
      'bossBuster': 'Action', // Boss battles are typically action games
      'rhythmMaster': 'Indie', // Rhythm games often indie
    };

    // Convert achievement names to genre names
    const genreNameCounts: { [key: string]: number } = {};
    for (const [achievementName, count] of Object.entries(genreCounts)) {
      const genreName = achievementToGenreMap[achievementName] || achievementName;
      genreNameCounts[genreName] = (genreNameCounts[genreName] || 0) + count;
    }

    // Determine primary genre(s) from question history
    const sortedGenres = Object.entries(genreNameCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([genre]) => genre);

    // Use the top 2-3 genres for variety, or default to Action-Adventure if no history
    let primaryGenres: string[] = [];
    if (sortedGenres.length > 0) {
      // Take top 2-3 genres for variety
      primaryGenres = sortedGenres.slice(0, 3);
    } else {
      // No genre data - try to infer from progress achievements
      const user = await User.findOne({ username });
      if (user?.progress) {
        const progress = user.progress;
        const progressGenreCounts: { [key: string]: number } = {
          'RPG': progress.rpgEnthusiast || 0,
          'Action': progress.actionAficionado || 0,
          'Adventure': progress.adventureAddict || 0,
          'Strategy': progress.strategySpecialist || 0,
          'Racing': progress.racingRenegade || 0,
        };
        const topProgressGenre = Object.entries(progressGenreCounts)
          .sort(([, a], [, b]) => b - a)
          .find(([, count]) => count > 0);
        if (topProgressGenre) {
          primaryGenres = [topProgressGenre[0]];
        }
      }
      
      // Final fallback
      if (primaryGenres.length === 0) {
        primaryGenres = ['Action-Adventure'];
      }
    }

    // Helper function to extract base game series name dynamically
    // Distinguishes between different games in a series (e.g., "Final Fantasy IX" vs "Final Fantasy VII")
    // But groups obvious sequels/episodes together (e.g., "Half-Life 2: Episode One" and "Half-Life 2: Episode Two")
    const extractSeriesName = (gameName: string): string => {
      // Step 1: Remove edition/remaster indicators (these don't make it a different game)
      let series = gameName
        .replace(/\s*\([^)]*\)/g, '') // Remove parenthetical content (years, subtitles)
        .replace(/\s*Game\s+of\s+the\s+Year\s+Edition/gi, '')
        .replace(/\s*Remastered/gi, '')
        .replace(/\s*Remaster/gi, '')
        .replace(/\s*Definitive\s+Edition/gi, '')
        .replace(/\s*Enhanced\s+Edition/gi, '')
        .replace(/\s*Ultimate\s+Edition/gi, '')
        .replace(/\s*Deluxe\s+Edition/gi, '')
        .replace(/\s*Complete\s+Edition/gi, '')
        .trim();
      
      // Step 2: Handle colons (usually separate main title from subtitle)
      // "The Legend of Zelda: Breath of the Wild" -> keep "The Legend of Zelda" + subtitle
      // "Half-Life 2: Episode One" -> group episodes together
      const colonIndex = series.indexOf(':');
      if (colonIndex > 0) {
        const beforeColon = series.substring(0, colonIndex).trim();
        const afterColon = series.substring(colonIndex + 1).trim();
        
        // Check if after colon is an episode/season/part (group these together)
        const episodePattern = /^(Episode|Season|Part|Chapter)\s+/i;
        if (episodePattern.test(afterColon)) {
          // Episodes/Seasons/Parts: group by the main title
          // "Half-Life 2: Episode One" -> "Half-Life 2"
          // "Half-Life 2: Episode Two" -> "Half-Life 2" (same series)
          series = beforeColon;
        } else {
          // Subtitle: keep both to distinguish different games
          // "The Legend of Zelda: Breath of the Wild" -> "The Legend of Zelda: Breath of the Wild"
          // "The Legend of Zelda: Ocarina of Time" -> "The Legend of Zelda: Ocarina of Time" (different)
          series = `${beforeColon}: ${afterColon}`;
        }
      }
      
      // Step 3: Keep numbers and Roman numerals - they distinguish different games in a series
      // "Final Fantasy IX" -> "Final Fantasy IX" (distinct from "Final Fantasy VII")
      // "Super Mario Galaxy 2" -> "Super Mario Galaxy 2" (distinct from "Super Mario Galaxy")
      // "Half-Life 2" -> "Half-Life 2" (distinct from "Half-Life")
      // Numbers and Roman numerals are kept as part of the series identifier
      
      // Step 4: Clean up and normalize
      let result = series.trim();
      result = result.replace(/\s+/g, ' '); // Multiple spaces to single space
      result = result.replace(/\s*-\s*/g, '-'); // Keep hyphens but normalize spacing
      
      return result || gameName; // Fallback to original if empty
    };

    // Fetch recommendations for each primary genre
    const allRecommendations: string[] = [];
    const seenGames = new Set<string>(); // Track specific games user has asked about (exclude these)
    const seenSeries = new Set<string>(); // Track series within THIS email only (prevents duplicates in same email)

    // Add games user has already asked about to exclusion list
    // Note: We only exclude the specific games, NOT the entire series
    // This allows different games from the same series to appear in future weekly emails
    gamesAskedAbout.forEach(game => {
      seenGames.add(game.toLowerCase());
      // We do NOT add series to seenSeries here - this allows series to appear in different weekly emails
      // seenSeries is only populated as we add recommendations to prevent duplicates within the same email
    });

    // Get recommendations for each genre (with weekly variation)
    const weekNumber = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 7)); // Week number for variation
    
    for (let i = 0; i < primaryGenres.length && allRecommendations.length < 8; i++) {
      const genre = primaryGenres[i];
      try {
        const genreRecs = await fetchRecommendations(genre, {
          currentPopular: true
        });

        // Filter out games user has already asked about
        // Note: We allow series to appear even if user asked about a different game in that series
        // (e.g., if user asked about "Half-Life", we can still recommend "Half-Life 2" in a future email)
        const filteredRecs = genreRecs.filter(game => {
          const gameLower = game.toLowerCase();
          
          // Only exclude if this specific game was asked about
          // Don't exclude entire series - allows series to appear in different weekly emails
          return !seenGames.has(gameLower);
        });

        // Add variation: use week number to offset which recommendations we pick
        const startIndex = (weekNumber + i) % Math.max(1, filteredRecs.length);
        const rotatedRecs = [
          ...filteredRecs.slice(startIndex),
          ...filteredRecs.slice(0, startIndex)
        ];

        // Add unique recommendations (ensuring each is from a different series)
        for (const rec of rotatedRecs) {
          if (allRecommendations.length >= 8) break;
          const recLower = rec.toLowerCase();
          const series = extractSeriesName(rec);
          const seriesLower = series.toLowerCase();
          
          // Only add if we haven't seen this game or this series
          if (!seenGames.has(recLower) && !seenSeries.has(seriesLower)) {
            allRecommendations.push(rec);
            seenGames.add(recLower);
            seenSeries.add(seriesLower);
          }
        }
      } catch (error) {
        console.error(`[Weekly Digest] Error fetching recommendations for genre ${genre}:`, error);
      }
    }

    // If we don't have enough recommendations, try a different genre
    if (allRecommendations.length < 4) {
      const fallbackGenres = ['Action-Adventure', 'RPG', 'Action', 'Adventure'];
      for (const genre of fallbackGenres) {
        if (allRecommendations.length >= 4) break;
        if (primaryGenres.includes(genre)) continue; // Skip if already tried

        try {
          const fallbackRecs = await fetchRecommendations(genre, {
            currentPopular: true
          });
          for (const rec of fallbackRecs) {
            if (allRecommendations.length >= 4) break;
            const recLower = rec.toLowerCase();
            const series = extractSeriesName(rec);
            const seriesLower = series.toLowerCase();
            
            // Only add if we haven't seen this game or this series
            if (!seenGames.has(recLower) && !seenSeries.has(seriesLower)) {
              allRecommendations.push(rec);
              seenGames.add(recLower);
              seenSeries.add(seriesLower);
            }
          }
        } catch (error) {
          console.error(`[Weekly Digest] Error with fallback genre ${genre}:`, error);
        }
      }
    }

    // Return 4-5 recommendations (varied each week)
    return allRecommendations.slice(0, 5);
  } catch (error) {
    console.error(`[Weekly Digest] Error getting game recommendations for ${username}:`, error);
    // Fallback to default recommendations
    try {
      return await fetchRecommendations('Action-Adventure', { currentPopular: true });
    } catch (fallbackError) {
      console.error('[Weekly Digest] Error with fallback recommendations:', fallbackError);
      return [];
    }
  }
}
