"use client";

import React, { useState, useEffect } from "react";
import {
  DailyChallenge,
  Conversation,
  ChallengeStreak,
  ChallengeReward,
} from "../types";
import {
  getTodaysChallenge,
  getChallengeProgress,
  markChallengeCompleted,
  getTodayDateString,
} from "../utils/challengeSelector";
import {
  hasCompletedChallenge,
  getChallengeProgress as getProgress,
} from "../utils/challengeDetector";
import { getChallengeStreakInfo } from "../utils/challengeStreak";
import { getNextMilestoneInfo } from "../utils/checkChallengeRewards";
import { formatRewardMessage } from "../utils/challengeRewards";
import { DailyChallengeBannerProps } from "../types";

const DailyChallengeBanner: React.FC<DailyChallengeBannerProps> = ({
  username,
  conversations,
}) => {
  const [challenge, setChallenge] = useState<DailyChallenge | null>(null);
  const [completed, setCompleted] = useState(false);
  const [progress, setProgress] = useState<{
    current: number;
    target: number;
  } | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [streak, setStreak] = useState<ChallengeStreak | null>(null);
  const [rewards, setRewards] = useState<ChallengeReward[]>([]);
  const [newRewards, setNewRewards] = useState<ChallengeReward[]>([]);
  const [showRewardNotification, setShowRewardNotification] = useState(false);

  useEffect(() => {
    if (!username) {
      setChallenge(null);
      return;
    }

    // Get today's challenge
    const todaysChallenge = getTodaysChallenge();
    setChallenge(todaysChallenge);

    // Async function to check progress and completion
    const checkProgress = async () => {
      try {
        // Check if already completed (from backend)
        const response = await fetch(
          `/api/challenge-progress?username=${encodeURIComponent(username)}`
        );

        let data: any = null;
        if (response.ok) {
          data = await response.json();
          // If already completed for today, set completed and don't re-check
          if (
            data.progress?.completed &&
            data.progress?.date === getTodayDateString()
          ) {
            setCompleted(true);
            if (data.streak) {
              setStreak(data.streak);
            }
            if (data.rewards) {
              setRewards(data.rewards);
            }
            // Don't check conversations if already completed for today
            return;
          }
          if (data.streak) {
            setStreak(data.streak);
          }
          if (data.rewards) {
            setRewards(data.rewards);
          }
        }

        // Only check conversations if not already completed in backend for today
        // This prevents re-triggering completion if already marked as done
        if (
          !data?.progress?.completed ||
          data?.progress?.date !== getTodayDateString()
        ) {
          // Check if completed based on conversations
          const isCompleted = hasCompletedChallenge(
            conversations,
            todaysChallenge
          );

          // Update completion status
          if (isCompleted) {
            setCompleted(true);
            // Mark challenge as completed (async, but don't wait)
            markChallengeCompleted(username, todaysChallenge.id).then(() => {
              // Fetch updated data after completion (streak, rewards)
              fetch(
                `/api/challenge-progress?username=${encodeURIComponent(
                  username
                )}`
              )
                .then((streakResponse) => streakResponse.json())
                .then((streakData) => {
                  if (streakData.streak) {
                    setStreak(streakData.streak);
                  }
                  if (streakData.rewards) {
                    setRewards(streakData.rewards);
                  }
                  // Check for new rewards
                  if (
                    streakData.newRewards &&
                    streakData.newRewards.length > 0
                  ) {
                    setNewRewards(streakData.newRewards);
                    setShowRewardNotification(true);
                    // Auto-hide notification after 5 seconds
                    setTimeout(() => setShowRewardNotification(false), 5000);
                  }
                })
                .catch((error) => {
                  console.error(
                    "Error fetching updated challenge data:",
                    error
                  );
                });
            });
          } else {
            setCompleted(false);
          }
        }

        // Get progress for count-based challenges
        if (todaysChallenge.criteria.type === "count") {
          const progressData = getProgress(conversations, todaysChallenge);
          setProgress({
            current: progressData.current,
            target: progressData.target,
          });
        } else {
          setProgress(null);
        }
      } catch (error) {
        console.error("Error checking challenge progress:", error);
        // Fallback: check completion based on conversations only
        const isCompleted = hasCompletedChallenge(
          conversations,
          todaysChallenge
        );
        setCompleted(isCompleted);
      }
    };

    checkProgress();

    // Check if dismissed (still using localStorage for dismissal)
    const dismissedKey = `challenge_dismissed_${username}_${getTodayDateString()}`;
    const dismissed = localStorage.getItem(dismissedKey) === "true";
    setIsDismissed(dismissed);
  }, [username, conversations]);

  const handleDismiss = () => {
    if (!username) return;
    const dismissedKey = `challenge_dismissed_${username}_${getTodayDateString()}`;
    localStorage.setItem(dismissedKey, "true");
    setIsDismissed(true);
  };

  // Don't render if no username, no challenge, or dismissed
  if (!username || !challenge || isDismissed) {
    return null;
  }

  // Get next milestone info for display
  const milestoneInfo =
    streak && streak.currentStreak > 0
      ? getNextMilestoneInfo(streak, rewards)
      : null;

  return (
    <>
      {/* Reward Notification */}
      {showRewardNotification && newRewards.length > 0 && (
        <div className="mt-4 px-4 py-3 rounded-lg border-2 bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border-yellow-500 max-w-xl w-full animate-pulse">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎉</span>
            <div>
              <h3 className="font-bold text-yellow-400 text-sm">
                Reward Earned!
              </h3>
              {newRewards.map((reward, idx) => (
                <p key={idx} className="text-xs text-yellow-200 mt-0.5">
                  {formatRewardMessage(reward)}
                </p>
              ))}
            </div>
            <button
              onClick={() => setShowRewardNotification(false)}
              className="ml-auto text-yellow-400 hover:text-yellow-200"
              aria-label="Dismiss notification"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
      {/* Challenge Banner */}
      <div
        className={`mt-4 px-4 py-3 rounded-lg border-2 transition-all max-w-xl w-full ${
          completed
            ? "bg-green-50 border-green-500 text-green-900 dark:bg-green-900/30 dark:text-white"
            : "bg-blue-50 border-blue-500 text-blue-900 dark:bg-blue-900/30 dark:text-white"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-xl flex-shrink-0">
              {challenge.icon || "🎯"}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-xs">
                  {completed ? "✅ " : ""}
                  Daily Challenge: {challenge.title}
                </h3>
              </div>
              <p className="text-xs text-gray-700 dark:text-gray-300 mt-0.5">
                {challenge.description}
              </p>
              {streak && streak.currentStreak > 0 && (
                <div className="mt-1 text-xs font-semibold text-yellow-600 dark:text-yellow-400">
                  {getChallengeStreakInfo(streak).message}
                </div>
              )}
              {milestoneInfo &&
                milestoneInfo.progress &&
                milestoneInfo.nextMilestone && (
                  <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                    Next reward: {milestoneInfo.nextMilestone.reward.icon}{" "}
                    {milestoneInfo.nextMilestone.reward.name} (
                    {milestoneInfo.progress.current}/
                    {milestoneInfo.progress.target} days)
                  </div>
                )}
              {progress && (
                <div className="mt-1.5">
                  <div className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                    <span className="whitespace-nowrap text-xs">
                      Progress: {progress.current}/{progress.target}
                    </span>
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 min-w-0">
                      <div
                        className={`h-1.5 rounded-full transition-all ${
                          completed ? "bg-green-500" : "bg-blue-500"
                        }`}
                        style={{
                          width: `${Math.min(
                            (progress.current / progress.target) * 100,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-white ml-2 flex-shrink-0 transition-colors"
            aria-label="Dismiss challenge"
            type="button"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
};

export default DailyChallengeBanner;
