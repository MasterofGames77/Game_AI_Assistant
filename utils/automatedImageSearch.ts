import axios from 'axios';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { ImageSearchCache } from '../types';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

/**
 * Options for image search
 */
export interface ImageSearchOptions {
  gameTitle: string;
  keywords: string[] | { characters?: string[]; locations?: string[]; items?: string[]; topics?: string[] };
  postContent?: string;
  forumCategory?: string;
  maxResults?: number;
}

/**
 * Result from image search
 */
export interface ImageSearchResult {
  url: string;
  thumbnailUrl: string;
  title: string;
  width: number;
  height: number;
  relevanceScore?: number;
}

/**
 * Get cache file path
 */
function getCacheFilePath(): string {
  return path.join(process.cwd(), 'data', 'automated-users', 'image-search-cache.json');
}

/**
 * Load image search cache from file
 */
function loadImageSearchCache(): ImageSearchCache {
  const cachePath = getCacheFilePath();
  
  try {
    if (fs.existsSync(cachePath)) {
      const content = fs.readFileSync(cachePath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('[IMAGE SEARCH] Error loading cache:', error);
  }
  
  return {
    cache: {},
    metadata: {
      lastUpdated: new Date().toISOString(),
      totalCached: 0,
      cacheHits: 0,
      cacheMisses: 0
    }
  };
}

/**
 * Save image search cache to file
 */
function saveImageSearchCache(cache: ImageSearchCache): void {
  const cachePath = getCacheFilePath();
  
  try {
    // Ensure directory exists
    const cacheDir = path.dirname(cachePath);
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    
    cache.metadata.lastUpdated = new Date().toISOString();
    fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), 'utf-8');
  } catch (error) {
    console.error('[IMAGE SEARCH] Error saving cache:', error);
  }
}

/**
 * Normalize game title for cache key
 */
function normalizeGameTitle(gameTitle: string): string {
  return gameTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Normalize keywords for cache key
 */
function normalizeKeywords(keywords: string[]): string {
  return keywords
    .map(k => k.toLowerCase().replace(/[^a-z0-9]+/g, '-'))
    .filter(k => k.length > 0)
    .join('-');
}

/**
 * Check cache for existing search results
 * Supports both Phase 1 (string array) and Phase 2 (structured keywords)
 */
export function getCachedImageSearch(
  gameTitle: string,
  keywords: string[] | { characters?: string[]; locations?: string[]; items?: string[]; topics?: string[] }
): string | null {
  const cache = loadImageSearchCache();
  const normalizedGame = normalizeGameTitle(gameTitle);
  
  // Normalize keywords (handle both formats)
  let normalizedKeywords: string;
  if (Array.isArray(keywords)) {
    // Phase 1 format
    normalizedKeywords = normalizeKeywords(keywords);
  } else {
    // Phase 2 format - combine all keywords
    const allKeywords = [
      ...(keywords.characters || []),
      ...(keywords.locations || []),
      ...(keywords.items || []),
      ...(keywords.topics || [])
    ];
    normalizedKeywords = normalizeKeywords(allKeywords);
  }
  
  if (cache.cache[normalizedGame] && cache.cache[normalizedGame][normalizedKeywords]) {
    const cachedPath = cache.cache[normalizedGame][normalizedKeywords];
    
    // Check if cached path is from a YouTube thumbnail (invalidate if so)
    // This handles cases where old YouTube thumbnails were cached before filtering was added
    const pathLower = cachedPath.toLowerCase();
    if (pathLower.includes('ytimg') || pathLower.includes('youtube') || pathLower.includes('youtu.be')) {
      console.log(`[IMAGE SEARCH] Invalidating cached YouTube thumbnail: ${cachedPath}`);
      delete cache.cache[normalizedGame][normalizedKeywords];
      saveImageSearchCache(cache);
      return null;
    }
    
    // Verify file exists (if local path)
    if (cachedPath.startsWith('/') || cachedPath.startsWith('./')) {
      const fullPath = path.join(process.cwd(), 'public', cachedPath);
      if (fs.existsSync(fullPath)) {
        // Additional check: verify the filename doesn't suggest it's from a problematic source
        const filename = path.basename(cachedPath).toLowerCase();
        
        // If filename contains indicators of let's play content, invalidate
        const problematicPatterns = [
          /part\s*\d+/i,
          /episode\s*\d+/i,
          /ep\s*\d+/i
        ];
        
        let shouldInvalidate = false;
        for (const pattern of problematicPatterns) {
          if (pattern.test(filename)) {
            console.log(`[IMAGE SEARCH] Invalidating cached image with let's play indicator in filename: ${cachedPath}`);
            shouldInvalidate = true;
            break;
          }
        }
        
        // If searching for locations (Phase 2), check if cached image is character-focused
        if (!shouldInvalidate && !Array.isArray(keywords) && keywords.locations && keywords.locations.length > 0 && !keywords.characters?.length) {
          // Check if filename suggests character/unlock content
          const characterIndicators = ['character', 'unlock', 'guide', 'how-to', 'tutorial'];
          const hasCharacterIndicator = characterIndicators.some(indicator => filename.includes(indicator));
          
          if (hasCharacterIndicator) {
            // Check if location is mentioned in filename
            let locationMentioned = false;
            for (const location of keywords.locations) {
              const locLower = location.toLowerCase().replace(/\s+/g, '-');
              if (filename.includes(locLower)) {
                locationMentioned = true;
                break;
              }
            }
            
            // If location not mentioned but character indicators present, invalidate
            if (!locationMentioned) {
              console.log(`[IMAGE SEARCH] Invalidating cached character-focused image for location search: ${cachedPath}`);
              shouldInvalidate = true;
            }
          }
        }
        
        if (shouldInvalidate) {
          delete cache.cache[normalizedGame][normalizedKeywords];
          saveImageSearchCache(cache);
          return null;
        }
        
        cache.metadata.cacheHits++;
        saveImageSearchCache(cache);
        return cachedPath;
      } else {
        // File doesn't exist, remove from cache
        delete cache.cache[normalizedGame][normalizedKeywords];
        saveImageSearchCache(cache);
      }
    } else {
      // Cloud URL - check if it's a YouTube URL
      if (cachedPath.includes('ytimg.com') || cachedPath.includes('youtube.com') || cachedPath.includes('youtu.be')) {
        console.log(`[IMAGE SEARCH] Invalidating cached YouTube thumbnail URL: ${cachedPath}`);
        delete cache.cache[normalizedGame][normalizedKeywords];
        saveImageSearchCache(cache);
        return null;
      }
      
      // Cloud URL, assume it's valid
      cache.metadata.cacheHits++;
      saveImageSearchCache(cache);
      return cachedPath;
    }
  }
  
  cache.metadata.cacheMisses++;
  saveImageSearchCache(cache);
  return null;
}

/**
 * Cache successful search result
 * Supports both Phase 1 (string array) and Phase 2 (structured keywords)
 */
export function cacheImageSearch(
  gameTitle: string,
  keywords: string[] | { characters?: string[]; locations?: string[]; items?: string[]; topics?: string[] },
  imagePath: string
): void {
  const cache = loadImageSearchCache();
  const normalizedGame = normalizeGameTitle(gameTitle);
  
  // Normalize keywords (handle both formats)
  let normalizedKeywords: string;
  if (Array.isArray(keywords)) {
    // Phase 1 format
    normalizedKeywords = normalizeKeywords(keywords);
  } else {
    // Phase 2 format - combine all keywords
    const allKeywords = [
      ...(keywords.characters || []),
      ...(keywords.locations || []),
      ...(keywords.items || []),
      ...(keywords.topics || [])
    ];
    normalizedKeywords = normalizeKeywords(allKeywords);
  }
  
  if (!cache.cache[normalizedGame]) {
    cache.cache[normalizedGame] = {};
  }
  
  cache.cache[normalizedGame][normalizedKeywords] = imagePath;
  cache.metadata.totalCached = Object.values(cache.cache).reduce(
    (sum, gameCache) => sum + Object.keys(gameCache).length,
    0
  );
  
  saveImageSearchCache(cache);
}

/**
 * Construct search query from game title and keywords
 * Phase 1: Simple concatenation
 * Phase 2: Enhanced with intelligent keyword prioritization
 * Excludes let's play terms to avoid YouTube thumbnails
 */
function constructSearchQuery(
  gameTitle: string,
  keywords: string[] | { characters?: string[]; locations?: string[]; items?: string[]; topics?: string[] }
): string {
  // If keywords is an array (Phase 1 format), use simple construction
  if (Array.isArray(keywords)) {
    const keywordStr = keywords.length > 0 ? keywords.join(' ') : '';
    // Exclude let's play terms
    const excludeTerms = '-let\'s play -lets play -walkthrough -playthrough -part -episode -youtube';
    return `${gameTitle} ${keywordStr} screenshot ${excludeTerms}`.trim();
  }
  
  // Phase 2: Use enhanced query building (already includes exclusions)
  const { buildSearchQuery } = require('./imageRelevanceVerifier');
  return buildSearchQuery(gameTitle, keywords);
}

/**
 * Calculate relevance score for an image result
 * Phase 2: Enhanced scoring with structured keywords
 */
function calculateRelevanceScore(
  result: any,
  gameTitle: string,
  keywords: string[] | { characters?: string[]; locations?: string[]; items?: string[]; topics?: string[] }
): number {
  // If keywords is an array (Phase 1 format), use simple scoring
  if (Array.isArray(keywords)) {
    return calculateRelevanceScoreSimple(result, gameTitle, keywords);
  }
  
  // Phase 2: Use enhanced verification
  const { verifyImageRelevance } = require('./imageRelevanceVerifier');
  const verification = verifyImageRelevance(
    result.link || result.url || '',
    result.title || '',
    gameTitle,
    keywords
  );
  
  return verification.confidence;
}

/**
 * Simple relevance scoring (Phase 1 fallback)
 */
function calculateRelevanceScoreSimple(
  result: any,
  gameTitle: string,
  keywords: string[]
): number {
  let score = 0;
  const titleLower = (result.title || '').toLowerCase();
  const linkLower = (result.link || '').toLowerCase();
  const snippetLower = (result.snippet || '').toLowerCase();
  
  const gameTitleLower = gameTitle.toLowerCase();
  
  // Penalize YouTube thumbnails and let's play videos (strong penalty)
  const youtubeIndicators = [
    'i.ytimg.com', 'ytimg.com', 'youtube.com', 'youtu.be',
    'part ', 'episode ', 'ep ', 'let\'s play', 'lets play', 'walkthrough',
    'playthrough', 'gameplay video'
  ];
  for (const indicator of youtubeIndicators) {
    if (linkLower.includes(indicator) || titleLower.includes(indicator)) {
      score -= 50; // Strong penalty
      break;
    }
  }
  
  // Check for let's play patterns in title
  const letsPlayPatterns = [
    /\bpart\s+\d+/i,
    /\bepisode\s+\d+/i,
    /\bep\s+\d+/i,
    /\blet'?s\s+play/i,
    /\bwalkthrough/i,
    /\bplaythrough/i
  ];
  for (const pattern of letsPlayPatterns) {
    if (pattern.test(titleLower)) {
      score -= 40; // Penalty
      break;
    }
  }
  
  // Game title in title: +50 points
  if (titleLower.includes(gameTitleLower)) {
    score += 50;
  }
  
  // Game title in URL: +40 points
  if (linkLower.includes(gameTitleLower)) {
    score += 40;
  }
  
  // Game title in snippet: +20 points
  if (snippetLower.includes(gameTitleLower)) {
    score += 20;
  }
  
  // Keywords in title: +30 points per keyword
  for (const keyword of keywords) {
    const keywordLower = keyword.toLowerCase();
    if (titleLower.includes(keywordLower)) {
      score += 30;
    }
    // Keywords in URL: +20 points per keyword
    if (linkLower.includes(keywordLower)) {
      score += 20;
    }
  }
  
  return score;
}

/**
 * Search for images using Google Custom Search JSON API
 */
export async function searchGameImage(
  options: ImageSearchOptions
): Promise<ImageSearchResult | null> {
  const {
    gameTitle,
    keywords,
    maxResults = 10
  } = options;
  
  const apiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
  const engineId = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID;
  
  if (!apiKey || !engineId) {
    console.warn('[IMAGE SEARCH] Google Custom Search API not configured. Missing API key or Engine ID.');
    return null;
  }
  
  // Construct search query
  const searchQuery = constructSearchQuery(gameTitle, keywords);
  
  try {
    const searchUrl = 'https://www.googleapis.com/customsearch/v1';
    const params = {
      key: apiKey,
      cx: engineId,
      q: searchQuery,
      searchType: 'image',
      num: Math.min(maxResults, 10), // Google API max is 10 per request
      safe: 'active', // Safe search
      imgSize: 'large', // Prefer larger images
      imgType: 'photo', // Prefer photos over graphics
    };
    
    console.log(`[IMAGE SEARCH] Searching Google for: "${searchQuery}"`);
    
    const response = await axios.get(searchUrl, {
      params,
      timeout: 5000, // 5 second timeout
    });
    
    if (!response.data || !response.data.items || response.data.items.length === 0) {
      console.log(`[IMAGE SEARCH] No results found for: "${searchQuery}"`);
      
      // Try progressively simpler queries if the first one fails
      const fallbackQueries: string[] = [];
      
      if (!Array.isArray(keywords)) {
        // Phase 2: Try simpler queries
        if (keywords.locations && keywords.locations.length > 0 && !keywords.characters?.length) {
          fallbackQueries.push(
            `${gameTitle} ${keywords.locations[0]} landscape screenshot`,
            `${gameTitle} ${keywords.locations[0]} screenshot`,
            `${gameTitle} ${keywords.locations[0]}`
          );
        } else if (keywords.characters && keywords.characters.length > 0) {
          fallbackQueries.push(
            `${gameTitle} ${keywords.characters[0]} screenshot`,
            `${gameTitle} ${keywords.characters[0]}`
          );
        }
      } else {
        // Phase 1: Try simpler queries
        if (keywords.length > 0) {
          fallbackQueries.push(
            `${gameTitle} ${keywords[0]} screenshot`,
            `${gameTitle} ${keywords[0]}`
          );
        }
      }
      
      // Always try the simplest query as last resort
      fallbackQueries.push(`${gameTitle} screenshot`);
      
      // Try fallback queries in order
      for (const fallbackQuery of fallbackQueries) {
        console.log(`[IMAGE SEARCH] Trying fallback query: "${fallbackQuery}"`);
        
        try {
          const fallbackParams = {
            ...params,
            q: fallbackQuery
          };
          
          const fallbackResponse = await axios.get(searchUrl, {
            params: fallbackParams,
            timeout: 5000,
          });
          
          if (fallbackResponse.data && fallbackResponse.data.items && fallbackResponse.data.items.length > 0) {
            console.log(`[IMAGE SEARCH] Fallback query "${fallbackQuery}" found ${fallbackResponse.data.items.length} results`);
            // Continue with the fallback query results
            response.data = fallbackResponse.data;
            break; // Use first successful fallback
          }
        } catch (fallbackError) {
          console.log(`[IMAGE SEARCH] Fallback query "${fallbackQuery}" failed, trying next...`);
          continue;
        }
      }
      
      // If all fallback queries failed, return null
      if (!response.data || !response.data.items || response.data.items.length === 0) {
        console.log(`[IMAGE SEARCH] All queries failed, returning null`);
        return null;
      }
    }
    
    // Score and sort results by relevance
    const scoredResults = response.data.items.map((item: any) => ({
      item,
      score: calculateRelevanceScore(item, gameTitle, keywords)
    }));
    
    // Filter out YouTube thumbnails and let's play videos
    const filteredResults = scoredResults.filter((result: { item: any; score: number }) => {
      const url = (result.item.link || result.item.url || '').toLowerCase();
      const title = (result.item.title || '').toLowerCase();
      
      // Don't completely exclude YouTube - allow if content is relevant
      // YouTube screenshots can be acceptable if the main content is prominent
      // The relevance scoring will handle penalties for YouTube content
      
      // Exclude let's play indicators in title
      const letsPlayPatterns = [
        /\bpart\s+\d+/i,  // "Part 76", "Part 1"
        /\bepisode\s+\d+/i,  // "Episode 5"
        /\bep\s+\d+/i,  // "EP 10"
        /\blet'?s\s+play/i,
        /\bwalkthrough/i,
        /\bplaythrough/i
      ];
      
      for (const pattern of letsPlayPatterns) {
        if (pattern.test(title)) {
          console.log(`[IMAGE SEARCH] Filtered out let's play video: ${result.item.title}`);
          return false;
        }
      }
      
      // If searching for locations (Phase 2 with structured keywords), filter out guide sites
      // But allow Fandom wikis and map images (maps are still pictures of the region)
      if (!Array.isArray(keywords) && keywords.locations && keywords.locations.length > 0 && !keywords.characters?.length) {
        // Don't filter out map images - they're still pictures of the region
        // The relevance scoring will handle prioritizing landscapes over maps
        
        // Exclude specific guide sites that often have UI overlays (but not Fandom wikis)
        const problematicGuideSites = [
          'gamewith', 'game8', 'gamefaqs', 'strategywiki'
        ];
        
        // Check for problematic guide sites
        for (const site of problematicGuideSites) {
          if (url.includes(site)) {
            // Only exclude if location is not mentioned in the URL/title
            let locationMentioned = false;
            for (const location of keywords.locations) {
              if (url.includes(location.toLowerCase().replace(/\s+/g, '-')) || 
                  title.includes(location.toLowerCase())) {
                locationMentioned = true;
                break;
              }
            }
            
            if (!locationMentioned) {
              console.log(`[IMAGE SEARCH] Filtered out guide site (likely has UI overlays): ${result.item.link}`);
              return false;
            }
          }
        }
        
        // For other guide indicators, be more selective - only exclude if they're clearly character/unlock guides
        const characterGuideIndicators = [
          'how to unlock', 'character guide', 'unlock guide', 'character unlock'
        ];
        
        for (const indicator of characterGuideIndicators) {
          if (title.includes(indicator)) {
            // Only exclude if location is not mentioned
            let locationMentioned = false;
            for (const location of keywords.locations) {
              if (url.includes(location.toLowerCase().replace(/\s+/g, '-')) || 
                  title.includes(location.toLowerCase())) {
                locationMentioned = true;
                break;
              }
            }
            
            if (!locationMentioned) {
              console.log(`[IMAGE SEARCH] Filtered out character unlock guide: ${result.item.title}`);
              return false;
            }
          }
        }
      }
      
      return true;
    });
    
    if (filteredResults.length === 0) {
      console.log(`[IMAGE SEARCH] All results filtered out (YouTube/let's play). No clean screenshots found for "${searchQuery}"`);
      return null;
    }
    
    // Sort by score (highest first)
    filteredResults.sort((a: { item: any; score: number }, b: { item: any; score: number }) => b.score - a.score);
    
    // For Phase 2 (structured keywords), filter out results below threshold
    // For Phase 1 (array keywords), we'll still return low scores as fallback
    const isPhase2 = !Array.isArray(keywords);
    if (isPhase2) {
      // Filter to only results that meet minimum threshold
      const thresholdResults = filteredResults.filter((result: { item: any; score: number }) => result.score >= 40);
      
      if (thresholdResults.length === 0) {
        console.log(`[IMAGE SEARCH] No results meet minimum relevance threshold (40) for "${searchQuery}"`);
        return null;
      }
      
      // Use threshold-filtered results
      filteredResults.length = 0;
      filteredResults.push(...thresholdResults);
    }
    
    // Get best result
    const bestResult = filteredResults[0];
    const item = bestResult.item;
    
    // Minimum relevance threshold: 40 points
    if (bestResult.score < 40) {
      console.log(`[IMAGE SEARCH] Best result has low relevance score: ${bestResult.score} for "${searchQuery}"`);
      // For Phase 1, still return it as fallback
      // For Phase 2, this shouldn't happen due to filtering above
      if (isPhase2) {
        console.log(`[IMAGE SEARCH] Warning: Phase 2 result below threshold was not filtered (this shouldn't happen)`);
        return null;
      }
    }
    
    const result: ImageSearchResult = {
      url: item.link,
      thumbnailUrl: item.image?.thumbnailLink || item.link,
      title: item.title || '',
      width: item.image?.width || 0,
      height: item.image?.height || 0,
      relevanceScore: bestResult.score
    };
    
    console.log(`[IMAGE SEARCH] Found image: ${result.url} (relevance: ${bestResult.score})`);
    
    return result;
  } catch (error: any) {
    if (error.response) {
      console.error(`[IMAGE SEARCH] Google API error: ${error.response.status} - ${error.response.data?.error?.message || 'Unknown error'}`);
    } else if (error.request) {
      console.error('[IMAGE SEARCH] Google API request failed (no response)');
    } else {
      console.error(`[IMAGE SEARCH] Error: ${error.message}`);
    }
    return null;
  }
}

/**
 * Search for images using Unsplash API (fallback)
 */
export async function searchGameImageUnsplash(
  options: ImageSearchOptions
): Promise<ImageSearchResult | null> {
  const {
    gameTitle,
    keywords,
    maxResults = 10
  } = options;
  
  const apiKey = process.env.UNSPLASH_ACCESS_KEY;
  
  if (!apiKey) {
    console.warn('[IMAGE SEARCH] Unsplash API not configured. Missing access key.');
    return null;
  }
  
  const searchQuery = constructSearchQuery(gameTitle, keywords);
  
  try {
    const searchUrl = 'https://api.unsplash.com/search/photos';
    const params = {
      query: searchQuery,
      per_page: Math.min(maxResults, 30),
      orientation: 'landscape', // Prefer landscape for game screenshots
    };
    
    console.log(`[IMAGE SEARCH] Searching Unsplash for: "${searchQuery}"`);
    
    const response = await axios.get(searchUrl, {
      params,
      headers: {
        'Authorization': `Client-ID ${apiKey}`
      },
      timeout: 5000,
    });
    
    if (!response.data || !response.data.results || response.data.results.length === 0) {
      console.log(`[IMAGE SEARCH] No Unsplash results found for: "${searchQuery}"`);
      return null;
    }
    
    // Get first result
    const item = response.data.results[0];
    
    const result: ImageSearchResult = {
      url: item.urls?.regular || item.urls?.full || item.urls?.raw,
      thumbnailUrl: item.urls?.thumb || item.urls?.small,
      title: item.description || item.alt_description || '',
      width: item.width || 0,
      height: item.height || 0,
      relevanceScore: 30 // Lower score for stock photos
    };
    
    console.log(`[IMAGE SEARCH] Found Unsplash image: ${result.url}`);
    
    return result;
  } catch (error: any) {
    if (error.response) {
      console.error(`[IMAGE SEARCH] Unsplash API error: ${error.response.status} - ${error.response.data?.errors?.[0] || 'Unknown error'}`);
    } else {
      console.error(`[IMAGE SEARCH] Unsplash error: ${error.message}`);
    }
    return null;
  }
}
