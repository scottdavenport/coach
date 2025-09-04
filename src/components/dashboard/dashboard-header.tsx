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
    // Enhanced confirmation dialog requiring 'RESET' to be typed
    const confirmationText = prompt(
      '⚠️ DANGER: This will permanently delete ALL your data!\n\n' +
      'This includes:\n' +
      '• All conversation history\n' +
      '• All health metrics and patterns\n' +
      '• All journal entries and insights\n' +
      '• All uploaded files and OCR data\n' +
      '• All workout and activity data\n' +
      '• All weekly summaries and trends\n\n' +
      'This action CANNOT be undone!\n\n' +
      'Type "RESET" (in all caps) to confirm:'
    )

    if (confirmationText !== 'RESET') {
      if (confirmationText !== null) {
        alert('❌ Reset cancelled. You must type "RESET" exactly to confirm.')
      }
      return
    }

    setIsResetting(true)
    try {
      const supabase = createClient()
      
      // Check if user is protected (scott@thinkcode.com)
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('email')
        .eq('id', userId)
        .single()

      if (profileError) {
        console.error('Error fetching user profile:', profileError)
        alert('❌ Error verifying user account. Reset cancelled for safety.')
        return
      }

      if (userProfile?.email === 'scott@thinkcode.com') {
        alert('❌ Cannot reset data for scott@thinkcode.com user account. This account is protected.')
        return
      }
      
      console.log('🧹 Starting comprehensive user data reset...')
      
      // Clear ALL user-specific tables in order of dependencies
      // Order matters due to foreign key constraints
      const tablesToClear = [
        'conversation_file_attachments', // Junction table - clear first
        'conversation_insights', 
        'conversations',
        'user_daily_metrics',
        'user_metric_preferences',
        'daily_narratives',
        'daily_journal',
        'daily_goals',
        'daily_activities',
        'weekly_summaries',
        'monthly_trends',
        'events',
        'user_uploads', // Clear after conversation_file_attachments
        'oura_data',
        'oura_integrations',
        'ocr_feedback'
      ]

      let clearedCount = 0
      let errorCount = 0

      for (const table of tablesToClear) {
        try {
          let error;
          
          if (table === 'conversation_file_attachments') {
            // Special handling for junction table - delete via conversation_id
            // First get conversation IDs for this user
            const { data: conversations, error: convError } = await supabase
              .from('conversations')
              .select('id')
              .eq('user_id', userId)
            
            if (convError) {
              error = convError;
            } else if (conversations && conversations.length > 0) {
              const conversationIds = conversations.map(c => c.id);
              const { error: deleteError } = await supabase
                .from(table)
                .delete()
                .in('conversation_id', conversationIds)
              error = deleteError;
            } else {
              // No conversations to delete attachments for
              error = null;
            }
          } else {
            // Standard deletion for tables with user_id column
            const { error: deleteError } = await supabase
              .from(table)
              .delete()
              .eq('user_id', userId)
            error = deleteError;
          }
          
          if (error) {
            console.error(`❌ Error clearing ${table}:`, error)
            console.error(`Error details:`, {
              code: error.code,
              message: error.message,
              details: error.details,
              hint: error.hint
            })
            errorCount++
          } else {
            console.log(`✅ Cleared ${table}`)
            clearedCount++
          }
        } catch (tableError) {
          console.error(`Exception clearing ${table}:`, tableError)
          errorCount++
        }
      }

      // Clear any remaining user profile data (except email for auth)
      const { error: profileResetError } = await supabase
        .from('users')
        .update({ 
          profile: {},
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (profileResetError) {
        console.error('Error resetting user profile:', profileResetError)
        errorCount++
      } else {
        console.log('✅ Reset user profile data')
        clearedCount++
      }
      
      console.log(`🧹 Reset complete: ${clearedCount} tables cleared, ${errorCount} errors`)
      
      // Show comprehensive success message
      if (errorCount === 0) {
        alert('✅ Complete data reset successful!\n\nAll your data has been permanently deleted:\n• Conversations & insights\n• Health metrics & patterns\n• Journal entries\n• Files & uploads\n• Workout data\n• Weekly summaries\n\nThe page will refresh to return to a clean state.')
      } else {
        alert(`⚠️ Reset completed with ${errorCount} errors.\n\nMost data has been cleared, but some tables may have failed. Check the console for details. The page will refresh.`)
      }
      
      // Refresh the page to clear all cached data and return to clean state
      setTimeout(() => {
        window.location.reload()
      }, 2000)
      
    } catch (error) {
      console.error('Critical error during data reset:', error)
      alert('❌ Critical error during data reset. Please check the console and try again.')
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
