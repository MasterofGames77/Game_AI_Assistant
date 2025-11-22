import type { NextApiRequest, NextApiResponse } from 'next';
import connectToMongoDB from '../../utils/mongodb';
import Question from '../../models/Question';
import User from '../../models/User';
import mongoose from 'mongoose';
import { UserContextResponse } from '../../types';
import axios from 'axios';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UserContextResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username } = req.query;

  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: 'Username is required' });
  }

  try {
    // Connect to database
    if (mongoose.connection.readyState !== 1) {
      await connectToMongoDB();
    }

    // Get user's recent questions with detected games and genres
    const recentQuestions = await Question.find({ username })
      .sort({ timestamp: -1 })
      .limit(100) // Get last 100 questions for better pattern analysis
      .select('detectedGame detectedGenre timestamp questionCategory interactionType question')
      .lean();

    /**
     * Check if a title is a bundle, DLC, cosmetic pack, or expansion (not a base game)
     */
    const isBundleOrDLC = (title: string): boolean => {
      const lower = title.toLowerCase();
      const bundleIndicators = [
        'bundle',
        'expansion pass',
        'expansion pack',
        'dlc',
        'twin pack',
        'double pack',
        'collection',
        'cosmetic pack',
        'cosmetic',
        'pack',
        'edition',
        'remastered twin',
        '&',
        'and expansion',
        'season pass',
        'complete edition',
        'ultimate edition',
        'deluxe edition',
        'add-on',
        'addon',
        'expansion',
      ];
      
      return bundleIndicators.some(indicator => lower.includes(indicator));
    };

    /**
     * Extract base game title from DLC/bundle name
     * Example: "Saints Row: Going Commando Cosmetic Pack" -> "Saints Row"
     */
    const extractBaseGameFromDLC = (dlcTitle: string): string => {
      // Pattern: "Game Name: Subtitle Cosmetic Pack" -> "Game Name"
      // Pattern: "Game Name and Expansion Pass" -> "Game Name"
      // Pattern: "Game Name DLC" -> "Game Name"
      
      // Remove common DLC/pack suffixes
      let cleaned = dlcTitle
        .replace(/\s+and\s+.*?(?:expansion|pass|bundle|pack|dlc|cosmetic).*$/i, '')
        .replace(/\s+&\s+.*?(?:remastered|twin|double|pack).*$/i, '')
        .replace(/\s+(?:expansion|pass|bundle|pack|dlc|cosmetic|collection|remastered|edition).*$/i, '')
        .trim();
      
      // If it's a pattern like "Game: Subtitle Pack", extract just "Game"
      const colonMatch = cleaned.match(/^([^:]+):/);
      if (colonMatch && colonMatch[1]) {
        cleaned = colonMatch[1].trim();
      }
      
      // Only return if we extracted something meaningful (at least 5 chars)
      if (cleaned.length >= 5 && cleaned.length < dlcTitle.length * 0.8) {
        return cleaned;
      }
      
      // If extraction didn't work well, return original
      return dlcTitle;
    };

    /**
     * Verify if a detected game title exists in game databases
     * Returns true if it exists (including DLC), false if it doesn't exist at all
     */
    const verifyGameExists = async (gameTitle: string): Promise<boolean> => {
      if (!gameTitle || gameTitle.trim().length < 3) {
        return false;
      }

      try {
        const sanitizedTitle = gameTitle.trim();
        const lowerTitle = sanitizedTitle.toLowerCase();

        // Quick heuristic: Very short names (1-2 words, < 10 chars) are likely not games
        const wordCount = sanitizedTitle.split(/\s+/).length;
        if (wordCount === 1 && sanitizedTitle.length < 5) {
          // Single word, very short - likely a character/boss name
          return false;
        }

        // Try RAWG first (simpler API, no auth needed)
        try {
          const rawgUrl = `https://api.rawg.io/api/games?key=${process.env.RAWG_API_KEY}&search=${encodeURIComponent(sanitizedTitle)}&page_size=5`;
          const rawgResponse = await axios.get(rawgUrl, { timeout: 3000 });
          
          if (rawgResponse.data && rawgResponse.data.results && rawgResponse.data.results.length > 0) {
            // Check for exact or close match (DLC/packs are OK - user might have asked about them)
            const exactMatch = rawgResponse.data.results.find((g: any) => {
              const gameName = g.name.toLowerCase().trim();
              return gameName === lowerTitle || 
                     gameName.includes(lowerTitle) || 
                     lowerTitle.includes(gameName);
            });
            
            if (exactMatch) {
              return true; // Game/DLC exists in RAWG
            }
          }
        } catch (rawgError) {
          // RAWG failed, continue
        }

        // If RAWG didn't find it, it's likely not a real game/DLC
        return false;
      } catch (error) {
        // On error, be conservative and include it
        console.error(`Error verifying game "${gameTitle}":`, error);
        return true; // Default to true to avoid filtering out real games on API errors
      }
    };

    // Extract unique recent games with timestamps (before verification)
    const gamesMapWithTimestamps = new Map<string, Date>();
    for (const q of recentQuestions) {
      const game = (q as any).detectedGame;
      if (game && typeof game === 'string' && game.trim()) {
        const gameTrimmed = game.trim();
        const timestamp = (q as any).timestamp || new Date(0);
        // Keep the most recent timestamp for each game
        if (!gamesMapWithTimestamps.has(gameTrimmed) || gamesMapWithTimestamps.get(gameTrimmed)! < timestamp) {
          gamesMapWithTimestamps.set(gameTrimmed, timestamp);
        }
      }
    }

    // Verify all unique games in parallel to filter out boss/character names
    const uniqueGames = Array.from(gamesMapWithTimestamps.keys());
    const verificationResults = await Promise.all(
      uniqueGames.map(async (game) => ({
        game,
        isValid: await verifyGameExists(game),
        isDLC: isBundleOrDLC(game),
        timestamp: gamesMapWithTimestamps.get(game)!
      }))
    );

    // Filter to only valid base games (exclude DLC/packs to avoid confusion)
    // Only include games that were directly detected as base games
    // This ensures we only show games the user actually asked about
    const gamesMap = new Map<string, Date>();
    for (const result of verificationResults) {
      if (result.isValid && !result.isDLC) {
        // Only include base games (not DLC/packs)
        // This prevents extracted base games from appearing when user only asked about DLC
        if (!gamesMap.has(result.game) || gamesMap.get(result.game)! < result.timestamp) {
          gamesMap.set(result.game, result.timestamp);
        }
      }
      // Skip DLC/packs entirely - if user asked about DLC, they should ask about the base game separately
    }

    // Sort by most recent and get top 5
    const recentGames = Array.from(gamesMap.entries())
      .sort((a, b) => b[1].getTime() - a[1].getTime())
      .slice(0, 5)
      .map(([game]) => game);

    // Extract and count genres
    const genreCounts = new Map<string, number>();
    for (const q of recentQuestions) {
      const genres = (q as any).detectedGenre;
      if (Array.isArray(genres)) {
        for (const genre of genres) {
          if (genre && typeof genre === 'string') {
            genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
          }
        }
      }
    }

    // Get top 3 genres by frequency
    const topGenres = Array.from(genreCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([genre]) => genre);

    // Fetch user preferences from User model
    let preferences = undefined;
    try {
      const user = await User.findOne({ username })
        .select('personalized')
        .lean();

      if (user && (user as any).personalized?.preferenceProfile) {
        const profile = (user as any).personalized.preferenceProfile;
        preferences = {
          dominantGenres: profile.dominantGenres && profile.dominantGenres.length > 0
            ? profile.dominantGenres
            : undefined,
          learningStyle: profile.learningStyle || undefined,
          difficultyPreference: profile.difficultyPreference || undefined,
          playstyleTags: profile.playstyleTags && profile.playstyleTags.length > 0
            ? profile.playstyleTags
            : undefined,
          recentInterests: profile.recentInterests && profile.recentInterests.length > 0
            ? profile.recentInterests
            : undefined,
        };

        // Remove undefined fields
        if (Object.values(preferences).every(v => v === undefined)) {
          preferences = undefined;
        }
      }
    } catch (prefError) {
      // If preferences fetch fails, continue without them (not critical)
      console.error('Error fetching user preferences:', prefError);
    }

    // Calculate activity patterns
    let activity = undefined;
    if (recentQuestions.length > 0) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const lastQuestion = recentQuestions[0]?.timestamp;
      const questionsToday = recentQuestions.filter((q: any) => {
        const qDate = new Date(q.timestamp);
        return qDate >= today;
      }).length;

      const questionsThisWeek = recentQuestions.filter((q: any) => {
        const qDate = new Date(q.timestamp);
        return qDate >= weekAgo;
      }).length;

      // Calculate peak activity hours (hours 0-23 when user asks most questions)
      const hourCounts = new Map<number, number>();
      recentQuestions.forEach((q: any) => {
        if (q.timestamp) {
          const hour = new Date(q.timestamp).getHours();
          hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
        }
      });

      // Get top 3 peak hours
      const peakActivityHours = Array.from(hourCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([hour]) => hour);

      activity = {
        lastQuestionTime: lastQuestion ? new Date(lastQuestion).toISOString() : undefined,
        questionsToday: questionsToday > 0 ? questionsToday : undefined,
        questionsThisWeek: questionsThisWeek > 0 ? questionsThisWeek : undefined,
        peakActivityHours: peakActivityHours.length > 0 ? peakActivityHours : undefined,
      };

      // Remove undefined fields
      if (Object.values(activity).every(v => v === undefined)) {
        activity = undefined;
      }
    }

    // Calculate question patterns
    let questionPatterns = undefined;
    if (recentQuestions.length > 0) {
      // Count question categories
      const categoryCounts = new Map<string, number>();
      const interactionTypeCounts = new Map<string, number>();
      const questionTypeKeywords: string[] = [];

      recentQuestions.forEach((q: any) => {
        // Count categories
        if (q.questionCategory && typeof q.questionCategory === 'string') {
          categoryCounts.set(
            q.questionCategory,
            (categoryCounts.get(q.questionCategory) || 0) + 1
          );
        }

        // Count interaction types
        if (q.interactionType && typeof q.interactionType === 'string') {
          interactionTypeCounts.set(
            q.interactionType,
            (interactionTypeCounts.get(q.interactionType) || 0) + 1
          );
        }

        // Extract question type keywords from recent questions (last 10)
        if (q.question && typeof q.question === 'string' && recentQuestions.indexOf(q) < 10) {
          const questionLower = q.question.toLowerCase();
          if (questionLower.includes('how to') || questionLower.includes('how do')) {
            questionTypeKeywords.push('how to');
          } else if (questionLower.includes('best') || questionLower.includes('top')) {
            questionTypeKeywords.push('best');
          } else if (questionLower.includes('tip') || questionLower.includes('advice')) {
            questionTypeKeywords.push('tips');
          } else if (questionLower.includes('build') || questionLower.includes('setup')) {
            questionTypeKeywords.push('build');
          } else if (questionLower.includes('beat') || questionLower.includes('defeat')) {
            questionTypeKeywords.push('beat');
          } else if (questionLower.includes('secret') || questionLower.includes('hidden')) {
            questionTypeKeywords.push('secrets');
          }
        }
      });

      // Get top categories and interaction types
      const commonCategories = Array.from(categoryCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([category]) => category);

      const commonInteractionTypes = Array.from(interactionTypeCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([type]) => type);

      // Get unique question type keywords
      const recentQuestionTypes = Array.from(new Set(questionTypeKeywords));

      questionPatterns = {
        commonCategories: commonCategories.length > 0 ? commonCategories : undefined,
        commonInteractionTypes: commonInteractionTypes.length > 0 ? commonInteractionTypes : undefined,
        recentQuestionTypes: recentQuestionTypes.length > 0 ? recentQuestionTypes : undefined,
      };

      // Remove undefined fields
      if (Object.values(questionPatterns).every(v => v === undefined)) {
        questionPatterns = undefined;
      }
    }

    return res.status(200).json({
      recentGames: recentGames.length > 0 ? recentGames : undefined,
      topGenres: topGenres.length > 0 ? topGenres : undefined,
      preferences,
      activity,
      questionPatterns,
    });

  } catch (error) {
    console.error('Error in user-context API:', error);
    return res.status(500).json({
      error: 'Failed to fetch user context'
    });
  }
}

