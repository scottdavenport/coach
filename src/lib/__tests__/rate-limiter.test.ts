/**
 * Comprehensive tests for rate limiting utilities
 */

import rateLimiter, { createRateLimit, getClientIdentifier, RATE_LIMITS } from '../rate-limiter';

// Mock Request object
const createMockRequest = (headers: Record<string, string> = {}): Request => {
  const mockHeaders = new Headers(headers);
  return {
    headers: mockHeaders,
    url: 'http://localhost:3000/api/test',
  } as Request;
};

describe('Rate Limiter', () => {
  beforeEach(() => {
    // Clear the rate limiter store before each test
    (rateLimiter as any).store = {};
  });

  describe('Basic Rate Limiting', () => {
    it('should allow requests within limit', () => {
      const config = {
        windowMs: 60000, // 1 minute
        maxRequests: 5,
      };

      const identifier = 'test-user';
      const endpoint = 'test-endpoint';

      // First 5 requests should be allowed
      for (let i = 0; i < 5; i++) {
        const result = rateLimiter.isAllowed(identifier, endpoint, config);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(5 - i - 1);
      }
    });

    it('should block requests after limit exceeded', () => {
      const config = {
        windowMs: 60000, // 1 minute
        maxRequests: 3,
      };

      const identifier = 'test-user';
      const endpoint = 'test-endpoint';

      // First 3 requests should be allowed
      for (let i = 0; i < 3; i++) {
        const result = rateLimiter.isAllowed(identifier, endpoint, config);
        expect(result.allowed).toBe(true);
      }

      // 4th request should be blocked
      const result = rateLimiter.isAllowed(identifier, endpoint, config);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should reset counter after window expires', (done) => {
      const config = {
        windowMs: 100, // 100ms
        maxRequests: 2,
      };

      const identifier = 'test-user';
      const endpoint = 'test-endpoint';

      // Use up the limit
      rateLimiter.isAllowed(identifier, endpoint, config);
      rateLimiter.isAllowed(identifier, endpoint, config);

      // Should be blocked
      const blockedResult = rateLimiter.isAllowed(identifier, endpoint, config);
      expect(blockedResult.allowed).toBe(false);

      // Wait for window to expire
      setTimeout(() => {
        const allowedResult = rateLimiter.isAllowed(identifier, endpoint, config);
        expect(allowedResult.allowed).toBe(true);
        expect(allowedResult.remaining).toBe(1);
        done();
      }, 150);
    });

    it('should handle different identifiers separately', () => {
      const config = {
        windowMs: 60000, // 1 minute
        maxRequests: 2,
      };

      const endpoint = 'test-endpoint';

      // User 1 uses up their limit
      rateLimiter.isAllowed('user1', endpoint, config);
      rateLimiter.isAllowed('user1', endpoint, config);
      const user1Result = rateLimiter.isAllowed('user1', endpoint, config);
      expect(user1Result.allowed).toBe(false);

      // User 2 should still be allowed
      const user2Result = rateLimiter.isAllowed('user2', endpoint, config);
      expect(user2Result.allowed).toBe(true);
    });

    it('should handle different endpoints separately', () => {
      const config = {
        windowMs: 60000, // 1 minute
        maxRequests: 2,
      };

      const identifier = 'test-user';

      // Use up limit for endpoint 1
      rateLimiter.isAllowed(identifier, 'endpoint1', config);
      rateLimiter.isAllowed(identifier, 'endpoint1', config);
      const endpoint1Result = rateLimiter.isAllowed(identifier, 'endpoint1', config);
      expect(endpoint1Result.allowed).toBe(false);

      // Endpoint 2 should still be allowed
      const endpoint2Result = rateLimiter.isAllowed(identifier, 'endpoint2', config);
      expect(endpoint2Result.allowed).toBe(true);
    });
  });

  describe('createRateLimit', () => {
    it('should create rate limit function that throws on limit exceeded', () => {
      const config = {
        windowMs: 60000,
        maxRequests: 1,
        message: 'Rate limit exceeded',
      };

      const rateLimitFn = createRateLimit(config);
      const identifier = 'test-user';
      const endpoint = 'test-endpoint';

      // First request should succeed
      const result1 = rateLimitFn(identifier, endpoint);
      expect(result1.remaining).toBe(0);

      // Second request should throw
      expect(() => {
        rateLimitFn(identifier, endpoint);
      }).toThrow('Rate limit exceeded');
    });

    it('should return remaining count and reset time', () => {
      const config = {
        windowMs: 60000,
        maxRequests: 5,
      };

      const rateLimitFn = createRateLimit(config);
      const identifier = 'test-user';
      const endpoint = 'test-endpoint';

      const result = rateLimitFn(identifier, endpoint);
      expect(result.remaining).toBe(4);
      expect(result.resetTime).toBeGreaterThan(Date.now());
    });
  });

  describe('getClientIdentifier', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const request = createMockRequest({
        'x-forwarded-for': '192.168.1.1, 10.0.0.1',
      });

      const identifier = getClientIdentifier(request);
      expect(identifier).toBe('192.168.1.1');
    });

    it('should return unknown when no IP is available', () => {
      const request = createMockRequest({});

      const identifier = getClientIdentifier(request);
      expect(identifier).toBe('unknown');
    });

    it('should handle single IP in x-forwarded-for', () => {
      const request = createMockRequest({
        'x-forwarded-for': '192.168.1.1',
      });

      const identifier = getClientIdentifier(request);
      expect(identifier).toBe('192.168.1.1');
    });
  });

  describe('Rate Limit Configurations', () => {
    it('should have reasonable auth rate limits', () => {
      expect(RATE_LIMITS.auth.windowMs).toBe(15 * 60 * 1000); // 15 minutes
      expect(RATE_LIMITS.auth.maxRequests).toBe(5);
      expect(RATE_LIMITS.auth.message).toContain('authentication');
    });

    it('should have reasonable chat rate limits', () => {
      expect(RATE_LIMITS.chat.windowMs).toBe(1 * 60 * 1000); // 1 minute
      expect(RATE_LIMITS.chat.maxRequests).toBe(30);
      expect(RATE_LIMITS.chat.message).toContain('chat');
    });

    it('should have reasonable file upload rate limits', () => {
      expect(RATE_LIMITS.fileUpload.windowMs).toBe(5 * 60 * 1000); // 5 minutes
      expect(RATE_LIMITS.fileUpload.maxRequests).toBe(10);
      expect(RATE_LIMITS.fileUpload.message).toContain('upload');
    });

    it('should have reasonable general rate limits', () => {
      expect(RATE_LIMITS.general.windowMs).toBe(1 * 60 * 1000); // 1 minute
      expect(RATE_LIMITS.general.maxRequests).toBe(100);
      expect(RATE_LIMITS.general.message).toContain('requests');
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero max requests', () => {
      const config = {
        windowMs: 60000,
        maxRequests: 0,
      };

      const identifier = 'test-user';
      const endpoint = 'test-endpoint';

      const result = rateLimiter.isAllowed(identifier, endpoint, config);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should handle very large max requests', () => {
      const config = {
        windowMs: 60000,
        maxRequests: 1000000,
      };

      const identifier = 'test-user';
      const endpoint = 'test-endpoint';

      const result = rateLimiter.isAllowed(identifier, endpoint, config);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(999999);
    });

    it('should handle very short window', (done) => {
      const config = {
        windowMs: 10, // 10ms
        maxRequests: 1,
      };

      const identifier = 'test-user';
      const endpoint = 'test-endpoint';

      // First request should be allowed
      const result1 = rateLimiter.isAllowed(identifier, endpoint, config);
      expect(result1.allowed).toBe(true);

      // Second request should be blocked
      const result2 = rateLimiter.isAllowed(identifier, endpoint, config);
      expect(result2.allowed).toBe(false);

      // Wait for window to expire
      setTimeout(() => {
        const result3 = rateLimiter.isAllowed(identifier, endpoint, config);
        expect(result3.allowed).toBe(true);
        done();
      }, 20);
    });

    it('should handle cleanup of expired entries', async () => {
      const config = {
        windowMs: 50, // 50ms
        maxRequests: 1,
      };

      const identifier = 'test-user';
      const endpoint = 'test-endpoint';

      // Create an entry
      rateLimiter.isAllowed(identifier, endpoint, config);

      // Wait for it to expire and cleanup
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const store = (rateLimiter as any).store;
      expect(Object.keys(store)).toHaveLength(0);
    }, 10000);
  });

  describe('Memory Management', () => {
    it('should not accumulate unlimited entries', () => {
      const config = {
        windowMs: 60000,
        maxRequests: 1,
      };

      // Create many entries
      for (let i = 0; i < 1000; i++) {
        rateLimiter.isAllowed(`user-${i}`, 'endpoint', config);
      }

      const store = (rateLimiter as any).store;
      expect(Object.keys(store)).toHaveLength(1000);
    });

    it('should cleanup expired entries periodically', async () => {
      const config = {
        windowMs: 50, // 50ms
        maxRequests: 1,
      };

      // Create entries
      rateLimiter.isAllowed('user1', 'endpoint', config);
      rateLimiter.isAllowed('user2', 'endpoint', config);

      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const store = (rateLimiter as any).store;
      expect(Object.keys(store)).toHaveLength(0);
    }, 10000);
  });
});