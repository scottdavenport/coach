/**
 * Input validation utilities for API endpoints
 * Provides comprehensive validation and sanitization for user inputs
 */

import { z } from 'zod';

// Common validation schemas
export const commonSchemas = {
  uuid: z.string().uuid('Invalid UUID format'),
  email: z.string().email('Invalid email format'),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  timezone: z.string().min(1, 'Timezone is required'),
  positiveNumber: z.number().positive('Must be a positive number'),
  nonEmptyString: z.string().min(1, 'String cannot be empty'),
  maxLength: (max: number) =>
    z.string().max(max, `String must be ${max} characters or less`),
  minLength: (min: number) =>
    z.string().min(min, `String must be at least ${min} characters`),
};

// Chat API validation schemas
export const chatSchemas = {
  message: z.object({
    message: commonSchemas
      .maxLength(1000)
      .refine(
        msg => msg.trim().length > 0,
        'Message cannot be empty or only whitespace'
      ),
    conversationId: z.string().optional(),
    conversationState: z
      .enum([
        'idle',
        'morning_checkin',
        'activity_planning',
        'data_clarification',
        'correction',
        'multi_file_analysis',
        'emergency_mode',
      ])
      .optional(),
    checkinProgress: z.any().optional(),
    ocrData: z.any().optional(),
    multiFileData: z.any().optional(),
  }),

  // Validate OCR data structure
  ocrData: z
    .object({
      rawOcrText: z.string().optional(),
      sleepScore: z.number().min(0).max(100).optional(),
      totalSleep: z.number().positive().optional(),
      timeInBed: z.number().positive().optional(),
      sleepEfficiency: z.number().min(0).max(100).optional(),
      restingHeartRate: z.number().positive().optional(),
      heartRateVariability: z.number().positive().optional(),
      readiness_score: z.number().min(0).max(100).optional(),
      bodyTemperature: z.number().optional(),
      respiratoryRate: z.number().positive().optional(),
      oxygenSaturation: z.number().min(0).max(100).optional(),
      remSleep: z.number().min(0).optional(),
      deepSleep: z.number().min(0).optional(),
    })
    .optional(),

  // Validate multi-file data structure
  multiFileData: z
    .object({
      images: z
        .array(
          z.object({
            fileName: z.string(),
            fileSize: z.number().positive(),
            mimeType: z.string(),
            uploadId: z.string().optional(),
            ocrData: z.any().optional(),
            error: z.string().optional(),
          })
        )
        .optional(),
      documents: z
        .array(
          z.object({
            fileName: z.string(),
            fileSize: z.number().positive(),
            mimeType: z.string(),
            uploadId: z.string().optional(),
            content: z.string().optional(),
            error: z.string().optional(),
          })
        )
        .optional(),
    })
    .optional(),
};

// File upload validation schemas
export const fileSchemas = {
  fileUpload: z.object({
    files: z
      .array(z.instanceof(File))
      .min(1, 'At least one file is required')
      .max(10, 'Maximum 10 files allowed'),
  }),

  // Validate individual file
  file: z.object({
    name: z.string().min(1, 'File name is required'),
    size: z
      .number()
      .positive('File size must be positive')
      .max(10 * 1024 * 1024, 'File size must be less than 10MB'),
    type: z.string().min(1, 'File type is required'),
  }),
};

// Health data validation schemas
export const healthSchemas = {
  metricData: z.object({
    metric_date: commonSchemas.date,
    metric_key: z.string().min(1, 'Metric key is required'),
    metric_value: z.number().optional(),
    text_value: z.string().optional(),
    confidence: z.number().min(0).max(1).optional(),
  }),

  eventData: z.object({
    events: z
      .array(
        z.object({
          event_type: z.enum([
            'check-in',
            'note',
            'workout',
            'meal',
            'sleep',
            'mood',
          ]),
          data: z.record(z.any()),
          confidence: z.number().min(0).max(1).optional(),
        })
      )
      .optional(),
    contextData: z.array(z.any()).optional(),
    dailySummary: z.string().optional(),
  }),
};

// User preference validation schemas
export const preferenceSchemas = {
  timezone: z.object({
    timezone: z.string().min(1, 'Timezone is required'),
  }),

  metricPreferences: z.object({
    metric_id: commonSchemas.uuid,
    is_visible: z.boolean(),
    display_order: z.number().int().min(0).optional(),
  }),
};

/**
 * Sanitize string input to prevent XSS and injection attacks
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .substring(0, 1000); // Limit length
}

/**
 * Sanitize object input recursively
 */
export function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize keys as well
      const sanitizedKey = sanitizeString(key);
      sanitized[sanitizedKey] = sanitizeObject(value);
    }
    return sanitized;
  }

  return obj;
}

/**
 * Validate and sanitize request body
 */
export function validateRequestBody<T>(
  body: any,
  schema: z.ZodSchema<T>
):
  | { success: true; data: T }
  | { success: false; error: string; details?: any } {
  try {
    // First sanitize the input
    const sanitizedBody = sanitizeObject(body);

    // Then validate with schema
    const result = schema.safeParse(sanitizedBody);

    if (result.success) {
      return { success: true, data: result.data };
    } else {
      return {
        success: false,
        error: 'Validation failed',
        details: result.error.errors,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: 'Invalid request body',
      details: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Validate file upload
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size (10MB limit)
  if (file.size > 10 * 1024 * 1024) {
    return {
      valid: false,
      error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum size is 10MB.`,
    };
  }

  // Check file name
  if (!file.name || file.name.trim().length === 0) {
    return {
      valid: false,
      error: 'File name is required',
    };
  }

  // Check for potentially dangerous file names
  const dangerousPatterns = [
    /\.\./, // Path traversal
    /[<>:"|?*]/, // Invalid characters
    /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i, // Windows reserved names
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(file.name)) {
      return {
        valid: false,
        error: 'Invalid file name',
      };
    }
  }

  // Check MIME type
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.oasis.opendocument.spreadsheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ];

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported file type: ${file.type}. Please upload images, PDFs, Word docs, spreadsheets, or text files.`,
    };
  }

  return { valid: true };
}

/**
 * Validate multiple files
 */
export function validateFiles(files: File[]): {
  valid: boolean;
  error?: string;
} {
  // Check total count
  if (files.length === 0) {
    return {
      valid: false,
      error: 'At least one file is required',
    };
  }

  if (files.length > 10) {
    return {
      valid: false,
      error: `Too many files: ${files.length}. Maximum is 10 files.`,
    };
  }

  // Check each file
  for (const file of files) {
    const validation = validateFile(file);
    if (!validation.valid) {
      return validation;
    }
  }

  return { valid: true };
}

/**
 * Validate URL parameters
 */
export function validateUrlParams(
  params: Record<string, string | string[] | undefined>,
  schema: z.ZodSchema<any>
): { success: true; data: any } | { success: false; error: string } {
  try {
    const result = schema.safeParse(params);

    if (result.success) {
      return { success: true, data: result.data };
    } else {
      return {
        success: false,
        error: 'Invalid URL parameters',
      };
    }
  } catch (error) {
    return {
      success: false,
      error: 'Invalid URL parameters',
    };
  }
}

/**
 * Validate query parameters
 */
export function validateQueryParams(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<any>
): { success: true; data: any } | { success: false; error: string } {
  try {
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });

    const result = schema.safeParse(params);

    if (result.success) {
      return { success: true, data: result.data };
    } else {
      return {
        success: false,
        error: 'Invalid query parameters',
      };
    }
  } catch (error) {
    return {
      success: false,
      error: 'Invalid query parameters',
    };
  }
}

/**
 * Create a validation middleware for API routes
 */
export function createValidationMiddleware<T>(
  schema: z.ZodSchema<T>,
  source: 'body' | 'params' | 'query' = 'body'
) {
  return function (
    request: Request
  ):
    | { success: true; data: T }
    | { success: false; error: string; status: number } {
    try {
      let data: any;

      if (source === 'body') {
        // This would need to be handled in the route handler
        // since we can't await request.json() here
        return {
          success: false,
          error: 'Body validation must be done in route handler',
          status: 500,
        };
      } else if (source === 'params') {
        const url = new URL(request.url);
        const pathSegments = url.pathname.split('/').filter(Boolean);
        data = { pathSegments };
      } else if (source === 'query') {
        const url = new URL(request.url);
        const params: Record<string, string> = {};
        url.searchParams.forEach((value, key) => {
          params[key] = value;
        });
        data = params;
      }

      const result = schema.safeParse(data);

      if (result.success) {
        return { success: true, data: result.data };
      } else {
        return {
          success: false,
          error: 'Validation failed',
          status: 400,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: 'Validation error',
        status: 400,
      };
    }
  };
}

export default {
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
  createValidationMiddleware,
};
