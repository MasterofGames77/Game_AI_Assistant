// DEPRECATED: This endpoint has been consolidated into /api/updateAchievements?email=user@example.com
// Please use the new endpoint instead.

/*
import type { NextApiRequest, NextApiResponse } from 'next';
import { createUpdateUserEndpoint } from '../../utils/updateAchievements';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Accept both GET and POST requests
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  return createUpdateUserEndpoint(req, res);
} 
*/

// Redirect to new endpoint
import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const email = req.query.email;
  if (!email) {
    return res.status(400).json({ message: 'Email parameter is required' });
  }
  res.redirect(307, `/api/updateAchievements?email=${email}`);
} 