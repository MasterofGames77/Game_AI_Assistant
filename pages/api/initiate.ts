import type { NextApiRequest, NextApiResponse } from 'next';
import { redirectToTwitch } from '../../utils/twitchAuth';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("Redirecting to Twitch for OAuth"); // Log the redirection attempt
  redirectToTwitch(res);
}