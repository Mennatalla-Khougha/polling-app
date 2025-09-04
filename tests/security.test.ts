/**
 * Security implementation tests
 * Tests for CSRF protection and rate limiting
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { middleware } from '../middleware';
import { fetchWithCsrf, getCsrfToken, addCsrfToken } from '../lib/csrf';

// Mock NextRequest and NextResponse
vi.mock('next/server', () => {
  const NextResponse = {
    next: vi.fn().mockReturnValue({
      cookies: {
        set: vi.fn(),
      },
      headers: new Map(),
    }),
    json: vi.fn().mockImplementation((body, init) => ({
      body,
      ...init,
    })),
  };
  
  class NextRequest {
    public readonly nextUrl: URL;
    public readonly cookies: {
      get: (name: string) => { value: string } | undefined;
      has: (name: string) => boolean;
    };
    public readonly headers: Headers;
    public readonly method: string;
    public readonly ip: string | null;

    constructor(input: string, init: any = {}) {
      this.nextUrl = new URL(input);
      this.cookies = {
        get: vi.fn().mockImplementation((name) => {
          return init.cookies?.[name] ? { value: init.cookies[name] } : undefined;
        }),
        has: vi.fn().mockImplementation((name) => {
          return !!init.cookies?.[name];
        }),
      };
      this.headers = new Headers(init.headers || {});
      this.method = init.method || 'GET';
      this.ip = init.ip || '127.0.0.1';
    }
  }

  return { NextRequest, NextResponse };
});

// Mock crypto for CSRF token generation
vi.mock('crypto', () => {
  return {
    randomBytes: vi.fn().mockReturnValue({
      toString: vi.fn().mockReturnValue('test-csrf-token'),
    }),
  };
});

// Mock document and cookies for client-side CSRF functions
vi.stubGlobal('document', {
  cookie: 'csrf_token=test-csrf-token',
});

describe('Security Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CSRF Protection', () => {
    it('should allow GET requests without CSRF token', () => {
      const req = new NextRequest('http://localhost:3000/api/polls', {
        method: 'GET',
      });
      
      middleware(req);
      
      expect(NextResponse.next).toHaveBeenCalled();
    });

    it('should block POST requests without CSRF token', () => {
      const req = new NextRequest('http://localhost:3000/api/polls', {
        method: 'POST',
      });
      
      middleware(req);
      
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Invalid CSRF token' },
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    });

    it('should allow POST requests with valid CSRF token', () => {
      const req = new NextRequest('http://localhost:3000/api/polls', {
        method: 'POST',
        headers: {
          'X-CSRF-Token': 'test-csrf-token',
        },
        cookies: {
          csrf_token: 'test-csrf-token',
        },
      });
      
      middleware(req);
      
      expect(NextResponse.next).toHaveBeenCalled();
    });

    it('should block POST requests with mismatched CSRF token', () => {
      const req = new NextRequest('http://localhost:3000/api/polls', {
        method: 'POST',
        headers: {
          'X-CSRF-Token': 'wrong-token',
        },
        cookies: {
          csrf_token: 'test-csrf-token',
        },
      });
      
      middleware(req);
      
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Invalid CSRF token' },
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    });
  });

  describe('Rate Limiting', () => {
    it('should allow requests under the rate limit', () => {
      const req = new NextRequest('http://localhost:3000/api/votes', {
        method: 'POST',
        headers: {
          'X-CSRF-Token': 'test-csrf-token',
        },
        cookies: {
          csrf_token: 'test-csrf-token',
        },
        ip: '127.0.0.1',
      });
      
      const response = middleware(req) as any;
      
      expect(response.headers.get('X-RateLimit-Limit')).toBe('20');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('19');
      expect(response.status).not.toBe(429);
    });

    it('should block requests over the rate limit', () => {
      const req = new NextRequest('http://localhost:3000/api/votes', {
        method: 'POST',
        headers: {
          'X-CSRF-Token': 'test-csrf-token',
        },
        cookies: {
          csrf_token: 'test-csrf-token',
        },
        ip: '127.0.0.1',
      });
      
      // Simulate exceeding rate limit
      for (let i = 0; i < 20; i++) {
        middleware(req);
      }
      
      const response = middleware(req) as any;
      
      expect(response.status).toBe(429);
      expect(response.body).toContain('Too many requests');
    });
  });
});

describe('CSRF Client Utilities', () => {
  it('should get CSRF token from cookies', () => {
    const token = getCsrfToken();
    expect(token).toBe('test-csrf-token');
  });

  it('should add CSRF token to fetch options', () => {
    const options = addCsrfToken({ method: 'POST' });
    expect(options.headers).toBeInstanceOf(Headers);
    expect((options.headers as Headers).get('X-CSRF-Token')).toBe('test-csrf-token');
  });

  it('should wrap fetch with CSRF token', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response('{}'));
    
    await fetchWithCsrf('/api/polls', { method: 'POST' });
    
    expect(global.fetch).toHaveBeenCalledWith('/api/polls', expect.objectContaining({
      method: 'POST',
      headers: expect.any(Headers),
    }));
    
    const headers = (global.fetch as Mock).mock.calls[0][1].headers as Headers;
    expect(headers.get('X-CSRF-Token')).toBe('test-csrf-token');
  });
});