import axios from 'axios';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { getClientCredentialsAccessToken } from './twitchAuth';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Utility function to clean and match titles
function cleanAndMatchTitle(queryTitle: string, recordTitle: string): boolean {
  const cleanQuery = queryTitle.toLowerCase().trim();
  const cleanRecord = recordTitle.toLowerCase().trim();

  // Basic exact match
  if (cleanQuery === cleanRecord) return true;

  // Additional matching logic can be added here (e.g., removing subtitles, ignoring special characters, etc.)
  return false;
}

// Example IGDB Fetch Function with Improved Filtering
async function fetchFromIGDB(gameTitle: string): Promise<string | null> {
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
      const game = response.data[0];
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
export const getChatCompletion = async (question: string): Promise<string | null> => {
  try {
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
          { role: 'system', content: 'You are an AI assistant specializing in video games. You can provide detailed analytics and insights into gameplay, helping players track their progress and identify areas for improvement.' },
          { role: 'user', content: question }
        ],
        max_tokens: 800,
      });

      response = completion.choices[0].message.content;
    }

    return response;
  } catch (error: any) {
    console.error('Failed to get completion from OpenAI:', error.message);
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
    "Construction and management simulation": "Construction and Management Simulation"
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