/**
 * Comprehensive tests for input validation utilities
 */

import {
  commonSchemas,
  chatSchemas,
  fileSchemas,
  healthSchemas,
  preferenceSchemas,
  sanitizeString,
  sanitizeObject,
  validateRequestBody,
  validateFile,
  validateFiles,
  validateUrlParams,
  validateQueryParams,
} from '../input-validation';

describe('Input Validation', () => {
  describe('Common Schemas', () => {
    describe('uuid', () => {
      it('should validate correct UUID format', () => {
        const validUuid = '123e4567-e89b-12d3-a456-426614174000';
        const result = commonSchemas.uuid.safeParse(validUuid);
        expect(result.success).toBe(true);
      });

      it('should reject invalid UUID format', () => {
        const invalidUuid = 'not-a-uuid';
        const result = commonSchemas.uuid.safeParse(invalidUuid);
        expect(result.success).toBe(false);
      });
    });

    describe('email', () => {
      it('should validate correct email format', () => {
        const validEmail = 'test@example.com';
        const result = commonSchemas.email.safeParse(validEmail);
        expect(result.success).toBe(true);
      });

      it('should reject invalid email format', () => {
        const invalidEmail = 'not-an-email';
        const result = commonSchemas.email.safeParse(invalidEmail);
        expect(result.success).toBe(false);
      });
    });

    describe('date', () => {
      it('should validate correct date format', () => {
        const validDate = '2025-01-15';
        const result = commonSchemas.date.safeParse(validDate);
        expect(result.success).toBe(true);
      });

      it('should reject invalid date format', () => {
        const invalidDate = '15/01/2025';
        const result = commonSchemas.date.safeParse(invalidDate);
        expect(result.success).toBe(false);
      });
    });

    describe('positiveNumber', () => {
      it('should validate positive numbers', () => {
        const result = commonSchemas.positiveNumber.safeParse(42);
        expect(result.success).toBe(true);
      });

      it('should reject negative numbers', () => {
        const result = commonSchemas.positiveNumber.safeParse(-5);
        expect(result.success).toBe(false);
      });

      it('should reject zero', () => {
        const result = commonSchemas.positiveNumber.safeParse(0);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Chat Schemas', () => {
    describe('message', () => {
      it('should validate correct message format', () => {
        const validMessage = {
          message: 'Hello, Coach!',
          conversationId: '123e4567-e89b-12d3-a456-426614174000',
          conversationState: 'active' as const,
        };
        const result = chatSchemas.message.safeParse(validMessage);
        expect(result.success).toBe(true);
      });

      it('should reject empty message', () => {
        const invalidMessage = {
          message: '',
          conversationId: '123e4567-e89b-12d3-a456-426614174000',
        };
        const result = chatSchemas.message.safeParse(invalidMessage);
        expect(result.success).toBe(false);
      });

      it('should reject message that is too long', () => {
        const longMessage = 'a'.repeat(1001);
        const invalidMessage = {
          message: longMessage,
          conversationId: '123e4567-e89b-12d3-a456-426614174000',
        };
        const result = chatSchemas.message.safeParse(invalidMessage);
        expect(result.success).toBe(false);
      });

      it('should reject invalid conversation state', () => {
        const invalidMessage = {
          message: 'Hello, Coach!',
          conversationState: 'invalid' as any,
        };
        const result = chatSchemas.message.safeParse(invalidMessage);
        expect(result.success).toBe(false);
      });
    });

    describe('ocrData', () => {
      it('should validate correct OCR data format', () => {
        const validOcrData = {
          sleepScore: 85,
          totalSleep: 7.5,
          restingHeartRate: 65,
          heartRateVariability: 45,
        };
        const result = chatSchemas.ocrData.safeParse(validOcrData);
        expect(result.success).toBe(true);
      });

      it('should reject invalid sleep score', () => {
        const invalidOcrData = {
          sleepScore: 150, // Invalid: > 100
        };
        const result = chatSchemas.ocrData.safeParse(invalidOcrData);
        expect(result.success).toBe(false);
      });

      it('should reject negative values for positive fields', () => {
        const invalidOcrData = {
          totalSleep: -5, // Invalid: negative
        };
        const result = chatSchemas.ocrData.safeParse(invalidOcrData);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('File Schemas', () => {
    describe('file', () => {
      it('should validate correct file format', () => {
        const validFile = {
          name: 'test.pdf',
          size: 1024,
          type: 'application/pdf',
        };
        const result = fileSchemas.file.safeParse(validFile);
        expect(result.success).toBe(true);
      });

      it('should reject file with no name', () => {
        const invalidFile = {
          name: '',
          size: 1024,
          type: 'application/pdf',
        };
        const result = fileSchemas.file.safeParse(invalidFile);
        expect(result.success).toBe(false);
      });

      it('should reject file that is too large', () => {
        const invalidFile = {
          name: 'test.pdf',
          size: 11 * 1024 * 1024, // 11MB
          type: 'application/pdf',
        };
        const result = fileSchemas.file.safeParse(invalidFile);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Health Schemas', () => {
    describe('metricData', () => {
      it('should validate correct metric data format', () => {
        const validMetricData = {
          metric_date: '2025-01-15',
          metric_key: 'sleep_duration',
          metric_value: 7.5,
          confidence: 0.9,
        };
        const result = healthSchemas.metricData.safeParse(validMetricData);
        expect(result.success).toBe(true);
      });

      it('should reject invalid confidence value', () => {
        const invalidMetricData = {
          metric_date: '2025-01-15',
          metric_key: 'sleep_duration',
          confidence: 1.5, // Invalid: > 1
        };
        const result = healthSchemas.metricData.safeParse(invalidMetricData);
        expect(result.success).toBe(false);
      });
    });

    describe('eventData', () => {
      it('should validate correct event data format', () => {
        const validEventData = {
          event_type: 'check-in' as const,
          data: { weight: 180, energy: 7 },
          confidence: 0.8,
        };
        const result = healthSchemas.eventData.safeParse(validEventData);
        expect(result.success).toBe(true);
      });

      it('should reject invalid event type', () => {
        const invalidEventData = {
          event_type: 'invalid' as any,
          data: { weight: 180 },
        };
        const result = healthSchemas.eventData.safeParse(invalidEventData);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Preference Schemas', () => {
    describe('timezone', () => {
      it('should validate correct timezone format', () => {
        const validTimezone = {
          timezone: 'America/New_York',
        };
        const result = preferenceSchemas.timezone.safeParse(validTimezone);
        expect(result.success).toBe(true);
      });

      it('should reject empty timezone', () => {
        const invalidTimezone = {
          timezone: '',
        };
        const result = preferenceSchemas.timezone.safeParse(invalidTimezone);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Sanitization Functions', () => {
    describe('sanitizeString', () => {
      it('should sanitize HTML tags', () => {
        const input = '<script>alert("xss")</script>';
        const result = sanitizeString(input);
        expect(result).toBe('scriptalert("xss")/script');
      });

      it('should remove javascript: protocol', () => {
        const input = 'javascript:alert("xss")';
        const result = sanitizeString(input);
        expect(result).toBe('alert("xss")');
      });

      it('should remove event handlers', () => {
        const input = 'onclick="alert(\'xss\')"';
        const result = sanitizeString(input);
        expect(result).toBe('alert(\'xss\')"');
      });

      it('should trim whitespace', () => {
        const input = '  hello world  ';
        const result = sanitizeString(input);
        expect(result).toBe('hello world');
      });

      it('should limit length', () => {
        const input = 'a'.repeat(2000);
        const result = sanitizeString(input);
        expect(result.length).toBe(1000);
      });

      it('should handle non-string input', () => {
        const result = sanitizeString(null as any);
        expect(result).toBe('');
      });
    });

    describe('sanitizeObject', () => {
      it('should sanitize nested objects', () => {
        const input = {
          name: '<script>alert("xss")</script>',
          data: {
            description: 'javascript:alert("xss")',
            value: 42,
          },
          items: ['<b>bold</b>', 'normal text'],
        };
        const result = sanitizeObject(input);
        expect(result.name).toBe('scriptalert("xss")/script');
        expect(result.data.description).toBe('alert("xss")');
        expect(result.data.value).toBe(42);
        expect(result.items[0]).toBe('bbold/b');
        expect(result.items[1]).toBe('normal text');
      });

      it('should handle null and undefined', () => {
        expect(sanitizeObject(null)).toBe(null);
        expect(sanitizeObject(undefined)).toBe(undefined);
      });

      it('should handle arrays', () => {
        const input = ['<script>alert("xss")</script>', 'normal text'];
        const result = sanitizeObject(input);
        expect(result[0]).toBe('scriptalert("xss")/script');
        expect(result[1]).toBe('normal text');
      });
    });
  });

  describe('validateRequestBody', () => {
    it('should validate and sanitize request body', () => {
      const schema = z.object({
        message: z.string().min(1),
        value: z.number(),
      });
      
      const body = {
        message: '<script>alert("xss")</script>Hello',
        value: 42,
      };
      
      const result = validateRequestBody(body, schema);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.message).toBe('scriptalert("xss")/scriptHello');
        expect(result.data.value).toBe(42);
      }
    });

    it('should return error for invalid data', () => {
      const schema = z.object({
        message: z.string().min(1),
        value: z.number(),
      });
      
      const body = {
        message: '',
        value: 'not-a-number',
      };
      
      const result = validateRequestBody(body, schema);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Validation failed');
        expect(result.details).toBeDefined();
      }
    });
  });

  describe('validateFile', () => {
    it('should validate correct file', () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(file, 'size', { value: 1024 });
      
      const result = validateFile(file);
      expect(result.valid).toBe(true);
    });

    it('should reject file that is too large', () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(file, 'size', { value: 11 * 1024 * 1024 }); // 11MB
      
      const result = validateFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too large');
    });

    it('should reject file with dangerous name', () => {
      const file = new File(['content'], '../../../etc/passwd', { type: 'text/plain' });
      Object.defineProperty(file, 'size', { value: 1024 });
      
      const result = validateFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid file name');
    });

    it('should reject unsupported file type', () => {
      const file = new File(['content'], 'test.exe', { type: 'application/x-executable' });
      Object.defineProperty(file, 'size', { value: 1024 });
      
      const result = validateFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unsupported file type');
    });
  });

  describe('validateFiles', () => {
    it('should validate multiple files', () => {
      const files = [
        new File(['content1'], 'test1.pdf', { type: 'application/pdf' }),
        new File(['content2'], 'test2.txt', { type: 'text/plain' }),
      ];
      files.forEach(file => Object.defineProperty(file, 'size', { value: 1024 }));
      
      const result = validateFiles(files);
      expect(result.valid).toBe(true);
    });

    it('should reject too many files', () => {
      const files = Array.from({ length: 11 }, (_, i) => {
        const file = new File(['content'], `test${i}.pdf`, { type: 'application/pdf' });
        Object.defineProperty(file, 'size', { value: 1024 });
        return file;
      });
      
      const result = validateFiles(files);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Too many files');
    });

    it('should reject empty file list', () => {
      const result = validateFiles([]);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('At least one file is required');
    });
  });

  describe('validateUrlParams', () => {
    it('should validate URL parameters', () => {
      const schema = z.object({
        id: z.string().uuid(),
        action: z.enum(['view', 'edit']),
      });
      
      const params = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        action: 'view',
      };
      
      const result = validateUrlParams(params, schema);
      expect(result.success).toBe(true);
    });

    it('should reject invalid URL parameters', () => {
      const schema = z.object({
        id: z.string().uuid(),
        action: z.enum(['view', 'edit']),
      });
      
      const params = {
        id: 'not-a-uuid',
        action: 'invalid',
      };
      
      const result = validateUrlParams(params, schema);
      expect(result.success).toBe(false);
    });
  });

  describe('validateQueryParams', () => {
    it('should validate query parameters', () => {
      const schema = z.object({
        page: z.string().transform(Number),
        limit: z.string().transform(Number),
      });
      
      const searchParams = new URLSearchParams('page=1&limit=10');
      const result = validateQueryParams(searchParams, schema);
      expect(result.success).toBe(true);
    });

    it('should reject invalid query parameters', () => {
      const schema = z.object({
        page: z.string().transform(Number),
        limit: z.string().transform(Number),
      });
      
      const searchParams = new URLSearchParams('page=invalid&limit=abc');
      const result = validateQueryParams(searchParams, schema);
      expect(result.success).toBe(false);
    });
  });
});