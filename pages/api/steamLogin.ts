import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    const steamRedirectUri = process.env.STEAM_REDIRECT_URI ?? '';
    const steamRealm = process.env.STEAM_REALM ?? '';

    // Check if the environment variables are defined
    if (!steamRedirectUri || !steamRealm) {
        throw new Error('Missing required environment variables: STEAM_REDIRECT_URI or STEAM_REALM');
    }

    const steamLoginUrl = `https://steamcommunity.com/openid/login?openid.ns=http://specs.openid.net/auth/2.0&openid.mode=checkid_setup&openid.return_to=${encodeURIComponent(steamRedirectUri)}&openid.realm=${encodeURIComponent(steamRealm)}&openid.identity=http://specs.openid.net/auth/2.0/identifier_select&openid.claimed_id=http://specs.openid.net/auth/2.0/identifier_select`;

    res.redirect(steamLoginUrl);
}