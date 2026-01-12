/**
 * Image Relevance Verification
 * Phase 2: Enhanced verification using filename/URL analysis
 * Phase 3: Will add AI vision verification (optional)
 */

/**
 * Verification result
 */
export interface VerificationResult {
  isRelevant: boolean;
  confidence: number; // 0-100
  reason: string;
}

/**
 * Verify image relevance using filename/URL analysis
 * @param imageUrl - URL of the image
 * @param imageTitle - Title/description of the image
 * @param gameTitle - Game title
 * @param keywords - Extracted keywords (characters, locations, items, topics)
 * @returns Verification result with confidence score
 */
export function verifyImageRelevance(
  imageUrl: string,
  imageTitle: string,
  gameTitle: string,
  keywords: {
    characters?: string[];
    locations?: string[];
    items?: string[];
    topics?: string[];
  }
): VerificationResult {
  let score = 0;
  const reasons: string[] = [];
  
  const urlLower = imageUrl.toLowerCase();
  const titleLower = (imageTitle || '').toLowerCase();
  const gameTitleLower = gameTitle.toLowerCase();
  
  // Extract filename from URL
  const urlParts = imageUrl.split('/');
  const filename = urlParts[urlParts.length - 1].split('?')[0].toLowerCase();
  
  // Check for game title in URL (strong indicator)
  if (urlLower.includes(gameTitleLower) || filename.includes(gameTitleLower.replace(/\s+/g, '-'))) {
    score += 50;
    reasons.push('Game title found in URL/filename');
  }
  
  // Check for game title in title
  if (titleLower.includes(gameTitleLower)) {
    score += 40;
    reasons.push('Game title found in image title');
  }
  
  // Early penalty check: If searching for locations but title suggests character/unlock/map content, apply penalty early
  if (keywords.locations && keywords.locations.length > 0 && !keywords.characters?.length) {
    const characterIndicators = ['unlock', 'character', 'guide', 'how to', 'tutorial'];
    const hasCharacterIndicator = characterIndicators.some(indicator => titleLower.includes(indicator));
    
    // Check for map indicators (we want landscapes, not maps)
    const mapIndicators = ['map', 'marker', 'markers', 'fast travel', 'waypoint', 'area map', 'region map'];
    const hasMapIndicator = mapIndicators.some(indicator => titleLower.includes(indicator) || urlLower.includes(indicator));
    
    if (hasCharacterIndicator) {
      // Check if location is actually mentioned
      let locationMentioned = false;
      for (const location of keywords.locations) {
        if (titleLower.includes(location.toLowerCase()) || urlLower.includes(location.toLowerCase().replace(/\s+/g, '-'))) {
          locationMentioned = true;
          break;
        }
      }
      
      // If location not mentioned but character indicators present, apply penalty
      if (!locationMentioned) {
        score -= 25; // Stronger penalty for character guides when searching for locations
        reasons.push('Location search returned character/unlock guide (penalty)');
      }
    }
    
    // Reduced penalty for map images - they're still pictures of the region, just not ideal
    // Only apply penalty for map guides, not all map images
    if (hasMapIndicator) {
      // Check if it's clearly a map guide (not just mentioning "map" in passing)
      const mapGuideIndicators = ['how to place', 'place marker', 'map marker guide'];
      const isMapGuide = mapGuideIndicators.some(indicator => titleLower.includes(indicator));
      
      if (isMapGuide) {
        score -= 15; // Small penalty for map guides, but allow them as fallback
        reasons.push('Location search returned map guide (minor penalty, but acceptable as fallback)');
      } else if (titleLower.includes('map') && !titleLower.includes('screenshot') && !titleLower.includes('landscape')) {
        // Regular map images get a small penalty but are still acceptable
        score -= 10;
        reasons.push('Location search returned map image (minor penalty, but acceptable as fallback)');
      }
    }
  }
  
  // Check for characters in URL/filename
  if (keywords.characters && keywords.characters.length > 0) {
    for (const character of keywords.characters) {
      const charLower = character.toLowerCase().replace(/\s+/g, '-');
      if (urlLower.includes(charLower) || filename.includes(charLower)) {
        score += 30;
        reasons.push(`Character "${character}" found in URL/filename`);
        break; // Only count first match
      }
      if (titleLower.includes(character.toLowerCase())) {
        score += 20;
        reasons.push(`Character "${character}" found in title`);
        break;
      }
    }
  }
  
  // Check for locations in URL/filename (higher weight for location searches)
  if (keywords.locations && keywords.locations.length > 0) {
    let locationFound = false;
    for (const location of keywords.locations) {
      const locLower = location.toLowerCase().replace(/\s+/g, '-');
      if (urlLower.includes(locLower) || filename.includes(locLower)) {
        score += 35; // Increased from 25 for location searches
        reasons.push(`Location "${location}" found in URL/filename`);
        locationFound = true;
        break;
      }
      if (titleLower.includes(location.toLowerCase())) {
        score += 25; // Increased from 15 for location searches
        reasons.push(`Location "${location}" found in title`);
        locationFound = true;
        break;
      }
    }
    
    // If searching for locations but location not found, penalize character-focused results
    if (!locationFound && (titleLower.includes('character') || titleLower.includes('unlock') || titleLower.includes('guide'))) {
      score -= 20; // Penalty for character guides when searching for locations
      reasons.push('Location search returned character-focused result (penalty)');
    }
    
    // Bonus for location-related terms in title/URL when searching for locations
    const locationTerms = ['landscape', 'region', 'area', 'location', 'environment', 'scenery'];
    for (const term of locationTerms) {
      if (titleLower.includes(term) || urlLower.includes(term)) {
        score += 10;
        reasons.push(`Location-related term "${term}" found`);
        break;
      }
    }
  }
  
  // Check for items in URL/filename
  if (keywords.items && keywords.items.length > 0) {
    for (const item of keywords.items) {
      const itemLower = item.toLowerCase().replace(/\s+/g, '-');
      if (urlLower.includes(itemLower) || filename.includes(itemLower)) {
        score += 20;
        reasons.push(`Item "${item}" found in URL/filename`);
        break;
      }
      if (titleLower.includes(item.toLowerCase())) {
        score += 10;
        reasons.push(`Item "${item}" found in title`);
        break;
      }
    }
  }
  
  // Check for topics in URL/filename/title
  if (keywords.topics && keywords.topics.length > 0) {
    for (const topic of keywords.topics) {
      const topicLower = topic.toLowerCase().replace(/\s+/g, '-');
      if (urlLower.includes(topicLower) || filename.includes(topicLower) || titleLower.includes(topic.toLowerCase())) {
        score += 15;
        reasons.push(`Topic "${topic}" found`);
        break;
      }
    }
  }
  
  // Reduced penalty for YouTube thumbnails - allow them if content is still relevant
  // Only apply penalty if it's clearly a let's play/walkthrough video
  const youtubeUrlIndicators = ['i.ytimg.com', 'ytimg.com', 'youtube.com', 'youtu.be'];
  const isYouTubeUrl = youtubeUrlIndicators.some(indicator => urlLower.includes(indicator));
  
  // Check for let's play/walkthrough indicators in title (these are less relevant)
  const letsPlayTitleIndicators = [
    ///\bpart\s+\d+/i,  // "Part 76", "Part 1", etc.
    /\bepisode\s+\d+/i,  // "Episode 5"
    /\bep\s+\d+/i,  // "EP 10"
    /\blet'?s\s+play/i,  // "Let's Play"
    /\bwalkthrough/i,
    /\bplaythrough/i,
    /\bgameplay\s+video/i
  ];
  
  const hasLetsPlayTitle = letsPlayTitleIndicators.some(pattern => pattern.test(titleLower));
  
  // Apply reduced penalty for YouTube content - allow if content is still relevant
  if (isYouTubeUrl || hasLetsPlayTitle) {
    // Check if location/character keywords are present (suggests relevant content)
    let hasRelevantContent = false;
    
    if (keywords.locations && keywords.locations.length > 0) {
      for (const location of keywords.locations) {
        if (titleLower.includes(location.toLowerCase()) || urlLower.includes(location.toLowerCase().replace(/\s+/g, '-'))) {
          hasRelevantContent = true;
          break;
        }
      }
    }
    
    if (keywords.characters && keywords.characters.length > 0) {
      for (const character of keywords.characters) {
        if (titleLower.includes(character.toLowerCase()) || urlLower.includes(character.toLowerCase().replace(/\s+/g, '-'))) {
          hasRelevantContent = true;
          break;
        }
      }
    }
    
    // Apply smaller penalty if content is relevant, larger if it's just a generic let's play
    if (hasRelevantContent) {
      score -= 10; // Very small penalty for YouTube but allow if content is relevant
      reasons.push('YouTube/let\'s play content detected but relevant keywords found (minor penalty)');
    } else if (hasLetsPlayTitle) {
      score -= 25; // Medium penalty for generic let's play videos
      reasons.push('Let\'s play/walkthrough video detected (moderate penalty)');
    } else if (isYouTubeUrl) {
      score -= 15; // Small penalty for YouTube URLs without clear let's play indicators
      reasons.push('YouTube source detected (minor penalty)');
    }
  }
  
  // Penalize common stock photo indicators
  const stockPhotoIndicators = ['unsplash', 'pexels', 'pixabay', 'shutterstock', 'getty', 'stock-photo', 'stock-image'];
  for (const indicator of stockPhotoIndicators) {
    if (urlLower.includes(indicator)) {
      score -= 10; // Small penalty, but don't disqualify
      reasons.push('Stock photo source detected (minor penalty)');
      break;
    }
  }
  
  // Minimum threshold: 40 points for relevance
  // But if score is negative due to YouTube/let's play penalties, mark as not relevant
  const isRelevant = score >= 40 && score > 0;
  const confidence = Math.min(100, Math.max(0, score));
  
  return {
    isRelevant,
    confidence,
    reason: reasons.length > 0 ? reasons.join('; ') : 'No matching keywords found'
  };
}

/**
 * Build search query from extracted keywords
 * Prioritizes characters > locations > items > topics
 * Excludes let's play terms to avoid YouTube thumbnails
 * @param gameTitle - Game title
 * @param keywords - Extracted keywords
 * @returns Optimized search query string
 */
export function buildSearchQuery(
  gameTitle: string,
  keywords: {
    characters?: string[];
    locations?: string[];
    items?: string[];
    topics?: string[];
  }
): string {
  const queryParts: string[] = [gameTitle];
  
  // Prioritize characters (most specific)
  if (keywords.characters && keywords.characters.length > 0) {
    queryParts.push(keywords.characters[0]); // Use first character
  }
  
  // Add locations if no character (locations are very specific too)
  if (keywords.locations && keywords.locations.length > 0 && !keywords.characters?.length) {
    queryParts.push(keywords.locations[0]);
    // Add location-specific terms to improve results
    queryParts.push('landscape', 'screenshot');
  }
  
  // Add items if no character or location
  if (keywords.items && keywords.items.length > 0 && !keywords.characters?.length && !keywords.locations?.length) {
    queryParts.push(keywords.items[0]);
  }
  
  // Add topics (always include if available, but prioritize location-related topics)
  if (keywords.topics && keywords.topics.length > 0) {
    // If we have locations, prefer location-related topics
    const locationTopics = keywords.topics.filter(t => 
      ['location', 'locations', 'region', 'area', 'landscape', 'landscapes'].includes(t.toLowerCase())
    );
    
    if (locationTopics.length > 0 && keywords.locations && keywords.locations.length > 0) {
      // Don't add redundant location topics if we already have location keywords
      // Just add non-location topics
      const otherTopics = keywords.topics.filter(t => 
        !['location', 'locations', 'region', 'area', 'landscape', 'landscapes'].includes(t.toLowerCase())
      );
      if (otherTopics.length > 0) {
        queryParts.push(otherTopics[0]);
      }
    } else {
      // Use first topic, or combine if short
      const topicStr = keywords.topics.slice(0, 2).join(' ');
      if (topicStr.length < 30) {
        queryParts.push(topicStr);
      } else {
        queryParts.push(keywords.topics[0]);
      }
    }
  }
  
  // Add "screenshot" for better results (if not already added for locations)
  if (!(keywords.locations && keywords.locations.length > 0 && !keywords.characters?.length)) {
    queryParts.push('screenshot');
  }
  
  // Keep search query simple - rely on relevance scoring and filtering instead of heavy exclusions
  // Too many exclusions make the query too restrictive and return no results
  // Don't exclude map markers - even map images are at least pictures of the region
  // Let the relevance scoring handle filtering based on what we actually want
  
  return queryParts.join(' ').trim();
}
