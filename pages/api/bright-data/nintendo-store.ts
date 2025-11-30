// import type { NextApiRequest, NextApiResponse } from 'next';
// import connectToMongoDB from '../../../utils/mongodb';
// import NintendoData, { type INintendoData } from '../../../models/NintendoData';
// import { runCollector } from '../../../utils/brightData';
// import type { Document } from 'mongoose';

/**
 * Nintendo Store API endpoint
 * Reads from MongoDB (updated daily by background job)
 * Falls back to Bright Data if data is not available in MongoDB
 */

// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//   if (req.method !== 'GET') {
//     res.setHeader('Allow', ['GET']);
//     return res.status(405).json({ error: 'Method Not Allowed' });
//   }

//   try {
//     // Connect to MongoDB
//     await connectToMongoDB();

//     // Try to get data from MongoDB first
//     const storedData = await NintendoData.findOne({ source: 'nintendoStoreUS' })
//       .sort({ lastUpdated: -1 }) // Get most recent
//       .lean() as (Omit<INintendoData, keyof Document> & { _id: unknown }) | null; // Use lean() for better performance

//     if (storedData && storedData.data && Array.isArray(storedData.data)) {
//       // Check if data is recent (less than 25 hours old to account for daily updates)
//       const dataAge = Date.now() - new Date(storedData.lastUpdated).getTime();
//       const maxAge = 25 * 60 * 60 * 1000; // 25 hours

//       if (dataAge < maxAge) {
//         console.log(`[Nintendo Store] Returning cached data from MongoDB (${storedData.data.length} records, ${Math.floor(dataAge / (60 * 60 * 1000))}h old)`);
//         return res.status(200).json({
//           source: 'nintendoStoreUS',
//           count: storedData.data.length,
//           data: storedData.data,
//           cached: true,
//           lastUpdated: storedData.lastUpdated,
//         });
//       } else {
//         console.log(`[Nintendo Store] MongoDB data is too old (${Math.floor(dataAge / (60 * 60 * 1000))}h), falling back to Bright Data`);
//       }
//     } else {
//       console.log('[Nintendo Store] No data in MongoDB, falling back to Bright Data');
//     }

//     // Fallback: Fetch from Bright Data if MongoDB doesn't have recent data
//     // This ensures the API still works even if the background job hasn't run yet
//     console.log('[Nintendo Store] Fetching from Bright Data (fallback)...');
//     const data = await runCollector({
//       collectorKey: 'nintendoStoreUS',
//       input: {}, // Use default input
//       cacheKey: 'nintendoStoreUS:fallback',
//       cacheTtlSeconds: 60 * 5, // 5 minutes cache for fallback
//       timeoutMs: 20 * 60 * 1000, // 20 minute timeout
//     });

//     return res.status(200).json({
//       source: 'nintendoStoreUS',
//       count: data.length,
//       data,
//       cached: false,
//       fallback: true,
//       message: 'Data fetched directly from Bright Data (MongoDB data not available)',
//     });
//   } catch (error: any) {
//     console.error('[Nintendo Store Collector] Error:', error);
//     return res.status(500).json({
//       error: 'Failed to fetch Nintendo Store data',
//       details: error instanceof Error ? error.message : 'Unknown error',
//     });
//   }
// }

