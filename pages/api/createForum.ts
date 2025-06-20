import type { NextApiRequest, NextApiResponse } from "next";
import connectToMongoDB from "../../utils/mongodb";
import Forum from "../../models/Forum";
import { validateUserAuthentication, validateForumData } from "@/utils/validation";
import { containsOffensiveContent } from "@/utils/contentModeration";

// Middleware to validate authentication
const validateAuth = (req: NextApiRequest) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return 'Authentication required';
  }
  const token = authHeader.split(' ')[1];
  if (!token) {
    return 'Invalid authentication token';
  }
  return null;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("HEADERS:", req.headers);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await connectToMongoDB();

    // Extract username from request body
    const { title, gameTitle, category, isPrivate, username } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    // Validate forum data
    const forumData = {
      title,
      gameTitle,
      category,
      isPrivate,
      allowedUsers: isPrivate ? [username] : [],
    };
    const validationErrors = validateForumData(forumData);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: validationErrors[0] });
    }

    // Check for offensive content
    const titleCheck = await containsOffensiveContent(title, username);
    const gameTitleCheck = await containsOffensiveContent(gameTitle, username);

    if (titleCheck.isOffensive || gameTitleCheck.isOffensive) {
      return res.status(400).json({ error: 'Content contains offensive language' });
    }

    // Generate a unique forum ID
    const forumId = `forum_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create forum
    const forum = await Forum.create({
      forumId,
      title,
      gameTitle,
      category,
      isPrivate: !!isPrivate,
      allowedUsers: isPrivate ? [username] : [],
      createdBy: username,
      posts: [],
      metadata: {
        totalPosts: 0,
        lastActivityAt: new Date(),
        viewCount: 0,
        viewedBy: [],
        status: "active",
        gameTitle,
        category
      },
    });

    const allowedCategories = ["speedruns", "gameplay", "mods", "general", "help"];
    if (!allowedCategories.includes(category)) {
      return res.status(400).json({ error: "Invalid category" });
    }

    return res.status(201).json({ forum });
  } catch (error: any) {
    console.error("Error creating forum:", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}