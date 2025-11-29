/**
 * Determines if a response is a "long guide" that should show the "Save Guide" button
 * 
 * A response is considered a guide if:
 * 1. It's longer than 500 characters (indicating a detailed response)
 * 2. OR it contains guide-related keywords
 * 3. OR the question contains guide-related keywords
 * 
 * @param response - The response text from Wingman
 * @param question - The original question (optional, for better detection)
 * @returns true if the response should be considered a guide
 */
export function isLongGuide(response: string, question?: string): boolean {
  if (!response || response.trim().length === 0) {
    return false;
  }

  // Check length - guides are typically longer
  const isLong = response.length > 500;

  // Check for guide-related keywords in response
  const guideKeywords = [
    'guide',
    'step by step',
    'walkthrough',
    'tutorial',
    'how to',
    'instructions',
    'tips',
    'strategy',
    'first',
    'second',
    'third',
    'finally',
    'next',
    'then',
    'after that'
  ];

  const responseLower = response.toLowerCase();
  const hasGuideKeywords = guideKeywords.some(keyword => 
    responseLower.includes(keyword)
  );

  // Check question for guide-related keywords
  let questionHasGuideKeywords = false;
  if (question) {
    const questionLower = question.toLowerCase();
    questionHasGuideKeywords = guideKeywords.some(keyword => 
      questionLower.includes(keyword)
    );
  }

  // Check for numbered steps (common in guides)
  const hasNumberedSteps = /\d+\.\s/.test(response) || 
                          /step\s+\d+/i.test(response) ||
                          /^\s*\d+\./m.test(response);

  // Consider it a guide if:
  // - It's long AND has guide keywords, OR
  // - It has numbered steps, OR
  // - Question explicitly asks for a guide
  return (
    (isLong && hasGuideKeywords) ||
    hasNumberedSteps ||
    questionHasGuideKeywords ||
    (isLong && response.split('\n').length > 5) // Multiple paragraphs
  );
}

/**
 * Extracts a title from a question for the saved guide
 * @param question - The original question
 * @returns A title for the guide
 */
export function extractGuideTitle(question: string): string {
  if (!question) return 'Saved Guide';

  const questionLower = question.toLowerCase();
  
  // If question explicitly asks for a guide, extract the topic
  if (questionLower.includes('guide for')) {
    return question.replace(/guide for/i, '').trim();
  }
  
  if (questionLower.includes('how to')) {
    return question.replace(/how to/i, '').trim();
  }
  
  // Use first 60 characters as title
  if (question.length > 60) {
    return question.substring(0, 60).trim() + '...';
  }
  
  return question.trim();
}
