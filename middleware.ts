import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import crypto from 'crypto';

// In-memory store for rate limiting
// In production, this should be replaced with Redis or similar
interface RateLimitStore {
  [key: string]: {
    count: number;
    resetAt: number;
  };
}

const rateLimitStore: RateLimitStore = {};

// Rate limit configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in milliseconds
const MAX_REQUESTS_PER_WINDOW = 20; // Maximum requests per window

// Clean up the rate limit store periodically
setInterval(() => {
  const now = Date.now();
  Object.keys(rateLimitStore).forEach((key) => {
    if (rateLimitStore[key].resetAt < now) {
      delete rateLimitStore[key];
    }
  });
}, RATE_LIMIT_WINDOW);

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Skip CSRF protection for non-mutation requests
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
    return response;
  }

  // Apply rate limiting for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const ip = request.ip || 'unknown';
    const identifier = `${ip}:${request.nextUrl.pathname}`;
    
    // Initialize rate limit entry if it doesn't exist
    if (!rateLimitStore[identifier]) {
      rateLimitStore[identifier] = {
        count: 0,
        resetAt: Date.now() + RATE_LIMIT_WINDOW,
      };
    }
    
    // Check if the rate limit has been exceeded
    const rateLimitInfo = rateLimitStore[identifier];
    rateLimitInfo.count++;
    
    // Set rate limit headers
    response.headers.set('X-RateLimit-Limit', MAX_REQUESTS_PER_WINDOW.toString());
    response.headers.set('X-RateLimit-Remaining', Math.max(0, MAX_REQUESTS_PER_WINDOW - rateLimitInfo.count).toString());
    response.headers.set('X-RateLimit-Reset', new Date(rateLimitInfo.resetAt).toISOString());
    
    // If rate limit exceeded, return 429 Too Many Requests
    if (rateLimitInfo.count > MAX_REQUESTS_PER_WINDOW) {
      return new NextResponse(JSON.stringify({ error: 'Too many requests, please try again later' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': MAX_REQUESTS_PER_WINDOW.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(rateLimitInfo.resetAt).toISOString(),
          'Retry-After': Math.ceil((rateLimitInfo.resetAt - Date.now()) / 1000).toString(),
        },
      });
    }
  }

  // CSRF protection
  // Skip CSRF check for authentication endpoints
  if (request.nextUrl.pathname.startsWith('/api/auth/')) {
    return response;
  }

  // For API routes that require CSRF protection
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const csrfToken = request.headers.get('X-CSRF-Token');
    const csrfCookie = request.cookies.get('csrf_token')?.value;

    // If no CSRF token in header or cookie, or they don't match
    if (!csrfToken || !csrfCookie || csrfToken !== csrfCookie) {
      return new NextResponse(JSON.stringify({ error: 'Invalid CSRF token' }), {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
  }

  // For non-API routes, set CSRF token cookie if it doesn't exist
  if (!request.cookies.has('csrf_token')) {
    const csrfToken = crypto.randomBytes(16).toString('hex');
    response.cookies.set('csrf_token', csrfToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
  }

  return response;
}

// Configure which paths the middleware applies to
export const config = {
  matcher: [
    // Apply to all routes except static files, images, and _next
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};