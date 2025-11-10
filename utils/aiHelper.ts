import axios from 'axios';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { getClientCredentialsAccessToken } from './twitchAuth';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Cache implementation for API responses
export class AICacheMetrics {
  private hits: number = 0;
  private misses: number = 0;
  private cacheData: Map<string, any> = new Map();
  private static instance: AICacheMetrics;

  private constructor() {}

  public static getInstance(): AICacheMetrics {
    if (!AICacheMetrics.instance) {
      AICacheMetrics.instance = new AICacheMetrics();
    }
    return AICacheMetrics.instance;
  }

  // Record hits and misses
  recordHit() { this.hits++; }
  recordMiss() { this.misses++; }

  getHitRate() {
    const total = this.hits + this.misses;
    return total ? (this.hits / total * 100).toFixed(2) + '%' : '0%';
  }

  // Set the cache value and expiry time
  set(key: string, value: any, ttl: number = 3600000) { // Default TTL: 1 hour
    this.cacheData.set(key, {
      value,
      expiry: Date.now() + ttl
    });
  }

  // Get the cache value
  get(key: string): any {
    const data = this.cacheData.get(key);
    
    if (!data) {
      this.recordMiss();
      return null;
    }
    
    // Check if the cache value has expired
    if (data.expiry < Date.now()) {
      this.cacheData.delete(key);
      this.recordMiss();
      return null;
    }
    
    // Record a hit if the value is still valid
    this.recordHit();
    return data.value;
  }

  getMetrics() {
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: this.getHitRate(),
      cacheSize: this.cacheData.size
    };
  }

  clearCache() {
    this.cacheData.clear();
  }
}

// Get the singleton instance
const aiCache = AICacheMetrics.getInstance();

// Utility function to clean and match titles
function cleanAndMatchTitle(queryTitle: string, recordTitle: string): boolean {
  const cleanQuery = queryTitle.toLowerCase().trim();
  const cleanRecord = recordTitle.toLowerCase().trim();
  return cleanQuery === cleanRecord; // Simple exact match
}

// Example IGDB Fetch Function with Improved Filtering
export async function fetchFromIGDB(gameTitle: string): Promise<string | null> {
  try {
    const accessToken = await getClientCredentialsAccessToken();
    
    // Escape special characters and quotes in the game title
    const sanitizedTitle = gameTitle.replace(/"/g, '\\"');

    const response = await axios.post(
      'https://api.igdb.com/v4/games',
      // Updated query format with proper escaping and simplified fields
      `search "${sanitizedTitle}";
       fields name,first_release_date,platforms.name,involved_companies.company.name,involved_companies.developer,involved_companies.publisher;
       limit 1;`,
      {
        headers: {
          'Client-ID': process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID!,
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      }
    );

    if (response.data && response.data.length > 0) {
      const game = response.data.find((g: any) => cleanAndMatchTitle(gameTitle, g.name));
      
      // get developers, publishers, platforms, and release date
      const developers = game.involved_companies?.filter((ic: any) => ic.developer)
        .map((ic: any) => ic.company.name).join(", ") || "unknown developers";
      const publishers = game.involved_companies?.filter((ic: any) => ic.publisher)
        .map((ic: any) => ic.company.name).join(", ") || "unknown publishers";
      const platforms = game.platforms?.map((p: any) => p.name).join(", ") || "unknown platforms";
      const releaseDate = game.first_release_date 
        ? new Date(game.first_release_date * 1000).toLocaleDateString()
        : "unknown release date";

      return `${game.name} was released on ${releaseDate}. It was developed by ${developers} and published by ${publishers} for ${platforms}.`;
    }
    return null;
  } catch (error) {
    console.error("Error fetching data from IGDB:", error);
    if (axios.isAxiosError(error)) {
      console.error("IGDB API Response:", error.response?.data);
    }
    return null;
  }
}

// Fetch series data from IGDB
async function fetchSeriesFromIGDB(seriesTitle: string): Promise<any[] | null> {
  try {
    const accessToken = await getClientCredentialsAccessToken(); // Use the correct function

    const response = await axios.post(
      'https://api.igdb.com/v4/games',
      `fields name, release_dates.date, platforms.name; where series.name ~ "${seriesTitle}";`,
      {
        headers: {
          'Client-ID': process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${accessToken}`, // Use the dynamic access token
        }
      }
    );

    if (response.data && response.data.length > 0) {
      return response.data; // Return the array of game objects
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error fetching series data from IGDB:", error);
    return null;
  }
}

// Fetch data from RAWG with enhanced matching logic
async function fetchFromRAWG(gameTitle: string): Promise<string | null> {
  try {
    // Sanitize and exact match the game title
    const sanitizedTitle = gameTitle.toLowerCase().trim();
    const url = `https://api.rawg.io/api/games?key=${process.env.RAWG_API_KEY}&search=${encodeURIComponent(sanitizedTitle)}&search_precise=true`;
    
    const response = await axios.get(url);

    if (response.data && response.data.results.length > 0) {
      // Find exact match or close match using title comparison
      const game = response.data.results.find((g: any) => {
        const normalizedGameName = g.name.toLowerCase().trim();
        return normalizedGameName === sanitizedTitle || 
               normalizedGameName.includes(sanitizedTitle);
      });

      if (game) {
        return `${game.name} (Released: ${game.released}, Genres: ${game.genres.map((g: any) => g.name).join(', ')}, ` +
               `Platforms: ${game.platforms.map((p: any) => p.platform.name).join(', ')}, ` +
               `URL: https://rawg.io/games/${game.slug})`;
      }
    }
    return null;
  } catch (error) {
    console.error("Error fetching data from RAWG:", error);
    return null;
  }
}

// Fetch series data from RAWG
async function fetchSeriesFromRAWG(seriesTitle: string): Promise<any[] | null> {
  try {
    const url = `https://api.rawg.io/api/games?key=${process.env.RAWG_API_KEY}&search=${encodeURIComponent(seriesTitle)}`;
    const response = await axios.get(url);

    if (response.data && response.data.results.length > 0) {
      return response.data.results; // Return the array of game objects
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error fetching series data from RAWG:", error);
    return null;
  }
}

// Extract series name from question
function extractSeriesName(question: string): string | null {
  const seriesPattern = /list all of the games in the (.+?) series/i;
  const match = question.match(seriesPattern);
  return match ? match[1] : null;
}

// Filter the game list to only include the games from the correct series
function filterGameSeries(games: any[], seriesPrefix: string): any[] {
  return games.filter((game) => game.name.toLowerCase().startsWith(seriesPrefix.toLowerCase()));
}

// Get chat completion for user questions
export const getChatCompletion = async (question: string, systemMessage?: string): Promise<string | null> => {
  try {
    // Generate a cache key based on the question and system message
    const cacheKey = `chat:${question}:${systemMessage || 'default'}`;
    
    // Check if we have a cached response
    const cachedResponse = aiCache.get(cacheKey);
    if (cachedResponse) {
      // console.log('Cache hit for chat completion:', question.substring(0, 30) + '...'); // Commented out for production
      return cachedResponse;
    }

    if (question.toLowerCase().includes("list all of the games in the")) {
      const seriesTitle = extractSeriesName(question);
      if (seriesTitle) {
        let games = await fetchSeriesFromIGDB(seriesTitle);
        if (!games) {
          games = await fetchSeriesFromRAWG(seriesTitle);
        }

        if (games && games.length > 0) {
          const filteredGames = filterGameSeries(games, seriesTitle);
          if (filteredGames.length > 0) {
            const gameList = filteredGames.map((game, index) => 
              `${index + 1}. ${game.name} (Released: ${game.release_dates ? new Date(game.release_dates[0].date * 1000).toLocaleDateString() : "Unknown release date"}, Platforms: ${game.platforms ? game.platforms.map((p: any) => p.name).join(", ") : "Unknown platforms"})`
            );
            return gameList.join("\n");
          }
        }
        return "Sorry, I couldn't find any information about that series.";
      } else {
        return "Sorry, I couldn't identify the series name from your question.";
      }
    }

    let response = await fetchFromIGDB(question);
    if (!response) {
      response = await fetchFromRAWG(question);
    }

    // If no response from APIs, fall back to OpenAI completion
    if (!response) {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { 
            role: 'system', 
            content: systemMessage || 'You are an AI assistant specializing in video games. You can provide detailed analytics and insights into gameplay, helping players track their progress and identify areas for improvement.' 
          },
          { role: 'user', content: question }
        ],
        max_tokens: 800,
      });

      response = completion.choices[0].message.content;
    }

    // Cache the response if we got one
    if (response) {
      aiCache.set(cacheKey, response);
    }

    return response;
  } catch (error) {
    console.error('Error in getChatCompletion:', error);
    return null;
  }
};

// Analyze user questions and map them to game genres
export const analyzeUserQuestions = (questions: Array<{ question: string, response: string }>): string[] => {
  const genres: { [key: string]: number } = {};

  // Genre mapping object
  const genreMapping: { [key: string]: string } = {
    "rpg": "Role-Playing Game",
    "role-playing": "Role-Playing Game",
    "first-person shooter": "First-Person Shooter",
    "third-person shooter": "Third-Person Shooter",
    "top-down shooter": "Top-Down Shooter",
    "fps": "First-Person Shooter",
    "action-adventure": "Action-Adventure",
    "platformer": "Platformer",
    "strategy": "Strategy",
    "puzzle": "Puzzle",
    "puzzle-platformer": "Puzzle-Platformer",
    "simulation": "Simulation",
    "sports": "Sports",
    "racing": "Racing",
    "fighting": "Fighting",
    "adventure": "Adventure",
    "horror": "Horror",
    "survival": "Survival",
    "sandbox": "Sandbox",
    "mmo": "Massively Multiplayer Online",
    "mmorpg": "Massively Multiplayer Online Role-Playing Game",
    "battle royale": "Battle Royale",
    "open world": "Open World",
    "stealth": "Stealth",
    "rhythm": "Rhythm",
    "party": "Party",
    "visual novel": "Visual Novel",
    "indie": "Indie",
    "arcade": "Arcade",
    "shooter": "Shooter",
    "text-based": "Text Based",
    "turn-based tactics": "Turn-Based Tactics",
    "real-time strategy": "Real-Time Strategy",
    "tactical rpg": "Tactical RPG",
    "tactical role-playing game": "Tactical Role-Playing Game",
    "artillery": "Artillery",
    "endless runner": "Endless Runner",
    "tile-matching": "Tile-Matching",
    "hack and slash": "Hack and Slash",
    "4X": "4X",
    "moba": "Multiplayer Online Battle Arena",
    "multiplayer online battle arena": "Multiplayer Online Battle Arena",
    "maze": "Maze",
    "tower defense": "Tower Defense",
    "digital collectible card game": "Digital Collectible Card Game",
    "roguelike": "Roguelike",
    "point and click": "Point and Click",
    "social simulation": "Social Simulation",
    "interactive story": "Interactive Story",
    "level editor": "Level Editor",
    "game creation system": "Game Creation System",
    "exergaming": "Exergaming",
    "exercise": "Exergaming",
    "run and gun": "Run and Gun",
    "rail shooter": "Rail Shooter",
    "beat 'em up": "Beat 'em up",
    "metroidvania": "Metroidvania",
    "survival horror": "Survival Horror",
    "action rpg": "Action Role-Playing Game",
    "action role-playing game": "Action Role-Playing Game",
    "immersive sim": "Immersive Sim",
    "Construction and management simulation": "Construction and Management Simulation",
    "vehicle simulation": "Vehicle Simulation",
    "real-time tactics": "Real-Time Tactics",
    "grand strategy": "Grand Strategy",
    "gacha": "Gacha",
    "photography": "Photography",
    "idle": "Incremental",
    "incremental": "Incremental",
    "mmofps": "Massively Multiplayer Online First-Person Shooter",
    "mmorts": "Massively Multiplayer Online Real-Time Strategy",
    "mmotbs": "Massively Multiplayer Online Turn-Based Strategy",
  };

  // Loop through each question and count the occurrences of each genre based on keywords
  questions.forEach(({ question }) => {
    Object.keys(genreMapping).forEach(keyword => {
      if (question.toLowerCase().includes(keyword.toLowerCase())) {
        const genre = genreMapping[keyword];
        genres[genre] = (genres[genre] || 0) + 1;
      }
    });
  });

  // Sort genres by frequency in descending order
  return Object.keys(genres).sort((a, b) => genres[b] - genres[a]);
};

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

// Fetch game recommendations based on genre
// Note: RAWG API accepts genre slugs (e.g., "racing", "action", "rpg") or genre IDs
// Filters out unreleased games
export const fetchRecommendations = async (genre: string): Promise<string[]> => {
  const url = `https://api.rawg.io/api/games?key=${process.env.RAWG_API_KEY}&genres=${encodeURIComponent(genre)}&page_size=20`;

  try {
    const response = await axios.get(url);
    if (response.data && response.data.results && response.data.results.length > 0) {
      // Filter out unreleased games and return only released game names
      return response.data.results
        .filter((game: any) => isGameReleased(game))
        .map((game: any) => game.name);
    } else {
      // Log if no results (for debugging)
      // console.log(`[Recommendations] No games found for genre: ${genre}`);
      return [];
    }
  } catch (error: any) {
    // Log detailed error for debugging
    if (error.response) {
      console.error(`[Recommendations] RAWG API error for genre "${genre}":`, error.response.status, error.response.data);
    } else {
      console.error(`[Recommendations] Error fetching data from RAWG for genre "${genre}":`, error.message);
    }
    return [];
  }
};

// Export the cache for use in other modules
export const getAICache = () => aiCache;

// Interface for question metadata
export interface QuestionMetadata {
  detectedGame?: string;
  detectedGenre?: string[];
  questionCategory?: string;
  difficultyHint?: string;
  interactionType?: string;
}

/**
 * Check if a game title is a bundle, DLC, or expansion
 */
function isBundleOrDLC(title: string): boolean {
  const lower = title.toLowerCase();
  const bundleIndicators = [
    'bundle',
    'expansion pass',
    'expansion pack',
    'dlc',
    'twin pack',
    'double pack',
    'collection',
    'edition',
    'remastered twin',
    '&',
    'and expansion',
    'season pass',
    'complete edition',
    'ultimate edition',
    'deluxe edition',
  ];
  
  return bundleIndicators.some(indicator => lower.includes(indicator));
}

/**
 * Extract all games from a bundle/DLC name
 * Returns an array of game titles found in the bundle
 * Example: "Final Fantasy VII & Final Fantasy VIII Remastered Twin Pack"
 *          -> ["Final Fantasy VII", "Final Fantasy VIII"]
 */
function extractGamesFromBundle(bundleTitle: string): string[] {
  const games: string[] = [];
  
  // Handle twin packs / double packs - extract both games
  // Pattern: "Game A & Game B Twin Pack" or "Game A and Game B Twin Pack"
  const twinPackMatch = bundleTitle.match(/^(.+?)(?:\s*&\s*|\s+and\s+)(.+?)(?:\s+(?:twin|double|pack|remastered).*)?$/i);
  if (twinPackMatch && twinPackMatch[1] && twinPackMatch[2]) {
    const firstGame = twinPackMatch[1].trim();
    const secondGame = twinPackMatch[2].trim();
    
    // Clean up any remaining bundle suffixes from second game
    const cleanedSecond = secondGame.replace(/\s+(?:twin|double|pack|remastered|bundle|edition).*$/i, '').trim();
    
    if (firstGame.length >= 5) {
      games.push(firstGame);
    }
    if (cleanedSecond.length >= 5 && cleanedSecond !== firstGame) {
      games.push(cleanedSecond);
    }
    
    if (games.length > 0) {
      return games;
    }
  }
  
  // For single-game bundles with expansion/DLC, extract the base game
  // Pattern: "Game Name and Expansion Pass Bundle"
  const expansionMatch = bundleTitle.match(/^(.+?)(?:\s+and\s+.*?(?:expansion|pass|bundle|pack|dlc|edition).*)$/i);
  if (expansionMatch && expansionMatch[1]) {
    const baseGame = expansionMatch[1].trim();
    if (baseGame.length >= 5) {
      games.push(baseGame);
      return games;
    }
  }
  
  // Fallback: remove common bundle suffixes
  let cleaned = bundleTitle
    .replace(/\s+and\s+.*?(?:expansion|pass|bundle|pack|dlc|edition).*$/i, '')
    .replace(/\s+&\s+.*?(?:remastered|twin|double|pack).*$/i, '')
    .replace(/\s+(?:expansion|pass|bundle|pack|dlc|edition|collection|remastered).*$/i, '')
    .trim();
  
  if (cleaned.length >= 5 && cleaned.length < bundleTitle.length * 0.7) {
    games.push(cleaned);
    return games;
  }
  
  // If we can't extract games, return the original title
  return [bundleTitle];
}

/**
 * Extract base game title from bundle/DLC name (backward compatibility)
 * For multi-game bundles, returns the first game (use extractGamesFromBundle for better results)
 */
function extractBaseGameFromBundle(bundleTitle: string): string {
  const games = extractGamesFromBundle(bundleTitle);
  return games.length > 0 ? games[0] : bundleTitle;
}

/**
 * Determine which game from a bundle is mentioned in the question text
 * Returns the most relevant game title, or null if none found
 */
function findRelevantGameFromBundle(bundleTitle: string, question: string): string | null {
  const games = extractGamesFromBundle(bundleTitle);
  if (games.length === 0) {
    return null;
  }
  
  // If only one game, return it
  if (games.length === 1) {
    return games[0];
  }
  
  // For multiple games, check which one appears in the question
  const lowerQuestion = question.toLowerCase();
  const gameScores: Array<{ game: string; score: number }> = [];
  
  for (const game of games) {
    const lowerGame = game.toLowerCase();
    let score = 0;
    
    // Check for exact match (highest priority)
    if (lowerQuestion.includes(lowerGame)) {
      score += 100;
      
      // Bonus if it's mentioned as a standalone phrase (not part of another word)
      const gameWords = lowerGame.split(/\s+/);
      const allWordsMatch = gameWords.every(word => {
        // Check if word appears as a whole word in the question
        // Escape special regex characters
        const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Match word at start/end of string or surrounded by non-alphanumeric characters
        // This handles special characters like ö, ō correctly
        const wordRegex = new RegExp(`(?:^|[^a-z0-9À-ÿĀ-ž])${escapedWord}(?:[^a-z0-9À-ÿĀ-ž]|$)`, 'i');
        return wordRegex.test(lowerQuestion);
      });
      
      if (allWordsMatch) {
        score += 50;
      }
    }
    
    // Check for partial matches (key words from the game title)
    const gameWords = lowerGame.split(/\s+/).filter(w => w.length > 3);
    const matchingWords = gameWords.filter(word => lowerQuestion.includes(word));
    score += matchingWords.length * 10;
    
    // Check for roman numerals or numbers (e.g., "VII", "VIII", "2", "3")
    const numberMatch = game.match(/\b([IVXLCDM]+|\d+)\b/i);
    if (numberMatch) {
      const number = numberMatch[1].toLowerCase();
      if (lowerQuestion.includes(number)) {
        score += 30;
      }
    }
    
    gameScores.push({ game, score });
  }
  
  // Sort by score (highest first)
  gameScores.sort((a, b) => b.score - a.score);
  
  // Return the game with the highest score, but only if it has a meaningful score
  if (gameScores.length > 0 && gameScores[0].score > 0) {
    return gameScores[0].game;
  }
  
  // If no clear winner, return the first game (fallback)
  return games[0];
}

/**
 * Search IGDB for a game title and return the matched game name if found
 * Prefers base games over bundles/DLC
 */
async function searchGameInIGDB(candidateTitle: string): Promise<string | null> {
  try {
    const accessToken = await getClientCredentialsAccessToken();
    const sanitizedTitle = candidateTitle.replace(/"/g, '\\"');
    
    const response = await axios.post(
      'https://api.igdb.com/v4/games',
      `search "${sanitizedTitle}";
       fields name;
       limit 10;`,
      {
        headers: {
          'Client-ID': process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID!,
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      }
    );

    if (response.data && response.data.length > 0) {
      const lowerCandidate = candidateTitle.toLowerCase();
      
      // First, try to find exact or close match
      const exactMatch = response.data.find((g: any) => {
        const gameName = g.name.toLowerCase();
        return gameName === lowerCandidate || 
               gameName.includes(lowerCandidate) ||
               lowerCandidate.includes(gameName);
      });
      
      if (exactMatch && !isBundleOrDLC(exactMatch.name)) {
        return exactMatch.name;
      }
      
      // If exact match is a bundle, try to find base game
      if (exactMatch && isBundleOrDLC(exactMatch.name)) {
        const baseGame = extractBaseGameFromBundle(exactMatch.name);
        // Search for the base game in results
        const baseGameMatch = response.data.find((g: any) => {
          const gameName = g.name.toLowerCase();
          const baseLower = baseGame.toLowerCase();
          return (gameName === baseLower || 
                  gameName.includes(baseLower) ||
                  baseLower.includes(gameName)) && 
                 !isBundleOrDLC(g.name);
        });
        if (baseGameMatch) {
          return baseGameMatch.name;
        }
      }
      
      // Prefer non-bundle results
      const nonBundleResults = response.data.filter((g: any) => !isBundleOrDLC(g.name));
      if (nonBundleResults.length > 0) {
        // Check if there's significant overlap in words
        const firstResult = nonBundleResults[0];
        const firstResultLower = firstResult.name.toLowerCase();
        const candidateWords = lowerCandidate.split(/\s+/).filter((w: string) => w.length > 2);
        const resultWords = firstResultLower.split(/\s+/).filter((w: string) => w.length > 2);
        const matchingWords = candidateWords.filter(word => resultWords.includes(word));
        
        if (matchingWords.length >= 1 || candidateTitle.length <= 15) {
          return firstResult.name;
        }
      }
      
      // Fallback to first result if no non-bundle found
      const firstResult = response.data[0];
      // If it's a bundle, try to extract base game
      if (isBundleOrDLC(firstResult.name)) {
        const baseGame = extractBaseGameFromBundle(firstResult.name);
        // Try to find base game in results
        const baseGameMatch = response.data.find((g: any) => {
          const gameName = g.name.toLowerCase();
          const baseLower = baseGame.toLowerCase();
          return (gameName === baseLower || gameName.includes(baseLower)) && 
                 !isBundleOrDLC(g.name);
        });
        if (baseGameMatch) {
          return baseGameMatch.name;
        }
        // If no base game found, return cleaned version
        return baseGame;
      }
      
      return firstResult.name;
    }
    return null;
  } catch (error) {
    // Silently fail - this is a background operation
    return null;
  }
}

/**
 * Search RAWG for a game title and return the matched game name if found
 * Prefers base games over bundles/DLC
 */
async function searchGameInRAWG(candidateTitle: string): Promise<string | null> {
  try {
    const sanitizedTitle = candidateTitle.toLowerCase().trim();
    const url = `https://api.rawg.io/api/games?key=${process.env.RAWG_API_KEY}&search=${encodeURIComponent(sanitizedTitle)}&page_size=10`;
    
    const response = await axios.get(url);

    if (response.data && response.data.results.length > 0) {
      const lowerCandidate = sanitizedTitle;
      
      // First, try to find exact or close match (prefer non-bundles)
      const nonBundleMatches = response.data.results.filter((g: any) => {
        const normalizedGameName = g.name.toLowerCase().trim();
        const isMatch = normalizedGameName === lowerCandidate || 
               normalizedGameName.includes(lowerCandidate) ||
               lowerCandidate.includes(normalizedGameName);
        return isMatch && !isBundleOrDLC(g.name);
      });
      
      if (nonBundleMatches.length > 0) {
        return nonBundleMatches[0].name;
      }
      
      // If only bundle matches found, try to extract base game
      const bundleMatches = response.data.results.filter((g: any) => {
        const normalizedGameName = g.name.toLowerCase().trim();
        return (normalizedGameName === lowerCandidate || 
               normalizedGameName.includes(lowerCandidate) ||
               lowerCandidate.includes(normalizedGameName)) &&
               isBundleOrDLC(g.name);
      });
      
      if (bundleMatches.length > 0) {
        const bundleTitle = bundleMatches[0].name;
        const baseGame = extractBaseGameFromBundle(bundleTitle);
        // Search for base game in results
        const baseGameMatch = response.data.results.find((g: any) => {
          const normalizedGameName = g.name.toLowerCase().trim();
          const baseLower = baseGame.toLowerCase();
          return (normalizedGameName === baseLower || 
                  normalizedGameName.includes(baseLower) ||
                  baseLower.includes(normalizedGameName)) &&
                 !isBundleOrDLC(g.name);
        });
        if (baseGameMatch) {
          return baseGameMatch.name;
        }
        // If no base game found, return cleaned version
        return baseGame;
      }
      
      // Fallback: prefer first non-bundle result
      const nonBundleResults = response.data.results.filter((g: any) => !isBundleOrDLC(g.name));
      if (nonBundleResults.length > 0) {
        const firstResult = nonBundleResults[0];
        const firstResultLower = firstResult.name.toLowerCase();
        const candidateWords = lowerCandidate.split(/\s+/).filter((w: string) => w.length > 2);
        const resultWords = firstResultLower.split(/\s+/).filter((w: string) => w.length > 2);
        const matchingWords = candidateWords.filter(word => resultWords.includes(word));
        
        if (matchingWords.length >= 1 || candidateTitle.length <= 15) {
          return firstResult.name;
        }
      }
      
      // Last resort: return first result (even if bundle)
      const firstResult = response.data.results[0];
      if (isBundleOrDLC(firstResult.name)) {
        const baseGame = extractBaseGameFromBundle(firstResult.name);
        // Try to find base game
        const baseGameMatch = response.data.results.find((g: any) => {
          const normalizedGameName = g.name.toLowerCase().trim();
          const baseLower = baseGame.toLowerCase();
          return (normalizedGameName === baseLower || normalizedGameName.includes(baseLower)) &&
                 !isBundleOrDLC(g.name);
        });
        if (baseGameMatch) {
          return baseGameMatch.name;
        }
        return baseGame;
      }
      
      return firstResult.name;
    }
    return null;
  } catch (error) {
    // Silently fail - this is a background operation
    return null;
  }
}

/**
 * Extract potential game title candidates from question text
 * Returns an array of candidate strings that might be game titles
 */
function extractGameTitleCandidates(question: string): string[] {
  if (!question || question.length < 3) return [];

  const candidates: string[] = [];
  const lowerQuestion = question.toLowerCase();

  // Strategy 1: Quoted game titles (most reliable)
  const quotedMatch = question.match(/["']([^"']+)["']/i);
  if (quotedMatch && quotedMatch[1].trim().length >= 3) {
    candidates.push(quotedMatch[1].trim());
  }

  // Strategy 2: "in [Game Title]", "for [Game Title]" patterns
  // Updated to handle special characters (é, ü, ö, ō, etc.) and roman numerals (X, Y, III, etc.)
  // Improved to stop at common verbs and question words to avoid capturing too much
  // Character class includes: À-ÿ (Latin-1), Ā-ž (Latin Extended-A), and common Unicode letters
  const inGamePattern = /\b(?:in|for|from|on)\s+(?:the\s+)?([A-ZÀ-ÿĀ-ž][A-Za-z0-9À-ÿĀ-ž\s:'&-]+?)(?:\s+(?:how|what|where|when|why|which|who|is|does|do|has|have|can|could|would|should|was|were|will|did)|$|[?.!])/gi;
  let match: RegExpExecArray | null;
  while ((match = inGamePattern.exec(question)) !== null) {
    if (match[1]) {
      let candidate = match[1].trim();
      // Remove leading question words
      candidate = candidate.replace(/^(?:what|which|where|when|why|how|who|the|a|an)\s+/i, '');
      // Remove trailing verbs and question words
      candidate = candidate.replace(/\s+(?:has|have|is|are|does|do|can|could|would|should|was|were|will|did)$/i, '');
      // Remove any text before "in" if it was accidentally captured (e.g., "kart has" before "in")
      const inIndex = candidate.toLowerCase().indexOf(' in ');
      if (inIndex > 0) {
        candidate = candidate.substring(inIndex + 4).trim();
      }
      
      if (candidate.length >= 3 && !/^(what|which|where|when|why|how|who)$/i.test(candidate)) {
        // Check for non-game indicators (phrases that indicate this isn't a game title)
        const lowerCandidate = candidate.toLowerCase();
        if (!lowerCandidate.includes('kart has') && 
            !lowerCandidate.includes('is the') &&
            !lowerCandidate.includes('best way') &&
            !lowerCandidate.includes('battle and catch') &&
            !lowerCandidate.includes('has the') &&
            !lowerCandidate.includes('has highest') &&
            !lowerCandidate.includes('has best') &&
            !lowerCandidate.includes('has the lowest') &&
            !lowerCandidate.includes('has the worst') &&
            !lowerCandidate.includes('CTGP') &&
            !lowerCandidate.includes('has the slowest') &&
            !lowerCandidate.includes('has the easiest') &&
            !lowerCandidate.includes('has the hardest')) {
          candidates.push(candidate);
        }
      }
    }
  }

  // Strategy 3: Proper noun patterns (capitalized words, including special chars)
  // Also matches patterns like "Pokémon X and Y", "Final Fantasy VII", "God of War Ragnarök"
  // Character class includes: À-ÿ (Latin-1), Ā-ž (Latin Extended-A) for characters like ö, ō
  const properNounPattern = /\b([A-ZÀ-ÿĀ-ž][a-zÀ-ÿĀ-ž]+(?:\s+(?:[A-ZÀ-ÿĀ-ž][a-zÀ-ÿĀ-ž]+|[IVXLCDM]+|\band\b)){1,4})\b/g;
  while ((match = properNounPattern.exec(question)) !== null) {
    if (match[1]) {
      let candidate = match[1].trim();
      // Skip if it's at the start of a sentence (likely not a game)
      const candidateIndex = question.indexOf(candidate);
      if (candidateIndex > 0 && candidate.length >= 5) {
        // Filter out common question starters
        if (!/^(How|What|Where|When|Why|Which|Who)\s+/.test(candidate)) {
          candidates.push(candidate);
        }
      }
    }
  }

  // Strategy 4: Extract from "What [item] in [game]?" patterns (with special char support)
  // Improved to better handle cases where the game title might have extra text before it
  // Character class includes: À-ÿ (Latin-1), Ā-ž (Latin Extended-A) for characters like ö, ō
  const itemInGameMatch = question.match(/(?:what|which|where|how).+?\bin\s+(?:the\s+)?([A-ZÀ-ÿĀ-ž][A-Za-z0-9À-ÿĀ-ž\s:'&-]{3,50})(?:\??\s*$|[?.!])/i);
  if (itemInGameMatch && itemInGameMatch[1]) {
    let candidate = itemInGameMatch[1].trim();
    // Clean up common endings
    candidate = candidate.replace(/\s+(?:how|what|where|when|why|which|who)$/i, '');
    // Remove any text that looks like it's part of the question, not the game title
    // If candidate contains verbs like "has", "is", etc., try to extract just the game part
    const verbPattern = /\s+(?:has|have|is|are|does|do|can|could|would|should|was|were|will|did)\s+/i;
    const verbMatch = candidate.match(verbPattern);
    if (verbMatch && verbMatch.index !== undefined) {
      // If we find a verb, the game title is likely after it
      // But actually, if there's a verb, the game is probably before "in"
      // So this candidate might be malformed - skip it or try to clean it
      const beforeVerb = candidate.substring(0, verbMatch.index).trim();
      // If what's before the verb is short and looks like a game title, use it
      // Check for uppercase letter or special character (À-ÿ, Ā-ž)
      if (beforeVerb.length >= 3 && beforeVerb.length <= 30 && /^[A-ZÀ-ÿĀ-ž]/.test(beforeVerb)) {
        candidate = beforeVerb;
      }
    }
    if (candidate.length >= 3 && candidate.length <= 50) {
      // Additional check: if candidate contains common question phrases, it's probably wrong
      const lowerCandidate = candidate.toLowerCase();
      if (!lowerCandidate.includes('has the') && 
          !lowerCandidate.includes('has highest') &&
          !lowerCandidate.includes('has best') &&
          !lowerCandidate.includes('kart has') &&
          !lowerCandidate.includes('has the lowest') &&
          !lowerCandidate.includes('has the worst') &&
          !lowerCandidate.includes('has the slowest') &&
          !lowerCandidate.includes('has the easiest') &&
          !lowerCandidate.includes('has the hardest')) {
        candidates.push(candidate);
      }
    }
  }

  // Strategy 5: Specific pattern for "Pokémon X and Y", "Final Fantasy VII" style titles
  // Matches: [Name] [Letter/Numeral] and [Letter/Numeral]
  // Character class includes: À-ÿ (Latin-1), Ā-ž (Latin Extended-A) for characters like ö, ō
  const versionedGamePattern = /\b([A-ZÀ-ÿĀ-ž][a-zÀ-ÿĀ-ž]+)\s+([A-ZIVXLCDM]+)\s+and\s+([A-ZIVXLCDM]+)\b/gi;
  while ((match = versionedGamePattern.exec(question)) !== null) {
    if (match[1] && match[2] && match[3]) {
      const candidate = `${match[1]} ${match[2]} and ${match[3]}`;
      if (candidate.length >= 5 && candidate.length <= 60) {
        candidates.push(candidate);
      }
    }
  }

  // Remove duplicates and filter candidates
  const uniqueCandidates = Array.from(new Set(candidates))
    .filter(c => c.length >= 3 && c.length <= 60)
    .filter(c => !isLikelyQuestionWord(c))
    .filter(c => isValidGameTitleCandidate(c));
  
  return uniqueCandidates;
}

/**
 * Helper to check if a string is likely a question word
 */
function isLikelyQuestionWord(text: string): boolean {
  const questionWords = ['what', 'which', 'where', 'when', 'why', 'how', 'who', 'the', 'a', 'an'];
  return questionWords.includes(text.toLowerCase()) || 
         questionWords.some(word => text.toLowerCase().startsWith(word + ' '));
}

/**
 * Validate if a candidate title looks like a real game title
 * Filters out suspicious short words, common words, and non-game terms
 */
function isValidGameTitleCandidate(candidate: string): boolean {
  if (!candidate || candidate.length < 3) return false;
  
  const lower = candidate.toLowerCase().trim();
  
  // Reject single common words that aren't games
  const commonWords = [
    'tin', 'can', 'jump', 'fly', 'migration', 'the', 'a', 'an',
    'how', 'what', 'where', 'when', 'why', 'which', 'who',
    'has', 'have', 'is', 'are', 'was', 'were', 'do', 'does',
    'game', 'games', 'play', 'player', 'playing'
  ];
  
  if (commonWords.includes(lower)) return false;
  
  // Reject if it's just one word and it's too short or common
  const words = lower.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 1 && (words[0].length < 4 || commonWords.includes(words[0]))) {
    return false;
  }
  
  // Reject generic two-word combinations that are likely not game titles
  // These are common words that appear in questions but aren't game titles
  if (words.length === 2) {
    const genericCombinations = [
      'sword master', 'master sword', 'blue shield', 'shield alliance',
      'best weapon', 'weapon guide', 'how to', 'what is', 'where is',
      'game guide', 'walkthrough guide', 'strategy guide'
    ];
    if (genericCombinations.includes(lower)) {
      return false;
    }
    
    // Also reject if both words are very common/generic
    const genericWords = ['sword', 'master', 'shield', 'alliance', 'blue', 'red', 'green', 'gold', 'silver', 'weapon', 'item', 'guide', 'help'];
    if (genericWords.includes(words[0]) && genericWords.includes(words[1])) {
      // Only reject if it's a very generic combination
      if (words[0].length < 6 && words[1].length < 6) {
        return false;
      }
    }
  }
  
  // Reject if it contains only numbers or special characters
  if (!/[a-z]/.test(lower)) return false;
  
  // Reject if it's too long (likely not a game title)
  if (candidate.length > 80) return false;
  
  // Reject if it contains suspicious patterns
  const suspiciousPatterns = [
    /\b(tin can|jump fly|migration)\b/i,
    /^[a-z]\s/i, // Single lowercase letter followed by space
  ];
  
  if (suspiciousPatterns.some(pattern => pattern.test(candidate))) {
    return false;
  }
  
  return true;
}

/**
 * Validate if an API result is acceptable given the original candidate
 * Rejects results that contain unexpected words like "Multiplayer" that weren't in the candidate
 */
function isValidAPIResult(apiResult: string, originalCandidate: string): boolean {
  if (!apiResult || !originalCandidate) return true; // If we can't validate, allow it
  
  const lowerResult = apiResult.toLowerCase();
  const lowerCandidate = originalCandidate.toLowerCase();
  
  // Words that shouldn't appear in results unless they were in the original candidate
  const unexpectedWords = [
    'multiplayer',
    'co-op',
    'coop',
    'online',
    'offline',
    'single player',
    'singleplayer',
    'local',
    'split screen',
    'splitscreen'
  ];
  
  // Check if result contains unexpected words that weren't in the candidate
  for (const word of unexpectedWords) {
    if (lowerResult.includes(word) && !lowerCandidate.includes(word)) {
      // Reject if the word appears in the result but not in the candidate
      return false;
    }
  }
  
  // Additional check: if result is significantly longer than candidate and contains unexpected words
  // This catches cases where "Multiplayer" was added
  if (apiResult.length > originalCandidate.length * 1.3) {
    const resultWords = lowerResult.split(/\s+/);
    const candidateWords = lowerCandidate.split(/\s+/);
    const newWords = resultWords.filter(w => !candidateWords.includes(w));
    
    // If new words include unexpected terms, reject
    if (newWords.some(w => unexpectedWords.some(uw => w.includes(uw)))) {
      return false;
    }
  }
  
  return true;
}

/**
 * Normalize game titles that should start with "The"
 * Ensures titles like "Legend of Zelda" become "The Legend of Zelda"
 */
function normalizeGameTitle(title: string): string {
  if (!title) return title;
  
  const lower = title.toLowerCase().trim();
  
  // Games that should always start with "The"
  const gamesRequiringThe = [
    'legend of zelda',
    'elder scrolls',
    'witcher',
    'last of us',
    'walking dead',
    'sims',
  ];
  
  // Check if title matches a game that requires "The" but doesn't have it
  for (const gamePattern of gamesRequiringThe) {
    if (lower.startsWith(gamePattern) && !lower.startsWith('the ' + gamePattern)) {
      // Add "The" at the beginning
      return 'The ' + title.trim();
    }
  }
  
  return title;
}

/**
 * Check if an API result is relevant to the question text
 * Ensures the result shares significant words with the question or candidate
 */
function isAPIResultRelevantToQuestion(apiResult: string, question: string, candidate: string): boolean {
  if (!apiResult || !question) return true; // If we can't validate, allow it
  
  const lowerResult = apiResult.toLowerCase();
  const lowerQuestion = question.toLowerCase();
  const lowerCandidate = candidate.toLowerCase();
  
  // Extract meaningful words from each (filter out common words)
  const commonWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
    'what', 'which', 'where', 'when', 'why', 'how', 'who', 'can', 'could', 'would', 'should',
    'game', 'games', 'play', 'player', 'playing', 'get', 'got', 'how', 'best', 'way'
  ]);
  
  const extractMeaningfulWords = (text: string): Set<string> => {
    return new Set(
      text
        .toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 2 && !commonWords.has(w))
        .map(w => w.replace(/[^a-z0-9]/g, ''))
        .filter(w => w.length > 2)
    );
  };
  
  const resultWords = extractMeaningfulWords(apiResult);
  const questionWords = extractMeaningfulWords(question);
  const candidateWords = extractMeaningfulWords(candidate);
  
  // Check if result shares words with candidate (strong indicator of relevance)
  const candidateMatches = Array.from(resultWords).filter(w => candidateWords.has(w));
  if (candidateMatches.length >= 2) {
    return true; // Strong match with candidate
  }
  
  // Check if result shares words with question
  const questionMatches = Array.from(resultWords).filter(w => questionWords.has(w));
  
  // For short results (likely game titles), require at least 1 meaningful match
  // For longer results, require at least 2 matches
  const minMatches = apiResult.split(/\s+/).length <= 6 ? 1 : 2;
  
  if (questionMatches.length >= minMatches) {
    return true;
  }
  
  // If no meaningful matches, the result is likely irrelevant
  // Exception: if the candidate itself was very short or generic, be more lenient
  if (candidate.split(/\s+/).length <= 2 && questionMatches.length >= 1) {
    return true;
  }
  
  return false;
}

/**
 * Extract game title from question text using IGDB and RAWG APIs for verification
 * This eliminates the need for hardcoded game title lists
 */
async function extractGameTitleFromQuestion(question: string): Promise<string | undefined> {
  if (!question || question.length < 3) {
    // console.log('[Game Title] Question too short');
    return undefined;
  }

  try {
    // Extract potential game title candidates
    const candidates = extractGameTitleCandidates(question);
    
    if (candidates.length === 0) {
      // console.log('[Game Title] No candidates extracted from question');
      return undefined;
    }

    // console.log(`[Game Title] Extracted ${candidates.length} candidate(s):`, candidates);

    // Try each candidate against IGDB and RAWG APIs
    // Validate candidates before API calls to avoid unnecessary requests
    const validCandidates = candidates.filter(c => isValidGameTitleCandidate(c));
    
    for (const candidate of validCandidates) {
      // console.log(`[Game Title] Trying candidate: "${candidate}"`);
      
      // Try IGDB first
      try {
        const igdbMatch = await searchGameInIGDB(candidate);
        if (igdbMatch) {
          // Validate that the API result doesn't contain unexpected words
          if (!isValidAPIResult(igdbMatch, candidate)) {
            // console.log(`[Game Title] Rejecting IGDB result with unexpected words: "${igdbMatch}"`);
            continue; // Try next candidate
          }
          
          // Validate that the API result is relevant to the question
          if (!isAPIResultRelevantToQuestion(igdbMatch, question, candidate)) {
            // console.log(`[Game Title] Rejecting IGDB result as irrelevant to question: "${igdbMatch}"`);
            continue; // Try next candidate
          }
          
          // Additional validation: reject if API returned a bundle and we can extract base game
          if (isBundleOrDLC(igdbMatch)) {
            // Check which specific game from the bundle is mentioned in the question
            const relevantGame = findRelevantGameFromBundle(igdbMatch, question);
            if (relevantGame && relevantGame !== igdbMatch && isValidGameTitleCandidate(relevantGame)) {
              // Try to find the specific game in a follow-up search
              const specificGameMatch = await searchGameInIGDB(relevantGame);
              if (specificGameMatch && !isBundleOrDLC(specificGameMatch) && 
                  isValidAPIResult(specificGameMatch, relevantGame) &&
                  isAPIResultRelevantToQuestion(specificGameMatch, question, relevantGame)) {
                // console.log(`[Game Title] Found specific game from bundle in IGDB: "${candidate}" -> "${specificGameMatch}"`);
                return normalizeGameTitle(specificGameMatch);
              }
              // If no match found, use the relevant game we extracted (validate it first)
              if (isValidAPIResult(relevantGame, candidate) && 
                  isAPIResultRelevantToQuestion(relevantGame, question, candidate)) {
                // console.log(`[Game Title] Found match in IGDB (extracted from bundle): "${candidate}" -> "${relevantGame}"`);
                return normalizeGameTitle(relevantGame);
              }
            }
            // Fallback to base game extraction if relevance check fails
            const baseGame = extractBaseGameFromBundle(igdbMatch);
            if (baseGame !== igdbMatch && isValidGameTitleCandidate(baseGame)) {
              // Try to find the base game in a follow-up search
              const baseGameMatch = await searchGameInIGDB(baseGame);
              if (baseGameMatch && !isBundleOrDLC(baseGameMatch) && 
                  isValidAPIResult(baseGameMatch, baseGame) &&
                  isAPIResultRelevantToQuestion(baseGameMatch, question, baseGame)) {
                // console.log(`[Game Title] Found base game in IGDB: "${candidate}" -> "${baseGameMatch}"`);
                return normalizeGameTitle(baseGameMatch);
              }
              // If no base game found, use cleaned version (validate it first)
              if (isValidAPIResult(baseGame, candidate) && 
                  isAPIResultRelevantToQuestion(baseGame, question, candidate)) {
                // console.log(`[Game Title] Found match in IGDB (cleaned from bundle): "${candidate}" -> "${baseGame}"`);
                return normalizeGameTitle(baseGame);
              }
            }
          }
          // console.log(`[Game Title] Found match in IGDB: "${candidate}" -> "${igdbMatch}"`);
          // Normalize the title (e.g., ensure "The Legend of Zelda" has "The")
          return normalizeGameTitle(igdbMatch);
        }
      } catch (error) {
        // Only log errors, not failures
        // console.log(`[Game Title] IGDB search failed for "${candidate}":`, error instanceof Error ? error.message : 'Unknown error');
      }

      // Try RAWG as fallback
      try {
        const rawgMatch = await searchGameInRAWG(candidate);
        if (rawgMatch) {
          // Validate that the API result doesn't contain unexpected words
          if (!isValidAPIResult(rawgMatch, candidate)) {
            // console.log(`[Game Title] Rejecting RAWG result with unexpected words: "${rawgMatch}"`);
            continue; // Try next candidate
          }
          
          // Validate that the API result is relevant to the question
          if (!isAPIResultRelevantToQuestion(rawgMatch, question, candidate)) {
            // console.log(`[Game Title] Rejecting RAWG result as irrelevant to question: "${rawgMatch}"`);
            continue; // Try next candidate
          }
          
          // Additional validation: reject if API returned a bundle and we can extract base game
          if (isBundleOrDLC(rawgMatch)) {
            // Check which specific game from the bundle is mentioned in the question
            const relevantGame = findRelevantGameFromBundle(rawgMatch, question);
            if (relevantGame && relevantGame !== rawgMatch && isValidGameTitleCandidate(relevantGame)) {
              // Try to find the specific game in a follow-up search
              const specificGameMatch = await searchGameInRAWG(relevantGame);
              if (specificGameMatch && !isBundleOrDLC(specificGameMatch) && 
                  isValidAPIResult(specificGameMatch, relevantGame) &&
                  isAPIResultRelevantToQuestion(specificGameMatch, question, relevantGame)) {
                // console.log(`[Game Title] Found specific game from bundle in RAWG: "${candidate}" -> "${specificGameMatch}"`);
                return normalizeGameTitle(specificGameMatch);
              }
              // If no match found, use the relevant game we extracted (validate it first)
              if (isValidAPIResult(relevantGame, candidate) && 
                  isAPIResultRelevantToQuestion(relevantGame, question, candidate)) {
                // console.log(`[Game Title] Found match in RAWG (extracted from bundle): "${candidate}" -> "${relevantGame}"`);
                return normalizeGameTitle(relevantGame);
              }
            }
            // Fallback to base game extraction if relevance check fails
            const baseGame = extractBaseGameFromBundle(rawgMatch);
            if (baseGame !== rawgMatch && isValidGameTitleCandidate(baseGame)) {
              // Try to find the base game in a follow-up search
              const baseGameMatch = await searchGameInRAWG(baseGame);
              if (baseGameMatch && !isBundleOrDLC(baseGameMatch) && 
                  isValidAPIResult(baseGameMatch, baseGame) &&
                  isAPIResultRelevantToQuestion(baseGameMatch, question, baseGame)) {
                // console.log(`[Game Title] Found base game in RAWG: "${candidate}" -> "${baseGameMatch}"`);
                return normalizeGameTitle(baseGameMatch);
              }
              // If no base game found, use cleaned version (validate it first)
              if (isValidAPIResult(baseGame, candidate) && 
                  isAPIResultRelevantToQuestion(baseGame, question, candidate)) {
                // console.log(`[Game Title] Found match in RAWG (cleaned from bundle): "${candidate}" -> "${baseGame}"`);
                return normalizeGameTitle(baseGame);
              }
            }
          }
          // console.log(`[Game Title] Found match in RAWG: "${candidate}" -> "${rawgMatch}"`);
          // Normalize the title (e.g., ensure "The Legend of Zelda" has "The")
          return normalizeGameTitle(rawgMatch);
        }
      } catch (error) {
        // Only log errors, not failures
        // console.log(`[Game Title] RAWG search failed for "${candidate}":`, error instanceof Error ? error.message : 'Unknown error');
      }
    }

    // If no API matches, try to find the best candidate
    // Filter out candidates that look like they contain question text, not game titles
    const fallbackCandidates = candidates.filter(c => {
      const lower = c.toLowerCase();
      // Reject candidates that contain common question phrases
      if (lower.includes('has the') || 
          lower.includes('has highest') ||
          lower.includes('has best') ||
          lower.includes('kart has') ||
          lower.includes('is the') ||
          lower.includes('CTGP') ||
          lower.includes('has the lowest') ||
          lower.includes('has the worst') ||
          lower.includes('has the slowest') ||
          lower.includes('has the easiest') ||
          lower.includes('has the hardest') ||
          lower.match(/\b(has|have|is|are|does|do)\s+(the|a|an)\s+/)) {
        return false;
      }
      // Prefer candidates that are reasonable length (3-40 chars) and start with capital or special char
      return c.length >= 3 && c.length <= 40 && /^[A-ZÀ-ÿĀ-ž]/.test(c);
    });
    
    // If we have valid candidates, return the shortest one (likely to be the actual game title)
    if (fallbackCandidates.length > 0) {
      const bestCandidate = fallbackCandidates.sort((a, b) => a.length - b.length)[0];
      // console.log(`[Game Title] No API match for any candidate, using best fallback: "${bestCandidate}"`);
      return bestCandidate;
    }
    
    // Last resort: return first candidate that meets basic criteria
    const fallbackCandidate = candidates.find(c => 
      c.length >= 5 && 
      c.split(/\s+/).length >= 2 && 
      /^[A-ZÀ-ÿĀ-ž]/.test(c)
    );
    
    if (fallbackCandidate) {
      // console.log(`[Game Title] Using fallback candidate: "${fallbackCandidate}"`);
      return fallbackCandidate;
    }

    // console.log('[Game Title] No valid game title found after trying all candidates');
    return undefined;
  } catch (error) {
    console.error('[Game Title] Error in extractGameTitleFromQuestion:', error);
    return undefined;
  }
}


/**
 * Determine question category based on content analysis
 */
function detectQuestionCategory(question: string): string | undefined {
  const lowerQuestion = question.toLowerCase();

  // Boss fight patterns
  if (/(boss|boss fight|boss battle|defeat boss|beat the boss|final boss|superboss)/i.test(lowerQuestion)) {
    return 'boss_fight';
  }

  // Level/walkthrough patterns
  if (/(walkthrough|guide|how to get|how to reach|how do i get|location|where is|find|locate)/i.test(lowerQuestion)) {
    return 'level_walkthrough';
  }

  // Strategy patterns
  if (/(strategy|tactic|best build|loadout|optimal|build guide|meta|best way to|how should i)/i.test(lowerQuestion)) {
    return 'strategy';
  }

  // Item lookup patterns
  if (/(item|weapon|armor|equipment|gear|what does|item description|where to find|how to get)/i.test(lowerQuestion)) {
    return 'item_lookup';
  }

  // Character patterns
  if (/(character|class|hero|champion|who should i|character build|which character)/i.test(lowerQuestion)) {
    return 'character';
  }

  // Achievement/completion patterns
  if (/(achievement|trophy|100%|complete|completion|collect all|unlock)/i.test(lowerQuestion)) {
    return 'achievement';
  }

  // Performance/technical patterns
  if (/(performance|fps|lag|optimization|settings|graphics|stuttering|bug|glitch)/i.test(lowerQuestion)) {
    return 'technical';
  }

  // General gameplay
  if (/(how to|what is|explain|tell me about|help with)/i.test(lowerQuestion)) {
    return 'general_gameplay';
  }

  return undefined;
}

/**
 * Estimate difficulty level based on question content
 */
function estimateDifficultyHint(question: string): string | undefined {
  const lowerQuestion = question.toLowerCase();

  // Beginner indicators
  const beginnerPatterns = [
    /how do i start/i,
    /beginner/i,
    /new player/i,
    /first time/i,
    /tutorial/i,
    /basics?/i,
    /easy/i,
    /simple/i,
    /what is/i,
    /explain/i
  ];

  // Advanced indicators
  const advancedPatterns = [
    /advanced/i,
    /expert/i,
    /optimal/i,
    /min-max/i,
    /speedrun/i,
    /world record/i,
    /pro/i,
    /competitive/i,
    /ranked/i,
    /meta/i,
    /best build/i,
    /optimize/i
  ];

  // Intermediate indicators
  const intermediatePatterns = [
    /strategy/i,
    /tactic/i,
    /improve/i,
    /better/i,
    /tips/i,
    /guide/i,
    /walkthrough/i
  ];

  if (advancedPatterns.some(pattern => pattern.test(lowerQuestion))) {
    return 'advanced';
  }

  if (beginnerPatterns.some(pattern => pattern.test(lowerQuestion))) {
    return 'beginner';
  }

  if (intermediatePatterns.some(pattern => pattern.test(lowerQuestion))) {
    return 'intermediate';
  }

  // Default to intermediate if question is long and detailed
  if (question.length > 50) {
    return 'intermediate';
  }

  return undefined;
}

/**
 * Determine interaction type based on question format and content
 */
function detectInteractionType(question: string): string | undefined {
  const lowerQuestion = question.toLowerCase();
  const questionLength = question.length;

  // Fast tip - short, direct questions
  if (questionLength < 50 && /^(what|where|when|how|who|which|is|can|does|do)\s+/i.test(question)) {
    return 'fast_tip';
  }

  // Detailed guide - longer questions with multiple requests or detailed context
  if (questionLength > 100 || /guide|walkthrough|explain|detailed|step by step|comprehensive/i.test(lowerQuestion)) {
    return 'detailed_guide';
  }

  // Item lookup - specific item/equipment questions
  if (/what (is|does|are)|item|weapon|armor|equipment|gear/i.test(lowerQuestion)) {
    return 'item_lookup';
  }

  // Comparison - questions asking to compare options
  if (/(vs|versus|compared to|better|which (is|should|do)|difference between)/i.test(lowerQuestion)) {
    return 'comparison';
  }

  // Quick answer - very short questions
  if (questionLength < 30) {
    return 'quick_answer';
  }

  // Default to detailed_guide for longer questions
  if (questionLength > 60) {
    return 'detailed_guide';
  }

  return 'fast_tip';
}

/**
 * Extract comprehensive metadata from a question
 * Phase 2 Step 1: Question Metadata Analysis
 * This function analyzes a question and extracts metadata without affecting the main flow
 */
export const extractQuestionMetadata = async (
  question: string,
  checkQuestionTypeFn?: (question: string) => string[]
): Promise<QuestionMetadata> => {
  try {
    // console.log('[Metadata Extraction] Starting metadata extraction for question:', question.substring(0, 100));
    const metadata: QuestionMetadata = {};

    // Extract game title using IGDB/RAWG APIs (async)
    const detectedGame = await extractGameTitleFromQuestion(question);
    if (detectedGame) {
      metadata.detectedGame = detectedGame;
      // console.log('[Metadata Extraction] Detected game:', detectedGame);
    }

    // Extract genres using the existing checkQuestionType function if provided
    // Otherwise, use a simple fallback
    if (checkQuestionTypeFn) {
      const genres = checkQuestionTypeFn(question);
      if (genres && genres.length > 0) {
        metadata.detectedGenre = genres;
        // console.log('[Metadata Extraction] Detected genres:', genres);
      }
    }

    // Detect question category
    const category = detectQuestionCategory(question);
    if (category) {
      metadata.questionCategory = category;
      // console.log('[Metadata Extraction] Question category:', category);
    }

    // Estimate difficulty
    const difficulty = estimateDifficultyHint(question);
    if (difficulty) {
      metadata.difficultyHint = difficulty;
      // console.log('[Metadata Extraction] Difficulty hint:', difficulty);
    }

    // Detect interaction type
    const interactionType = detectInteractionType(question);
    if (interactionType) {
      metadata.interactionType = interactionType;
      // console.log('[Metadata Extraction] Interaction type:', interactionType);
    }

    // console.log('[Metadata Extraction] Extraction complete. Metadata:', JSON.stringify(metadata, null, 2));
    return metadata;
  } catch (error) {
    console.error('[Metadata Extraction] Error extracting question metadata:', error);
    // Return empty metadata on error - don't break the flow
    return {};
  }
};

/**
 * Update a question document with extracted metadata
 * This runs asynchronously and doesn't block the main response flow
 */
export const updateQuestionMetadata = async (
  questionId: string,
  metadata: QuestionMetadata
): Promise<void> => {
  try {
    // console.log('[Metadata Update] Starting metadata update for question ID:', questionId);
    const Question = (await import('../models/Question')).default;
    
    const updateData: Partial<QuestionMetadata> = {};
    
    // Only update fields that have values
    if (metadata.detectedGame) {
      updateData.detectedGame = metadata.detectedGame;
    }
    if (metadata.detectedGenre && metadata.detectedGenre.length > 0) {
      updateData.detectedGenre = metadata.detectedGenre;
    }
    if (metadata.questionCategory) {
      updateData.questionCategory = metadata.questionCategory;
    }
    if (metadata.difficultyHint) {
      updateData.difficultyHint = metadata.difficultyHint;
    }
    if (metadata.interactionType) {
      updateData.interactionType = metadata.interactionType;
    }

    // Only update if we have at least one field to update
    if (Object.keys(updateData).length > 0) {
      const result = await Question.findByIdAndUpdate(questionId, { $set: updateData }, { new: true });
      // console.log('[Metadata Update] Successfully updated question with metadata:', JSON.stringify(updateData, null, 2));
      // console.log('[Metadata Update] Updated question ID:', questionId);
      // if (result) {
      //   console.log('[Metadata Update] Verified question document updated');
      // }
    } else {
      // console.log('[Metadata Update] No metadata to update (all fields empty)');
    }
  } catch (error) {
    // Log error but don't throw - this is a background operation
    console.error('[Metadata Update] Error updating question metadata:', error);
  }
};

// ============================================================================
// Phase 2 Step 2: Pattern Detection Helper Functions
// ============================================================================

/**
 * Frequency Analysis Helpers
 * These functions analyze question timing patterns
 */

/**
 * Calculate average questions per week from question history
 */
function calculateWeeklyRate(questions: Array<{ timestamp: Date | string | number }>): number {
  if (!questions || questions.length === 0) return 0;
  if (questions.length === 1) return 1; // Single question = 1 per week

  // Sort questions by timestamp
  const sortedQuestions = [...questions].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const firstQuestion = new Date(sortedQuestions[0].timestamp);
  const lastQuestion = new Date(sortedQuestions[sortedQuestions.length - 1].timestamp);
  
  // Calculate time span in weeks
  const timeSpanMs = lastQuestion.getTime() - firstQuestion.getTime();
  const timeSpanWeeks = timeSpanMs / (1000 * 60 * 60 * 24 * 7);

  // If questions span less than a day, assume 1 week
  if (timeSpanWeeks < 0.14) {
    return questions.length;
  }

  // Calculate rate
  return questions.length / timeSpanWeeks;
}

/**
 * Detect peak activity hours from question timestamps
 * Returns array of hours (0-23) when user is most active
 */
function detectPeakHours(questions: Array<{ timestamp: Date | string | number }>): number[] {
  if (!questions || questions.length === 0) return [];

  const hourCounts: { [hour: number]: number } = {};
  
  // Count questions by hour of day
  questions.forEach((q) => {
    const hour = new Date(q.timestamp).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });

  // Find hours with above-average activity
  const totalQuestions = questions.length;
  const averagePerHour = totalQuestions / 24;
  const threshold = averagePerHour * 1.5; // 50% above average

  const peakHours = Object.entries(hourCounts)
    .filter(([_, count]) => count >= threshold)
    .map(([hour, _]) => parseInt(hour))
    .sort((a, b) => a - b);

  return peakHours.length > 0 ? peakHours : [];
}

/**
 * Detect session patterns from question timestamps
 * Returns: "daily", "weekly", or "sporadic"
 */
function detectSessionPatterns(questions: Array<{ timestamp: Date | string | number }>): 'daily' | 'weekly' | 'sporadic' {
  if (!questions || questions.length < 2) return 'sporadic';

  const sortedQuestions = [...questions].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Calculate time gaps between consecutive questions (in hours)
  const gaps: number[] = [];
  for (let i = 1; i < sortedQuestions.length; i++) {
    const prev = new Date(sortedQuestions[i - 1].timestamp);
    const curr = new Date(sortedQuestions[i].timestamp);
    const gapHours = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60);
    gaps.push(gapHours);
  }

  // Calculate average gap
  const avgGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;

  // Categorize based on average gap
  if (avgGap <= 24) {
    return 'daily'; // Questions within 24 hours on average
  } else if (avgGap <= 168) {
    return 'weekly'; // Questions within a week on average
  } else {
    return 'sporadic'; // Questions more than a week apart
  }
}

/**
 * TEST FUNCTION: Test frequency analysis helpers
 * COMMENTED OUT FOR PRODUCTION - Uncomment for testing/debugging
 * 
 * export const testFrequencyHelpers = async (username: string) => {
 *   try {
 *     const Question = (await import('../models/Question')).default;
 *     
 *     // Get user's questions
 *     const questions = await Question.find({ username })
 *       .sort({ timestamp: -1 })
 *       .limit(100)
 *       .select('timestamp')
 *       .lean();
 * 
 *     if (questions.length === 0) {
 *       console.log('[Test] No questions found for user:', username);
 *       return {
 *         error: 'No questions found',
 *         username,
 *       };
 *     }
 * 
 *     // Ensure questions have timestamp property and convert to expected format
 *     const questionsWithTimestamp = questions
 *       .filter((q: any) => q.timestamp)
 *       .map((q: any) => ({ timestamp: q.timestamp }));
 * 
 *     if (questionsWithTimestamp.length === 0) {
 *       return {
 *         error: 'No questions with valid timestamps found',
 *         username,
 *       };
 *     }
 * 
 *     // Test each helper function
 *     const weeklyRate = calculateWeeklyRate(questionsWithTimestamp);
 *     const peakHours = detectPeakHours(questionsWithTimestamp);
 *     const sessionPattern = detectSessionPatterns(questionsWithTimestamp);
 * 
 *     const results = {
 *       username,
 *       totalQuestions: questions.length,
 *       frequency: {
 *         questionsPerWeek: weeklyRate,
 *         peakActivityHours: peakHours,
 *         sessionPattern: sessionPattern,
 *       },
 *       sampleQuestions: questionsWithTimestamp.slice(0, 5).map(q => ({
 *         timestamp: q.timestamp,
 *         hour: new Date(q.timestamp).getHours(),
 *       })),
 *     };
 * 
 *     console.log('[Test Frequency Helpers] Results:', JSON.stringify(results, null, 2));
 *     return results;
 *   } catch (error) {
 *     console.error('[Test Frequency Helpers] Error:', error);
 *     return {
 *       error: error instanceof Error ? error.message : 'Unknown error',
 *       username,
 *     };
 *   }
 * };
 */

// ============================================================================
// Genre Analysis Helpers
// These functions analyze genre preferences and diversity
// ============================================================================

/**
 * Analyze genre distribution from questions
 * Returns array of genres sorted by frequency (most common first)
 */
function analyzeGenreDistribution(
  questions: Array<{ detectedGenre?: string[] }>
): Array<{ genre: string; count: number; percentage: number }> {
  if (!questions || questions.length === 0) return [];

  const genreCounts: { [genre: string]: number } = {};
  let totalGenreOccurrences = 0;

  // Count genre occurrences
  questions.forEach((q) => {
    if (q.detectedGenre && Array.isArray(q.detectedGenre) && q.detectedGenre.length > 0) {
      q.detectedGenre.forEach((genre) => {
        if (genre && genre.trim()) {
          genreCounts[genre] = (genreCounts[genre] || 0) + 1;
          totalGenreOccurrences++;
        }
      });
    }
  });

  if (totalGenreOccurrences === 0) return [];

  // Convert to array and calculate percentages
  const distribution = Object.entries(genreCounts)
    .map(([genre, count]) => ({
      genre,
      count,
      percentage: (count / totalGenreOccurrences) * 100,
    }))
    .sort((a, b) => b.count - a.count); // Sort by count descending

  return distribution;
}

/**
 * Calculate genre diversity score
 * Returns a number between 0 and 1, where:
 * - 0 = all questions in one genre
 * - 1 = maximum diversity (all genres equally represented)
 */
function calculateDiversity(questions: Array<{ detectedGenre?: string[] }>): number {
  if (!questions || questions.length === 0) return 0;

  const uniqueGenres = new Set<string>();
  const genreCounts: { [genre: string]: number } = {};
  let questionsWithGenres = 0;

  // Collect all unique genres and their counts
  questions.forEach((q) => {
    if (q.detectedGenre && Array.isArray(q.detectedGenre) && q.detectedGenre.length > 0) {
      questionsWithGenres++;
      q.detectedGenre.forEach((genre) => {
        if (genre && genre.trim()) {
          uniqueGenres.add(genre);
          genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        }
      });
    }
  });

  if (uniqueGenres.size === 0) return 0;
  if (uniqueGenres.size === 1) return 0; // No diversity

  // Calculate Shannon entropy (diversity measure)
  const totalOccurrences = Object.values(genreCounts).reduce((sum, count) => sum + count, 0);
  let entropy = 0;

  Object.values(genreCounts).forEach((count) => {
    const probability = count / totalOccurrences;
    if (probability > 0) {
      entropy -= probability * Math.log2(probability);
    }
  });

  // Normalize to 0-1 scale (max entropy is log2(number of genres))
  const maxEntropy = Math.log2(uniqueGenres.size);
  const normalizedDiversity = maxEntropy > 0 ? entropy / maxEntropy : 0;

  return Math.round(normalizedDiversity * 100) / 100; // Round to 2 decimal places
}

/**
 * Detect recent genre shifts (changing interests)
 * Compares recent questions (last 30%) with older questions (first 70%)
 * Returns array of genres that have increased or decreased in frequency
 */
function detectRecentGenreShifts(
  questions: Array<{ detectedGenre?: string[]; timestamp: Date | string | number }>
): Array<{ genre: string; change: 'increasing' | 'decreasing' | 'stable'; trend: number }> {
  if (!questions || questions.length < 4) return []; // Need at least 4 questions to detect shifts

  // Sort questions by timestamp (oldest first)
  const sortedQuestions = [...questions].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Split into older (70%) and recent (30%) questions
  const splitIndex = Math.floor(sortedQuestions.length * 0.7);
  const olderQuestions = sortedQuestions.slice(0, splitIndex);
  const recentQuestions = sortedQuestions.slice(splitIndex);

  // Calculate genre frequencies for each period
  const calculateGenreFrequency = (questionSet: typeof sortedQuestions) => {
    const genreCounts: { [genre: string]: number } = {};
    let totalQuestions = 0;

    questionSet.forEach((q) => {
      if (q.detectedGenre && Array.isArray(q.detectedGenre) && q.detectedGenre.length > 0) {
        totalQuestions++;
        q.detectedGenre.forEach((genre) => {
          if (genre && genre.trim()) {
            genreCounts[genre] = (genreCounts[genre] || 0) + 1;
          }
        });
      }
    });

    // Calculate frequencies
    const frequencies: { [genre: string]: number } = {};
    Object.entries(genreCounts).forEach(([genre, count]) => {
      frequencies[genre] = totalQuestions > 0 ? count / totalQuestions : 0;
    });

    return frequencies;
  };

  const olderFrequencies = calculateGenreFrequency(olderQuestions);
  const recentFrequencies = calculateGenreFrequency(recentQuestions);

  // Find all unique genres across both periods
  const allGenres = new Set([
    ...Object.keys(olderFrequencies),
    ...Object.keys(recentFrequencies),
  ]);

  // Calculate trends
  const shifts: Array<{ genre: string; change: 'increasing' | 'decreasing' | 'stable'; trend: number }> = [];

  allGenres.forEach((genre) => {
    const olderFreq = olderFrequencies[genre] || 0;
    const recentFreq = recentFrequencies[genre] || 0;
    const trend = recentFreq - olderFreq;

    // Only report significant changes (>10% change)
    if (Math.abs(trend) > 0.1) {
      shifts.push({
        genre,
        change: trend > 0 ? 'increasing' : 'decreasing',
        trend: Math.round(trend * 100) / 100, // Round to 2 decimal places
      });
    } else if (olderFreq > 0 || recentFreq > 0) {
      // Include stable genres that exist in either period
      shifts.push({
        genre,
        change: 'stable',
        trend: Math.round(trend * 100) / 100,
      });
    }
  });

  // Sort by absolute trend value (biggest changes first)
  return shifts.sort((a, b) => Math.abs(b.trend) - Math.abs(a.trend));
}

// ============================================================================
// Difficulty Analysis Helpers
// These functions analyze difficulty progression and challenge-seeking behavior
// ============================================================================

/**
 * Map difficulty hint to numeric value for progression tracking
 */
function difficultyToNumber(difficulty: string | undefined): number {
  if (!difficulty) return 1; // Default to intermediate if unknown
  
  const lower = difficulty.toLowerCase();
  if (lower === 'beginner') return 0;
  if (lower === 'intermediate') return 1;
  if (lower === 'advanced') return 2;
  
  return 1; // Default to intermediate
}

/**
 * Analyze difficulty progression over time
 * Returns array of difficulty values (0=beginner, 1=intermediate, 2=advanced) ordered by time
 */
function analyzeDifficultyProgression(
  questions: Array<{ difficultyHint?: string; timestamp: Date | string | number }>
): number[] {
  if (!questions || questions.length === 0) return [];

  // Sort questions by timestamp (oldest first)
  const sortedQuestions = [...questions].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Extract difficulty progression
  const progression = sortedQuestions
    .map((q) => difficultyToNumber(q.difficultyHint))
    .filter((val) => val !== null);

  return progression;
}

/**
 * Estimate current difficulty level based on recent questions
 * Returns: "beginner", "intermediate", or "advanced"
 * Uses the most recent 10 questions (or all if less than 10)
 */
function estimateCurrentDifficulty(
  questions: Array<{ difficultyHint?: string; timestamp: Date | string | number }>
): 'beginner' | 'intermediate' | 'advanced' {
  if (!questions || questions.length === 0) return 'intermediate';

  // Sort by timestamp (newest first) and take recent questions
  const sortedQuestions = [...questions].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const recentQuestions = sortedQuestions.slice(0, 10);
  const difficulties = recentQuestions
    .map((q) => q.difficultyHint?.toLowerCase())
    .filter((d): d is string => !!d);

  if (difficulties.length === 0) return 'intermediate';

  // Count occurrences
  const counts = {
    beginner: 0,
    intermediate: 0,
    advanced: 0,
  };

  difficulties.forEach((d) => {
    if (d === 'beginner') counts.beginner++;
    else if (d === 'intermediate') counts.intermediate++;
    else if (d === 'advanced') counts.advanced++;
  });

  // Return the most common difficulty
  if (counts.advanced > counts.intermediate && counts.advanced > counts.beginner) {
    return 'advanced';
  }
  if (counts.beginner > counts.intermediate && counts.beginner > counts.advanced) {
    return 'beginner';
  }

  // Default to intermediate
  return 'intermediate';
}

/**
 * Detect challenge-seeking behavior
 * Analyzes if user is moving toward harder difficulties over time
 * Returns: "seeking_challenge", "maintaining", or "easing_up"
 */
function detectChallengeBehavior(
  questions: Array<{ difficultyHint?: string; timestamp: Date | string | number }>
): 'seeking_challenge' | 'maintaining' | 'easing_up' {
  if (!questions || questions.length < 3) return 'maintaining';

  // Sort by timestamp (oldest first)
  const sortedQuestions = [...questions].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Convert to numeric progression
  const progression = sortedQuestions.map((q) => difficultyToNumber(q.difficultyHint));

  // Calculate trend (positive = increasing difficulty, negative = decreasing)
  let trend = 0;
  for (let i = 1; i < progression.length; i++) {
    trend += progression[i] - progression[i - 1];
  }

  // Normalize by number of transitions
  const avgTrend = progression.length > 1 ? trend / (progression.length - 1) : 0;

  // Determine behavior
  if (avgTrend > 0.2) {
    return 'seeking_challenge'; // Moving toward harder difficulties
  } else if (avgTrend < -0.2) {
    return 'easing_up'; // Moving toward easier difficulties
  } else {
    return 'maintaining'; // Staying at similar difficulty
  }
}

// ============================================================================
// Behavioral Pattern Helpers
// These functions analyze user behavior patterns and learning styles
// ============================================================================

/**
 * Categorize questions by type and return distribution
 * Uses the questionCategory field from metadata to analyze question types
 * Returns array of question types with counts and percentages
 */
function categorizeQuestions(
  questions: Array<{ questionCategory?: string }>
): Array<{ category: string; count: number; percentage: number }> {
  if (!questions || questions.length === 0) return [];

  const categoryCounts: { [category: string]: number } = {};
  let totalCategorized = 0;

  // Count occurrences of each category
  questions.forEach((q) => {
    if (q.questionCategory && q.questionCategory.trim()) {
      const category = q.questionCategory;
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      totalCategorized++;
    }
  });

  if (totalCategorized === 0) return [];

  // Convert to array and calculate percentages
  const distribution = Object.entries(categoryCounts)
    .map(([category, count]) => ({
      category,
      count,
      percentage: (count / totalCategorized) * 100,
    }))
    .sort((a, b) => b.count - a.count); // Sort by count descending

  return distribution;
}

/**
 * Analyze learning curve based on question patterns
 * Measures how quickly user progresses by analyzing:
 * - Time between questions (faster = quicker learning)
 * - Difficulty progression (improving = learning)
 * - Question complexity over time
 * Returns: "fast", "moderate", or "slow"
 */
function analyzeLearningCurve(
  questions: Array<{ 
    difficultyHint?: string; 
    timestamp: Date | string | number;
    questionCategory?: string;
  }>
): 'fast' | 'moderate' | 'slow' {
  if (!questions || questions.length < 3) return 'moderate';

  // Sort questions by timestamp (oldest first)
  const sortedQuestions = [...questions].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Calculate average time between questions (in hours)
  let totalGapHours = 0;
  let gapCount = 0;
  for (let i = 1; i < sortedQuestions.length; i++) {
    const prev = new Date(sortedQuestions[i - 1].timestamp);
    const curr = new Date(sortedQuestions[i].timestamp);
    const gapHours = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60);
    if (gapHours > 0 && gapHours < 168) { // Ignore gaps > 1 week
      totalGapHours += gapHours;
      gapCount++;
    }
  }

  const avgGapHours = gapCount > 0 ? totalGapHours / gapCount : 24;

  // Analyze difficulty progression (positive trend = learning)
  const progression = sortedQuestions.map((q) => difficultyToNumber(q.difficultyHint));
  let difficultyTrend = 0;
  for (let i = 1; i < progression.length; i++) {
    difficultyTrend += progression[i] - progression[i - 1];
  }
  const avgDifficultyTrend = progression.length > 1 ? difficultyTrend / (progression.length - 1) : 0;

  // Determine learning speed
  // Fast: Short gaps (< 12 hours) AND increasing difficulty
  // Slow: Long gaps (> 48 hours) OR decreasing difficulty
  if (avgGapHours < 12 && avgDifficultyTrend > 0.1) {
    return 'fast';
  } else if (avgGapHours > 48 || avgDifficultyTrend < -0.1) {
    return 'slow';
  } else {
    return 'moderate';
  }
}

/**
 * Measure exploration tendencies
 * Analyzes how exploratory the user is based on:
 * - Genre diversity (more genres = more exploratory)
 * - Question category variety (more types = more exploratory)
 * - Game variety (more games = more exploratory)
 * Returns a score from 0 to 1 (1 = highly exploratory)
 */
function measureExplorationTendencies(
  questions: Array<{ 
    detectedGenre?: string[];
    questionCategory?: string;
    detectedGame?: string;
  }>
): number {
  if (!questions || questions.length === 0) return 0;

  // Calculate genre diversity
  const uniqueGenres = new Set<string>();
  questions.forEach((q) => {
    if (q.detectedGenre && Array.isArray(q.detectedGenre)) {
      q.detectedGenre.forEach((genre) => {
        if (genre && genre.trim()) {
          uniqueGenres.add(genre);
        }
      });
    }
  });

  // Calculate category diversity
  const uniqueCategories = new Set<string>();
  questions.forEach((q) => {
    if (q.questionCategory && q.questionCategory.trim()) {
      uniqueCategories.add(q.questionCategory);
    }
  });

  // Calculate game diversity
  const uniqueGames = new Set<string>();
  questions.forEach((q) => {
    if (q.detectedGame && q.detectedGame.trim()) {
      uniqueGames.add(q.detectedGame);
    }
  });

  // Normalize scores (0-1 scale)
  const genreScore = Math.min(uniqueGenres.size / 5, 1); // Max at 5 genres
  const categoryScore = Math.min(uniqueCategories.size / 5, 1); // Max at 5 categories
  const gameScore = Math.min(uniqueGames.size / 10, 1); // Max at 10 games

  // Weighted average (genres and categories are more important)
  const explorationScore = (genreScore * 0.4 + categoryScore * 0.4 + gameScore * 0.2);

  return Math.round(explorationScore * 100) / 100; // Round to 2 decimal places
}

// ============================================================================
// TEST FUNCTION: Difficulty Analysis Helpers
// ============================================================================
// NOTE: This function is FOR TESTING ONLY
// It tests the difficulty helper functions but is not used in production code.
// The helper functions themselves (analyzeDifficultyProgression, etc.) ARE used
// in production via analyzeGameplayPatterns().
// ============================================================================

/**
 * TEST FUNCTION: Test difficulty analysis helpers
 * ENABLED FOR TESTING - Comment out for production
 * 
 * This function is only used by the test endpoint: /api/test-difficulty-helpers
 * It is NOT used in production code.
 */
// export const testDifficultyHelpers = async (username: string) => {
//   try {
//     const Question = (await import('../models/Question')).default;
    
//     // Get user's questions with difficulty data
//     const questions = await Question.find({ username })
//       .sort({ timestamp: -1 })
//       .limit(100)
//       .select('difficultyHint timestamp')
//       .lean();

//     if (questions.length === 0) {
//       console.log('[Test] No questions found for user:', username);
//       return {
//         error: 'No questions found',
//         username,
//       };
//     }

//     // Ensure questions have required properties
//     const questionsWithData = questions
//       .filter((q: any) => q.timestamp)
//       .map((q: any) => ({
//         difficultyHint: q.difficultyHint,
//         timestamp: q.timestamp,
//       }));

//     if (questionsWithData.length === 0) {
//       return {
//         error: 'No questions with valid data found',
//         username,
//       };
//     }

//     // Test each helper function
//     const progression = analyzeDifficultyProgression(questionsWithData);
//     const currentDifficulty = estimateCurrentDifficulty(questionsWithData);
//     const challengeBehavior = detectChallengeBehavior(questionsWithData);

//     const results = {
//       username,
//       totalQuestions: questions.length,
//       questionsWithDifficulty: questionsWithData.filter(q => q.difficultyHint).length,
//       difficultyAnalysis: {
//         progression: progression,
//         currentLevel: currentDifficulty,
//         challengeBehavior: challengeBehavior,
//       },
//       sampleQuestions: questionsWithData.slice(0, 5).map(q => ({
//         timestamp: q.timestamp,
//         difficulty: q.difficultyHint || 'none',
//       })),
//     };

//     console.log('[Test Difficulty Helpers] Results:', JSON.stringify(results, null, 2));
//     return results;
//   } catch (error) {
//     console.error('[Test Difficulty Helpers] Error:', error);
//     return {
//       error: error instanceof Error ? error.message : 'Unknown error',
//       username,
//     };
//   }
// };

// ============================================================================
// TEST FUNCTION: Behavioral Pattern Helpers
// ============================================================================
// NOTE: This function is FOR TESTING ONLY
// It tests the behavioral helper functions but is not used in production code.
// The helper functions themselves (categorizeQuestions, etc.) ARE used
// in production via analyzeGameplayPatterns().
// ============================================================================

/**
 * TEST FUNCTION: Test behavioral pattern helpers
 * ENABLED FOR TESTING - Comment out for production
 * 
 * This function is only used by the test endpoint: /api/test-behavioral-helpers
 * It is NOT used in production code.
 */
// export const testBehavioralHelpers = async (username: string) => {
//   try {
//     const Question = (await import('../models/Question')).default;
    
//     // Get user's questions with behavioral data
//     const questions = await Question.find({ username })
//       .sort({ timestamp: -1 })
//       .limit(100)
//       .select('questionCategory detectedGenre detectedGame difficultyHint timestamp')
//       .lean();

//     if (questions.length === 0) {
//       console.log('[Test] No questions found for user:', username);
//       return {
//         error: 'No questions found',
//         username,
//       };
//     }

//     // Ensure questions have required properties
//     const questionsWithData = questions
//       .filter((q: any) => q.timestamp)
//       .map((q: any) => ({
//         questionCategory: q.questionCategory,
//         detectedGenre: q.detectedGenre || [],
//         detectedGame: q.detectedGame,
//         difficultyHint: q.difficultyHint,
//         timestamp: q.timestamp,
//       }));

//     if (questionsWithData.length === 0) {
//       return {
//         error: 'No questions with valid data found',
//         username,
//       };
//     }

//     // Test each helper function
//     const questionTypes = categorizeQuestions(questionsWithData);
//     const learningSpeed = analyzeLearningCurve(questionsWithData);
//     const explorationDepth = measureExplorationTendencies(questionsWithData);

//     const results = {
//       username,
//       totalQuestions: questions.length,
//       questionsWithCategory: questionsWithData.filter(q => q.questionCategory).length,
//       behavioralAnalysis: {
//         questionTypes: questionTypes,
//         learningSpeed: learningSpeed,
//         explorationDepth: explorationDepth,
//       },
//       sampleQuestions: questionsWithData.slice(0, 5).map(q => ({
//         timestamp: q.timestamp,
//         category: q.questionCategory || 'none',
//         genres: q.detectedGenre || [],
//         game: q.detectedGame || 'none',
//       })),
//     };

//     console.log('[Test Behavioral Helpers] Results:', JSON.stringify(results, null, 2));
//     return results;
//   } catch (error) {
//     console.error('[Test Behavioral Helpers] Error:', error);
//     return {
//       error: error instanceof Error ? error.message : 'Unknown error',
//       username,
//     };
//   }
// };

// ============================================================================
// Main Pattern Analysis Function
// This function orchestrates all helper functions to analyze user gameplay patterns
// ============================================================================

/**
 * Main function to analyze gameplay patterns for a user
 * Combines all helper functions to provide comprehensive pattern analysis
 * Phase 2 Step 2: Pattern Detection - Main Orchestrator
 */
export const analyzeGameplayPatterns = async (username: string) => {
  try {
    const Question = (await import('../models/Question')).default;
    
    // Fetch user's questions (last 100 for analysis)
    const questions = await Question.find({ username })
      .sort({ timestamp: -1 })
      .limit(100)
      .select('timestamp detectedGenre difficultyHint questionCategory interactionType detectedGame')
      .lean();

    if (!questions || questions.length === 0) {
      return {
        frequency: {
          totalQuestions: 0,
          questionsPerWeek: 0,
          peakActivityTimes: [],
          sessionPattern: 'sporadic' as const,
        },
        difficulty: {
          progression: [],
          currentLevel: 'intermediate' as const,
          challengeSeeking: 'maintaining' as const,
        },
        genreAnalysis: {
          topGenres: [],
          genreDiversity: 0,
          recentTrends: [],
        },
        behavior: {
          questionTypes: [],
          learningSpeed: 'moderate' as const,
          explorationDepth: 0,
        },
      };
    }

    // Prepare questions for analysis (ensure proper format)
    const questionsWithTimestamp = questions
      .filter((q: any) => q.timestamp)
      .map((q: any) => ({
        timestamp: q.timestamp,
        detectedGenre: q.detectedGenre || [],
        difficultyHint: q.difficultyHint,
        questionCategory: q.questionCategory,
        interactionType: q.interactionType,
        detectedGame: q.detectedGame,
      }));

    // Analyze frequency patterns
    const frequency = {
      totalQuestions: questions.length,
      questionsPerWeek: calculateWeeklyRate(questionsWithTimestamp),
      peakActivityTimes: detectPeakHours(questionsWithTimestamp),
      sessionPattern: detectSessionPatterns(questionsWithTimestamp),
    };

    // Analyze difficulty patterns
    const difficulty = {
      progression: analyzeDifficultyProgression(questionsWithTimestamp),
      currentLevel: estimateCurrentDifficulty(questionsWithTimestamp),
      challengeSeeking: detectChallengeBehavior(questionsWithTimestamp),
    };

    // Analyze genre patterns
    const genreAnalysis = {
      topGenres: analyzeGenreDistribution(questionsWithTimestamp),
      genreDiversity: calculateDiversity(questionsWithTimestamp),
      recentTrends: detectRecentGenreShifts(questionsWithTimestamp),
    };

    // Analyze behavioral patterns
    const behavior = {
      questionTypes: categorizeQuestions(questionsWithTimestamp),
      learningSpeed: analyzeLearningCurve(questionsWithTimestamp),
      explorationDepth: measureExplorationTendencies(questionsWithTimestamp),
    };

    return {
      frequency,
      difficulty,
      genreAnalysis,
      behavior,
    };
  } catch (error) {
    console.error('[Pattern Analysis] Error analyzing gameplay patterns:', error);
    // Return safe defaults on error
    return {
      frequency: {
        totalQuestions: 0,
        questionsPerWeek: 0,
        peakActivityTimes: [],
        sessionPattern: 'sporadic' as const,
      },
      difficulty: {
        progression: [],
        currentLevel: 'intermediate' as const,
        challengeSeeking: 'maintaining' as const,
      },
      genreAnalysis: {
        topGenres: [],
        genreDiversity: 0,
        recentTrends: [],
      },
      behavior: {
        questionTypes: [],
        learningSpeed: 'moderate' as const,
        explorationDepth: 0,
      },
    };
  }
};

/**
 * TEST FUNCTION: Test genre analysis helpers
 * COMMENTED OUT FOR PRODUCTION - Uncomment for testing/debugging
 * 
 * export const testGenreHelpers = async (username: string) => {
 *   try {
 *     const Question = (await import('../models/Question')).default;
 *     
 *     // Get user's questions with genre data
 *     const questions = await Question.find({ username })
 *       .sort({ timestamp: -1 })
 *       .limit(100)
 *       .select('detectedGenre timestamp')
 *       .lean();
 * 
 *     if (questions.length === 0) {
 *       console.log('[Test] No questions found for user:', username);
 *       return {
 *         error: 'No questions found',
 *         username,
 *       };
 *     }
 * 
 *     // Ensure questions have required properties
 *     const questionsWithData = questions
 *       .filter((q: any) => q.timestamp)
 *       .map((q: any) => ({
 *         detectedGenre: q.detectedGenre || [],
 *         timestamp: q.timestamp,
 *       }));
 * 
 *     if (questionsWithData.length === 0) {
 *       return {
 *         error: 'No questions with valid data found',
 *         username,
 *       };
 *     }
 * 
 *     // Test each helper function
 *     const genreDistribution = analyzeGenreDistribution(questionsWithData);
 *     const diversity = calculateDiversity(questionsWithData);
 *     const genreShifts = detectRecentGenreShifts(questionsWithData);
 * 
 *     const results = {
 *       username,
 *       totalQuestions: questions.length,
 *       questionsWithGenres: questionsWithData.filter(q => q.detectedGenre && q.detectedGenre.length > 0).length,
 *       genreAnalysis: {
 *         distribution: genreDistribution,
 *         diversityScore: diversity,
 *         recentShifts: genreShifts,
 *       },
 *       sampleQuestions: questionsWithData.slice(0, 5).map(q => ({
 *         timestamp: q.timestamp,
 *         genres: q.detectedGenre || [],
 *       })),
 *     };
 * 
 *     console.log('[Test Genre Helpers] Results:', JSON.stringify(results, null, 2));
 *     return results;
 *   } catch (error) {
 *     console.error('[Test Genre Helpers] Error:', error);
 *     return {
 *       error: error instanceof Error ? error.message : 'Unknown error',
 *       username,
 *     };
 *   }
 * };
 */

// ============================================================================
// Phase 4 Step 1: Loadout/Strategy Suggestion Templates
// Template system for generating personalized strategy tips
// ============================================================================

/**
 * Strategy templates organized by genre and difficulty level
 * Templates contain placeholders (e.g., [primary_stat]) that are replaced
 * with personalized values based on user context
 */
const STRATEGY_TEMPLATES: {
  [genre: string]: {
    [difficulty: string]: string;
  };
} = {
  rpg: {
    beginner: "A balanced build works best when you focus on [primary_stat] - it'll keep you alive while you learn the ropes.",
    intermediate: "You might find [specific_strategy] works really well for your playstyle.",
    advanced: "For maximum efficiency, try [min_max_tips] - it's the meta approach right now.",
  },
  shooter: {
    beginner: "[weapon_class] are great to start with - they're easier to control and forgiving.",
    intermediate: "For this map, [specific_loadout] tends to work well.",
    advanced: "The current meta loadout is [optimal_setup] because [reasoning].",
  },
  strategy: {
    beginner: "Build up your economy first - [resource_tips] will help you get ahead.",
    intermediate: "Consider adding [unit_type] to your army - they counter [specific_threat] effectively.",
    advanced: "The top-tier composition right now is [complex_strategy] - it dominates most matchups.",
  },
  action: {
    beginner: "Stick with [beginner_weapon] until you get comfortable - they're more forgiving.",
    intermediate: "Try combining [weapon_combo] - the synergy between them is really strong.",
    advanced: "If you want to push your limits, master [advanced_technique] - it's what separates pros from casuals.",
  },
  adventure: {
    beginner: "Take your time exploring [safe_areas] first - you'll find useful items and get stronger.",
    intermediate: "Prioritize [key_upgrades] - they'll make the tougher sections much more manageable.",
    advanced: "For speedruns, the optimal route is [efficient_path] - it shaves off significant time.",
  },
  platformer: {
    beginner: "Get comfortable with [basic_technique] first - it's the foundation for everything else.",
    intermediate: "Once you've got the basics down, [advanced_move] will help you navigate tricky sections.",
    advanced: "Speedrunners use [speedrun_tech] to save time - it's tricky but worth learning.",
  },
  puzzle: {
    beginner: "Keep an eye out for [pattern_type] - recognizing these patterns makes puzzles much easier.",
    intermediate: "When puzzles get complex, [puzzle_strategy] is usually the key to solving them.",
    advanced: "The fastest approach is [efficient_method] - it minimizes unnecessary steps.",
  },
  fighting: {
    beginner: "Start by learning [basic_combo] - it's reliable and easy to execute.",
    intermediate: "Once you're comfortable, [combo_chain] will help you deal serious damage.",
    advanced: "For competitive play, [optimal_combo] is essential - it's optimized for frame data and damage.",
  },
  racing: {
    beginner: "[stable_vehicle] is perfect for learning - it's forgiving and easy to control.",
    intermediate: "Tune your [vehicle_setup] for better handling - it makes a huge difference.",
    advanced: "Master [racing_line] and [advanced_technique] - these are what separate top racers.",
  },
  sports: {
    beginner: "Focus on mastering [basic_skill] - it's the foundation for everything else.",
    intermediate: "Once you've got the basics, [advanced_skill] will give you an edge in matches.",
    advanced: "At the pro level, [pro_technique] is essential - it's what the best players use.",
  },
  survival: {
    beginner: "Prioritize [resource_priority] early on - you'll need them to stay alive.",
    intermediate: "Once you're stable, focus on [survival_strategy] - it'll make the game much easier.",
    advanced: "For maximum efficiency, master [advanced_survival] - it's how the pros stay ahead.",
  },
  horror: {
    beginner: "Take your time and [conservative_approach] - rushing gets you killed in horror games.",
    intermediate: "Learn to [horror_strategy] - it'll help you handle scares and threats better.",
    advanced: "If you want to master horror games, [advanced_horror] is key - it separates veterans from newcomers.",
  },
  stealth: {
    beginner: "Start by [basic_stealth] - it's the safest way to approach encounters.",
    intermediate: "Once you're comfortable, try [stealth_technique] - it opens up more options.",
    advanced: "For expert play, [advanced_stealth] is essential - it's what speedrunners and pros rely on.",
  },
  simulation: {
    beginner: "Focus on [basic_management] first - get the fundamentals down before expanding.",
    intermediate: "As you improve, [simulation_strategy] will help you optimize your approach.",
    advanced: "At the highest level, [advanced_simulation] is crucial - it's how you achieve peak efficiency.",
  },
  roguelike: {
    beginner: "Don't worry about dying - [roguelike_basics] will help you learn from each run.",
    intermediate: "Once you understand the mechanics, [roguelike_strategy] will help you progress further.",
    advanced: "For consistent wins, master [advanced_roguelike] - it's what separates skilled players from the rest.",
  },
  sandbox: {
    beginner: "Start by [basic_exploration] - there's no rush, so take your time discovering what's possible.",
    intermediate: "Once you're comfortable, try [sandbox_creativity] - that's where the real fun begins.",
    advanced: "For impressive builds, [advanced_sandbox] is essential - it's how creators make amazing things.",
  },
  'battle-royale': {
    beginner: "Land in [safe_drop] areas first - you'll have time to gear up without immediate danger.",
    intermediate: "As you get better, [br_strategy] will help you survive longer and get more kills.",
    advanced: "For competitive play, [advanced_br] is crucial - it's what top players use to dominate.",
  },
};

/**
 * Context interface for template personalization
 * Contains information needed to fill template placeholders
 */
export interface TemplateContext {
  primaryStat?: string;
  specificStrategy?: string;
  minMaxTips?: string;
  weaponClass?: string;
  specificLoadout?: string;
  optimalSetup?: string;
  reasoning?: string;
  resourceTips?: string;
  unitType?: string;
  specificThreat?: string;
  complexStrategy?: string;
  beginnerWeapon?: string;
  weaponCombo?: string;
  advancedTechnique?: string;
  safeAreas?: string;
  keyUpgrades?: string;
  efficientPath?: string;
  basicTechnique?: string;
  advancedMove?: string;
  speedrunTech?: string;
  patternType?: string;
  puzzleStrategy?: string;
  efficientMethod?: string;
  basicCombo?: string;
  comboChain?: string;
  optimalCombo?: string;
  stableVehicle?: string;
  vehicleSetup?: string;
  racingLine?: string;
  basicSkill?: string;
  advancedSkill?: string;
  proTechnique?: string;
  resourcePriority?: string;
  survivalStrategy?: string;
  advancedSurvival?: string;
  conservativeApproach?: string;
  horrorStrategy?: string;
  advancedHorror?: string;
  basicStealth?: string;
  stealthTechnique?: string;
  advancedStealth?: string;
  basicManagement?: string;
  simulationStrategy?: string;
  advancedSimulation?: string;
  roguelikeBasics?: string;
  roguelikeStrategy?: string;
  advancedRoguelike?: string;
  basicExploration?: string;
  sandboxCreativity?: string;
  advancedSandbox?: string;
  safeDrop?: string;
  brStrategy?: string;
  advancedBr?: string;
  [key: string]: string | undefined; // Allow dynamic properties
}

/**
 * Personalize a template string by replacing placeholders with context values
 * Placeholders are in the format [placeholder_name] and are replaced with
 * values from the context object (e.g., [primary_stat] -> context.primaryStat)
 * 
 * @param template - Template string with placeholders
 * @param context - Context object containing values to fill placeholders
 * @returns Personalized template string with placeholders replaced
 */
function personalizeTemplate(template: string | undefined, context: TemplateContext): string {
  if (!template) {
    return '';
  }

  let personalized = template;

  // Replace all placeholders in the format [placeholder_name]
  // Convert placeholder_name to camelCase and look up in context
  personalized = personalized.replace(/\[([^\]]+)\]/g, (match: string, placeholder: string) => {
    // Convert placeholder to camelCase (e.g., "primary_stat" -> "primaryStat")
    const camelCaseKey = placeholder
      .toLowerCase()
      .replace(/_([a-z])/g, (_: string, letter: string) => letter.toUpperCase());

    // Look up value in context (try both original and camelCase)
    const value = context[camelCaseKey] || context[placeholder.toLowerCase()] || context[placeholder];

    // If value found, replace placeholder; otherwise keep placeholder
    return value || match;
  });

  return personalized;
}

/**
 * Get a personalized strategy tip based on game genre, user difficulty, and context
 * 
 * @param gameGenre - The genre of the game (e.g., "rpg", "shooter", "strategy")
 * @param userDifficulty - User's difficulty level ("beginner", "intermediate", "advanced")
 * @param context - Context object containing values to personalize the template
 * @returns Personalized strategy tip string
 * 
 * @example
 * ```typescript
 * const tip = getPersonalizedStrategyTip(
 *   "rpg",
 *   "beginner",
 *   { primaryStat: "strength and vitality" }
 * );
 * // Returns: "Start with a balanced build focusing on strength and vitality"
 * ```
 */
export const getPersonalizedStrategyTip = (
  gameGenre: string,
  userDifficulty: string,
  context: TemplateContext
): string => {
  // Normalize genre to lowercase for lookup
  const normalizedGenre = gameGenre.toLowerCase();
  
  // Normalize difficulty to lowercase
  const normalizedDifficulty = userDifficulty.toLowerCase();

  // Get template for the genre and difficulty
  const template = STRATEGY_TEMPLATES[normalizedGenre]?.[normalizedDifficulty];

  // If no template found, try to find a generic template or return empty string
  if (!template) {
    // Try to find a template for a similar genre
    // For example, "action-rpg" should try both "rpg" and "action"
    const genreVariants: string[] = [];
    
    // If genre contains hyphens, try each part separately
    if (normalizedGenre.includes('-')) {
      const parts = normalizedGenre.split('-');
      // Prioritize "rpg" if it's in the genre name (more relevant for strategy tips)
      if (parts.includes('rpg')) {
        genreVariants.push('rpg');
      }
      // Add all parts (e.g., "action-rpg" -> ["rpg", "action"])
      parts.forEach(part => {
        if (part !== 'rpg' || !genreVariants.includes('rpg')) {
          genreVariants.push(part);
        }
      });
      // Also try the full genre without hyphens
      genreVariants.push(normalizedGenre.replace(/-/g, ' '));
    } else {
      // For non-hyphenated genres, just try the original
      genreVariants.push(normalizedGenre);
    }

    // Try each variant in order
    for (const variant of genreVariants) {
      const variantTemplate = STRATEGY_TEMPLATES[variant]?.[normalizedDifficulty];
      if (variantTemplate) {
        return personalizeTemplate(variantTemplate, context);
      }
    }

    // If still no template, return a generic tip
    return `Consider adjusting your strategy based on your ${normalizedDifficulty} skill level.`;
  }

  // Personalize the template with context
  return personalizeTemplate(template, context);
};

/**
 * Test function for the template system
 * Verifies that templates work correctly and sound natural
 * 
 * @example
 * ```typescript
 * const results = testTemplateSystem();
 * console.log(results);
 * ```
 */
export const testTemplateSystem = (): {
  tests: Array<{
    genre: string;
    difficulty: string;
    context: TemplateContext;
    result: string;
    hasPlaceholders: boolean;
  }>;
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    issues: string[];
  };
} => {
  const tests: Array<{
    genre: string;
    difficulty: string;
    context: TemplateContext;
    result: string;
    hasPlaceholders: boolean;
  }> = [];
  const issues: string[] = [];

  // Test cases covering different genres and difficulties
  const testCases = [
    {
      genre: 'rpg',
      difficulty: 'beginner',
      context: { primaryStat: 'strength and vitality' },
    },
    {
      genre: 'rpg',
      difficulty: 'intermediate',
      context: { specificStrategy: 'a hybrid mage-warrior build' },
    },
    {
      genre: 'rpg',
      difficulty: 'advanced',
      context: { minMaxTips: 'maxing out intelligence and using spell synergies' },
    },
    {
      genre: 'shooter',
      difficulty: 'beginner',
      context: { weaponClass: 'assault rifles' },
    },
    {
      genre: 'shooter',
      difficulty: 'intermediate',
      context: { 
        specificLoadout: 'an SMG with a sniper rifle backup',
        reasoning: 'it covers both close and long-range engagements',
      },
    },
    {
      genre: 'strategy',
      difficulty: 'beginner',
      context: { resourceTips: 'prioritize food and wood production early' },
    },
    {
      genre: 'strategy',
      difficulty: 'intermediate',
      context: { 
        unitType: 'archers',
        specificThreat: 'heavy infantry',
      },
    },
    {
      genre: 'action',
      difficulty: 'beginner',
      context: { beginnerWeapon: 'sword and shield' },
    },
    {
      genre: 'adventure',
      difficulty: 'intermediate',
      context: { keyUpgrades: 'health upgrades and movement abilities' },
    },
    {
      genre: 'platformer',
      difficulty: 'advanced',
      context: { speedrunTech: 'wave dashing and wall jumping' },
    },
    // Test with missing context (should show placeholders or handle gracefully)
    {
      genre: 'puzzle',
      difficulty: 'beginner',
      context: {}, // No context provided
    },
    // Test genre variant matching
    {
      genre: 'action-rpg',
      difficulty: 'beginner',
      context: { primaryStat: 'agility' },
    },
    // Test with unknown genre
    {
      genre: 'unknown-genre',
      difficulty: 'intermediate',
      context: { someValue: 'test' },
    },
  ];

  // Run all test cases
  testCases.forEach((testCase) => {
    const result = getPersonalizedStrategyTip(
      testCase.genre,
      testCase.difficulty,
      testCase.context
    );

    // Check if result still has placeholders (indicates missing context)
    const hasPlaceholders = /\[[^\]]+\]/.test(result);

    tests.push({
      genre: testCase.genre,
      difficulty: testCase.difficulty,
      context: testCase.context,
      result,
      hasPlaceholders,
    });

    // Identify issues
    if (result.length === 0) {
      issues.push(`Empty result for ${testCase.genre}/${testCase.difficulty}`);
    } else if (hasPlaceholders && Object.keys(testCase.context).length > 0) {
      issues.push(`Unfilled placeholders in ${testCase.genre}/${testCase.difficulty}: ${result}`);
    }
  });

  const passed = tests.filter(t => !t.hasPlaceholders || Object.keys(t.context).length === 0).length;
  const failed = tests.length - passed;

  return {
    tests,
    summary: {
      totalTests: tests.length,
      passed,
      failed,
      issues,
    },
  };
};