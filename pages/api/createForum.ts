import type { NextApiRequest, NextApiResponse } from "next";
import connectToMongoDB from "../../utils/mongodb";
import Forum from "../../models/Forum";
import { validateUserAuthentication, validateForumData } from "@/utils/validation";
import { containsOffensiveContent } from "@/utils/contentModeration";
import { checkProAccess } from "../../utils/proAccessUtil";

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
  // console.log("HEADERS:", req.headers); // Commented out for production

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await connectToMongoDB();

    // Validate authentication header
    const authError = validateAuth(req);
    if (authError) {
      return res.status(401).json({ error: authError });
    }

    // Extract username and forum data from request body
    const { title, gameTitle, category, isPrivate, username } = req.body;

    // Validate user authentication
    const userAuthErrors = validateUserAuthentication(username);
    if (userAuthErrors.length > 0) {
      return res.status(400).json({ error: userAuthErrors[0] });
    }

    // Check Pro access for the user - ALL forum creation requires Pro access
    const hasProAccess = await checkProAccess(username);
    if (!hasProAccess) {
      return res.status(403).json({ error: 'Pro access required to create forums. Upgrade to Wingman Pro to create forums.' });
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

    return res.status(201).json({ forum });
  } catch (error: any) {
    console.error("Error creating forum:", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}