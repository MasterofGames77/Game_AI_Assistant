import { Forum } from '../types';

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
    if (data.title.length > 200) {
      errors.push('Forum title must be less than 200 characters');
    }
    if (data.title.length < 3) {
      errors.push('Forum title must be at least 3 characters');
    }
    if (/[<>]/.test(data.title)) {
      errors.push('Forum title contains invalid characters');
    }
  }

  // Validate game title
  if (!data.gameTitle?.trim()) {
    errors.push('Game title is required');
  }

  // Validate category
  if (!data.category?.trim()) {
    errors.push('Category is required');
  }

  // Validate private forum requirements
  if (data.isPrivate) {
    if (!Array.isArray(data.allowedUsers)) {
      errors.push('Allowed users must be an array');
    } else if (data.allowedUsers.length === 0) {
      errors.push('Private forums must have at least one allowed user');
    } else {
      // Validate each user ID in allowedUsers
      data.allowedUsers.forEach((userId, index) => {
        if (typeof userId !== 'string' || userId.length < 1) {
          errors.push(`Invalid user ID at position ${index}`);
        }
      });
    }
  }

  return errors;
};

/**
 * Validates post data for creation or updates
 * @param data - Object containing post data to validate
 * @returns Array of error messages, empty if validation passes
 */
export const validatePostData = (data: { message: string; userId: string; forumId: string }) => {
  const errors: string[] = [];

  // Validate message
  if (!data.message?.trim()) {
    errors.push('Message is required');
  } else if (data.message.length > 5000) {
    errors.push('Message must be less than 5000 characters');
  } else if (data.message.length < 1) {
    errors.push('Message cannot be empty');
  }

  // Validate user ID
  if (!data.userId) {
    errors.push('User ID is required');
  }

  // Validate forum ID
  if (!data.forumId) {
    errors.push('Forum ID is required');
  }

  return errors;
};

/**
 * Validates if a user has access to a specific forum
 * @param forum - The forum to check access for
 * @param userId - The user's ID to validate
 * @returns Array of error messages, empty if user has access
 */
export const validateUserAccess = (forum: Forum, userId: string) => {
  const errors: string[] = [];

  // Validate user ID
  if (!userId || typeof userId !== 'string' || userId.length < 1) {
    errors.push('Invalid user ID');
    return errors;
  }

  // Check private forum access
  if (forum.isPrivate && !forum.allowedUsers.includes(userId)) {
    errors.push('You do not have access to this private forum');
  }

  // Check forum status
  if (forum.metadata.status !== 'active') {
    errors.push('This forum is not active');
  }

  return errors;
};

/**
 * Validates if a forum status is valid
 * @param status - The status to validate
 * @returns Boolean indicating if the status is valid
 */
export const validateForumStatus = (status: string) => {
  const validStatuses = ['active', 'locked', 'archived'];
  return validStatuses.includes(status);
}; 