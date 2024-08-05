import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    const isProduction = process.env.NODE_ENV === 'production';
    const domain = isProduction ? 'https://game-ai-assistant.vercel.app/' : 'http://localhost:3000';

    const steamLoginUrl = `https://steamcommunity.com/openid/login?openid.ns=http://specs.openid.net/auth/2.0&openid.mode=checkid_setup&openid.return_to=${encodeURIComponent(domain + '/api/steamCallback')}&openid.realm=${encodeURIComponent(domain)}&openid.identity=http://specs.openid.net/auth/2.0/identifier_select&openid.claimed_id=http://specs.openid.net/auth/2.0/identifier_select`;

    res.redirect(steamLoginUrl);
}