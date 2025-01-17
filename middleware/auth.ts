// import { NextApiRequest, NextApiResponse } from 'next';
// import { verify } from 'jsonwebtoken';

// export interface AuthenticatedRequest extends NextApiRequest {
//   userId?: string;
//   userRole?: string;
// }

// export function authMiddleware(
//   handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>
// ) {
//   return async (req: AuthenticatedRequest, res: NextApiResponse) => {
//     try {
//       const token = req.headers.authorization?.replace('Bearer ', '');
      
//       if (!token) {
//         return res.status(401).json({ error: 'Authentication required' });
//       }

//       const decoded = verify(token, process.env.JWT_SECRET!);
//       req.userId = (decoded as any).userId;
//       req.userRole = (decoded as any).role;

//       return handler(req, res);
//     } catch (error) {
//       return res.status(401).json({ error: 'Invalid authentication' });
//     }
//   };
// } 