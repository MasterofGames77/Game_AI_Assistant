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
// import formidable, { IncomingForm } from 'formidable';
// import fs from 'fs';

console.log("Environment Variables:");
console.log("OPENAI_API_KEY:", process.env.OPENAI_API_KEY ? "SET" : "NOT SET");
console.log("NEXT_PUBLIC_TWITCH_CLIENT_ID:", process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID ? "SET" : "NOT SET");
console.log("TWITCH_CLIENT_SECRET:", process.env.TWITCH_CLIENT_SECRET ? "SET" : "NOT SET");
console.log("TWITCH_TOKEN_URL:", process.env.TWITCH_TOKEN_URL ? "SET" : "NOT SET");
console.log("RAWG_API_KEY:", process.env.RAWG_API_KEY ? "SET" : "NOT SET");
console.log("MONGODB_URI:", process.env.MONGODB_URI ? "SET" : "NOT SET");
console.log("TWITCH_REDIRECT_URI:", process.env.TWITCH_REDIRECT_URI);

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
  // Use getClientCredentialsAccessToken instead of getAccessToken
  const accessToken = await getClientCredentialsAccessToken(); // No code needed here
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

// Fetch game data from RAWG API
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

const fetchDataFromBothAPIs = async (gameName: string): Promise<string> => {
  try {
    const rawgPromise = fetchGamesFromRAWG(gameName);
    const igdbPromise = fetchGamesFromIGDB(gameName);
    const [rawgResponse, igdbResponse] = await Promise.all([rawgPromise, igdbPromise]);

    let finalResponse = "";

    const isMainResponseShort = rawgResponse.length < 150 && (igdbResponse ? igdbResponse.length < 150 : true);

    if (isMainResponseShort) {
      finalResponse = "Combined Game Information:\n";
      if (!rawgResponse.includes("No games found")) {
        finalResponse += `\nFrom RAWG: ${rawgResponse}`;
      }
      if (igdbResponse && !igdbResponse.includes("No games found")) {
        finalResponse += `\nFrom IGDB: ${igdbResponse}`;
      }
    } else {
      // Skip adding irrelevant or extraneous combined data
      finalResponse = "Detailed game information is already provided in the main response.";
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

    if (gameInfo) {
      return `${formatGameInfo(gameInfo)}\n\nAdditional Information:\n${combinedResponse}`;
    } else {
      return `${answer}\n\nAdditional Information:\n${combinedResponse}`;
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
  "Shellshock Live": "Artillery",
  "Roller Coaster Tycoon 3": "Construction and Management Simulation"
};

const getGenreFromMapping = (gameTitle: string): string | null => {
  return genreMapping[gameTitle] || null;
};

const extractGameTitle = (question: string): string => {
  const match = question.match(/(?:guide|walkthrough|progress|unlock|strategy|find).*?\s(.*?)(?:\s(?:chapter|level|stage|part|area|boss|item|character|section))/i);
  return match ? match[1].trim() : '';
};

// Define the analyzeImage function
// async function analyzeImage(filePath: string): Promise<string> {
//   try {
//     // Step 1: Read image from file system
//     const imageFile = fs.readFileSync(filePath);

//     // Step 2: Send image to OpenAI or another image analysis API
//     const response = await openai.createImageAnalysis({ image: imageFile }); // Hypothetical API call for image analysis
//     console.log("Image Analysis Response:", response.data.result);

//     // Step 3: Extract insights from response
//     return response.data.result || "No insights available from the image.";
//   } catch (error) {
//     console.error("Error analyzing image:", error);
//     return "Image analysis failed. Please try again.";
//   }
// }

// Updated assistantHandler to process both text and images
const assistantHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  // Initialize formidable for parsing files (commented out for now)
  // const form = new IncomingForm();
  // form.uploadDir = './uploads';
  // form.keepExtensions = true;

  const { userId, question, code } = req.body;

  try {
    console.log("Received question:", question);
    await connectToMongoDB();

    let answer: string | null;
    let imageAnalysisResult = '';

    // Commented code to handle file parsing and analysis
    /*
    await new Promise<void>((resolve, reject) => {
      form.parse(req, async (err, fields, files) => {
        if (err) return reject(err);

        const uploadedFile = files.image;
        if (uploadedFile) {
          const filePath = Array.isArray(uploadedFile) ? uploadedFile[0].filepath : uploadedFile.filepath;
          imageAnalysisResult = await analyzeImage(filePath);
        }
        resolve();
      });
    });
    */

    // Primary question processing
    if (question.toLowerCase().includes("recommendations")) {
      const previousQuestions = await Question.find({ userId });
      const genres = analyzeUserQuestions(previousQuestions);

      if (genres.length > 0) {
        const recommendations = await fetchRecommendations(genres[0]);
        answer = recommendations.length > 0
          ? `Based on your previous questions, I recommend these games: ${recommendations.join(', ')}.`
          : "I couldn't find any recommendations based on your preferences.";
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
      try {
        if (!code) {
          redirectToTwitch(res);
          return;
        } else {
          const codeString = Array.isArray(code) ? code[0] : (code as string);
          const accessToken = await getAccessToken(codeString);
          const userData = await getTwitchUserData(accessToken);
          answer = `Twitch User Data: ${JSON.stringify(userData)}`;
        }
      } catch (error) {
        console.error("Error retrieving Twitch user data:", error);
        answer = 'There was an issue retrieving your Twitch data. Please try again later.';
      }
    } else if (question.toLowerCase().includes("genre")) {
      const gameTitle = extractGameTitle(question);
      const genre = getGenreFromMapping(gameTitle);
      answer = genre
        ? `${gameTitle} is categorized as ${genre}.`
        : `I couldn't find genre information for ${gameTitle}.`;
    } else {
      answer = await getChatCompletion(question);
      if (answer) {
        answer = await checkAndUpdateGameInfo(question, answer);
      } else {
        answer = "I'm sorry, I couldn't generate a response. Please try again.";
      }
    }

    // Append image analysis result if present
    if (imageAnalysisResult) {
      answer = `${answer}\n\nImage Analysis: ${imageAnalysisResult}`;
    }

    // Save to MongoDB
    const newQuestion = new Question({
      userId,
      question,
      response: answer,
    });
    await newQuestion.save();
    console.log("Saving question to MongoDB:", { userId, question, response: answer });

    const user = await User.findOne({ userId });
    if (user) {
      user.conversationCount += 1;
      await user.save();
      console.log("Updated user conversation count:", user.conversationCount);
    } else {
      const newUser = new User({ userId, conversationCount: 1 });
      await newUser.save();
      console.log("New user created with conversation count:", newUser.conversationCount);
    }

    res.status(200).json({ answer });
  } catch (error) {
    console.error("Error in API route:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export default assistantHandler;