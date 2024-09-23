import { NextApiRequest, NextApiResponse } from 'next';
import connectToMongoDB from '../../utils/mongodb';
import Forum from '../../models/Forum';

export default async function addPostToForum(req: NextApiRequest, res: NextApiResponse) {
  const { forumId, topicId, message } = req.body;

  if (!forumId || !topicId || !message) {
    return res.status(400).json({ message: 'forumId, topicId, and message are required' });
  }

  try {
    await connectToMongoDB();
    const forumTopic = await Forum.findOne({ forumId, _id: topicId });

    if (!forumTopic) {
      return res.status(404).json({ message: 'Forum topic not found' });
    }

    forumTopic.posts.push({
      userId: req.body.userId || 'anonymous', // Example: Handle user IDs if available
      message,
    });

    await forumTopic.save();
    res.status(200).json({ message: 'Post added successfully' });
  } catch (error) {
    console.error('Error adding post:', error);
    res.status(500).json({ message: 'Failed to add post' });
  }
}