import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import connectToMongoDB from '../../utils/mongodb';
import Question from '../../models/Question';
import { getChatCompletion, fetchRecommendations, analyzeUserQuestions } from '../../utils/aiHelper';
import { getAccessToken, getTwitchUserData, redirectToTwitch } from '../../utils/twitchAuth';
import OpenAI from 'openai';
import path from 'path';
import { readFile } from 'fs/promises';
import { parse } from 'csv-parse/sync';

console.log("Environment Variables:");
console.log("OPENAI_API_KEY:", process.env.OPENAI_API_KEY ? "SET" : "NOT SET");
console.log("NEXT_PUBLIC_TWITCH_CLIENT_ID:", process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID ? "SET" : "NOT SET");
console.log("TWITCH_CLIENT_SECRET:", process.env.TWITCH_CLIENT_SECRET ? "SET" : "NOT SET");
console.log("TWITCH_TOKEN_URL:", process.env.TWITCH_TOKEN_URL ? "SET" : "NOT SET");
console.log("RAWG_API_KEY:", process.env.RAWG_API_KEY ? "SET" : "NOT SET");
console.log("STEAM_API_KEY:", process.env.STEAM_API_KEY ? "SET" : "NOT SET");
console.log("MONGODB_URI:", process.env.MONGODB_URI ? "SET" : "NOT SET");

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
    const data = await readCSVFile(CSV_FILE_PATH);
    return data;
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
  const accessToken = await getAccessToken(); // No argument needed here
  const headers = {
    'Client-ID': process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID,
    'Authorization': `Bearer ${accessToken}`
  };
  const body = `fields name,genres.name,platforms.name,release_dates.date,involved_companies.company.name,involved_companies.publisher,involved_companies.developer,url; search "${query}"; limit 10;`;

  try {
    const response = await axios.post('https://api.igdb.com/v4/games', body, { headers });
    console.log("IGDB API Response:", response.data); // Log the IGDB response data
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
      return games.map((game: { name: string; releaseDate: string | number | Date; genres: string; platforms: string; developers: string; publishers: string; url: string }) => `${game.name} (Released: ${game.releaseDate ? new Date(game.releaseDate).toLocaleDateString() : 'N/A'}, Genres: ${game.genres}, Platforms: ${game.platforms}, Developers: ${game.developers}, Publishers: ${game.publishers}, URL: ${game.url})`).join('\n');
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
    console.log("RAWG API Response:", response.data); // Log the RAWG response data
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

const fetchSteamGameDetails = async (gameId: string): Promise<any> => {
  const apiKey = process.env.STEAM_API_KEY;

  try {
    const [gameSchema, achievementStats, gameNews] = await Promise.all([
      axios.get(`http://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?key=${apiKey}&appid=${gameId}`),
      axios.get(`http://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v0002/?gameid=${gameId}&key=${apiKey}`),
      axios.get(`http://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${gameId}&count=5&maxlength=300`)
    ]);

    return {
      gameSchema: gameSchema.data,
      achievementStats: achievementStats.data.achievementpercentages.achievements,
      gameNews: gameNews.data.appnews.newsitems
    };
  } catch (error: any) {
    // Narrow the error type
    if (error instanceof Error) {
      console.error("Error fetching data from Steam API:", error.message);
    } else {
      console.error("An unexpected error occurred:", error);
    }
    return null;
  }
};

const fetchDataFromBothAPIs = async (gameName: string): Promise<string> => {
  try {
    const rawgPromise = fetchGamesFromRAWG(gameName);
    const igdbPromise = fetchGamesFromIGDB(gameName);
    const [rawgResponse, igdbResponse] = await Promise.all([rawgPromise, igdbPromise]);

    let finalResponse = "";
    if (rawgResponse.includes("No games found") && igdbResponse?.includes("No games found")) {
      finalResponse = "No relevant game information found in any database.";
    } else {
      finalResponse = "Combined Game Information: \n";
      if (!rawgResponse.includes("No games found")) {
        finalResponse += `\nFrom RAWG: ${rawgResponse}`;
      }
      if (igdbResponse && !igdbResponse.includes("No games found")) {
        finalResponse += `\nFrom IGDB: ${igdbResponse}`;
      }
    }

    return finalResponse;
  } catch (error: any) {
    console.error("Error fetching data from APIs:", error.message);
    return "Failed to fetch data due to an error.";
  }
};

const checkAndUpdateGameInfo = async (question: string, answer: string): Promise<string> => {
  const gameName = question.replace(/when (was|did) (.*?) (released|come out)/i, "$2").trim();
  console.log("Extracted game name:", gameName); // Log the extracted game name
  const combinedResponse = await fetchDataFromBothAPIs(gameName);
  console.log("Combined API response:", combinedResponse); // Log the combined API response

  try {
    const csvData = await getCSVData();
    const gameInfo = csvData.find((game: any) => game.title.toLowerCase() === gameName.toLowerCase());
    console.log("Game Info from CSV:", gameInfo); // Log the game info from CSV

    if (gameInfo) {
      return `${formatGameInfo(gameInfo)}\n\nAdditional Information:\n${combinedResponse}`;
    } else {
      return answer;
    }
  } catch (error) {
    console.error('CSV Data is unavailable, continuing without it:', error);
    return `${answer}\n\nAdditional Information:\n${combinedResponse}`;
  }
};

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
  "Shellshock Live": "Artillery"
};

const getGenreFromMapping = (gameTitle: string): string | null => {
  return genreMapping[gameTitle] || null;
};

const extractGameTitle = (question: string): string => {
  const match = question.match(/(?:guide|walkthrough|progress|unlock|strategy|find).*?\s(.*?)(?:\s(?:chapter|level|stage|part|area|boss|item|character|section))/i);
  return match ? match[1].trim() : '';
};

// Extract Steam Game ID from the question
const extractSteamGameId = (question: string): string | null => {
  const match = question.match(/\b\d{4,10}\b/); // Example regex to find a number that looks like a Steam game ID
  return match ? match[0] : null;
};

// Handler function
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId, question, code } = req.body;

  try {
    console.log("Received question:", question);

    await connectToMongoDB();

    const previousQuestions = await Question.find({ userId });

    let answer: string | null;

    if (question.toLowerCase().includes("recommendations")) {
      const genres = analyzeUserQuestions(previousQuestions);

      if (genres.length > 0) {
        const recommendations = await fetchRecommendations(genres[0]);
        if (recommendations.length > 0) {
          answer = `Based on your previous questions, I recommend these games: ${recommendations.join(', ')}.`;
        } else {
          answer = "I couldn't find any recommendations based on your preferences.";
        }
      } else {
        answer = "I couldn't determine your preferences based on your previous questions.";
      }
    } else if (question.toLowerCase().includes("when was") || question.toLowerCase().includes("when did")) {
      answer = await getChatCompletion(question);
      if (answer) {
        answer = await checkAndUpdateGameInfo(question, answer);
      } else {
        answer = "I'm sorry, I couldn't generate a response. Please try again.";
      }
    } else if (question.toLowerCase().includes("twitch user data")) {
      if (!code) {
        redirectToTwitch(res);
        return;
      } else {
        const accessToken = await getAccessToken(code);
        const userData = await getTwitchUserData(accessToken);
        answer = `Twitch User Data: ${JSON.stringify(userData)}`;
      }
    } else if (question.toLowerCase().includes("genre")) {
      const gameTitle = extractGameTitle(question); 
      const genre = getGenreFromMapping(gameTitle);
      if (genre) {
        answer = `${gameTitle} is categorized as ${genre}.`;
      } else {
        answer = `I couldn't find genre information for ${gameTitle}.`;
      }
    } else if (question.toLowerCase().includes("steam game details")) {
      const gameId = extractSteamGameId(question);
      if (gameId) {
        const steamData = await fetchSteamGameDetails(gameId);
        if (steamData) {
          console.log("Steam Game Schema:", steamData.gameSchema);
          console.log("Steam Achievements:", steamData.achievementStats);
          console.log("Steam Game News:", steamData.gameNews);
          answer = `Steam Game Details:\n\nSchema: ${JSON.stringify(steamData.gameSchema)}\n\nAchievements: ${JSON.stringify(steamData.achievementStats)}\n\nNews: ${JSON.stringify(steamData.gameNews)}`;
        } else {
          answer = "Failed to fetch Steam game details. Please try again later.";
        }
      } else {
        answer = "I couldn't identify the game ID for the Steam request.";
      }
    } else {
      answer = await getChatCompletion(question);

      if (answer) {
        answer = await checkAndUpdateGameInfo(question, answer);
      } else {
        answer = "I'm sorry, I couldn't generate a response. Please try again.";
      }
    }

    const newQuestion = new Question({
      userId,
      question,
      response: answer,
    });
    await newQuestion.save();
    console.log("Saving question to MongoDB:", { userId, question, response: answer });

    res.status(200).json({ answer });
  } catch (error: any) {
    console.error("Error in API route:", error.message);
    res.status(500).json({ error: error.message });
  }
};