import axios, { AxiosError } from 'axios';
import fs from 'fs';
import path from 'path';
import { generateQuestion, generateForumPost, generatePostReply, generateCommonGamerPost, generateExpertGamerReply, UserPreferences } from './automatedContentGenerator';
import { getRandomGameImage, recordImageUsage } from './automatedImageService';
import { containsOffensiveContent } from './contentModeration';
import { GameList, ActivityResult } from '../types';
import connectToMongoDB from './mongodb';
import { connectToWingmanDB } from './databaseConnections';
import Forum from '../models/Forum';
import User from '../models/User';
import mongoose from 'mongoose';

/**
 * Helper function to determine if an error is retryable
 * Retries on timeouts, network errors, and 5xx server errors (transient failures)
 */
function isRetryableError(error: unknown): boolean {
  if (!error) return false;
  
  // Check for axios error structure
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    const responseStatus = axiosError.response?.status;
    
    // Don't retry on client errors (4xx)
    if (responseStatus && responseStatus >= 400 && responseStatus < 500) {
      return false; // Client errors are not retryable
    }
    
    // Retry on network errors, timeouts, and server errors
    const errorCode = axiosError.code || '';
    const errorMessage = axiosError.message?.toLowerCase() || '';
    
    if (
      errorCode === 'ECONNABORTED' ||
      errorCode === 'ETIMEDOUT' ||
      errorCode === 'ECONNREFUSED' ||
      errorCode === 'ENOTFOUND' ||
      errorCode === 'ECONNRESET' ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('network') ||
      (responseStatus && responseStatus >= 500 && responseStatus < 600)
    ) {
      return true;
    }
  }
  
  // Check for error code in generic errors
  if (typeof error === 'object' && 'code' in error) {
    const code = String((error as any).code || '').toLowerCase();
    if (
      code === 'econnaborted' ||
      code === 'etimedout' ||
      code === 'econnrefused' ||
      code === 'enotfound' ||
      code === 'econnreset'
    ) {
      return true;
    }
  }
  
  // Default: don't retry on unknown errors (could be client errors)
  return false;
}

/**
 * Retry a function with exponential backoff
 * @param fn - Function to retry
 * @param maxRetries - Maximum number of retries (default: 3)
 * @param baseDelayMs - Base delay in milliseconds (default: 1000)
 * @param operation - Operation name for logging
 * @returns Result of the function or throws error if all retries fail
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000,
  operation: string = 'operation'
): Promise<T> {
  let lastError: Error | unknown;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      
      // If this is a retry attempt, log success
      if (attempt > 0) {
        console.log(`[Automated Users Retry] ${operation} succeeded on attempt ${attempt + 1}/${maxRetries + 1}`, {
          operation,
          attempt: attempt + 1,
          totalAttempts: maxRetries + 1,
          timestamp: new Date().toISOString()
        });
      }
      
      return result;
    } catch (error) {
      lastError = error;
      
      // Don't retry on last attempt
      if (attempt >= maxRetries) {
        break;
      }
      
      // Determine if error is retryable
      const isRetryable = isRetryableError(error);
      
      if (!isRetryable) {
        // Non-retryable error (e.g., 4xx client errors)
        console.error(`[Automated Users Retry] ${operation} failed with non-retryable error:`, {
          operation,
          error: error instanceof Error ? error.message : String(error),
          attempt: attempt + 1,
          timestamp: new Date().toISOString()
        });
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = baseDelayMs * Math.pow(2, attempt);
      
      console.warn(`[Automated Users Retry] ${operation} failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`, {
        operation,
        error: error instanceof Error ? error.message : String(error),
        attempt: attempt + 1,
        maxRetries,
        delay,
        timestamp: new Date().toISOString()
      });
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // All retries exhausted
  throw lastError;
}

/**
 * Helper function to add timeout to promises
 * Prevents API calls from hanging indefinitely
 */
function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${operation} timed out after ${timeoutMs}ms`)),
        timeoutMs
      )
    ),
  ]);
}

/**
 * Improved error logging with request context
 * Provides structured logging with all relevant information
 */
function logApiError(
  error: unknown,
  context: {
    operation: string;
    username?: string;
    url?: string;
    method?: string;
    requestData?: any;
    timeout?: number;
  }
): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const isTimeout = errorMessage.includes('timeout') || 
                   errorMessage.includes('ECONNABORTED') ||
                   errorMessage.includes('ETIMEDOUT');
  
  const logData: any = {
    operation: context.operation,
    error: errorMessage,
    timestamp: new Date().toISOString(),
    isTimeout
  };
  
  // Add context fields
  if (context.username) logData.username = context.username;
  if (context.url) logData.url = context.url;
  if (context.method) logData.method = context.method;
  if (context.timeout) logData.timeout = `${context.timeout}ms`;
  
  // Add axios-specific error details
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    logData.status = axiosError.response?.status;
    logData.statusText = axiosError.response?.statusText;
    logData.responseData = axiosError.response?.data;
    logData.code = axiosError.code;
    logData.config = {
      url: axiosError.config?.url,
      method: axiosError.config?.method,
      timeout: axiosError.config?.timeout
    };
  }
  
  // Add stack trace for errors
  if (error instanceof Error) {
    logData.stack = error.stack;
  }
  
  // Add timeout-specific message
  if (isTimeout) {
    logData.timeoutMessage = `Request timed out after ${context.timeout || 'unknown'}ms. The server may be overloaded or the network connection is slow.`;
  }
  
  // Log with appropriate level
  if (isTimeout) {
    console.error(`[Automated Users API] ${context.operation} - TIMEOUT`, logData);
  } else if (axios.isAxiosError(error) && (error as AxiosError).response?.status && (error as AxiosError).response!.status >= 500) {
    console.error(`[Automated Users API] ${context.operation} - SERVER ERROR`, logData);
  } else {
    console.error(`[Automated Users API] ${context.operation} - ERROR`, logData);
  }
}

/**
 * Get the base URL for API calls
 * On Heroku/server-side, try to use the app URL if available, otherwise use localhost
 * For local development, use NEXT_PUBLIC_BASE_URL or default to localhost:3000
 */
function getBaseUrl(): string {
  // On Heroku, try to use the app URL first (if set), otherwise use localhost with PORT
  if (process.env.NODE_ENV === 'production') {
    // Try Heroku app URL first (if available)
    if (process.env.NEXT_PUBLIC_BASE_URL && process.env.NEXT_PUBLIC_BASE_URL.includes('herokuapp.com')) {
      return process.env.NEXT_PUBLIC_BASE_URL;
    }
    // Fallback to localhost with PORT
    const port = process.env.PORT || 3000;
    return `http://localhost:${port}`;
  }
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
}

/**
 * Load game list for a user based on their preferences
 * InterdimensionalHipster can access both single-player and multiplayer games
 */
function loadGameList(userPreferences: UserPreferences): { games: string[]; genres: string[] } {
  // Check if this is InterdimensionalHipster (has both single-player and multiplayer genres)
  const isInterdimensionalHipster = userPreferences.genres.length > 5 && 
    userPreferences.genres.some(g => ['RPG', 'Adventure', 'Simulation', 'Puzzle', 'Platformer', 'Action', 'Horror', 'Stealth', 'Metroidvania'].includes(g)) &&
    userPreferences.genres.some(g => ['Racing', 'Battle Royale', 'Fighting', 'First-Person Shooter', 'Sandbox', 'FPS', 'MOBA', 'MMORPG', 'Sports'].includes(g));
  
  if (isInterdimensionalHipster) {
    // Load both single-player and multiplayer games
    try {
      const singlePlayerPath = path.join(process.cwd(), 'data', 'automated-users', 'single-player.json');
      const multiplayerPath = path.join(process.cwd(), 'data', 'automated-users', 'multiplayer.json');
      
      const singlePlayerContent = fs.readFileSync(singlePlayerPath, 'utf-8');
      const multiplayerContent = fs.readFileSync(multiplayerPath, 'utf-8');
      
      const singlePlayerList: GameList = JSON.parse(singlePlayerContent);
      const multiplayerList: GameList = JSON.parse(multiplayerContent);
      
      const allGames: string[] = [];
      const genres: string[] = [];
      
      // Add single-player games
      for (const [genre, games] of Object.entries(singlePlayerList)) {
        genres.push(genre);
        allGames.push(...games);
      }
      
      // Add multiplayer games
      for (const [genre, games] of Object.entries(multiplayerList)) {
        if (!genres.includes(genre)) {
          genres.push(genre);
        }
        allGames.push(...games);
      }
      
      return { games: allGames, genres };
    } catch (error) {
      console.error('Error loading game lists for InterdimensionalHipster:', error);
      return { games: [], genres: [] };
    }
  }
  
  // For other users, use the standard logic
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
  // Check if this is InterdimensionalHipster (has both single-player and multiplayer genres)
  const isInterdimensionalHipster = userPreferences.genres.length > 5 && 
    userPreferences.genres.some(g => ['RPG', 'Adventure', 'Simulation', 'Puzzle', 'Platformer', 'Action', 'Horror', 'Stealth', 'Metroidvania'].includes(g)) &&
    userPreferences.genres.some(g => ['Racing', 'Battle Royale', 'Fighting', 'First-Person Shooter', 'Sandbox', 'FPS', 'MOBA', 'Sports'].includes(g));
  
  if (isInterdimensionalHipster) {
    // Check both game lists
    try {
      const singlePlayerPath = path.join(process.cwd(), 'data', 'automated-users', 'single-player.json');
      const multiplayerPath = path.join(process.cwd(), 'data', 'automated-users', 'multiplayer.json');
      
      const singlePlayerContent = fs.readFileSync(singlePlayerPath, 'utf-8');
      const multiplayerContent = fs.readFileSync(multiplayerPath, 'utf-8');
      
      const singlePlayerList: GameList = JSON.parse(singlePlayerContent);
      const multiplayerList: GameList = JSON.parse(multiplayerContent);
      
      // Check single-player games first
      for (const [genre, genreGames] of Object.entries(singlePlayerList)) {
        if (genreGames.includes(randomGame)) {
          return { gameTitle: randomGame, genre };
        }
      }
      
      // Check multiplayer games
      for (const [genre, genreGames] of Object.entries(multiplayerList)) {
        if (genreGames.includes(randomGame)) {
          return { gameTitle: randomGame, genre };
        }
      }
    } catch (error) {
      console.error('Error finding game genre for InterdimensionalHipster:', error);
    }
  } else {
    // For other users, use the standard logic
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
    await connectToMongoDB();
    
    // Fetch previous questions from ALL automated users to ensure variety
    const automatedUsers = ['MysteriousMrEnter', 'WaywardJammer', 'InterdimensionalHipster'];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    let previousQuestions: Array<{ question: string; gameTitle: string; timestamp: Date; username: string }> = [];
    let gamesAskedAbout: { [gameTitle: string]: number } = {};
    let questionTypes: { [type: string]: number } = {};
    
    try {
      const Question = (await import('../models/Question')).default;
      const questionDocs = await Question.find({
        username: { $in: automatedUsers },
        timestamp: { $gte: thirtyDaysAgo }
      })
      .sort({ timestamp: -1 })
      .limit(100)
      .lean() as any[];
      
      previousQuestions = questionDocs.map(q => ({
        question: q.question || '',
        gameTitle: q.detectedGame || 'Unknown',
        timestamp: new Date(q.timestamp),
        username: q.username
      }));
      
      // Track which games have been asked about and how many times
      previousQuestions.forEach(q => {
        const gameLower = q.gameTitle.toLowerCase();
        gamesAskedAbout[gameLower] = (gamesAskedAbout[gameLower] || 0) + 1;
        
        // Track question types (How, What, When, Which, Who, Where)
        const firstWord = q.question.trim().split(' ')[0]?.toLowerCase() || '';
        if (['how', 'what', 'when', 'which', 'who', 'where'].includes(firstWord)) {
          questionTypes[firstWord] = (questionTypes[firstWord] || 0) + 1;
        }
      });
      
      console.log(`[ASK QUESTION] Found ${previousQuestions.length} previous questions from automated users`);
      console.log(`[ASK QUESTION] Games asked about: ${Object.keys(gamesAskedAbout).length} unique games`);
      console.log(`[ASK QUESTION] Question types: ${JSON.stringify(questionTypes)}`);
    } catch (error) {
      console.error('[ASK QUESTION] Error fetching previous questions:', error);
      // Continue even if we can't fetch previous questions
    }
    
    // Load available games
    const { games } = loadGameList(userPreferences);
    
    // Prioritize games that haven't been asked about recently (70% chance)
    // Or games that have been asked about fewer times
    const shouldPrioritizeNewGames = Math.random() < 0.7;
    
    let gameSelection: { gameTitle: string; genre: string } | null = null;
    
    if (shouldPrioritizeNewGames && games.length > 0) {
      // Find games that haven't been asked about (or asked about less frequently)
      const gamesNotAskedAbout = games.filter(game => {
        const gameLower = game.toLowerCase();
        const askCount = gamesAskedAbout[gameLower] || 0;
        // Prioritize games with 0-2 questions (not asked about much)
        return askCount < 3;
      });
      
      if (gamesNotAskedAbout.length > 0) {
        // Select from games that haven't been asked about much
        const randomGame = gamesNotAskedAbout[Math.floor(Math.random() * gamesNotAskedAbout.length)];
        const gameGenre = determineGenreFromGame(randomGame);
        if (randomGame && gameGenre) {
          gameSelection = { gameTitle: randomGame, genre: gameGenre };
          console.log(`[ASK QUESTION] Selected game NOT asked about recently: ${randomGame}`);
        }
      }
    }
    
    // Fallback: select random game from preferences
    if (!gameSelection) {
      gameSelection = selectRandomGame(userPreferences);
      if (!gameSelection) {
        return {
          success: false,
          message: 'No games available for user preferences',
          error: 'No games found'
        };
      }
      console.log(`[ASK QUESTION] Selected game from preferences: ${gameSelection.gameTitle}`);
    }
    
    const { gameTitle, genre } = gameSelection;
    
    // Filter previous questions to get relevant context
    // Include questions about the same game (for uniqueness) and questions about other games (for variety)
    const sameGameQuestions = previousQuestions
      .filter(q => q.gameTitle.toLowerCase() === gameTitle.toLowerCase())
      .map(q => q.question)
      .slice(0, 10); // Last 10 questions about this game
    
    const otherGameQuestions = previousQuestions
      .filter(q => q.gameTitle.toLowerCase() !== gameTitle.toLowerCase())
      .map(q => q.question)
      .slice(0, 5); // Last 5 questions about other games
    
    const allPreviousQuestions = [...sameGameQuestions, ...otherGameQuestions];
    
    // Determine question type variety - try to use less common question types
    const questionTypeOrder = ['how', 'what', 'when', 'which', 'who', 'where'];
    const leastUsedTypes = questionTypeOrder
      .map(type => ({ type, count: questionTypes[type] || 0 }))
      .sort((a, b) => a.count - b.count)
      .slice(0, 3)
      .map(t => t.type);
    
    console.log(`[ASK QUESTION] Previous questions about ${gameTitle}: ${sameGameQuestions.length}`);
    console.log(`[ASK QUESTION] Encouraging question types: ${leastUsedTypes.join(', ')}`);
    
    // Generate natural question with previous questions context
    const question = await generateQuestion({
      gameTitle,
      genre,
      userPreferences,
      previousQuestions: allPreviousQuestions,
      preferredQuestionTypes: leastUsedTypes
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
    
    // Call assistant API with retry logic and improved error handling
    const baseUrl = getBaseUrl();
    const apiUrl = `${baseUrl}/api/assistant`;
    const timeoutMs = 60000; // 60 second timeout
    const requestData = {
      username,
      question,
      userId: `auto-${username.toLowerCase()}-${Date.now()}`
    };
    
    console.log(`[ASK QUESTION] Using baseUrl: ${baseUrl} for ${username}`);
    
    try {
      const response = await withRetry(
        async () => {
          return await withTimeout(
            axios.post(
              apiUrl,
              requestData,
              {
                timeout: timeoutMs,
                headers: {
                  'Content-Type': 'application/json'
                }
              }
            ),
            timeoutMs,
            `Assistant API call for ${username}`
          );
        },
        3, // Max 3 retries
        2000, // Base delay 2 seconds
        `askQuestion for ${username}`
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
      // Log error with improved context
      logApiError(error, {
        operation: 'askQuestion',
        username,
        url: apiUrl,
        method: 'POST',
        requestData: { ...requestData, question: question.substring(0, 100) + '...' }, // Truncate question for logging
        timeout: timeoutMs
      });
      
      // Provide timeout-specific error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isTimeout = errorMessage.includes('timeout') || 
                       errorMessage.includes('ECONNABORTED') ||
                       errorMessage.includes('ETIMEDOUT');
      
      if (isTimeout) {
        throw new Error(`Request to assistant API timed out after ${timeoutMs}ms. The server may be overloaded or processing is taking longer than expected.`);
      }
      
      throw error; // Re-throw to be caught by outer catch
    }
  } catch (error) {
    console.error('[ASK QUESTION] Error asking question:', error);
    return {
      success: false,
      message: 'Failed to ask question',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Create a forum for a game
 * @param username - The user creating the forum
 * @param gameTitle - The game title
 * @param preferredCategory - Optional category. If not provided, will be randomly selected
 * @returns Forum info or null if a forum with same game and category already exists
 */
async function createForumForGame(
  username: string,
  gameTitle: string,
  preferredCategory?: string
): Promise<{ forumId: string; forumTitle: string; category: string } | null> {
  try {
    await connectToMongoDB();
    
    // Available categories: speedruns, gameplay, mods, general, help
    const allCategories = ['speedruns', 'gameplay', 'mods', 'general', 'help'];
    
    // Determine category: use preferredCategory if provided, otherwise select randomly
    let selectedCategory: string;
    if (preferredCategory && allCategories.includes(preferredCategory.toLowerCase())) {
      selectedCategory = preferredCategory.toLowerCase();
    } else {
      // Weight categories based on what makes sense
      // Most posts will be gameplay or general discussion
      // Occasionally use speedruns, mods, or help
      const categoryWeights: { [key: string]: number } = {
        'gameplay': 0.35,      // 35% - most common
        'general': 0.30,       // 30% - also common
        'speedruns': 0.15,     // 15% - for competitive/speedrun-friendly games
        'help': 0.12,          // 12% - for questions/help
        'mods': 0.08           // 8% - less common, mainly for PC games
      };
      
      // Select category based on weighted random
      const random = Math.random();
      let cumulative = 0;
      selectedCategory = 'gameplay'; // default
      
      for (const [cat, weight] of Object.entries(categoryWeights)) {
        cumulative += weight;
        if (random <= cumulative) {
          selectedCategory = cat;
          break;
        }
      }
    }
    
    // CRITICAL: Check if a forum with the same game AND category already exists
    // This prevents duplicate forums like "Story of Seasons - General Discussion" being created multiple times
    const existingForum = await Forum.findOne({
      gameTitle: { $regex: new RegExp(`^${gameTitle}$`, 'i') }, // Case-insensitive match
      category: selectedCategory,
      'metadata.status': 'active'
    }).lean() as any;
    
    if (existingForum) {
      console.log(`[FORUM CREATION] Forum already exists for ${gameTitle} with category ${selectedCategory}. Forum ID: ${existingForum.forumId}`);
      // Return the existing forum info instead of creating a duplicate
      return {
        forumId: existingForum.forumId || (existingForum._id as any).toString(),
        forumTitle: existingForum.title || `${gameTitle} - General Discussion`,
        category: selectedCategory
      };
    }
    
    // Generate forum title based on category
    const categoryTitles: { [key: string]: string } = {
      'speedruns': `${gameTitle} - Speedruns`,
      'gameplay': `${gameTitle} - Gameplay`,
      'mods': `${gameTitle} - Mods`,
      'general': `${gameTitle} - General Discussion`,
      'help': `${gameTitle} - Help & Support`
    };
    
    const forumTitle = categoryTitles[selectedCategory] || `${gameTitle} - General Discussion`;
    
    console.log(`[FORUM CREATION] Creating forum for ${gameTitle} with category: ${selectedCategory}, title: ${forumTitle}`);
    
    // Create forum directly in database (more reliable than HTTP)
    const forumId = `forum_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    
    const newForum = new Forum({
      forumId,
      gameTitle,
      title: forumTitle,
      category: selectedCategory,
      isPrivate: false,
      allowedUsers: [],
      createdBy: username,
      posts: [],
      metadata: {
        totalPosts: 0,
        lastActivityAt: new Date(),
        viewCount: 0,
        viewedBy: [],
        status: 'active'
      }
    });
    
    await newForum.save();
    
    console.log(`[FORUM CREATION] Successfully created forum ${forumId} in database`);
    
    return {
      forumId,
      forumTitle,
      category: selectedCategory
    };
  } catch (error) {
    console.error('[FORUM CREATION] Error creating forum:', error);
    if (error instanceof Error) {
      console.error('[FORUM CREATION] Error message:', error.message);
      console.error('[FORUM CREATION] Error stack:', error.stack);
    }
    return null;
  }
}

/**
 * Find a suitable forum for posting
 * Prioritizes forums created by the user, then forums for games in their preferred genres
 * Now also checks for category matching to prevent duplicate forums
 */
function findSuitableForum(
  forums: any[],
  username: string,
  preferredGameTitle?: string,
  preferredCategory?: string
): any | null {
  if (forums.length === 0) {
    return null;
  }

  // Helper function to check if game titles match (case-insensitive)
  const gameTitleMatches = (forumGameTitle: string | undefined, targetGameTitle: string): boolean => {
    if (!forumGameTitle) return false;
    return forumGameTitle.toLowerCase() === targetGameTitle.toLowerCase() ||
           forumGameTitle.toLowerCase().includes(targetGameTitle.toLowerCase()) ||
           targetGameTitle.toLowerCase().includes(forumGameTitle.toLowerCase());
  };

  // Helper function to check if categories match
  const categoryMatches = (forumCategory: string | undefined, targetCategory: string | undefined): boolean => {
    if (!targetCategory) return true; // If no category specified, match any
    if (!forumCategory) return false;
    return forumCategory.toLowerCase() === targetCategory.toLowerCase();
  };

  // Priority 1: Forums created by this user for the preferred game AND category
  if (preferredGameTitle) {
    const userCreatedForumForGameAndCategory = forums.find((f: any) => 
      f.createdBy === username &&
      gameTitleMatches(f.gameTitle, preferredGameTitle) &&
      categoryMatches(f.category, preferredCategory)
    );
    if (userCreatedForumForGameAndCategory) {
      return userCreatedForumForGameAndCategory;
    }
  }

  // Priority 2: Any forum for the preferred game AND category (created by anyone)
  if (preferredGameTitle) {
    const forumForGameAndCategory = forums.find((f: any) => 
      gameTitleMatches(f.gameTitle, preferredGameTitle) &&
      categoryMatches(f.category, preferredCategory)
    );
    if (forumForGameAndCategory) {
      return forumForGameAndCategory;
    }
  }

  // Priority 3: Forums created by this user for the preferred game (any category)
  if (preferredGameTitle) {
    const userCreatedForumForGame = forums.find((f: any) => 
      f.createdBy === username &&
      gameTitleMatches(f.gameTitle, preferredGameTitle)
    );
    if (userCreatedForumForGame) {
      return userCreatedForumForGame;
    }
  }

  // Priority 4: Any forum for the preferred game (any category, created by anyone)
  if (preferredGameTitle) {
    const forumForGame = forums.find((f: any) => 
      gameTitleMatches(f.gameTitle, preferredGameTitle)
    );
    if (forumForGame) {
      return forumForGame;
    }
  }

  // Priority 5: Any active forum (to encourage participation in existing discussions)
  // This includes forums created by others, promoting diversity
  // Filter to only include forums that are active and have some activity
  const activeForums = forums.filter((f: any) => 
    f.metadata?.status === 'active' && 
    (f.metadata?.totalPosts > 0 || f.posts?.length > 0)
  );
  if (activeForums.length > 0) {
    // Prefer forums created by others (not this user) to encourage diverse participation
    // But include user's own forums as well for variety
    const othersForums = activeForums.filter((f: any) => f.createdBy !== username);
    const forumsToChooseFrom = othersForums.length > 0 ? othersForums : activeForums;
    // Return a random active forum
    return forumsToChooseFrom[Math.floor(Math.random() * forumsToChooseFrom.length)];
  }

  // Priority 6: Forums created by this user (any game in their preferred genres)
  // Only if no active forums exist
  const userCreatedForums = forums.filter((f: any) => f.createdBy === username);
  if (userCreatedForums.length > 0) {
    // Return a random forum created by the user to add variety
    return userCreatedForums[Math.floor(Math.random() * userCreatedForums.length)];
  }

  // Priority 7: Any forum at all
  return forums[Math.floor(Math.random() * forums.length)];
}

/**
 * Create a forum post
 * Can post to existing forums (including ones created by the user) or create new forums
 */
export async function createForumPost(
  username: string,
  userPreferences: UserPreferences
): Promise<ActivityResult> {
  try {
    // Connect to database and get forums directly (more reliable than HTTP calls)
    await connectToMongoDB();
    
    // Get list of active forums directly from database
    let forums: any[] = [];
    try {
      const forumDocs = await Forum.find({
        $or: [
          { isPrivate: false },
          { allowedUsers: username }
        ],
        'metadata.status': 'active'
      })
      .sort({ 'metadata.lastActivityAt': -1 })
      .limit(100)
      .lean(); // Use lean() for better performance
      
      forums = forumDocs.map(forum => ({
        ...forum,
        metadata: {
          totalPosts: forum.metadata?.totalPosts || 0,
          lastActivityAt: forum.metadata?.lastActivityAt || new Date(),
          viewCount: forum.metadata?.viewCount || 0,
          status: forum.metadata?.status || 'active'
        }
      }));
      
      console.log(`[FORUM POST] Fetched ${forums.length} forums from database`);
    } catch (error) {
      console.error('[FORUM POST] Error fetching forums from database:', error);
      forums = [];
    }
    
    // NEW LOGIC: Prioritize creating forums for games that DON'T have forums yet
    // Track which games already have forums
    const gamesWithForums = new Set<string>();
    const forumCountsByGame: { [gameTitle: string]: number } = {};
    
    forums.forEach((f: any) => {
      if (f.gameTitle && f.metadata?.status === 'active') {
        const gameTitleLower = f.gameTitle.toLowerCase();
        gamesWithForums.add(gameTitleLower);
        forumCountsByGame[gameTitleLower] = (forumCountsByGame[gameTitleLower] || 0) + 1;
      }
    });
    
    console.log(`[FORUM POST] Games with existing forums: ${gamesWithForums.size}`);
    console.log(`[FORUM POST] Forum counts: ${JSON.stringify(forumCountsByGame)}`);
    
    // Strategy: 60% chance to prioritize games WITHOUT forums (to create new forums)
    // 40% chance to post in existing forums (to maintain activity)
    const shouldPrioritizeNewForums = Math.random() < 0.6;
    
    let gameSelection: { gameTitle: string; genre: string } | null = null;
    let selectedFromExistingForums = false;
    let shouldCreateNewForum = false;
    
    if (shouldPrioritizeNewForums) {
      // PRIORITY: Find games from user preferences that DON'T have forums yet
      const { games } = loadGameList(userPreferences);
      const gamesWithoutForums = games.filter(game => {
        const gameLower = game.toLowerCase();
        const hasForum = gamesWithForums.has(gameLower);
        const forumCount = forumCountsByGame[gameLower] || 0;
        // Also avoid games that already have 3+ forums (too many)
        return !hasForum || forumCount < 3;
      });
      
      if (gamesWithoutForums.length > 0) {
        // Select a random game that doesn't have a forum (or has few forums)
        const randomGame = gamesWithoutForums[Math.floor(Math.random() * gamesWithoutForums.length)];
        const gameGenre = determineGenreFromGame(randomGame);
        if (randomGame && gameGenre) {
          gameSelection = { gameTitle: randomGame, genre: gameGenre };
          shouldCreateNewForum = true;
          console.log(`[FORUM POST] Selected game WITHOUT forum: ${randomGame} (will create new forum)`);
        }
      }
    }
    
    // If we didn't find a game without forums, try existing forums (40% chance or fallback)
    if (!gameSelection && forums.length > 0) {
      // Select a random game from existing forums
      const forumsWithGames = forums.filter((f: any) => f.gameTitle && f.metadata?.status === 'active');
      if (forumsWithGames.length > 0) {
        const randomForum = forumsWithGames[Math.floor(Math.random() * forumsWithGames.length)];
        const forumGameTitle = randomForum.gameTitle;
        const forumGenre = determineGenreFromGame(forumGameTitle);
        if (forumGameTitle && forumGenre) {
          gameSelection = { gameTitle: forumGameTitle, genre: forumGenre };
          selectedFromExistingForums = true;
          console.log(`[FORUM POST] Selected game from existing forum: ${forumGameTitle} (will post to existing)`);
        }
      }
    }
    
    // Final fallback: use user preferences (but still check if we should create a forum)
    if (!gameSelection) {
      gameSelection = selectRandomGame(userPreferences);
      if (!gameSelection) {
        return {
          success: false,
          message: 'No games available for user preferences',
          error: 'No games found'
        };
      }
      // Check if this game has a forum
      const gameLower = gameSelection.gameTitle.toLowerCase();
      if (!gamesWithForums.has(gameLower)) {
        shouldCreateNewForum = true;
        console.log(`[FORUM POST] Selected game from preferences without forum: ${gameSelection.gameTitle} (will create new forum)`);
      }
    }
    
    const { gameTitle, genre } = gameSelection;
    
    // CRITICAL: Determine the category FIRST before checking for existing forums
    // This ensures we check for forums with the same game AND category
    // Available categories: speedruns, gameplay, mods, general, help
    const allCategories = ['speedruns', 'gameplay', 'mods', 'general', 'help'];
    const categoryWeights: { [key: string]: number } = {
      'gameplay': 0.35,      // 35% - most common
      'general': 0.30,       // 30% - also common
      'speedruns': 0.15,     // 15% - for competitive/speedrun-friendly games
      'help': 0.12,          // 12% - for questions/help
      'mods': 0.08           // 8% - less common, mainly for PC games
    };
    
    // Select category based on weighted random
    const random = Math.random();
    let cumulative = 0;
    let selectedCategory = 'gameplay'; // default
    
    for (const [cat, weight] of Object.entries(categoryWeights)) {
      cumulative += weight;
      if (random <= cumulative) {
        selectedCategory = cat;
        break;
      }
    }
    
    console.log(`[FORUM POST] Selected category: ${selectedCategory} for game: ${gameTitle}`);
    
    // Now check if a forum exists for this game AND category
    // This prevents duplicate forums like "Story of Seasons - General Discussion" being created multiple times
    let targetForum: any | null = null;
    
    // First, try to find an existing forum with the same game AND category
    targetForum = findSuitableForum(forums, username, gameTitle, selectedCategory);
    
    if (targetForum) {
      // Found an existing forum with matching game and category
      console.log(`[FORUM POST] Found existing forum for ${gameTitle} with category ${selectedCategory}: ${targetForum.title} (created by: ${targetForum.createdBy || 'unknown'})`);
      shouldCreateNewForum = false;
    } else {
      // No forum found with matching game and category
      // Check if we should create a new one or post to a different category forum
      const gameLower = gameTitle.toLowerCase();
      const forumCount = forumCountsByGame[gameLower] || 0;
      
      // If the game already has many forums (3+), try to find any forum for this game (different category)
      // Otherwise, create a new forum with the selected category
      if (forumCount >= 3) {
        // Game has many forums, try to find any forum for this game (any category)
        targetForum = findSuitableForum(forums, username, gameTitle);
        if (targetForum) {
          console.log(`[FORUM POST] Game has ${forumCount} forums, posting to existing forum with different category: ${targetForum.title}`);
          shouldCreateNewForum = false;
        } else {
          // Still create a new one even if game has many forums (but with the selected category)
          shouldCreateNewForum = true;
          console.log(`[FORUM POST] Game has ${forumCount} forums but no suitable forum found, will create new forum with category ${selectedCategory}`);
        }
      } else {
        // Game doesn't have many forums, create a new one with the selected category
        shouldCreateNewForum = true;
        console.log(`[FORUM POST] No forum found for ${gameTitle} with category ${selectedCategory}, will create new forum`);
      }
    }
    
    let forumId: string;
    let forumTitle: string;
    let actualGameTitle: string;
    let actualGenre: string;
    let forumCategory = selectedCategory; // Use the selected category
    
    if (targetForum && !shouldCreateNewForum) {
      // Use existing forum
      forumId = targetForum.forumId || targetForum._id;
      forumTitle = targetForum.title || targetForum.gameTitle || 'General Discussion';
      // Use the game title from the forum if available, otherwise use the selected game
      actualGameTitle = targetForum.gameTitle || gameTitle;
      // IMPORTANT: Determine genre from the actual game title in the forum, not the randomly selected game
      // This ensures we use the correct genre for the game that's actually being discussed
      actualGenre = determineGenreFromGame(actualGameTitle);
      // Get category from existing forum (may be different from selectedCategory if we're posting to a different category forum)
      forumCategory = targetForum.category || selectedCategory;
      console.log(`Posting to existing forum: ${forumTitle} (created by: ${targetForum.createdBy || 'unknown'})`);
      console.log(`Using game title: ${actualGameTitle}, genre: ${actualGenre}, category: ${forumCategory}`);
    } else {
      // Create a new forum with the selected category
      console.log(`Creating new forum for ${gameTitle} with category ${selectedCategory}...`);
      const newForum = await createForumForGame(username, gameTitle, selectedCategory);
      
      if (!newForum) {
        console.error(`[FORUM POST] Failed to create forum for ${gameTitle}. Check logs above for details.`);
        return {
          success: false,
          message: 'Failed to create forum for game',
          error: 'Forum creation failed - check server logs for details'
        };
      }
      
      // If createForumForGame returned an existing forum (duplicate prevention), use that
      forumId = newForum.forumId;
      forumTitle = newForum.forumTitle;
      forumCategory = newForum.category;
      actualGameTitle = gameTitle;
      actualGenre = genre;
      
      console.log(`Created new forum: ${forumTitle} (category: ${forumCategory})`);
    }
    
    // IMPROVED: Fetch previous posts by ALL automated users to ensure uniqueness
    // This prevents similar content across different automated users
    const previousPosts: string[] = [];
    const previousPostsWithTimestamps: Array<{ post: string; timestamp: Date; gameTitle: string; username: string }> = [];
    const automatedUsers = ['MysteriousMrEnter', 'WaywardJammer', 'InterdimensionalHipster'];
    
    try {
      // Collect all posts by ALL automated users from ALL forums (within last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      for (const forum of forums) {
        if (forum.posts && Array.isArray(forum.posts)) {
          const forumGameTitle = forum.gameTitle || '';
          const allAutomatedPosts = forum.posts
            .filter((p: any) => 
              automatedUsers.includes(p.username) && // Include ALL automated users
              p.message && 
              p.message.trim().length > 0 &&
              p.metadata?.status === 'active' &&
              new Date(p.timestamp) > thirtyDaysAgo
            )
            .map((p: any) => ({
              post: p.message.trim(),
              timestamp: new Date(p.timestamp),
              gameTitle: forumGameTitle,
              username: p.username
            }));
          previousPostsWithTimestamps.push(...allAutomatedPosts);
        }
      }
      
      // Sort by timestamp (most recent first)
      previousPostsWithTimestamps.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      // Prioritize posts about the same game, but include all recent posts from all automated users
      const sameGamePosts = previousPostsWithTimestamps
        .filter(p => p.gameTitle.toLowerCase() === actualGameTitle.toLowerCase())
        .map(p => p.post);
      const otherGamePosts = previousPostsWithTimestamps
        .filter(p => p.gameTitle.toLowerCase() !== actualGameTitle.toLowerCase())
        .map(p => p.post);
      
      // Include up to 20 posts about the same game (from all automated users), and 10 posts about other games
      // This ensures we check for similarity across ALL automated users, not just the current one
      previousPosts.push(...sameGamePosts.slice(0, 20));
      previousPosts.push(...otherGamePosts.slice(0, 10));
      
      const userPostsCount = previousPostsWithTimestamps.filter(p => p.username === username).length;
      const otherUsersPostsCount = previousPostsWithTimestamps.length - userPostsCount;
      
      console.log(`Found ${previousPosts.length} recent posts by ALL automated users (${userPostsCount} by ${username}, ${otherUsersPostsCount} by others)`);
      console.log(`Posts about ${actualGameTitle}: ${sameGamePosts.length}, other games: ${otherGamePosts.length}`);
      if (previousPosts.length > 0) {
        console.log(`Sample previous posts: ${previousPosts.slice(0, 3).map(p => p.substring(0, 50) + '...').join(', ')}`);
      }
    } catch (error) {
      console.error('Error fetching previous posts:', error);
      // Continue even if we can't fetch previous posts
    }
    
    // Generate natural forum post using the actual game title from the forum
    // Note: forumCategory is already set above in the if/else block
    let postContent = '';
    let attempts = 0;
    const maxAttempts = 3;
    
    // Try to generate a unique post (retry if it's too similar to previous posts)
    while (attempts < maxAttempts) {
      attempts++;
      
      // Check if this is a COMMON gamer - use specialized function for issue posts
      if (userPreferences.gamerProfile && userPreferences.gamerProfile.type === 'common') {
        postContent = await generateCommonGamerPost({
          gameTitle: actualGameTitle,
          genre: actualGenre,
          userPreferences,
          forumTopic: forumTitle,
          forumCategory: forumCategory,
          previousPosts: previousPosts,
          gamerProfile: userPreferences.gamerProfile,
          username: username
        });
      } else {
        // Use standard forum post generation for other users
        postContent = await generateForumPost({
          gameTitle: actualGameTitle,
          genre: actualGenre,
          userPreferences,
          forumTopic: forumTitle,
          forumCategory: forumCategory,
          previousPosts: previousPosts
        });
      }
      
      // Check if the generated post is too similar to any previous post
      // Use stricter similarity checking - check both word overlap and topic similarity
      const isDuplicate = previousPosts.some((prevPost: string) => {
        const similarity = calculateSimilarity(postContent.toLowerCase(), prevPost.toLowerCase());
        
        // Also check for topic overlap (same game, similar themes)
        const postWords = postContent.toLowerCase().split(/\s+/).filter(w => w.length > 4);
        const prevWords = prevPost.toLowerCase().split(/\s+/).filter(w => w.length > 4);
        const commonWords = postWords.filter(w => prevWords.includes(w));
        const topicOverlap = commonWords.length / Math.max(postWords.length, prevWords.length);
        
        // Check for specific topic/keyword overlap (chapters, mechanics, etc.)
        const topicKeywords = ['chapter', 'level', 'area', 'boss', 'mechanic', 'tip', 'strategy', 'soundtrack', 'music', 'visual', 'atmosphere', 'vibe'];
        const postHasTopicKeywords = topicKeywords.some(keyword => postContent.toLowerCase().includes(keyword));
        const prevHasTopicKeywords = topicKeywords.some(keyword => prevPost.toLowerCase().includes(keyword));
        const sameTopicKeywords = topicKeywords.filter(keyword => 
          postContent.toLowerCase().includes(keyword) && prevPost.toLowerCase().includes(keyword)
        );
        
        // If both posts mention the same topic keywords, they're likely too similar
        const hasSameTopicFocus = sameTopicKeywords.length > 0 && postHasTopicKeywords && prevHasTopicKeywords;
        
        // Extract chapter/level numbers if mentioned
        const postChapterMatch = postContent.match(/(?:chapter|level|area)\s*(\d+)/i);
        const prevChapterMatch = prevPost.match(/(?:chapter|level|area)\s*(\d+)/i);
        const sameChapter = postChapterMatch && prevChapterMatch && postChapterMatch[1] === prevChapterMatch[1];
        
        // If similarity is high OR topic overlap is high OR same chapter/topic focus, consider it duplicate
        // Lower thresholds for stricter uniqueness: 0.60 similarity, 0.30 topic overlap
        return similarity > 0.60 || topicOverlap > 0.30 || (hasSameTopicFocus && similarity > 0.50) || sameChapter;
      });
      
      if (!isDuplicate) {
        break; // Found a unique post
      }
      
      console.warn(`Generated post is too similar to previous posts (attempt ${attempts}/${maxAttempts}), retrying...`);
      console.warn(`Similarity check: post length=${postContent.length}, previous posts count=${previousPosts.length}`);
      
      // Add the failed attempt to previous posts to avoid generating similar content
      if (attempts < maxAttempts) {
        previousPosts.push(postContent);
      }
    }
    
    if (attempts >= maxAttempts) {
      console.warn(`Failed to generate unique post after ${maxAttempts} attempts, using generated content anyway`);
    }
    
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
    // This will automatically upload to cloud storage if configured
    let imageUrl: string | null = null;
    let attachments: any[] = [];
    
    const gameImage = await getRandomGameImage(actualGameTitle, username, true);
    if (gameImage) {
      // Image found - record that this user has used this image for this game
      // Record the URL (could be local path or cloud URL)
      recordImageUsage(username, actualGameTitle, gameImage);
      
      // If it's a cloud URL, we can use it directly
      // If it's a local path, it will be served from /public
      imageUrl = gameImage;
      
      // Add image to attachments if it's a cloud URL or if we're in production
      // For local development, the image will be served from /public automatically
      if (gameImage.startsWith('http://') || gameImage.startsWith('https://')) {
        // Cloud URL - add as attachment
        attachments.push({
          type: 'image',
          url: gameImage,
          name: path.basename(gameImage)
        });
      } else {
        // Local path - will be served from /public, but we can still add it
        attachments.push({
          type: 'image',
          url: gameImage,
          name: path.basename(gameImage)
        });
      }
    }
    
    // Post to forum directly via database (more reliable than HTTP)
    try {
      const forum = await Forum.findOne({ forumId });
      if (!forum) {
        return {
          success: false,
          message: 'Forum not found',
          error: 'Forum not found in database'
        };
      }
      
      // Create new post
      const newPost = {
        _id: new mongoose.Types.ObjectId(),
        username,
        message: postContent,
        timestamp: new Date(),
        createdBy: username,
        replyTo: null,
        metadata: {
          edited: false,
          likes: 0,
          likedBy: [],
          reactions: {},
          attachments: attachments,
          status: 'active'
        }
      };
      
      // Add post to forum
      forum.posts.push(newPost);
      forum.metadata.totalPosts = (forum.metadata.totalPosts || 0) + 1;
      forum.metadata.lastActivityAt = new Date();
      await forum.save();
      
      console.log(`[FORUM POST] Successfully added post to forum ${forumId}`);
      
      return {
        success: true,
        message: 'Forum post created successfully',
        details: {
          forumId,
          forumTitle,
          gameTitle: actualGameTitle,
          genre: actualGenre,
          postContent,
          imageUsed: imageUrl !== null,
          imageUrl: imageUrl,
          postId: newPost._id.toString(),
          postedToExistingForum: targetForum !== null
        }
      };
    } catch (error) {
      console.error('[FORUM POST] Error adding post to forum:', error);
      return {
        success: false,
        message: 'Failed to add post to forum',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
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
    const baseUrl = getBaseUrl();
    const apiUrl = `${baseUrl}/api/likePost`;
    const timeoutMs = 30000; // 30 second timeout for like operations
    const requestData = {
      forumId,
      postId,
      username
    };
    
    const response = await withRetry(
      async () => {
        return await withTimeout(
          axios.post(
            apiUrl,
            requestData,
            {
              timeout: timeoutMs,
              headers: {
                'Content-Type': 'application/json'
              }
            }
          ),
          timeoutMs,
          `Like post API call for ${username}`
        );
      },
      3, // Max 3 retries
      1000, // Base delay 1 second
      `likePost for ${username}`
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
    // Log error with improved context
    logApiError(error, {
      operation: 'likePost',
      username,
      url: `${getBaseUrl()}/api/likePost`,
      method: 'POST',
      requestData: { forumId, postId, username },
      timeout: 30000
    });
    
    // Provide timeout-specific error message
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isTimeout = errorMessage.includes('timeout') || 
                     errorMessage.includes('ECONNABORTED') ||
                     errorMessage.includes('ETIMEDOUT');
    
    const userFriendlyMessage = isTimeout
      ? `Request to like post timed out after 30s. The server may be overloaded.`
      : `Failed to like post: ${errorMessage}`;
    
    return {
      success: false,
      message: 'Failed to like post',
      error: userFriendlyMessage
    };
  }
}

/**
 * Find a post to respond to in forums
 * Prioritizes posts from COMMON gamers when EXPERT gamer is responding
 * Also prioritizes posts from other automated users (MysteriousMrEnter, WaywardJammer) and other users (including real users)
 * Excludes posts from the responding user
 */
async function findPostToRespondTo(
  forums: any[],
  respondingUsername: string
): Promise<{ forum: any; post: any; gameTitle: string; genre: string } | null> {
  // Check if responding user is an EXPERT gamer
  let isExpertGamer = false;
  let expertHelpsCommonGamer: string | null = null;
  try {
    await connectToWingmanDB();
    const respondingUser = await User.findOne({ username: respondingUsername });
    if (respondingUser?.gamerProfile?.type === 'expert') {
      isExpertGamer = true;
      expertHelpsCommonGamer = respondingUser.gamerProfile.helpsCommonGamer || null;
    }
  } catch (error) {
    console.error('[POST REPLY] Error checking if user is EXPERT gamer:', error);
  }

  // Priority users to respond to (automated users)
  const priorityUsers = ['MysteriousMrEnter', 'WaywardJammer'];
  // Automated users list (to identify but not exclude real users)
  const automatedUsers = ['MysteriousMrEnter', 'WaywardJammer', 'InterdimensionalHipster'];
  
  // Get list of COMMON gamers if responding user is EXPERT
  let commonGamers: string[] = [];
  if (isExpertGamer) {
    try {
      await connectToWingmanDB();
      const commonGamerUsers = await User.find({ 'gamerProfile.type': 'common' })
        .select('username')
        .lean();
      commonGamers = commonGamerUsers.map((user: any) => user.username);
      // Add original automated users that might be COMMON-like
      commonGamers.push('MysteriousMrEnter', 'WaywardJammer');
    } catch (error) {
      console.error('[POST REPLY] Error getting COMMON gamers:', error);
    }
  }
  
  // Filter forums that have posts
  const forumsWithPosts = forums.filter((f: any) => 
    f.posts && Array.isArray(f.posts) && f.posts.length > 0 &&
    f.metadata?.status === 'active'
  );
  
  if (forumsWithPosts.length === 0) {
    return null;
  }
  
  // Priority 1 (for EXPERT gamers): Find posts from COMMON gamers
  // This ensures EXPERT gamers help COMMON gamers with their issues
  if (isExpertGamer && commonGamers.length > 0) {
    for (const forum of forumsWithPosts) {
      const posts = forum.posts || [];
      
      // Prioritize the COMMON gamer this EXPERT is mapped to help
      const priorityCommonGamers = expertHelpsCommonGamer 
        ? [expertHelpsCommonGamer, ...commonGamers.filter(g => g !== expertHelpsCommonGamer)]
        : commonGamers;
      
      for (const commonGamer of priorityCommonGamers) {
        // Find recent posts from this COMMON gamer
        const commonGamerPosts = posts
          .filter((p: any) => 
            p.username === commonGamer &&
            p.username !== respondingUsername &&
            p.metadata?.status === 'active'
          )
          .sort((a: any, b: any) => {
            const aTime = new Date(a.timestamp || 0).getTime();
            const bTime = new Date(b.timestamp || 0).getTime();
            return bTime - aTime; // Most recent first
          });
        
        for (const post of commonGamerPosts) {
          // Check if responding user has already replied to this post
          const hasReplied = posts.some((p: any) => 
            p.username === respondingUsername && 
            p.replyTo && p.replyTo.toString() === post._id?.toString()
          );
          
          if (!hasReplied) {
            // Check if post is recent (within last 7 days)
            const postTime = new Date(post.timestamp);
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            
            if (postTime > sevenDaysAgo) {
              const genre = determineGenreFromGame(forum.gameTitle || forum.title);
              console.log(`[POST REPLY] EXPERT ${respondingUsername} found COMMON gamer post from ${commonGamer}`);
              return {
                forum,
                post,
                gameTitle: forum.gameTitle || 'Unknown Game',
                genre
              };
            }
          }
        }
      }
    }
  }

  // Priority 2: Find posts from priority users (MysteriousMrEnter, WaywardJammer)
  // that haven't been responded to by the responding user
  for (const forum of forumsWithPosts) {
    const posts = forum.posts || [];
    
    // Find posts from priority users that the responding user hasn't replied to
    for (const post of posts) {
      if (
        priorityUsers.includes(post.username) &&
        post.username !== respondingUsername &&
        post.metadata?.status === 'active'
      ) {
        // Check if responding user has already replied in this forum
        const hasReplied = posts.some((p: any) => 
          p.username === respondingUsername && 
          p.timestamp > post.timestamp
        );
        
        if (!hasReplied) {
          // Try to determine genre from forum or game title
          const genre = determineGenreFromGame(forum.gameTitle || forum.title);
          return {
            forum,
            post,
            gameTitle: forum.gameTitle || 'Unknown Game',
            genre
          };
        }
      }
    }
  }
  
  // Priority 2: Find any recent posts from other users (including real users, not just automated)
  // Sort forums by last activity
  const sortedForums = [...forumsWithPosts].sort((a: any, b: any) => {
    const aTime = new Date(a.metadata?.lastActivityAt || 0).getTime();
    const bTime = new Date(b.metadata?.lastActivityAt || 0).getTime();
    return bTime - aTime;
  });
  
  for (const forum of sortedForums) {
    const posts = forum.posts || [];
    
    // Get recent posts from other users (including real users)
    // Filter out posts from the responding user and inactive posts
    const recentPosts = posts
      .filter((p: any) => 
        p.username !== respondingUsername &&
        p.metadata?.status === 'active' &&
        p.message && p.message.trim().length > 0 // Ensure post has content
      )
      .sort((a: any, b: any) => {
        const aTime = new Date(a.timestamp || 0).getTime();
        const bTime = new Date(b.timestamp || 0).getTime();
        return bTime - aTime;
      })
      .slice(0, 20); // Check more posts to find good candidates
    
    if (recentPosts.length > 0) {
      // Prefer posts from real users (not automated users) if available
      const realUserPosts = recentPosts.filter((p: any) => !automatedUsers.includes(p.username));
      const postsToConsider = realUserPosts.length > 0 ? realUserPosts : recentPosts;
      
      // Pick a random post from the candidates
      const selectedPost = postsToConsider[Math.floor(Math.random() * postsToConsider.length)];
      
      // Check if responding user has already replied to this specific post
      // Use a 12-hour window instead of 24 to allow more frequent engagement
      const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
      const postTime = new Date(selectedPost.timestamp);
      
      // Allow responding to posts from the last 7 days (not just 12 hours)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      if (postTime > sevenDaysAgo) {
        // Check if we've replied recently to this specific post (within 12 hours)
        const hasRepliedRecently = posts.some((p: any) => 
          p.username === respondingUsername && 
          new Date(p.timestamp) > postTime &&
          new Date(p.timestamp) > twelveHoursAgo
        );
        
        if (!hasRepliedRecently) {
          const genre = determineGenreFromGame(forum.gameTitle || forum.title);
          return {
            forum,
            post: selectedPost,
            gameTitle: forum.gameTitle || 'Unknown Game',
            genre
          };
        }
      }
    }
  }
  
  return null;
}

/**
 * Calculate similarity between two strings using a more sophisticated algorithm
 * Returns a value between 0 and 1 (1 = identical, 0 = completely different)
 */
function calculateSimilarity(str1: string, str2: string): number {
  // Normalize strings (remove punctuation, lowercase)
  const normalize = (s: string) => s.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const norm1 = normalize(str1);
  const norm2 = normalize(str2);
  
  // Exact match check
  if (norm1 === norm2) {
    return 1.0;
  }
  
  // Word-based similarity check
  const words1 = norm1.split(/\s+/).filter(w => w.length > 3); // Only consider words longer than 3 chars
  const words2 = norm2.split(/\s+/).filter(w => w.length > 3);
  
  if (words1.length === 0 || words2.length === 0) {
    return 0;
  }
  
  // Count common words (exact match)
  const commonWords = words1.filter(w => words2.includes(w));
  
  // Also check for similar phrases (2-3 word sequences)
  const getPhrases = (words: string[], length: number) => {
    const phrases: string[] = [];
    for (let i = 0; i <= words.length - length; i++) {
      phrases.push(words.slice(i, i + length).join(' '));
    }
    return phrases;
  };
  
  const phrases1_2 = getPhrases(words1, 2);
  const phrases2_2 = getPhrases(words2, 2);
  const commonPhrases = phrases1_2.filter(p => phrases2_2.includes(p));
  
  // Calculate similarity with both word and phrase overlap
  const wordSimilarity = (commonWords.length * 2) / (words1.length + words2.length);
  const phraseSimilarity = phrases1_2.length > 0 && phrases2_2.length > 0
    ? (commonPhrases.length * 2) / (phrases1_2.length + phrases2_2.length)
    : 0;
  
  // Weighted combination (phrases are more indicative of similarity)
  const similarity = (wordSimilarity * 0.4) + (phraseSimilarity * 0.6);
  
  return Math.min(similarity, 1.0);
}

/**
 * Determine genre from game title by checking game lists
 * Prioritizes single-player games first, then multiplayer games
 */
function determineGenreFromGame(gameTitle: string): string {
  if (!gameTitle || gameTitle.trim().length === 0) {
    return 'adventure'; // Default fallback
  }
  
  try {
    // Normalize game title for comparison (case-insensitive, trim whitespace)
    const normalizedTitle = gameTitle.trim().toLowerCase();
    
    // Check single-player games FIRST (most games are single-player)
    const singlePlayerPath = path.join(process.cwd(), 'data', 'automated-users', 'single-player.json');
    const singlePlayerContent = fs.readFileSync(singlePlayerPath, 'utf-8');
    const singlePlayerGames: GameList = JSON.parse(singlePlayerContent);
    
    for (const [genre, games] of Object.entries(singlePlayerGames)) {
      // Check for exact match first
      if (games.some(g => g.trim().toLowerCase() === normalizedTitle)) {
        console.log(`Genre determined: ${genre} for game: ${gameTitle}`);
        return genre;
      }
      // Also check if game title contains the game name or vice versa (for partial matches)
      if (games.some(g => {
        const normalizedGame = g.trim().toLowerCase();
        return normalizedTitle.includes(normalizedGame) || normalizedGame.includes(normalizedTitle);
      })) {
        console.log(`Genre determined (partial match): ${genre} for game: ${gameTitle}`);
        return genre;
      }
    }
    
    // Check multiplayer games SECOND (only if not found in single-player)
    const multiplayerPath = path.join(process.cwd(), 'data', 'automated-users', 'multiplayer.json');
    const multiplayerContent = fs.readFileSync(multiplayerPath, 'utf-8');
    const multiplayerGames: GameList = JSON.parse(multiplayerContent);
    
    for (const [genre, games] of Object.entries(multiplayerGames)) {
      // Check for exact match first
      if (games.some(g => g.trim().toLowerCase() === normalizedTitle)) {
        console.log(`Genre determined: ${genre} for game: ${gameTitle}`);
        return genre;
      }
      // Also check if game title contains the game name or vice versa (for partial matches)
      if (games.some(g => {
        const normalizedGame = g.trim().toLowerCase();
        return normalizedTitle.includes(normalizedGame) || normalizedGame.includes(normalizedTitle);
      })) {
        console.log(`Genre determined (partial match): ${genre} for game: ${gameTitle}`);
        return genre;
      }
    }
  } catch (error) {
    console.error('Error determining genre from game:', error);
  }
  
  // Default to 'rpg' for unknown games (most common genre in our lists)
  console.warn(`Could not determine genre for game: ${gameTitle}, defaulting to 'rpg'`);
  return 'rpg';
}

/**
 * Respond to a forum post
 * Finds a suitable post from other users and generates a relevant reply
 */
export async function respondToForumPost(
  username: string,
  userPreferences: UserPreferences
): Promise<ActivityResult> {
  try {
    // Connect to database and get forums directly (more reliable than HTTP calls)
    await connectToMongoDB();
    
    // Get list of active forums directly from database
    let forums: any[] = [];
    try {
      const forumDocs = await Forum.find({
        $or: [
          { isPrivate: false },
          { allowedUsers: username }
        ],
        'metadata.status': 'active'
      })
      .sort({ 'metadata.lastActivityAt': -1 })
      .limit(100)
      .lean();
      
      forums = forumDocs.map(forum => ({
        ...forum,
        metadata: {
          totalPosts: forum.metadata?.totalPosts || 0,
          lastActivityAt: forum.metadata?.lastActivityAt || new Date(),
          viewCount: forum.metadata?.viewCount || 0,
          status: forum.metadata?.status || 'active'
        }
      }));
      
      console.log(`[POST REPLY] Fetched ${forums.length} forums from database`);
    } catch (error) {
      console.error('[POST REPLY] Error fetching forums from database:', error);
      return {
        success: false,
        message: 'Failed to fetch forums',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
    
    // Filter to only forums with posts
    const forumsWithPosts = forums.filter((f: any) => 
      f.metadata?.totalPosts > 0 || (f.posts && Array.isArray(f.posts) && f.posts.length > 0)
    );
    
    if (forumsWithPosts.length === 0) {
      return {
        success: false,
        message: 'No forums with posts found',
        error: 'No posts available'
      };
    }
    
    // Fetch full forum details with posts directly from database
    // Limit to first 10 forums to avoid too many database queries
    const forumsToCheck = forumsWithPosts.slice(0, 10);
    const forumsWithFullPosts: any[] = [];
    
    for (const forum of forumsToCheck) {
      try {
        const forumId = forum.forumId || forum._id;
        const forumDoc = await Forum.findOne({ forumId }).lean() as any;
        
        if (forumDoc && forumDoc.posts && Array.isArray(forumDoc.posts) && forumDoc.posts.length > 0) {
          forumsWithFullPosts.push({
            ...forumDoc,
            metadata: {
              totalPosts: forumDoc.metadata?.totalPosts || forumDoc.posts.length,
              lastActivityAt: forumDoc.metadata?.lastActivityAt || new Date(),
              viewCount: forumDoc.metadata?.viewCount || 0,
              status: forumDoc.metadata?.status || 'active'
            }
          });
        }
      } catch (error) {
        console.error(`[POST REPLY] Error fetching forum details for ${forum.forumId}:`, error);
        // Continue to next forum if this one fails
      }
    }
    
    // If we don't have posts from database queries, try using posts from initial forums response
    if (forumsWithFullPosts.length === 0) {
      // Use forums that might have posts in the response
      for (const forum of forumsWithPosts) {
        if (forum.posts && Array.isArray(forum.posts) && forum.posts.length > 0) {
          forumsWithFullPosts.push(forum);
        }
      }
    }
    
    if (forumsWithFullPosts.length === 0) {
      return {
        success: false,
        message: 'No forums with posts found',
        error: 'No posts available'
      };
    }
    
    // Find a post to respond to
    const postToRespondTo = await findPostToRespondTo(forumsWithFullPosts, username);
    
    if (!postToRespondTo) {
      return {
        success: false,
        message: 'No suitable posts found to respond to',
        error: 'No posts available'
      };
    }
    
    const { forum, post, gameTitle, genre } = postToRespondTo;
    const forumId = forum.forumId || forum._id;
    const forumTitle = forum.title || forum.gameTitle || 'General Discussion';
    const forumCategory = forum.category || 'general';
    const originalPostAuthor = post.createdBy || post.username || 'Unknown';
    const originalPostContent = post.message;
    
    console.log(`Responding to post by ${originalPostAuthor} in forum: ${forumTitle} (${gameTitle})`);
    
    // Check if original post author is a COMMON gamer
    let isReplyingToCommonGamer = false;
    let commonGamerUsername = originalPostAuthor;
    try {
      await connectToWingmanDB();
      const originalAuthor = await User.findOne({ username: originalPostAuthor });
      if (originalAuthor?.gamerProfile?.type === 'common') {
        isReplyingToCommonGamer = true;
        commonGamerUsername = originalPostAuthor;
      }
    } catch (error) {
      console.error('[POST REPLY] Error checking original author:', error);
    }
    
    // Generate relevant reply
    let replyContent: string;
    
    // If this is an EXPERT gamer replying to a COMMON gamer, use specialized function
    if (userPreferences.gamerProfile?.type === 'expert' && isReplyingToCommonGamer) {
      replyContent = await generateExpertGamerReply({
        gameTitle,
        genre,
        originalPost: originalPostContent,
        originalPostAuthor,
        forumTopic: forumTitle,
        forumCategory: forumCategory,
        gamerProfile: userPreferences.gamerProfile,
        username: username,
        commonGamerUsername: commonGamerUsername
      });
    } else {
      // Use standard reply generation for other cases
      replyContent = await generatePostReply({
        gameTitle,
        genre,
        originalPost: originalPostContent,
        originalPostAuthor,
        forumTopic: forumTitle,
        forumCategory: forumCategory
      });
    }
    
    // Prepend @mention if not already present (same logic as manual replies)
    const mentionPattern = new RegExp(`^@${originalPostAuthor}\\s+`, "i");
    if (!mentionPattern.test(replyContent.trim())) {
      replyContent = `@${originalPostAuthor} ${replyContent.trim()}`;
    }
    
    // Check content moderation
    const contentCheck = await containsOffensiveContent(replyContent, username);
    if (contentCheck.isOffensive) {
      return {
        success: false,
        message: 'Generated reply failed content moderation',
        error: 'Content moderation failed',
        details: { offendingWords: contentCheck.offendingWords }
      };
    }
    
    // Post reply to forum directly via database (more reliable than HTTP)
    try {
      const forumDoc = await Forum.findOne({ forumId });
      if (!forumDoc) {
        return {
          success: false,
          message: 'Forum not found',
          error: 'Forum not found in database'
        };
      }
      
      // Create reply post
      // Find the original post in the forum document to get the proper ObjectId
      // This ensures we have the correct _id even if the post came from a lean() query
      let replyToId = null;
      if (post._id) {
        try {
          // First, try to find the post in the forum document by matching _id
          const originalPost = forumDoc.posts.find((p: any) => {
            if (!p._id) return false;
            // Compare as strings to handle both ObjectId and string formats
            const postIdStr = post._id.toString();
            const pIdStr = p._id.toString();
            return pIdStr === postIdStr;
          });
          
          if (originalPost && originalPost._id) {
            // Use the ObjectId from the forum document (guaranteed to be correct)
            replyToId = originalPost._id;
            console.log(`[POST REPLY] Found original post in forum, using _id: ${replyToId.toString()}`);
          } else {
            // Fallback: try to convert the post._id we have
            // If it's already an ObjectId, use it; if it's a string, convert it
            replyToId = typeof post._id === 'string' 
              ? new mongoose.Types.ObjectId(post._id)
              : post._id instanceof mongoose.Types.ObjectId
              ? post._id
              : new mongoose.Types.ObjectId(post._id.toString());
            console.log(`[POST REPLY] Original post not found in forum, converted _id: ${replyToId.toString()}`);
          }
        } catch (error) {
          console.error(`[POST REPLY] Error finding/converting post._id: ${post._id}`, error);
          // Last resort: try to find by username, message, and timestamp
          const originalPost = forumDoc.posts.find((p: any) => 
            p.username === post.username && 
            p.message === post.message &&
            Math.abs(new Date(p.timestamp).getTime() - new Date(post.timestamp).getTime()) < 5000
          );
          if (originalPost && originalPost._id) {
            replyToId = originalPost._id;
            console.log(`[POST REPLY] Found post by content matching, using _id: ${replyToId.toString()}`);
          } else {
            console.warn(`[POST REPLY] Could not find original post _id, reply will not be linked`);
          }
        }
      }
      
      const replyPost = {
        _id: new mongoose.Types.ObjectId(),
        username,
        message: replyContent,
        timestamp: new Date(),
        createdBy: username,
        replyTo: replyToId,
        metadata: {
          edited: false,
          likes: 0,
          likedBy: [],
          reactions: {},
          attachments: [],
          status: 'active'
        }
      };
      
      console.log(`[POST REPLY] Creating reply to post by ${originalPostAuthor}, replyTo ID: ${replyToId ? replyToId.toString() : 'null'}`);
      
      // Add reply to forum
      forumDoc.posts.push(replyPost);
      forumDoc.metadata.totalPosts = (forumDoc.metadata.totalPosts || 0) + 1;
      forumDoc.metadata.lastActivityAt = new Date();
      await forumDoc.save();
      
      console.log(`[POST REPLY] Successfully added reply to forum ${forumId}`);
      
      return {
        success: true,
        message: 'Forum post reply created successfully',
        details: {
          forumId,
          forumTitle,
          gameTitle,
          genre,
          replyContent,
          repliedToPostId: post._id,
          repliedToAuthor: originalPostAuthor,
          postId: replyPost._id.toString()
        }
      };
    } catch (error) {
      console.error('[POST REPLY] Error adding reply to forum:', error);
      return {
        success: false,
        message: 'Failed to add reply to forum',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  } catch (error) {
    console.error('Error responding to forum post:', error);
    return {
      success: false,
      message: 'Failed to respond to forum post',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get all COMMON gamers from database
 * Returns list of usernames
 */
export async function getCommonGamers(): Promise<string[]> {
  try {
    await connectToWingmanDB();
    const commonGamers = await User.find({ 'gamerProfile.type': 'common' })
      .select('username')
      .lean();
    return commonGamers.map((user: any) => user.username);
  } catch (error) {
    console.error('[SERVICE] Error getting COMMON gamers:', error);
    return [];
  }
}

/**
 * Get all EXPERT gamers from database
 * Returns list of usernames
 */
export async function getExpertGamers(): Promise<string[]> {
  try {
    await connectToWingmanDB();
    const expertGamers = await User.find({ 'gamerProfile.type': 'expert' })
      .select('username')
      .lean();
    return expertGamers.map((user: any) => user.username);
  } catch (error) {
    console.error('[SERVICE] Error getting EXPERT gamers:', error);
    return [];
  }
}

/**
 * Find the best EXPERT gamer to reply to a COMMON gamer's post
 * Uses the gamer matching utility for consistent matching logic
 * 
 * @param commonGamerUsername - Username of the COMMON gamer who created the post
 * @param gameTitle - Game title from the post
 * @param genre - Genre of the game
 * @returns Username of the best matching EXPERT gamer, or null if none found
 */
export async function findMatchingExpert(
  commonGamerUsername: string,
  gameTitle?: string,
  genre?: string
): Promise<string | null> {
  // Use the dedicated gamer matching utility
  const { findMatchingExpert: findMatch } = await import('./gamerMatching');
  const result = await findMatch(commonGamerUsername, gameTitle, genre);
  return result ? result.expertUsername : null;
}

/**
 * Create a forum post for a COMMON gamer
 * This is a convenience wrapper around createForumPost that ensures
 * COMMON gamer-specific content generation is used
 * 
 * @param username - Username of the COMMON gamer
 * @param preferences - User preferences (should include gamerProfile)
 * @returns ActivityResult with post details
 */
export async function createCommonGamerPost(
  username: string,
  preferences: UserPreferences
): Promise<ActivityResult> {
  // Verify this is a COMMON gamer
  if (!preferences.gamerProfile || preferences.gamerProfile.type !== 'common') {
    return {
      success: false,
      message: 'User is not a COMMON gamer',
      error: 'Invalid gamer type'
    };
  }

  // Use the existing createForumPost function
  // It will automatically use generateCommonGamerPost for COMMON gamers
  return await createForumPost(username, preferences);
}

/**
 * Create a reply for an EXPERT gamer to a COMMON gamer's post
 * This is a convenience wrapper around respondToForumPost that ensures
 * EXPERT gamer-specific content generation is used
 * 
 * @param username - Username of the EXPERT gamer
 * @param preferences - User preferences (should include gamerProfile)
 * @returns ActivityResult with reply details
 */
export async function createExpertGamerReply(
  username: string,
  preferences: UserPreferences
): Promise<ActivityResult> {
  // Verify this is an EXPERT gamer
  if (!preferences.gamerProfile || preferences.gamerProfile.type !== 'expert') {
    return {
      success: false,
      message: 'User is not an EXPERT gamer',
      error: 'Invalid gamer type'
    };
  }

  // Use the existing respondToForumPost function
  // It will automatically use generateExpertGamerReply for EXPERT gamers replying to COMMON gamers
  return await respondToForumPost(username, preferences);
}

/**
 * Get user preferences from database
 * Checks for gamerProfile first, then falls back to hardcoded preferences for original automated users
 */
export async function getUserPreferences(username: string): Promise<UserPreferences | null> {
  try {
    // Connect to database
    await connectToWingmanDB();
    
    // Try to find user in database
    const user = await User.findOne({ username });
    
    if (user && user.gamerProfile) {
      // User has a gamer profile - extract genres and focus from favorite games
      const genres: string[] = user.gamerProfile.favoriteGames.map((game: any) => String(game.genre));
      const uniqueGenresSet = new Set<string>(genres);
      const uniqueGenres: string[] = Array.from(uniqueGenresSet);
      
      // Determine focus based on genres (single-player genres vs multiplayer genres)
      const singlePlayerGenres = ['RPG', 'Adventure', 'Simulation', 'Puzzle', 'Platformer', 'Action', 'Horror', 'Stealth', 'Metroidvania'];
      const multiplayerGenres = ['Racing', 'Battle Royale', 'Fighting', 'First-Person Shooter', 'Sandbox', 'FPS', 'MOBA', 'Sports'];
      
      const hasSinglePlayer = uniqueGenres.some((g: string) => singlePlayerGenres.includes(g));
      const hasMultiplayer = uniqueGenres.some((g: string) => multiplayerGenres.includes(g));
      
      const focus = hasSinglePlayer && !hasMultiplayer 
        ? 'single-player' 
        : hasMultiplayer && !hasSinglePlayer 
        ? 'multiplayer' 
        : 'single-player'; // Default to single-player if mixed
      
      return {
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
    }
    
    // Fallback to hardcoded preferences for original automated users
    if (username === 'MysteriousMrEnter') {
      return {
        genres: ['RPG', 'Adventure', 'Simulation', 'Puzzle', 'Platformer', 'Action', 'Horror', 'Stealth', 'Metroidvania'],
        focus: 'single-player'
      };
    } else if (username === 'WaywardJammer') {
      return {
        genres: ['Racing', 'Battle Royale', 'Fighting', 'First-Person Shooter', 'Sandbox', 'FPS', 'MOBA', 'Sports'],
        focus: 'multiplayer'
      };
    } else if (username === 'InterdimensionalHipster') {
      // InterdimensionalHipster can talk about both single-player and multiplayer games
      return {
        genres: ['RPG', 'Adventure', 'Simulation', 'Puzzle', 'Platformer', 'Action', 'Horror', 'Stealth', 'Metroidvania', 'Racing', 'Battle Royale', 'Fighting', 'First-Person Shooter', 'Sandbox', 'FPS', 'MOBA', 'Sports'],
        focus: 'single-player' // Default focus, but can respond to both types
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user preferences:', error);
    return null;
  }
}

