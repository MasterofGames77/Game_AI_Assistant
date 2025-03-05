import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import connectToMongoDB from '../../utils/mongodb';
import Question from '../../models/Question';
import User from '../../models/User';
import { getChatCompletion, fetchRecommendations, analyzeUserQuestions } from '../../utils/aiHelper';
import { getClientCredentialsAccessToken, getAccessToken, getTwitchUserData, redirectToTwitch } from '../../utils/twitchAuth';
import OpenAI from 'openai';
import path from 'path';
import { readFile } from 'fs/promises';
import { parse } from 'csv-parse/sync';
import { getIO } from '../../middleware/realtime';
import mongoose from 'mongoose';
import winston from 'winston';
import { containsOffensiveContent } from '../../utils/contentModeration';
// import { ImageAnnotatorClient } from '@google-cloud/vision';
// import fs from 'fs';

// Add performance monitoring
const measureLatency = async (operation: string, callback: () => Promise<any>) => {
  const start = performance.now();
  const result = await callback();
  const end = performance.now();
  const latency = end - start;
  console.log(`${operation} latency: ${latency.toFixed(2)}ms`);
  return { result, latency };
};

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Functions for reading and processing game data from CSV file
const CSV_FILE_PATH = path.join(process.cwd(), 'data/Video Games Data.csv');

// Function to read the CSV file
const readCSVFile = async (filePath: string) => {
  const fileContent = await readFile(filePath, 'utf8');
  return parse(fileContent, { columns: true });
};

// Function to get the CSV data
const getCSVData = async () => {
  try {
    return await readCSVFile(CSV_FILE_PATH);
  } catch (error) {
    console.error('Error reading CSV file:', error);
    throw new Error('Failed to read CSV file');
  }
};

// Utility functions for formatting game information
const formatReleaseDate = (dateString: string): string => {
  const [day, month, year] = dateString.split('-');
  return `${month}/${day}/${year}`;
};

// Utility function to format game information
const formatGameInfo = (gameInfo: any): string => {
  const formattedReleaseDate = formatReleaseDate(gameInfo.release_date);
  return `${gameInfo.title} was released on ${formattedReleaseDate} for ${gameInfo.console}. It is a ${gameInfo.genre} game developed by ${gameInfo.developer} and published by ${gameInfo.publisher}.`;
};

// Function to fetch game information from IGDB API
interface IGDBGame {
  name: string;
  release_dates?: { date: string }[];
  genres?: { name: string }[];
  platforms?: { name: string }[];
  involved_companies?: { company: { name: string }, publisher: boolean, developer: boolean }[];
  url?: string;
}

// Function to fetch game information from IGDB API
const fetchGamesFromIGDB = async (query: string): Promise<string | null> => {
  try {
    const accessToken = await getClientCredentialsAccessToken();
    console.log('IGDB Access Token obtained:', accessToken ? 'Yes' : 'No');

    const headers = {
      'Client-ID': process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID,
      'Authorization': `Bearer ${accessToken}`
    };

    // Sanitize the query to prevent injection
    const sanitizedQuery = query.replace(/['"\\]/g, '');
    
    // Modified IGDB query
    const body = `
      search "${sanitizedQuery}";
      fields name,genres.name,platforms.name,release_dates.date,involved_companies.company.name,involved_companies.publisher,involved_companies.developer;
      limit 5;
    `;

    console.log('IGDB Request:', {
      headers: {
        'Client-ID': 'present',
        'Authorization': 'Bearer present'
      },
      body: body
    });

    const response = await axios.post('https://api.igdb.com/v4/games', body, { headers });
    
    if (response.data.length > 0) {
      return `Found ${response.data.length} games matching your query.`;
    } else {
      return `No games found matching "${sanitizedQuery}"`;
    }
  } catch (error: any) {
    console.error('IGDB Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    return null; // Return null instead of throwing error to allow fallback to other sources
  }
};

// Function to fetch game information from RAWG API
interface RAWGGame {
  name: string;
  released?: string;
  genres?: { name: string }[];
  platforms?: { platform: { name: string } }[];
  slug?: string;
}

// Function to fetch game information from RAWG API
const fetchGamesFromRAWG = async (searchQuery: string): Promise<string> => {
  const url = `https://api.rawg.io/api/games?key=${process.env.RAWG_API_KEY}&search=${encodeURIComponent(searchQuery)}`;
  try {
    const response = await axios.get(url);
    //console.log("RAWG API Response:", response.data); // Log the RAWG response data
    if (response.data && response.data.results.length > 0) {
      const games = response.data.results.map((game: RAWGGame) => ({
        name: game.name,
        released: game.released,
        genres: game.genres?.map((genre: { name: string }) => genre.name).join(', ') || 'Genres not available',
        platforms: game.platforms?.map((platform: { platform: { name: string } }) => platform.platform.name).join(', ') || 'Platforms not available',
        url: `https://rawg.io/games/${game.slug}` // Construct the URL using the slug
      }));

      // Explicitly typing 'game' parameter here
      return games.map((game: {
        name: string;
        released?: string;
        genres: string;
        platforms: string;
        url: string;
      }) => `${game.name} (Released: ${game.released ? new Date(game.released).toLocaleDateString() : 'N/A'}, Genres: ${game.genres}, Platforms: ${game.platforms}, URL: ${game.url})`).join('\n');
    } else {
      return `No games found related to ${searchQuery}.`;
    }
  } catch (error: any) {
    console.error("Error fetching data from RAWG:", error.message);
    return "Failed to fetch data from RAWG.";
  }
};

// Function to combine game data from multiple sources (RAWG, IGDB, and local CSV)
const fetchAndCombineGameData = async (question: string, answer: string): Promise<string> => {
  const gameName = question.replace(/when (was|did) (.*?) (released|come out)/i, "$2").trim();

  try {
    // Fetch data from RAWG, IGDB, and CSV
    const [rawgResult, igdbResult, csvData] = await Promise.allSettled([
      fetchGamesFromRAWG(gameName),
      fetchGamesFromIGDB(gameName),
      getCSVData()
    ]);

    // Extract responses from promises
    const rawgResponse = rawgResult.status === 'fulfilled' ? rawgResult.value : null;
    const igdbResponse = igdbResult.status === 'fulfilled' ? igdbResult.value : null;
    const csvGameInfo =
      csvData.status === 'fulfilled'
        ? csvData.value.find((game: any) => game.title.toLowerCase() === gameName.toLowerCase())
        : null;

    const isMainResponseShort = answer.length < 100;
    const hasRelevantData = rawgResponse || igdbResponse || csvGameInfo;

    if (isMainResponseShort && hasRelevantData) {
      let finalResponse = "Game Information:\n";

      // Add CSV data if available
      if (csvGameInfo) {
        finalResponse += `\nLocal Database: ${formatGameInfo(csvGameInfo)}`;
      }

      // Add RAWG data if available
      if (rawgResponse && !rawgResponse.includes("Failed")) {
        finalResponse += `\nFrom RAWG: ${rawgResponse}`;
      }

      // Add IGDB data if available
      if (igdbResponse && !igdbResponse.includes("Failed")) {
        finalResponse += `\nFrom IGDB: ${igdbResponse}`;
      }

      return `${answer}\n\nAdditional Information:\n${finalResponse}`;
    }

    return answer; // Return original answer if no additional data is available
  } catch (error) {
    console.error("Error combining game data:", error);
    return `${answer}\n\nAdditional Information:\nFailed to fetch additional data due to an error.`;
  }
};

// Function to get game genre from predefined mapping
const getGenreFromMapping = (gameTitle: string): string | null => {
  const genreMapping: { [key: string]: string } = {
    "Xenoblade Chronicles 3": "Action RPG",
    "Final Fantasy VII": "Role-Playing Game",
    "Devil May Cry 5": "Hack and Slash",
    "Fortnite": "Battle Royale",
    "The Legend of Zelda: Ocarina of Time": "Adventure",
    "Super Mario Galaxy": "Platformer",
    "Resident Evil 4": "Survival Horror",
    "Splatoon 2": "Third-Person Shooter",
    "Castlevania: Symphony of the Night": "Metroidvania",
    "Bioshock Infinite": "First-Person Shooter",
    "Minecraft": "Sandbox",
    "Hades": "Roguelike",
    "Grand Theft Auto V": "Action-Adventure",
    "Animal Crossing": "Social Simulation",
    "World of Warcraft": "Massively Multiplayer Online Role-Playing Game",
    "Dota 2": "Multiplayer Online Battle Arena",
    "Braid": "Puzzle-Platformer",
    "Super Smash Bros. Ultimate": "Fighting Game",
    "Fire Emblem: Awakening": "Tactical Role-Playing Game",
    "Bloons TD 6": "Tower Defense",
    "Forza Horizon 5": "Racing",
    "Mario Kart 8": "Kart Racing",
    "Star Fox": "Rail Shooter",
    "Metal Gear Solid": "Stealth",
    "Gunstar Heroes": "Run and Gun",
    "Advance Wars": "Turn-Based Strategy",
    "Sid Meier's Civilization VI": "4X",
    "Hotline Miami": "Top-down Shooter",
    "Fifa 18": "Sports",
    "Super Mario Party": "Party",
    "Guitar Hero": "Rhythm",
    "Five Night's at Freddy's": "Point and Click",
    "Phoenix Wright: Ace Attorney": "Visual Novel",
    "Command & Conquer": "Real Time Strategy",
    "Streets of Rage 4": "Beat 'em up",
    "Tetris": "Puzzle",
    "XCOM: Enemy Unknown": "Turn-Based Tactics",
    "The Stanley Parable": "Interactive Story",
    "Pac-Man": "Maze",
    "Roblox": "Game Creation System",
    "Super Mario Maker": "Level Editor",
    "Temple Run": "Endless Runner",
    "Yu-Gi-Oh! Master Duel": "Digital Collectible Card Game",
    "Wii Fit": "Exergaming",
    "Deathloop": "Immersive Sim",
    "Bejeweled": "Tile-Matching",
    "Shellshock Live": "Artillery",
    "Roller Coaster Tycoon 3": "Construction and Management Simulation",
    "Stray": "Adventure"
  };
  return genreMapping[gameTitle] || null;
};

// Utility function to extract game title from user questions
const extractGameTitle = (question: string): string => {
  // First, handle titles with colons and apostrophes
  const fullTitleMatch = question.match(/["']([^"']+)["']|[:]?\s([^:?]+?)(?:\s(?:chapter|level|stage|part|area|boss|item|character|section|location|quest)|\?|$)/i);
  
  if (fullTitleMatch) {
    // Return the first captured group that isn't undefined
    return (fullTitleMatch[1] || fullTitleMatch[2]).trim();
  }
  
  // Fallback to the original pattern if no match
  const match = question.match(/(?:guide|walkthrough|progress|unlock|strategy|find).*?\s(.*?)(?:\s(?:chapter|level|stage|part|area|boss|item|character|section|location|quest))/i);
  return match ? match[1].trim() : '';
};

// Function to determine question category for achievement tracking
export const checkQuestionType = (question: string): string | null => {
  const lowerQuestion = question.toLowerCase();
  
  // Comprehensive game title to genre mapping
  const platformerGames = [
    'super mario', 'mario odyssey', 'mario galaxy', 'mario sunshine', 'mario 64',
    'donkey kong', 'crash bandicoot', 'spyro', 'rayman', 'sonic',
    'hollow knight', 'celeste', 'ori', 'little big planet', 'ratchet', 'clank',
    'jak', 'daxter', 'sly cooper', 'banjo', 'kazooie', 'metroid',
    'mega man', 'kirby', 'yoshi', 'platformer', 'jumping', 'hat in time',
    'psychonauts', 'braid', 'shovel knight', 'cuphead'
  ];

  const rpgGames = [
    'final fantasy', 'dragon quest', 'xenoblade', 'persona', 'shin megami',
    'pokemon', 'chrono trigger', 'mass effect', 'elder scrolls', 'skyrim',
    'fallout', 'witcher', 'dark souls', 'elden ring', 'bloodborne', 'sekiro',
    'tales of', 'kingdom hearts', 'ni no kuni', 'dragon age', 'baldur\'s gate',
    'pillars of eternity', 'divinity', 'octopath traveler', 'bravely default',
    'fire emblem', 'xenogears', 'xenosaga', 'saga', 'star ocean', 'ys'
  ];

  const actionGames = [
    'devil may cry', 'bayonetta', 'god of war', 'ninja gaiden',
    'metal gear rising', 'dynasty warriors', 'nier', 'automata',
    'darksiders', 'prototype', 'infamous', 'asura\'s wrath',
    'kingdom hearts', 'monster hunter', 'dragons dogma'
  ];

  const survivalGames = [
    'resident evil', 'silent hill', 'dead space', 'amnesia',
    'outlast', 'dying light', 'dead by daylight', 'left 4 dead',
    'state of decay', 'the forest', 'subnautica', 'rust',
    'dayz', '7 days to die', 'minecraft', 'valheim'
  ];

  const strategyGames = [
    'civilization', 'age of empires', 'starcraft', 'warcraft',
    'command & conquer', 'total war', 'xcom', 'fire emblem',
    'advance wars', 'into the breach', 'valkyria chronicles',
    'disgaea', 'triangle strategy', 'tactics ogre'
  ];

  const shooterGames = [
    'call of duty', 'battlefield', 'halo', 'doom', 'overwatch',
    'counter strike', 'apex legends', 'titanfall', 'destiny',
    'borderlands', 'bioshock', 'half life', 'portal', 'valorant',
    'rainbow six', 'team fortress', 'quake', 'unreal tournament'
  ];

  const sportsGames = [
    'fifa', 'nba', 'madden', 'nhl', 'pga', 'wii sports',
    'tony hawk', 'skate', 'mario tennis', 'mario golf',
    'mario strikers', 'rocket league', 'sports story'
  ];

  const racingGames = [
    'forza', 'gran turismo', 'need for speed', 'mario kart',
    'burnout', 'dirt', 'f1', 'project cars', 'assetto corsa',
    'wipeout', 'crash team racing', 'sonic racing'
  ];

  const stealthGames = [
    'metal gear solid', 'splinter cell', 'hitman', 'assassin\'s creed',
    'thief', 'dishonored', 'deus ex', 'death loop', 'aragami'
  ];

  const horrorGames = [
    'resident evil', 'silent hill', 'dead space', 'amnesia',
    'outlast', 'layers of fear', 'little nightmares', 'evil within',
    'until dawn', 'five nights at freddy\'s', 'phasmophobia'
  ];

  const puzzleGames = [
    'portal', 'baba is you', 'tetris', 'professor layton',
    'the witness', 'talos principle', 'braid', 'fez',
    'human fall flat', 'untitled goose game', 'it takes two'
  ];

  // Check for genre keywords in the question
  const genreKeywords = {
    platformerPro: ['platform', 'jump', 'collect coins', 'collect stars', '3d platformer', '2d platformer'],
    rpgEnthusiast: ['rpg', 'role playing', 'role-playing', 'jrpg', 'level up', 'stats', 'character build'],
    bossBuster: ['boss fight', 'boss battle', 'defeat boss', 'beat the boss', 'final boss'],
    survivalSpecialist: ['survival', 'survive', 'horror', 'zombie', 'craft', 'resource'],
    strategySpecialist: ['strategy', 'tactics', 'turn-based', 'rts', 'build', 'command'],
    actionAficionado: ['action', 'combat', 'combo', 'fight', 'hack and slash', 'battle system'],
    battleRoyale: ['battle royale', 'fortnite', 'pubg', 'last man standing', 'battle pass'],
    sportsChampion: ['sports', 'score', 'tournament', 'championship', 'league'],
    adventureAddict: ['adventure', 'explore', 'open world', 'quest', 'story'],
    shooterSpecialist: ['shooter', 'fps', 'third person shooter', 'aim', 'gun', 'shooting'],
    puzzlePro: ['puzzle', 'solve', 'riddle', 'brain teaser', 'logic'],
    racingExpert: ['racing', 'race', 'drift', 'track', 'lap', 'speed'],
    stealthSpecialist: ['stealth', 'sneak', 'hide', 'assassination', 'silent'],
    horrorHero: ['horror', 'scary', 'survival horror', 'fear', 'terror'],
    triviaMaster: ['trivia', 'quiz', 'knowledge', 'question', 'answer']
  };

  // Check game titles first
  if (platformerGames.some(game => lowerQuestion.includes(game))) return "platformerPro";
  if (rpgGames.some(game => lowerQuestion.includes(game))) return "rpgEnthusiast";
  if (actionGames.some(game => lowerQuestion.includes(game))) return "actionAficionado";
  if (survivalGames.some(game => lowerQuestion.includes(game))) return "survivalSpecialist";
  if (strategyGames.some(game => lowerQuestion.includes(game))) return "strategySpecialist";
  if (shooterGames.some(game => lowerQuestion.includes(game))) return "shooterSpecialist";
  if (sportsGames.some(game => lowerQuestion.includes(game))) return "sportsChampion";
  if (racingGames.some(game => lowerQuestion.includes(game))) return "racingExpert";
  if (stealthGames.some(game => lowerQuestion.includes(game))) return "stealthSpecialist";
  if (horrorGames.some(game => lowerQuestion.includes(game))) return "horrorHero";
  if (puzzleGames.some(game => lowerQuestion.includes(game))) return "puzzlePro";

  // Then check for genre keywords
  for (const [achievement, keywords] of Object.entries(genreKeywords)) {
    if (keywords.some(keyword => lowerQuestion.includes(keyword))) {
      return achievement;
    }
  }

  // Special achievements based on question content
  if (lowerQuestion.includes("speedrun") || lowerQuestion.includes("fast completion") ||
      lowerQuestion.includes("world record") || lowerQuestion.includes("fastest way")) {
    return "speedrunner";
  }
  
  if (lowerQuestion.includes("collect") || lowerQuestion.includes("items") ||
      lowerQuestion.includes("100%") || lowerQuestion.includes("completion") ||
      lowerQuestion.includes("all items") || lowerQuestion.includes("all items") ||
      lowerQuestion.includes("achievements") || lowerQuestion.includes("trophies")) {
    return "collectorPro";
  }
  
  if (lowerQuestion.includes("stats") || lowerQuestion.includes("data") ||
      lowerQuestion.includes("numbers") || lowerQuestion.includes("analysis")) {
    return "dataDiver";
  }
  
  if (lowerQuestion.includes("performance") || lowerQuestion.includes("fps") ||
      lowerQuestion.includes("graphics") || lowerQuestion.includes("optimization") ||
      lowerQuestion.includes("settings") || lowerQuestion.includes("lag")) {
    return "performanceTweaker";
  }

  return null;
};

interface Achievement {
  name: string;
  dateEarned: Date;
}

// Function to check and award achievements based on user progress
export const checkAndAwardAchievements = async (userId: string, progress: any, session: mongoose.ClientSession | null = null) => {
  console.log('Checking achievements for user:', userId);
  console.log('Current progress:', progress);

  // First get the user's current achievements
  const user = await User.findOne({ userId }).session(session);
  const currentAchievements = user?.achievements || [];
  const newAchievements: { name: string; dateEarned: Date }[] = [];

  // Log current state
  console.log('Current achievements:', currentAchievements);

  // Check each achievement condition
  const achievementChecks = [
    { name: 'RPG Enthusiast', field: 'rpgEnthusiast', threshold: 5 },
    { name: 'Boss Buster', field: 'bossBuster', threshold: 5 },
    { name: 'Platformer Pro', field: 'platformerPro', threshold: 5 },
    { name: 'Survival Specialist', field: 'survivalSpecialist', threshold: 5 },
    { name: 'Strategy Specialist', field: 'strategySpecialist', threshold: 5 },
    { name: 'Action Aficionado', field: 'actionAficionado', threshold: 5 },
    { name: 'Battle Royale Master', field: 'battleRoyale', threshold: 5 },
    { name: 'Sports Champion', field: 'sportsChampion', threshold: 5 },
    { name: 'Adventure Addict', field: 'adventureAddict', threshold: 5 },
    { name: 'Shooter Specialist', field: 'shooterSpecialist', threshold: 5 },
    { name: 'Puzzle Pro', field: 'puzzlePro', threshold: 5 },
    { name: 'Racing Expert', field: 'racingExpert', threshold: 5 },
    { name: 'Stealth Specialist', field: 'stealthSpecialist', threshold: 5 },
    { name: 'Horror Hero', field: 'horrorHero', threshold: 5 },
    { name: 'Trivia Master', field: 'triviaMaster', threshold: 5 }
  ];

  // Check each achievement
  for (const check of achievementChecks) {
    const progressValue = progress[check.field] || 0;
    console.log(`Checking ${check.name}: ${progressValue}/${check.threshold}`);
    
    if (progressValue >= check.threshold && 
        !currentAchievements.some((a: { name: string; }) => a.name === check.name)) {
      newAchievements.push({ 
        name: check.name, 
        dateEarned: new Date() 
      });
      console.log(`Achievement earned: ${check.name}`);
    }
  }

  if (newAchievements.length > 0) {
    console.log('New achievements to award:', newAchievements);

    // Update the user with the new achievements
    const updateResult = await User.findOneAndUpdate(
      { userId },
      { 
        $set: { progress },
        $push: { achievements: { $each: newAchievements } }
      },
      { session: session || undefined, new: true }
    );

    console.log('Update result:', updateResult);

    // Emit achievement event
    const io = getIO();
    io.emit('achievementEarned', { 
      userId, 
      achievements: newAchievements,
      message: `Congratulations! You've earned ${newAchievements.length} new achievement(s)!`
    });

    return newAchievements;
  }

  return [];
};

// measure memory usage
const measureMemoryUsage = () => {
  const used = process.memoryUsage();
  return {
    heapTotal: Math.round(used.heapTotal / 1024 / 1024 * 100) / 100 + 'MB',
    heapUsed: Math.round(used.heapUsed / 1024 / 1024 * 100) / 100 + 'MB',
    rss: Math.round(used.rss / 1024 / 1024 * 100) / 100 + 'MB',
    external: Math.round(used.external / 1024 / 1024 * 100) / 100 + 'MB'
  };
};

// measure response size
const measureResponseSize = (data: any) => {
  const size = Buffer.byteLength(JSON.stringify(data));
  return {
    bytes: size,
    kilobytes: (size / 1024).toFixed(2) + 'KB'
  };
};

// measure database query
const measureDBQuery = async (operation: string, query: () => Promise<any>) => {
  const startMemory = process.memoryUsage().heapUsed;
  const startTime = performance.now();
  
  const result = await query();
  
  const endTime = performance.now();
  const endMemory = process.memoryUsage().heapUsed;
  
  return {
    operation,
    executionTime: `${(endTime - startTime).toFixed(2)}ms`,
    memoryUsed: `${((endMemory - startMemory) / 1024 / 1024).toFixed(2)}MB`,
    result
  };
};

// measure request rate
class RequestMonitor {
  private requests: number = 0;
  private startTime: number = Date.now();

  incrementRequest() {
    this.requests++;
  }

  getRequestRate() {
    const elapsed = (Date.now() - this.startTime) / 1000; // seconds
    return {
      totalRequests: this.requests,
      requestsPerSecond: (this.requests / elapsed).toFixed(2)
    };
  }
}

// measure cache metrics
class CacheMetrics {
  private hits: number = 0;
  private misses: number = 0;

  recordHit() { this.hits++; }
  recordMiss() { this.misses++; }

  getHitRate() {
    const total = this.hits + this.misses;
    return total ? (this.hits / total * 100).toFixed(2) + '%' : '0%';
  }
}

// measure performance metrics
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'game-assistant' },
  transports: [
    new winston.transports.File({ filename: 'performance-metrics.log' })
  ]
});

// Main API handler function that processes incoming requests
const assistantHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  const startTime = performance.now();
  const { userId, question, code } = req.body;
  const metrics: any = {};
  const requestMonitor = new RequestMonitor();
  
  try {
    // Validate question
    if (!question || typeof question !== 'string') {
      throw new Error('Invalid question format - question must be a non-empty string');
    }

    // Check for offensive content first
    const contentCheck = await containsOffensiveContent(question, userId);
    if (contentCheck.isOffensive) {
      if (contentCheck.violationResult?.action === 'banned') {
        return res.status(403).json({
          error: 'Account Suspended',
          message: 'Your account is temporarily suspended',
          banExpiresAt: contentCheck.violationResult.expiresAt,
          metrics
        });
      }
      
      if (contentCheck.violationResult?.action === 'warning') {
        return res.status(400).json({
          error: 'Content Warning',
          message: `Warning ${contentCheck.violationResult.count}/3: Please avoid using inappropriate language`,
          offendingWords: contentCheck.offendingWords,
          metrics
        });
      }
    }

    // Track request
    requestMonitor.incrementRequest();
    
    // Measure memory at start
    metrics.initialMemory = measureMemoryUsage();
    
    // Existing MongoDB connection measurement
    const { latency: dbLatency } = await measureLatency('MongoDB Connection', async () => {
      await connectToMongoDB();
    });
    metrics.dbConnection = dbLatency;

    let answer: string | null;

    // Add timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 25000);
    });

    // Measure question processing time
    const { result: processedAnswer, latency: processingLatency } = await measureLatency('Question Processing', async () => {
      if (question.toLowerCase().includes("recommendations")) {
        const previousQuestions = await Question.find({ userId });
        const genres = analyzeUserQuestions(previousQuestions);
        const recommendations = genres.length > 0 ? await fetchRecommendations(genres[0]) : [];
        
        return recommendations.length > 0 
          ? `Based on your previous questions, I recommend these games: ${recommendations.join(', ')}.` 
          : "I couldn't find any recommendations based on your preferences.";

      } else if (question.toLowerCase().includes("when was") || question.toLowerCase().includes("when did")) {
        // Existing release date logic
        const baseAnswer = await Promise.race([
          getChatCompletion(question),
          timeoutPromise
        ]) as string;

        if (baseAnswer) {
          try {
            return await fetchAndCombineGameData(question, baseAnswer);
          } catch (dataError) {
            console.error('Error fetching additional game data:', dataError);
            return baseAnswer;
          }
        }
        throw new Error('Failed to generate response for release date question');
      } else if (question.toLowerCase().includes("twitch user data")) {
        // Existing Twitch logic
        if (!code) {
          redirectToTwitch(res);
          return null;
        }
        const accessToken = await getAccessToken(Array.isArray(code) ? code[0] : code);
        const userData = await getTwitchUserData(accessToken);
        return `Twitch User Data: ${JSON.stringify(userData)}`;
      } else if (question.toLowerCase().includes("genre")) {
        // Existing genre logic
        const gameTitle = extractGameTitle(question);
        const genre = getGenreFromMapping(gameTitle);
        return genre 
          ? `${gameTitle} is categorized as ${genre}.` 
          : `I couldn't find genre information for ${gameTitle}.`;
      } else {
        // General questions
        const baseAnswer = await Promise.race([
          getChatCompletion(question),
          timeoutPromise
        ]) as string;

        if (!baseAnswer) {
          throw new Error('Failed to generate response');
        }

        try {
          return await fetchAndCombineGameData(question, baseAnswer);
        } catch (dataError) {
          console.error('Error fetching additional data:', dataError);
          return baseAnswer;
        }
      }
    });
    
    answer = processedAnswer;
    metrics.questionProcessing = processingLatency;

    // Measure database operations with enhanced metrics
    const dbMetrics = await measureDBQuery('Create Question', async () => {
      try {
        // Start a session for transaction
        const session = await mongoose.startSession();
        let result;

        try {
          await session.withTransaction(async () => {
            // Create question
            const questionDoc = await Question.create([{ userId, question, response: answer }], { session });

            // Update user's conversation count and ensure achievements/progress structure exists
            const userDoc = await User.findOneAndUpdate(
              { userId },
              {
                $inc: { conversationCount: 1 },
                $setOnInsert: {
                  achievements: [],
                  progress: {
                    firstQuestion: 0,
                    frequentAsker: 0,
                    rpgEnthusiast: 0,
                    bossBuster: 0,
                    platformerPro: 0,
                    survivalSpecialist: 0,
                    strategySpecialist: 0,
                    actionAficionado: 0,
                    battleRoyale: 0,
                    sportsChampion: 0,
                    adventureAddict: 0,
                    shooterSpecialist: 0,
                    puzzlePro: 0,
                    racingExpert: 0,
                    stealthSpecialist: 0,
                    horrorHero: 0,
                    triviaMaster: 0,
                    totalQuestions: 0,
                    dailyExplorer: 0,
                    speedrunner: 0,
                    collectorPro: 0,
                    dataDiver: 0,
                    performanceTweaker: 0,
                    conversationalist: 0
                  }
                }
              },
              { upsert: true, new: true, session }
            );

            // Check question type and update progress
            const questionType = await checkQuestionType(question);
            console.log('Question type detected:', questionType); // Debug log

            if (questionType) {
              // Update the specific progress counter
              await User.findOneAndUpdate(
                { userId },
                { $inc: { [`progress.${questionType}`]: 1 } },
                { session, new: true }
              );

              // Get updated user data
              const updatedUser = await User.findOne({ userId }).session(session);
              console.log('Updated user progress:', updatedUser?.progress); // Debug log

              if (updatedUser) {
                // Check and award achievements
                await checkAndAwardAchievements(userId, updatedUser.progress, session);
              }
            }

            result = { questionDoc, userDoc };
          });

          await session.endSession();
          return result;
        } catch (error) {
          await session.endSession();
          throw error;
        }
      } catch (error) {
        console.error('Database operation error:', error);
        throw error;
      }
    });
    metrics.databaseMetrics = dbMetrics;

    // Measure final memory usage
    metrics.finalMemory = measureMemoryUsage();
    
    // Measure response size
    const responseData = { answer, metrics };
    metrics.responseSize = measureResponseSize(responseData);
    
    // Add request rate
    metrics.requestRate = requestMonitor.getRequestRate();
    
    // Return just the base answer
    return res.status(200).json({ 
      answer: answer 
    });
    
  } catch (error) {
    console.error("Error in API route:", error);
    const endTime = performance.now();
    metrics.totalTime = endTime - startTime;
    
    if (error instanceof Error) {
      res.status(500).json({ 
        error: error.message,
        details: 'An error occurred while processing your request',
        metrics
      });
    } else {
      res.status(500).json({ 
        error: "Internal Server Error",
        details: 'An unexpected error occurred',
        metrics
      });
    }
  }
};

export default assistantHandler;