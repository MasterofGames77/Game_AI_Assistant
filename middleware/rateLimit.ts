// import { NextApiRequest, NextApiResponse } from 'next';
// import rateLimit from 'express-rate-limit';

// // Create a more Next.js compatible rate limiter
// const createRateLimiter = () => {
//   const limiter = rateLimit({
//     windowMs: 15 * 60 * 1000, // 15 minutes
//     max: 100, // Limit each IP to 100 requests per windowMs
//     message: { error: 'Too many requests, please try again later' },
//     standardHeaders: true,
//     legacyHeaders: false,
//   });

//   return (req: NextApiRequest, res: NextApiResponse) =>
//     new Promise((resolve, reject) => {
//       limiter(req as any, res as any, (result: any) => {
//         if (result instanceof Error) {
//           return reject(result);
//         }
//         return resolve(result);
//       });
//     });
// };

// export const rateLimiter = createRateLimiter();

// Usage in API route:
// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//   try {
//     await rateLimiter(req, res);
//     // Your API logic here
//   } catch (error) {
//     return res.status(429).json({ error: 'Too many requests' });
//   }
// } 