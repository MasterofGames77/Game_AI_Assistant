import fs from 'fs';
import path from 'path';
import { ImageMapping } from '../types';

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
      const fileBaseName = path.parse(file).name.toLowerCase();
      const expectedBaseName = sanitizedTitle.toLowerCase();
      return /\.(jpg|jpeg|png|gif|webp)$/i.test(file) && 
             (fileBaseName === expectedBaseName || fileBaseName.includes(expectedBaseName) || expectedBaseName.includes(fileBaseName));
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

/**
 * Get a random image for a game (if multiple images available)
 */
export function getRandomGameImage(gameTitle: string): string | null {
  const mapping = loadImageMapping();
  
  if (mapping.games[gameTitle] && mapping.games[gameTitle].images.length > 0) {
    const images = mapping.games[gameTitle].images.filter(img => {
      const fullPath = path.join(process.cwd(), 'public', img);
      return fs.existsSync(fullPath);
    });
    
    if (images.length > 0) {
      // Return random image
      const randomIndex = Math.floor(Math.random() * images.length);
      return images[randomIndex];
    }
  }
  
  // Fallback to findGameImage (which now checks both subdirectory and base directory)
  return findGameImage(gameTitle);
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

