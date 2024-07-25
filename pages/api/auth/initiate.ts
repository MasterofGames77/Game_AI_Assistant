import type { NextApiRequest, NextApiResponse } from 'next';
import { redirectToTwitch } from '../twitchAuth';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  redirectToTwitch(res);
}