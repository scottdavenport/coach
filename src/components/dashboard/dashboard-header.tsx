'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { SettingsModal } from '@/components/settings/settings-modal'
import { WeeklySummaryModal } from '@/components/card/weekly-summary-modal'
import { DailyWorkoutModal, DailyWorkoutModalRef } from '@/components/dashboard/daily-workout-modal'
import { DailyJournal } from '@/components/card/daily-narrative'
import { Settings, Calendar, Dumbbell, Sun, RotateCcw } from 'lucide-react'

interface DashboardHeaderProps {
  userId: string
  selectedDate?: string
}

export function DashboardHeader({ userId, selectedDate }: DashboardHeaderProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isWeeklySummaryOpen, setIsWeeklySummaryOpen] = useState(false)
  const [isDailyJournalOpen, setIsDailyJournalOpen] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const workoutModalRef = useRef<DailyWorkoutModalRef>(null)

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
  }

  const handleResetUserData = async () => {
    if (!confirm('⚠️ This will permanently delete ALL your conversation history, patterns, and personal data. This action cannot be undone. Are you sure you want to continue?')) {
      return
    }

    setIsResetting(true)
    try {
      const supabase = createClient()
      
      console.log('🧹 Starting user data reset...')
      
      // Clear conversation history (main chat messages)
      const { error: conversationsError } = await supabase
        .from('conversations')
        .delete()
        .eq('user_id', userId)
      
      if (conversationsError) {
        console.error('Error clearing conversations:', conversationsError)
      } else {
        console.log('✅ Cleared conversation history')
      }

      // Clear conversation insights
      const { error: insightsError } = await supabase
        .from('conversation_insights')
        .delete()
        .eq('user_id', userId)
      
      if (insightsError) {
        console.error('Error clearing conversation insights:', insightsError)
      } else {
        console.log('✅ Cleared conversation insights')
      }

      // Clear user uploads (files)
      const { error: uploadsError } = await supabase
        .from('user_uploads')
        .delete()
        .eq('user_id', userId)
      
      if (uploadsError) {
        console.error('Error clearing uploads:', uploadsError)
      } else {
        console.log('✅ Cleared user uploads')
      }

      // Clear events (health data)
      const { error: eventsError } = await supabase
        .from('events')
        .delete()
        .eq('user_id', userId)
      
      if (eventsError) {
        console.error('Error clearing events:', eventsError)
      } else {
        console.log('✅ Cleared events')
      }
      
      // Clear pattern recognition cache by refreshing the page
      console.log('🔄 Refreshing page to clear all cached data...')
      
      // Show success message
      alert('✅ User data reset complete! The page will refresh to clear all cached data.')
      
      // Refresh the page to clear all cached data
      window.location.reload()
      
    } catch (error) {
      console.error('Error resetting user data:', error)
      alert('❌ Error resetting user data. Please try again.')
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <>
      <div className="flex items-center justify-between p-4 border-b border-line">
        <div>
          <h1 className="text-xl font-semibold text-text">Coach</h1>
          <p className="text-sm text-muted">Your AI Health & Fitness Companion</p>
        </div>
        <div className="flex items-center gap-2">
          {/* TEMPORARY RESET BUTTON */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetUserData}
            disabled={isResetting}
            className="h-8 px-3 text-xs border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white"
            title="Reset User Data (Temporary)"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            {isResetting ? 'Resetting...' : 'Reset Data'}
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsDailyJournalOpen(true)}
            className="h-8 w-8"
            title="Daily Journal"
          >
            <Sun className="h-4 w-4" />
          </Button>
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

      <DailyJournal
        userId={userId}
        isOpen={isDailyJournalOpen}
        onClose={() => setIsDailyJournalOpen(false)}
        selectedDate={selectedDate}
      />
    </>
  )
}
