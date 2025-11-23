import { Conversation, DailyChallenge } from "../types";

/**
 * Check if a conversation matches challenge criteria
 * This checks a single conversation against the challenge requirements
 */
export function checkChallengeCompletion(
  conversation: Conversation,
  challenge: DailyChallenge
): boolean {
  const { criteria } = challenge;

  switch (criteria.type) {
    case "genre":
      // Check if conversation has the required genre in detectedGenre array
      if (
        !conversation.detectedGenre ||
        !Array.isArray(conversation.detectedGenre)
      ) {
        return false;
      }
      return conversation.detectedGenre.includes(criteria.value as string);

    case "category":
      // Check if conversation has the required question category
      if (!conversation.questionCategory) {
        return false;
      }
      return conversation.questionCategory === criteria.value;

    case "interaction":
      // Check if conversation has the required interaction type
      if (!conversation.interactionType) {
        return false;
      }
      return conversation.interactionType === criteria.value;

    case "count":
      // Count-based challenges are handled separately in hasCompletedChallenge
      // This function only checks individual conversations
      return false;

    default:
      return false;
  }
}

/**
 * Get today's date at midnight UTC for consistent date comparison
 */
function getTodayMidnightUTC(): Date {
  const today = new Date();
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth();
  const day = today.getUTCDate();
  return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
}

/**
 * Check if a conversation timestamp is from today (UTC)
 */
function isConversationFromToday(conversation: Conversation): boolean {
  if (!conversation.timestamp) {
    return false;
  }

  const todayMidnight = getTodayMidnightUTC();
  const tomorrowMidnight = new Date(todayMidnight);
  tomorrowMidnight.setUTCDate(tomorrowMidnight.getUTCDate() + 1);

  // Convert conversation timestamp to Date if it's a string
  const convDate =
    conversation.timestamp instanceof Date
      ? conversation.timestamp
      : new Date(conversation.timestamp);

  // Check if conversation is between today midnight and tomorrow midnight (UTC)
  return convDate >= todayMidnight && convDate < tomorrowMidnight;
}

/**
 * Check if user has completed today's challenge based on conversations
 * This function checks all conversations from today to see if any match the challenge
 */
export function hasCompletedChallenge(
  conversations: Conversation[],
  challenge: DailyChallenge
): boolean {
  if (!conversations || conversations.length === 0) {
    return false;
  }

  // For count-based challenges
  if (challenge.criteria.type === "count") {
    const todayConversations = conversations.filter((conv) =>
      isConversationFromToday(conv)
    );
    const target = challenge.criteria.value as number;
    return todayConversations.length >= target;
  }

  // For other challenge types (genre, category, interaction)
  // Check if any conversation from today matches the challenge criteria
  return conversations.some((conv) => {
    // Only check conversations from today
    if (!isConversationFromToday(conv)) {
      return false;
    }
    return checkChallengeCompletion(conv, challenge);
  });
}

/**
 * Get progress for count-based challenges
 * Returns current count, target count, and completion status
 */
export function getChallengeProgress(
  conversations: Conversation[],
  challenge: DailyChallenge
): { current: number; target: number; completed: boolean } {
  // Only works for count-based challenges
  if (challenge.criteria.type !== "count") {
    return { current: 0, target: 0, completed: false };
  }

  if (!conversations || conversations.length === 0) {
    const target = challenge.criteria.value as number;
    return {
      current: 0,
      target,
      completed: false,
    };
  }

  // Filter conversations from today
  const todayConversations = conversations.filter((conv) =>
    isConversationFromToday(conv)
  );

  const target = challenge.criteria.value as number;
  const current = todayConversations.length;

  return {
    current,
    target,
    completed: current >= target,
  };
}

/**
 * Get all conversations from today that match a challenge
 * Useful for debugging or showing which conversations contributed to completion
 */
export function getMatchingConversations(
  conversations: Conversation[],
  challenge: DailyChallenge
): Conversation[] {
  if (!conversations || conversations.length === 0) {
    return [];
  }

  // For count-based challenges, return all today's conversations
  if (challenge.criteria.type === "count") {
    return conversations.filter((conv) => isConversationFromToday(conv));
  }

  // For other challenge types, return conversations that match the criteria
  return conversations.filter((conv) => {
    if (!isConversationFromToday(conv)) {
      return false;
    }
    return checkChallengeCompletion(conv, challenge);
  });
}

