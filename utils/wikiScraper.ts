// import axios from 'axios';
// import * as cheerio from 'cheerio';
// import fs from 'fs/promises';
// import path from 'path';

// interface GameData {
//   title: string;
//   releaseDate: string;
//   developer: string;
//   publisher: string;
//   platforms: string[];
//   characters: string[];
//   plotSummary: string;
//   lastUpdated: string;
//   relatedPages?: {
//     characters?: { name: string; description: string }[];
//     locations?: string[];
//     items?: string[];
//     bosses?: string[];
//     enemies?: string[];
//     credits?: string[];
//     quests?: string[];
//     scenarios?: string[];
//   };
// }

// class WikiScraper {
//   private baseUrl: string;
//   private delay: number;

//   constructor(baseUrl: string, delay: number = 3000) {
//     this.baseUrl = baseUrl;
//     this.delay = delay;
//   }

//   private async sleep(ms: number): Promise<void> {
//     return new Promise(resolve => setTimeout(resolve, ms));
//   }

//   private async getPage(url: string): Promise<cheerio.CheerioAPI | null> {
//     try {
//       await this.sleep(this.delay); // Polite delay between requests
//       const response = await axios.get(url, {
//         headers: {
//           'User-Agent': 'VideoGameWingman/1.0 (Educational/Research; contact@videogamewingman.com)'
//         }
//       });

//       if (response.status === 200) {
//         return cheerio.load(response.data);
//       }
//       return null;
//     } catch (error) {
//       console.error(`Error fetching ${url}:`, error);
//       return null;
//     }
//   }

//   private async getInternalLinks($: cheerio.CheerioAPI, selector: string): Promise<string[]> {
//     const links: string[] = [];
//     $(selector).each((_, element) => {
//       const href = $(element).attr('href');
//       if (href && !href.startsWith('#') && !href.includes('://')) {
//         links.push(new URL(href, this.baseUrl).toString());
//       }
//     });
//     return links;
//   }

//   async scrapeGameInfo(gameUrl: string): Promise<GameData | null> {
//     const $ = await this.getPage(gameUrl);
//     if (!$) return null;

//     const gameData: GameData = {
//       title: '',
//       releaseDate: '',
//       developer: '',
//       publisher: '',
//       platforms: [],
//       characters: [],
//       plotSummary: '',
//       lastUpdated: new Date().toISOString(),
//       relatedPages: {
//         characters: [],
//         locations: [],
//         items: [],
//         bosses: [],
//         quests: [],
//         scenarios: []
//       }
//     };


//     try {
//       // Example selectors (adjust based on wiki structure)
//       gameData.title = $('.page-header__title').text().trim();

//       // Find info box
//       const infoBox = $('.portable-infobox');
//       infoBox.find('.pi-data-label').each((_, element) => {
//         const label = $(element).text().trim().toLowerCase();
//         const value = $(element).next('.pi-data-value').text().trim();

//         switch (label) {
//           case 'release date':
//             gameData.releaseDate = value;
//             break;
//           case 'developer':
//             gameData.developer = value;
//             break;
//           case 'publisher':
//             gameData.publisher = value;
//             break;
//           case 'platform':
//           case 'platforms':
//             gameData.platforms = value.split(',').map(p => p.trim());
//             break;
//         }
//       });

//       // Get plot summary
//       const plotSection = $('#Plot').parent();
//       if (plotSection.length) {
//         gameData.plotSummary = plotSection.next('p').text().trim();
//       }

//       // Find and scrape character links
//       const characterLinks = await this.getInternalLinks($, 'a[href*="characters"], a[href*="Characters"]');
//       if (characterLinks.length > 0) {
//         for (const link of characterLinks.slice(0, 5)) { // Limit to 5 characters for politeness
//           await this.sleep(this.delay); // Respect rate limiting
//           const characterPage = await this.getPage(link);
//           if (characterPage) {
//             const name = characterPage('.page-header__title').text().trim();
//             const description = characterPage('p').first().text().trim();
//             gameData.relatedPages?.characters?.push({ name, description });
//           }
//         }
//       }

//       // Get main characters from the game page itself
//       const characterSection = $('#Characters, #Main_Characters').parent();
//       if (characterSection.length) {
//         const characterList = characterSection.next('ul').find('li');
//         characterList.each((_, element) => {
//           const name = $(element).text().trim();
//           if (name) {
//             gameData.characters.push(name);
//           }
//         });
//       }

//       return gameData;
//     } catch (error) {
//       console.error('Error parsing game data:', error);
//       return null;
//     }
//   }

//   async saveToJson(data: GameData[], filename: string): Promise<void> {
//     const filePath = path.join(process.cwd(), 'data', filename);
//     await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
//   }

//   // Add new method to handle different wiki domains
//   async scrapeMultipleGames(gameUrls: { [key: string]: string[] }): Promise<{ [key: string]: GameData[] }> {
//     const allData: { [key: string]: GameData[] } = {};

//     for (const [wikiName, urls] of Object.entries(gameUrls)) {
//       allData[wikiName] = [];
      
//       for (const url of urls) {
//         const gameData = await this.scrapeGameInfo(url);
//         if (gameData) {
//           allData[wikiName].push(gameData);
//         }
//       }
//     }

//     return allData;
//   }
// }

// // Example usage (moved from main function to a proper utility function)
// export async function scrapeGameWikis(): Promise<{ [key: string]: GameData[] }> {
//   const gameWikis = {
//     xenoblade: [
//       "https://xenoblade.fandom.com/wiki/Xenoblade_Chronicles",
//       "https://xenoblade.fandom.com/wiki/Xenoblade_Chronicles:_Future_Connected",
//       "https://xenoblade.fandom.com/wiki/Xenoblade_Chronicles_2",
//       "https://xenoblade.fandom.com/wiki/Xenoblade_Chronicles_2:_Torna_~_The_Golden_Country",
//       "https://xenoblade.fandom.com/wiki/Xenoblade_Chronicles_3",
//       "https://xenoblade.fandom.com/wiki/Xenoblade_Chronicles_3:_Future_Redeemed",
//       "https://xenoblade.fandom.com/wiki/Xenoblade_Chronicles_X"
//     ],
//     finalFantasy: [
//       "https://finalfantasy.fandom.com/wiki/Final_Fantasy_VII",
//       "https://finalfantasy.fandom.com/wiki/Final_Fantasy_XVI",
//       "https://finalfantasy.fandom.com/wiki/Final_Fantasy_IV",
//       "https://finalfantasy.fandom.com/wiki/Final_Fantasy_IX",
//       "https://finalfantasy.fandom.com/wiki/Final_Fantasy_X",
//       "https://finalfantasy.fandom.com/wiki/Final_Fantasy_VI",
//       "https://finalfantasy.fandom.com/wiki/Final_Fantasy_VIII",
//       "https://finalfantasy.fandom.com/wiki/Final_Fantasy_XIII",
//       "https://finalfantasy.fandom.com/wiki/Final_Fantasy_XIV",
//       "https://finalfantasy.fandom.com/wiki/Final_Fantasy_XV",
//       "https://finalfantasy.fandom.com/wiki/Final_Fantasy_III",
//       "https://finalfantasy.fandom.com/wiki/Final_Fantasy_II",
//       "https://finalfantasy.fandom.com/wiki/Final_Fantasy"
//     ],
//     zelda: [
//       "https://zelda.fandom.com/wiki/The_Legend_of_Zelda:_Tears_of_the_Kingdom",
//       "https://zelda.fandom.com/wiki/The_Legend_of_Zelda:_Breath_of_the_Wild",
//       "https://zelda.fandom.com/wiki/The_Legend_of_Zelda:_Skyward_Sword",
//       "https://zelda.fandom.com/wiki/The_Legend_of_Zelda:_Ocarina_of_Time",
//       "https://zelda.fandom.com/wiki/The_Legend_of_Zelda:_A_Link_to_the_Past",
//       "https://zelda.fandom.com/wiki/The_Legend_of_Zelda:_A_Link_Between_Worlds",
//       "https://zelda.fandom.com/wiki/The_Legend_of_Zelda:_Twilight_Princess",
//       "https://zelda.fandom.com/wiki/The_Legend_of_Zelda:_The_Wind_Waker",
//       "https://zelda.fandom.com/wiki/The_Legend_of_Zelda:_The_Minish_Cap",
//       "https://zelda.fandom.com/wiki/The_Legend_of_Zelda",
//       "https://zelda.fandom.com/wiki/Zelda_II:_The_Adventure_of_Link",
//       "https://zelda.fandom.com/wiki/The_Legend_of_Zelda:_Link%27s_Awakening",
//       "https://zelda.fandom.com/wiki/The_Legend_of_Zelda:_Majora%27s_Mask",
//       "https://zelda.fandom.com/wiki/The_Legend_of_Zelda:_Phantom_Hourglass",
//       "https://zelda.fandom.com/wiki/The_Legend_of_Zelda:_Spirit_Tracks",
//       "https://zelda.fandom.com/wiki/The_Legend_of_Zelda:_Oracle_of_Seasons",
//       "https://zelda.fandom.com/wiki/The_Legend_of_Zelda:_Oracle_of_Ages",
//       "https://zelda.fandom.com/wiki/The_Legend_of_Zelda:_Four_Swords",
//       "https://zelda.fandom.com/wiki/The_Legend_of_Zelda:_Four_Swords_Adventures",
//       "https://zelda.fandom.com/wiki/The_Legend_of_Zelda:_Tri_Force_Heroes",
//       "https://zelda.fandom.com/wiki/Hyrule_Warriors:_Definitive_Edition",
//       "https://zelda.fandom.com/wiki/Hyrule_Warriors:_Age_of_Calamity",
      
//     ],
//     supermario: [
//      "https://www.mariowiki.com/Super_Mario_Bros.",
//      "https://www.mariowiki.com/Super_Mario_Bros._2",
//      "https://www.mariowiki.com/Super_Mario_Bros._3",
//      "https://www.mariowiki.com/Super_Mario_World",
//      "https://www.mariowiki.com/Super_Mario_64",
//      "https://www.mariowiki.com/Super_Mario_Sunshine",
//      "https://www.mariowiki.com/New_Super_Mario_Bros.",
//      "https://www.mariowiki.com/Super_Mario_Galaxy",
//      "https://www.mariowiki.com/New_Super_Mario_Bros._Wii",
//      "https://www.mariowiki.com/Super_Mario_Galaxy_2",
//      "https://www.mariowiki.com/Super_Mario_3D_Land",
//      "https://www.mariowiki.com/Super_Mario_3D_World",
//      "https://www.mariowiki.com/New_Super_Mario_Bros._U",
//      "https://www.mariowiki.com/Super_Mario_Odyssey",
//      "https://www.mariowiki.com/Super_Mario_Bros._Wonder"
//     ],
//     sonic: [
//         "https://sonic.fandom.com/wiki/Sonic_the_Hedgehog_(1991)",
//         "https://sonic.fandom.com/wiki/Sonic_the_Hedgehog_2",
//         "https://sonic.fandom.com/wiki/Sonic_the_Hedgehog_CD",
//         "https://sonic.fandom.com/wiki/Sonic_the_Hedgehog_3",
//         "https://sonic.fandom.com/wiki/Sonic_%26_Knuckles",
//         "https://sonic.fandom.com/wiki/Knuckles%27_Chaotix",
//         "https://sonic.fandom.com/wiki/Sonic_the_Fighters",
//         "https://sonic.fandom.com/wiki/Sonic_R",
//         "https://sonic.fandom.com/wiki/Sonic_Adventure",
//         "https://sonic.fandom.com/wiki/Sonic_Adventure_2",
//         "https://sonic.fandom.com/wiki/Sonic_Adventure_2:_Battle",
//         "https://sonic.fandom.com/wiki/Sonic_Advance",
//         "https://sonic.fandom.com/wiki/Sonic_Advance_2",
//         "https://sonic.fandom.com/wiki/Sonic_Advance_3",
//         "https://sonic.fandom.com/wiki/Sonic_Adventure_DX:_Director%27s_Cut",
//         "https://sonic.fandom.com/wiki/Sonic_Heroes",
//         "https://sonic.fandom.com/wiki/Sonic_Rush",
//         "https://sonic.fandom.com/wiki/Shadow_the_Hedgehog_(game)",
//         "https://sonic.fandom.com/wiki/Sonic_Riders",
//         "https://sonic.fandom.com/wiki/Sonic_the_Hedgehog_(2006)",
//         "https://sonic.fandom.com/wiki/Sonic_and_the_Secret_Rings",
//         "https://sonic.fandom.com/wiki/Sonic_Rush_Adventure",
//         "https://sonic.fandom.com/wiki/Sonic_Riders:_Zero_Gravity",
//         "https://sonic.fandom.com/wiki/Sonic_Unleashed",
//         "https://sonic.fandom.com/wiki/Sonic_and_the_Black_Knight",
//         "https://sonic.fandom.com/wiki/Sonic_%26_Sega_All-Stars_Racing",
//         "https://sonic.fandom.com/wiki/Sonic_Colors",
//         "https://sonic.fandom.com/wiki/Sonic_Generations",
//         "https://sonic.fandom.com/wiki/Sonic_%26_All-Stars_Racing_Transformed",
//         "https://sonic.fandom.com/wiki/Sonic_Lost_World",
//         "https://sonic.fandom.com/wiki/Sonic_Mania",
//         "https://sonic.fandom.com/wiki/Sonic_Forces",
//         "https://sonic.fandom.com/wiki/Team_Sonic_Racing",
//         "https://sonic.fandom.com/wiki/Sonic_Origins",
//         "https://sonic.fandom.com/wiki/Sonic_Frontiers",
//         "https://sonic.fandom.com/wiki/Sonic_Superstars",
//         "https://sonic.fandom.com/wiki/Sonic_Dream_Team",
//         "https://sonic.fandom.com/wiki/Sonic_X_Shadow_Generations"
//     ]
//     // Add more wikis and games as needed
//   };

//   const scraper = new WikiScraper("");  // Base URL not needed when using full URLs
//   return await scraper.scrapeMultipleGames(gameWikis);
// }

// export { WikiScraper };
// export type { GameData }; 