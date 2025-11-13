import UserViolation from '../models/UserViolation';
import { banEmail } from './emailCheck';

export const handleContentViolation = async (username: string, offendingWords: string[], userEmail?: string) => {
  const violation = await UserViolation.findOne({ username });
  
  if (!violation) {
    // First violation - create record and warn
    await UserViolation.create({
      username,
      violations: [{ offendingWords, content: offendingWords.join(', ') }],
      warningCount: 1,
      banCount: 0,
      isPermanentlyBanned: false
    });
    return { action: 'warning', count: 1 };
  }

  // Check if user is permanently banned
  if (violation.isPermanentlyBanned) {
    return { action: 'permanent_ban' };
  }

  // Check if user was previously banned and ban period expired
  const wasPreviouslyBanned = violation.banExpiresAt && violation.banExpiresAt < new Date();
  
  if (wasPreviouslyBanned) {
    // Reset warning count after ban expires, but keep violation history
    violation.warningCount = 1;
    violation.banExpiresAt = new Date(0); // Use epoch date instead of null
    violation.violations.push({ offendingWords, content: offendingWords.join(', ') });
    await violation.save();
    return { action: 'warning', count: 1, message: 'Post-ban warning' };
  }

  // Check if currently banned
  if (violation.banExpiresAt && violation.banExpiresAt > new Date()) {
    return { action: 'banned', expiresAt: violation.banExpiresAt };
  }

  // Add new violation and increment warning count
  violation.violations.push({ offendingWords, content: offendingWords.join(', ') });
  violation.warningCount += 1;

  // Handle ban logic based on ban count
  if (violation.warningCount >= 3) {
    violation.banCount += 1;
    
    if (violation.banCount === 1) {
      // First ban - 30 days
      violation.banExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await violation.save();
      return { action: 'banned', expiresAt: violation.banExpiresAt, banCount: 1 };
    } else if (violation.banCount === 2) {
      // Second ban - 50 days
      violation.banExpiresAt = new Date(Date.now() + 50 * 24 * 60 * 60 * 1000);
      await violation.save();
      return { action: 'banned', expiresAt: violation.banExpiresAt, banCount: 2 };
    } else if (violation.banCount >= 3) {
      // Third ban - permanent
      violation.isPermanentlyBanned = true;
      violation.banExpiresAt = new Date(0);
      await violation.save();
      
      // If we have the user's email, ban it
      if (userEmail) {
        await banEmail(userEmail, username);
      }
      
      return { action: 'permanent_ban' };
    }
  }

  await violation.save();
  return { action: 'warning', count: violation.warningCount };
};

/**
 * Handle image content violation (similar to text violations)
 * @param username - The user's username
 * @param violationType - Type of image violation (e.g., 'explicit_content', 'violent_content')
 * @param userEmail - Optional user email for permanent ban handling
 * @returns Violation result with action and count
 */
export const handleImageViolation = async (
  username: string, 
  violationType: string,
  userEmail?: string
) => {
  // Use the same violation system as text content
  // Format violation type as "offending words" for consistency
  const offendingWords = [`[Image: ${violationType}]`];
  return await handleContentViolation(username, offendingWords, userEmail);
};

/**
 * Check if a user is currently banned
 * @param username - The user's username to check
 * @returns Object with ban status information
 */
export const checkUserBanStatus = async (username: string) => {
  const violation = await UserViolation.findOne({ username });
  
  if (!violation) {
    return { isBanned: false };
  }

  // Check if user is permanently banned
  if (violation.isPermanentlyBanned) {
    return { 
      isBanned: true, 
      isPermanent: true,
      reason: 'Permanent ban due to repeated violations'
    };
  }

  // Check if user is currently banned (ban hasn't expired)
  if (violation.banExpiresAt && violation.banExpiresAt > new Date()) {
    return { 
      isBanned: true, 
      isPermanent: false,
      expiresAt: violation.banExpiresAt,
      banCount: violation.banCount,
      warningCount: violation.warningCount
    };
  }

  // User is not currently banned
  return { 
    isBanned: false,
    warningCount: violation.warningCount,
    banCount: violation.banCount
  };
}; 