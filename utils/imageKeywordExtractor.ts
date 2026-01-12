/**
 * Keyword extraction for image search
 * Phase 1: Basic pattern matching (no AI)
 * Phase 2: AI-powered extraction with GPT
 */

import { getOpenAIClient } from './aiHelper';

/**
 * Extracted keywords structure
 */
export interface ExtractedKeywords {
  characters: string[];
  locations: string[];
  items: string[];
  topics: string[];
  gameTitle: string;
}

/**
 * Extract keywords from post content using AI (GPT)
 * Phase 2: Enhanced extraction with character names, locations, items, and topics
 * @param postContent - The forum post content
 * @param gameTitle - The game title
 * @param forumCategory - Optional forum category
 * @returns Extracted keywords with categories
 */
export async function extractKeywordsFromPost(
  postContent: string,
  gameTitle: string,
  forumCategory?: string
): Promise<ExtractedKeywords> {
  try {
    // Get OpenAI client
    const openai = getOpenAIClient();
    
    const prompt = `Extract the following from this forum post about "${gameTitle}":
1. Character names mentioned (proper nouns, capitalized names)
2. Location names mentioned (places, areas, levels)
3. Item names mentioned (weapons, equipment, collectibles)
4. Specific topics (speedrun, mod, achievement, completion, story, gameplay mechanic, etc.)

Post: "${postContent}"

${forumCategory ? `Forum Category: ${forumCategory}` : ''}

Return ONLY a valid JSON object with this exact structure:
{
  "characters": ["character1", "character2"],
  "locations": ["location1", "location2"],
  "items": ["item1", "item2"],
  "topics": ["topic1", "topic2"]
}

Do not include the game title in any arrays. Only extract specific names, places, items, and topics mentioned in the post. If a category has no matches, return an empty array.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that extracts structured information from forum posts about video games. Always return valid JSON only, no additional text.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 300,
      temperature: 0.3, // Lower temperature for more consistent extraction
    });

    const responseText = completion.choices[0].message.content?.trim() || '{}';
    
    // Try to parse JSON (handle cases where AI adds markdown code blocks)
    let parsed: any;
    try {
      // Remove markdown code blocks if present
      const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch (parseError) {
      console.warn('[IMAGE SEARCH] Failed to parse AI keyword extraction, falling back to simple extraction');
      // Fallback to simple extraction
      const simpleKeywords = extractKeywordsSimple(postContent, gameTitle, forumCategory);
      return {
        characters: [],
        locations: [],
        items: [],
        topics: simpleKeywords,
        gameTitle: gameTitle
      };
    }

    // Validate and clean extracted keywords
    const result: ExtractedKeywords = {
      characters: Array.isArray(parsed.characters) ? parsed.characters.filter((c: any) => typeof c === 'string' && c.length > 0).slice(0, 3) : [],
      locations: Array.isArray(parsed.locations) ? parsed.locations.filter((l: any) => typeof l === 'string' && l.length > 0).slice(0, 2) : [],
      items: Array.isArray(parsed.items) ? parsed.items.filter((i: any) => typeof i === 'string' && i.length > 0).slice(0, 2) : [],
      topics: Array.isArray(parsed.topics) ? parsed.topics.filter((t: any) => typeof t === 'string' && t.length > 0).slice(0, 3) : [],
      gameTitle: gameTitle
    };

    // If no topics extracted, add forum category as topic
    if (result.topics.length === 0 && forumCategory) {
      result.topics.push(forumCategory);
    }

    console.log(`[IMAGE SEARCH] AI extracted keywords for ${gameTitle}:`, {
      characters: result.characters.length,
      locations: result.locations.length,
      items: result.items.length,
      topics: result.topics.length
    });

    return result;
  } catch (error: any) {
    console.error('[IMAGE SEARCH] Error in AI keyword extraction:', error.message);
    // Fallback to simple extraction
    const simpleKeywords = extractKeywordsSimple(postContent, gameTitle, forumCategory);
    return {
      characters: [],
      locations: [],
      items: [],
      topics: simpleKeywords,
      gameTitle: gameTitle
    };
  }
}

/**
 * Extract keywords from post content using simple pattern matching
 * Phase 1: Basic pattern matching (fallback when AI extraction fails)
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
