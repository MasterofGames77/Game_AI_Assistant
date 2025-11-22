import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { generateQuestion, generateForumPost, generatePostReply, UserPreferences } from './automatedContentGenerator';
import { findGameImage, getRandomGameImage, recordImageUsage } from './automatedImageService';
import { containsOffensiveContent } from './contentModeration';
import { GameList, ActivityResult } from '../types';

/**
 * Load game list for a user based on their preferences
 * InterdimensionalHipster can access both single-player and multiplayer games
 */
function loadGameList(userPreferences: UserPreferences): { games: string[]; genres: string[] } {
  // Check if this is InterdimensionalHipster (has both single-player and multiplayer genres)
  const isInterdimensionalHipster = userPreferences.genres.length > 5 && 
    userPreferences.genres.some(g => ['RPG', 'Adventure', 'Simulation', 'Puzzle', 'Platformer'].includes(g)) &&
    userPreferences.genres.some(g => ['Racing', 'Battle Royale', 'Fighting', 'First-Person Shooter', 'Sandbox'].includes(g));
  
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
    userPreferences.genres.some(g => ['RPG', 'Adventure', 'Simulation', 'Puzzle', 'Platformer'].includes(g)) &&
    userPreferences.genres.some(g => ['Racing', 'Battle Royale', 'Fighting', 'First-Person Shooter', 'Sandbox'].includes(g));
  
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
 * Find a suitable forum for posting
 * Prioritizes forums created by the user, then forums for games in their preferred genres
 */
function findSuitableForum(
  forums: any[],
  username: string,
  preferredGameTitle?: string,
  preferredGenre?: string
): any | null {
  if (forums.length === 0) {
    return null;
  }

  // Priority 1: Forums created by this user for the preferred game
  if (preferredGameTitle) {
    const userCreatedForumForGame = forums.find((f: any) => 
      f.createdBy === username &&
      (f.gameTitle?.toLowerCase() === preferredGameTitle.toLowerCase() ||
       f.title?.toLowerCase().includes(preferredGameTitle.toLowerCase()))
    );
    if (userCreatedForumForGame) {
      return userCreatedForumForGame;
    }
  }

  // Priority 2: Any forum for the preferred game (created by anyone)
  if (preferredGameTitle) {
    const forumForGame = forums.find((f: any) => 
      f.gameTitle?.toLowerCase() === preferredGameTitle.toLowerCase() ||
      f.title?.toLowerCase().includes(preferredGameTitle.toLowerCase())
    );
    if (forumForGame) {
      return forumForGame;
    }
  }

  // Priority 3: Forums created by this user (any game in their preferred genres)
  const userCreatedForums = forums.filter((f: any) => f.createdBy === username);
  if (userCreatedForums.length > 0) {
    // Return a random forum created by the user to add variety
    return userCreatedForums[Math.floor(Math.random() * userCreatedForums.length)];
  }

  // Priority 4: Any active forum (to encourage participation in existing discussions)
  // Filter to only include forums that are active and have some activity
  const activeForums = forums.filter((f: any) => 
    f.metadata?.status === 'active' && 
    (f.metadata?.totalPosts > 0 || f.posts?.length > 0)
  );
  if (activeForums.length > 0) {
    // Return a random active forum
    return activeForums[Math.floor(Math.random() * activeForums.length)];
  }

  // Priority 5: Any forum at all
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
    // Get list of active forums first
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    let forumsResponse;
    try {
      forumsResponse = await axios.get(
        `${baseUrl}/api/getAllForums?username=${username}&limit=100`, // Get more forums to have better selection
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
    
    // Select a random game from user's preferences
    const gameSelection = selectRandomGame(userPreferences);
    if (!gameSelection) {
      return {
        success: false,
        message: 'No games available for user preferences',
        error: 'No games found'
      };
    }
    
    const { gameTitle, genre } = gameSelection;
    
    // Try to find a suitable existing forum
    let targetForum = findSuitableForum(forums, username, gameTitle, genre);
    
    let forumId: string;
    let forumTitle: string;
    let actualGameTitle: string;
    let actualGenre: string;
    
    if (targetForum) {
      // Use existing forum
      forumId = targetForum.forumId || targetForum._id;
      forumTitle = targetForum.title || targetForum.gameTitle || 'General Discussion';
      // Use the game title from the forum if available, otherwise use the selected game
      actualGameTitle = targetForum.gameTitle || gameTitle;
      // IMPORTANT: Determine genre from the actual game title in the forum, not the randomly selected game
      // This ensures we use the correct genre for the game that's actually being discussed
      actualGenre = determineGenreFromGame(actualGameTitle);
      console.log(`Posting to existing forum: ${forumTitle} (created by: ${targetForum.createdBy || 'unknown'})`);
      console.log(`Using game title: ${actualGameTitle}, genre: ${actualGenre}`);
    } else {
      // No suitable forum found, create a new one
      console.log(`No suitable forum found for ${gameTitle}, creating new forum...`);
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
      actualGameTitle = gameTitle;
      actualGenre = genre;
      console.log(`Created new forum: ${forumTitle}`);
    }
    
    // Fetch previous posts by this user for the same game to avoid repetition
    const previousPosts: string[] = [];
    try {
      // Get all forums for this game
      const gameForums = forums.filter((f: any) => 
        f.gameTitle && f.gameTitle.toLowerCase() === actualGameTitle.toLowerCase()
      );
      
      // Collect all posts by this user from forums about this game
      for (const forum of gameForums) {
        if (forum.posts && Array.isArray(forum.posts)) {
          const userPosts = forum.posts
            .filter((p: any) => 
              p.username === username && 
              p.message && 
              p.message.trim().length > 0 &&
              p.metadata?.status === 'active'
            )
            .map((p: any) => p.message.trim());
          previousPosts.push(...userPosts);
        }
      }
      
      // Limit to most recent 5 posts to avoid overwhelming the prompt
      // Reverse to get most recent first, then take first 5
      previousPosts.reverse();
      previousPosts.splice(5);
      console.log(`Found ${previousPosts.length} previous posts by ${username} for ${actualGameTitle}`);
    } catch (error) {
      console.error('Error fetching previous posts:', error);
      // Continue even if we can't fetch previous posts
    }
    
    // Generate natural forum post using the actual game title from the forum
    const postContent = await generateForumPost({
      gameTitle: actualGameTitle,
      genre: actualGenre,
      userPreferences,
      forumTopic: forumTitle,
      previousPosts: previousPosts
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
    
    // Post to forum
    const postResponse = await axios.post(
      `${baseUrl}/api/addPostToForum`,
      {
        forumId,
        message: postContent,
        username,
        attachments: attachments // Now includes image if available
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
        gameTitle: actualGameTitle,
        genre: actualGenre,
        postContent,
        imageUsed: imageUrl !== null,
        imageUrl: imageUrl,
        postId: postResponse.data.post?._id,
        postedToExistingForum: targetForum !== null
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
 * Find a post to respond to in forums
 * Prioritizes posts from other automated users (MysteriousMrEnter, WaywardJammer) and other users (including real users)
 * Excludes posts from the responding user
 */
function findPostToRespondTo(
  forums: any[],
  respondingUsername: string
): { forum: any; post: any; gameTitle: string; genre: string } | null {
  // Priority users to respond to (automated users)
  const priorityUsers = ['MysteriousMrEnter', 'WaywardJammer'];
  // Automated users list (to identify but not exclude real users)
  const automatedUsers = ['MysteriousMrEnter', 'WaywardJammer', 'InterdimensionalHipster'];
  
  // Filter forums that have posts
  const forumsWithPosts = forums.filter((f: any) => 
    f.posts && Array.isArray(f.posts) && f.posts.length > 0 &&
    f.metadata?.status === 'active'
  );
  
  if (forumsWithPosts.length === 0) {
    return null;
  }
  
  // Priority 1: Find posts from priority users (MysteriousMrEnter, WaywardJammer)
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
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    
    // Get list of active forums
    let forumsResponse;
    try {
      forumsResponse = await axios.get(
        `${baseUrl}/api/getAllForums?username=${username}&limit=100`,
        {
          headers: {
            'username': username
          }
        }
      );
    } catch (error) {
      console.error('Error fetching forums:', error);
      return {
        success: false,
        message: 'Failed to fetch forums',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
    
    const forums = forumsResponse.data.forums || [];
    
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
    
    // Fetch full forum details with posts for a few forums
    // Limit to first 10 forums to avoid too many API calls
    const forumsToCheck = forumsWithPosts.slice(0, 10);
    const forumsWithFullPosts: any[] = [];
    
    for (const forum of forumsToCheck) {
      try {
        const forumId = forum.forumId || forum._id;
        const forumDetailResponse = await axios.get(
          `${baseUrl}/api/getForumTopic?forumId=${forumId}&username=${username}&incrementView=false`,
          {
            headers: {
              'username': username
            }
          }
        );
        
        if (forumDetailResponse.data.forum && forumDetailResponse.data.forum.posts) {
          forumsWithFullPosts.push(forumDetailResponse.data.forum);
        }
      } catch (error) {
        console.error(`Error fetching forum details for ${forum.forumId}:`, error);
        // Continue to next forum if this one fails
      }
    }
    
    // If we don't have posts from API calls, try using posts from getAllForums response
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
    const postToRespondTo = findPostToRespondTo(forumsWithFullPosts, username);
    
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
    const originalPostAuthor = post.username;
    const originalPostContent = post.message;
    
    console.log(`Responding to post by ${originalPostAuthor} in forum: ${forumTitle} (${gameTitle})`);
    
    // Generate relevant reply
    const replyContent = await generatePostReply({
      gameTitle,
      genre,
      originalPost: originalPostContent,
      originalPostAuthor,
      forumTopic: forumTitle
    });
    
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
    
    // Post reply to forum
    const postResponse = await axios.post(
      `${baseUrl}/api/addPostToForum`,
      {
        forumId,
        message: replyContent,
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
      message: 'Forum post reply created successfully',
      details: {
        forumId,
        forumTitle,
        gameTitle,
        genre,
        replyContent,
        repliedToPostId: post._id,
        repliedToAuthor: originalPostAuthor,
        postId: postResponse.data.post?._id
      }
    };
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
    } else if (username === 'InterdimensionalHipster') {
      // InterdimensionalHipster can talk about both single-player and multiplayer games
      return {
        genres: ['RPG', 'Adventure', 'Simulation', 'Puzzle', 'Platformer', 'Racing', 'Battle Royale', 'Fighting', 'First-Person Shooter', 'Sandbox'],
        focus: 'single-player' // Default focus, but can respond to both types
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user preferences:', error);
    return null;
  }
}

