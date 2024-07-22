import type { NextApiRequest, NextApiResponse } from 'next';
import connectToMongoDB from '../../utils/mongodb';
import Question from '../../models/Question';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.body;

  try {
    await connectToMongoDB();
    await Question.deleteOne({ _id: id });
    res.status(200).json({ message: 'Interaction deleted successfully' });
  } catch (error: any) {
    console.error("Error deleting interaction:", error.message);
    res.status(500).json({ error: error.message });
  }
}