import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { moderateImage } from '../../utils/imageModeration';
import { handleImageViolation } from '../../utils/violationHandler';
import { checkUserBanStatus } from '../../utils/violationHandler';
import { getImageStorage } from '../../utils/imageStorage';

// Helper function to safely delete files on Windows (handles EBUSY errors)
const safeUnlink = async (filePath: string, maxRetries: number = 3, delay: number = 100): Promise<void> => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return; // Success
      }
      return; // File doesn't exist, nothing to do
    } catch (error: any) {
      // On Windows, EBUSY means the file is still in use
      if (error.code === 'EBUSY' && attempt < maxRetries - 1) {
        // Wait a bit and retry
        await new Promise(resolve => setTimeout(resolve, delay * (attempt + 1)));
        continue;
      }
      // If it's not EBUSY or we've exhausted retries, log and ignore
      // (file will be cleaned up later or on next server restart)
      if (error.code !== 'EBUSY') {
        console.warn(`Error deleting file ${filePath}:`, error.message);
      }
      return; // Give up gracefully
    }
  }
};

export const config = {
  api: {
    bodyParser: false,
  },
};

// Temporary upload directory for processing (before uploading to cloud storage)
// In production with cloud storage, files are uploaded then deleted
// In development, files stay in this directory
const tempUploadDir = path.join(process.cwd(), 'tmp', 'uploads');

// Ensure temp upload directory exists
if (!fs.existsSync(tempUploadDir)) {
  fs.mkdirSync(tempUploadDir, { recursive: true });
}

// Allowed image MIME types
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_DIMENSION = 2048; // Max width or height in pixels

// Validate file type by checking magic numbers (more secure than extension)
const validateImageFile = async (filePath: string): Promise<boolean> => {
  try {
    const buffer = fs.readFileSync(filePath);
    // Check magic numbers for common image formats
    const isJPEG = buffer[0] === 0xFF && buffer[1] === 0xD8;
    const isPNG = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
    const isGIF = buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46;
    const isWEBP = buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
    
    return isJPEG || isPNG || isGIF || isWEBP;
  } catch (error) {
    console.error('Error validating image file:', error);
    return false;
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Create temp uploads directory if it doesn't exist
    if (!fs.existsSync(tempUploadDir)) {
      fs.mkdirSync(tempUploadDir, { recursive: true });
    }

    const form = formidable({
      uploadDir: tempUploadDir, // Use temp directory for processing
      keepExtensions: true,
      maxFileSize: MAX_FILE_SIZE,
      maxFiles: 5, // Allow up to 5 images per post
      filename: (name, ext, part) => {
        // Create a unique filename: timestamp-random-originalname
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 9);
        const originalName = part.originalFilename || 'image';
        const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
        return `${timestamp}-${random}-${sanitizedName}${ext}`;
      }
    });

    const [fields, files] = await form.parse(req);
    const uploadedFiles = files.image || files.images || [];
    
    // Extract username from form fields
    const username = Array.isArray(fields.username) ? fields.username[0] : fields.username;
    
    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'Username is required' });
    }

    // Check if user is banned before processing
    const banStatus = await checkUserBanStatus(username);
    if (banStatus.isBanned) {
      if (banStatus.isPermanent) {
        return res.status(403).json({
          error: 'Account Suspended',
          message: 'Your account has been permanently suspended due to content violations.',
          violationResult: { action: 'permanent_ban' }
        });
      }
      return res.status(403).json({
        error: 'Account Suspended',
        message: `You are banned until ${banStatus.expiresAt}. Reason: Previous content violations.`,
        banExpiresAt: banStatus.expiresAt,
        violationResult: { action: 'banned', expiresAt: banStatus.expiresAt }
      });
    }

    if (!uploadedFiles || uploadedFiles.length === 0) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    // Process each uploaded file
    const processedImages = [];

    for (const file of uploadedFiles) {
      if (!file) continue;

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        return res.status(400).json({ 
          error: `File ${file.originalFilename} exceeds maximum size of ${MAX_FILE_SIZE / 1024 / 1024}MB` 
        });
      }

      // Validate MIME type
      if (!file.mimetype || !ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return res.status(400).json({ 
          error: `File ${file.originalFilename} is not a valid image type. Allowed types: JPEG, PNG, GIF, WEBP` 
        });
      }

      // Validate file is actually an image using magic numbers
      const isValidImage = await validateImageFile(file.filepath);
      if (!isValidImage) {
        // Clean up invalid file (with retry for Windows file locks)
        await safeUnlink(file.filepath);
        return res.status(400).json({ 
          error: `File ${file.originalFilename} is not a valid image file` 
        });
      }

      try {
        // Process image with sharp: resize if too large, optimize
        const image = sharp(file.filepath);
        const metadata = await image.metadata();

        // Resize if image is too large
        if (metadata.width && metadata.height) {
          if (metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION) {
            await image
              .resize(MAX_DIMENSION, MAX_DIMENSION, {
                fit: 'inside',
                withoutEnlargement: true
              })
              .toFile(file.filepath + '.resized');
            
            // Replace original with resized version
            fs.renameSync(file.filepath + '.resized', file.filepath);
          }
        }

        // Moderate image content using Google Vision API
        console.log(`Moderating image: ${file.originalFilename}`);
        const moderationResult = await moderateImage(file.filepath);
        
        console.log('Image moderation result:', {
          filename: file.originalFilename,
          isApproved: moderationResult.isApproved,
          isInappropriate: moderationResult.isInappropriate,
          reasons: moderationResult.reasons,
          confidence: moderationResult.confidence,
          safeSearch: moderationResult.safeSearch
        });

        if (!moderationResult.isApproved) {
          // Clean up inappropriate image (with retry for Windows file locks)
          await safeUnlink(file.filepath);
          
          // Determine violation type based on moderation reasons
          let violationType = 'inappropriate_content';
          if (moderationResult.reasons.some(r => r.includes('Sexually explicit') || r.includes('nudity'))) {
            violationType = 'explicit_content';
          } else if (moderationResult.reasons.some(r => r.includes('Violent') || r.includes('gory'))) {
            violationType = 'violent_content';
          } else if (moderationResult.reasons.some(r => r.includes('Medical'))) {
            violationType = 'medical_content';
          }
          
          // Handle image violation (track warning/ban)
          // Get user email if available (from User model if needed)
          const violationResult = await handleImageViolation(username, violationType);
          
          // Log detailed moderation result for debugging
          console.warn('Image rejected by moderation:', {
            filename: file.originalFilename,
            username,
            reasons: moderationResult.reasons,
            confidence: moderationResult.confidence,
            safeSearch: moderationResult.safeSearch,
            violationAction: violationResult.action,
            warningCount: violationResult.count
          });
          
          // Handle different violation actions
          if (violationResult.action === 'banned') {
            return res.status(403).json({
              error: 'Account Suspended',
              message: 'Your account has been suspended due to content violations.',
              banExpiresAt: violationResult.expiresAt,
              violationResult
            });
          }
          
          if (violationResult.action === 'permanent_ban') {
            return res.status(403).json({
              error: 'Account Suspended',
              message: 'Your account has been permanently suspended due to repeated content violations.',
              violationResult
            });
          }
          
          // Warning or first-time violation - return user-friendly message
          const warningCount = violationResult.count || 1;
          return res.status(400).json({ 
            error: 'Image contains inappropriate content',
            message: `Your image contains inappropriate content. You have been given a warning (${warningCount}/3). Continued offenses will result in a temporary ban.`,
            details: moderationResult.reasons.join(', '),
            isContentViolation: true,
            warningCount,
            violationResult,
            moderationResult: {
              reasons: moderationResult.reasons,
              confidence: moderationResult.confidence,
              safeSearch: moderationResult.safeSearch
            }
          });
        }

        // Upload to storage (local filesystem in dev, cloud in production)
        const storage = getImageStorage();
        const uploadResult = await storage.uploadImage(
          file.filepath,
          path.basename(file.filepath),
          'forum-images'
        );

        // Clean up temporary file after upload (only if using cloud storage)
        // Local storage already moved/copied the file, so we keep it
        if (process.env.IMAGEKIT_PUBLIC_KEY || 
            process.env.CLOUDINARY_CLOUD_NAME || 
            process.env.AWS_S3_BUCKET_NAME) {
          // Using cloud storage - delete temp file (with retry for Windows file locks)
          await safeUnlink(file.filepath);
        }

        processedImages.push({
          url: uploadResult.url,
          name: file.originalFilename || 'image',
          size: uploadResult.size,
          type: uploadResult.type || file.mimetype || 'image/jpeg'
        });
      } catch (error) {
        console.error('Error processing image:', error);
        // Clean up on error (with retry for Windows file locks)
        await safeUnlink(file.filepath);
        return res.status(500).json({ 
          error: `Error processing image ${file.originalFilename}: ${error instanceof Error ? error.message : 'Unknown error'}` 
        });
      }
    }

    return res.status(200).json({ 
      success: true,
      images: processedImages,
      count: processedImages.length
    });

  } catch (error: any) {
    console.error('Error uploading file:', error);
    
    // Handle formidable errors
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        error: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB` 
      });
    }
    
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ 
        error: 'Too many files. Maximum 5 images per post.' 
      });
    }

    return res.status(500).json({ 
      error: 'Error uploading file',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

