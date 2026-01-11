/**
 * Simple keyword extraction using pattern matching
 * Phase 1: Basic pattern matching (no AI)
 * Phase 2: Will be enhanced with AI-powered extraction
 */

/**
 * Extract keywords from post content using simple pattern matching
 * @param postContent - The forum post content
 * @param gameTitle - The game title
 * @param forumCategory - Optional forum category
 * @returns Array of extracted keywords
 */
export function extractKeywordsSimple(
  postContent: string,
  gameTitle: string,
  forumCategory?: string
): string[] {
  const keywords: string[] = [];
  
  // Extract quoted strings (often character names, items, locations)
  const quotedMatches = postContent.match(/"([^"]+)"/g);
  if (quotedMatches) {
    quotedMatches.forEach(match => {
      const keyword = match.replace(/"/g, '').trim();
      if (keyword.length > 2 && keyword.length < 50) {
        keywords.push(keyword);
      }
    });
  }
  
  // Extract capitalized words/phrases (potential character names, locations)
  // Look for sequences of capitalized words
  const capitalizedMatches = postContent.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g);
  if (capitalizedMatches) {
    capitalizedMatches.forEach(match => {
      // Filter out common words and game title
      const lowerMatch = match.toLowerCase();
      const gameTitleLower = gameTitle.toLowerCase();
      
      if (
        !lowerMatch.includes(gameTitleLower) &&
        !['the', 'and', 'or', 'but', 'for', 'with', 'from', 'this', 'that', '&', 'in'].includes(lowerMatch) &&
        match.length > 2 &&
        match.length < 50
      ) {
        keywords.push(match);
      }
    });
  }
  
  // Extract common game terms
  const gameTerms = [
    'speedrun', 'mod', 'mods', 'character', 'characters', 'boss', 'bosses',
    'achievement', 'achievements', 'location', 'locations', 'item', 'items',
    'weapon', 'weapons', 'armor', 'quest', 'quests', 'mission', 'missions',
    'level', 'levels', 'chapter', 'chapters', 'ending', 'endings', 'class',
    'ability', 'abilities', 'skill', 'skills', 'upgrade', 'upgrades', 'hidden',
    'equipment', 'story progression', 'inventory', 'stage', 'unlock', 'secret'
  ];
  
  gameTerms.forEach(term => {
    if (postContent.toLowerCase().includes(term)) {
      keywords.push(term);
    }
  });
  
  // Add forum category as keyword if provided
  if (forumCategory) {
    keywords.push(forumCategory);
  }
  
  // Remove duplicates and limit to top 5 keywords
  const uniqueKeywords = Array.from(new Set(keywords.map(k => k.toLowerCase())))
    .slice(0, 5)
    .map(k => {
      // Capitalize first letter of each word for better search results
      return k.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
    });
  
  return uniqueKeywords;
}
