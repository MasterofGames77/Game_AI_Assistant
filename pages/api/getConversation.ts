import type { NextApiRequest, NextApiResponse } from 'next';
import connectToMongoDB from '../../utils/mongodb';
import Question from '../../models/Question';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId } = req.query;

  try {
    await connectToMongoDB();
    const conversations = await Question.find({ userId }).sort({ timestamp: -1 });
    res.status(200).json(conversations);
  } catch (error: any) {
    console.error("Error fetching conversations:", error.message);
    res.status(500).json({ error: error.message });
  }
}