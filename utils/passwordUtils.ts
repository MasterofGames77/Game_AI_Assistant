import bcrypt from 'bcryptjs';

// Password hashing configuration
const SALT_ROUNDS = 12; // Higher rounds = more secure but slower

/**
 * Hash a password using bcrypt
 * @param password - Plain text password
 * @returns Promise<string> - Hashed password
 */
export const hashPassword = async (password: string): Promise<string> => {
  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    return await bcrypt.hash(password, salt);
  } catch (error) {
    console.error('Error hashing password:', error);
    throw new Error('Failed to hash password');
  }
};

/**
 * Compare a plain text password with a hashed password
 * @param password - Plain text password
 * @param hash - Hashed password from database
 * @returns Promise<boolean> - True if passwords match
 */
export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    console.error('Error comparing password:', error);
    throw new Error('Failed to compare password');
  }
};

/**
 * Generate a secure random token for password reset
 * @returns string - Random token
 */
export const generateResetToken = (): string => {
  return require('crypto').randomBytes(32).toString('hex');
};

/**
 * Generate a 6-digit verification code for password reset
 * @returns string - 6-digit code
 */
export const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Check if enough time has passed since last password reset request
 * @param lastRequest - Date of last password reset request
 * @param cooldownSeconds - Cooldown period in seconds (default: 60)
 * @returns object with canRequest and timeRemaining
 */
export const checkPasswordResetRateLimit = (
  lastRequest: Date | undefined, 
  cooldownSeconds: number = 60
): { canRequest: boolean; timeRemaining: number } => {
  if (!lastRequest) {
    return { canRequest: true, timeRemaining: 0 };
  }

  const now = new Date();
  const timeSinceLastRequest = (now.getTime() - lastRequest.getTime()) / 1000;
  const timeRemaining = Math.max(0, cooldownSeconds - timeSinceLastRequest);

  return {
    canRequest: timeRemaining <= 0,
    timeRemaining: Math.ceil(timeRemaining)
  };
};

/**
 * Validate password strength
 * @param password - Password to validate
 * @returns object with validation result and message
 */
export const validatePassword = (password: string): { isValid: boolean; message: string } => {
  // Minimum 8 characters
  if (password.length < 8) {
    return {
      isValid: false,
      message: 'Password must be at least 8 characters long'
    };
  }

  // Maximum 128 characters (reasonable limit)
  if (password.length > 128) {
    return {
      isValid: false,
      message: 'Password must be less than 128 characters'
    };
  }

  // Check for at least one letter
  if (!/[a-zA-Z]/.test(password)) {
    return {
      isValid: false,
      message: 'Password must contain at least one letter'
    };
  }

  // Check for at least one number
  if (!/\d/.test(password)) {
    return {
      isValid: false,
      message: 'Password must contain at least one number'
    };
  }

  // Check for common weak passwords
  const commonPasswords = [
    'password', '123456', '123456789', 'qwerty', 'abc123',
    'password123', 'admin', 'letmein', 'welcome', 'monkey'
  ];
  
  if (commonPasswords.includes(password.toLowerCase())) {
    return {
      isValid: false,
      message: 'Password is too common. Please choose a more secure password'
    };
  }

  return {
    isValid: true,
    message: 'Password is valid'
  };
};

/**
 * Check if password meets strength requirements (for UI feedback)
 * @param password - Password to check
 * @returns object with strength score and requirements met
 */
export const getPasswordStrength = (password: string): {
  score: number; // 0-4
  requirements: {
    length: boolean;
    hasLetter: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
  };
  message: string;
} => {
  const requirements = {
    length: password.length >= 8,
    hasLetter: /[a-zA-Z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  };

  const score = Object.values(requirements).filter(Boolean).length;
  
  let message = '';
  if (score === 0) message = 'Very weak';
  else if (score === 1) message = 'Weak';
  else if (score === 2) message = 'Fair';
  else if (score === 3) message = 'Good';
  else if (score === 4) message = 'Strong';

  return {
    score,
    requirements,
    message
  };
};
