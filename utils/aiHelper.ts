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

// Fetch game recommendations based on genre
export const fetchRecommendations = async (genre: string): Promise<string[]> => {
  const url = `https://api.rawg.io/api/games?key=${process.env.RAWG_API_KEY}&genres=${encodeURIComponent(genre)}`;

  try {
    const response = await axios.get(url);
    if (response.data && response.data.results.length > 0) {
      return response.data.results.map((game: any) => game.name);
    } else {
      return [];
    }
  } catch (error: any) {
    console.error("Error fetching data from RAWG:", error.message);
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
 * Search IGDB for a game title and return the matched game name if found
 */
async function searchGameInIGDB(candidateTitle: string): Promise<string | null> {
  try {
    const accessToken = await getClientCredentialsAccessToken();
    const sanitizedTitle = candidateTitle.replace(/"/g, '\\"');
    
    const response = await axios.post(
      'https://api.igdb.com/v4/games',
      `search "${sanitizedTitle}";
       fields name;
       limit 5;`,
      {
        headers: {
          'Client-ID': process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID!,
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      }
    );

    if (response.data && response.data.length > 0) {
      // Try to find exact or close match
      const lowerCandidate = candidateTitle.toLowerCase();
      const exactMatch = response.data.find((g: any) => 
        g.name.toLowerCase() === lowerCandidate || 
        g.name.toLowerCase().includes(lowerCandidate) ||
        lowerCandidate.includes(g.name.toLowerCase())
      );
      
      if (exactMatch) {
        return exactMatch.name;
      }
      
      // Return first result if it's reasonably close
      const firstResult = response.data[0];
      const firstResultLower = firstResult.name.toLowerCase();
      
      // Check if there's significant overlap in words
      const candidateWords = lowerCandidate.split(/\s+/);
      const resultWords = firstResultLower.split(/\s+/);
      const matchingWords = candidateWords.filter(word => 
        word.length > 2 && resultWords.includes(word)
      );
      
      if (matchingWords.length >= 1 || candidateTitle.length <= 15) {
        return firstResult.name;
      }
    }
    return null;
  } catch (error) {
    // Silently fail - this is a background operation
    return null;
  }
}

/**
 * Search RAWG for a game title and return the matched game name if found
 */
async function searchGameInRAWG(candidateTitle: string): Promise<string | null> {
  try {
    const sanitizedTitle = candidateTitle.toLowerCase().trim();
    const url = `https://api.rawg.io/api/games?key=${process.env.RAWG_API_KEY}&search=${encodeURIComponent(sanitizedTitle)}&page_size=5`;
    
    const response = await axios.get(url);

    if (response.data && response.data.results.length > 0) {
      const lowerCandidate = sanitizedTitle;
      
      // Try to find exact or close match
      const exactMatch = response.data.results.find((g: any) => {
        const normalizedGameName = g.name.toLowerCase().trim();
        return normalizedGameName === lowerCandidate || 
               normalizedGameName.includes(lowerCandidate) ||
               lowerCandidate.includes(normalizedGameName);
      });
      
      if (exactMatch) {
        return exactMatch.name;
      }
      
      // Return first result if it's reasonably close
      const firstResult = response.data.results[0];
      const firstResultLower = firstResult.name.toLowerCase();
      
      // Check if there's significant overlap in words
      const candidateWords = lowerCandidate.split(/\s+/);
      const resultWords = firstResultLower.split(/\s+/);
      const matchingWords = candidateWords.filter(word => 
        word.length > 2 && resultWords.includes(word)
      );
      
      if (matchingWords.length >= 1 || candidateTitle.length <= 15) {
        return firstResult.name;
      }
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
  // Updated to handle special characters (é, ü, etc.) and roman numerals (X, Y, III, etc.)
  const inGamePattern = /\b(?:in|for|from|on)\s+(?:the\s+)?([A-ZÀ-ÿ][A-Za-z0-9À-ÿ\s:'&-]+?)(?:\s+(?:how|what|where|when|why|which|who|is|does|do|has|have|can|could|would|should)|$|[?.!])/gi;
  let match: RegExpExecArray | null;
  while ((match = inGamePattern.exec(question)) !== null) {
    if (match[1]) {
      let candidate = match[1].trim();
      candidate = candidate.replace(/^(?:what|which|where|when|why|how|who|the|a|an)\s+/i, '');
      candidate = candidate.replace(/\s+(?:has|have|is|are|does|do|can|could|would|should)$/i, '');
      
      if (candidate.length >= 3 && !/^(what|which|where|when|why|how|who)$/i.test(candidate)) {
        // Check for non-game indicators
        if (!candidate.toLowerCase().includes('kart has') && 
            !candidate.toLowerCase().includes('is the') &&
            !candidate.toLowerCase().includes('best way') &&
            !candidate.toLowerCase().includes('battle and catch')) {
          candidates.push(candidate);
        }
      }
    }
  }

  // Strategy 3: Proper noun patterns (capitalized words, including special chars)
  // Also matches patterns like "Pokémon X and Y", "Final Fantasy VII"
  const properNounPattern = /\b([A-ZÀ-ÿ][a-zÀ-ÿ]+(?:\s+(?:[A-ZÀ-ÿ][a-zÀ-ÿ]+|[IVXLCDM]+|\band\b)){1,4})\b/g;
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
  const itemInGameMatch = question.match(/(?:what|which|where|how).+?\bin\s+(?:the\s+)?([A-ZÀ-ÿ][A-Za-z0-9À-ÿ\s:'&-]{3,50})(?:\??\s*$|[?.!])/i);
  if (itemInGameMatch && itemInGameMatch[1]) {
    let candidate = itemInGameMatch[1].trim();
    // Clean up common endings
    candidate = candidate.replace(/\s+(?:how|what|where|when|why|which|who)$/i, '');
    if (candidate.length >= 3 && candidate.length <= 50) {
      candidates.push(candidate);
    }
  }

  // Strategy 5: Specific pattern for "Pokémon X and Y", "Final Fantasy VII" style titles
  // Matches: [Name] [Letter/Numeral] and [Letter/Numeral]
  const versionedGamePattern = /\b([A-ZÀ-ÿ][a-zÀ-ÿ]+)\s+([A-ZIVXLCDM]+)\s+and\s+([A-ZIVXLCDM]+)\b/gi;
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
    .filter(c => !isLikelyQuestionWord(c));
  
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
    for (const candidate of candidates) {
      // console.log(`[Game Title] Trying candidate: "${candidate}"`);
      
      // Try IGDB first
      try {
        const igdbMatch = await searchGameInIGDB(candidate);
        if (igdbMatch) {
          // console.log(`[Game Title] Found match in IGDB: "${candidate}" -> "${igdbMatch}"`);
          return igdbMatch;
        }
      } catch (error) {
        // Only log errors, not failures
        // console.log(`[Game Title] IGDB search failed for "${candidate}":`, error instanceof Error ? error.message : 'Unknown error');
      }

      // Try RAWG as fallback
      try {
        const rawgMatch = await searchGameInRAWG(candidate);
        if (rawgMatch) {
          // console.log(`[Game Title] Found match in RAWG: "${candidate}" -> "${rawgMatch}"`);
          return rawgMatch;
        }
      } catch (error) {
        // Only log errors, not failures
        // console.log(`[Game Title] RAWG search failed for "${candidate}":`, error instanceof Error ? error.message : 'Unknown error');
      }
    }

    // If no API matches, return the first candidate that looks reasonable
    // (fallback for cases where API might fail or game isn't in database)
    const bestCandidate = candidates.find(c => 
      c.length >= 5 && 
      c.split(/\s+/).length >= 2 && 
      /^[A-Z]/.test(c)
    );
    
    if (bestCandidate) {
      // console.log(`[Game Title] No API match for any candidate, using best fallback: "${bestCandidate}"`);
      return bestCandidate;
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