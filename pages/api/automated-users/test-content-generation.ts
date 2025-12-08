import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToWingmanDB } from '../../../utils/databaseConnections';
import User from '../../../models/User';
import { generateCommonGamerPost, generateExpertGamerReply, UserPreferences } from '../../../utils/automatedContentGenerator';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { testType, username, gameTitle, genre, originalPost, originalPostAuthor } = req.body;

    if (!testType || !username) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['testType', 'username'],
        optional: ['gameTitle', 'genre', 'originalPost', 'originalPostAuthor']
      });
    }

    // Connect to database
    await connectToWingmanDB();

    // Get user and their gamer profile
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ error: `User ${username} not found` });
    }

    if (!user.gamerProfile) {
      return res.status(400).json({ 
        error: `User ${username} does not have a gamer profile`,
        suggestion: 'Make sure the user was created using /api/automated-users/create-gamers'
      });
    }

    // Build user preferences with gamer profile
    const genres: string[] = user.gamerProfile.favoriteGames.map((game: any) => String(game.genre));
    const uniqueGenresSet = new Set<string>(genres);
    const uniqueGenres: string[] = Array.from(uniqueGenresSet);
    
    const singlePlayerGenres = ['RPG', 'Adventure', 'Simulation', 'Puzzle', 'Platformer', 'Metroidvania'];
    const multiplayerGenres = ['Racing', 'Battle Royale', 'Fighting', 'First-Person Shooter', 'Sandbox'];
    
    const hasSinglePlayer = uniqueGenres.some((g: string) => singlePlayerGenres.includes(g));
    const hasMultiplayer = uniqueGenres.some((g: string) => multiplayerGenres.includes(g));
    
    const focus = hasSinglePlayer && !hasMultiplayer 
      ? 'single-player' 
      : hasMultiplayer && !hasSinglePlayer 
      ? 'multiplayer' 
      : 'single-player';

    const userPreferences: UserPreferences = {
      genres: uniqueGenres,
      focus: focus as 'single-player' | 'multiplayer',
      gamerProfile: {
        type: user.gamerProfile.type,
        skillLevel: user.gamerProfile.skillLevel,
        favoriteGames: user.gamerProfile.favoriteGames.map((game: any) => ({
          gameTitle: game.gameTitle,
          genre: game.genre,
          hoursPlayed: game.hoursPlayed,
          achievements: game.achievements || [],
          ...(user.gamerProfile.type === 'common' 
            ? { currentStruggles: game.currentStruggles || [] }
            : { expertise: game.expertise || [] }
          )
        })),
        personality: {
          traits: user.gamerProfile.personality.traits,
          communicationStyle: user.gamerProfile.personality.communicationStyle
        },
        ...(user.gamerProfile.helpsCommonGamer 
          ? { helpsCommonGamer: user.gamerProfile.helpsCommonGamer }
          : {}
        )
      }
    };

    // Default game selection if not provided
    const defaultGame = user.gamerProfile.favoriteGames[0];
    const testGameTitle = gameTitle || defaultGame?.gameTitle || 'Portal 2';
    const testGenre = genre || defaultGame?.genre || 'Puzzle';

    if (testType === 'common') {
      // Test COMMON gamer post generation
      if (user.gamerProfile.type !== 'common') {
        return res.status(400).json({ 
          error: `User ${username} is not a COMMON gamer`,
          userType: user.gamerProfile.type,
          expected: 'common'
        });
      }

      try {
        const postContent = await generateCommonGamerPost({
          gameTitle: testGameTitle,
          genre: testGenre,
          userPreferences,
          username,
          forumTopic: 'General Discussion',
          forumCategory: 'general',
          previousPosts: [],
          gamerProfile: userPreferences.gamerProfile!
        });

        return res.status(200).json({
          success: true,
          testType: 'common',
          username,
          userProfile: {
            type: user.gamerProfile.type,
            skillLevel: user.gamerProfile.skillLevel,
            personality: user.gamerProfile.personality
          },
          game: {
            gameTitle: testGameTitle,
            genre: testGenre
          },
          generatedPost: postContent,
          message: 'COMMON gamer post generated successfully'
        });
      } catch (error) {
        return res.status(500).json({
          success: false,
          error: 'Failed to generate COMMON gamer post',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error instanceof Error ? error.stack : undefined
        });
      }
    } else if (testType === 'expert') {
      // Test EXPERT gamer reply generation
      if (user.gamerProfile.type !== 'expert') {
        return res.status(400).json({ 
          error: `User ${username} is not an EXPERT gamer`,
          userType: user.gamerProfile.type,
          expected: 'expert'
        });
      }

      // Need original post and author for EXPERT reply
      const testOriginalPost = originalPost || `I'm stuck on Chapter 8 of ${testGameTitle} and can't figure out how to solve this puzzle. I've tried everything but nothing works!`;
      const testOriginalAuthor = originalPostAuthor || user.gamerProfile.helpsCommonGamer || 'PixelPuzzler';

      try {
        const replyContent = await generateExpertGamerReply({
          gameTitle: testGameTitle,
          genre: testGenre,
          originalPost: testOriginalPost,
          originalPostAuthor: testOriginalAuthor,
          forumTopic: 'General Discussion',
          forumCategory: 'general',
          gamerProfile: userPreferences.gamerProfile!,
          username,
          commonGamerUsername: testOriginalAuthor
        });

        return res.status(200).json({
          success: true,
          testType: 'expert',
          username,
          userProfile: {
            type: user.gamerProfile.type,
            skillLevel: user.gamerProfile.skillLevel,
            helpsCommonGamer: user.gamerProfile.helpsCommonGamer,
            personality: user.gamerProfile.personality
          },
          game: {
            gameTitle: testGameTitle,
            genre: testGenre
          },
          originalPost: {
            author: testOriginalAuthor,
            content: testOriginalPost
          },
          generatedReply: replyContent,
          message: 'EXPERT gamer reply generated successfully'
        });
      } catch (error) {
        return res.status(500).json({
          success: false,
          error: 'Failed to generate EXPERT gamer reply',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error instanceof Error ? error.stack : undefined
        });
      }
    } else {
      return res.status(400).json({ 
        error: 'Invalid testType',
        validTypes: ['common', 'expert']
      });
    }
  } catch (error) {
    console.error('Error testing content generation:', error);
    return res.status(500).json({
      error: 'Failed to test content generation',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

