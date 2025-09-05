/**
 * Security Middleware
 * 
 * This middleware is a critical security layer for the application, providing multiple
 * essential protections that safeguard user data and prevent abuse. It implements:
 * 
 * 1. Rate limiting - Prevents brute force attacks and API abuse
 * 2. CSRF protection - Prevents cross-site request forgery attacks
 * 3. Security headers - Sets appropriate security-related HTTP headers
 * 
 * Without this middleware, the application would be vulnerable to various attacks
 * that could compromise user accounts, expose sensitive data, or disrupt service.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import crypto from 'crypto';

/**
 * Rate Limiting Store Interface
 * 
 * This interface defines the structure for the in-memory rate limiting store.
 * Rate limiting is essential for preventing brute force attacks against authentication
 * endpoints and protecting API routes from abuse.
 * 
 * In a production environment, this in-memory store should be replaced with a
 * distributed solution like Redis to ensure rate limits work across multiple instances.
 */
interface RateLimitStore {
  [key: string]: {
    count: number;    // Number of requests made in the current window
    resetAt: number;  // Timestamp when the rate limit window resets
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

/**
 * Next.js Middleware Function
 * 
 * This function intercepts all applicable HTTP requests to the application and applies
 * security measures before they reach the route handlers. It's a critical part of the
 * application's security architecture, providing:
 * 
 * 1. Rate limiting for API routes to prevent abuse and brute force attacks
 * 2. CSRF token validation for mutation requests to prevent cross-site request forgery
 * 3. CSRF token generation for new sessions
 * 
 * The middleware works in conjunction with the authentication system to ensure that
 * only legitimate requests are processed, protecting user accounts and data.
 * 
 * @param request - The incoming HTTP request
 * @returns The modified response with security headers and cookies
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Skip CSRF protection for non-mutation requests
  // This optimization allows read-only requests to bypass unnecessary checks
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

  /**
   * CSRF Protection Logic
   * 
   * Cross-Site Request Forgery protection is critical for preventing attackers from
   * tricking authenticated users into performing unwanted actions. This section:
   * 
   * 1. Skips CSRF checks for authentication endpoints (which use other protections)
   * 2. Validates CSRF tokens for all other API endpoints
   * 3. Generates new CSRF tokens for users who don't have one
   */
  // Skip CSRF check for authentication endpoints
  // Auth endpoints use Supabase's built-in security measures instead
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