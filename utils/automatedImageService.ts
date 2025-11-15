import fs from 'fs';
import path from 'path';
import { ImageMapping, ImageUsage } from '../types';

/**
 * Sanitize game title for use in file paths
 */
function sanitizeGameTitle(gameTitle: string): string {
  return gameTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Load image mapping from JSON file
 */
function loadImageMapping(): ImageMapping {
  const mappingPath = path.join(process.cwd(), 'data', 'automated-users', 'image-mapping.json');
  
  try {
    if (fs.existsSync(mappingPath)) {
      const content = fs.readFileSync(mappingPath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('Error loading image mapping:', error);
  }
  
  return { games: {} };
}

/**
 * Save image mapping to JSON file
 */
function saveImageMapping(mapping: ImageMapping): void {
  const mappingPath = path.join(process.cwd(), 'data', 'automated-users', 'image-mapping.json');
  
  try {
    fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving image mapping:', error);
    throw error;
  }
}

/**
 * Get image directory path for a game
 */
function getGameImageDirectory(gameTitle: string): string {
  const sanitizedTitle = sanitizeGameTitle(gameTitle);
  return path.join(process.cwd(), 'public', 'uploads', 'automated-images', sanitizedTitle);
}

/**
 * Find images for a game from the curated library
 * Returns the image path if found, null otherwise
 */
export function findGameImage(gameTitle: string): string | null {
  const mapping = loadImageMapping();
  
  // Check if game exists in mapping
  if (mapping.games[gameTitle] && mapping.games[gameTitle].images.length > 0) {
    const images = mapping.games[gameTitle].images;
    
    // Use primary image if available, otherwise pick random
    if (mapping.games[gameTitle].primary) {
      const primaryPath = path.join(process.cwd(), 'public', mapping.games[gameTitle].primary!);
      if (fs.existsSync(primaryPath)) {
        return mapping.games[gameTitle].primary!;
      }
    }
    
    // Try to find any existing image
    for (const imagePath of images) {
      const fullPath = path.join(process.cwd(), 'public', imagePath);
      if (fs.existsSync(fullPath)) {
        return imagePath;
      }
    }
  }
  
  // Fallback: Check if directory exists and has images
  const gameDir = getGameImageDirectory(gameTitle);
  if (fs.existsSync(gameDir)) {
    const files = fs.readdirSync(gameDir);
    const imageFiles = files.filter(file => 
      /\.(jpg|jpeg|png|gif|webp)$/i.test(file)
    );
    
    if (imageFiles.length > 0) {
      // Return first image found
      const sanitizedTitle = sanitizeGameTitle(gameTitle);
      const imagePath = `/uploads/automated-images/${sanitizedTitle}/${imageFiles[0]}`;
      
      // Update mapping for future use
      if (!mapping.games[gameTitle]) {
        mapping.games[gameTitle] = { images: [] };
      }
      if (!mapping.games[gameTitle].images.includes(imagePath)) {
        mapping.games[gameTitle].images.push(imagePath);
        mapping.games[gameTitle].primary = imagePath;
        saveImageMapping(mapping);
      }
      
      return imagePath;
    }
  }
  
  // Also check if image is directly in automated-images directory (without subdirectory)
  const baseDir = path.join(process.cwd(), 'public', 'uploads', 'automated-images');
  if (fs.existsSync(baseDir)) {
    const files = fs.readdirSync(baseDir);
    const sanitizedTitle = sanitizeGameTitle(gameTitle);
    const imageFiles = files.filter(file => {
      if (!/\.(jpg|jpeg|png|gif|webp)$/i.test(file)) return false;
      
      const fileBaseName = path.parse(file).name.toLowerCase();
      const expectedBaseName = sanitizedTitle.toLowerCase();
      
      // Remove common suffixes like "-1", "-2", etc. from filename for matching
      const fileBaseNameClean = fileBaseName.replace(/-\d+$/, '');
      const expectedBaseNameClean = expectedBaseName.replace(/-\d+$/, '');
      
      // Exact match
      if (fileBaseName === expectedBaseName || fileBaseNameClean === expectedBaseNameClean) {
        return true;
      }
      
      // Check if file starts with expected name (handles "crash-n-sane-trilogy-1" matching "crash-bandicoot-n-sane-trilogy")
      // or if expected name starts with file name (handles "jak-and-daxter" matching "jak-and-daxter-the-precursor-legacy")
      if (fileBaseNameClean.startsWith(expectedBaseNameClean) || expectedBaseNameClean.startsWith(fileBaseNameClean)) {
        return true;
      }
      
      // Check if key words match (for cases like "euro-truck-simulator2" vs "euro-truck-simulator-2")
      const fileWords = fileBaseNameClean.split('-').filter(w => w.length > 2);
      const expectedWords = expectedBaseNameClean.split('-').filter(w => w.length > 2);
      const matchingWords = fileWords.filter(w => expectedWords.includes(w));
      if (matchingWords.length >= Math.min(3, Math.max(fileWords.length, expectedWords.length)) * 0.7) {
        return true;
      }
      
      return false;
    });
    
    if (imageFiles.length > 0) {
      // Return first matching image
      const imagePath = `/uploads/automated-images/${imageFiles[0]}`;
      
      // Update mapping for future use
      if (!mapping.games[gameTitle]) {
        mapping.games[gameTitle] = { images: [] };
      }
      if (!mapping.games[gameTitle].images.includes(imagePath)) {
        mapping.games[gameTitle].images.push(imagePath);
        mapping.games[gameTitle].primary = imagePath;
        saveImageMapping(mapping);
      }
      
      return imagePath;
    }
  }
  
  return null;
}

function loadImageUsage(): ImageUsage {
  const usagePath = path.join(process.cwd(), 'data', 'automated-users', 'image-usage.json');
  
  try {
    if (fs.existsSync(usagePath)) {
      const content = fs.readFileSync(usagePath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('Error loading image usage:', error);
  }
  
  return { usage: {} };
}

/**
 * Save image usage tracking to JSON file
 */
function saveImageUsage(usage: ImageUsage): void {
  const usagePath = path.join(process.cwd(), 'data', 'automated-users', 'image-usage.json');
  
  try {
    fs.writeFileSync(usagePath, JSON.stringify(usage, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving image usage:', error);
    throw error;
  }
}

/**
 * Get a random image for a game that hasn't been used by this user before
 * @param gameTitle - The game title
 * @param username - The automated user's username (to track usage)
 * @returns Image path or null if no unused image available
 */
export function getRandomGameImage(gameTitle: string, username?: string): string | null {
  const mapping = loadImageMapping();
  const usage = loadImageUsage();
  
  // Get all available images for this game
  let availableImages: string[] = [];
  
  // First, check mapping for registered images
  if (mapping.games[gameTitle] && mapping.games[gameTitle].images.length > 0) {
    availableImages = mapping.games[gameTitle].images.filter(img => {
      const fullPath = path.join(process.cwd(), 'public', img);
      return fs.existsSync(fullPath);
    });
  }
  
  // Also scan file system for additional images that might not be in mapping
  // This ensures we find all images even if mapping is incomplete
  const baseDir = path.join(process.cwd(), 'public', 'uploads', 'automated-images');
  if (fs.existsSync(baseDir)) {
    const files = fs.readdirSync(baseDir);
    const sanitizedTitle = sanitizeGameTitle(gameTitle);
    
    const fileSystemImages = files.filter(file => {
      if (!/\.(jpg|jpeg|png|gif|webp)$/i.test(file)) return false;
      
      const fileBaseName = path.parse(file).name.toLowerCase();
      const expectedBaseName = sanitizedTitle.toLowerCase();
      
      // Remove common suffixes like "-1", "-2", etc. from filename for matching
      const fileBaseNameClean = fileBaseName.replace(/-\d+$/, '');
      const expectedBaseNameClean = expectedBaseName.replace(/-\d+$/, '');
      
      // Exact match
      if (fileBaseName === expectedBaseName || fileBaseNameClean === expectedBaseNameClean) {
        return true;
      }
      
      // Check if file starts with expected name or vice versa
      if (fileBaseNameClean.startsWith(expectedBaseNameClean) || expectedBaseNameClean.startsWith(fileBaseNameClean)) {
        return true;
      }
      
      // Check if key words match
      const fileWords = fileBaseNameClean.split('-').filter(w => w.length > 2);
      const expectedWords = expectedBaseNameClean.split('-').filter(w => w.length > 2);
      const matchingWords = fileWords.filter(w => expectedWords.includes(w));
      if (matchingWords.length >= Math.min(3, Math.max(fileWords.length, expectedWords.length)) * 0.7) {
        return true;
      }
      
      return false;
    }).map(file => `/uploads/automated-images/${file}`);
    
    // Merge file system images with mapping images, removing duplicates
    const allImagesSet = new Set([...availableImages, ...fileSystemImages]);
    availableImages = Array.from(allImagesSet);
    
    // Update mapping if we found new images
    if (fileSystemImages.length > 0 && (!mapping.games[gameTitle] || mapping.games[gameTitle].images.length < fileSystemImages.length)) {
      if (!mapping.games[gameTitle]) {
        mapping.games[gameTitle] = { images: [] };
      }
      fileSystemImages.forEach(img => {
        if (!mapping.games[gameTitle].images.includes(img)) {
          mapping.games[gameTitle].images.push(img);
        }
      });
      if (!mapping.games[gameTitle].primary && fileSystemImages.length > 0) {
        mapping.games[gameTitle].primary = fileSystemImages[0];
      }
      saveImageMapping(mapping);
    }
  }
  
  if (availableImages.length === 0) {
    return null;
  }
  
  // If username provided, filter out images that have been used by this user for this game
  if (username) {
    const usedImages = usage.usage[username]?.[gameTitle] || [];
    const unusedImages = availableImages.filter(img => !usedImages.includes(img));
    
    // If all images have been used, return null (don't reuse images)
    if (unusedImages.length === 0) {
      return null;
    }
    
    // Return random unused image
    const randomIndex = Math.floor(Math.random() * unusedImages.length);
    return unusedImages[randomIndex];
  }
  
  // If no username provided, return random image (for backward compatibility)
  const randomIndex = Math.floor(Math.random() * availableImages.length);
  return availableImages[randomIndex];
}

/**
 * Record that an image has been used by a user for a specific game
 * @param username - The automated user's username
 * @param gameTitle - The game title
 * @param imagePath - The image path that was used
 */
export function recordImageUsage(username: string, gameTitle: string, imagePath: string): void {
  const usage = loadImageUsage();
  
  if (!usage.usage[username]) {
    usage.usage[username] = {};
  }
  
  if (!usage.usage[username][gameTitle]) {
    usage.usage[username][gameTitle] = [];
  }
  
  // Add image to used list if not already present
  if (!usage.usage[username][gameTitle].includes(imagePath)) {
    usage.usage[username][gameTitle].push(imagePath);
    saveImageUsage(usage);
  }
}

/**
 * Register a new image for a game in the mapping
 */
export function registerGameImage(gameTitle: string, imagePath: string, setAsPrimary: boolean = false): void {
  const mapping = loadImageMapping();
  
  if (!mapping.games[gameTitle]) {
    mapping.games[gameTitle] = { images: [] };
  }
  
  // Add image if not already present
  if (!mapping.games[gameTitle].images.includes(imagePath)) {
    mapping.games[gameTitle].images.push(imagePath);
  }
  
  // Set as primary if requested
  if (setAsPrimary || !mapping.games[gameTitle].primary) {
    mapping.games[gameTitle].primary = imagePath;
  }
  
  saveImageMapping(mapping);
}

/**
 * Check if an image exists for a game
 */
export function hasGameImage(gameTitle: string): boolean {
  return findGameImage(gameTitle) !== null;
}

/**
 * Get all registered games with images
 */
export function getAllGamesWithImages(): string[] {
  const mapping = loadImageMapping();
  return Object.keys(mapping.games).filter(gameTitle => {
    const gameData = mapping.games[gameTitle];
    return gameData.images.length > 0 && gameData.images.some(img => {
      const fullPath = path.join(process.cwd(), 'public', img);
      return fs.existsSync(fullPath);
    });
  });
}

