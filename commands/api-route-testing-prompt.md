# 🧪 **COMPREHENSIVE API ROUTE TESTING IMPLEMENTATION PROMPT**

## **MISSION STATEMENT**

Implement comprehensive, production-ready API route tests for the Coach AI health companion application. This is a critical phase that requires meticulous attention to detail, proper testing patterns, and immediate validation of all implementations.

---

## **📋 CRITICAL LESSONS LEARNED FROM PHASE 1**

### **❌ MISTAKES TO AVOID:**

1. **Missing Dependencies**: Always verify all imports and dependencies exist before writing tests
2. **Incorrect Test Expectations**: Test expectations must match actual implementation behavior
3. **Poor Mock Setup**: Mocks must be properly configured and isolated between tests
4. **Incomplete Function Implementation**: All referenced functions must exist in the actual codebase
5. **No Immediate Testing**: Always test implementations immediately after creation

### **✅ SUCCESS PATTERNS TO FOLLOW:**

1. **Incremental Implementation**: Implement and test one API route at a time
2. **Proper Mock Isolation**: Use `beforeEach` and `afterEach` for clean test state
3. **Realistic Test Data**: Use actual data structures that match the API contracts
4. **Comprehensive Coverage**: Test success cases, error cases, and edge cases
5. **Immediate Validation**: Run tests after each implementation to catch issues early

---

## **🎯 PHASE 2: API ROUTE TESTING IMPLEMENTATION**

### **PRIORITY 1: INTEGRATE SECURITY FEATURES INTO API ROUTES**

**CRITICAL REQUIREMENT**: The security features (rate limiting, input validation) created in Phase 1 must be integrated into actual API routes before testing.

#### **1.1 Update Chat API Route (`src/app/api/chat/route.ts`)**

**Required Integration:**

```typescript
import {
  createRateLimit,
  RATE_LIMITS,
  getClientIdentifier,
} from '@/lib/rate-limiter';
import { validateRequestBody, chatSchemas } from '@/lib/input-validation';

export async function POST(request: NextRequest) {
  try {
    // Add rate limiting
    const rateLimit = createRateLimit(RATE_LIMITS.chat);
    const clientId = getClientIdentifier(request);
    rateLimit(clientId, 'chat');

    // Add input validation
    const body = await request.json();
    const validation = validateRequestBody(body, chatSchemas.message);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.details },
        { status: 400 }
      );
    }

    // Continue with existing logic using validated data
    const {
      message,
      conversationId,
      conversationState,
      ocrData,
      multiFileData,
    } = validation.data;

    // ... rest of existing implementation
  } catch (error: any) {
    // Handle rate limit errors
    if (error.statusCode === 429) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    // Handle other errors...
  }
}
```

#### **1.2 Update File Upload API Route (`src/app/api/files/process/route.ts`)**

**Required Integration:**

```typescript
import {
  createRateLimit,
  RATE_LIMITS,
  getClientIdentifier,
} from '@/lib/rate-limiter';
import { validateFiles } from '@/lib/input-validation';

export async function POST(request: NextRequest) {
  try {
    // Add rate limiting
    const rateLimit = createRateLimit(RATE_LIMITS.fileUpload);
    const clientId = getClientIdentifier(request);
    rateLimit(clientId, 'file-upload');

    // Add file validation
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    const validation = validateFiles(files);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Continue with existing logic using validated files
  } catch (error: any) {
    // Handle rate limit errors
    if (error.statusCode === 429) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    // Handle other errors...
  }
}
```

#### **1.3 Update Health Store API Route (`src/app/api/health/store/route.ts`)**

**Required Integration:**

```typescript
import {
  createRateLimit,
  RATE_LIMITS,
  getClientIdentifier,
} from '@/lib/rate-limiter';
import { validateRequestBody, healthSchemas } from '@/lib/input-validation';

export async function POST(request: NextRequest) {
  try {
    // Add rate limiting
    const rateLimit = createRateLimit(RATE_LIMITS.general);
    const clientId = getClientIdentifier(request);
    rateLimit(clientId, 'health-store');

    // Add input validation
    const body = await request.json();
    const validation = validateRequestBody(body, healthSchemas.eventData);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.details },
        { status: 400 }
      );
    }

    // Continue with existing logic using validated data
  } catch (error: any) {
    // Handle rate limit errors
    if (error.statusCode === 429) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    // Handle other errors...
  }
}
```

---

## **🎯 PRIORITY 2: COMPREHENSIVE API ROUTE TESTS**

### **2.1 Chat API Tests (`src/app/api/__tests__/chat.test.ts`)**

**CRITICAL REQUIREMENTS:**

- Test authentication and authorization
- Test input validation and sanitization
- Test rate limiting enforcement
- Test AI integration (OpenAI)
- Test database operations
- Test error handling scenarios
- Test file upload integration
- Test OCR data processing

**Implementation Template:**

```typescript
import { POST } from '@/app/api/chat/route';
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { validateRequestBody, chatSchemas } from '@/lib/input-validation';

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

    // Setup Supabase mock
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
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

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({ message: 'Test message' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should create user if not exists in database', async () => {
      const mockUser = { id: 'test-user-id', email: 'test@example.com' };
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock user not found in database
      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' }, // User not found
        });

      // Mock successful user creation
      mockSupabase
        .from()
        .insert()
        .select()
        .single.mockResolvedValue({
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

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({ message: 'Test message' }),
      });

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
      const mockUser = { id: 'test-user-id', email: 'test@example.com' };
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockValidateRequestBody.mockReturnValue({
        success: false,
        error: 'Validation failed',
        details: [{ field: 'message', message: 'Message is required' }],
      });

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({ message: '' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid input');
      expect(data.details).toBeDefined();
    });

    it('should validate OCR data structure', async () => {
      const mockUser = { id: 'test-user-id', email: 'test@example.com' };
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

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify(invalidOcrData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid input');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      const mockUser = { id: 'test-user-id', email: 'test@example.com' };
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

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({ message: 'Test message' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe('Too many chat requests. Please slow down.');
    });
  });

  describe('AI Integration', () => {
    it('should process messages with OpenAI', async () => {
      const mockUser = { id: 'test-user-id', email: 'test@example.com' };
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

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({ message: 'Test message' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Test AI response');
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalled();
    });

    it('should handle OpenAI API errors gracefully', async () => {
      const mockUser = { id: 'test-user-id', email: 'test@example.com' };
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

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({ message: 'Test message' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });

  describe('Database Operations', () => {
    it('should store conversation data', async () => {
      const mockUser = { id: 'test-user-id', email: 'test@example.com' };
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
      mockSupabase
        .from()
        .insert()
        .select()
        .single.mockResolvedValue({
          data: { id: 'conv-id' },
          error: null,
        });

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({ message: 'Test message' }),
      });

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
      const mockUser = { id: 'test-user-id', email: 'test@example.com' };
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

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Test message',
          ocrData: ocrData,
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      // Verify OCR data is processed correctly
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const mockUser = { id: 'test-user-id', email: 'test@example.com' };
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

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({ message: 'Test message' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });
});
```

### **2.2 File Upload API Tests (`src/app/api/__tests__/files.test.ts`)**

**CRITICAL REQUIREMENTS:**

- Test file validation (type, size, count)
- Test rate limiting for file uploads
- Test file processing pipeline
- Test OCR integration
- Test storage operations
- Test error handling for invalid files

**Implementation Template:**

```typescript
import { POST } from '@/app/api/files/process/route';
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { validateFiles } from '@/lib/input-validation';

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

      const formData = new FormData();
      formData.append(
        'files',
        new File(['content'], 'test.pdf', { type: 'application/pdf' })
      );

      const request = new NextRequest(
        'http://localhost:3000/api/files/process',
        {
          method: 'POST',
          body: formData,
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('File Validation', () => {
    it('should validate file types', async () => {
      const mockUser = { id: 'test-user-id', email: 'test@example.com' };
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockValidateFiles.mockReturnValue({
        valid: false,
        error: 'Unsupported file type: application/x-executable',
      });

      const formData = new FormData();
      formData.append(
        'files',
        new File(['content'], 'test.exe', { type: 'application/x-executable' })
      );

      const request = new NextRequest(
        'http://localhost:3000/api/files/process',
        {
          method: 'POST',
          body: formData,
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe(
        'Unsupported file type: application/x-executable'
      );
    });

    it('should validate file sizes', async () => {
      const mockUser = { id: 'test-user-id', email: 'test@example.com' };
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockValidateFiles.mockReturnValue({
        valid: false,
        error: 'File too large: 15.0MB. Maximum size is 10MB.',
      });

      const formData = new FormData();
      const largeFile = new File(['content'], 'large.pdf', {
        type: 'application/pdf',
      });
      Object.defineProperty(largeFile, 'size', { value: 15 * 1024 * 1024 });
      formData.append('files', largeFile);

      const request = new NextRequest(
        'http://localhost:3000/api/files/process',
        {
          method: 'POST',
          body: formData,
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('File too large: 15.0MB. Maximum size is 10MB.');
    });

    it('should validate file count', async () => {
      const mockUser = { id: 'test-user-id', email: 'test@example.com' };
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockValidateFiles.mockReturnValue({
        valid: false,
        error: 'Too many files: 15. Maximum is 10 files.',
      });

      const formData = new FormData();
      for (let i = 0; i < 15; i++) {
        formData.append(
          'files',
          new File(['content'], `test${i}.pdf`, { type: 'application/pdf' })
        );
      }

      const request = new NextRequest(
        'http://localhost:3000/api/files/process',
        {
          method: 'POST',
          body: formData,
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Too many files: 15. Maximum is 10 files.');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce file upload rate limits', async () => {
      const mockUser = { id: 'test-user-id', email: 'test@example.com' };
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

      const formData = new FormData();
      formData.append(
        'files',
        new File(['content'], 'test.pdf', { type: 'application/pdf' })
      );

      const request = new NextRequest(
        'http://localhost:3000/api/files/process',
        {
          method: 'POST',
          body: formData,
        }
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
      const mockUser = { id: 'test-user-id', email: 'test@example.com' };
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

      const formData = new FormData();
      formData.append(
        'files',
        new File(['content'], 'test.pdf', { type: 'application/pdf' })
      );

      const request = new NextRequest(
        'http://localhost:3000/api/files/process',
        {
          method: 'POST',
          body: formData,
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.files).toBeDefined();
    });
  });
});
```

### **2.3 Health Store API Tests (`src/app/api/__tests__/health.test.ts`)**

**CRITICAL REQUIREMENTS:**

- Test health data validation
- Test metric storage operations
- Test data transformation
- Test error handling for invalid health data

**Implementation Template:**

```typescript
import { POST } from '@/app/api/health/store/route';
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { validateRequestBody, healthSchemas } from '@/lib/input-validation';

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

      const request = new NextRequest(
        'http://localhost:3000/api/health/store',
        {
          method: 'POST',
          body: JSON.stringify({ events: [] }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Input Validation', () => {
    it('should validate health data structure', async () => {
      const mockUser = { id: 'test-user-id', email: 'test@example.com' };
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockValidateRequestBody.mockReturnValue({
        success: false,
        error: 'Validation failed',
        details: [{ field: 'events', message: 'Events array is required' }],
      });

      const request = new NextRequest(
        'http://localhost:3000/api/health/store',
        {
          method: 'POST',
          body: JSON.stringify({ events: null }),
        }
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
      const mockUser = { id: 'test-user-id', email: 'test@example.com' };
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

      const request = new NextRequest(
        'http://localhost:3000/api/health/store',
        {
          method: 'POST',
          body: JSON.stringify(healthData),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockSupabase.from().insert).toHaveBeenCalled();
    });
  });
});
```

---

## **🎯 PRIORITY 3: TESTING INFRASTRUCTURE SETUP**

### **3.1 Create Test Utilities (`src/lib/__tests__/api-test-utils.ts`)**

**Required Implementation:**

```typescript
import { NextRequest } from 'next/server';

export function createMockRequest(
  url: string,
  method: string = 'GET',
  body?: any,
  headers?: Record<string, string>
): NextRequest {
  const requestInit: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body) {
    requestInit.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  return new NextRequest(url, requestInit);
}

export function createMockFormDataRequest(
  url: string,
  files: File[],
  headers?: Record<string, string>
): NextRequest {
  const formData = new FormData();
  files.forEach(file => formData.append('files', file));

  return new NextRequest(url, {
    method: 'POST',
    body: formData,
    headers,
  });
}

export function createMockUser(overrides: any = {}) {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    ...overrides,
  };
}

export function createMockSupabaseClient() {
  return {
    auth: {
      getUser: jest.fn(),
    },
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
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(),
      })),
    },
  };
}
```

### **3.2 Update Jest Configuration**

**Required Updates to `jest.config.mjs`:**

```javascript
const customJestConfig = {
  // ... existing config
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{js,jsx,ts,tsx}',
    '<rootDir>/src/app/api/__tests__/**/*.{test,spec}.{js,jsx,ts,tsx}', // Add API tests
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // ... rest of config
};
```

---

## **🎯 PRIORITY 4: IMMEDIATE TESTING AND VALIDATION**

### **4.1 Testing Protocol**

**CRITICAL REQUIREMENT**: After implementing each API route test, immediately run tests to validate:

1. **Test Compilation**: Ensure no TypeScript errors
2. **Test Execution**: Ensure tests run without runtime errors
3. **Test Results**: Verify expected pass/fail behavior
4. **Coverage**: Check that tests cover the intended functionality

**Testing Commands:**

```bash
# Test specific API route
npm test -- --testPathPattern="chat.test"

# Test all API routes
npm test -- --testPathPattern="api/__tests__"

# Test with coverage
npm test -- --coverage --testPathPattern="api/__tests__"

# Test specific functionality
npm test -- --testNamePattern="Authentication|Input Validation|Rate Limiting"
```

### **4.2 Validation Checklist**

**For Each API Route Test:**

- [ ] All imports resolve correctly
- [ ] Mocks are properly configured
- [ ] Test data matches actual API contracts
- [ ] Error scenarios are tested
- [ ] Success scenarios are tested
- [ ] Edge cases are covered
- [ ] Tests run without errors
- [ ] Tests produce expected results

---

## **🎯 PRIORITY 5: INTEGRATION TESTING**

### **5.1 End-to-End API Testing**

**Create integration tests that test complete workflows:**

```typescript
// src/app/api/__tests__/integration.test.ts
describe('API Integration Tests', () => {
  describe('Complete Chat Workflow', () => {
    it('should handle complete user conversation flow', async () => {
      // 1. User authentication
      // 2. Message validation
      // 3. Rate limiting check
      // 4. AI processing
      // 5. Database storage
      // 6. Response formatting
    });
  });

  describe('File Upload Workflow', () => {
    it('should handle complete file upload and processing', async () => {
      // 1. Authentication
      // 2. File validation
      // 3. Rate limiting
      // 4. File processing
      // 5. Storage upload
      // 6. OCR processing
      // 7. Database storage
    });
  });
});
```

---

## **📋 IMPLEMENTATION TIMELINE**

### **Day 1: Security Integration**

- [ ] Integrate rate limiting into chat API
- [ ] Integrate input validation into chat API
- [ ] Test security integration

### **Day 2: Chat API Tests**

- [ ] Implement comprehensive chat API tests
- [ ] Test authentication, validation, rate limiting
- [ ] Test AI integration and error handling

### **Day 3: File Upload API Tests**

- [ ] Integrate security features into file upload API
- [ ] Implement comprehensive file upload tests
- [ ] Test file validation and processing

### **Day 4: Health API Tests**

- [ ] Integrate security features into health API
- [ ] Implement comprehensive health API tests
- [ ] Test data validation and storage

### **Day 5: Integration and Validation**

- [ ] Implement integration tests
- [ ] Run complete test suite
- [ ] Validate coverage and results

---

## **🎯 SUCCESS METRICS**

### **Coverage Targets**

- **API Route Tests**: 95%+ coverage for all API endpoints
- **Security Features**: 100% coverage for rate limiting and input validation
- **Error Handling**: 90%+ coverage for error scenarios
- **Integration Tests**: 100% coverage for critical workflows

### **Quality Gates**

- All API route tests must pass
- Security features must be integrated and tested
- No TypeScript compilation errors
- No runtime test errors
- Comprehensive error scenario coverage

---

## **🚨 CRITICAL SUCCESS FACTORS**

### **1. Immediate Testing After Each Implementation**

- **NEVER** implement multiple tests without testing each one
- **ALWAYS** run tests after each API route implementation
- **IMMEDIATELY** fix any compilation or runtime errors

### **2. Proper Mock Configuration**

- **ISOLATE** mocks between tests using `beforeEach`/`afterEach`
- **VERIFY** mock implementations match actual API behavior
- **TEST** both success and error scenarios with mocks

### **3. Realistic Test Data**

- **USE** actual data structures that match API contracts
- **INCLUDE** edge cases and boundary conditions
- **VALIDATE** that test data represents real-world scenarios

### **4. Security Integration Priority**

- **INTEGRATE** security features into API routes BEFORE testing
- **TEST** rate limiting and input validation thoroughly
- **VERIFY** security features work in production scenarios

---

## **✅ CONCLUSION**

This comprehensive prompt provides everything needed to implement production-ready API route tests:

1. **Security Integration**: Step-by-step integration of rate limiting and input validation
2. **Comprehensive Test Templates**: Complete test implementations for all API routes
3. **Testing Infrastructure**: Proper mock setup and test utilities
4. **Immediate Validation**: Testing protocol to catch issues early
5. **Success Metrics**: Clear targets and quality gates

**CRITICAL**: Follow the testing protocol religiously - test after each implementation to avoid the issues encountered in Phase 1.

**SUCCESS**: Achieve 95%+ API test coverage with all security features integrated and tested.

---

**Remember: Quality is not an accident. It is the result of intelligent effort, careful planning, and relentless attention to detail.**
