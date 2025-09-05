'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { useUserTimezone } from '@/hooks/use-user-timezone';
import { 
  getUserPreferredTimezone, 
  getTodayInTimezone, 
  formatDateLong 
} from '@/lib/timezone-utils';

interface DateContextType {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  formatDateForDisplay: (dateString: string) => string;
  navigateDate: (direction: 'prev' | 'next') => void;
  goToToday: () => void;
  isToday: boolean;
}

const DateContext = createContext<DateContextType | undefined>(undefined);

export function DateProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userTimezone } = useUserTimezone();
  const [selectedDate, setSelectedDate] = useState('');

  // Initialize selectedDate with today's date in user's timezone
  useEffect(() => {
    if (!selectedDate && userTimezone) {
      const preferredTimezone = getUserPreferredTimezone(userTimezone);
      const todayString = getTodayInTimezone(preferredTimezone);
      setSelectedDate(todayString);
    }
  }, [selectedDate, userTimezone]);

  // Format date for display using established timezone utilities
  const formatDateForDisplay = useCallback((dateString: string) => {
    if (!dateString) return '';
    const preferredTimezone = getUserPreferredTimezone(userTimezone);
    return formatDateLong(
      new Date(dateString + 'T00:00:00'),
      preferredTimezone
    );
  }, [userTimezone]);

  // Navigate to previous/next day
  const navigateDate = useCallback((direction: 'prev' | 'next') => {
    if (!selectedDate) return;
    
    const currentDate = new Date(selectedDate + 'T00:00:00');
    const newDate = new Date(currentDate);
    
    if (direction === 'prev') {
      newDate.setDate(currentDate.getDate() - 1);
    } else {
      newDate.setDate(currentDate.getDate() + 1);
    }
    
    const newDateString = newDate.toISOString().split('T')[0];
    setSelectedDate(newDateString);
  }, [selectedDate]);

  // Go to today's date
  const goToToday = useCallback(() => {
    if (userTimezone) {
      const preferredTimezone = getUserPreferredTimezone(userTimezone);
      const todayString = getTodayInTimezone(preferredTimezone);
      setSelectedDate(todayString);
    }
  }, [userTimezone]);

  // Check if selected date is today
  const isToday = useCallback(() => {
    if (!selectedDate || !userTimezone) return false;
    const preferredTimezone = getUserPreferredTimezone(userTimezone);
    const todayString = getTodayInTimezone(preferredTimezone);
    return selectedDate === todayString;
  }, [selectedDate, userTimezone]);

  return (
    <DateContext.Provider
      value={{
        selectedDate,
        setSelectedDate,
        formatDateForDisplay,
        navigateDate,
        goToToday,
        isToday: isToday(),
      }}
    >
      {children}
    </DateContext.Provider>
  );
}

export function useDate() {
  const context = useContext(DateContext);
  if (context === undefined) {
    throw new Error('useDate must be used within a DateProvider');
  }
  return context;
}
