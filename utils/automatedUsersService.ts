import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { generateQuestion, generateForumPost, UserPreferences } from './automatedContentGenerator';
import { findGameImage, getRandomGameImage, recordImageUsage } from './automatedImageService';
import { containsOffensiveContent } from './contentModeration';
import { GameList, ActivityResult } from '../types';

/**
 * Load game list for a user based on their preferences
 */
function loadGameList(userPreferences: UserPreferences): { games: string[]; genres: string[] } {
  const isSinglePlayer = userPreferences.focus === 'single-player';
  const gameListFile = isSinglePlayer ? 'single-player.json' : 'multiplayer.json';
  const gameListPath = path.join(process.cwd(), 'data', 'automated-users', gameListFile);
  
  try {
    const content = fs.readFileSync(gameListPath, 'utf-8');
    const gameList: GameList = JSON.parse(content);
    
    // Flatten all games from all genres
    const allGames: string[] = [];
    const genres: string[] = [];
    
    for (const [genre, games] of Object.entries(gameList)) {
      genres.push(genre);
      allGames.push(...games);
    }
    
    return { games: allGames, genres };
  } catch (error) {
    console.error(`Error loading game list from ${gameListFile}:`, error);
    return { games: [], genres: [] };
  }
}

/**
 * Select a random game from the user's preferred genres
 */
function selectRandomGame(userPreferences: UserPreferences): { gameTitle: string; genre: string } | null {
  const { games, genres } = loadGameList(userPreferences);
  
  if (games.length === 0) {
    return null;
  }
  
  const randomGame = games[Math.floor(Math.random() * games.length)];
  
  // Find which genre this game belongs to
  const gameListPath = path.join(
    process.cwd(),
    'data',
    'automated-users',
    userPreferences.focus === 'single-player' ? 'single-player.json' : 'multiplayer.json'
  );
  
  try {
    const content = fs.readFileSync(gameListPath, 'utf-8');
    const gameList: GameList = JSON.parse(content);
    
    for (const [genre, genreGames] of Object.entries(gameList)) {
      if (genreGames.includes(randomGame)) {
        return { gameTitle: randomGame, genre };
      }
    }
  } catch (error) {
    console.error('Error finding game genre:', error);
  }
  
  // Fallback: return game with first genre
  return { gameTitle: randomGame, genre: genres[0] || 'unknown' };
}

/**
 * Ask a question to Video Game Wingman
 */
export async function askQuestion(
  username: string,
  userPreferences: UserPreferences
): Promise<ActivityResult> {
  try {
    // Select a random game
    const gameSelection = selectRandomGame(userPreferences);
    if (!gameSelection) {
      return {
        success: false,
        message: 'No games available for user preferences',
        error: 'No games found'
      };
    }
    
    const { gameTitle, genre } = gameSelection;
    
    // Generate natural question
    const question = await generateQuestion({
      gameTitle,
      genre,
      userPreferences
    });
    
    // Check content moderation
    const contentCheck = await containsOffensiveContent(question, username);
    if (contentCheck.isOffensive) {
      return {
        success: false,
        message: 'Generated question failed content moderation',
        error: 'Content moderation failed',
        details: { offendingWords: contentCheck.offendingWords }
      };
    }
    
    // Call assistant API
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await axios.post(
      `${baseUrl}/api/assistant`,
      {
        username,
        question,
        userId: `auto-${username.toLowerCase()}-${Date.now()}`
      },
      {
        timeout: 60000, // 60 second timeout
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    return {
      success: true,
      message: 'Question asked successfully',
      details: {
        gameTitle,
        genre,
        question,
        answer: response.data.answer
      }
    };
  } catch (error) {
    console.error('Error asking question:', error);
    return {
      success: false,
      message: 'Failed to ask question',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Create a forum for a game
 */
async function createForumForGame(
  username: string,
  gameTitle: string,
  genre: string
): Promise<{ forumId: string; forumTitle: string } | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    
    // Generate a natural forum title based on the game
    const forumTitle = `${gameTitle} - General Discussion`;
    
    // Select appropriate category based on genre
    const categoryMap: { [key: string]: string } = {
      'rpg': 'gameplay',
      'adventure': 'gameplay',
      'simulation': 'gameplay',
      'puzzle': 'gameplay',
      'platformer': 'gameplay',
      'racing': 'gameplay',
      'battle-royale': 'gameplay',
      'fighting': 'gameplay',
      'sandbox': 'gameplay',
      'fps': 'gameplay'
    };
    
    const category = categoryMap[genre.toLowerCase()] || 'general';
    
    // Create forum via API
    const response = await axios.post(
      `${baseUrl}/api/createForum`,
      {
        title: forumTitle,
        gameTitle,
        category,
        isPrivate: false,
        username
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${username}` // Simple auth for automated users
        }
      }
    );
    
    if (response.data.forum) {
      return {
        forumId: response.data.forum.forumId,
        forumTitle: response.data.forum.title || forumTitle
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error creating forum:', error);
    return null;
  }
}

/**
 * Create a forum post
 */
export async function createForumPost(
  username: string,
  userPreferences: UserPreferences
): Promise<ActivityResult> {
  try {
    // Select a random game first
    const gameSelection = selectRandomGame(userPreferences);
    if (!gameSelection) {
      return {
        success: false,
        message: 'No games available for user preferences',
        error: 'No games found'
      };
    }
    
    const { gameTitle, genre } = gameSelection;
    
    // Get list of active forums
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    let forumsResponse;
    try {
      forumsResponse = await axios.get(
        `${baseUrl}/api/getAllForums?username=${username}`,
        {
          headers: {
            'username': username
          }
        }
      );
    } catch (error) {
      console.error('Error fetching forums:', error);
      forumsResponse = { data: { forums: [] } };
    }
    
    const forums = forumsResponse.data.forums || [];
    
    // Try to find a forum for this specific game
    let targetForum = forums.find((f: any) => 
      f.gameTitle?.toLowerCase() === gameTitle.toLowerCase() ||
      f.title?.toLowerCase().includes(gameTitle.toLowerCase())
    );
    
    let forumId: string;
    let forumTitle: string;
    
    // If no forum exists for this game, create one
    if (!targetForum) {
      console.log(`No forum found for ${gameTitle}, creating new forum...`);
      const newForum = await createForumForGame(username, gameTitle, genre);
      
      if (!newForum) {
        return {
          success: false,
          message: 'Failed to create forum for game',
          error: 'Forum creation failed'
        };
      }
      
      forumId = newForum.forumId;
      forumTitle = newForum.forumTitle;
    } else {
      // Use existing forum
      forumId = targetForum.forumId || targetForum._id;
      forumTitle = targetForum.title || targetForum.gameTitle || 'General Discussion';
    }
    
    // Generate natural forum post
    const postContent = await generateForumPost({
      gameTitle,
      genre,
      userPreferences,
      forumTopic: forumTitle
    });
    
    // Check content moderation
    const contentCheck = await containsOffensiveContent(postContent, username);
    if (contentCheck.isOffensive) {
      return {
        success: false,
        message: 'Generated post failed content moderation',
        error: 'Content moderation failed',
        details: { offendingWords: contentCheck.offendingWords }
      };
    }
    
    // Find image for the game (excluding images already used by this user for this game)
    let imagePath: string | null = null;
    let attachments: any[] = [];
    
    const gameImage = getRandomGameImage(gameTitle, username);
    if (gameImage) {
      // Image found - record that this user has used this image for this game
      recordImageUsage(username, gameTitle, gameImage);
      
      // Image found - need to upload it via the upload endpoint
      // For now, we'll post without image if upload fails
      // (In production, you'd need to handle file upload properly)
      imagePath = gameImage;
      
      // Note: Image upload requires actual file, not just path
      // This would need to be handled differently in production
      // For now, we'll post without image attachment
    }
    
    // Post to forum
    const postResponse = await axios.post(
      `${baseUrl}/api/addPostToForum`,
      {
        forumId,
        message: postContent,
        username,
        attachments: attachments // Empty for now, can be added later
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    return {
      success: true,
      message: 'Forum post created successfully',
      details: {
        forumId,
        forumTitle,
        gameTitle,
        genre,
        postContent,
        imageUsed: imagePath !== null,
        postId: postResponse.data.post?._id
      }
    };
  } catch (error) {
    console.error('Error creating forum post:', error);
    return {
      success: false,
      message: 'Failed to create forum post',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Like a post in a forum
 */
export async function likePost(
  username: string,
  forumId: string,
  postId: string
): Promise<ActivityResult> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    
    const response = await axios.post(
      `${baseUrl}/api/likePost`,
      {
        forumId,
        postId,
        username
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    return {
      success: true,
      message: 'Post liked successfully',
      details: {
        forumId,
        postId,
        likes: response.data.post?.metadata?.likes
      }
    };
  } catch (error) {
    console.error('Error liking post:', error);
    return {
      success: false,
      message: 'Failed to like post',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get user preferences from database
 */
export async function getUserPreferences(username: string): Promise<UserPreferences | null> {
  try {
    // For now, return hardcoded preferences based on username
    // In the future, this could be stored in the database
    if (username === 'MysteriousMrEnter') {
      return {
        genres: ['RPG', 'Adventure', 'Simulation', 'Puzzle', 'Platformer'],
        focus: 'single-player'
      };
    } else if (username === 'WaywardJammer') {
      return {
        genres: ['Racing', 'Battle Royale', 'Fighting', 'First-Person Shooter', 'Sandbox'],
        focus: 'multiplayer'
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user preferences:', error);
    return null;
  }
}

