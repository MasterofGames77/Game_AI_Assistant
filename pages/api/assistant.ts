import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import connectToMongoDB from '../../utils/mongodb';
import Question from '../../models/Question';
import User from '../../models/User';
import { getChatCompletion, fetchRecommendations, analyzeUserQuestions, getAICache } from '../../utils/aiHelper';
import { getClientCredentialsAccessToken, getAccessToken, getTwitchUserData, redirectToTwitch } from '../../utils/twitchAuth';
// import OpenAI from 'openai';
import path from 'path';
import { readFile } from 'fs/promises';
import { parse } from 'csv-parse/sync';
import { getIO } from '../../middleware/realtime';
import mongoose from 'mongoose';
import winston from 'winston';
import { containsOffensiveContent } from '../../utils/contentModeration';
import { Metrics } from '../../types';
// import { ImageAnnotatorClient } from '@google-cloud/vision';
// import fs from 'fs';

// Optimized performance monitoring with conditional logging
const measureLatency = async (operation: string, callback: () => Promise<any>, enableLogging: boolean = false) => {
  const start = performance.now();
  const result = await callback();
  const end = performance.now();
  const latency = end - start;
  
  // Only log if explicitly enabled or in development
  if (enableLogging || process.env.NODE_ENV === 'development') {
    console.log(`${operation} latency: ${latency.toFixed(2)}ms`);
  }
  
  return { result, latency };
};

// Initialize OpenAI client
// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// Functions for reading and processing game data from CSV file
const CSV_FILE_PATH = path.join(process.cwd(), 'data/Video Games Data.csv');

// Cache for CSV data and genre mappings
let csvDataCache: any[] | null = null;
let csvDataCacheTime: number = 0;
const CSV_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Cached genre mappings
const GENRE_MAPPING_CACHE = new Map<string, string>();

// Cache for user achievements to reduce database calls
const userAchievementCache = new Map<string, { 
  achievements: any[], 
  hasProAccess: boolean,
  lastChecked: number 
}>();
const ACHIEVEMENT_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

// Request deduplication cache to prevent duplicate API calls
const pendingRequests = new Map<string, Promise<any>>();
const REQUEST_DEDUP_TTL = 30 * 1000; // 30 seconds

// Generic request deduplication function
const deduplicateRequest = async <T>(
  cacheKey: string, 
  requestFn: () => Promise<T>,
  ttl: number = REQUEST_DEDUP_TTL
): Promise<T> => {
  // Check if request is already in progress
  if (pendingRequests.has(cacheKey)) {
    console.log(`Request deduplication: reusing pending request for ${cacheKey}`);
    return pendingRequests.get(cacheKey) as Promise<T>;
  }
  
  // Create new request
  const requestPromise = (async () => {
    try {
      const result = await requestFn();
      console.log(`Request deduplication: completed request for ${cacheKey}`);
      return result;
    } catch (error) {
      console.log(`Request deduplication: failed request for ${cacheKey}`);
      throw error;
    } finally {
      // Clean up after TTL expires
      setTimeout(() => {
        pendingRequests.delete(cacheKey);
        console.log(`Request deduplication: cleaned up cache for ${cacheKey}`);
      }, ttl);
    }
  })();
  
  pendingRequests.set(cacheKey, requestPromise);
  return requestPromise;
};

// Function to read the CSV file
const readCSVFile = async (filePath: string) => {
  const fileContent = await readFile(filePath, 'utf8');
  return parse(fileContent, { columns: true });
};

// Function to get the CSV data
const getCSVData = async () => {
  const now = Date.now();
  if (csvDataCache && (now - csvDataCacheTime) < CSV_CACHE_TTL) {
    console.log('CSV data served from cache');
    return csvDataCache;
  }
  
  try {
    console.log('CSV data loaded from file');
    const data = await readCSVFile(CSV_FILE_PATH);
    csvDataCache = data;
    csvDataCacheTime = now;
    return data;
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

// Pre-populate genre mapping cache
const initializeGenreCache = () => {
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
    "Stray": "Adventure",
    "No Man's Sky": "Survival",
    "Among Us": "Social Deduction",
  };
  
  Object.entries(genreMapping).forEach(([game, genre]) => {
    GENRE_MAPPING_CACHE.set(game.toLowerCase(), genre);
  });
};

// Initialize cache on module load
initializeGenreCache();

// Cache cleanup function to prevent memory leaks
const cleanupCache = () => {
  const now = Date.now();
  if (csvDataCache && (now - csvDataCacheTime) > CSV_CACHE_TTL * 2) {
    csvDataCache = null;
    csvDataCacheTime = 0;
    console.log('CSV cache cleaned up');
  }
  
  // Clean up achievement cache
  const usernamesToDelete: string[] = [];
  userAchievementCache.forEach((cacheData, username) => {
    if ((now - cacheData.lastChecked) > ACHIEVEMENT_CACHE_TTL * 2) {
      usernamesToDelete.push(username);
    }
  });
  
  usernamesToDelete.forEach(username => userAchievementCache.delete(username));
  
  if (usernamesToDelete.length > 0) {
    console.log(`Achievement cache cleaned up ${usernamesToDelete.length} entries`);
  }
  
  // Clean up request deduplication cache (remove completed requests)
  const pendingKeysToDelete: string[] = [];
  pendingRequests.forEach((promise, key) => {
    // Check if promise is settled (completed or rejected)
    Promise.allSettled([promise]).then(() => {
      pendingKeysToDelete.push(key);
    });
  });
  
  pendingKeysToDelete.forEach(key => pendingRequests.delete(key));
  
  if (pendingKeysToDelete.length > 0) {
    console.log(`Request deduplication cache cleaned up ${pendingKeysToDelete.length} entries`);
  }
};

// Set up periodic cache cleanup (every 10 minutes)
setInterval(cleanupCache, 10 * 60 * 1000);

// Log cache initialization
console.log(`Genre mapping cache initialized with ${GENRE_MAPPING_CACHE.size} entries`);
console.log('CSV data caching enabled with 5-minute TTL');
console.log('Achievement cache enabled with 2-minute TTL');
console.log('Request deduplication enabled with 30-second TTL');

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
  const cacheKey = `igdb:${query.toLowerCase().trim()}`;
  
  return deduplicateRequest(cacheKey, async () => {
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
      // Use the IGDBGame interface to type the response data
      const games = response.data as IGDBGame[];
      return `Found ${games.length} games matching your query.`;
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
  });
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
  const cacheKey = `rawg:${searchQuery.toLowerCase().trim()}`;
  
  return deduplicateRequest(cacheKey, async () => {
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
  });
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
  return GENRE_MAPPING_CACHE.get(gameTitle.toLowerCase()) || null;
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
export const checkQuestionType = (question: string): string[] => {
  const lowerQuestion = question.toLowerCase();
  const detectedGenres = new Set<string>(); // Use Set for automatic deduplication
  
  // Early return for very short questions (less than 10 characters)
  if (lowerQuestion.length < 10) {
    console.log('Question too short for genre detection:', question);
    return [];
  }
  
  // Comprehensive game title to genre mapping
  const platformerGames = [
    'super mario bros', 'super mario world', 'super mario 64', 'super mario sunshine', 
    'super mario galaxy', 'super mario odyssey', 'new super mario bros', 'donkey kong', 
    'crash bandicoot', 'spyro', 'rayman', 'sonic the hedgehog', 'sonic adventure',
    'hollow knight', 'celeste', 'ori', 'little big planet', 'ratchet', 'clank',
    'jak', 'daxter', 'sly cooper', 'banjo', 'kazooie', 'metroid',
    'mega man', 'kirby', 'yoshi', 'platformer', 'jumping', 'a hat in time',
    'psychonauts', 'braid', 'shovel knight', 'cuphead', 'platforming', 'freedom planet',
    'sackboy'
  ];

  const rpgGames = [
    'final fantasy', 'dragon quest', 'xenoblade', 'persona', 'shin megami',
    'pokemon', 'chrono trigger', 'mass effect', 'elder scrolls', 'skyrim',
    'fallout', 'witcher', 'dark souls', 'elden ring', 'bloodborne', 'sekiro',
    'tales of', 'kingdom hearts', 'ni no kuni', 'dragon age', 'baldur\'s gate',
    'pillars of eternity', 'divinity', 'octopath traveler', 'bravely default',
    'fire emblem', 'xenogears', 'xenosaga', 'saga', 'star ocean', 'ys', 'paper mario', 
    'mario & luigi', 'triangle strategy', 'mega man battle network', 'mega man star force',
    'hades', 'mana', 'rune factory', 'skies of arcadia', 'shining force', 'phantasy star',
    'lufia', 'mother', 'earthbound', 'super mario rpg'
  ];

  const actionGames = [
    'devil may cry', 'bayonetta', 'god of war', 'ninja gaiden',
    'metal gear rising: revengeance', 'dynasty warriors', 'nier', 'automata',
    'darksiders', 'prototype', 'infamous', 'asura\'s wrath',
    'kingdom hearts', 'monster hunter', 'dragons dogma', 'grand theft auto',
    'the legend of zelda', 'red dead redemption', 'batman', 'lego',
    'arkham', 'assassin\'s creed', 'star wars', 'dead rising'
  ];

  const survivalGames = [
    'resident evil', 'silent hill', 'dead space', 'amnesia',
    'outlast', 'dying light', 'dead by daylight', 'left 4 dead',
    'state of decay', 'the forest', 'subnautica', 'rust',
    'dayz', '7 days to die', 'minecraft', 'valheim', 'no man\'s sky'
  ];

  const strategyGames = [
    'civilization', 'age of empires', 'starcraft', 'warcraft',
    'command & conquer', 'total war', 'xcom', 'fire emblem',
    'advance wars', 'into the breach', 'valkyria chronicles',
    'disgaea', 'triangle strategy', 'tactics ogre', 'homeworld'
  ];

  const shooterGames = [
    'call of duty', 'battlefield', 'halo', 'doom', 'overwatch',
    'counter strike', 'apex legends', 'titanfall', 'destiny',
    'borderlands', 'bioshock', 'half life', 'portal', 'valorant',
    'rainbow six', 'team fortress 2', 'quake', 'unreal tournament',
    'splatoon', 'far cry', 'battleborn', 'gears of war', 'wolfenstein'
  ];

  const sportsGames = [
    'fifa', 'nba', 'madden', 'nhl', 'pga', 'wii sports',
    'tony hawk', 'skate', 'mario tennis', 'mario golf',
    'mario strikers', 'rocket league', 'sports story', 'ea sports',
    'mlb', '2k', 'wwe', 'the show', 'olympic games', 'punch-out!!',
    'ufc', 'mario sports', 'mario superstar baseball', 'college football'
  ];

  const racingGames = [
    'forza', 'gran turismo', 'need for speed', 'mario kart',
    'burnout', 'dirt', 'f1', 'project cars', 'assetto corsa',
    'wipeout', 'crash team racing', 'sonic racing', 'crazy taxi',
    'destruction derby', 'excitebike', 'f-zero', 'hot wheels',
    'monster jam', 'monster energy', 'rally', 'ridge racer',
    'trackmania', 'twisted metal', 'sonic riders', 'sonic racing',
    'all-star racing'
  ];

  const stealthGames = [
    'metal gear solid', 'splinter cell', 'hitman', 'assassin\'s creed',
    'thief', 'dishonored', 'deus ex', 'death loop', 'aragami', 'metal gear'
  ];

  const battleRoyaleGames = [
    'players unknown battlegrounds', 'pubg', 'apex legends', 'fortnite',
    'fall guys', 'call of duty: warzone', 'eternal return'
  ];

  const visualNovelGames = [
    'phoenix wright', 'ace attorney', 'doki doki literature club', 'sakura wars',
    'danganronpa', 'steins gate', 'hatoful boyfriend', 'coffee talk'
  ];

  const simulationGames = [
    'sim city', 'the sims', 'animal crossing', 'farming simulator',
    'microsoft flight simulator', 'bus simulator', 'train simulator',
    'cities: skylines', 'stardew valley', 'harvest moon', 'story of seasons'
  ];

  const horrorGames = [
    'resident evil', 'silent hill', 'dead space', 'amnesia',
    'outlast', 'layers of fear', 'little nightmares', 'evil within',
    'until dawn', 'five nights at freddy\'s', 'phasmophobia', 'state of decay'
  ];

  const adventureGames = [
    'the legend of zelda', 'the last of us', 'the witcher', 'the elder scrolls',
    'the walking dead', 'the last guardian', 'blaster master', 'turnip boy', 'luigi\'s mansion',
    'shenmue', 'hogwarts legacy', 'far cry', 'assassin\'s creed', 'uncharted',
    'red dead redemption', 'god of war', 'wolfenstein', 'batman', 'arkham', 'star wars'
  ];

  const fightingGames = [
    'street fighter', 'tekken', 'rival schools', 'super smash bros', 'darkstalkers',
    'marvel vs capcom', 'capcom vs snk', 'fatal fury', 'mortal kombat', 'art of fighting',
    'soulcalibur', 'dead or alive', 'king of fighters', 'guilty gear', 'injustice',
    'virtua fighter', 'blazblue', 'capcom vs', 'playstation all stars', 'brawlhalla',
    'jump', 'dragon ball z', 'fighting vipers', 'dragon ball fighterz'
  ];

  const puzzleGames = [
    'dr. mario', 'portal', 'baba is you', 'tetris', 'professor layton',
    'the witness', 'talos principle', 'braid', 'fez',
    'human fall flat', 'untitled goose game', 'it takes two',
    'candy crush', 'bejeweled', 'inside', 'outer wilds'
  ];

  const beatEmUpGames = [
    'streets of rage', 'river city girls', 'final fight', 'yakuza', 'like a dragon',
    'double dragon', 'sifu', 'golden axe', 'battletoads', 'castle crashers', 'scott pilgrim',
    'teenage mutant ninja turtles'
  ];

  const rhythmGames = [
    'crypt of the necrodancer', 'dance dance revolution', 'space channel 5', 'samba de amigo',
    'beat saber', 'rhythm heaven', 'parappa the rapper', 'friday night funkin', 'geometry dash',
    'arcaea', 'guitar hero', 'rock band', 'donkey konga', 'theatrhythm final fantasy', 'osu!',
    'taiko no tatsujin', 'thumper', 'hi-fi rush', 'rhythm doctor', 'metal: hellslinger',
    'sayonara wild hearts', 'fuser'
  ];

  const sandboxGames = [ 'minecraft', 'garry\'s mod', 'roblox', 'lego', 'terraria', 'teardown',
    'no man\'s sky', 'valheim', 'astroneer', 'besiege', 'unturned'
  ];

  // Check for genre keywords in the question
  const genreKeywords = {
    platformerPro: ['platform', 'jump', 'collect coins', 'collect', '3d platformer', '2d platformer'],
    rpgEnthusiast: ['rpg', 'role playing', 'role-playing', 'jrpg', 'level up', 'stats', 'character build'],
    bossBuster: ['boss fight', 'boss battle', 'defeat boss', 'beat the boss', 'final boss', 'superboss'],
    survivalSpecialist: ['survival', 'survive', 'horror', 'zombie', 'craft', 'resource', 'gather'],
    strategySpecialist: ['strategy', 'tactics', 'turn-based', 'rts', 'build', 'command'],
    actionAficionado: ['action', 'combat', 'combo', 'fight', 'hack and slash', 'battle system'],
    battleRoyale: ['battle royale', 'fortnite', 'pubg', 'last man standing', 'battle pass'],
    sportsChampion: ['sports', 'score', 'tournament', 'championship', 'league', 'competition', 'event'],
    adventureAddict: ['adventure', 'explore', 'open world', 'quest', 'story'],
    shooterSpecialist: ['shooter', 'fps', 'third person shooter', 'aim', 'gun', 'shooting'],
    simulationSpecialist: ['simulation', 'sim', 'management', 'construction', 'management simulation', 'town', 'city'],
    fightingFanatic: ['fighting', 'combo', 'cancel', 'air dodge', 'frame', 'mixup', 'throw', 'hit stun', 'stun lock', 'block'],
    puzzlePro: ['puzzle', 'solve', 'riddle', 'brain teaser', 'logic'],
    racingRenegade: ['racing', 'race', 'drift', 'track', 'lap', 'speed', 'kart', 'wheelie'],
    stealthExpert: ['stealth', 'sneak', 'hide', 'assassination', 'silent'],
    horrorHero: ['horror', 'scary', 'survival horror', 'fear', 'terror', 'suspense', 'jump scare'],
    storySeeker: ['story', 'narrative', 'plot', 'dialogue', 'cutscene', 'cinematic', 'visual novel'],
    triviaMaster: ['trivia', 'quiz', 'knowledge', 'question', 'answer', 'category'],
    beatEmUpBrawler: ['brawler', 'side-scrolling', 'frame advantage', 'belt-scroll', 'pressure', 'dash'],
    rhythmMaster: ['rhythm', 'music', 'beat', 'dance', 'song', 'beatmap', 'notes', 'streams', 'beats per minute'],
    sandboxBuilder: ['sandbox', 'build', 'construct', 'create', 'world', 'craft', 'creative', 'free-form gameplay', 'design', 'materials']
  };

  // Check all game genres and collect all matches
  const genreChecks = [
    { games: racingGames, achievement: 'racingRenegade' },
    { games: sportsGames, achievement: 'sportsChampion' },
    { games: rpgGames, achievement: 'rpgEnthusiast' },
    { games: actionGames, achievement: 'actionAficionado' },
    { games: survivalGames, achievement: 'survivalSpecialist' },
    { games: strategyGames, achievement: 'strategySpecialist' },
    { games: shooterGames, achievement: 'shooterSpecialist' },
    { games: simulationGames, achievement: 'simulationSpecialist' },
    { games: battleRoyaleGames, achievement: 'battleRoyale' },
    { games: stealthGames, achievement: 'stealthExpert' },
    { games: horrorGames, achievement: 'horrorHero' },
    { games: adventureGames, achievement: 'adventureAddict' },
    { games: fightingGames, achievement: 'fightingFanatic' },
    { games: visualNovelGames, achievement: 'storySeeker' },
    { games: puzzleGames, achievement: 'puzzlePro' },
    { games: beatEmUpGames, achievement: 'beatEmUpBrawler' },
    { games: rhythmGames, achievement: 'rhythmMaster' },
    { games: platformerGames, achievement: 'platformerPro' },
    { games: sandboxGames, achievement: 'sandboxBuilder' }
  ];

  for (const check of genreChecks) {
    if (check.games.some((game: string) => lowerQuestion.includes(game))) {
      detectedGenres.add(check.achievement);
    }
  }

  // Check for genre keywords and add them
  for (const [achievement, keywords] of Object.entries(genreKeywords)) {
    if (keywords.some(keyword => lowerQuestion.includes(keyword))) {
      detectedGenres.add(achievement);
    }
  }

  // Special achievements based on question content with consolidated regex patterns
  const specialPatterns = [
    { pattern: /(speedrun|fast completion|world record|fastest way)/, achievement: 'speedrunner' },
    { pattern: /(collect|items|100%|completion|achievements|trophies)/, achievement: 'collectorPro' },
    { pattern: /(stats|data|numbers|analysis)/, achievement: 'dataDiver' },
    { pattern: /(performance|fps|graphics|optimization|settings|lag)/, achievement: 'performanceTweaker' }
  ];

  for (const { pattern, achievement } of specialPatterns) {
    if (pattern.test(lowerQuestion)) {
      detectedGenres.add(achievement);
    }
  }

  // Remove duplicates and return
  const uniqueGenres: string[] = Array.from(detectedGenres);
  return uniqueGenres;
};

// Function to check and award achievements based on user progress
export const checkAndAwardAchievements = async (username: string, progress: any, session: mongoose.ClientSession | null = null) => {
  console.log('Checking achievements for user:', username);
  console.log('Current progress:', progress);

  const now = Date.now();
  const cacheKey = username;
  const cached = userAchievementCache.get(cacheKey);
  
  // Use cache if recent enough (within 2 minutes)
  if (cached && (now - cached.lastChecked) < ACHIEVEMENT_CACHE_TTL) {
    console.log('Using cached achievement data for user:', username);
    const currentAchievements = cached.achievements;
    const hasProAccess = cached.hasProAccess;
    
    // Check if any new achievements can be earned with current progress
    const newAchievements: { name: string; dateEarned: Date }[] = [];
    
    // Check each achievement condition using cached data
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
      { name: 'Fighting Fanatic', field: 'fightingFanatic', threshold: 5 },
      { name: 'Simulation Specialist', field: 'simulationSpecialist', threshold: 5 },
      { name: 'Puzzle Pro', field: 'puzzlePro', threshold: 5 },
      { name: 'Racing Renegade', field: 'racingRenegade', threshold: 5 },
      { name: 'Stealth Expert', field: 'stealthExpert', threshold: 5 },
      { name: 'Horror Hero', field: 'horrorHero', threshold: 5 },
      { name: 'Trivia Master', field: 'triviaMaster', threshold: 5 },
      { name: 'Story Seeker', field: 'storySeeker', threshold: 5 },
      { name: 'Beat Em Up Brawler', field: 'beatEmUpBrawler', threshold: 5 },
      { name: 'Rhythm Master', field: 'rhythmMaster', threshold: 5 },
      { name: 'Sandbox Builder', field: 'sandboxBuilder', threshold: 5 }
    ];

    // Check each achievement
    for (const check of achievementChecks) {
      const progressValue = progress[check.field] || 0;
      if (progressValue >= check.threshold && 
          !currentAchievements.some((a: { name: string; }) => a.name === check.name)) {
        newAchievements.push({ 
          name: check.name, 
          dateEarned: new Date() 
        });
        console.log(`Achievement earned: ${check.name}`);
      }
    }

    // Check Pro achievements if user has Pro access
    if (hasProAccess) {
      const proAchievementChecks = [
        { 
          name: 'Game Master', 
          field: 'proAchievements.gameMaster', 
          threshold: 10,
          condition: () => {
            const genreCounts = Object.entries(progress)
              .filter(([key]) => !key.startsWith('proAchievements'))
              .filter(([_, value]) => (value as number) >= 5)
              .length;
            return genreCounts >= 5;
          }
        },
        { 
          name: 'Speed Demon', 
          field: 'proAchievements.speedDemon', 
          threshold: 20,
          condition: () => progress.totalQuestions >= 100
        },
        { 
          name: 'Community Leader', 
          field: 'proAchievements.communityLeader', 
          threshold: 15,
          condition: () => progress.totalQuestions >= 200
        },
        { 
          name: 'Achievement Hunter', 
          field: 'proAchievements.achievementHunter', 
          threshold: 1,
          condition: () => currentAchievements.length >= 15
        },
        { 
          name: 'Pro Streak', 
          field: 'proAchievements.proStreak', 
          threshold: 7,
          condition: () => progress.dailyExplorer >= 7
        },
        { 
          name: 'Expert Advisor', 
          field: 'proAchievements.expertAdvisor', 
          threshold: 50,
          condition: () => progress.totalQuestions >= 500
        },
        { 
          name: 'Genre Specialist', 
          field: 'proAchievements.genreSpecialist', 
          threshold: 1,
          condition: () => {
            const maxGenre = Object.entries(progress)
              .filter(([key]) => !key.startsWith('proAchievements'))
              .reduce((max, [_, value]) => Math.max(max, value as number), 0);
            return maxGenre >= 20;
          }
        },
        { 
          name: 'Pro Contributor', 
          field: 'proAchievements.proContributor', 
          threshold: 1,
          condition: () => progress.totalQuestions >= 1000
        }
      ];

      for (const check of proAchievementChecks) {
        if (check.condition() && 
            !currentAchievements.some((a: { name: string; }) => a.name === check.name)) {
          newAchievements.push({ 
            name: check.name, 
            dateEarned: new Date() 
          });
          console.log(`Pro achievement earned: ${check.name}`);
        }
      }
    }

    // If new achievements found, update cache and return them
    if (newAchievements.length > 0) {
      console.log('New achievements found using cache:', newAchievements.length);
      // Update cache with new achievements
      userAchievementCache.set(cacheKey, {
        achievements: [...currentAchievements, ...newAchievements],
        hasProAccess,
        lastChecked: now
      });
      return newAchievements;
    }

    return []; // No new achievements
  }

  // Cache miss or expired - fetch from database
  console.log('Cache miss for user achievements, fetching from database:', username);
  const user = await User.findOne({ username }).session(session);
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
    { name: 'Fighting Fanatic', field: 'fightingFanatic', threshold: 5 },
    { name: 'Simulation Specialist', field: 'simulationSpecialist', threshold: 5 },
    { name: 'Puzzle Pro', field: 'puzzlePro', threshold: 5 },
    { name: 'Racing Renegade', field: 'racingRenegade', threshold: 5 },
    { name: 'Stealth Expert', field: 'stealthExpert', threshold: 5 },
    { name: 'Horror Hero', field: 'horrorHero', threshold: 5 },
    { name: 'Trivia Master', field: 'triviaMaster', threshold: 5 },
    { name: 'Story Seeker', field: 'storySeeker', threshold: 5 },
    { name: 'Beat Em Up Brawler', field: 'beatEmUpBrawler', threshold: 5 },
    { name: 'Rhythm Master', field: 'rhythmMaster', threshold: 5 },
    { name: 'Sandbox Builder', field: 'sandboxBuilder', threshold: 5 }
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

  // Check Pro achievements if user has Pro access
  if (user?.hasProAccess) {
    const proAchievementChecks = [
      { 
        name: 'Game Master', 
        field: 'proAchievements.gameMaster', 
        threshold: 10,
        condition: () => {
          const genreCounts = Object.entries(progress)
            .filter(([key]) => !key.startsWith('proAchievements'))
            .filter(([_, value]) => (value as number) >= 5)
            .length;
          return genreCounts >= 5;
        }
      },
      { 
        name: 'Speed Demon', 
        field: 'proAchievements.speedDemon', 
        threshold: 20,
        condition: () => progress.totalQuestions >= 100
      },
      { 
        name: 'Community Leader', 
        field: 'proAchievements.communityLeader', 
        threshold: 15,
        condition: () => progress.totalQuestions >= 200
      },
      { 
        name: 'Achievement Hunter', 
        field: 'proAchievements.achievementHunter', 
        threshold: 1,
        condition: () => currentAchievements.length >= 15
      },
      { 
        name: 'Pro Streak', 
        field: 'proAchievements.proStreak', 
        threshold: 7,
        condition: () => progress.dailyExplorer >= 7
      },
      { 
        name: 'Expert Advisor', 
        field: 'proAchievements.expertAdvisor', 
        threshold: 50,
        condition: () => progress.totalQuestions >= 500
      },
      { 
        name: 'Genre Specialist', 
        field: 'proAchievements.genreSpecialist', 
        threshold: 1,
        condition: () => {
          const maxGenre = Object.entries(progress)
            .filter(([key]) => !key.startsWith('proAchievements'))
            .reduce((max, [_, value]) => Math.max(max, value as number), 0);
          return maxGenre >= 20;
        }
      },
      { 
        name: 'Pro Contributor', 
        field: 'proAchievements.proContributor', 
        threshold: 1,
        condition: () => progress.totalQuestions >= 1000
      }
    ];

    for (const check of proAchievementChecks) {
      if (check.condition() && 
          !currentAchievements.some((a: { name: string; }) => a.name === check.name)) {
        newAchievements.push({ 
          name: check.name, 
          dateEarned: new Date() 
        });
        console.log(`Pro achievement earned: ${check.name}`);
      }
    }
  }

  if (newAchievements.length > 0) {
    console.log('New achievements to award:', newAchievements);

    // Update the user with the new achievements
    const updateResult = await User.findOneAndUpdate(
      { username },
      { 
        $set: { progress },
        $push: { achievements: { $each: newAchievements } }
      },
      { session: session || undefined, new: true }
    );

    console.log('Update result:', updateResult);

    // Emit achievement event with enhanced data for Pro users (only if Socket.IO is available)
    if (newAchievements.length > 0) {
      try {
        const io = getIO();
        if (io) {
          io.emit('achievementEarned', { 
            username, 
            achievements: newAchievements,
            isPro: user?.hasProAccess || false,
            message: `Congratulations! You've earned ${newAchievements.length} new achievement${newAchievements.length > 1 ? 's' : ''}!`,
            totalAchievements: (currentAchievements.length + newAchievements.length)
          });
        }
      } catch (e) {
        console.warn('Socket.IO not initialized, skipping achievement emit.');
      }
    }

    // Update cache with new achievements and user data
    userAchievementCache.set(cacheKey, {
      achievements: [...currentAchievements, ...newAchievements],
      hasProAccess: user?.hasProAccess || false,
      lastChecked: now
    });
    console.log('Achievement cache updated for user:', username);

    return newAchievements;
  }

  // Update cache even when no new achievements (to avoid repeated DB calls)
  userAchievementCache.set(cacheKey, {
    achievements: currentAchievements,
    hasProAccess: user?.hasProAccess || false,
    lastChecked: now
  });
  console.log('Achievement cache updated (no new achievements) for user:', username);

  return [];
};

// Optimized memory measurement with caching
let memoryCache: { data: any; timestamp: number } | null = null;
const MEMORY_CACHE_TTL = 1000; // 1 second cache

const measureMemoryUsage = (forceRefresh: boolean = false) => {
  const now = Date.now();
  
  // Return cached data if recent and not forcing refresh
  if (!forceRefresh && memoryCache && (now - memoryCache.timestamp) < MEMORY_CACHE_TTL) {
    return memoryCache.data;
  }
  
  const used = process.memoryUsage();
  const data = {
    heapTotal: Math.round(used.heapTotal / 1024 / 1024 * 100) / 100 + 'MB',
    heapUsed: Math.round(used.heapUsed / 1024 / 1024 * 100) / 100 + 'MB',
    rss: Math.round(used.rss / 1024 / 1024 * 100) / 100 + 'MB',
    external: Math.round(used.external / 1024 / 1024 * 100) / 100 + 'MB'
  };
  
  // Cache the result
  memoryCache = { data, timestamp: now };
  return data;
};

// Optimized response size measurement
const measureResponseSize = (data: any, estimateOnly: boolean = false) => {
  if (estimateOnly) {
    // Quick estimation without full JSON.stringify
    const estimatedSize = JSON.stringify(data).length;
    return {
      bytes: estimatedSize,
      kilobytes: (estimatedSize / 1024).toFixed(2) + 'KB',
      estimated: true
    };
  }
  
  const size = Buffer.byteLength(JSON.stringify(data));
  return {
    bytes: size,
    kilobytes: (size / 1024).toFixed(2) + 'KB',
    estimated: false
  };
};

// Optimized database query measurement
const measureDBQuery = async (operation: string, query: () => Promise<any>, enableDetailedMetrics: boolean = false) => {
  const startTime = performance.now();
  
  // Only measure memory if detailed metrics are enabled
  const startMemory = enableDetailedMetrics ? process.memoryUsage().heapUsed : 0;
  
  const result = await query();
  
  const endTime = performance.now();
  const executionTime = endTime - startTime;
  
  const metrics: any = {
    operation,
    executionTime: `${executionTime.toFixed(2)}ms`,
    result
  };
  
  // Only add memory metrics if detailed monitoring is enabled
  if (enableDetailedMetrics) {
    const endMemory = process.memoryUsage().heapUsed;
    metrics.memoryUsed = `${((endMemory - startMemory) / 1024 / 1024).toFixed(2)}MB`;
  }
  
  return metrics;
};

// Optimized request rate monitoring
class RequestMonitor {
  private requests: number = 0;
  private startTime: number = Date.now();
  private lastRateCalculation: number = 0;
  private cachedRate: { totalRequests: number; requestsPerSecond: string } | null = null;
  private readonly RATE_CACHE_TTL = 5000; // 5 seconds

  incrementRequest() {
    this.requests++;
  }

  getRequestRate() {
    const now = Date.now();
    
    // Return cached rate if recent
    if (this.cachedRate && (now - this.lastRateCalculation) < this.RATE_CACHE_TTL) {
      return this.cachedRate;
    }
    
    const elapsed = (now - this.startTime) / 1000; // seconds
    const rate = {
      totalRequests: this.requests,
      requestsPerSecond: (this.requests / elapsed).toFixed(2)
    };
    
    // Cache the result
    this.cachedRate = rate;
    this.lastRateCalculation = now;
    
    return rate;
  }
}

// Performance monitoring configuration
const PERFORMANCE_CONFIG = {
  enableDetailedMetrics: process.env.NODE_ENV === 'development' || process.env.ENABLE_DETAILED_METRICS === 'true',
  enableLogging: process.env.NODE_ENV === 'development' || process.env.ENABLE_PERFORMANCE_LOGGING === 'true',
  enableFileLogging: process.env.ENABLE_FILE_LOGGING === 'true',
  logLevel: process.env.LOG_LEVEL || 'info'
};

// Optimized logger with conditional file transport
const logger = winston.createLogger({
  level: PERFORMANCE_CONFIG.logLevel,
  format: winston.format.json(),
  defaultMeta: { service: 'game-assistant' },
  transports: [
    new winston.transports.Console({ 
      format: winston.format.simple(),
      silent: !PERFORMANCE_CONFIG.enableLogging 
    }),
    ...(PERFORMANCE_CONFIG.enableFileLogging ? [
      new winston.transports.File({ filename: 'performance-metrics.log' })
    ] : [])
  ]
});

// Add custom error classes
class AssistantError extends Error {
  constructor(message: string, public statusCode: number = 500) {
    super(message);
    this.name = 'AssistantError';
  }
}

class ValidationError extends AssistantError {
  constructor(message: string) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

// Main API handler function that processes incoming requests
const assistantHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  const startTime = performance.now();
  const { username, question, code } = req.body;
  const metrics: Metrics = {};
  const requestMonitor = new RequestMonitor();
  const aiCache = getAICache();
  
  try {
    // Validate question and username
    if (!question || typeof question !== 'string') {
      throw new ValidationError('Invalid question format - question must be a non-empty string');
    }

    if (!username || typeof username !== 'string') {
      throw new ValidationError('Username is required');
    }

    // Check for offensive content first
    const contentCheck = await containsOffensiveContent(question, username);
    if (contentCheck.isOffensive) {
      if (contentCheck.violationResult?.action === 'banned') {
        logger.warn('User banned for offensive content', { username, question });
        return res.status(403).json({
          error: 'Account Suspended',
          message: 'Your account is temporarily suspended',
          banExpiresAt: contentCheck.violationResult.expiresAt,
          metrics
        });
      }
      
      if (contentCheck.violationResult?.action === 'warning') {
        logger.warn('A warning has been issued for offensive content', { username, question, warningCount: contentCheck.violationResult.count });
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
    
    // Measure memory at start (only if detailed metrics enabled)
    if (PERFORMANCE_CONFIG.enableDetailedMetrics) {
      metrics.initialMemory = measureMemoryUsage();
    }
    
    // Existing MongoDB connection measurement
    const { latency: dbLatency } = await measureLatency('MongoDB Connection', async () => {
      await connectToMongoDB();
    }, PERFORMANCE_CONFIG.enableLogging);
    metrics.dbConnection = dbLatency;

    let answer: string | null;

    // Add timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 25000);
    });

    // Measure question processing time
    const { result: processedAnswer, latency: processingLatency } = await measureLatency('Question Processing', async () => {
      if (question.toLowerCase().includes("recommendations")) {
        const previousQuestions = await Question.find({ username });
        const genres = analyzeUserQuestions(previousQuestions);
        const cacheKey = `recommendations:${username}:${genres[0] || 'default'}`;
        const recommendations = genres.length > 0 ? await deduplicateRequest(cacheKey, () => fetchRecommendations(genres[0])) : [];
        
        return recommendations.length > 0 
          ? `Based on your previous questions, I recommend these games: ${recommendations.join(', ')}.` 
          : "I couldn't find any recommendations based on your preferences.";

      } else if (question.toLowerCase().includes("when was") || question.toLowerCase().includes("when did")) {
        // Existing release date logic
        const cacheKey = `chat:${question.toLowerCase().trim()}`;
        const baseAnswer = await Promise.race([
          deduplicateRequest(cacheKey, () => getChatCompletion(question)),
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
        const codeValue = Array.isArray(code) ? code[0] : code;
        const accessTokenCacheKey = `twitch_token:${codeValue}`;
        const accessToken = await deduplicateRequest(accessTokenCacheKey, () => getAccessToken(codeValue));
        
        const userDataCacheKey = `twitch_user:${accessToken}`;
        const userData = await deduplicateRequest(userDataCacheKey, () => getTwitchUserData(accessToken));
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
        const cacheKey = `chat:${question.toLowerCase().trim()}`;
        const baseAnswer = await Promise.race([
          deduplicateRequest(cacheKey, () => getChatCompletion(question)),
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
            // Create question with proper username handling
            const questionData = { 
              username: username || 'anonymous', 
              question, 
              response: answer 
            };
            const questionDoc = await Question.create([questionData], { session });

            // Check question type first to prepare bulk update operations
            const questionType = await checkQuestionType(question);
            console.log('Question type detected:', questionType); // Debug log

            // Check if user exists first to determine update strategy
            const existingUser = await User.findOne({ username }).session(session);
            
            if (existingUser) {
              // User exists - use $inc for progress fields
              const updateOperations: any = {
                $inc: { conversationCount: 1 }
              };

              // Add genre increments in bulk
              if (questionType.length > 0) {
                questionType.forEach(genre => {
                  updateOperations.$inc[`progress.${genre}`] = 1;
                });
              }

              // Single database operation for existing user
            const userDoc = await User.findOneAndUpdate(
              { username },
                updateOperations,
                { new: true, session }
              );

              result = { questionDoc, userDoc };
            } else {
              // User doesn't exist - create with initial structure
              const initialProgress = {
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
                    racingRenegade: 0,
                    stealthExpert: 0,
                    horrorHero: 0,
                    triviaMaster: 0,
                    storySeeker: 0,
                    beatEmUpBrawler: 0,
                    rhythmMaster: 0,
                    sandboxBuilder: 0,
                    totalQuestions: 0,
                    dailyExplorer: 0,
                    speedrunner: 0,
                    collectorPro: 0,
                    dataDiver: 0,
                    performanceTweaker: 0,
                    conversationalist: 0,
                    proAchievements: {
                      gameMaster: 0,
                      speedDemon: 0,
                      communityLeader: 0,
                      achievementHunter: 0,
                      proStreak: 0,
                      expertAdvisor: 0,
                      genreSpecialist: 0,
                      proContributor: 0
                    }
              };

              // Add genre increments to initial progress
            if (questionType.length > 0) {
                questionType.forEach(genre => {
                  if (genre in initialProgress) {
                    (initialProgress as any)[genre] = 1;
                  }
                });
              }

              // Create new user with initial data
              const userDoc = await User.create([{
                userId: `user_${Date.now()}`, // Generate a unique userId
                username,
                email: `${username}@placeholder.com`, // Provide a placeholder email
                conversationCount: 1,
                achievements: [],
                progress: initialProgress
              }], { session });

              result = { questionDoc, userDoc: userDoc[0] };
            }

            // Check achievements only once with the updated progress
            if (result.userDoc && questionType.length > 0) {
              await checkAndAwardAchievements(username, result.userDoc.progress, session);
            }
          });

          await session.endSession();
          return result;
        } catch (error) {
          await session.endSession();
          console.error('Transaction error:', error);
          throw new Error(`Database operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Database operation error:', error);
        throw error;
      }
    });
    metrics.databaseMetrics = dbMetrics;

    // Measure final memory usage
    metrics.finalMemory = measureMemoryUsage();
    
    // Add cache metrics to response
    metrics.aiCacheMetrics = aiCache.getMetrics();
    
    // Measure response size
    const responseData = { answer, metrics };
    metrics.responseSize = measureResponseSize(responseData);
    
    // Add request rate
    metrics.requestRate = requestMonitor.getRequestRate();
    
    // Log performance metrics
    const endTime = performance.now();
    metrics.totalTime = endTime - startTime;
    logger.info('API request completed', { 
      username,
      questionLength: question.length,
      metrics
    });
    
    // Return just the base answer
    return res.status(200).json({ 
      answer: answer,
      metrics
    });
    
  } catch (error) {
    console.error("Error in API route:", error);
    const endTime = performance.now();
    metrics.totalTime = endTime - startTime;
    metrics.aiCacheMetrics = aiCache.getMetrics();
    
    // Enhanced error logging
    logger.error('API request failed', {
      username,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : 'Unknown error',
      metrics
    });
    
    if (error instanceof AssistantError) {
      res.status(error.statusCode).json({ 
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