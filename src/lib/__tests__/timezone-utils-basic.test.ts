/**
 * Basic tests for timezone utilities
 * Focuses on core functionality and error handling
 */

import {
  getUserTimezone,
  getTodayInTimezone,
  navigateDateInTimezone,
  formatDateLong,
  isTodayInTimezone,
  getWeekStartInTimezone,
  formatWeekRange,
} from '../timezone-utils';

// Mock console.warn to avoid noise in tests
const originalWarn = console.warn;
beforeAll(() => {
  console.warn = jest.fn();
});

afterAll(() => {
  console.warn = originalWarn;
});

describe('Timezone Utils - Basic Functionality', () => {
  describe('getUserTimezone', () => {
    it('should return a valid timezone string', () => {
      const timezone = getUserTimezone();
      expect(typeof timezone).toBe('string');
      expect(timezone.length).toBeGreaterThan(0);
    });

    it('should return UTC on server side', () => {
      const originalWindow = global.window;
      delete (global as any).window;

      const timezone = getUserTimezone();
      expect(timezone).toBe('UTC');

      global.window = originalWindow;
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
  });

  describe('formatDateLong', () => {
    it('should format date in readable format', () => {
      const formatted = formatDateLong('2025-09-03', 'UTC');
      expect(formatted).toContain('September');
      expect(formatted).toContain('3');
      expect(formatted).toContain('2025');
    });
  });

  describe('getWeekStartInTimezone', () => {
    it('should return Monday for dates in the week', () => {
      // Tuesday should return Monday
      const weekStart = getWeekStartInTimezone('2025-09-02', 'UTC');
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
  });

  describe('Error Handling', () => {
    it('should handle invalid date formats gracefully', () => {
      expect(() => navigateDateInTimezone('invalid', 'next', 'UTC')).toThrow();
      expect(() => formatDateLong('not-a-date', 'UTC')).toThrow();
    });
  });
});
