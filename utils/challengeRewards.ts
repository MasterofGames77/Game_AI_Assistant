import { ChallengeRewardMilestone, ChallengeReward } from "../types";

/**
 * Define milestone rewards for consecutive challenge completions
 * Users earn rewards at specific streak milestones
 */
export const CHALLENGE_MILESTONE_REWARDS: ChallengeRewardMilestone[] = [
  {
    days: 5,
    reward: {
      milestone: 5,
      type: "badge",
      name: "Week Warrior",
      description: "Completed challenges for 5 consecutive days!",
      icon: "🔥",
    },
  },
  {
    days: 10,
    reward: {
      milestone: 10,
      type: "badge",
      name: "Dedicated Challenger",
      description: "Completed challenges for 10 consecutive days!",
      icon: "⭐",
    },
  },
  {
    days: 20,
    reward: {
      milestone: 20,
      type: "badge",
      name: "Challenge Master",
      description: "Completed challenges for 20 consecutive days!",
      icon: "🏆",
    },
  },
  {
    days: 30,
    reward: {
      milestone: 30,
      type: "title",
      name: "Monthly Champion",
      description: "Completed challenges for 30 consecutive days!",
      icon: "👑",
    },
  },
  {
    days: 50,
    reward: {
      milestone: 50,
      type: "badge",
      name: "Elite Challenger",
      description: "Completed challenges for 50 consecutive days!",
      icon: "💎",
    },
  },
  {
    days: 100,
    reward: {
      milestone: 100,
      type: "special",
      name: "Century Streak",
      description: "Completed challenges for 100 consecutive days!",
      icon: "🌟",
    },
  },
  {
    days: 200,
    reward: {
      milestone: 200,
      type: "special",
      name: "Legendary Streak",
      description: "Completed challenges for 200 consecutive days!",
      icon: "✨",
    },
  },
  {
    days: 365,
    reward: {
      milestone: 365,
      type: "special",
      name: "Wingman Warrior",
      description: "Completed challenges for an entire year!",
      icon: "🎖️",
    },
  },
];

/**
 * Get all milestone thresholds
 */
export function getMilestoneThresholds(): number[] {
  return CHALLENGE_MILESTONE_REWARDS.map((m) => m.days).sort((a, b) => a - b);
}

/**
 * Get reward for a specific milestone
 */
export function getRewardForMilestone(days: number): ChallengeRewardMilestone | null {
  return (
    CHALLENGE_MILESTONE_REWARDS.find((m) => m.days === days) || null
  );
}

/**
 * Get all milestones that should be awarded for a given streak
 * Returns milestones that haven't been awarded yet
 */
export function getEarnedMilestones(
  currentStreak: number,
  awardedMilestones: number[] = []
): ChallengeRewardMilestone[] {
  const earned: ChallengeRewardMilestone[] = [];

  for (const milestone of CHALLENGE_MILESTONE_REWARDS) {
    // Check if streak has reached this milestone
    if (currentStreak >= milestone.days) {
      // Check if this milestone hasn't been awarded yet
      if (!awardedMilestones.includes(milestone.days)) {
        earned.push(milestone);
      }
    }
  }

  return earned.sort((a, b) => a.days - b.days);
}

/**
 * Get the next milestone the user is working towards
 */
export function getNextMilestone(
  currentStreak: number,
  awardedMilestones: number[] = []
): ChallengeRewardMilestone | null {
  // Find the first milestone that hasn't been reached yet
  for (const milestone of CHALLENGE_MILESTONE_REWARDS) {
    if (currentStreak < milestone.days && !awardedMilestones.includes(milestone.days)) {
      return milestone;
    }
  }

  // All milestones reached!
  return null;
}

/**
 * Get progress towards next milestone
 */
export function getMilestoneProgress(
  currentStreak: number,
  nextMilestone: ChallengeRewardMilestone | null
): { current: number; target: number; percentage: number } | null {
  if (!nextMilestone) {
    return null;
  }

  const percentage = Math.min((currentStreak / nextMilestone.days) * 100, 100);

  return {
    current: currentStreak,
    target: nextMilestone.days,
    percentage: Math.round(percentage),
  };
}

/**
 * Format reward message for display
 */
export function formatRewardMessage(reward: ChallengeReward): string {
  return `${reward.icon || "🎁"} ${reward.name}: ${reward.description}`;
}

