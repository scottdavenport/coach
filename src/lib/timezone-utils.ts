/**
 * Timezone utilities for the Coach application
 * Handles timezone detection, date formatting, and timezone-aware date operations
 */

// Cache timezone detection for performance
let cachedTimezone: string | null = null

/**
 * Get the user's timezone from the browser
 * @returns The user's timezone (e.g., 'America/New_York', 'Europe/London')
 */
export function getUserTimezone(): string {
  if (typeof window === 'undefined') {
    // Server-side fallback - default to East Coast US
    return 'America/New_York'
  }
  
  // Return cached timezone if available
  if (cachedTimezone) {
    return cachedTimezone
  }
  
  try {
    cachedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    return cachedTimezone
  } catch (error) {
    console.warn('Failed to detect timezone, falling back to East Coast US:', error)
    cachedTimezone = 'America/New_York'
    return cachedTimezone
  }
}

/**
 * Get user's preferred timezone from stored preference or browser detection
 * This should be used in components that have access to user context
 * @param userTimezone - User's stored timezone preference (optional)
 * @returns The user's preferred timezone
 */
export function getUserPreferredTimezone(userTimezone?: string): string {
  // Use stored preference if available and not the default UTC
  if (userTimezone && userTimezone !== 'UTC') {
    return userTimezone
  }
  
  // Fall back to browser detection (which now defaults to East Coast US)
  return getUserTimezone()
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
  // Validate date string format
  if (!dateString || !dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    throw new Error(`Invalid date string format: ${dateString}. Expected YYYY-MM-DD format.`)
  }
  
  // Parse the date string and create a date in the user's timezone
  const [year, month, day] = dateString.split('-').map(Number)
  
  // Validate parsed values
  if (isNaN(year) || isNaN(month) || isNaN(day) || 
      month < 1 || month > 12 || 
      day < 1 || day > 31 ||
      year < 1900 || year > 2100) {
    throw new Error(`Invalid date values: year=${year}, month=${month}, day=${day}`)
  }
  
  // Create date in user's timezone by using a date string that includes timezone info
  const dateInTz = new Date(`${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T00:00:00`)
  
  // Validate the created date
  if (isNaN(dateInTz.getTime())) {
    throw new Error(`Failed to create valid date from: ${dateString}`)
  }
  
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
  // Parse the date string directly without timezone conversion
  const [year, month, day] = currentDate.split('-').map(Number)
  
  // Create a date object in the user's timezone
  const date = new Date(year, month - 1, day) // month is 0-indexed
  
  if (direction === 'prev') {
    date.setDate(date.getDate() - 1)
  } else {
    date.setDate(date.getDate() + 1)
  }
  
  // Format back to YYYY-MM-DD using the same timezone
  const tz = timezone || getUserTimezone()
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
  const tz = timezone || getUserTimezone()
  const date = parseDateInTimezone(weekStart, tz)
  
  // Add 6 days to get to Sunday (end of week)
  date.setDate(date.getDate() + 6)
  
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
  const weekEnd = getWeekEndInTimezone(weekStart, tz)
  const end = parseDateInTimezone(weekEnd, tz)
  
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

/**
 * Get the first day of a month in the user's timezone
 * @param year - Year (e.g., 2025)
 * @param month - Month (1-12)
 * @param timezone - Optional timezone override
 * @returns Date string in YYYY-MM-DD format
 */
export function getMonthStartInTimezone(year: number, month: number, timezone?: string): string {
  const tz = timezone || getUserTimezone()
  const date = new Date(year, month - 1, 1) // month is 0-indexed
  
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  
  return formatter.format(date)
}

/**
 * Get the last day of a month in the user's timezone
 * @param year - Year (e.g., 2025)
 * @param month - Month (1-12)
 * @param timezone - Optional timezone override
 * @returns Date string in YYYY-MM-DD format
 */
export function getMonthEndInTimezone(year: number, month: number, timezone?: string): string {
  const tz = timezone || getUserTimezone()
  const date = new Date(year, month, 0) // month is 0-indexed, so month gives us last day of previous month
  
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  
  return formatter.format(date)
}

/**
 * Get all dates in a month in the user's timezone
 * @param year - Year (e.g., 2025)
 * @param month - Month (1-12)
 * @param timezone - Optional timezone override
 * @returns Array of date strings for the month
 */
export function getMonthDatesInTimezone(year: number, month: number, timezone?: string): string[] {
  const dates: string[] = []
  const startDate = getMonthStartInTimezone(year, month, timezone)
  const endDate = getMonthEndInTimezone(year, month, timezone)
  
  let currentDate = startDate
  while (currentDate <= endDate) {
    dates.push(currentDate)
    currentDate = navigateDateInTimezone(currentDate, 'next', timezone)
  }
  
  return dates
}

/**
 * Get the calendar grid for a month (including days from previous/next month to fill the grid)
 * @param year - Year (e.g., 2025)
 * @param month - Month (1-12)
 * @param timezone - Optional timezone override
 * @returns Array of date objects with date string and metadata
 */
export function getCalendarGridInTimezone(year: number, month: number, timezone?: string): Array<{
  date: string
  isCurrentMonth: boolean
  isToday: boolean
  dayOfWeek: number
}> {
  const tz = timezone || getUserTimezone()
  const monthStart = getMonthStartInTimezone(year, month, tz)
  const monthEnd = getMonthEndInTimezone(year, month, tz)
  
  // Parse month start to get the first day of the month
  const [startYear, startMonth, startDay] = monthStart.split('-').map(Number)
  const firstDayOfMonth = new Date(startYear, startMonth - 1, startDay)
  const firstDayOfWeek = firstDayOfMonth.getDay() // 0 = Sunday, 1 = Monday, etc.
  
  // Parse month end to get the last day of the month
  const [endYear, endMonth, endDay] = monthEnd.split('-').map(Number)
  const lastDayOfMonth = new Date(endYear, endMonth - 1, endDay)
  const lastDayOfWeek = lastDayOfMonth.getDay()
  
  const grid: Array<{
    date: string
    isCurrentMonth: boolean
    isToday: boolean
    dayOfWeek: number
  }> = []
  
  // Add days from previous month to fill the first week
  if (firstDayOfWeek > 0) {
    const prevMonth = month === 1 ? 12 : month - 1
    const prevYear = month === 1 ? year - 1 : year
    const prevMonthEnd = getMonthEndInTimezone(prevYear, prevMonth, tz)
    
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = navigateDateInTimezone(prevMonthEnd, 'prev', tz)
      const dayOfWeek = i
      const isToday = isTodayInTimezone(date, tz)
      
      grid.push({
        date,
        isCurrentMonth: false,
        isToday,
        dayOfWeek
      })
    }
  }
  
  // Add all days of the current month
  const monthDates = getMonthDatesInTimezone(year, month, tz)
  monthDates.forEach(date => {
    const [dateYear, dateMonth, dateDay] = date.split('-').map(Number)
    const dateObj = new Date(dateYear, dateMonth - 1, dateDay)
    const dayOfWeek = dateObj.getDay()
    const isToday = isTodayInTimezone(date, tz)
    
    grid.push({
      date,
      isCurrentMonth: true,
      isToday,
      dayOfWeek
    })
  })
  
  // Add days from next month to fill the last week
  const remainingDays = 42 - grid.length // 6 weeks * 7 days = 42
  let nextDate = navigateDateInTimezone(monthEnd, 'next', tz)
  
  for (let i = 0; i < remainingDays; i++) {
    const dayOfWeek = (grid.length + i) % 7
    const isToday = isTodayInTimezone(nextDate, tz)
    
    grid.push({
      date: nextDate,
      isCurrentMonth: false,
      isToday,
      dayOfWeek
    })
    
    nextDate = navigateDateInTimezone(nextDate, 'next', tz)
  }
  
  return grid
}
