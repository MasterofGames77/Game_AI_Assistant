import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToWingmanDB } from '../../utils/databaseConnections';
import User from '../../models/User';
import mongoose from 'mongoose';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  const { username } = req.query;
  if (!username) {
    return res.status(400).json({ message: 'Username is required' });
  }
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectToWingmanDB();
    }
    const user = await User.findOne({ username });
    if (user) {
      return res.status(200).json({ user });
    } else {
      return res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    return res.status(500).json({ message: 'Error finding user' });
  }
}