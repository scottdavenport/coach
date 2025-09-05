import { POST } from '@/app/api/files/process/route';
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { validateFiles } from '@/lib/input-validation';
import { createMockFormDataRequest, createMockUser } from '@/lib/__tests__/api-test-utils';

// Mock all external dependencies
jest.mock('@/lib/supabase/server');
jest.mock('@/lib/rate-limiter');
jest.mock('@/lib/input-validation');

describe('/api/files/process', () => {
  let mockSupabase: any;
  let mockRateLimit: any;
  let mockValidateFiles: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mocks
    mockSupabase = {
      auth: { getUser: jest.fn() },
      storage: { from: jest.fn() },
    };

    mockRateLimit = jest.fn();
    mockValidateFiles = jest.fn();

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    (createRateLimit as jest.Mock).mockReturnValue(mockRateLimit);
    (validateFiles as jest.Mock).mockImplementation(mockValidateFiles);
  });

  describe('Authentication', () => {
    it('should require authentication', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const files = [
        new File(['content'], 'test.pdf', { type: 'application/pdf' }),
      ];
      const request = createMockFormDataRequest(
        'http://localhost:3000/api/files/process',
        files
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('File Validation', () => {
    it('should validate file types', async () => {
      const mockUser = createMockUser();
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockValidateFiles.mockReturnValue({
        valid: false,
        error: 'Unsupported file type: application/x-executable',
      });

      const files = [
        new File(['content'], 'test.exe', { type: 'application/x-executable' }),
      ];
      const request = createMockFormDataRequest(
        'http://localhost:3000/api/files/process',
        files
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe(
        'Unsupported file type: application/x-executable'
      );
    });

    it('should validate file sizes', async () => {
      const mockUser = createMockUser();
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockValidateFiles.mockReturnValue({
        valid: false,
        error: 'File too large: 15.0MB. Maximum size is 10MB.',
      });

      const files = [
        new File(['content'], 'large.pdf', { type: 'application/pdf' }),
      ];
      const request = createMockFormDataRequest(
        'http://localhost:3000/api/files/process',
        files
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('File too large: 15.0MB. Maximum size is 10MB.');
    });

    it('should validate file count', async () => {
      const mockUser = createMockUser();
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockValidateFiles.mockReturnValue({
        valid: false,
        error: 'Too many files: 15. Maximum is 10 files.',
      });

      const files = Array.from({ length: 15 }, (_, i) =>
        new File(['content'], `test${i}.pdf`, { type: 'application/pdf' })
      );
      const request = createMockFormDataRequest(
        'http://localhost:3000/api/files/process',
        files
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Too many files: 15. Maximum is 10 files.');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce file upload rate limits', async () => {
      const mockUser = createMockUser();
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const rateLimitError = new Error(
        'Too many file uploads. Please wait before uploading more files.'
      );
      (rateLimitError as any).statusCode = 429;
      (rateLimitError as any).remaining = 0;
      (rateLimitError as any).resetTime = Date.now() + 300000;

      mockRateLimit.mockImplementation(() => {
        throw rateLimitError;
      });

      const files = [
        new File(['content'], 'test.pdf', { type: 'application/pdf' }),
      ];
      const request = createMockFormDataRequest(
        'http://localhost:3000/api/files/process',
        files
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe(
        'Too many file uploads. Please wait before uploading more files.'
      );
    });
  });

  describe('File Processing', () => {
    it('should process valid files successfully', async () => {
      const mockUser = createMockUser();
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockValidateFiles.mockReturnValue({
        valid: true,
      });

      mockRateLimit.mockReturnValue({
        remaining: 9,
        resetTime: Date.now() + 300000,
      });

      // Mock successful file processing
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

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results).toBeDefined();
    });
  });
});