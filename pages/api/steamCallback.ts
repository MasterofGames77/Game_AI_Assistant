import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { openid_claimed_id, openid_identity } = req.query;

    if (!openid_claimed_id || !openid_identity) {
        console.error("Missing claimed_id or identity in the OpenID response.");
        return res.status(400).send('Invalid Steam login attempt');
    }

    // Extract the Steam ID from the OpenID claimed ID
    const steamIdMatch = (Array.isArray(openid_claimed_id) ? openid_claimed_id[0] : openid_claimed_id).match(/https:\/\/steamcommunity\.com\/openid\/id\/(\d+)/);
    if (!steamIdMatch) {
      return res.status(400).send('Invalid Steam ID');
    }

    const steamId = steamIdMatch[1];

    // Verify the OpenID response
    const verifyUrl = `https://steamcommunity.com/openid/login`;
    const params = {
      'openid.ns': 'http://specs.openid.net/auth/2.0',
      'openid.mode': 'check_authentication',
      'openid.return_to': 'http://localhost:3000/api/steamCallback',
      'openid.realm': 'http://localhost:3000',
      'openid.claimed_id': Array.isArray(openid_claimed_id) ? openid_claimed_id[0] : openid_claimed_id,
      'openid.identity': Array.isArray(openid_identity) ? openid_identity[0] : openid_identity,
      // Include all the other parameters that Steam sent back
      ...Object.fromEntries(
        Object.entries(req.query).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])
      ),
    };

    console.log("Verifying OpenID with params:", params); // Log the parameters being sent to Steam

    const verifyResponse = await axios.post(verifyUrl, new URLSearchParams(params).toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    const isValid = verifyResponse.data.includes('is_valid:true');

    if (!isValid) {
      return res.status(400).send('Steam login verification failed');
    }

    // At this point, Steam ID is verified. You can store or use the Steam ID.
    console.log(`Steam ID: ${steamId}`);

    // Redirect to your frontend after successful login
    res.redirect(`/some-dashboard-page?steamId=${steamId}`);

  } catch (error) {
    console.error('Error handling Steam callback:', error);
    res.status(500).send('Internal Server Error');
  }
}
