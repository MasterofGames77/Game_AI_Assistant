import axios from 'axios';
import { ContentCheckResult } from '../types';

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