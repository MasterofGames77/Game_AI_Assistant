import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { applySecurityHeaders } from './middleware/securityHeaders';

/**
 * Next.js Edge Middleware
 * 
 * This is the entry point for Next.js Edge Middleware.
 * It applies security headers to all requests using the
 * security headers utility from the middleware folder.
 * 
 * Note: This file must be at the root level (not in a subfolder)
 * as required by Next.js Edge Middleware architecture.
 * 
 * See:
 * - middleware/securityHeaders.ts for the security headers logic
 * - SECURITY_REVIEW.md for security improvements overview
 * - SECURITY_HEADERS_IMPLEMENTATION.md for detailed documentation
 */
export function middleware(request: NextRequest) {
  // Create response
  const response = NextResponse.next();

  // Apply security headers using the utility function
  return applySecurityHeaders(request, response);
}

/**
 * Configure which routes the middleware should run on
 * By default, it runs on all routes, but you can be more specific
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes that don't need security headers (if any)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

