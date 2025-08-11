import { NextRequest, NextResponse } from 'next/server';
import { logSecurityEvent } from './logger';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// In-memory store (use Redis in production)
const store: RateLimitStore = {};

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach(key => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
}, 5 * 60 * 1000);

export const createRateLimiter = (config: RateLimitConfig) => {
  return async (request: NextRequest, response?: NextResponse): Promise<NextResponse | null> => {
    const ip = getClientIP(request);
    const key = `${ip}:${request.nextUrl.pathname}`;
    const now = Date.now();
    
    // Initialize or get existing record
    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        count: 0,
        resetTime: now + config.windowMs
      };
    }

    // Increment request count
    store[key].count++;

    // Check if limit exceeded
    if (store[key].count > config.maxRequests) {
      logSecurityEvent('Rate limit exceeded', undefined, {
        ip,
        path: request.nextUrl.pathname,
        count: store[key].count,
        limit: config.maxRequests
      });

      return NextResponse.json(
        {
          success: false,
          message: config.message || 'Too many requests, please try again later',
          retryAfter: Math.ceil((store[key].resetTime - now) / 1000)
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': store[key].resetTime.toString(),
            'Retry-After': Math.ceil((store[key].resetTime - now) / 1000).toString()
          }
        }
      );
    }

    // Add rate limit headers to response
    if (response) {
      response.headers.set('X-RateLimit-Limit', config.maxRequests.toString());
      response.headers.set('X-RateLimit-Remaining', (config.maxRequests - store[key].count).toString());
      response.headers.set('X-RateLimit-Reset', store[key].resetTime.toString());
    }

    return null; // No rate limit hit, continue
  };
};

// Predefined rate limiters
export const apiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
  message: 'Too many API requests from this IP, please try again later'
});

export const createDogRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
  message: 'Too many dog profiles created, please try again later'
});

export const uploadRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  maxRequests: 10,
  message: 'Too many file uploads, please try again later'
});

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10,
  message: 'Too many authentication attempts, please try again later'
});

// Helper function to get client IP
function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  // Fallback to localhost for development
  return '127.0.0.1';
}

// Rate limit wrapper for API routes
export const withRateLimit = (
  handler: (request: NextRequest, context: any) => Promise<NextResponse>,
  rateLimiter = apiRateLimiter
) => {
  return async (request: NextRequest, context: any): Promise<NextResponse> => {
    const rateLimitResult = await rateLimiter(request);
    
    if (rateLimitResult) {
      return rateLimitResult;
    }
    
    return handler(request, context);
  };
};

// Enhanced rate limiter with user-specific limits
export const createUserRateLimiter = (config: RateLimitConfig & { userMultiplier?: number }) => {
  return async (request: NextRequest, userId?: string): Promise<NextResponse | null> => {
    const baseKey = getClientIP(request);
    const key = userId ? `${baseKey}:${userId}:${request.nextUrl.pathname}` : `${baseKey}:${request.nextUrl.pathname}`;
    const now = Date.now();
    
    // Adjust limits for authenticated users
    const maxRequests = userId && config.userMultiplier 
      ? config.maxRequests * config.userMultiplier 
      : config.maxRequests;
    
    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        count: 0,
        resetTime: now + config.windowMs
      };
    }

    store[key].count++;

    if (store[key].count > maxRequests) {
      logSecurityEvent('User rate limit exceeded', userId, {
        ip: baseKey,
        path: request.nextUrl.pathname,
        count: store[key].count,
        limit: maxRequests
      });

      return NextResponse.json(
        {
          success: false,
          message: config.message || 'Too many requests, please try again later',
          retryAfter: Math.ceil((store[key].resetTime - now) / 1000)
        },
        { status: 429 }
      );
    }

    return null;
  };
};