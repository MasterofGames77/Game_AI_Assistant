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

const readCSVFile = async (filePath: string) => {
  const fileContent = await readFile(filePath, 'utf8');
  return parse(fileContent, { columns: true });
};

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

const fetchGamesFromIGDB = async (query: string): Promise<string | null> => {
  const accessToken = await getClientCredentialsAccessToken();
  const headers = {
    'Client-ID': process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID,
    'Authorization': `Bearer ${accessToken}`
  };

  // Define IGDB query as plain text
  const body = `
    fields name, genres.name, platforms.name, release_dates.date, involved_companies.company.name, involved_companies.publisher, involved_companies.developer, url;
    search "${query}";
    limit 10;
  `;

  try {
    const response = await axios.post('https://api.igdb.com/v4/games', body, { headers });
    
    if (response.data.length > 0) {
      const games = response.data.map((game: IGDBGame) => ({
        name: game.name,
        releaseDate: game.release_dates?.[0]?.date,
        genres: game.genres?.map((genre) => genre.name).join(', '),
        platforms: game.platforms?.map((platform) => platform.name).join(', '),
        developers: game.involved_companies?.filter((company) => company.developer).map((company) => company.company.name).join(', '),
        publishers: game.involved_companies?.filter((company) => company.publisher).map((company) => company.company.name).join(', '),
        url: game.url || 'URL not available'
      }));

      return games.map((game: { name: string; releaseDate: string | number | Date; genres: string; platforms: string; developers: string; publishers: string; url: string }) =>
        `${game.name} (Released: ${game.releaseDate ? new Date(game.releaseDate).toLocaleDateString() : 'N/A'}, Genres: ${game.genres}, Platforms: ${game.platforms}, Developers: ${game.developers}, Publishers: ${game.publishers}, URL: ${game.url})`
      ).join('\n');
    } else {
      return `No games found related to ${query}.`;
    }
  } catch (error: any) {
    console.error("Error fetching data from IGDB:", error.message);
    return "Failed to fetch data from IGDB.";
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
  
  // Game genre specific achievements
  if (lowerQuestion.includes("rpg") || lowerQuestion.includes("role playing")) return "rpgEnthusiast";
  if (lowerQuestion.includes("boss") || lowerQuestion.includes("defeat")) return "bossBuster";
  if (lowerQuestion.includes("strategy") || lowerQuestion.includes("tactics")) return "strategySpecialist";
  if (lowerQuestion.includes("action") || lowerQuestion.includes("combat")) return "actionAficionado";
  if (lowerQuestion.includes("battle royale") || lowerQuestion.includes("fortnite")) return "battleRoyale";
  if (lowerQuestion.includes("sports") || lowerQuestion.includes("fifa") || lowerQuestion.includes("nba")) return "sportsChampion";
  if (lowerQuestion.includes("adventure") || lowerQuestion.includes("explore")) return "adventureAddict";
  if (lowerQuestion.includes("shooter") || lowerQuestion.includes("fps")) return "shooterSpecialist";
  if (lowerQuestion.includes("puzzle") || lowerQuestion.includes("solve")) return "puzzlePro";
  if (lowerQuestion.includes("racing") || lowerQuestion.includes("race")) return "racingExpert";
  if (lowerQuestion.includes("stealth") || lowerQuestion.includes("sneak")) return "stealthSpecialist";
  if (lowerQuestion.includes("horror") || lowerQuestion.includes("survival horror")) return "horrorHero";
  if (lowerQuestion.includes("trivia") || lowerQuestion.includes("quiz")) return "triviaMaster";
  
  // Special achievements
  if (lowerQuestion.includes("speedrun") || lowerQuestion.includes("fast completion")) return "speedrunner";
  if (lowerQuestion.includes("collect") || lowerQuestion.includes("items")) return "collectorPro";
  if (lowerQuestion.includes("stats") || lowerQuestion.includes("data")) return "dataDiver";
  if (lowerQuestion.includes("performance") || lowerQuestion.includes("fps")) return "performanceTweaker";
  
  return null;
};

// Function to check and award achievements based on user progress
export const checkAndAwardAchievements = async (userId: string, progress: any, session: mongoose.ClientSession | null = null) => {
  // First get the user's current achievements
  const user = await User.findOne({ userId }).session(session);
  const currentAchievements = user?.achievements?.map((a: { name: any; }) => a.name) || [];
  const achievements: any[] = [];

  if (progress.rpgEnthusiast >= 5 && !currentAchievements.includes("RPG Enthusiast")) {
    achievements.push({ name: "RPG Enthusiast", dateEarned: new Date() });
  }
  if (progress.bossBuster >= 5 && !currentAchievements.includes("Boss Buster")) {
    achievements.push({ name: "Boss Buster", dateEarned: new Date() });
  }
  if (progress.strategySpecialist >= 5 && !currentAchievements.includes("Strategy Specialist")) {
    achievements.push({ name: "Strategy Specialist", dateEarned: new Date() });
  }
  if (progress.actionAficionado >= 5 && !currentAchievements.includes("Action Aficionado")) {
    achievements.push({ name: "Action Aficionado", dateEarned: new Date() });
  }
  if (progress.battleRoyale >= 5 && !currentAchievements.includes("Battle Royale")) {
    achievements.push({ name: "Battle Royale Master", dateEarned: new Date() });
  }
  if (progress.sportsChampion >= 5 && !currentAchievements.includes("Sports Champion")) {
    achievements.push({ name: "Sports Champion", dateEarned: new Date() });
  }
  if (progress.adventureAddict >= 5 && !currentAchievements.includes("Adventure Addict")) {
    achievements.push({ name: "Adventure Addict", dateEarned: new Date() });
  }
  if (progress.shooterSpecialist >= 5 && !currentAchievements.includes("Shooter Specialist")) {
    achievements.push({ name: "Shooter Specialist", dateEarned: new Date() });
  }
  if (progress.puzzlePro >= 5 && !currentAchievements.includes("Puzzle Pro")) {
    achievements.push({ name: "Puzzle Pro", dateEarned: new Date() });
  }
  if (progress.racingExpert >= 5 && !currentAchievements.includes("Racing Expert")) {
    achievements.push({ name: "Racing Expert", dateEarned: new Date() });
  }
  if (progress.stealthSpecialist >= 5 && !currentAchievements.includes("Stealth Specialist")) {
    achievements.push({ name: "Stealth Specialist", dateEarned: new Date() });
  }
  if (progress.horrorHero >= 5 && !currentAchievements.includes("Horror Hero")) {
    achievements.push({ name: "Horror Hero", dateEarned: new Date() });
  }
  if (progress.triviaMaster >= 5 && !currentAchievements.includes("Trivia Master")) {
    achievements.push({ name: "Trivia Master", dateEarned: new Date() });
  }
  if (progress.speedrunner >= 5 && !currentAchievements.includes("Speedrunner")) {
    achievements.push({ name: "Speedrunner", dateEarned: new Date() });
  }
  if (progress.collectorPro >= 5 && !currentAchievements.includes("Collector Pro")) {
    achievements.push({ name: "Collector Pro", dateEarned: new Date() });
  }
  if (progress.dataDiver >= 5 && !currentAchievements.includes("Data Diver")) {
    achievements.push({ name: "Data Diver", dateEarned: new Date() });
  }
  if (progress.performanceTweaker >= 5 && !currentAchievements.includes("Performance Tweaker")) {
    achievements.push({ name: "Performance Tweaker", dateEarned: new Date() });
  }
  if (achievements.length > 0) {
    // Update the user with the new achievements
    await User.updateOne(
      { userId }, 
      { $push: { achievements: { $each: achievements } } },
      { session: session || undefined }
    );

    // Emit a Socket.IO event to notify the user
    const io = getIO();
    io.emit('achievementEarned', { userId, achievements });
  }
};

const measureMemoryUsage = () => {
  const used = process.memoryUsage();
  return {
    heapTotal: Math.round(used.heapTotal / 1024 / 1024 * 100) / 100 + 'MB',
    heapUsed: Math.round(used.heapUsed / 1024 / 1024 * 100) / 100 + 'MB',
    rss: Math.round(used.rss / 1024 / 1024 * 100) / 100 + 'MB',
    external: Math.round(used.external / 1024 / 1024 * 100) / 100 + 'MB'
  };
};

const measureResponseSize = (data: any) => {
  const size = Buffer.byteLength(JSON.stringify(data));
  return {
    bytes: size,
    kilobytes: (size / 1024).toFixed(2) + 'KB'
  };
};

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
  const cacheMetrics = new CacheMetrics();
  
  try {
    // Validate question
    if (!question || typeof question !== 'string') {
      throw new Error('Invalid question format - question must be a non-empty string');
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
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        // Create question and update user in parallel
        const [questionDoc, userDoc] = await Promise.all([
          Question.create([{ userId, question, response: answer }], { session }),
          User.findOneAndUpdate(
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
          )
        ]);

        // Handle achievements after initial operations
        if (userDoc) {
          const questionType = checkQuestionType(question);
          if (questionType) {
            await User.updateOne(
              { userId },
              { $inc: { [`progress.${questionType}`]: 1 } },
              { session }
            );

            // Get updated progress for achievement checks
            const updatedUser = await User.findOne({ userId }).session(session);
            if (updatedUser) {
              await checkAndAwardAchievements(userId, updatedUser.progress, session);
            }
          }
        }

        await session.commitTransaction();
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
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
    
    res.status(200).json(responseData);
    
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