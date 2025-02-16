// import type { NextApiRequest, NextApiResponse } from 'next';
// import { WikiScraper } from '../../utils/wikiScraper';
// import { rateLimiter } from '../../middleware/rateLimit'; // Updated import path

// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//   try {
//     // Apply rate limiting
//     await rateLimiter(req, res);

//     // Test single game scraping only
//     const scraper = new WikiScraper("https://zelda.fandom.com"); // Add base URL
//     const singleGameData = await scraper.scrapeGameInfo(
//       "https://zelda.fandom.com/wiki/The_Legend_of_Zelda:_Breath_of_the_Wild"
//     );

//     // Return just the single game test results
//     res.status(200).json({
//       singleGameTest: singleGameData
//     });

//   } catch (error) {
//     console.error('Scraper test error:', error);
//     const status = error && typeof error === 'object' && 'status' in error ? (error.status as number) : 500;
//     res.status(status).json({ 
//       error: 'Scraper test failed', 
//       details: error instanceof Error ? error.message : String(error)
//     });
//   }
// } 