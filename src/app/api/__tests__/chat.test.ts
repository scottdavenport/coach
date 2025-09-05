import { POST } from '@/app/api/chat/route';
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { validateRequestBody, chatSchemas } from '@/lib/input-validation';
import { createMockRequest, createMockUser } from '@/lib/__tests__/api-test-utils';

// Mock all external dependencies
jest.mock('@/lib/supabase/server');
jest.mock('openai');
jest.mock('@/lib/rate-limiter');
jest.mock('@/lib/input-validation');

describe('/api/chat', () => {
  let mockSupabase: any;
  let mockOpenAI: any;
  let mockRateLimit: any;
  let mockValidateRequestBody: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup Supabase mock with proper chaining
    const mockSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn(),
      }),
    });

    const mockInsert = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn(),
      }),
    });

    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn().mockReturnValue({
        select: mockSelect,
        insert: mockInsert,
      }),
    };

    // Setup OpenAI mock
    mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    };

    // Setup rate limiter mock
    mockRateLimit = jest.fn();

    // Setup input validation mock
    mockValidateRequestBody = jest.fn();

    // Apply mocks
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    (createRateLimit as jest.Mock).mockReturnValue(mockRateLimit);
    (validateRequestBody as jest.Mock).mockImplementation(
      mockValidateRequestBody
    );
  });

  describe('Authentication', () => {
    it('should return 401 for unauthenticated requests', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const request = createMockRequest(
        'http://localhost:3000/api/chat',
        'POST',
        { message: 'Test message' }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should create user if not exists in database', async () => {
      const mockUser = createMockUser();
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock user not found in database
      const mockSelect = mockSupabase.from().select();
      mockSelect.eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }, // User not found
      });

      // Mock successful user creation
      const mockInsert = mockSupabase.from().insert();
      mockInsert.select().single.mockResolvedValue({
        data: { id: 'test-user-id' },
        error: null,
      });

      mockValidateRequestBody.mockReturnValue({
        success: true,
        data: { message: 'Test message' },
      });

      mockRateLimit.mockReturnValue({
        remaining: 29,
        resetTime: Date.now() + 60000,
      });

      const request = createMockRequest(
        'http://localhost:3000/api/chat',
        'POST',
        { message: 'Test message' }
      );

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockSupabase.from().insert).toHaveBeenCalledWith({
        id: mockUser.id,
        email: mockUser.email,
      });
    });
  });

  describe('Input Validation', () => {
    it('should validate message format', async () => {
      const mockUser = createMockUser();
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockValidateRequestBody.mockReturnValue({
        success: false,
        error: 'Validation failed',
        details: [{ field: 'message', message: 'Message is required' }],
      });

      const request = createMockRequest(
        'http://localhost:3000/api/chat',
        'POST',
        { message: '' }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid input');
      expect(data.details).toBeDefined();
    });

    it('should validate OCR data structure', async () => {
      const mockUser = createMockUser();
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const invalidOcrData = {
        message: 'Test message',
        ocrData: {
          invalidField: 'invalid',
        },
      };

      mockValidateRequestBody.mockReturnValue({
        success: false,
        error: 'Validation failed',
        details: [{ field: 'ocrData', message: 'Invalid OCR data structure' }],
      });

      const request = createMockRequest(
        'http://localhost:3000/api/chat',
        'POST',
        invalidOcrData
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid input');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      const mockUser = createMockUser();
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock rate limit exceeded
      const rateLimitError = new Error(
        'Too many chat requests. Please slow down.'
      );
      (rateLimitError as any).statusCode = 429;
      (rateLimitError as any).remaining = 0;
      (rateLimitError as any).resetTime = Date.now() + 60000;

      mockRateLimit.mockImplementation(() => {
        throw rateLimitError;
      });

      const request = createMockRequest(
        'http://localhost:3000/api/chat',
        'POST',
        { message: 'Test message' }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe('Too many chat requests. Please slow down.');
    });
  });

  describe('AI Integration', () => {
    it('should process messages with OpenAI', async () => {
      const mockUser = createMockUser();
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockValidateRequestBody.mockReturnValue({
        success: true,
        data: { message: 'Test message' },
      });

      mockRateLimit.mockReturnValue({
        remaining: 29,
        resetTime: Date.now() + 60000,
      });

      // Mock OpenAI response
      const mockOpenAIResponse = {
        choices: [
          {
            message: {
              content: 'Test AI response',
            },
          },
        ],
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockOpenAIResponse);

      const request = createMockRequest(
        'http://localhost:3000/api/chat',
        'POST',
        { message: 'Test message' }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Test AI response');
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalled();
    });

    it('should handle OpenAI API errors gracefully', async () => {
      const mockUser = createMockUser();
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockValidateRequestBody.mockReturnValue({
        success: true,
        data: { message: 'Test message' },
      });

      mockRateLimit.mockReturnValue({
        remaining: 29,
        resetTime: Date.now() + 60000,
      });

      // Mock OpenAI error
      mockOpenAI.chat.completions.create.mockRejectedValue(
        new Error('OpenAI API error')
      );

      const request = createMockRequest(
        'http://localhost:3000/api/chat',
        'POST',
        { message: 'Test message' }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });

  describe('Database Operations', () => {
    it('should store conversation data', async () => {
      const mockUser = createMockUser();
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockValidateRequestBody.mockReturnValue({
        success: true,
        data: { message: 'Test message' },
      });

      mockRateLimit.mockReturnValue({
        remaining: 29,
        resetTime: Date.now() + 60000,
      });

      // Mock successful conversation storage
      const mockInsert = mockSupabase.from().insert();
      mockInsert.select().single.mockResolvedValue({
        data: { id: 'conv-id' },
        error: null,
      });

      const request = createMockRequest(
        'http://localhost:3000/api/chat',
        'POST',
        { message: 'Test message' }
      );

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUser.id,
          message: 'Test message',
        })
      );
    });
  });

  describe('File Upload Integration', () => {
    it('should handle file uploads with OCR data', async () => {
      const mockUser = createMockUser();
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const ocrData = {
        rawOcrText: 'Extracted text from image',
        sleepScore: 85,
        totalSleep: 7.5,
      };

      mockValidateRequestBody.mockReturnValue({
        success: true,
        data: {
          message: 'Test message',
          ocrData: ocrData,
        },
      });

      mockRateLimit.mockReturnValue({
        remaining: 29,
        resetTime: Date.now() + 60000,
      });

      // Mock successful conversation storage
      const mockInsert = mockSupabase.from().insert();
      mockInsert.select().single.mockResolvedValue({
        data: { id: 'conv-id' },
        error: null,
      });

      const request = createMockRequest(
        'http://localhost:3000/api/chat',
        'POST',
        {
          message: 'Test message',
          ocrData: ocrData,
        }
      );

      const response = await POST(request);

      expect(response.status).toBe(200);
      // Verify OCR data is processed correctly
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const mockUser = createMockUser();
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockValidateRequestBody.mockReturnValue({
        success: true,
        data: { message: 'Test message' },
      });

      mockRateLimit.mockReturnValue({
        remaining: 29,
        resetTime: Date.now() + 60000,
      });

      // Mock database error
      mockSupabase
        .from()
        .insert()
        .select()
        .single.mockResolvedValue({
          data: null,
          error: { message: 'Database connection failed' },
        });

      const request = createMockRequest(
        'http://localhost:3000/api/chat',
        'POST',
        { message: 'Test message' }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });
});