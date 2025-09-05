import { POST as chatPOST } from '@/app/api/chat/route';
import { POST as filesPOST } from '@/app/api/files/process/route';
import { POST as healthPOST } from '@/app/api/health/store/route';
import { createMockRequest, createMockFormDataRequest, createMockUser } from '@/lib/__tests__/api-test-utils';

// Mock all external dependencies
jest.mock('@/lib/supabase/server');
jest.mock('openai');
jest.mock('@/lib/rate-limiter');
jest.mock('@/lib/input-validation');

describe('API Integration Tests', () => {
  let mockSupabase: any;
  let mockOpenAI: any;
  let mockRateLimit: any;
  let mockValidateRequestBody: any;
  let mockValidateFiles: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup comprehensive mocks
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
      storage: { from: jest.fn(() => ({ upload: jest.fn() })) },
    };

    mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    };

    mockRateLimit = jest.fn();
    mockValidateRequestBody = jest.fn();
    mockValidateFiles = jest.fn();

    // Apply mocks
    const { createClient } = require('@/lib/supabase/server');
    const { createRateLimit } = require('@/lib/rate-limiter');
    const { validateRequestBody, validateFiles } = require('@/lib/input-validation');

    createClient.mockResolvedValue(mockSupabase);
    createRateLimit.mockReturnValue(mockRateLimit);
    validateRequestBody.mockImplementation(mockValidateRequestBody);
    validateFiles.mockImplementation(mockValidateFiles);
  });

  describe('Complete Chat Workflow', () => {
    it('should handle complete user conversation flow', async () => {
      const mockUser = createMockUser();
      
      // Setup authentication
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Setup user exists in database
      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockResolvedValue({
          data: { id: mockUser.id },
          error: null,
        });

      // Setup input validation
      mockValidateRequestBody.mockReturnValue({
        success: true,
        data: { message: 'Hello, how are you?' },
      });

      // Setup rate limiting
      mockRateLimit.mockReturnValue({
        remaining: 29,
        resetTime: Date.now() + 60000,
      });

      // Setup OpenAI response
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'I am doing well, thank you!' } }],
      });

      // Setup conversation storage
      mockSupabase
        .from()
        .insert()
        .select()
        .single.mockResolvedValue({
          data: { id: 'conv-id' },
          error: null,
        });

      const request = createMockRequest(
        'http://localhost:3000/api/chat',
        'POST',
        { message: 'Hello, how are you?' }
      );

      const response = await chatPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('I am doing well, thank you!');
      expect(mockSupabase.from().insert).toHaveBeenCalled();
    });
  });

  describe('File Upload Workflow', () => {
    it('should handle complete file upload and processing', async () => {
      const mockUser = createMockUser();
      
      // Setup authentication
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Setup file validation
      mockValidateFiles.mockReturnValue({
        valid: true,
      });

      // Setup rate limiting
      mockRateLimit.mockReturnValue({
        remaining: 9,
        resetTime: Date.now() + 300000,
      });

      // Setup file storage
      mockSupabase.storage.from.mockReturnValue({
        upload: jest.fn().mockResolvedValue({
          data: { path: 'uploads/test.pdf' },
          error: null,
        }),
      });

      const files = [
        new File(['content'], 'test.pdf', { type: 'application/pdf' }),
      ];
      const request = createMockFormDataRequest(
        'http://localhost:3000/api/files/process',
        files
      );

      const response = await filesPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results).toBeDefined();
    });
  });

  describe('Health Data Workflow', () => {
    it('should handle complete health data storage', async () => {
      const mockUser = createMockUser();
      
      // Setup authentication
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

      // Setup input validation
      mockValidateRequestBody.mockReturnValue({
        success: true,
        data: healthData,
      });

      // Setup rate limiting
      mockRateLimit.mockReturnValue({
        remaining: 99,
        resetTime: Date.now() + 60000,
      });

      // Setup successful storage
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

      const response = await healthPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Cross-API Security Integration', () => {
    it('should enforce rate limiting across all APIs', async () => {
      const mockUser = createMockUser();
      
      // Setup authentication
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Setup rate limit exceeded
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).statusCode = 429;
      (rateLimitError as any).remaining = 0;
      (rateLimitError as any).resetTime = Date.now() + 60000;

      mockRateLimit.mockImplementation(() => {
        throw rateLimitError;
      });

      // Test chat API rate limiting
      const chatRequest = createMockRequest(
        'http://localhost:3000/api/chat',
        'POST',
        { message: 'Test message' }
      );

      const chatResponse = await chatPOST(chatRequest);
      expect(chatResponse.status).toBe(429);

      // Test file upload API rate limiting
      const files = [new File(['content'], 'test.pdf', { type: 'application/pdf' })];
      const filesRequest = createMockFormDataRequest(
        'http://localhost:3000/api/files/process',
        files
      );

      const filesResponse = await filesPOST(filesRequest);
      expect(filesResponse.status).toBe(429);

      // Test health API rate limiting
      const healthRequest = createMockRequest(
        'http://localhost:3000/api/health/store',
        'POST',
        { events: [] }
      );

      const healthResponse = await healthPOST(healthRequest);
      expect(healthResponse.status).toBe(429);
    });

    it('should enforce input validation across all APIs', async () => {
      const mockUser = createMockUser();
      
      // Setup authentication
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Setup rate limiting
      mockRateLimit.mockReturnValue({
        remaining: 29,
        resetTime: Date.now() + 60000,
      });

      // Setup validation failures
      mockValidateRequestBody.mockReturnValue({
        success: false,
        error: 'Validation failed',
        details: [{ field: 'message', message: 'Message is required' }],
      });

      mockValidateFiles.mockReturnValue({
        valid: false,
        error: 'Invalid file type',
      });

      // Test chat API validation
      const chatRequest = createMockRequest(
        'http://localhost:3000/api/chat',
        'POST',
        { message: '' }
      );

      const chatResponse = await chatPOST(chatRequest);
      expect(chatResponse.status).toBe(400);

      // Test file upload API validation
      const files = [new File(['content'], 'test.exe', { type: 'application/x-executable' })];
      const filesRequest = createMockFormDataRequest(
        'http://localhost:3000/api/files/process',
        files
      );

      const filesResponse = await filesPOST(filesRequest);
      expect(filesResponse.status).toBe(400);

      // Test health API validation
      const healthRequest = createMockRequest(
        'http://localhost:3000/api/health/store',
        'POST',
        { events: null }
      );

      const healthResponse = await healthPOST(healthRequest);
      expect(healthResponse.status).toBe(400);
    });
  });
});