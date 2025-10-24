import type { NextApiRequest, NextApiResponse } from 'next';
import { validateAdminAccess } from '../../../../utils/adminAccess';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username } = req.query;

    // Validate admin access
    const accessCheck = validateAdminAccess(username as string);
    
    if (accessCheck.hasAccess) {
      return res.status(200).json({
        success: true,
        isAdmin: true,
        message: 'Admin access confirmed'
      });
    } else {
      return res.status(200).json({
        success: true,
        isAdmin: false,
        message: 'Regular user access'
      });
    }

  } catch (error: any) {
    console.error('Error checking admin access:', error);
    return res.status(200).json({
      success: true,
      isAdmin: false,
      message: 'Regular user access'
    });
  }
}
