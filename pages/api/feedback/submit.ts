import type { NextApiRequest, NextApiResponse } from 'next';
import connectToMongoDB from '../../../utils/mongodb';
import Feedback from '../../../models/Feedback';
import { containsOffensiveContent } from '../../../utils/contentModeration';
import { checkProAccess } from '../../../utils/proAccessUtil';
import { validateFeedbackData } from '../../../utils/validation';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await connectToMongoDB();
    
    const { 
      username, 
      email, 
      category, 
      title, 
      message, 
      priority = 'medium',
      attachments = []
    } = req.body;

    // Validate required fields
    if (!username || !email || !category || !title || !message) {
      return res.status(400).json({ 
        error: 'Missing required fields: username, email, category, title, and message are required' 
      });
    }

    // Validate feedback data
    const validationErrors = validateFeedbackData({
      username,
      email,
      category,
      title,
      message,
      priority
    });

    if (validationErrors.length > 0) {
      return res.status(400).json({ error: validationErrors[0] });
    }

    // Check if user has Pro access to determine userType
    const hasProAccess = await checkProAccess(username);
    const userType = hasProAccess ? 'pro' : 'free';

    // Check for offensive content in title and message
    const titleCheck = await containsOffensiveContent(title, username);
    const messageCheck = await containsOffensiveContent(message, username);

    if (titleCheck.isOffensive || messageCheck.isOffensive) {
      const allOffendingWords = [
        ...(titleCheck.offendingWords || []),
        ...(messageCheck.offendingWords || [])
      ];
      
      return res.status(400).json({ 
        error: `The following words violate our policy: ${allOffendingWords.join(', ')}`,
        violationResult: {
          title: titleCheck.violationResult,
          message: messageCheck.violationResult
        }
      });
    }

    // Create new feedback
    const feedback = await Feedback.create({
      username,
      email,
      userType,
      category,
      title,
      message,
      priority,
      metadata: {
        isRead: false,
        isArchived: false,
        tags: [],
        attachments,
        violationResult: {
          title: titleCheck,
          message: messageCheck
        }
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      feedback: {
        feedbackId: feedback.feedbackId,
        category: feedback.category,
        title: feedback.title,
        status: feedback.status,
        createdAt: feedback.createdAt
      }
    });

  } catch (error: any) {
    console.error('Error submitting feedback:', error);
    
    // Handle duplicate feedback ID error
    if (error.code === 11000) {
      return res.status(409).json({ 
        error: 'Feedback ID already exists. Please try again.' 
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return res.status(400).json({ 
        error: `Validation error: ${validationErrors.join(', ')}` 
      });
    }

    return res.status(500).json({ 
      error: 'Internal server error. Please try again later.' 
    });
  }
}
