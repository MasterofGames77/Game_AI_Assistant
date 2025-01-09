import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const applicationId = process.env.DISCORD_APPLICATION_ID;

  if (!applicationId) {
    return res.status(500).json({ error: 'Discord application ID not configured' });
  }

  res.status(200).json({ applicationId });
} 