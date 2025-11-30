// import type { NextApiRequest, NextApiResponse } from 'next';
// import connectToMongoDB from '../../../utils/mongodb';
// import { runCollector } from '../../../utils/brightData';
// import NintendoData from '../../../models/NintendoData';
// import { UpdateResult } from '../../../types';

/**
 * Background job endpoint to update Nintendo Store and News data
 * This should be called once per day via a cron service
 * 
 * For Heroku deployment (recommended):
 * - Use an external cron service like EasyCron, Cron-job.org, etc.
 * - URL: https://your-app-name.herokuapp.com/api/cron/update-nintendo-data
 * - Schedule: Daily at a specific time (e.g., 2 AM UTC)
 * - Method: GET or POST
 * 
 * For Vercel deployment:
 * - Add to vercel.json cron configuration
 * 
 * For Heroku Scheduler:
 * - Install Heroku Scheduler add-on
 * - Run: curl https://your-app-name.herokuapp.com/api/cron/update-nintendo-data
 * 
 * Security: Consider adding authentication (API key, secret header, etc.)
 */

// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//   // Optional: Add authentication check
//   // const authHeader = req.headers.authorization;
//   // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
//   //   return res.status(401).json({ error: 'Unauthorized' });
//   // }

//   // Allow both GET and POST for flexibility with different cron services
//   if (req.method !== 'GET' && req.method !== 'POST') {
//     res.setHeader('Allow', ['GET', 'POST']);
//     return res.status(405).json({ error: 'Method Not Allowed' });
//   }

//   const results: UpdateResult[] = [];
//   const startTime = Date.now();

//   try {
//     // Connect to MongoDB
//     await connectToMongoDB();

//     // Update Nintendo Store data
//     try {
//       const storeStartTime = Date.now();
//       console.log('[Nintendo Data Update] Starting Nintendo Store collection...');
      
//       const storeData = await runCollector({
//         collectorKey: 'nintendoStoreUS',
//         input: {}, // Use default input from collector definition
//         cacheKey: 'nintendoStoreUS:default',
//         cacheTtlSeconds: 0, // Don't use cache for background job
//         timeoutMs: 20 * 60 * 1000, // 20 minute timeout for background job
//       });

//       const storeCollectionTime = Date.now() - storeStartTime;

//       // Store in MongoDB (upsert - update if exists, create if not)
//       await NintendoData.findOneAndUpdate(
//         { source: 'nintendoStoreUS' },
//         {
//           source: 'nintendoStoreUS',
//           data: storeData,
//           lastUpdated: new Date(),
//           collectionParams: {},
//           metadata: {
//             recordCount: storeData.length,
//             collectionTime: storeCollectionTime,
//           },
//         },
//         { upsert: true, new: true }
//       );

//       console.log(`[Nintendo Data Update] Nintendo Store updated: ${storeData.length} records in ${storeCollectionTime}ms`);
      
//       results.push({
//         source: 'nintendoStoreUS',
//         success: true,
//         recordCount: storeData.length,
//         collectionTime: storeCollectionTime,
//       });
//     } catch (error: any) {
//       console.error('[Nintendo Data Update] Nintendo Store error:', error);
//       results.push({
//         source: 'nintendoStoreUS',
//         success: false,
//         error: error instanceof Error ? error.message : 'Unknown error',
//       });
//     }

//     // Update Nintendo News data
//     try {
//       const newsStartTime = Date.now();
//       console.log('[Nintendo Data Update] Starting Nintendo News collection...');
      
//       const newsData = await runCollector({
//         collectorKey: 'nintendoNewsUS',
//         input: {}, // Use default input from collector definition
//         cacheKey: 'nintendoNewsUS:default',
//         cacheTtlSeconds: 0, // Don't use cache for background job
//         timeoutMs: 20 * 60 * 1000, // 20 minute timeout for background job
//       });

//       const newsCollectionTime = Date.now() - newsStartTime;

//       // Store in MongoDB (upsert - update if exists, create if not)
//       await NintendoData.findOneAndUpdate(
//         { source: 'nintendoNewsUS' },
//         {
//           source: 'nintendoNewsUS',
//           data: newsData,
//           lastUpdated: new Date(),
//           collectionParams: {},
//           metadata: {
//             recordCount: newsData.length,
//             collectionTime: newsCollectionTime,
//           },
//         },
//         { upsert: true, new: true }
//       );

//       console.log(`[Nintendo Data Update] Nintendo News updated: ${newsData.length} records in ${newsCollectionTime}ms`);
      
//       results.push({
//         source: 'nintendoNewsUS',
//         success: true,
//         recordCount: newsData.length,
//         collectionTime: newsCollectionTime,
//       });
//     } catch (error: any) {
//       console.error('[Nintendo Data Update] Nintendo News error:', error);
//       results.push({
//         source: 'nintendoNewsUS',
//         success: false,
//         error: error instanceof Error ? error.message : 'Unknown error',
//       });
//     }

//     const totalTime = Date.now() - startTime;
//     const allSuccess = results.every((r) => r.success);

//     return res.status(allSuccess ? 200 : 207).json({
//       success: allSuccess,
//       message: allSuccess
//         ? 'All Nintendo data updated successfully'
//         : 'Some updates failed',
//       results,
//       totalTime: `${Math.floor(totalTime / 1000)}s`,
//       timestamp: new Date().toISOString(),
//     });
//   } catch (error: any) {
//     console.error('[Nintendo Data Update] Fatal error:', error);
//     return res.status(500).json({
//       success: false,
//       error: 'Failed to update Nintendo data',
//       details: error instanceof Error ? error.message : 'Unknown error',
//       results,
//     });
//   }
// }

