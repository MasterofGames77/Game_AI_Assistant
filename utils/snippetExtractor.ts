/**
 * Utility to extract key snippets from AI responses for shareable cards
 */

/**
 * Extracts a snippet from a response for display on shareable cards
 * Tries to extract meaningful content up to maxLength
 * @param response - Full response text
 * @param maxLength - Maximum length of snippet (default: 3000)
 * @returns Extracted snippet
 */
export function extractSnippet(response: string, maxLength: number = 3000): string {
  if (!response || response.length === 0) {
    return '';
  }

  // Remove markdown code blocks
  let cleaned = response.replace(/```[\s\S]*?```/g, '');
  
  // Remove inline code
  cleaned = cleaned.replace(/`[^`]+`/g, '');
  
  // Remove markdown links but keep text
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
  
  // Remove markdown headers
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, '');
  
  // Remove markdown bold/italic
  cleaned = cleaned.replace(/\*\*([^\*]+)\*\*/g, '$1');
  cleaned = cleaned.replace(/\*([^\*]+)\*/g, '$1');
  cleaned = cleaned.replace(/__([^_]+)__/g, '$1');
  cleaned = cleaned.replace(/_([^_]+)_/g, '$1');
  
  // Remove extra whitespace but preserve paragraph breaks
  cleaned = cleaned.replace(/[ \t]+/g, ' ').trim();
  
  // If the cleaned response fits within maxLength, return it all
  if (cleaned.length <= maxLength) {
    return cleaned;
  }
  
  // Try to extract first paragraph (up to maxLength)
  const paragraphs = cleaned.split(/\n\n+/);
  if (paragraphs.length > 0 && paragraphs[0].length <= maxLength) {
    return paragraphs[0].trim();
  }
  
  // Try to extract first few sentences
  const sentences = cleaned.match(/[^.!?]+[.!?]+/g);
  if (sentences) {
    let extracted = '';
    for (const sentence of sentences) {
      if ((extracted + sentence).length <= maxLength) {
        extracted += sentence;
      } else {
        break;
      }
    }
    if (extracted.length > 0) {
      return extracted.trim();
    }
  }
  
  // Try to extract first bullet point or numbered item (if it fits)
  const bulletMatch = cleaned.match(/^[•\-\*]\s*(.+?)(?:\n|$)/);
  if (bulletMatch && bulletMatch[1].length <= maxLength) {
    return bulletMatch[1].trim();
  }
  
  // Try to extract first numbered item
  const numberedMatch = cleaned.match(/^\d+[\.\)]\s*(.+?)(?:\n|$)/);
  if (numberedMatch && numberedMatch[1].length <= maxLength) {
    return numberedMatch[1].trim();
  }
  
  // Fallback: truncate to maxLength at word boundary
  const truncated = cleaned.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  const lastPeriod = truncated.lastIndexOf('.');
  const lastExclamation = truncated.lastIndexOf('!');
  const lastQuestion = truncated.lastIndexOf('?');
  
  // Prefer ending at sentence boundary
  const sentenceEnd = Math.max(lastPeriod, lastExclamation, lastQuestion);
  if (sentenceEnd > maxLength * 0.7) {
    return truncated.substring(0, sentenceEnd + 1).trim();
  }
  
  // Otherwise truncate at word boundary
  if (lastSpace > maxLength * 0.7) {
    return truncated.substring(0, lastSpace).trim() + '...';
  }
  
  return truncated.trim() + '...';
}

/**
 * Extracts the game title from conversation data
 * @param detectedGame - Detected game from conversation
 * @param question - User's question (fallback)
 * @returns Game title
 */
export function extractGameTitle(detectedGame?: string, question?: string): string {
  if (detectedGame && detectedGame.trim()) {
    return detectedGame.trim();
  }
  
  // Try to extract game name from question
  if (question) {
    // Common patterns: "in [Game]", "for [Game]", "[Game] question"
    const patterns = [
      /(?:in|for|about|with)\s+([A-Z][A-Za-z0-9\s:]+?)(?:\?|\.|$)/,
      /^([A-Z][A-Za-z0-9\s:]+?)\s+(?:question|help|guide|tip)/i,
    ];
    
    for (const pattern of patterns) {
      const match = question.match(pattern);
      if (match && match[1] && match[1].length < 50) {
        return match[1].trim();
      }
    }
  }
  
  return 'Video Game Question';
}

