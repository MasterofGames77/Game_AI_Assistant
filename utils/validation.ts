import { Forum, Topic, ForumPost } from '../types';

/**
 * Validates topic data for creation or updates
 * @param data - Partial Topic object containing the data to validate
 * @returns Array of error messages, empty if validation passes
 */
export const validateTopicData = (data: Partial<Topic>) => {
  const errors: string[] = [];

  // Check if topic title exists and is not empty
  if (!data.topicTitle?.trim()) {
    errors.push('Topic title is required');
  }

  // Validate topic title length
  if (data.topicTitle && data.topicTitle.length > 200) {
    errors.push('Topic title must be less than 200 characters');
  }

  // Validate private topic requirements
  if (data.isPrivate && (!Array.isArray(data.allowedUsers) || data.allowedUsers.length === 0)) {
    errors.push('Private topics must have at least one allowed user');
  }

  // Validate description length if provided
  if (data.description && data.description.length > 1000) {
    errors.push('Description must be less than 1000 characters');
  }

  return errors;
};

/**
 * Validates post data before creation
 * @param data - Partial ForumPost object with additional topic and forum IDs
 * @returns Array of error messages, empty if validation passes
 */
export const validatePostData = (data: Partial<ForumPost> & { topicId?: string; forumId?: string }) => {
  const errors: string[] = [];

  // Check if post message exists and is not empty
  if (!data.message?.trim()) {
    errors.push('Post message is required');
  }

  // Validate post message length
  if (data.message && data.message.length > 5000) {
    errors.push('Post message must be less than 5000 characters');
  }

  // Validate required IDs
  if (!data.userId) {
    errors.push('User ID is required');
  }

  if (!data.topicId) {
    errors.push('Topic ID is required');
  }

  if (!data.forumId) {
    errors.push('Forum ID is required');
  }

  return errors;
};

/**
 * Validates forum data for creation or updates
 * @param data - Partial Forum object containing the data to validate
 * @returns Array of error messages, empty if validation passes
 */
export const validateForumData = (data: Partial<Forum>) => {
  const errors: string[] = [];

  // Check if forum title exists and is not empty
  if (!data.title?.trim()) {
    errors.push('Forum title is required');
  }

  // Validate forum title length
  if (data.title && data.title.length > 100) {
    errors.push('Forum title must be less than 100 characters');
  }

  // Validate description length if provided
  if (data.description && data.description.length > 500) {
    errors.push('Forum description must be less than 500 characters');
  }

  // Validate required metadata fields
  if (!data.metadata) {
    errors.push('Forum metadata is required');
  } else {
    if (!data.metadata.gameTitle) {
      errors.push('Game title is required');
    }
    if (!data.metadata.category) {
      errors.push('Category is required');
    }
  }

  return errors;
};

/**
 * Validates if a user has access to a specific topic
 * @param topic - The topic to check access for
 * @param userId - The user's ID to validate
 * @returns Array of error messages, empty if user has access
 */
export const validateUserAccess = (topic: Topic, userId: string) => {
  const errors: string[] = [];

  // Check private topic access
  if (topic.isPrivate && !topic.allowedUsers.includes(userId)) {
    errors.push('You do not have access to this private topic');
  }

  // Check topic status
  if (topic.metadata.status !== 'active') {
    errors.push('This topic is not active');
  }

  return errors;
};

/**
 * Validates if a topic status is valid
 * @param status - The status to validate
 * @returns Boolean indicating if the status is valid
 */
export const validateTopicStatus = (status: string) => {
  const validStatuses = ['active', 'locked', 'archived', 'deleted'];
  return validStatuses.includes(status);
};

/**
 * Validates if a post status is valid
 * @param status - The status to validate
 * @returns Boolean indicating if the status is valid
 */
export const validatePostStatus = (status: string) => {
  const validStatuses = ['active', 'edited', 'deleted'];
  return validStatuses.includes(status);
};

/**
 * Validates forum settings configuration
 * @param settings - The settings object to validate
 * @returns Array of error messages, empty if settings are valid
 */
export const validateForumSettings = (settings: any) => {
  const errors: string[] = [];

  // Validate allowNewTopics setting
  if (typeof settings.allowNewTopics !== 'boolean') {
    errors.push('allowNewTopics must be a boolean');
  }

  // Validate maxTopicsPerUser setting
  if (typeof settings.maxTopicsPerUser !== 'number' || settings.maxTopicsPerUser < 1) {
    errors.push('maxTopicsPerUser must be a positive number');
  }

  // Validate maxPostsPerTopic setting
  if (typeof settings.maxPostsPerTopic !== 'number' || settings.maxPostsPerTopic < 1) {
    errors.push('maxPostsPerTopic must be a positive number');
  }

  return errors;
}; 