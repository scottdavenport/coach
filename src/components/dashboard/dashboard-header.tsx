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
  onDateChange?: (date: string) => void
}

export function DashboardHeader({ userId, selectedDate, onDateChange }: DashboardHeaderProps) {
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
    // Enhanced confirmation dialog with more specific warnings
    const confirmMessage = `⚠️ DANGER: DATA RESET CONFIRMATION ⚠️

This will permanently delete ALL of your data EXCEPT the scott@thinkcode.com user account:

📋 Data that will be DELETED:
• All conversation history and insights
• All daily journal entries
• All workout activities and goals
• All health metrics and patterns
• All file uploads and OCR data
• All weekly/monthly summaries
• All Oura integration data
• All user preferences

🔒 Data that will be PRESERVED:
• The scott@thinkcode.com user account
• Core metric categories and standard metrics

⚠️ THIS ACTION CANNOT BE UNDONE ⚠️

Type "RESET" to confirm you want to proceed:`

    const userInput = prompt(confirmMessage)
    
    if (userInput !== 'RESET') {
      alert('Reset cancelled. No data was modified.')
      return
    }

    setIsResetting(true)
    try {
      const supabase = createClient()
      
      console.log('🧹 Starting comprehensive user data reset...')
      
      // Get the user's email to check if they're scott@thinkcode.com
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error('Unable to verify user identity')
      }

      // Prevent scott@thinkcode.com from being reset
      if (user.email === 'scott@thinkcode.com') {
        alert('❌ Cannot reset data for scott@thinkcode.com user account. This account is protected.')
        return
      }

      // Also check if there's a users table entry to get the user ID for tables that reference users(id)
      const { data: userProfile } = await supabase
        .from('users')
        .select('id, email')
        .eq('id', userId)
        .single()
      
      // Double-check protection for scott@thinkcode.com in users table as well
      if (userProfile?.email === 'scott@thinkcode.com') {
        alert('❌ Cannot reset data for scott@thinkcode.com user account. This account is protected.')
        return
      }

      // List of all user-specific tables to clear (excluding scott@thinkcode.com)
      const tablesToReset = [
        'conversation_insights',
        'conversations', 
        'events',
        'user_uploads',
        'oura_integrations',
        'oura_data',
        'ocr_feedback',
        'weekly_summaries',
        'monthly_trends',
        'daily_journal',
        'daily_goals',
        'daily_activities',
        'user_daily_metrics',
        'user_metric_preferences'
      ]

      let successCount = 0
      let errorCount = 0

      // Reset each table
      for (const tableName of tablesToReset) {
        try {
          const { error } = await supabase
            .from(tableName)
            .delete()
            .eq('user_id', userId)
          
          if (error) {
            console.error(`Error clearing ${tableName}:`, error)
            errorCount++
          } else {
            console.log(`✅ Cleared ${tableName}`)
            successCount++
          }
        } catch (err) {
          console.error(`Failed to clear ${tableName}:`, err)
          errorCount++
        }
      }

      console.log(`🔄 Reset complete: ${successCount} tables cleared, ${errorCount} errors`)
      
      if (errorCount > 0) {
        alert(`⚠️ Data reset completed with ${errorCount} errors. Check console for details. The page will refresh to clear cached data.`)
      } else {
        alert('✅ User data reset complete! The page will refresh to clear all cached data.')
      }
      
      // Refresh the page to clear all cached data and return to default state
      window.location.reload()
      
    } catch (error) {
      console.error('Error resetting user data:', error)
      alert('❌ Error resetting user data. Please try again or check the console for details.')
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
