import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    redirect_uri: process.env.DISCORD_REDIRECT_URI
  });
} 