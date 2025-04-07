import { NextApiRequest, NextApiResponse } from 'next';
import connectToMongoDB from '../../utils/mongodb';
import Forum from '../../models/Forum';
import { Topic } from '../../types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { forumId, topicId, userId } = req.query;

  if (!forumId) {
    return res.status(400).json({ error: 'Forum ID is required' });
  }

  try {
    await connectToMongoDB();
    
    const forum = await Forum.findOne({ forumId });
    if (!forum) {
      return res.status(404).json({ error: 'Forum not found' });
    }

    // If topicId is provided, return specific topic
    if (topicId) {
      const topic = forum.topics.find((t: Topic) => t.topicId === topicId);
      if (!topic) {
        return res.status(404).json({ error: 'Topic not found' });
      }
      
      // Check private access and topic status
      if (topic.isPrivate && !topic.allowedUsers.includes(userId as string)) {
        return res.status(403).json({ error: 'Access denied to private topic' });
      }
      
      if (topic.metadata.status !== 'active') {
        return res.status(403).json({ error: 'Topic is not active' });
      }
      
      // Increment view count
      topic.metadata.viewCount += 1;
      await forum.save();
      
      return res.status(200).json(topic);
    }

    // Filter topics based on access and status
    const accessibleTopics = forum.topics.filter((topic: Topic) => 
      (!topic.isPrivate || topic.allowedUsers.includes(userId as string)) &&
      topic.metadata.status === 'active'
    );

    return res.status(200).json(accessibleTopics);
  } catch (error) {
    console.error('Error fetching forum topics:', error);
    return res.status(500).json({ error: 'Error fetching forum topics' });
  }
}