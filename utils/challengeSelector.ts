import { DailyChallenge, ChallengeProgress } from "../types";
import { DAILY_CHALLENGES } from "./dailyChallenges";
import axios from "axios";

/**
 * Get today's date in YYYY-MM-DD format
 * Uses UTC to ensure consistency across timezones
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
 * Get a deterministic challenge for a specific date
 * Uses date as seed for consistent daily selection
 * All users will get the same challenge on the same day
 */
export function getChallengeForDate(dateString: string): DailyChallenge {
  // Convert date string to a number seed
  const date = new Date(dateString + "T00:00:00Z"); // Use UTC midnight
  const seed = date.getTime();

  // Use seed to select a challenge (deterministic)
  // Math.sin provides pseudo-random distribution based on seed
  const index =
    Math.abs(Math.floor(Math.sin(seed) * 10000)) % DAILY_CHALLENGES.length;

  return DAILY_CHALLENGES[index];
}

/**
 * Get today's challenge
 * Returns the same challenge for all users on the same day
 */
export function getTodaysChallenge(): DailyChallenge {
  const today = getTodayDateString();
  return getChallengeForDate(today);
}

/**
 * Get challenge progress from backend API
 * Returns null if no progress exists or if progress is for a different day
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
      // Parse completedAt to Date if it's a string
      if (progress.completedAt && typeof progress.completedAt === "string") {
        progress.completedAt = new Date(progress.completedAt);
      }
      return progress;
    }

    return null;
  } catch (error) {
    console.error("Error fetching challenge progress:", error);
    // Fallback to localStorage for offline scenarios
    if (typeof window !== "undefined") {
      const key = `challenge_progress_${username}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          const progress = JSON.parse(stored) as ChallengeProgress;
          if (progress.date === getTodayDateString()) {
            if (progress.completedAt && typeof progress.completedAt === "string") {
              progress.completedAt = new Date(progress.completedAt);
            }
            return progress;
          }
        } catch (e) {
          // Invalid localStorage data, ignore
        }
      }
    }
    return null;
  }
}

/**
 * Save challenge progress to backend API
 * Falls back to localStorage if API call fails
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
    // Fallback to localStorage for offline scenarios
    if (typeof window !== "undefined") {
      try {
        const key = `challenge_progress_${username}`;
        localStorage.setItem(key, JSON.stringify(progress));
      } catch (localError) {
        console.error("Error saving to localStorage:", localError);
      }
    }
  }
}

/**
 * Mark challenge as completed
 * Creates a ChallengeProgress object and saves it to backend
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

  await saveChallengeProgress(username, progress);
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

