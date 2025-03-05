import type { NextApiRequest, NextApiResponse } from 'next';
import { createUpdateUserEndpoint } from '../../utils/updateAchievements';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Accept both GET and POST requests
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  return createUpdateUserEndpoint(req, res);
} 