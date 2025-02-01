// import { WikiScraper } from './wikiScraper';
// import { fetchFromIGDB } from './aiHelper';

// export async function getGameData(gameTitle: string, wikiUrl?: string) {
//   try {
//     // First try IGDB for official data
//     const igdbData = await fetchFromIGDB(gameTitle);
    
//     // If wiki URL is provided, get additional detailed data
//     let wikiData = null;
//     if (wikiUrl) {
//       const scraper = new WikiScraper(wikiUrl);
//       wikiData = await scraper.scrapeGameInfo(wikiUrl);
//     }

//     // Combine the data sources
//     return {
//       official: igdbData,
//       wiki: wikiData,
//       lastUpdated: new Date().toISOString()
//     };

//   } catch (error) {
//     console.error('Error fetching game data:', error);
//     return null;
//   }
// } 