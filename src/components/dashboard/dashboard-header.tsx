'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { SettingsModal } from '@/components/settings/settings-modal'
import { CardModalTest } from '@/components/card/card-modal-test'
import { WeeklySummaryModal } from '@/components/card/weekly-summary-modal'
import { DailyWorkoutModal, DailyWorkoutModalRef } from '@/components/dashboard/daily-workout-modal'
import { Settings, Calendar, Dumbbell } from 'lucide-react'

interface DashboardHeaderProps {
  userId: string
  cardModalRef?: React.RefObject<{ refreshData: () => void }>
}

export function DashboardHeader({ userId, cardModalRef }: DashboardHeaderProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isWeeklySummaryOpen, setIsWeeklySummaryOpen] = useState(false)
  const workoutModalRef = useRef<DailyWorkoutModalRef>(null)

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
  }

  return (
    <>
      <div className="flex items-center justify-between p-4 border-b border-line">
        <div>
          <h1 className="text-xl font-semibold text-text">Coach</h1>
          <p className="text-sm text-muted">Your AI Health & Fitness Companion</p>
        </div>
        <div className="flex items-center gap-2">
          <CardModalTest userId={userId} ref={cardModalRef} />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => workoutModalRef.current?.openModal()}
            className="h-8 w-8"
            title="Daily Workout"
          >
            <Dumbbell className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsWeeklySummaryOpen(true)}
            className="h-8 w-8"
            title="Weekly Summary"
          >
            <Calendar className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSettingsOpen(true)}
            className="h-8 w-8"
          >
            <Settings className="h-4 w-4" />
          </Button>
          <button 
            onClick={handleSignOut}
            className="px-3 py-1 text-sm bg-card border border-line rounded-lg text-text hover:bg-card/80"
          >
            Sign Out
          </button>
        </div>
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        userId={userId}
      />

      <WeeklySummaryModal
        isOpen={isWeeklySummaryOpen}
        onClose={() => setIsWeeklySummaryOpen(false)}
      />

      <DailyWorkoutModal
        userId={userId}
        ref={workoutModalRef}
      />
    </>
  )
}
