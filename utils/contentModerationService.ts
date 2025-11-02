import axios from 'axios';
import { ContentCheckResult } from '../types';

export const checkContent = async (content: string, userId: string): Promise<ContentCheckResult> => {
  try {
    const response = await axios.post('/api/checkContent', {
      content,
      username: userId  // API expects 'username' parameter, not 'userId'
    });

    return {
      isValid: true,
      ...response.data
    };
  } catch (error: any) {
    console.error('Error in checkContent:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      userId
    });
    
    if (error.response?.data) {
      return {
        isValid: false,
        ...error.response.data
      };
    }
    
    return {
      isValid: false,
      error: error.message || 'Failed to check content'
    };
  }
}; 