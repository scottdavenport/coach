'use client';

import React, { useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog';
import { useDate } from '@/components/providers/date-provider';
import { useJournalEntries } from '@/hooks/use-journal-entries';
import { useUserTimezone } from '@/hooks/use-user-timezone';
import {
  getCalendarGridInTimezone,
  getTodayInTimezone,
  getUserPreferredTimezone,
  formatDateInTimezone,
  isTodayInTimezone,
  isFutureDateInTimezone,
} from '@/lib/timezone-utils';

interface DateSelectorProps {
  userId: string;
  className?: string;
}

export function DateSelector({ userId, className = '' }: DateSelectorProps) {
  const { 
    selectedDate, 
    setSelectedDate, 
    formatDateForDisplay, 
    goToPreviousDay,
    goToNextDay,
    goToToday, 
    isToday 
  } = useDate();
  
  const [isOpen, setIsOpen] = useState(false);
  const { journalEntryDates } = useJournalEntries({ userId });
  const { userTimezone } = useUserTimezone();

  // Calendar state
  const [currentYear, setCurrentYear] = useState(() => {
    if (!selectedDate) return new Date().getFullYear();
    return parseInt(selectedDate.split('-')[0]);
  });
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (!selectedDate) return new Date().getMonth() + 1;
    return parseInt(selectedDate.split('-')[1]);
  });

  const preferredTimezone = getUserPreferredTimezone(userTimezone);

  // Update calendar month/year when selected date changes
  React.useEffect(() => {
    if (selectedDate) {
      const [year, month] = selectedDate.split('-').map(Number);
      setCurrentYear(year);
      setCurrentMonth(month);
    }
  }, [selectedDate]);

  // Get calendar grid for current month
  const calendarGrid = getCalendarGridInTimezone(
    currentYear,
    currentMonth,
    preferredTimezone
  );

  // Navigate to previous month
  const goToPreviousMonth = useCallback(() => {
    if (currentMonth === 1) {
      setCurrentYear(currentYear - 1);
      setCurrentMonth(12);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  }, [currentYear, currentMonth]);

  // Navigate to next month
  const goToNextMonth = useCallback(() => {
    if (currentMonth === 12) {
      setCurrentYear(currentYear + 1);
      setCurrentMonth(1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  }, [currentYear, currentMonth]);

  // Go to today
  const goToTodayInCalendar = useCallback(() => {
    const today = getTodayInTimezone(preferredTimezone);
    const [year, month] = today.split('-').map(Number);
    setCurrentYear(year);
    setCurrentMonth(month);
  }, [preferredTimezone]);

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setIsOpen(false);
  };

  const handleToday = () => {
    goToToday();
    setIsOpen(false);
  };

  // Check if a date has journal entries
  const hasJournalEntry = useCallback(
    (date: string) => {
      return journalEntryDates.includes(date);
    },
    [journalEntryDates]
  );

  // Check if a date is selectable (not in the future)
  const isDateSelectable = useCallback(
    (date: string) => {
      return !isFutureDateInTimezone(date, preferredTimezone);
    },
    [preferredTimezone]
  );

  // Format month/year for display
  const monthYearDisplay = formatDateInTimezone(
    new Date(currentYear, currentMonth - 1, 1),
    'month-day',
    preferredTimezone
  )
    .replace(/\d+/, '')
    .trim();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Date Navigation */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={goToPreviousDay}
          className="h-8 w-8"
          title="Previous day"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={goToNextDay}
          className="h-8 w-8"
          title="Next day"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Date Display & Calendar */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="h-8 px-3 text-sm font-medium"
            title="Select date"
          >
            <CalendarIcon className="h-4 w-4 mr-2" />
            {selectedDate ? formatDateForDisplay(selectedDate) : 'Select Date'}
            {isToday && (
              <span className="ml-2 text-xs text-primary">Today</span>
            )}
          </Button>
        </DialogTrigger>
        <DialogContent className="w-auto p-0 max-w-sm">
          <DialogTitle className="sr-only">Select Date</DialogTitle>
          <div className="p-4">
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

              <h3 className="font-semibold text-sm">{monthYearDisplay}</h3>

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
                <div
                  key={day}
                  className="text-center text-xs font-medium text-muted-foreground py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 mb-4">
              {calendarGrid.map(
                ({ date, isCurrentMonth, isToday, dayOfWeek }) => {
                  const hasEntry = hasJournalEntry(date);
                  const isSelectable = isDateSelectable(date);
                  const isSelected = date === selectedDate;

                  return (
                    <button
                      key={date}
                      onClick={() => isSelectable && handleDateSelect(date)}
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
                  );
                }
              )}
            </div>

            {/* Go to Today Button */}
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleToday}
                className="text-xs"
              >
                Go to Today
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
