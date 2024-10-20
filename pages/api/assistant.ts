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

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

const formatReleaseDate = (dateString: string): string => {
  const [day, month, year] = dateString.split('-');
  return `${month}/${day}/${year}`;
};

const formatGameInfo = (gameInfo: any): string => {
  const formattedReleaseDate = formatReleaseDate(gameInfo.release_date);
  return `${gameInfo.title} was released on ${formattedReleaseDate} for ${gameInfo.console}. It is a ${gameInfo.genre} game developed by ${gameInfo.developer} and published by ${gameInfo.publisher}.`;
};

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

const fetchAndCombineGameData = async (question: string, answer: string): Promise<string> => {
  const gameName = question.replace(/when (was|did) (.*?) (released|come out)/i, "$2").trim();

  try {
    const rawgResponse = await fetchGamesFromRAWG(gameName);
    const igdbResponse = await fetchGamesFromIGDB(gameName);

    // Determine if the responses are suitable for combined output
    const isMainResponseShort = rawgResponse.length < 150 && (igdbResponse ? igdbResponse.length < 150 : true);
    let finalResponse = isMainResponseShort ? "Combined Game Information:\n" : "";

    if (isMainResponseShort) {
      if (!rawgResponse.includes("No games found")) {
        finalResponse += `\nFrom RAWG: ${rawgResponse}`;
      }
      if (igdbResponse && !igdbResponse.includes("No games found")) {
        finalResponse += `\nFrom IGDB: ${igdbResponse}`;
      }
    } else {
      finalResponse += "Detailed game information is already provided in the main response.";
    }

    const csvData = await getCSVData();
    const gameInfo = csvData.find((game: any) => game.title.toLowerCase() === gameName.toLowerCase());
    const formattedGameInfo = gameInfo ? `${formatGameInfo(gameInfo)}\n\nAdditional Information:\n${finalResponse}` : `${answer}\n\nAdditional Information:\n${finalResponse}`;

    // Only return consolidated response
    return formattedGameInfo;
  } catch (error) {
    console.error('Error fetching game data or reading CSV:', error);
    return `${answer}\n\nAdditional Information:\nFailed to fetch data due to an error.`;
  }
};

const checkAndUpdateGameInfo = async (question: string, answer: string): Promise<string> => {
  const finalResponse = await fetchAndCombineGameData(question, answer);
  return finalResponse;
};

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
    "Roller Coaster Tycoon 3": "Construction and Management Simulation"
  };
  return genreMapping[gameTitle] || null;
};

const extractGameTitle = (question: string): string => {
  const match = question.match(/(?:guide|walkthrough|progress|unlock|strategy|find).*?\s(.*?)(?:\s(?:chapter|level|stage|part|area|boss|item|character|section))/i);
  return match ? match[1].trim() : '';
};

// const checkQuestionType = (question: string): string | null => {
//   if (question.toLowerCase().includes("rpg")) return "rpgEnthusiast";
//   if (question.toLowerCase().includes("boss fight")) return "bossBuster";
//   if (question.toLowerCase().includes("strategy")) return "strategySpecialist";
//   if (question.toLowerCase().includes("action")) return "actionAficionado";
//   if (question.toLowerCase().includes("battle royale")) return "battleRoyale";
//   if (question.toLowerCase().includes("sports")) return "sportsChampion";
//   if (question.toLowerCase().includes("adventure")) return "adventureAddict";
//   if (question.toLowerCase().includes("shooter")) return "shooterSpecialist";
//   if (question.toLowerCase().includes("puzzle")) return "puzzlePro";
//   if (question.toLowerCase().includes("racing")) return "racingPro";
//   if (question.toLowerCase().includes("stealth")) return "stealthSpecialist";
//   if (question.toLowerCase().includes("horror")) return "horrorHero";
//   if (question.toLowerCase().includes("trivia")) return "triviaMaster";
//   if (question.toLowerCase().includes("speed run")) return "speedrunner";
//   if (question.toLowerCase().includes("collect")) return "collectorPro";
//   if (question.toLowerCase().includes("analytics")) return "dataDiver";
//   if (question.toLowerCase().includes("performance")) return "performanceTweaker";
//   return null;
// };

// const checkAndAwardAchievements = async (userId: string, progress: any) => {
//   const achievements: any[] = [];

//   if (progress.rpgEnthusiast >= 5 && !progress.achievements.includes("RPG Enthusiast")) {
//     achievements.push({ name: "RPG Enthusiast", dateEarned: new Date() });
//   }
//   if (progress.bossBuster >= 10 && !progress.achievements.includes("Boss Buster")) {
//     achievements.push({ name: "Boss Buster", dateEarned: new Date() });
//   }
//   if (progress.strategySpecialist >= 5 && !progress.achievements.includes("Strategy Specialist")) {
//     achievements.push({ name: "Strategy Specialist", dateEarned: new Date() });
//   }
//   if (progress.actionAficionado >= 5 && !progress.achievements.includes("Action Aficionado")) {
//     achievements.push({ name: "Action Aficionado", dateEarned: new Date() });
//   }
//   if (progress.battleRoyale >= 5 && !progress.achievements.includes("Battle Royale")) {
//     achievements.push({ name: "Battle Royale Master", dateEarned: new Date() });
//   }
//   if (progress.sportsChampion >= 5 && !progress.achievements.includes("Sports Champion")) {
//     achievements.push({ name: "Sports Champion", dateEarned: new Date() });
//   }
//   if (progress.adventureAddict >= 5 && !progress.achievements.includes("Adventure Addict")) {
//     achievements.push({ name: "Adventure Addict", dateEarned: new Date() });
//   }
//   if (progress.shooterSpecialist >= 5 && !progress.achievements.includes("Shooter Specialist")) {
//     achievements.push({ name: "Shooter Specialist", dateEarned: new Date() });
//   }
//   if (progress.puzzlePro >= 5 && !progress.achievements.includes("Puzzle Pro")) {
//     achievements.push({ name: "Puzzle Pro", dateEarned: new Date() });
//   }
//   if (progress.racingExpert >= 5 && !progress.achievements.includes("Racing Expert")) {
//     achievements.push({ name: "Racing Expert", dateEarned: new Date() });
//   }
//   if (progress.stealthSpecialist >= 5 && !progress.achievements.includes("Stealth Specialist")) {
//     achievements.push({ name: "Stealth Specialist", dateEarned: new Date() });
//   }
//   if (progress.horrorHero >= 5 && !progress.achievements.includes("Horror Hero")) {
//     achievements.push({ name: "Horror Hero", dateEarned: new Date() });
//   }
//   if (progress.triviaMaster >= 5 && !progress.achievements.includes("Trivia Master")) {
//     achievements.push({ name: "Trivia Master", dateEarned: new Date() });
//   }
//   if (progress.speedrunner >= 10 && !progress.achievements.includes("Speedrunner")) {
//     achievements.push({ name: "Speedrunner", dateEarned: new Date() });
//   }
//   if (progress.collectorPro >= 10 && !progress.achievements.includes("Collector Pro")) {
//     achievements.push({ name: "Collector Pro", dateEarned: new Date() });
//   }
//   if (progress.dataDiver >= 10 && !progress.achievements.includes("Data Diver")) {
//     achievements.push({ name: "Data Diver", dateEarned: new Date() });
//   }
//   if (progress.performanceTweaker >= 10 && !progress.achievements.includes("Performance Tweaker")) {
//     achievements.push({ name: "Performance Tweaker", dateEarned: new Date() });
//   }
//   if (achievements.length > 0) {
//     // Update the user with the new achievements
//     await User.updateOne({ userId }, { $push: { achievements: { $each: achievements } } });
//   }
// };

// Main handler
const assistantHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { userId, question, code } = req.body;

  try {
    console.log("Received question:", question);
    await connectToMongoDB();

    let answer: string | null;

    if (question.toLowerCase().includes("recommendations")) {
      const previousQuestions = await Question.find({ userId });
      const genres = analyzeUserQuestions(previousQuestions);
      const recommendations = genres.length > 0 ? await fetchRecommendations(genres[0]) : [];
      answer = recommendations.length > 0 ? `Based on your previous questions, I recommend these games: ${recommendations.join(', ')}.` : "I couldn't find any recommendations based on your preferences.";
    } else if (question.toLowerCase().includes("when was") || question.toLowerCase().includes("when did")) {
      answer = await getChatCompletion(question);
      answer = answer ? await checkAndUpdateGameInfo(question, answer) : "I'm sorry, I couldn't generate a response. Please try again.";
    } else if (question.toLowerCase().includes("twitch user data")) {
      if (!code) {
        redirectToTwitch(res);
        return;
      }
      const accessToken = await getAccessToken(Array.isArray(code) ? code[0] : code);
      const userData = await getTwitchUserData(accessToken);
      answer = `Twitch User Data: ${JSON.stringify(userData)}`;
    } else if (question.toLowerCase().includes("genre")) {
      const gameTitle = extractGameTitle(question);
      const genre = getGenreFromMapping(gameTitle);
      answer = genre ? `${gameTitle} is categorized as ${genre}.` : `I couldn't find genre information for ${gameTitle}.`;
    } else {
      answer = await getChatCompletion(question);
      answer = answer ? await checkAndUpdateGameInfo(question, answer) : "I'm sorry, I couldn't generate a response. Please try again.";
    }

    await Question.create({ userId, question, response: answer });
    await User.findOneAndUpdate({ userId }, { $inc: { conversationCount: 1 } }, { upsert: true });

    res.status(200).json({ answer });
  } catch (error) {
    console.error("Error in API route:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export default assistantHandler;