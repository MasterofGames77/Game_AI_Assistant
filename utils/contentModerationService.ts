import axios from 'axios';

export interface ContentCheckResult {
  isValid: boolean;
  error?: string;
  offendingWords?: string[];
  violationResult?: {
    action: 'warning' | 'banned';
    count?: number;
    expiresAt?: Date;
    message?: string;
  };
}

export const checkContent = async (content: string, userId: string): Promise<ContentCheckResult> => {
  try {
    const response = await axios.post('/api/checkContent', {
      content,
      userId
    });

    return {
      isValid: true,
      ...response.data
    };
  } catch (error: any) {
    if (error.response?.data) {
      return {
        isValid: false,
        ...error.response.data
      };
    }
    
    return {
      isValid: false,
      error: 'Failed to check content'
    };
  }
}; 