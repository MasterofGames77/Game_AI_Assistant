import crypto from 'crypto';
import User from '../models/User';
import type { IUser } from '../models/User';
import { sendAccountUnlockEmail } from './emailService';

/**
 * Account Lockout Configuration
 */
export const LOCKOUT_CONFIG = {
  MAX_FAILED_ATTEMPTS: 5, // Lock after 5 failed attempts
  TEMPORARY_LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes temporary lockout
  UNLOCK_TOKEN_EXPIRY: 24 * 60 * 60 * 1000, // 24 hours for unlock token
  RESET_WINDOW: 60 * 60 * 1000, // Reset failed attempts after 1 hour of no attempts
} as const;

/**
 * Check if an account is currently locked
 * @param user - User document
 * @returns Object with locked status and unlock information
 */
export function checkAccountLocked(user: IUser): {
  isLocked: boolean;
  lockedUntil?: Date;
  requiresUnlock: boolean;
  message?: string;
} {
  // Account is not locked if flag is false
  if (!user.isLocked) {
    return { isLocked: false, requiresUnlock: false };
  }

  // Check if temporary lockout has expired
  if (user.lockedUntil && new Date() < user.lockedUntil) {
    const minutesRemaining = Math.ceil(
      (user.lockedUntil.getTime() - Date.now()) / (60 * 1000)
    );
    return {
      isLocked: true,
      lockedUntil: user.lockedUntil,
      requiresUnlock: false,
      message: `Account temporarily locked. Please try again in ${minutesRemaining} minute(s).`,
    };
  }

  // If lockedUntil is null or expired, account requires unlock
  return {
    isLocked: true,
    requiresUnlock: true,
    message: 'Account has been locked due to multiple failed login attempts. Please check your email for unlock instructions.',
  };
}

/**
 * Track a failed login attempt and lock account if threshold is reached
 * @param user - User document
 * @param ip - IP address of the failed attempt (for logging)
 * @returns Updated user document
 */
export async function trackFailedLoginAttempt(
  user: IUser,
  ip?: string
): Promise<IUser> {
  const now = new Date();
  const lastAttempt = user.lastFailedLoginAttempt
    ? new Date(user.lastFailedLoginAttempt)
    : null;

  // Reset failed attempts if enough time has passed since last attempt
  let failedAttempts = user.failedLoginAttempts || 0;
  if (
    lastAttempt &&
    now.getTime() - lastAttempt.getTime() > LOCKOUT_CONFIG.RESET_WINDOW
  ) {
    failedAttempts = 0;
  }

  // Increment failed attempts
  failedAttempts += 1;

  // Update user with new failed attempt
  user.failedLoginAttempts = failedAttempts;
  user.lastFailedLoginAttempt = now;

  // Lock account if threshold is reached (permanent lockout requiring email unlock)
  if (failedAttempts >= LOCKOUT_CONFIG.MAX_FAILED_ATTEMPTS) {
    await lockAccount(user, ip, true); // Permanent lockout
  } else {
    // Save updated failed attempts
    await user.save();
  }

  return user;
}

/**
 * Lock an account (temporary lockout or permanent requiring unlock)
 * @param user - User document
 * @param ip - IP address that triggered the lockout (for logging)
 * @param isPermanent - If true, requires email unlock. If false, temporary lockout.
 */
export async function lockAccount(
  user: IUser,
  ip?: string,
  isPermanent: boolean = false
): Promise<void> {
  const now = new Date();

  user.isLocked = true;
  user.failedLoginAttempts = LOCKOUT_CONFIG.MAX_FAILED_ATTEMPTS;

  if (isPermanent) {
    // Permanent lockout - requires email unlock
    user.lockedUntil = undefined;
    // Generate unlock token
    const unlockToken = crypto.randomBytes(32).toString('hex');
    user.unlockToken = unlockToken;
    user.unlockTokenExpires = new Date(
      now.getTime() + LOCKOUT_CONFIG.UNLOCK_TOKEN_EXPIRY
    );
    
    // Send unlock email (don't await to avoid blocking)
    sendAccountUnlockEmail(user.email, user.username, unlockToken).catch(
      (error) => {
        console.error(
          `[SECURITY] Failed to send unlock email to ${user.email}:`,
          error
        );
      }
    );
  } else {
    // Temporary lockout - auto-unlocks after duration
    user.lockedUntil = new Date(
      now.getTime() + LOCKOUT_CONFIG.TEMPORARY_LOCKOUT_DURATION
    );
    // Don't set unlock token for temporary lockouts
    user.unlockToken = undefined;
    user.unlockTokenExpires = undefined;
  }

  await user.save();

  // Log lockout event
  console.log(
    `[SECURITY] Account locked: userId=${user.userId}, username=${user.username}, ` +
      `ip=${ip || 'unknown'}, permanent=${isPermanent}, lockedUntil=${user.lockedUntil || 'requires unlock'}`
  );
}

/**
 * Unlock an account (reset failed attempts and unlock flag)
 * @param user - User document
 * @param reason - Reason for unlock (for logging)
 */
export async function unlockAccount(
  user: IUser,
  reason: string = 'manual'
): Promise<void> {
  user.isLocked = false;
  user.failedLoginAttempts = 0;
  user.lockedUntil = undefined;
  user.unlockToken = undefined;
  user.unlockTokenExpires = undefined;
  user.lastFailedLoginAttempt = undefined;

  await user.save();

  // Log unlock event
  console.log(
    `[SECURITY] Account unlocked: userId=${user.userId}, username=${user.username}, reason=${reason}`
  );
}

/**
 * Reset failed login attempts (called on successful login)
 * @param user - User document
 */
export async function resetFailedLoginAttempts(user: IUser): Promise<void> {
  if (user.failedLoginAttempts && user.failedLoginAttempts > 0) {
    user.failedLoginAttempts = 0;
    user.lastFailedLoginAttempt = undefined;
    await user.save();
  }
}

/**
 * Generate an unlock token for email-based unlock
 * @param user - User document
 * @returns Unlock token
 */
export async function generateUnlockToken(user: IUser): Promise<string> {
  const unlockToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(
    Date.now() + LOCKOUT_CONFIG.UNLOCK_TOKEN_EXPIRY
  );

  user.unlockToken = unlockToken;
  user.unlockTokenExpires = expiresAt;
  await user.save();

  return unlockToken;
}

/**
 * Verify an unlock token
 * @param user - User document
 * @param token - Token to verify
 * @returns True if token is valid, false otherwise
 */
export function verifyUnlockToken(user: IUser, token: string): boolean {
  if (!user.unlockToken || !user.unlockTokenExpires) {
    return false;
  }

  if (user.unlockToken !== token) {
    return false;
  }

  if (new Date() > user.unlockTokenExpires) {
    return false;
  }

  return true;
}

