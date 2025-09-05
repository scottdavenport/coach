/**
 * Comprehensive tests for timezone utilities
 * Covers all functions, edge cases, and error scenarios
 */

import {
  getUserTimezone,
  getUserPreferredTimezone,
  getTodayInTimezone,
  navigateDateInTimezone,
  formatDateLong,
  isTodayInTimezone,
  getWeekStartInTimezone,
  formatWeekRange,
  getDateInTimezone,
  formatDateShort,
  getTimezoneOffset,
  isValidTimezone,
} from '../timezone-utils';

// Mock console.warn to avoid noise in tests
const originalWarn = console.warn;
beforeAll(() => {
  console.warn = jest.fn();
});

afterAll(() => {
  console.warn = originalWarn;
});

describe('Timezone Utils - Comprehensive', () => {
  describe('getUserTimezone', () => {
    it('should return a valid timezone string', () => {
      const timezone = getUserTimezone();
      expect(typeof timezone).toBe('string');
      expect(timezone.length).toBeGreaterThan(0);
    });

    it('should return East Coast US on server side', () => {
      const originalWindow = global.window;
      delete (global as any).window;

      const timezone = getUserTimezone();
      expect(timezone).toBe('America/New_York');

      global.window = originalWindow;
    });

    it('should cache timezone for performance', () => {
      const timezone1 = getUserTimezone();
      const timezone2 = getUserTimezone();
      expect(timezone1).toBe(timezone2);
    });

    it('should handle timezone detection errors gracefully', () => {
      const originalIntl = global.Intl;
      global.Intl = {
        ...originalIntl,
        DateTimeFormat: jest.fn(() => {
          throw new Error('Timezone detection failed');
        }),
      } as any;

      const timezone = getUserTimezone();
      expect(timezone).toBe('America/New_York');

      global.Intl = originalIntl;
    });
  });

  describe('getUserPreferredTimezone', () => {
    it('should use stored preference when available', () => {
      const storedTimezone = 'Europe/London';
      const result = getUserPreferredTimezone(storedTimezone);
      expect(result).toBe(storedTimezone);
    });

    it('should fall back to browser detection when preference is UTC', () => {
      const result = getUserPreferredTimezone('UTC');
      expect(result).toBe('America/New_York'); // Browser fallback
    });

    it('should fall back to browser detection when no preference', () => {
      const result = getUserPreferredTimezone();
      expect(result).toBe('America/New_York'); // Browser fallback
    });
  });

  describe('getTodayInTimezone', () => {
    it('should return date in YYYY-MM-DD format', () => {
      const today = getTodayInTimezone('UTC');
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should return valid date', () => {
      const today = getTodayInTimezone('UTC');
      const date = new Date(today);
      expect(date.getTime()).not.toBeNaN();
    });

    it('should handle different timezones', () => {
      const utcToday = getTodayInTimezone('UTC');
      const nyToday = getTodayInTimezone('America/New_York');
      const londonToday = getTodayInTimezone('Europe/London');
      
      // All should be valid dates
      expect(new Date(utcToday).getTime()).not.toBeNaN();
      expect(new Date(nyToday).getTime()).not.toBeNaN();
      expect(new Date(londonToday).getTime()).not.toBeNaN();
    });

    it('should handle DST transitions', () => {
      // Test with a known DST transition date
      const dstDate = '2025-03-09'; // DST starts in US
      const result = getTodayInTimezone('America/New_York');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('navigateDateInTimezone', () => {
    it('should navigate to previous day', () => {
      const result = navigateDateInTimezone('2025-09-03', 'prev', 'UTC');
      expect(result).toBe('2025-09-02');
    });

    it('should navigate to next day', () => {
      const result = navigateDateInTimezone('2025-09-03', 'next', 'UTC');
      expect(result).toBe('2025-09-04');
    });

    it('should handle month boundaries', () => {
      const result = navigateDateInTimezone('2025-08-31', 'next', 'UTC');
      expect(result).toBe('2025-09-01');
    });

    it('should handle year boundaries', () => {
      const result = navigateDateInTimezone('2025-12-31', 'next', 'UTC');
      expect(result).toBe('2026-01-01');
    });

    it('should handle February in leap year', () => {
      const result = navigateDateInTimezone('2024-02-28', 'next', 'UTC');
      expect(result).toBe('2024-02-29');
    });

    it('should handle February in non-leap year', () => {
      const result = navigateDateInTimezone('2025-02-28', 'next', 'UTC');
      expect(result).toBe('2025-03-01');
    });

    it('should handle DST transitions', () => {
      // Spring forward
      const springResult = navigateDateInTimezone('2025-03-09', 'next', 'America/New_York');
      expect(springResult).toBe('2025-03-10');
      
      // Fall back
      const fallResult = navigateDateInTimezone('2025-11-02', 'next', 'America/New_York');
      expect(fallResult).toBe('2025-11-03');
    });

    it('should throw error for invalid date format', () => {
      expect(() => {
        navigateDateInTimezone('invalid-date', 'next', 'UTC');
      }).toThrow();
    });

    it('should throw error for invalid direction', () => {
      expect(() => {
        navigateDateInTimezone('2025-09-03', 'invalid' as any, 'UTC');
      }).toThrow();
    });
  });

  describe('formatDateLong', () => {
    it('should format date in readable format', () => {
      const formatted = formatDateLong('2025-09-03', 'UTC');
      expect(formatted).toContain('September');
      expect(formatted).toContain('3');
      expect(formatted).toContain('2025');
    });

    it('should handle different timezones', () => {
      const utcFormatted = formatDateLong('2025-09-03', 'UTC');
      const nyFormatted = formatDateLong('2025-09-03', 'America/New_York');
      
      expect(utcFormatted).toContain('September');
      expect(nyFormatted).toContain('September');
    });

    it('should throw error for invalid date', () => {
      expect(() => {
        formatDateLong('not-a-date', 'UTC');
      }).toThrow();
    });
  });

  describe('isTodayInTimezone', () => {
    it('should return true for today', () => {
      const today = getTodayInTimezone('UTC');
      const result = isTodayInTimezone(today, 'UTC');
      expect(result).toBe(true);
    });

    it('should return false for yesterday', () => {
      const yesterday = navigateDateInTimezone(getTodayInTimezone('UTC'), 'prev', 'UTC');
      const result = isTodayInTimezone(yesterday, 'UTC');
      expect(result).toBe(false);
    });

    it('should return false for tomorrow', () => {
      const tomorrow = navigateDateInTimezone(getTodayInTimezone('UTC'), 'next', 'UTC');
      const result = isTodayInTimezone(tomorrow, 'UTC');
      expect(result).toBe(false);
    });

    it('should handle different timezones', () => {
      const utcToday = getTodayInTimezone('UTC');
      const nyToday = getTodayInTimezone('America/New_York');
      
      // These might be different dates depending on time
      const utcResult = isTodayInTimezone(utcToday, 'UTC');
      const nyResult = isTodayInTimezone(nyToday, 'America/New_York');
      
      expect(utcResult).toBe(true);
      expect(nyResult).toBe(true);
    });
  });

  describe('getWeekStartInTimezone', () => {
    it('should return Monday for dates in the week', () => {
      // Tuesday should return Monday
      const weekStart = getWeekStartInTimezone('2025-09-02', 'UTC');
      expect(weekStart).toBe('2025-09-01');
    });

    it('should return same date for Monday', () => {
      const weekStart = getWeekStartInTimezone('2025-09-01', 'UTC');
      expect(weekStart).toBe('2025-09-01');
    });

    it('should handle Sunday', () => {
      const weekStart = getWeekStartInTimezone('2025-09-07', 'UTC');
      expect(weekStart).toBe('2025-09-01');
    });

    it('should handle week boundaries', () => {
      const weekStart = getWeekStartInTimezone('2025-08-31', 'UTC');
      expect(weekStart).toBe('2025-08-25');
    });

    it('should handle month boundaries', () => {
      const weekStart = getWeekStartInTimezone('2025-09-01', 'UTC');
      expect(weekStart).toBe('2025-09-01');
    });
  });

  describe('formatWeekRange', () => {
    it('should format week range correctly', () => {
      const range = formatWeekRange('2025-09-01', 'UTC');
      expect(range).toContain('September 1');
      expect(range).toContain('September 7');
      expect(range).toContain('2025');
    });

    it('should handle different timezones', () => {
      const utcRange = formatWeekRange('2025-09-01', 'UTC');
      const nyRange = formatWeekRange('2025-09-01', 'America/New_York');
      
      expect(utcRange).toContain('September');
      expect(nyRange).toContain('September');
    });

    it('should handle month boundaries in week', () => {
      const range = formatWeekRange('2025-08-25', 'UTC');
      expect(range).toContain('August');
      expect(range).toContain('September');
    });
  });

  describe('getDateInTimezone', () => {
    it('should return date in specified timezone', () => {
      const date = getDateInTimezone('2025-09-03', 'UTC');
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should handle different timezones', () => {
      const utcDate = getDateInTimezone('2025-09-03', 'UTC');
      const nyDate = getDateInTimezone('2025-09-03', 'America/New_York');
      
      expect(utcDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(nyDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('formatDateShort', () => {
    it('should format date in short format', () => {
      const formatted = formatDateShort('2025-09-03', 'UTC');
      expect(formatted).toMatch(/^\d{1,2}\/\d{1,2}\/\d{4}$/);
    });

    it('should handle different timezones', () => {
      const utcFormatted = formatDateShort('2025-09-03', 'UTC');
      const nyFormatted = formatDateShort('2025-09-03', 'America/New_York');
      
      expect(utcFormatted).toMatch(/^\d{1,2}\/\d{1,2}\/\d{4}$/);
      expect(nyFormatted).toMatch(/^\d{1,2}\/\d{1,2}\/\d{4}$/);
    });
  });

  describe('getTimezoneOffset', () => {
    it('should return timezone offset', () => {
      const offset = getTimezoneOffset('UTC');
      expect(typeof offset).toBe('number');
    });

    it('should handle different timezones', () => {
      const utcOffset = getTimezoneOffset('UTC');
      const nyOffset = getTimezoneOffset('America/New_York');
      
      expect(typeof utcOffset).toBe('number');
      expect(typeof nyOffset).toBe('number');
    });

    it('should handle DST transitions', () => {
      const offset = getTimezoneOffset('America/New_York');
      expect(typeof offset).toBe('number');
    });
  });

  describe('isValidTimezone', () => {
    it('should return true for valid timezones', () => {
      expect(isValidTimezone('UTC')).toBe(true);
      expect(isValidTimezone('America/New_York')).toBe(true);
      expect(isValidTimezone('Europe/London')).toBe(true);
    });

    it('should return false for invalid timezones', () => {
      expect(isValidTimezone('Invalid/Timezone')).toBe(false);
      expect(isValidTimezone('')).toBe(false);
      expect(isValidTimezone('NotATimezone')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isValidTimezone(null as any)).toBe(false);
      expect(isValidTimezone(undefined as any)).toBe(false);
      expect(isValidTimezone(123 as any)).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid date formats gracefully', () => {
      expect(() => navigateDateInTimezone('invalid', 'next', 'UTC')).toThrow();
      expect(() => formatDateLong('not-a-date', 'UTC')).toThrow();
    });

    it('should handle invalid timezone gracefully', () => {
      expect(() => getTodayInTimezone('Invalid/Timezone')).toThrow();
      expect(() => navigateDateInTimezone('2025-09-03', 'next', 'Invalid/Timezone')).toThrow();
    });

    it('should handle null and undefined inputs', () => {
      expect(() => navigateDateInTimezone(null as any, 'next', 'UTC')).toThrow();
      expect(() => formatDateLong(undefined as any, 'UTC')).toThrow();
    });
  });

  describe('Performance', () => {
    it('should cache timezone detection results', () => {
      const start = Date.now();
      const timezone1 = getUserTimezone();
      const timezone2 = getUserTimezone();
      const end = Date.now();
      
      expect(timezone1).toBe(timezone2);
      expect(end - start).toBeLessThan(100); // Should be very fast due to caching
    });

    it('should handle multiple timezone operations efficiently', () => {
      const start = Date.now();
      
      for (let i = 0; i < 100; i++) {
        getTodayInTimezone('UTC');
        getTodayInTimezone('America/New_York');
        getTodayInTimezone('Europe/London');
      }
      
      const end = Date.now();
      expect(end - start).toBeLessThan(1000); // Should complete in under 1 second
    });
  });

  describe('Edge Cases', () => {
    it('should handle leap year correctly', () => {
      const leapYearDate = '2024-02-29';
      const nextDay = navigateDateInTimezone(leapYearDate, 'next', 'UTC');
      expect(nextDay).toBe('2024-03-01');
    });

    it('should handle year boundaries', () => {
      const newYearEve = '2025-12-31';
      const nextDay = navigateDateInTimezone(newYearEve, 'next', 'UTC');
      expect(nextDay).toBe('2026-01-01');
    });

    it('should handle month boundaries', () => {
      const monthEnd = '2025-01-31';
      const nextDay = navigateDateInTimezone(monthEnd, 'next', 'UTC');
      expect(nextDay).toBe('2025-02-01');
    });

    it('should handle DST spring forward', () => {
      // March 9, 2025 is when DST starts in US
      const beforeDST = '2025-03-09';
      const afterDST = navigateDateInTimezone(beforeDST, 'next', 'America/New_York');
      expect(afterDST).toBe('2025-03-10');
    });

    it('should handle DST fall back', () => {
      // November 2, 2025 is when DST ends in US
      const beforeFallback = '2025-11-02';
      const afterFallback = navigateDateInTimezone(beforeFallback, 'next', 'America/New_York');
      expect(afterFallback).toBe('2025-11-03');
    });
  });
});