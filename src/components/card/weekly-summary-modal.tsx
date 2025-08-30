import React, { useState } from 'react'
import { WeeklySummaryCard } from './weekly-summary-card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface WeeklySummaryModalProps {
  isOpen: boolean
  onClose: () => void
}

export function WeeklySummaryModal({ isOpen, onClose }: WeeklySummaryModalProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    // Get the start of the current week (Monday)
    const now = new Date()
    const dayOfWeek = now.getDay()
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Sunday = 0, Monday = 1
    const monday = new Date(now)
    monday.setDate(now.getDate() - daysToSubtract)
    return monday.toISOString().split('T')[0]
  })

  const navigateWeek = (direction: 'prev' | 'next') => {
    const current = new Date(currentWeekStart)
    if (direction === 'prev') {
      current.setDate(current.getDate() - 7)
    } else {
      current.setDate(current.getDate() + 7)
    }
    setCurrentWeekStart(current.toISOString().split('T')[0])
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-panel border border-line rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-line">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateWeek('prev')}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateWeek('next')}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            ×
          </Button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-4">
          <WeeklySummaryCard 
            weekStart={currentWeekStart} 
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  )
}
