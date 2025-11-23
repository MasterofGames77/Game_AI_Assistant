import { ChallengeStreak, ChallengeReward } from "../types";
import {
  getEarnedMilestones,
  getNextMilestone,
  getMilestoneProgress,
} from "./challengeRewards";

/**
 * Check and award milestone rewards based on current streak
 * Returns newly earned rewards
 */
export function checkAndAwardRewards(
  currentStreak: ChallengeStreak | null | undefined,
  existingRewards: ChallengeReward[] = []
): ChallengeReward[] {
  if (!currentStreak || currentStreak.currentStreak === 0) {
    return [];
  }

  // Get list of already awarded milestone days
  const awardedMilestones = existingRewards.map((r) => r.milestone);

  // Get all milestones that should be awarded now
  const earnedMilestones = getEarnedMilestones(
    currentStreak.currentStreak,
    awardedMilestones
  );

  // Convert to ChallengeReward format with dateEarned
  const newRewards: ChallengeReward[] = earnedMilestones.map((milestone) => ({
    ...milestone.reward,
    dateEarned: new Date(),
  }));

  return newRewards;
}

/**
 * Get next milestone progress info
 */
export function getNextMilestoneInfo(
  currentStreak: ChallengeStreak | null | undefined,
  existingRewards: ChallengeReward[] = []
): {
  nextMilestone: { days: number; reward: Omit<ChallengeReward, "dateEarned"> } | null;
  progress: { current: number; target: number; percentage: number } | null;
} {
  if (!currentStreak || currentStreak.currentStreak === 0) {
    const firstMilestone = getNextMilestone(0, []);
    return {
      nextMilestone: firstMilestone,
      progress: firstMilestone
        ? {
            current: 0,
            target: firstMilestone.days,
            percentage: 0,
          }
        : null,
    };
  }

  const awardedMilestones = existingRewards.map((r) => r.milestone);
  const nextMilestone = getNextMilestone(
    currentStreak.currentStreak,
    awardedMilestones
  );

  const progress = nextMilestone
    ? getMilestoneProgress(currentStreak.currentStreak, nextMilestone)
    : null;

  return {
    nextMilestone,
    progress,
  };
}

/**
 * Get all earned rewards summary
 */
export function getRewardsSummary(
  existingRewards: ChallengeReward[] = []
): {
  totalRewards: number;
  latestReward: ChallengeReward | null;
  rewardsByType: Record<string, number>;
} {
  const rewardsByType: Record<string, number> = {};
  
  for (const reward of existingRewards) {
    rewardsByType[reward.type] = (rewardsByType[reward.type] || 0) + 1;
  }

  const latestReward =
    existingRewards.length > 0
      ? existingRewards.sort(
          (a, b) =>
            (b.dateEarned?.getTime() || 0) - (a.dateEarned?.getTime() || 0)
        )[0]
      : null;

  return {
    totalRewards: existingRewards.length,
    latestReward,
    rewardsByType,
  };
}

