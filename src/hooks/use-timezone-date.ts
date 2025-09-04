/**
 * Custom hook for timezone-aware date handling
 * Provides consistent date operations across the application
 */

import { useState, useEffect, useCallback } from 'react'
import { 
  getTodayInTimezone, 
  formatDateLong, 
  formatDateInTimezone,
  navigateDateInTimezone,
  isTodayInTimezone,
  isFutureDateInTimezone,
  getUserTimezone
} from '@/lib/timezone-utils'

interface UseTimezoneDateProps {
  initialDate?: string
  onDateChange?: (date: string) => void
}

export function useTimezoneDate({ initialDate, onDateChange }: UseTimezoneDateProps = {}) {
  const [currentDate, setCurrentDate] = useState<string>(() => {
    return initialDate || getTodayInTimezone()
  })
  const [userTimezone, setUserTimezone] = useState<string>(() => {
    return getUserTimezone()
  })

  // Update timezone on mount (in case it changes)
  useEffect(() => {
    setUserTimezone(getUserTimezone())
  }, [])

  // Navigate to previous day
  const goToPreviousDay = useCallback(() => {
    const newDate = navigateDateInTimezone(currentDate, 'prev', userTimezone)
    setCurrentDate(newDate)
    onDateChange?.(newDate)
  }, [currentDate, userTimezone, onDateChange])

  // Navigate to next day
  const goToNextDay = useCallback(() => {
    const newDate = navigateDateInTimezone(currentDate, 'next', userTimezone)
    setCurrentDate(newDate)
    onDateChange?.(newDate)
  }, [currentDate, userTimezone, onDateChange])

  // Go to today
  const goToToday = useCallback(() => {
    const today = getTodayInTimezone(userTimezone)
    setCurrentDate(today)
    onDateChange?.(today)
  }, [userTimezone, onDateChange])

  // Set specific date
  const setDate = useCallback((date: string) => {
    setCurrentDate(date)
    onDateChange?.(date)
  }, [onDateChange])

  // Check if current date is today
  const isToday = useCallback(() => {
    return isTodayInTimezone(currentDate, userTimezone)
  }, [currentDate, userTimezone])

  // Check if current date is in the future
  const isFuture = useCallback(() => {
    return isFutureDateInTimezone(currentDate, userTimezone)
  }, [currentDate, userTimezone])

  // Check if we can navigate to next day (not future)
  const canGoToNextDay = useCallback(() => {
    return !isToday() && !isFuture()
  }, [isToday, isFuture])

  // Format current date for display
  const formatCurrentDate = useCallback((format: 'long' | 'short' | 'month-day' | 'weekday' = 'long') => {
    return formatDateInTimezone(currentDate, format, userTimezone)
  }, [currentDate, userTimezone])

  // Format current date as "September 3, 2025" style
  const formatCurrentDateLong = useCallback(() => {
    return formatDateLong(currentDate, userTimezone)
  }, [currentDate, userTimezone])

  return {
    currentDate,
    userTimezone,
    goToPreviousDay,
    goToNextDay,
    goToToday,
    setDate,
    isToday,
    isFuture,
    canGoToNextDay,
    formatCurrentDate,
    formatCurrentDateLong
  }
}
