import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToWingmanDB } from '../../utils/databaseConnections';
import Question from '../../models/Question';
import { clearUserCache } from './getConversation';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id, username } = req.body;
  if (!id) {
    return res.status(400).json({ error: 'Missing id' });
  }

  try {
    await connectToWingmanDB();
    const result = await Question.deleteOne({ _id: id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Interaction not found' });
    }
    
    // Clear the cache for this user to ensure fresh data on next fetch
    if (username) {
      clearUserCache(username);
    }
    
    res.status(200).json({ message: 'Interaction deleted successfully' });
  } catch (error: any) {
    console.error("Error deleting interaction:", error.message);
    res.status(500).json({ error: error.message });
  }
}