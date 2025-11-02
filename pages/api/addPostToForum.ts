import type { NextApiRequest, NextApiResponse } from 'next';
import connectToMongoDB from '../../utils/mongodb';
import Forum from '../../models/Forum';
import { containsOffensiveContent } from '../../utils/contentModeration';
import { checkProAccess } from '../../utils/proAccessUtil';
import { checkUserBanStatus } from '../../utils/violationHandler';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await connectToMongoDB();
    const { forumId, message, username } = req.body;

    // Log the request for debugging (especially for 400 errors)
    console.log('addPostToForum request:', {
      forumId,
      username,
      messageLength: message?.length,
      hasMessage: !!message,
      timestamp: new Date().toISOString()
    });

    // Validate required fields with detailed error messages
    const missingFields: string[] = [];
    if (!forumId) missingFields.push('forumId');
    if (!message) missingFields.push('message');
    if (!username) missingFields.push('username');
    
    if (missingFields.length > 0) {
      console.warn('Missing required fields:', { missingFields, username, forumId });
      return res.status(400).json({ 
        error: `Missing required fields: ${missingFields.join(', ')}` 
      });
    }

    // Pro access check
    const hasProAccess = await checkProAccess(username);
    if (!hasProAccess) {
      return res.status(403).json({ error: 'Pro access required to post in forums. Upgrade to Wingman Pro to participate.' });
    }

    // Check if user is currently banned (before processing post)
    const banStatus = await checkUserBanStatus(username);
    if (banStatus.isBanned) {
      return res.status(403).json({ 
        error: `You are banned until ${banStatus.expiresAt}. Reason: Previous content violations.`,
        banStatus
      });
    }

    // Find the forum
    const forum = await Forum.findOne({ forumId });
    if (!forum) {
      return res.status(404).json({ error: 'Forum not found' });
    }

    // Check if forum is private and user is allowed
    if (forum.isPrivate && !forum.allowedUsers.includes(username)) {
      return res.status(403).json({ 
        error: 'Not authorized to post in this forum',
        details: `This is a private forum. You must be added to the allowed users list to post. Current allowed users: ${forum.allowedUsers.length}`
      });
    }

    // Check if forum is active
    if (forum.metadata.status !== 'active') {
      return res.status(403).json({ error: 'Forum is not active' });
    }

    // Check for offensive content
    console.log('Checking content moderation for message...');
    const contentCheck = await containsOffensiveContent(message, username);
    console.log('Content check result:', {
      isOffensive: contentCheck.isOffensive,
      offendingWords: contentCheck.offendingWords,
      hasViolationResult: !!contentCheck.violationResult,
      violationAction: contentCheck.violationResult?.action
    });
    
    if (contentCheck.isOffensive) {
      // Log the violation for server-side debugging
      console.warn('Content policy violation detected:', {
        username,
        forumId,
        warningCount: contentCheck.violationResult?.count,
        action: contentCheck.violationResult?.action,
        offendingWords: contentCheck.offendingWords,
        messagePreview: message.substring(0, 100) + (message.length > 100 ? '...' : '')
      });

      // Handle different violation actions
      if (contentCheck.violationResult?.action === 'banned') {
        return res.status(403).json({
          error: 'Account Suspended',
          message: 'Your account has been suspended due to content violations.',
          banExpiresAt: contentCheck.violationResult.expiresAt,
          violationResult: contentCheck.violationResult
        });
      }
      
      // Warning or first-time violation - return user-friendly message
      const warningCount = contentCheck.violationResult?.count || 1;
      return res.status(400).json({ 
        error: 'Content Policy Violation',
        message: `Your message contains offensive or inappropriate content. You have been given a warning (${warningCount}/3). Continued offenses will result in a temporary ban.`,
        isContentViolation: true,
        warningCount,
        violationResult: contentCheck.violationResult
      });
    }

    // Create new post
    const newPost = {
      username,
      message: message.trim(),
      timestamp: new Date(),
      createdBy: username,
      likes: [],
      metadata: {
        edited: false
      }
    };

    // Add post to forum
    forum.posts.push(newPost);
    
    // Update forum metadata
    forum.metadata.totalPosts += 1;
    forum.metadata.lastActivityAt = new Date();

    // Save changes
    await forum.save();

    return res.status(200).json({ 
      message: 'Post added successfully', 
      forum
    });
  } catch (error: any) {
    console.error('Error adding post:', error);
    
    // Check for MongoDB validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        error: 'Validation error',
        details: error.message,
        validationErrors: error.errors
      });
    }
    
    // Check for MongoDB document size limit (16MB)
    if (error.message && error.message.includes('maximum document size')) {
      return res.status(400).json({ 
        error: 'Forum has reached maximum size limit',
        details: 'The forum has too many posts. Please contact support or create a new forum.'
      });
    }
    
    return res.status(500).json({ 
      error: 'Failed to add post',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}