/**
 * Rate limiting utilities for API endpoints
 * Provides in-memory rate limiting for development and basic protection
 * For production, consider using Redis-based rate limiting
 */

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string; // Custom error message
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

class RateLimiter {
  private store: RateLimitStore = {};
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  private cleanup() {
    const now = Date.now();
    Object.keys(this.store).forEach(key => {
      if (this.store[key].resetTime < now) {
        delete this.store[key];
      }
    });
  }

  private getKey(identifier: string, endpoint: string): string {
    return `${identifier}:${endpoint}`;
  }

  isAllowed(
    identifier: string,
    endpoint: string,
    config: RateLimitConfig
  ): { allowed: boolean; remaining: number; resetTime: number } {
    const key = this.getKey(identifier, endpoint);
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Get or create entry
    let entry = this.store[key];
    if (!entry || entry.resetTime < now) {
      entry = {
        count: 0,
        resetTime: now + config.windowMs,
      };
      this.store[key] = entry;
    }

    // Check if request is allowed
    if (entry.count >= config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
      };
    }

    // Increment counter
    entry.count++;

    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
      resetTime: entry.resetTime,
    };
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// Global rate limiter instance
const rateLimiter = new RateLimiter();

// Default rate limit configurations
export const RATE_LIMITS = {
  // Authentication endpoints - stricter limits
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 minutes
    message: 'Too many authentication attempts. Please try again later.',
  },
  
  // Chat API - moderate limits
  chat: {
    windowMs: 1 * 60 * 1000, // 1 minute
    maxRequests: 30, // 30 requests per minute
    message: 'Too many chat requests. Please slow down.',
  },
  
  // File upload - stricter limits
  fileUpload: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 10, // 10 uploads per 5 minutes
    message: 'Too many file uploads. Please wait before uploading more files.',
  },
  
  // General API - lenient limits
  general: {
    windowMs: 1 * 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute
    message: 'Too many requests. Please slow down.',
  },
} as const;

/**
 * Rate limiting middleware for API routes
 */
export function createRateLimit(config: RateLimitConfig) {
  return (identifier: string, endpoint: string) => {
    const result = rateLimiter.isAllowed(identifier, endpoint, config);
    
    if (!result.allowed) {
      const error = new Error(config.message || 'Rate limit exceeded');
      (error as any).statusCode = 429;
      (error as any).remaining = result.remaining;
      (error as any).resetTime = result.resetTime;
      throw error;
    }
    
    return {
      remaining: result.remaining,
      resetTime: result.resetTime,
    };
  };
}

/**
 * Get client identifier for rate limiting
 * In production, consider using user ID or IP address
 */
export function getClientIdentifier(request: Request): string {
  // For development, use a simple identifier
  // In production, you might want to use:
  // - User ID (if authenticated)
  // - IP address
  // - API key
  // - Combination of factors
  
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
  
  // In a real application, you'd want to hash or anonymize this
  return ip;
}

/**
 * Rate limit decorator for API routes
 */
export function withRateLimit(
  config: RateLimitConfig,
  getIdentifier?: (request: Request) => string
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (request: Request, ...args: any[]) {
      const identifier = getIdentifier 
        ? getIdentifier(request)
        : getClientIdentifier(request);
      
      const endpoint = `${target.constructor.name}.${propertyKey}`;
      
      try {
        const rateLimitResult = createRateLimit(config)(identifier, endpoint);
        
        // Add rate limit headers to response
        const response = await originalMethod.call(this, request, ...args);
        
        if (response instanceof Response) {
          response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
          response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());
        }
        
        return response;
      } catch (error: any) {
        if (error.statusCode === 429) {
          return new Response(
            JSON.stringify({
              error: error.message,
              remaining: error.remaining,
              resetTime: error.resetTime,
            }),
            {
              status: 429,
              headers: {
                'Content-Type': 'application/json',
                'X-RateLimit-Remaining': error.remaining.toString(),
                'X-RateLimit-Reset': error.resetTime.toString(),
                'Retry-After': Math.ceil((error.resetTime - Date.now()) / 1000).toString(),
              },
            }
          );
        }
        throw error;
      }
    };
    
    return descriptor;
  };
}

// Cleanup on process exit
process.on('SIGINT', () => {
  rateLimiter.destroy();
});

process.on('SIGTERM', () => {
  rateLimiter.destroy();
});

export default rateLimiter;