'use client';

import React, { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { useDate } from '@/components/providers/date-provider';
import { useJournalEntries } from '@/hooks/use-journal-entries';

interface DateSelectorProps {
  userId: string;
  className?: string;
}

export function DateSelector({ userId, className = '' }: DateSelectorProps) {
  const { 
    selectedDate, 
    setSelectedDate, 
    formatDateForDisplay, 
    navigateDate, 
    goToToday, 
    isToday 
  } = useDate();
  
  const [isOpen, setIsOpen] = useState(false);
  const { journalEntryDates } = useJournalEntries({ userId });

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setIsOpen(false);
  };

  const handlePrevDay = () => {
    navigateDate('prev');
  };

  const handleNextDay = () => {
    navigateDate('next');
  };

  const handleToday = () => {
    goToToday();
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Date Navigation */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePrevDay}
          className="h-8 w-8"
          title="Previous day"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={handleNextDay}
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
          <div className="p-3">
            <div className="flex justify-center mb-3">
              <Calendar
                selectedDate={selectedDate}
                onDateSelect={handleDateSelect}
                journalEntryDates={journalEntryDates}
              />
            </div>
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
