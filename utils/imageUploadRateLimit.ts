import connectToMongoDB from './mongodb';
import User from '../models/User';

// Rate limit configuration
const RATE_LIMIT_CONFIG = {
  // Free users: 10 uploads per hour
  FREE_MAX_UPLOADS: 10,
  FREE_WINDOW_HOURS: 1,
  
  // Pro users: 50 uploads per hour
  PRO_MAX_UPLOADS: 50,
  PRO_WINDOW_HOURS: 1,
};

/**
 * Check if a user can upload an image based on rate limits
 * @param username - The username to check
 * @returns Object with allowed status and rate limit info
 */
export async function checkImageUploadRateLimit(
  username: string
): Promise<{
  allowed: boolean;
  reason?: string;
  uploadsRemaining?: number;
  resetTime?: Date;
  uploadsUsed?: number;
  uploadsLimit?: number;
}> {
  try {
    await connectToMongoDB();
    
    // Get user from database
    const user = await User.findOne({ username });
    
    if (!user) {
      // If user doesn't exist, allow upload but with free tier limits
      return {
        allowed: true,
        uploadsRemaining: RATE_LIMIT_CONFIG.FREE_MAX_UPLOADS - 1,
        uploadsUsed: 0,
        uploadsLimit: RATE_LIMIT_CONFIG.FREE_MAX_UPLOADS,
      };
    }

    // Check if user has Pro access
    const isProUser = user.hasActiveProAccess();
    const maxUploads = isProUser 
      ? RATE_LIMIT_CONFIG.PRO_MAX_UPLOADS 
      : RATE_LIMIT_CONFIG.FREE_MAX_UPLOADS;
    const windowHours = isProUser 
      ? RATE_LIMIT_CONFIG.PRO_WINDOW_HOURS 
      : RATE_LIMIT_CONFIG.FREE_WINDOW_HOURS;

    // Get or initialize image upload tracking
    const now = new Date();
    let uploadTracking = user.progress?.imageUploadTracking;

    // Initialize if it doesn't exist
    if (!uploadTracking) {
      uploadTracking = {
        uploadCount: 0,
        windowStartTime: now,
        lastUploadTime: now,
      };
      
      // Update user document
      if (!user.progress) {
        user.progress = {} as any;
      }
      (user.progress as any).imageUploadTracking = uploadTracking;
      await user.save();
      
      return {
        allowed: true,
        uploadsRemaining: maxUploads - 1,
        uploadsUsed: 0,
        uploadsLimit: maxUploads,
      };
    }

    // Calculate window end time
    const windowEndTime = new Date(
      uploadTracking.windowStartTime.getTime() + (windowHours * 60 * 60 * 1000)
    );

    // Check if current window has expired
    if (now >= windowEndTime) {
      // Reset the window
      uploadTracking.uploadCount = 0;
      uploadTracking.windowStartTime = now;
      uploadTracking.lastUploadTime = now;
      
      // Update user document
      (user.progress as any).imageUploadTracking = uploadTracking;
      await user.save();
      
      return {
        allowed: true,
        uploadsRemaining: maxUploads - 1,
        uploadsUsed: 0,
        uploadsLimit: maxUploads,
        resetTime: new Date(now.getTime() + (windowHours * 60 * 60 * 1000)),
      };
    }

    // Check if user has reached the limit
    if (uploadTracking.uploadCount >= maxUploads) {
      return {
        allowed: false,
        reason: `You've reached your upload limit of ${maxUploads} images per ${windowHours} hour(s). Please wait until ${windowEndTime.toISOString()} or upgrade to Pro for higher limits.`,
        uploadsRemaining: 0,
        uploadsUsed: uploadTracking.uploadCount,
        uploadsLimit: maxUploads,
        resetTime: windowEndTime,
      };
    }

    // User can upload
    return {
      allowed: true,
      uploadsRemaining: maxUploads - uploadTracking.uploadCount - 1,
      uploadsUsed: uploadTracking.uploadCount,
      uploadsLimit: maxUploads,
      resetTime: windowEndTime,
    };
  } catch (error) {
    console.error('Error checking image upload rate limit:', error);
    // On error, allow upload (fail open) but log the error
    return {
      allowed: true,
      uploadsRemaining: RATE_LIMIT_CONFIG.FREE_MAX_UPLOADS - 1,
      uploadsUsed: 0,
      uploadsLimit: RATE_LIMIT_CONFIG.FREE_MAX_UPLOADS,
    };
  }
}

/**
 * Record an image upload for rate limiting purposes
 * @param username - The username that uploaded the image
 */
export async function recordImageUpload(username: string): Promise<void> {
  try {
    await connectToMongoDB();
    
    const user = await User.findOne({ username });
    if (!user) {
      return; // User doesn't exist, nothing to record
    }

    const now = new Date();
    let uploadTracking = user.progress?.imageUploadTracking;

    // Initialize if it doesn't exist
    if (!uploadTracking) {
      uploadTracking = {
        uploadCount: 0,
        windowStartTime: now,
        lastUploadTime: now,
      };
    }

    // Increment upload count
    uploadTracking.uploadCount += 1;
    uploadTracking.lastUploadTime = now;

    // Update user document
    if (!user.progress) {
      user.progress = {} as any;
    }
    (user.progress as any).imageUploadTracking = uploadTracking;
    await user.save();
  } catch (error) {
    console.error('Error recording image upload:', error);
    // Fail silently - rate limiting is not critical enough to break uploads
  }
}

