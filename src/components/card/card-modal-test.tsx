'use client'

import { Button } from '@/components/ui/button'
import { Calendar, ChevronLeft, ChevronRight, Zap } from 'lucide-react'
import { CardModal } from './card-modal'
import { CardContent } from './card-content'
import { useCardModal } from '@/hooks/use-card-modal'
import { useState, forwardRef, useImperativeHandle } from 'react'
import { Input } from '@/components/ui/input'

interface CardModalTestProps {
  userId: string
}

const CardModalTest = forwardRef<{ refreshData: () => void }, CardModalTestProps>(({ userId }, ref) => {
  const [showDatePicker, setShowDatePicker] = useState(false)
  
  const {
    isOpen,
    selectedDate,
    cardData,
    loading,
    openCard,
    closeCard,
    navigateToDate,
    refreshData
  } = useCardModal({ userId })

  // Expose refreshData function to parent component
  useImperativeHandle(ref, () => ({
    refreshData
  }))

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    navigateToDate(e.target.value)
    setShowDatePicker(false)
  }

  const navigateDate = (direction: 'prev' | 'next') => {
    const currentDate = new Date(selectedDate)
    const newDate = new Date(currentDate)
    
    if (direction === 'prev') {
      newDate.setDate(currentDate.getDate() - 1)
    } else {
      newDate.setDate(currentDate.getDate() + 1)
    }
    
    navigateToDate(newDate.toISOString().split('T')[0])
  }

  const headerContent = (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={refreshData}
        className="text-sm"
      >
        <Zap className="h-4 w-4 mr-2" />
        Refresh Data
      </Button>
      
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigateDate('prev')}
          className="h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          onClick={() => setShowDatePicker(!showDatePicker)}
          className="flex items-center gap-2"
        >
          <Calendar className="h-4 w-4" />
          {selectedDate ? formatDate(selectedDate) : 'Today'}
        </Button>
        
        {showDatePicker && (
          <Input
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
            className="w-auto"
          />
        )}
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigateDate('next')}
          className="h-8 w-8"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </>
  )

  return (
    <>
      {/* Test Button */}
      <Button
        onClick={() => openCard()}
        className="flex items-center gap-2"
        variant="outline"
      >
        <Calendar className="h-4 w-4" />
        Open Daily Card
      </Button>

      {/* Modal */}
      <CardModal
        isOpen={isOpen}
        onClose={closeCard}
        headerContent={headerContent}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Loading your daily card...</p>
            </div>
          </div>
        ) : (
          <CardContent
            userId={userId}
            date={selectedDate}
            data={cardData}
            onDataUpdate={refreshData}
          />
        )}
      </CardModal>
    </>
  )
})

CardModalTest.displayName = 'CardModalTest'

export { CardModalTest }
