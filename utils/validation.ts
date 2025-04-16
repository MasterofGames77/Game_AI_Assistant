import { Forum, Topic, ForumPost } from '../types';

/**
 * Validates user authentication
 * @param userId - The user's ID to validate
 * @returns Array of error messages, empty if validation passes
 */
export const validateUserAuthentication = (userId: string | null) => {
  const errors: string[] = [];

  if (!userId) {
    errors.push('User authentication required');
  } else if (typeof userId !== 'string' || userId.length < 1) {
    errors.push('Invalid user ID format');
  }

  return errors;
};

/**
 * Validates rate limiting
 * @param lastActionTime - Timestamp of last action
 * @param rateLimitMs - Rate limit in milliseconds
 * @returns Array of error messages, empty if validation passes
 */
export const validateRateLimit = (lastActionTime: Date | null, rateLimitMs: number) => {
  const errors: string[] = [];

  if (lastActionTime) {
    const timeSinceLastAction = Date.now() - lastActionTime.getTime();
    if (timeSinceLastAction < rateLimitMs) {
      errors.push(`Please wait ${Math.ceil((rateLimitMs - timeSinceLastAction) / 1000)} seconds before trying again`);
    }
  }

  return errors;
};

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

  // Validate topic title length and content
  if (data.topicTitle) {
    if (data.topicTitle.length > 200) {
      errors.push('Topic title must be less than 200 characters');
    }
    if (data.topicTitle.length < 3) {
      errors.push('Topic title must be at least 3 characters');
    }
    if (/[<>]/.test(data.topicTitle)) {
      errors.push('Topic title contains invalid characters');
    }
  }

  // Validate private topic requirements
  if (data.isPrivate) {
    if (!Array.isArray(data.allowedUsers)) {
      errors.push('Allowed users must be an array');
    } else if (data.allowedUsers.length === 0) {
      errors.push('Private topics must have at least one allowed user');
    } else {
      // Validate each user ID in allowedUsers
      data.allowedUsers.forEach((userId, index) => {
        if (typeof userId !== 'string' || userId.length < 1) {
          errors.push(`Invalid user ID at position ${index}`);
        }
      });
    }
  }

  // Validate description length and content
  if (data.description) {
    if (data.description.length > 1000) {
      errors.push('Description must be less than 1000 characters');
    }
    if (/[<>]/.test(data.description)) {
      errors.push('Description contains invalid characters');
    }
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

  // Validate post message length and content
  if (data.message) {
    if (data.message.length > 5000) {
      errors.push('Post message must be less than 5000 characters');
    }
    if (data.message.length < 1) {
      errors.push('Post message cannot be empty');
    }
    if (/[<>]/.test(data.message)) {
      errors.push('Post message contains invalid characters');
    }
  }

  // Validate required IDs
  if (!data.userId) {
    errors.push('User ID is required');
  } else if (typeof data.userId !== 'string' || data.userId.length < 1) {
    errors.push('Invalid user ID format');
  }

  if (!data.topicId) {
    errors.push('Topic ID is required');
  } else if (typeof data.topicId !== 'string' || data.topicId.length < 1) {
    errors.push('Invalid topic ID format');
  }

  if (!data.forumId) {
    errors.push('Forum ID is required');
  } else if (typeof data.forumId !== 'string' || data.forumId.length < 1) {
    errors.push('Invalid forum ID format');
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

  // Validate forum title length and content
  if (data.title) {
    if (data.title.length > 100) {
      errors.push('Forum title must be less than 100 characters');
    }
    if (data.title.length < 3) {
      errors.push('Forum title must be at least 3 characters');
    }
    if (/[<>]/.test(data.title)) {
      errors.push('Forum title contains invalid characters');
    }
  }

  // Validate description length and content
  if (data.description) {
    if (data.description.length > 500) {
      errors.push('Forum description must be less than 500 characters');
    }
    if (/[<>]/.test(data.description)) {
      errors.push('Forum description contains invalid characters');
    }
  }

  // Validate required metadata fields
  if (!data.metadata) {
    errors.push('Forum metadata is required');
  } else {
    if (!data.metadata.gameTitle) {
      errors.push('Game title is required');
    } else if (/[<>]/.test(data.metadata.gameTitle)) {
      errors.push('Game title contains invalid characters');
    }

    if (!data.metadata.category) {
      errors.push('Category is required');
    } else if (/[<>]/.test(data.metadata.category)) {
      errors.push('Category contains invalid characters');
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

  // Validate user ID
  if (!userId || typeof userId !== 'string' || userId.length < 1) {
    errors.push('Invalid user ID');
    return errors;
  }

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

  // Validate rate limiting settings
  if (typeof settings.rateLimitMs !== 'number' || settings.rateLimitMs < 0) {
    errors.push('rateLimitMs must be a non-negative number');
  }

  return errors;
}; 