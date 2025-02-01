// import type { NextApiRequest, NextApiResponse } from 'next';
// import { getGameData } from '../../utils/gameDataFetcher';

// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//   const { gameTitle, wikiUrl } = req.query;

//   if (!gameTitle) {
//     return res.status(400).json({ error: 'Game title is required' });
//   }

//   try {
//     const gameData = await getGameData(gameTitle as string, wikiUrl as string);
//     if (!gameData) {
//       return res.status(404).json({ error: 'Game data not found' });
//     }

//     res.status(200).json(gameData);
//   } catch (error) {
//     console.error('Error in game details API:', error);
//     res.status(500).json({ error: 'Failed to fetch game details' });
//   }
// } 