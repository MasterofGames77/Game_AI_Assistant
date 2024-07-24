import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import connectToMongoDB from '../../utils/mongodb';
import Question from '../../models/Question';
//import User from '../../models/User';
import { getChatCompletion, fetchRecommendations, analyzeUserQuestions } from '../../utils/aiHelper';
import OpenAI from 'openai';
//import { getSteamNews, getSteamUserStats, getOwnedGames } from '../../lib/steamAPI';

console.log("Environment Variables:");
console.log("OPENAI_API_KEY:", process.env.OPENAI_API_KEY ? "SET" : "NOT SET");
console.log("TWITCH_CLIENT_ID:", process.env.TWITCH_CLIENT_ID ? "SET" : "NOT SET");
console.log("TWITCH_CLIENT_SECRET:", process.env.TWITCH_CLIENT_SECRET ? "SET" : "NOT SET");
console.log("TWITCH_TOKEN_URL:", process.env.TWITCH_TOKEN_URL ? "SET" : "NOT SET");
console.log("RAWG_API_KEY:", process.env.RAWG_API_KEY ? "SET" : "NOT SET");
console.log("STEAM_API_KEY", process.env.STEAM_API_KEY ? "SET" :"NOT SET");
console.log("MONGODB_URI:", process.env.MONGODB_URI ? "SET" : "NOT SET");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const getAccessToken = async (): Promise<string> => {
  const tokenUrl = process.env.TWITCH_TOKEN_URL;
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;

  if (!tokenUrl || !clientId || !clientSecret) {
    throw new Error('Missing environment variables');
  }

  try {
    const response = await axios.post(tokenUrl, {
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
    });
    console.log("Access Token Response:", response.data);
    return response.data.access_token;
  } catch (error: any) {
    console.error("Error fetching access token:", error.message);
    throw new Error('Failed to fetch access token');
  }
};

const fetchGamesFromIGDB = async (query: string): Promise<string | null> => {
  const accessToken = await getAccessToken();
  const headers = {
    'Client-ID': process.env.TWITCH_CLIENT_ID,
    'Authorization': `Bearer ${accessToken}`
  };
  const body = `fields name,genres.name,platforms.name,release_dates.date; search "${query}"; limit 10;`;

  try {
    const response = await axios.post('https://api.igdb.com/v4/games', body, { headers });
    if (response.data.length > 0) {
      const games = response.data.map((game: any) => game.name);
      return `Games related to your query: ${games.join(', ')}`;
    } else {
      return null;
    }
  } catch (error: any) {
    console.error("Error fetching data from IGDB:", error.message);
    return null;
  }
};

const fetchGamesFromRAWG = async (searchQuery: string): Promise<string> => {
  const url = `https://api.rawg.io/api/games?key=${process.env.RAWG_API_KEY}&search=${encodeURIComponent(searchQuery)}`;

  try {
    const response = await axios.get(url);
    if (response.data && response.data.results.length > 0) {
      const games = response.data.results.map((game: any) => game.name);
      return `Games related to ${searchQuery}: ${games.join(', ')}`;
    } else {
      return `No games found related to ${searchQuery}.`;
    }
  } catch (error: any) {
    console.error("Error fetching data from RAWG:", error.message);
    return "Failed to fetch data from RAWG.";
  }
};

async function fetchDataFromBothAPIs(gameName: string): Promise<string> {
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
}

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
  const { userId, question } = req.body;

  try {
    console.log("Received question:", question);

    await connectToMongoDB();

    const previousQuestions = await Question.find({ userId });

    let answer;

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
    } else {
      answer = await getChatCompletion(question);

      const newQuestion = new Question({
        userId,
        question,
        response: answer,
      });
      await newQuestion.save();
      console.log("Saving question to MongoDB:", { userId, question, response: answer });
    }

    res.status(200).json({ answer });
  } catch (error: any) {
    console.error("Error in API route:", error.message);
    res.status(500).json({ error: error.message });
  }
}