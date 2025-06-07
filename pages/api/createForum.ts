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

    // Extract userId from Authorization header (Bearer token)
    let userId = 'test-user';
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      userId = authHeader.split(' ')[1] || 'test-user';
    }

    const { title, gameTitle, category, isPrivate } = req.body;

    // Only require Bearer token if not test user
    if (userId !== 'test-user') {
      const authError = validateAuth(req);
      if (authError) {
        return res.status(401).json({ error: authError });
      }
    }

    // Validate user authentication only if not test user
    if (userId !== 'test-user') {
      const userAuthErrors = validateUserAuthentication(userId);
      if (userAuthErrors.length > 0) {
        return res.status(401).json({ error: userAuthErrors[0] });
      }
    }

    // Validate forum data
    const forumData = {
      title,
      gameTitle,
      category,
      isPrivate,
      allowedUsers: isPrivate ? [userId] : [],
    };
    const validationErrors = validateForumData(forumData);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: validationErrors[0] });
    }

    // Check for offensive content
    const titleCheck = await containsOffensiveContent(title, userId);
    const gameTitleCheck = await containsOffensiveContent(gameTitle, userId);

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
      allowedUsers: isPrivate ? [userId] : [],
      createdBy: userId,
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