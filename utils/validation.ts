import { Forum } from '../types';

/**
 * Validates user authentication
 * @param username - The user's username to validate
 * @returns Array of error messages, empty if validation passes
 */
export const validateUserAuthentication = (username: string | null) => {
  const errors: string[] = [];

  if (!username) {
    errors.push('User authentication required');
  } else if (typeof username !== 'string' || username.length < 1) {
    errors.push('Invalid username format');
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
  } else {
    const allowedCategories = ["speedruns", "gameplay", "mods", "general", "help"];
    if (!allowedCategories.includes(data.category)) {
      errors.push('Invalid category. Allowed categories are: speedruns, gameplay, mods, general, help');
    }
  }

  // Validate private forum requirements
  if (data.isPrivate) {
    if (!Array.isArray(data.allowedUsers)) {
      errors.push('Allowed users must be an array');
    } else if (data.allowedUsers.length === 0) {
      errors.push('Private forums must have at least one allowed user');
    } else {
      // Validate each username in allowedUsers
      data.allowedUsers.forEach((username, index) => {
        if (typeof username !== 'string' || username.length < 1) {
          errors.push(`Invalid username at position ${index}`);
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
export const validatePostData = (data: { message: string; username: string; forumId: string }) => {
  const errors: string[] = [];

  // Validate message
  if (!data.message?.trim()) {
    errors.push('Message is required');
  } else if (data.message.length > 5000) {
    errors.push('Message must be less than 5000 characters');
  } else if (data.message.length < 1) {
    errors.push('Message cannot be empty');
  }

  // Validate username
  if (!data.username) {
    errors.push('Username is required');
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
 * @param username - The user's username to validate
 * @returns Array of error messages, empty if user has access
 */
export const validateUserAccess = (forum: Forum, username: string) => {
  const errors: string[] = [];

  // Validate username
  if (!username || typeof username !== 'string' || username.length < 1) {
    errors.push('Invalid username');
    return errors;
  }

  // Check private forum access
  if (forum.isPrivate && !forum.allowedUsers.includes(username)) {
    errors.push('You do not have access to this private forum');
  }

  // Check forum status
  if (forum.metadata.status !== 'active') {
    errors.push('This forum is not active');
  }

  return errors;
};

/**
 * Validates if a user has Pro access for Pro-only forums
 * @param forum - The forum to check Pro access for
 * @param hasProAccess - Whether the user has Pro access
 * @returns Array of error messages, empty if user has Pro access
 */
export const validateProAccess = (forum: Forum, hasProAccess: boolean) => {
  const errors: string[] = [];

  // Check Pro-only forum access
  if (forum.isProOnly && !hasProAccess) {
    errors.push('This forum is Pro-only. Upgrade to Wingman Pro to access exclusive forums.');
  }

  return errors;
};

/**
 * Validates Pro access for forum creation
 * @param isProOnly - Whether the forum being created is Pro-only
 * @param hasProAccess - Whether the user has Pro access
 * @returns Array of error messages, empty if user can create the forum
 */
export const validateForumCreationAccess = (isProOnly: boolean, hasProAccess: boolean) => {
  const errors: string[] = [];

  // Check if user is trying to create a Pro-only forum without Pro access
  if (isProOnly && !hasProAccess) {
    errors.push('Pro access required to create Pro-only forums. Upgrade to Wingman Pro to create exclusive forums.');
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