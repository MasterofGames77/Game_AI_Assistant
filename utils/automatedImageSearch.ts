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
  keywords: string[];
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
 */
export function getCachedImageSearch(
  gameTitle: string,
  keywords: string[]
): string | null {
  const cache = loadImageSearchCache();
  const normalizedGame = normalizeGameTitle(gameTitle);
  const normalizedKeywords = normalizeKeywords(keywords);
  
  if (cache.cache[normalizedGame] && cache.cache[normalizedGame][normalizedKeywords]) {
    const cachedPath = cache.cache[normalizedGame][normalizedKeywords];
    
    // Verify file exists (if local path)
    if (cachedPath.startsWith('/') || cachedPath.startsWith('./')) {
      const fullPath = path.join(process.cwd(), 'public', cachedPath);
      if (fs.existsSync(fullPath)) {
        cache.metadata.cacheHits++;
        saveImageSearchCache(cache);
        return cachedPath;
      } else {
        // File doesn't exist, remove from cache
        delete cache.cache[normalizedGame][normalizedKeywords];
        saveImageSearchCache(cache);
      }
    } else {
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
 */
export function cacheImageSearch(
  gameTitle: string,
  keywords: string[],
  imagePath: string
): void {
  const cache = loadImageSearchCache();
  const normalizedGame = normalizeGameTitle(gameTitle);
  const normalizedKeywords = normalizeKeywords(keywords);
  
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
 */
function constructSearchQuery(gameTitle: string, keywords: string[]): string {
  const keywordStr = keywords.length > 0 ? keywords.join(' ') : '';
  const query = `${gameTitle} ${keywordStr} screenshot`.trim();
  return query;
}

/**
 * Calculate relevance score for an image result
 */
function calculateRelevanceScore(
  result: any,
  gameTitle: string,
  keywords: string[]
): number {
  let score = 0;
  const titleLower = (result.title || '').toLowerCase();
  const linkLower = (result.link || '').toLowerCase();
  const snippetLower = (result.snippet || '').toLowerCase();
  const combinedText = `${titleLower} ${linkLower} ${snippetLower}`;
  
  const gameTitleLower = gameTitle.toLowerCase();
  
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
      return null;
    }
    
    // Score and sort results by relevance
    const scoredResults = response.data.items.map((item: any) => ({
      item,
      score: calculateRelevanceScore(item, gameTitle, keywords)
    }));
    
    // Sort by score (highest first)
    scoredResults.sort((a: { item: any; score: number }, b: { item: any; score: number }) => b.score - a.score);
    
    // Get best result
    const bestResult = scoredResults[0];
    const item = bestResult.item;
    
    // Minimum relevance threshold: 50 points
    if (bestResult.score < 50) {
      console.log(`[IMAGE SEARCH] Best result has low relevance score: ${bestResult.score} for "${searchQuery}"`);
      // Still return it, but log the low score
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
