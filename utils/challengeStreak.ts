import { ChallengeStreak } from "../types";

/**
 * Get today's date in YYYY-MM-DD format (UTC)
 * Uses UTC to ensure consistency across timezones
 * Challenges reset at midnight UTC (7 PM EST / 8 PM EDT)
 */
export function getTodayDateString(): string {
  const today = new Date();
  const year = today.getUTCFullYear();
  const month = String(today.getUTCMonth() + 1).padStart(2, "0");
  const day = String(today.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get yesterday's date in YYYY-MM-DD format (UTC)
 */
export function getYesterdayDateString(): string {
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const year = yesterday.getUTCFullYear();
  const month = String(yesterday.getUTCMonth() + 1).padStart(2, "0");
  const day = String(yesterday.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Calculate the number of days between two date strings (YYYY-MM-DD)
 */
function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1 + "T00:00:00Z");
  const d2 = new Date(date2 + "T00:00:00Z");
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Update challenge streak when a challenge is completed
 * Returns the updated streak object
 */
export function updateChallengeStreak(
  currentStreak: ChallengeStreak | null | undefined,
  completedDate: string // YYYY-MM-DD format
): ChallengeStreak {
  // Initialize streak if it doesn't exist
  if (!currentStreak) {
    return {
      currentStreak: 1,
      longestStreak: 1,
      lastCompletedDate: completedDate,
    };
  }

  const lastCompleted = currentStreak.lastCompletedDate;
  
  // If no previous completion, start streak at 1
  if (!lastCompleted) {
    return {
      currentStreak: 1,
      longestStreak: 1,
      lastCompletedDate: completedDate,
    };
  }

  // Check if this is the same day (shouldn't happen, but handle it)
  if (lastCompleted === completedDate) {
    return currentStreak; // No change
  }

  // Calculate days between last completion and today
  const daysDiff = daysBetween(lastCompleted, completedDate);

  if (daysDiff === 1) {
    // Consecutive day - increment streak
    const newStreak = (currentStreak.currentStreak || 0) + 1;
    return {
      currentStreak: newStreak,
      longestStreak: Math.max(currentStreak.longestStreak || 0, newStreak),
      lastCompletedDate: completedDate,
    };
  } else if (daysDiff === 0) {
    // Same day - no change
    return currentStreak;
  } else {
    // Streak broken (more than 1 day gap) - reset to 1
    return {
      currentStreak: 1,
      longestStreak: currentStreak.longestStreak || 0, // Keep longest streak
      lastCompletedDate: completedDate,
    };
  }
}

/**
 * Get challenge streak for display
 * Returns streak info with formatted messages
 */
export function getChallengeStreakInfo(
  streak: ChallengeStreak | null | undefined
): {
  currentStreak: number;
  longestStreak: number;
  message: string;
} {
  if (!streak || streak.currentStreak === 0) {
    return {
      currentStreak: 0,
      longestStreak: streak?.longestStreak || 0,
      message: "Start your streak today!",
    };
  }

  const current = streak.currentStreak || 0;
  const longest = streak.longestStreak || 0;

  let message = "";
  if (current === 1) {
    message = "1 day streak! 🔥";
  } else if (current < 7) {
    message = `${current} day streak! 🔥`;
  } else if (current < 30) {
    message = `${current} day streak! 🔥🔥`;
  } else if (current < 100) {
    message = `${current} day streak! 🔥🔥🔥`;
  } else {
    message = `${current} day streak! LEGENDARY! 🏆`;
  }

  return {
    currentStreak: current,
    longestStreak: longest,
    message,
  };
}

