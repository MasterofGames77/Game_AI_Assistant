import type { NextApiRequest, NextApiResponse } from 'next';
import connectToMongoDB from '../../utils/mongodb';
import Forum from '../../models/Forum';
import { Topic } from '../../types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await connectToMongoDB();
    const { forumId, topicId, userId } = req.query;

    if (!forumId || !topicId || !userId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const forum = await Forum.findOne({ forumId });
    if (!forum) {
      return res.status(404).json({ error: 'Forum not found' });
    }

    // Find the topic
    const topicIndex = forum.topics.findIndex((t: Topic) => t.topicId === topicId);
    if (topicIndex === -1) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    const topic = forum.topics[topicIndex];

    // Check if user has permission to delete (creator or moderator)
    // Assuming moderators are stored in forum.metadata.moderators
    const moderators = forum.metadata.moderators || []; 
    if (topic.createdBy !== userId && !moderators.includes(userId as string)) {
      return res.status(403).json({ error: 'Not authorized to delete this topic' });
    }

    // Remove the topic
    forum.topics.splice(topicIndex, 1);
    
    // Update forum metadata (optional, e.g., topic count)
    forum.metadata.totalTopics = forum.topics.length;
    forum.metadata.lastActivityAt = new Date(); // Or find the new latest activity

    // Save changes
    await forum.save();

    return res.status(200).json({ message: 'Topic deleted successfully' });
  } catch (error) {
    console.error('Error deleting topic:', error);
    return res.status(500).json({ error: 'Failed to delete topic' });
  }
} 