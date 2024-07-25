import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import connectToMongoDB from '../../utils/mongodb';
import Question from '../../models/Question';
import { getChatCompletion, fetchRecommendations, analyzeUserQuestions } from '../../utils/aiHelper';
import { getAccessToken, getTwitchUserData, redirectToTwitch } from './twitchAuth';
import OpenAI from 'openai';
import path from 'path';
import { readCSVFile } from '@/utils/csvHelper';

console.log("Environment Variables:");
console.log("OPENAI_API_KEY:", process.env.OPENAI_API_KEY ? "SET" : "NOT SET");
console.log("TWITCH_CLIENT_ID:", process.env.TWITCH_CLIENT_ID ? "SET" : "NOT SET");
console.log("TWITCH_CLIENT_SECRET:", process.env.TWITCH_CLIENT_SECRET ? "SET" : "NOT SET");
console.log("TWITCH_TOKEN_URL:", process.env.TWITCH_TOKEN_URL ? "SET" : "NOT SET");
console.log("RAWG_API_KEY:", process.env.RAWG_API_KEY ? "SET" : "NOT SET");
console.log("MONGODB_URI:", process.env.MONGODB_URI ? "SET" : "NOT SET");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const filterAndFormatGameData = (games: any[], query: string) => {
  return games
    .filter((game: any) => game.name.toLowerCase().includes(query.toLowerCase()))
    .map((game: any) => ({
      name: game.name,
      released: game.released ? new Date(game.released).toLocaleDateString() : 'N/A',
      genres: game.genres?.map((genre: any) => genre.name).join(', ') || 'Genres not available',
      platforms: game.platforms?.map((platform: any) => platform.platform?.name).join(', ') || 'Platforms not available',
      url: game.url || 'URL not available',
    }));
};

interface IGDBGame {
  name: string;
  release_dates?: { date: string }[];
  genres?: { name: string }[];
  platforms?: { name: string }[];
  url?: string; // This property might not exist, so we mark it as optional
}

const fetchGamesFromIGDB = async (query: string): Promise<string | null> => {
  const accessToken = await getAccessToken(); // No argument needed here
  const headers = {
    'Client-ID': process.env.TWITCH_CLIENT_ID,
    'Authorization': `Bearer ${accessToken}`
  };
  const body = `fields name,genres.name,platforms.name,release_dates.date,url; search "${query}"; limit 10;`;

  try {
    const response = await axios.post('https://api.igdb.com/v4/games', body, { headers });
    if (response.data.length > 0) {
      const games = response.data.map((game: IGDBGame) => ({
        name: game.name,
        releaseDate: game.release_dates?.[0]?.date,
        genres: game.genres?.map((genre) => genre.name).join(', '),
        platforms: game.platforms?.map((platform) => platform.name).join(', '),
        url: game.url || 'URL not available'
      }));
      return games.map((game: { name: string; releaseDate: string | number | Date; genres: string; platforms: string; url: string }) => `${game.name} (Released: ${game.releaseDate ? new Date(game.releaseDate).toLocaleDateString() : 'N/A'}, Genres: ${game.genres}, Platforms: ${game.platforms}, URL: ${game.url})`).join('\n');
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

const CSV_FILE_PATH = path.join(process.cwd(), 'data/Video Games Data.csv');

const getCSVData = async () => {
  try {
    const data = await readCSVFile(CSV_FILE_PATH);
    return data;
  } catch (error) {
    console.error("Error reading CSV file:", error);
    throw new Error('Failed to read CSV file');
  }
};

const checkAndUpdateGameInfo = async (question: string, answer: string): Promise<string> => {
  if (question.toLowerCase().includes("xenoblade chronicles 3")) {
    const combinedResponse = await fetchDataFromBothAPIs("Xenoblade Chronicles 3");

    if (!combinedResponse.includes("No relevant game information found")) {
      return `Xenoblade Chronicles 3 was released on Nintendo Switch on July 29, 2022. It is an Action Role-Playing game developed by Monolith Soft and Published by Nintendo. It is an installment in the open-world Xenoblade Chronicles series, itself a part of the larger Xeno franchise. The game depicts the futures of the worlds featured in Xenoblade Chronicles (2010) and Xenoblade Chronicles 2 (2017) and concludes the trilogy's narrative.\n\nAdditional Information:\n${combinedResponse}`;
    }
  }

  return answer;
};

const genreMapping: { [key: string]: string } = {
  "Xenoblade Chronicles": "Action RPG",
  "Devil May Cry 3": "Hack and Slash",
  "Fortnite": "Battle Royale",
  "The Legend of Zelda": "Adventure",
  "Super Mario 64": "Platformer",
  "Resident Evil 2": "Survival Horror",
  "Splatoon 2": "Third-Person Shooter",
  "Castlevania: Symphony of the Night": "Metroidvania",
  "Bioshock Infinite": "First-Person Shooter",
  "Minecraft": "Sandbox",
  "Hades": "Roguelike",
  "The Last of Us": "Action-Adventure",
  "Animal Crossing": "Social Simulation",
  "World of Warcraft": "Massively Multiplayer Online Role-Playing Game",
  "Dota 2": "Multiplayer Online Battle Arena",
  "Braid": "Puzzle-Platformer",
  "Super Smash Bros. Brawl": "Fighting Game",
  "Fire Emblem: Awakening": "Tactical Role-Playing Game",
  "Plants vs. Zombies": "Tower Defense",
  "Forza Horizon 5": "Racing",
  "Mario Kart 8": "Kart Racing",
  "Star Fox": "Rail Shooter",
  "Metal Gear Solid": "Stealth",
  "Gunstar Heroes": "Run and Gun",
  "Advance Wars": "Turn-Based Strategy",
  "Sid Meier's Civilization VI": "4X",
  "Fifa 18": "Sports",
  "Super Mario Party": "Party",
  "Guitar Hero": "Rhythm",
  "Five Night's at Freddy's": "Point and Click",
  "Phoenix Wright: Ace Attorney": "Visual Novel",
  "Command & Conquer": "Real Time Strategy",
  "Streets of Rage 2": "Beat 'em up",
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
  "Bejeweled": "Tile-Matching"
};

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
    } else if (question.toLowerCase().includes("xenoblade chronicles 3")) {
      // Check and update game info using CSV data
      const csvData = await getCSVData();
      const gameInfo = csvData.find(game => game.title.toLowerCase() === "xenoblade chronicles 3");
      if (gameInfo) {
        answer = `Title: ${gameInfo.title}, Platform: ${gameInfo.platform}, Release Year: ${gameInfo.release_year}, Genre: ${gameInfo.genre}, Publisher: ${gameInfo.publisher}`;
      } else {
        answer = await getChatCompletion(question);
        if (answer) {
          answer = await checkAndUpdateGameInfo(question, answer);
        } else {
          answer = "I'm sorry, I couldn't generate a response. Please try again.";
        }
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
}