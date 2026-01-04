import { DailyChallenge, ChallengeProgress } from "../types";
import { DAILY_CHALLENGES } from "./dailyChallenges";
import axios from "axios";

/**
 * Get today's date in YYYY-MM-DD format
 * Uses UTC to ensure consistency across timezones
 * Challenges reset at midnight UTC (7 PM EST / 8 PM EDT)
 */
export function getTodayDateString(): string {
  const today = new Date();
  // Use UTC to ensure same date for all users regardless of timezone
  const year = today.getUTCFullYear();
  const month = String(today.getUTCMonth() + 1).padStart(2, "0");
  const day = String(today.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get a deterministic challenge for a specific date and index
 * Uses date and index as seed for consistent daily selection
 * All users will get the same challenges on the same day
 * @param dateString - Date in YYYY-MM-DD format
 * @param index - Index of challenge (0, 1, or 2 for 3 challenges per day)
 */
export function getChallengeForDate(dateString: string, index: number = 0): DailyChallenge {
  // Convert date string to a number seed
  const date = new Date(dateString + "T00:00:00Z"); // Use UTC midnight
  const baseSeed = date.getTime();
  
  // Combine date seed with index to get unique seed for each challenge
  // Use different multipliers for each index to ensure variety
  const multipliers = [1, 10007, 20011]; // Prime numbers for better distribution
  const seed = baseSeed + (multipliers[index % 3] * (index + 1));

  // Use seed to select a challenge (deterministic)
  // Math.sin provides pseudo-random distribution based on seed
  const challengeIndex =
    Math.abs(Math.floor(Math.sin(seed) * 10000)) % DAILY_CHALLENGES.length;

  return DAILY_CHALLENGES[challengeIndex];
}

/**
 * Get today's challenge (legacy - returns first challenge)
 * Returns the same challenge for all users on the same day
 * @deprecated Use getTodaysChallenges() instead for multiple challenges
 */
export function getTodaysChallenge(): DailyChallenge {
  const today = getTodayDateString();
  return getChallengeForDate(today, 0);
}

/**
 * Get today's challenges (Phase 2: Multiple Challenges)
 * Returns 3 deterministic challenges for today
 * All users will get the same 3 challenges on the same day
 */
export function getTodaysChallenges(): DailyChallenge[] {
  const today = getTodayDateString();
  const challenges: DailyChallenge[] = [];
  const usedIndices = new Set<number>();
  
  // Generate 3 unique challenges
  for (let i = 0; i < 3; i++) {
    let challenge: DailyChallenge;
    let attempts = 0;
    const maxAttempts = 50; // Prevent infinite loop
    
    // Keep trying until we get a unique challenge
    do {
      challenge = getChallengeForDate(today, i);
      attempts++;
      
      // If we've used all challenges, allow duplicates
      if (usedIndices.size >= DAILY_CHALLENGES.length) {
        break;
      }
    } while (usedIndices.has(DAILY_CHALLENGES.indexOf(challenge)) && attempts < maxAttempts);
    
    challenges.push(challenge);
    usedIndices.add(DAILY_CHALLENGES.indexOf(challenge));
  }
  
  return challenges;
}

/**
 * Get challenge progress from backend API (legacy - single challenge)
 * Returns null if no progress exists or if progress is for a different day
 * @deprecated Use getChallengesProgress() instead for multiple challenges
 */
export async function getChallengeProgress(
  username: string
): Promise<ChallengeProgress | null> {
  if (!username) return null;

  try {
    const response = await axios.get(
      `/api/challenge-progress?username=${encodeURIComponent(username)}`
    );

    if (response.data && response.data.progress) {
      const progress = response.data.progress;
      // Handle both single object and array (backward compatibility)
      if (Array.isArray(progress)) {
        // If array, return first entry (legacy behavior)
        const firstProgress = progress[0];
        if (firstProgress && firstProgress.completedAt && typeof firstProgress.completedAt === "string") {
          firstProgress.completedAt = new Date(firstProgress.completedAt);
        }
        return firstProgress || null;
      }
      
      // Single object (legacy)
      if (progress.completedAt && typeof progress.completedAt === "string") {
        progress.completedAt = new Date(progress.completedAt);
      }
      return progress;
    }

    return null;
  } catch (error) {
    console.error("Error fetching challenge progress:", error);
    return null;
  }
}

/**
 * Get challenges progress from backend API (Phase 2: Multiple Challenges)
 * Returns array of progress entries for today's challenges
 */
export async function getChallengesProgress(
  username: string
): Promise<ChallengeProgress[]> {
  if (!username) return [];

  try {
    const response = await axios.get(
      `/api/challenge-progress?username=${encodeURIComponent(username)}`
    );

    if (response.data && response.data.progresses) {
      const progresses = response.data.progresses;
      // Parse completedAt to Date if it's a string for each entry
      return progresses.map((p: ChallengeProgress) => {
        if (p.completedAt && typeof p.completedAt === "string") {
          p.completedAt = new Date(p.completedAt);
        }
        return p;
      });
    }

    // Fallback: check if single progress exists (backward compatibility)
    if (response.data && response.data.progress) {
      const progress = response.data.progress;
      if (!Array.isArray(progress) && progress.date === getTodayDateString()) {
        if (progress.completedAt && typeof progress.completedAt === "string") {
          progress.completedAt = new Date(progress.completedAt);
        }
        return [progress];
      }
    }

    return [];
  } catch (error) {
    console.error("Error fetching challenges progress:", error);
    return [];
  }
}

/**
 * Save challenge progress to backend API (legacy - single challenge)
 * @deprecated Use saveChallengesProgress() instead for multiple challenges
 */
export async function saveChallengeProgress(
  username: string,
  progress: ChallengeProgress
): Promise<void> {
  if (!username) return;

  // Ensure date is set to today
  progress.date = getTodayDateString();

  try {
    await axios.post("/api/challenge-progress", {
      username,
      progress,
    });
  } catch (error) {
    console.error("Error saving challenge progress to API:", error);
  }
}

/**
 * Save challenges progress to backend API (Phase 2: Multiple Challenges)
 * Saves array of progress entries
 */
export async function saveChallengesProgress(
  username: string,
  progresses: ChallengeProgress[]
): Promise<void> {
  if (!username || !progresses || progresses.length === 0) return;

  // Ensure all dates are set to today
  const today = getTodayDateString();
  progresses.forEach(p => {
    p.date = today;
  });

  try {
    await axios.post("/api/challenge-progress", {
      username,
      progresses, // Send as array
    });
  } catch (error) {
    console.error("Error saving challenges progress to API:", error);
  }
}

/**
 * Mark challenge as completed
 * Creates a ChallengeProgress object and saves it to backend
 * @deprecated Use saveChallengesProgress with array for Phase 2 (multiple challenges)
 */
export async function markChallengeCompleted(
  username: string,
  challengeId: string
): Promise<void> {
  const progress: ChallengeProgress = {
    challengeId,
    date: getTodayDateString(),
    completed: true,
    completedAt: new Date(),
  };

  // Phase 2: Use saveChallengesProgress with array format
  await saveChallengesProgress(username, [progress]);
}

/**
 * Clear challenge progress for a user
 * Useful for testing or resetting progress
 * Note: This only clears localStorage, backend data persists
 */
export function clearChallengeProgress(username: string): void {
  if (typeof window === "undefined") return;
  if (!username) return;

  const key = `challenge_progress_${username}`;
  localStorage.removeItem(key);
}

