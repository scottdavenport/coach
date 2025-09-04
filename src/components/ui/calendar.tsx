'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { 
  getCalendarGridInTimezone, 
  getTodayInTimezone, 
  getUserPreferredTimezone,
  formatDateInTimezone,
  isTodayInTimezone,
  isFutureDateInTimezone
} from '@/lib/timezone-utils'
import { useUserTimezone } from '@/hooks/use-user-timezone'

interface CalendarProps {
  selectedDate: string
  onDateSelect: (date: string) => void
  journalEntryDates?: string[]
  previousDayDate?: string
  className?: string
}

export function Calendar({ 
  selectedDate, 
  onDateSelect, 
  journalEntryDates = [], 
  previousDayDate,
  className = '' 
}: CalendarProps) {
  const { userTimezone } = useUserTimezone()
  const [currentYear, setCurrentYear] = useState(() => {
    return parseInt(selectedDate.split('-')[0])
  })
  const [currentMonth, setCurrentMonth] = useState(() => {
    return parseInt(selectedDate.split('-')[1])
  })
  const [isOpen, setIsOpen] = useState(false)

  const preferredTimezone = getUserPreferredTimezone(userTimezone)

  // Update calendar month/year when selected date changes
  useEffect(() => {
    const [year, month] = selectedDate.split('-').map(Number)
    setCurrentYear(year)
    setCurrentMonth(month)
  }, [selectedDate])

  // Get calendar grid for current month
  const calendarGrid = getCalendarGridInTimezone(currentYear, currentMonth, preferredTimezone)

  // Navigate to previous month
  const goToPreviousMonth = useCallback(() => {
    if (currentMonth === 1) {
      setCurrentYear(currentYear - 1)
      setCurrentMonth(12)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }, [currentYear, currentMonth])

  // Navigate to next month
  const goToNextMonth = useCallback(() => {
    if (currentMonth === 12) {
      setCurrentYear(currentYear + 1)
      setCurrentMonth(1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }, [currentYear, currentMonth])

  // Go to today
  const goToToday = useCallback(() => {
    const today = getTodayInTimezone(preferredTimezone)
    const [year, month] = today.split('-').map(Number)
    setCurrentYear(year)
    setCurrentMonth(month)
  }, [preferredTimezone])

  // Handle date selection
  const handleDateClick = useCallback((date: string) => {
    onDateSelect(date)
    setIsOpen(false)
  }, [onDateSelect])

  // Check if a date has journal entries
  const hasJournalEntry = useCallback((date: string) => {
    return journalEntryDates.includes(date)
  }, [journalEntryDates])

  // Check if a date is selectable (not in the future)
  const isDateSelectable = useCallback((date: string) => {
    return !isFutureDateInTimezone(date, preferredTimezone)
  }, [preferredTimezone])

  // Format month/year for display
  const monthYearDisplay = formatDateInTimezone(
    new Date(currentYear, currentMonth - 1, 1), 
    'long', 
    preferredTimezone
  ).replace(/\d+/, '').trim()

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Calendar Toggle Button - shows previous day */}
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2"
      >
        <CalendarIcon className="h-4 w-4" />
        {previousDayDate ? formatDateInTimezone(previousDayDate, 'short', preferredTimezone) : formatDateInTimezone(selectedDate, 'short', preferredTimezone)}
      </Button>

      {/* Calendar Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-[100] p-4 min-w-[320px] max-w-[320px]">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToPreviousMonth}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm">
                {monthYearDisplay}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={goToToday}
                className="text-xs h-6 px-2"
              >
                Today
              </Button>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={goToNextMonth}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarGrid.map(({ date, isCurrentMonth, isToday, dayOfWeek }) => {
              const hasEntry = hasJournalEntry(date)
              const isSelectable = isDateSelectable(date)
              const isSelected = date === selectedDate
              
              return (
                <button
                  key={date}
                  onClick={() => isSelectable && handleDateClick(date)}
                  disabled={!isSelectable}
                  className={`
                    relative h-8 w-8 text-xs rounded-md transition-colors
                    ${isCurrentMonth ? 'text-foreground' : 'text-muted-foreground/50'}
                    ${isToday ? 'bg-primary text-primary-foreground font-semibold' : ''}
                    ${isSelected ? 'bg-primary/20 border border-primary' : ''}
                    ${isSelectable ? 'hover:bg-accent hover:text-accent-foreground' : 'cursor-not-allowed opacity-50'}
                    ${!isCurrentMonth ? 'opacity-50' : ''}
                  `}
                >
                  {date.split('-')[2]}
                  {hasEntry && (
                    <div className="absolute bottom-0.5 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[90]" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}
