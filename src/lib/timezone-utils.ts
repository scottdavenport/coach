/**
 * Timezone utilities for the Coach application
 * Handles timezone detection, date formatting, and timezone-aware date operations
 */

/**
 * Get the user's timezone from the browser
 * @returns The user's timezone (e.g., 'America/New_York', 'Europe/London')
 */
export function getUserTimezone(): string {
  if (typeof window === 'undefined') {
    // Server-side fallback
    return 'UTC'
  }
  
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch (error) {
    console.warn('Failed to detect timezone, falling back to UTC:', error)
    return 'UTC'
  }
}

/**
 * Get today's date in the user's timezone as a YYYY-MM-DD string
 * @param timezone - Optional timezone override
 * @returns Date string in YYYY-MM-DD format
 */
export function getTodayInTimezone(timezone?: string): string {
  const tz = timezone || getUserTimezone()
  const now = new Date()
  
  // Use Intl.DateTimeFormat to get the date in the user's timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  
  return formatter.format(now)
}

/**
 * Convert a date string to a Date object in the user's timezone
 * @param dateString - Date string in YYYY-MM-DD format
 * @param timezone - Optional timezone override
 * @returns Date object representing the start of the day in the user's timezone
 */
export function parseDateInTimezone(dateString: string, timezone?: string): Date {
  // Parse the date string and create a date in the user's timezone
  const [year, month, day] = dateString.split('-').map(Number)
  
  // Create date in user's timezone by using a date string that includes timezone info
  const dateInTz = new Date(`${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T00:00:00`)
  
  // Adjust for timezone offset
  const utcDate = new Date(dateInTz.getTime() - (dateInTz.getTimezoneOffset() * 60000))
  
  return utcDate
}

/**
 * Format a date for display in the user's timezone
 * @param date - Date object or date string
 * @param format - Format type ('long', 'short', 'month-day', 'weekday')
 * @param timezone - Optional timezone override
 * @returns Formatted date string
 */
export function formatDateInTimezone(
  date: Date | string, 
  format: 'long' | 'short' | 'month-day' | 'weekday' = 'long',
  timezone?: string
): string {
  const tz = timezone || getUserTimezone()
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  const formatOptions: Intl.DateTimeFormatOptions = {
    timeZone: tz
  }
  
  switch (format) {
    case 'long':
      formatOptions.weekday = 'long'
      formatOptions.month = 'long'
      formatOptions.day = 'numeric'
      formatOptions.year = 'numeric'
      break
    case 'short':
      formatOptions.weekday = 'short'
      formatOptions.month = 'short'
      formatOptions.day = 'numeric'
      break
    case 'month-day':
      formatOptions.month = 'long'
      formatOptions.day = 'numeric'
      break
    case 'weekday':
      formatOptions.weekday = 'long'
      break
  }
  
  return new Intl.DateTimeFormat('en-US', formatOptions).format(dateObj)
}

/**
 * Format a date as "September 3, 2025" style
 * @param date - Date object or date string
 * @param timezone - Optional timezone override
 * @returns Formatted date string
 */
export function formatDateLong(date: Date | string, timezone?: string): string {
  return formatDateInTimezone(date, 'long', timezone)
}

/**
 * Get the start and end of a day in the user's timezone
 * @param dateString - Date string in YYYY-MM-DD format
 * @param timezone - Optional timezone override
 * @returns Object with start and end timestamps
 */
export function getDayBoundsInTimezone(dateString: string, timezone?: string) {
  const [year, month, day] = dateString.split('-').map(Number)
  
  // Start of day in user's timezone
  const startOfDay = new Date(`${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T00:00:00`)
  
  // End of day in user's timezone
  const endOfDay = new Date(`${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T23:59:59.999`)
  
  return {
    start: startOfDay,
    end: endOfDay
  }
}

/**
 * Navigate to a different date in the user's timezone
 * @param currentDate - Current date string in YYYY-MM-DD format
 * @param direction - Direction to navigate ('prev' | 'next')
 * @param timezone - Optional timezone override
 * @returns New date string in YYYY-MM-DD format
 */
export function navigateDateInTimezone(
  currentDate: string, 
  direction: 'prev' | 'next',
  timezone?: string
): string {
  const tz = timezone || getUserTimezone()
  const date = parseDateInTimezone(currentDate, tz)
  
  if (direction === 'prev') {
    date.setDate(date.getDate() - 1)
  } else {
    date.setDate(date.getDate() + 1)
  }
  
  // Format back to YYYY-MM-DD
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  
  return formatter.format(date)
}

/**
 * Check if a date is today in the user's timezone
 * @param dateString - Date string in YYYY-MM-DD format
 * @param timezone - Optional timezone override
 * @returns True if the date is today
 */
export function isTodayInTimezone(dateString: string, timezone?: string): boolean {
  const today = getTodayInTimezone(timezone)
  return dateString === today
}

/**
 * Check if a date is in the future in the user's timezone
 * @param dateString - Date string in YYYY-MM-DD format
 * @param timezone - Optional timezone override
 * @returns True if the date is in the future
 */
export function isFutureDateInTimezone(dateString: string, timezone?: string): boolean {
  const today = getTodayInTimezone(timezone)
  return dateString > today
}

/**
 * Get the week start date (Monday) for a given date in the user's timezone
 * @param dateString - Date string in YYYY-MM-DD format
 * @param timezone - Optional timezone override
 * @returns Week start date string in YYYY-MM-DD format
 */
export function getWeekStartInTimezone(dateString: string, timezone?: string): string {
  const tz = timezone || getUserTimezone()
  const date = parseDateInTimezone(dateString, tz)
  
  // Get the day of the week (0 = Sunday, 1 = Monday, etc.)
  const dayOfWeek = date.getDay()
  
  // Calculate days to subtract to get to Monday (start of week)
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  
  date.setDate(date.getDate() - daysToSubtract)
  
  // Format back to YYYY-MM-DD
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  
  return formatter.format(date)
}

/**
 * Get the week end date (Sunday) for a given date in the user's timezone
 * @param dateString - Date string in YYYY-MM-DD format
 * @param timezone - Optional timezone override
 * @returns Week end date string in YYYY-MM-DD format
 */
export function getWeekEndInTimezone(dateString: string, timezone?: string): string {
  const weekStart = getWeekStartInTimezone(dateString, timezone)
  return navigateDateInTimezone(weekStart, 'next', timezone)
}

/**
 * Convert a UTC timestamp to a date string in the user's timezone
 * @param utcTimestamp - UTC timestamp
 * @param timezone - Optional timezone override
 * @returns Date string in YYYY-MM-DD format
 */
export function utcTimestampToDateString(utcTimestamp: string | Date, timezone?: string): string {
  const tz = timezone || getUserTimezone()
  const date = typeof utcTimestamp === 'string' ? new Date(utcTimestamp) : utcTimestamp
  
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  
  return formatter.format(date)
}

/**
 * Convert a date string to UTC timestamp for database storage
 * @param dateString - Date string in YYYY-MM-DD format
 * @param timezone - Optional timezone override
 * @returns UTC timestamp string
 */
export function dateStringToUtcTimestamp(dateString: string, timezone?: string): string {
  const [year, month, day] = dateString.split('-').map(Number)
  
  // Create date in user's timezone
  const dateInTz = new Date(`${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T00:00:00`)
  
  return dateInTz.toISOString()
}

/**
 * Get all dates in a week range in the user's timezone
 * @param weekStart - Week start date string in YYYY-MM-DD format
 * @param timezone - Optional timezone override
 * @returns Array of date strings for the week
 */
export function getWeekDatesInTimezone(weekStart: string, timezone?: string): string[] {
  const dates: string[] = []
  let currentDate = weekStart
  
  for (let i = 0; i < 7; i++) {
    dates.push(currentDate)
    currentDate = navigateDateInTimezone(currentDate, 'next', timezone)
  }
  
  return dates
}

/**
 * Format a week range for display
 * @param weekStart - Week start date string in YYYY-MM-DD format
 * @param timezone - Optional timezone override
 * @returns Formatted week range string
 */
export function formatWeekRange(weekStart: string, timezone?: string): string {
  const tz = timezone || getUserTimezone()
  const start = parseDateInTimezone(weekStart, tz)
  const end = parseDateInTimezone(navigateDateInTimezone(weekStart, 'next', tz), tz)
  
  const startFormatted = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    month: 'long',
    day: 'numeric'
  }).format(start)
  
  const endFormatted = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(end)
  
  return `${startFormatted} - ${endFormatted}`
}
