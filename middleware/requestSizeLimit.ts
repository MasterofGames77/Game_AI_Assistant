import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Request Body Size Limiting Middleware
 * 
 * This middleware prevents DoS attacks by limiting the size of request bodies
 * before they are parsed. It checks the Content-Length header and rejects
 * requests that exceed configured limits.
 * 
 * Security Benefits:
 * - Prevents memory exhaustion from large payloads
 * - Protects against DoS attacks
 * - Reduces server resource consumption
 * - Improves application stability
 */

// Default size limits (in bytes)
const DEFAULT_JSON_LIMIT = 1 * 1024 * 1024; // 1 MB for JSON payloads
const DEFAULT_FORM_LIMIT = 10 * 1024 * 1024; // 10 MB for form data (file uploads)
const DEFAULT_TEXT_LIMIT = 500 * 1024; // 500 KB for text/plain

// Route-specific size limits (can be customized per route)
const ROUTE_LIMITS: Record<string, number> = {
  // File upload routes need larger limits
  '/api/uploadImage': 10 * 1024 * 1024, // 10 MB
  '/api/uploadForumImage': 50 * 1024 * 1024, // 50 MB (multiple images)
  '/api/avatar/upload': 5 * 1024 * 1024, // 5 MB
  // Assistant route may need larger limit for complex queries
  '/api/assistant': 2 * 1024 * 1024, // 2 MB
  // Forum posts with images
  '/api/addPostToForum': 50 * 1024 * 1024, // 50 MB
  '/api/editPost': 50 * 1024 * 1024, // 50 MB
};

/**
 * Get the appropriate size limit for a given route and content type
 */
function getSizeLimit(pathname: string, contentType: string | undefined): number {
  // Check for route-specific limit first
  if (ROUTE_LIMITS[pathname]) {
    return ROUTE_LIMITS[pathname];
  }

  // Determine limit based on content type
  if (!contentType) {
    return DEFAULT_JSON_LIMIT; // Default to JSON limit
  }

  const normalizedContentType = contentType.toLowerCase();

  // Form data (multipart/form-data) - typically for file uploads
  if (normalizedContentType.includes('multipart/form-data')) {
    return DEFAULT_FORM_LIMIT;
  }

  // JSON payloads
  if (normalizedContentType.includes('application/json')) {
    return DEFAULT_JSON_LIMIT;
  }

  // URL-encoded form data
  if (normalizedContentType.includes('application/x-www-form-urlencoded')) {
    return DEFAULT_JSON_LIMIT;
  }

  // Text content
  if (normalizedContentType.includes('text/')) {
    return DEFAULT_TEXT_LIMIT;
  }

  // Default to JSON limit for unknown types
  return DEFAULT_JSON_LIMIT;
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Request size limiting middleware
 * 
 * Usage:
 *   import { withRequestSizeLimit } from '../../../middleware/requestSizeLimit';
 *   export default withRequestSizeLimit(handler);
 * 
 * Or inline:
 *   const sizeCheck = await checkRequestSize(req, res);
 *   if (!sizeCheck.allowed) {
 *     return res.status(413).json({ error: sizeCheck.error });
 *   }
 */
export async function checkRequestSize(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<{ allowed: boolean; error?: string }> {
  // Only check POST, PUT, PATCH requests (they have bodies)
  if (!['POST', 'PUT', 'PATCH'].includes(req.method || '')) {
    return { allowed: true };
  }

  const pathname = req.url?.split('?')[0] || '';
  const contentType = req.headers['content-type'];
  const contentLength = req.headers['content-length'];

  // If no Content-Length header, we can't check size upfront
  // This is okay for streaming/chunked requests, but we'll log it
  if (!contentLength) {
    // For routes that should have Content-Length, this might be suspicious
    // But we'll allow it and let the body parser handle it
    return { allowed: true };
  }

  const sizeLimit = getSizeLimit(pathname, contentType);
  const requestSize = parseInt(contentLength, 10);

  // Validate Content-Length is a valid number
  if (isNaN(requestSize)) {
    return {
      allowed: false,
      error: 'Invalid Content-Length header',
    };
  }

  // Check if request exceeds limit
  if (requestSize > sizeLimit) {
    return {
      allowed: false,
      error: `Request body too large. Maximum size is ${formatBytes(sizeLimit)}, but received ${formatBytes(requestSize)}.`,
    };
  }

  return { allowed: true };
}

/**
 * Middleware wrapper to protect API route handlers
 * Automatically checks request size before handler execution
 * 
 * Usage: export default withRequestSizeLimit(handler)
 */
export const withRequestSizeLimit = (
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) => {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const sizeCheck = await checkRequestSize(req, res);

    if (!sizeCheck.allowed) {
      return res.status(413).json({
        error: 'Payload Too Large',
        message: sizeCheck.error,
      });
    }

    return handler(req, res);
  };
};

/**
 * Get size limit configuration for a specific route
 * Useful for displaying limits to users or in API documentation
 */
export function getRouteSizeLimit(pathname: string): number {
  const contentType = 'application/json'; // Default
  return getSizeLimit(pathname, contentType);
}

