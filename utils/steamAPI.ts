// import axios from 'axios';

// export const fetchSteamGameDetails = async (gameId: string): Promise<any> => {
//   const apiKey = process.env.STEAM_API_KEY;

//   if (!apiKey) {
//     console.error("STEAM_API_KEY environment variable is missing.");
//     return null;
//   }

//   try {
//     const [gameSchema, achievementStats, gameNews] = await Promise.all([
//       axios.get(`http://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?key=${apiKey}&appid=${gameId}`),
//       axios.get(`http://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v0002/?gameid=${gameId}&key=${apiKey}`),
//       axios.get(`http://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${gameId}&count=5&maxlength=300`)
//     ]);

//     return {
//       gameSchema: gameSchema.data,
//       achievementStats: achievementStats.data.achievementpercentages.achievements,
//       gameNews: gameNews.data.appnews.newsitems
//     };
//   } catch (error: any) {
//     console.error("Error fetching data from Steam API:", error.message);
//     return null;
//   }
// };