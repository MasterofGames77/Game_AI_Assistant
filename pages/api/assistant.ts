// assistant.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import axios from 'axios';

// Log environment variables (only for debugging purposes, remove in production)
console.log("Environment Variables:");
console.log("OPENAI_API_KEY:", process.env.OPENAI_API_KEY ? "SET" : "NOT SET");
console.log("TWITCH_CLIENT_ID:", process.env.TWITCH_CLIENT_ID ? "SET" : "NOT SET");
console.log("TWITCH_CLIENT_SECRET:", process.env.TWITCH_CLIENT_SECRET ? "SET" : "NOT SET");
console.log("TWITCH_TOKEN_URL:", process.env.TWITCH_TOKEN_URL ? "SET" : "NOT SET");
console.log("RAWG_API_KEY:", process.env.RAWG_API_KEY ? "SET" : "NOT SET");

// Initialize the OpenAI client with the provided API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Function to get an access token from the Twitch API
const getAccessToken = async (): Promise<string> => {
  const tokenUrl = process.env.TWITCH_TOKEN_URL;
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;

  // Check if necessary environment variables are set
  if (!tokenUrl || !clientId || !clientSecret) {
    throw new Error('Missing environment variables');
  }

  try {
    // Make a POST request to get the access token
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

// Function to get a chat completion from the OpenAI API
const getChatCompletion = async (question: string) => {
  try {
    // Make a request to the OpenAI API to generate a completion
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are an AI assistant specializing in video games. You can provide detailed analytics and insights into gameplay, helping players track their progress and identify areas for improvement.' },
        { role: 'user', content: question }
      ],
      max_tokens: 700,
    });
    console.log("OpenAI Response:", completion.choices[0].message.content);
    return completion.choices[0].message.content;
  } catch (error: any) {
    console.error("Error calling OpenAI API:", error.message);
    throw new Error('Failed to get completion from OpenAI');
  }
};

// Function to fetch games based on a search query from RAWG
const fetchGamesFromRAWG = async (searchQuery: string): Promise<string> => {
  const url = `https://api.rawg.io/api/games?key=${process.env.RAWG_API_KEY}&search=${encodeURIComponent(searchQuery)}`;

  try {
    // Make a GET request to fetch data from RAWG
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

// Function to fetch data from IGDB API
const fetchGamesFromIGDB = async (query: string): Promise<string> => {
  const accessToken = await getAccessToken();  // Ensure this handles token refresh correctly
  const headers = {
    'Client-ID': process.env.TWITCH_CLIENT_ID,
    'Authorization': `Bearer ${accessToken}`
  };
  const body = `fields name,genres.name,platforms.name,release_dates.date; search "${query}"; limit 10;`;

  try {
    // Make a POST request to fetch data from IGDB
    const response = await axios.post('https://api.igdb.com/v4/games', body, { headers });
    if (response.data.length > 0) {
      const games = response.data.map((game: any) => game.name);
      return `Games related to your query: ${games.join(', ')}`;
    } else {
      return `No games found related to ${query}.`;
    }
  } catch (error: any) {
    console.error("Error fetching data from IGDB:", error.message);
    return "Failed to fetch data from IGDB.";
  }
};

// Function to fetch data from both RAWG and IGDB
async function fetchDataFromBothAPIs(gameName: string): Promise<string> {
  try {
    // Start both fetch operations concurrently
    const rawgPromise = fetchGamesFromRAWG(gameName);
    const igdbPromise = fetchGamesFromIGDB(gameName);

    // Wait for both promises to resolve
    const [rawgResponse, igdbResponse] = await Promise.all([rawgPromise, igdbPromise]);

    // Analyze and combine the responses
    let finalResponse = "";
    if (rawgResponse.includes("No games found") && igdbResponse.includes("No games found")) {
      finalResponse = "No relevant game information found in any database.";
    } else {
      finalResponse = "Combined Game Information: \n";
      if (!rawgResponse.includes("No games found")) {
        finalResponse += `\nFrom RAWG: ${rawgResponse}`;
      }
      if (!igdbResponse.includes("No games found")) {
        finalResponse += `\nFrom IGDB: ${igdbResponse}`;
      }
    }

    return finalResponse;
  } catch (error: any) {
    console.error("Error fetching data from APIs:", error.message);
    return "Failed to fetch data due to an error.";
  }
}

// Unified handler function for the API route
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { question } = req.body;

  try {
    console.log("Received question:", question);
    let answer;
    if (question.toLowerCase().includes("similar to")) {
      const gameName = question.split("similar to ")[1]; // Simplified example
      answer = await fetchDataFromBothAPIs(gameName);
    } else {
      answer = await getChatCompletion(question);
    }
    res.status(200).json({ answer });
  } catch (error: any) {
    console.error("Error in API route:", error.message);
    res.status(500).json({ error: error.message });
  }
}