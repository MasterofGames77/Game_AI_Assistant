/**
 * Image Storage Utility
 * 
 * Handles image storage for both development (local filesystem) and production (cloud storage).
 * 
 * Development: Uses local filesystem in public/uploads/forum-images/
 * Production: Uses cloud storage (ImageKit, Cloudinary, or AWS S3)
 * 
 * To use ImageKit (Recommended - Free tier, works with your own storage):
 * 1. Sign up at https://imagekit.io (free tier: 20GB bandwidth/month)
 * 2. Get your Public Key, Private Key, and URL Endpoint from Dashboard
 * 3. Add to .env:
 *    IMAGEKIT_PUBLIC_KEY=your_public_key
 *    IMAGEKIT_PRIVATE_KEY=your_private_key
 *    IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_imagekit_id
 * 
 * To use Cloudinary:
 * 1. Sign up at https://cloudinary.com (free tier available)
 * 2. Get your Cloud Name, API Key, and API Secret
 * 3. Add to .env:
 *    CLOUDINARY_CLOUD_NAME=your_cloud_name
 *    CLOUDINARY_API_KEY=your_api_key
 *    CLOUDINARY_API_SECRET=your_api_secret
 * 
 * To use AWS S3:
 * 1. Create an S3 bucket
 * 2. Get AWS credentials
 * 3. Add to .env:
 *    AWS_ACCESS_KEY_ID=your_access_key
 *    AWS_SECRET_ACCESS_KEY=your_secret_key
 *    AWS_S3_BUCKET_NAME=your_bucket_name
 *    AWS_REGION=your_region
 */

import fs from 'fs';
import path from 'path';

export interface ImageUploadResult {
  url: string;
  publicId?: string; // For cloud storage (Cloudinary/S3)
  name: string;
  size: number;
  type: string;
}

export interface ImageStorage {
  uploadImage(filePath: string, filename: string, folder?: string): Promise<ImageUploadResult>;
  deleteImage(publicIdOrPath: string): Promise<void>;
}

/**
 * Local filesystem storage (for development)
 */
class LocalImageStorage implements ImageStorage {
  private uploadDir: string;

  constructor() {
    this.uploadDir = path.join(process.cwd(), 'public', 'uploads', 'forum-images');
    // Ensure upload directory exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadImage(filePath: string, filename: string): Promise<ImageUploadResult> {
    // Move file from temp directory to upload directory
    const destPath = path.join(this.uploadDir, filename);
    
    // If file is already in the destination, just use it
    if (filePath === destPath) {
      const stats = fs.statSync(destPath);
      const relativePath = path.relative(path.join(process.cwd(), 'public'), destPath);
      const webPath = relativePath.replace(/\\/g, '/');
      
      return {
        url: `/${webPath}`,
        name: filename,
        size: stats.size,
        type: 'image/jpeg'
      };
    }
    
    // Move file to upload directory
    fs.renameSync(filePath, destPath);

    // Get file stats
    const stats = fs.statSync(destPath);
    
    // Return relative URL path
    const relativePath = path.relative(path.join(process.cwd(), 'public'), destPath);
    const webPath = relativePath.replace(/\\/g, '/');

    return {
      url: `/${webPath}`,
      name: filename,
      size: stats.size,
      type: 'image/jpeg' // Default, can be improved
    };
  }

  async deleteImage(filePath: string): Promise<void> {
    // Extract actual file path from URL if needed
    const actualPath = filePath.startsWith('/') 
      ? path.join(process.cwd(), 'public', filePath)
      : filePath;
    
    if (fs.existsSync(actualPath)) {
      fs.unlinkSync(actualPath);
    }
  }
}

/**
 * Cloudinary storage (for production)
 */
class CloudinaryImageStorage implements ImageStorage {
  private cloudName: string;
  private apiKey: string;
  private apiSecret: string;

  constructor() {
    this.cloudName = process.env.CLOUDINARY_CLOUD_NAME || '';
    this.apiKey = process.env.CLOUDINARY_API_KEY || '';
    this.apiSecret = process.env.CLOUDINARY_API_SECRET || '';

    if (!this.cloudName || !this.apiKey || !this.apiSecret) {
      throw new Error('Cloudinary credentials not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your .env file.');
    }
  }

  async uploadImage(filePath: string, filename: string, folder: string = 'forum-images'): Promise<ImageUploadResult> {
    // Dynamically import cloudinary to avoid errors if not installed
    // Use Function constructor to prevent webpack from analyzing this import
    // @ts-ignore - Optional dependency, installed only if using Cloudinary
    const cloudinaryModule = await new Function('return import("cloudinary")')();
    const { v2: cloudinary } = cloudinaryModule;
    
    cloudinary.config({
      cloud_name: this.cloudName,
      api_key: this.apiKey,
      api_secret: this.apiSecret
    });

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(filePath, {
      folder: folder,
      public_id: path.parse(filename).name, // Remove extension, Cloudinary handles it
      resource_type: 'image',
      overwrite: false,
      unique_filename: true
    });

    // Get file stats
    const stats = fs.statSync(filePath);

    return {
      url: result.secure_url,
      publicId: result.public_id,
      name: filename,
      size: stats.size,
      type: result.format || 'image/jpeg'
    };
  }

  async deleteImage(publicId: string): Promise<void> {
    // @ts-ignore - Optional dependency, installed only if using Cloudinary
    const cloudinaryModule = await new Function('return import("cloudinary")')();
    const { v2: cloudinary } = cloudinaryModule;
    
    cloudinary.config({
      cloud_name: this.cloudName,
      api_key: this.apiKey,
      api_secret: this.apiSecret
    });

    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      console.error('Error deleting image from Cloudinary:', error);
      // Don't throw - deletion failures shouldn't break the app
    }
  }
}

/**
 * ImageKit storage (recommended for production - free tier, works with your own storage)
 */
class ImageKitStorage implements ImageStorage {
  private publicKey: string;
  private privateKey: string;
  private urlEndpoint: string;

  constructor() {
    this.publicKey = process.env.IMAGEKIT_PUBLIC_KEY || '';
    this.privateKey = process.env.IMAGEKIT_PRIVATE_KEY || '';
    this.urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT || '';

    if (!this.publicKey || !this.privateKey || !this.urlEndpoint) {
      throw new Error('ImageKit credentials not configured. Please set IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, and IMAGEKIT_URL_ENDPOINT in your .env file.');
    }
  }

  async uploadImage(filePath: string, filename: string, folder: string = 'forum-images'): Promise<ImageUploadResult> {
    // Dynamically import imagekit to avoid errors if not installed
    // Use Function constructor to prevent webpack from analyzing this import
    // @ts-ignore - Optional dependency, installed only if using ImageKit
    const imagekitModule = await new Function('return import("imagekit")')();
    const ImageKit = imagekitModule.default;
    
    const imagekit = new ImageKit({
      publicKey: this.publicKey,
      privateKey: this.privateKey,
      urlEndpoint: this.urlEndpoint
    });

    // Read file content
    const fileContent = fs.readFileSync(filePath);
    const stats = fs.statSync(filePath);

    // Upload to ImageKit
    // ImageKit can work with your own storage (S3, etc.) or use ImageKit's storage
    const result = await imagekit.upload({
      file: fileContent,
      fileName: filename,
      folder: folder,
      useUniqueFileName: true, // Ensures unique filenames
      overwriteFile: false
    });

    return {
      url: result.url,
      publicId: result.fileId, // ImageKit uses fileId instead of publicId
      name: filename,
      size: stats.size,
      type: result.fileType || 'image/jpeg'
    };
  }

  async deleteImage(fileId: string): Promise<void> {
    // @ts-ignore - Optional dependency, installed only if using ImageKit
    const imagekitModule = await new Function('return import("imagekit")')();
    const ImageKit = imagekitModule.default;
    
    const imagekit = new ImageKit({
      publicKey: this.publicKey,
      privateKey: this.privateKey,
      urlEndpoint: this.urlEndpoint
    });

    try {
      await imagekit.deleteFile(fileId);
    } catch (error) {
      console.error('Error deleting image from ImageKit:', error);
      // Don't throw - deletion failures shouldn't break the app
    }
  }
}

/**
 * AWS S3 storage (alternative for production)
 */
class S3ImageStorage implements ImageStorage {
  private bucketName: string;
  private region: string;

  constructor() {
    this.bucketName = process.env.AWS_S3_BUCKET_NAME || '';
    this.region = process.env.AWS_REGION || 'us-east-1';

    if (!this.bucketName || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      throw new Error('AWS S3 credentials not configured. Please set AWS_S3_BUCKET_NAME, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_REGION in your .env file.');
    }
  }

  async uploadImage(filePath: string, filename: string, folder: string = 'forum-images'): Promise<ImageUploadResult> {
    // Dynamically import AWS SDK to avoid errors if not installed
    // Use Function constructor to prevent webpack from analyzing this import
    // @ts-ignore - Optional dependency, installed only if using AWS S3
    const s3Module = await new Function('return import("@aws-sdk/client-s3")')();
    const { S3Client, PutObjectCommand } = s3Module;
    
    const s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
      }
    });

    const fileContent = fs.readFileSync(filePath);
    const key = `${folder}/${filename}`;

    await s3Client.send(new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: fileContent,
      ContentType: 'image/jpeg', // Can be improved to detect actual type
      ACL: 'public-read' // Make images publicly accessible
    }));

    const stats = fs.statSync(filePath);
    const url = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;

    return {
      url,
      publicId: key,
      name: filename,
      size: stats.size,
      type: 'image/jpeg'
    };
  }

  async deleteImage(key: string): Promise<void> {
    // @ts-ignore - Optional dependency, installed only if using AWS S3
    const s3Module = await new Function('return import("@aws-sdk/client-s3")')();
    const { S3Client, DeleteObjectCommand } = s3Module;
    
    const s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
      }
    });

    try {
      await s3Client.send(new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key
      }));
    } catch (error) {
      console.error('Error deleting image from S3:', error);
      // Don't throw - deletion failures shouldn't break the app
    }
  }
}

/**
 * Get the appropriate image storage based on environment
 * Priority: ImageKit > Cloudinary > AWS S3 > Local filesystem
 */
export function getImageStorage(): ImageStorage {
  // Check for ImageKit first (recommended - free tier, works with your own storage)
  if (process.env.IMAGEKIT_PUBLIC_KEY && 
      process.env.IMAGEKIT_PRIVATE_KEY && 
      process.env.IMAGEKIT_URL_ENDPOINT) {
    console.log('Using ImageKit for image storage');
    return new ImageKitStorage();
  }

  // Check for Cloudinary
  if (process.env.CLOUDINARY_CLOUD_NAME && 
      process.env.CLOUDINARY_API_KEY && 
      process.env.CLOUDINARY_API_SECRET) {
    console.log('Using Cloudinary for image storage');
    return new CloudinaryImageStorage();
  }

  // Check for AWS S3
  if (process.env.AWS_S3_BUCKET_NAME && 
      process.env.AWS_ACCESS_KEY_ID && 
      process.env.AWS_SECRET_ACCESS_KEY) {
    console.log('Using AWS S3 for image storage');
    return new S3ImageStorage();
  }

  // Fall back to local filesystem (development)
  console.log('Using local filesystem for image storage (development mode)');
  return new LocalImageStorage();
}

