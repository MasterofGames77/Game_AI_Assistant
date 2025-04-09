import { NextApiRequest, NextApiResponse } from 'next';
import connectToMongoDB from '../../utils/mongodb';
import Forum from '../../models/Forum';
import { Forum as ForumType, Topic } from '../../types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await connectToMongoDB();
    const { userId } = req.query;

    // Fetch all forums
    const forums = await Forum.find({});
    
    // Process forums to filter private topics and add metadata
    const accessibleForums = forums.map(forum => {
      const forumData = forum.toObject();
      
      // Filter topics based on access and status
      const accessibleTopics = forumData.topics.filter((topic: Topic) => 
        (!topic.isPrivate || topic.allowedUsers.includes(userId as string)) &&
        topic.metadata.status === 'active'
      );

      // Add forum metadata to each topic
      const topicsWithMetadata = accessibleTopics.map((topic: Topic) => ({
        ...topic,
        forumId: forumData._id,
        gameTitle: forumData.metadata.gameTitle,
        category: forumData.metadata.category
      }));

      return {
        ...forumData,
        topics: topicsWithMetadata
      };
    });

    return res.status(200).json(accessibleForums);
  } catch (error) {
    console.error('Error fetching forums:', error);
    return res.status(500).json({ error: 'Error fetching forums' });
  }
} 