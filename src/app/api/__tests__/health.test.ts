import { POST } from '@/app/api/health/store/route';
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { validateRequestBody, healthSchemas } from '@/lib/input-validation';
import { createMockRequest, createMockUser } from '@/lib/__tests__/api-test-utils';

// Mock all external dependencies
jest.mock('@/lib/supabase/server');
jest.mock('@/lib/rate-limiter');
jest.mock('@/lib/input-validation');

describe('/api/health/store', () => {
  let mockSupabase: any;
  let mockRateLimit: any;
  let mockValidateRequestBody: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      auth: { getUser: jest.fn() },
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(),
          })),
        })),
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(),
          })),
        })),
      })),
    };

    mockRateLimit = jest.fn();
    mockValidateRequestBody = jest.fn();

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    (createRateLimit as jest.Mock).mockReturnValue(mockRateLimit);
    (validateRequestBody as jest.Mock).mockImplementation(
      mockValidateRequestBody
    );
  });

  describe('Authentication', () => {
    it('should require authentication', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const request = createMockRequest(
        'http://localhost:3000/api/health/store',
        'POST',
        { events: [] }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Input Validation', () => {
    it('should validate health data structure', async () => {
      const mockUser = createMockUser();
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockValidateRequestBody.mockReturnValue({
        success: false,
        error: 'Validation failed',
        details: [{ field: 'events', message: 'Events array is required' }],
      });

      const request = createMockRequest(
        'http://localhost:3000/api/health/store',
        'POST',
        { events: null }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid input');
      expect(data.details).toBeDefined();
    });
  });

  describe('Data Storage', () => {
    it('should store health metrics successfully', async () => {
      const mockUser = createMockUser();
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const healthData = {
        events: [
          {
            event_type: 'check-in',
            data: { weight: 180, mood: 'good' },
            confidence: 0.9,
          },
        ],
        contextData: [],
        dailySummary: 'Good day overall',
      };

      mockValidateRequestBody.mockReturnValue({
        success: true,
        data: healthData,
      });

      mockRateLimit.mockReturnValue({
        remaining: 99,
        resetTime: Date.now() + 60000,
      });

      // Mock successful storage
      mockSupabase
        .from()
        .insert()
        .select()
        .single.mockResolvedValue({
          data: { id: 'metric-id' },
          error: null,
        });

      const request = createMockRequest(
        'http://localhost:3000/api/health/store',
        'POST',
        healthData
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockSupabase.from().insert).toHaveBeenCalled();
    });
  });
});