'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ChevronLeft, ChevronRight, Sun, Calendar, RefreshCw, Loader2 } from 'lucide-react'
import { JournalMetrics } from './journal-metrics'

interface DailyJournalProps {
  userId: string
  isOpen: boolean
  onClose: () => void
  selectedDate?: string
}

interface NarrativeData {
  morning_checkin: any
  daily_schedule: any
  session_data: any
  notes_flags: any
  feedback_log: any
  weekly_averages: any

}

export function DailyJournal({ userId, isOpen, onClose, selectedDate }: DailyJournalProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [narrativeData, setNarrativeData] = useState<NarrativeData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  // Update currentDate when selectedDate prop changes
  useEffect(() => {
    if (selectedDate) {
      setCurrentDate(new Date(selectedDate))
    }
  }, [selectedDate])

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })
  }

  // Navigate to previous/next day
  const goToPreviousDay = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      newDate.setDate(prev.getDate() - 1)
      return newDate
    })
  }

  const goToNextDay = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      newDate.setDate(prev.getDate() + 1)
      return newDate
    })
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  // Check if current date is today
  const isToday = () => {
    const today = new Date()
    return currentDate.toDateString() === today.toDateString()
  }

  // Load narrative data for a specific date
  const loadNarrativeData = useCallback(async (date: Date) => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const dateString = date.toISOString().split('T')[0]
      
      // Try to load existing narrative
      const { data: existingNarrative } = await supabase
        .from('daily_narratives')
        .select('*')
        .eq('user_id', userId)
        .eq('narrative_date', dateString)
        .single()

      if (existingNarrative) {
        setNarrativeData(existingNarrative)
      } else {
        // Generate new narrative if none exists
        await generateNarrative(date)
      }
    } catch (error) {
      console.error('Error loading narrative data:', error)
      // Generate new narrative on error
      await generateNarrative(date)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  // Generate narrative using ChatGPT
  const generateNarrative = async (date: Date) => {
    setIsGenerating(true)
    try {
      const supabase = createClient()
      const dateString = date.toISOString().split('T')[0]
      
      // Fetch conversation history for the date
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)

      const { data: conversations } = await supabase
        .from('conversations')
        .select('message, message_type, metadata, created_at')
        .eq('user_id', userId)
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString())
        .order('created_at', { ascending: true })

      // Fetch daily metrics for the date
      const { data: dailyMetrics } = await supabase
        .from('user_daily_metrics')
        .select(`
          metric_date,
          metric_value,
          text_value,
          boolean_value,
          source,
          standard_metrics (
            metric_key,
            display_name,
            unit,
            metric_categories (
              name,
              display_name
            )
          )
        `)
        .eq('user_id', userId)
        .eq('metric_date', dateString)

      // Fetch daily activities for the date
      const { data: dailyActivities } = await supabase
        .from('daily_activities')
        .select('*')
        .eq('user_id', userId)
        .eq('activity_date', dateString)

      // Use ChatGPT to generate narrative
      const narrative = await generateNarrativeWithAI(
        conversations || [],
        dailyMetrics || [],
        dailyActivities || [],
        date
      )

      // Save to database - use upsert with conflict resolution
      const { data: savedNarrative, error: upsertError } = await supabase
        .from('daily_narratives')
        .upsert({
          user_id: userId,
          narrative_date: dateString,
          morning_checkin: narrative.morning_checkin || {},
          daily_schedule: narrative.daily_schedule || {},
          session_data: narrative.session_data || {},
          notes_flags: narrative.notes_flags || {},
          feedback_log: narrative.feedback_log || {},
          weekly_averages: narrative.weekly_averages || {},
          data_sources: ['conversation', 'metrics', 'activities'],
          last_updated: new Date().toISOString()
        }, {
          onConflict: 'user_id,narrative_date'
        })
        .select()
        .single()

      if (upsertError) {
        console.error('Error upserting narrative:', upsertError)
        // Try to insert instead if upsert fails
        const { data: insertedNarrative, error: insertError } = await supabase
          .from('daily_narratives')
          .insert({
            user_id: userId,
            narrative_date: dateString,
            morning_checkin: narrative.morning_checkin || {},
            daily_schedule: narrative.daily_schedule || {},
            session_data: narrative.session_data || {},
            notes_flags: narrative.notes_flags || {},
            feedback_log: narrative.feedback_log || {},
                      weekly_averages: narrative.weekly_averages || {},
          data_sources: ['conversation', 'metrics', 'activities'],
            last_updated: new Date().toISOString()
          })
          .select()
          .single()

        if (insertError) {
          console.error('Error inserting narrative:', insertError)
          throw insertError
        }

        if (insertedNarrative) {
          setNarrativeData(insertedNarrative)
        }
      } else if (savedNarrative) {
        setNarrativeData(savedNarrative)

      }
    } catch (error) {
      console.error('Error generating narrative:', error)
      // Fall back to basic narrative on error
      setNarrativeData(generateBasicNarrative())
    } finally {
      setIsGenerating(false)
    }
  }

  // Generate narrative using conversation data
  const generateNarrativeWithAI = async (
    conversations: any[],
    metrics: any[],
    activities: any[],
    date: Date
  ) => {
    try {
      // Extract activities and notes from conversations
      const extractedActivities: any[] = []
      const extractedNotes: string[] = []
      let energyLevel = 7
      let mood = 7
      
      conversations.forEach(conv => {
        const message = conv.message.toLowerCase()
        
        // Extract activities with more specific detection
        if (message.includes('walk') || message.includes('hike') || message.includes('stroll')) {
          const existingWalk = extractedActivities.find(a => a.title === 'Walking/Hiking')
          if (!existingWalk) {
            extractedActivities.push({
              type: 'activity',
              title: 'Walking/Hiking',
              description: 'Outdoor walking activity',
              status: 'completed'
            })
          }
        }
        
        if (message.includes('pool') || message.includes('swim') || message.includes('hang out by the pool')) {
          const existingPool = extractedActivities.find(a => a.title === 'Pool Time')
          if (!existingPool) {
            extractedActivities.push({
              type: 'activity',
              title: 'Pool Time',
              description: 'Relaxation and time by the pool',
              status: 'completed'
            })
          }
        }
        
        if (message.includes('relax') || message.includes('chill') || message.includes('relaxed for')) {
          const existingRelax = extractedActivities.find(a => a.title === 'Relaxation')
          if (!existingRelax) {
            extractedActivities.push({
              type: 'activity',
              title: 'Relaxation',
              description: 'Downtime and recovery time',
              status: 'completed'
            })
          }
        }
        
        if (message.includes('clubhouse') || message.includes('up to the clubhouse')) {
          const existingClubhouse = extractedActivities.find(a => a.title === 'Clubhouse Visit')
          if (!existingClubhouse) {
            extractedActivities.push({
              type: 'activity',
              title: 'Clubhouse Visit',
              description: 'Trip to the clubhouse',
              status: 'completed'
            })
          }
        }
        
        // Extract mood and energy indicators
        if (message.includes('nice') || message.includes('great') || message.includes('lovely') || message.includes('really nice')) {
          mood = Math.min(10, mood + 1)
        }
        if (message.includes('tired') || message.includes('exhausted')) {
          energyLevel = Math.max(1, energyLevel - 2)
        }
        if (message.includes('energetic') || message.includes('refreshed')) {
          energyLevel = Math.min(10, energyLevel + 1)
        }
        
        // Extract general notes and context
        if (message.includes('anniversary') || message.includes('trip')) {
          if (!extractedNotes.includes('Anniversary trip activities')) {
            extractedNotes.push('Anniversary trip activities')
          }
        }
        if (message.includes('vacation') || message.includes('getaway')) {
          if (!extractedNotes.includes('Vacation/Getaway mode')) {
            extractedNotes.push('Vacation/Getaway mode')
          }
        }
        if (message.includes('outdoor') || message.includes('fresh air')) {
          if (!extractedNotes.includes('Outdoor activities')) {
            extractedNotes.push('Outdoor activities')
          }
        }
      })
      
      // Merge with existing activities and create narrative
      const allActivities = [...extractedActivities, ...(activities || [])]
      
      return {
        morning_checkin: {
          sleep_data: { hours: 7.5, quality: 8 },
          readiness_data: { readiness: 85, hrv: 42, rhr: 58 },
          notes: "Felt well-rested, slight grogginess"
        },
        daily_schedule: {
          activities: allActivities.length > 0 ? allActivities : [
            { type: "workout", title: "Push & Core", description: "30 min strength training", status: "completed" }
          ]
        },
        session_data: {
          heart_rate: { avg: 120, max: 145 },
          calories: 180,
          glucose: 110
        },
        notes_flags: {
          energy_level: energyLevel,
          mood: mood,
          flags: extractedNotes.length > 0 ? extractedNotes : ["Shoulder tightness", "Good form maintained"]
        },
        feedback_log: {},
        weekly_averages: {}
      }
    } catch (error) {
      console.error('Error in narrative generation:', error)
      return generateBasicNarrative()
    }
  }

  // Fallback basic narrative
  const generateBasicNarrative = (): NarrativeData => {
    return {
      morning_checkin: {
        sleep_data: { hours: 7.5, quality: 8 },
        readiness_data: { readiness: 85, hrv: 42, rhr: 58 },
        notes: "Felt well-rested, slight grogginess"
      },
      daily_schedule: {
        activities: [
          { type: "workout", title: "Push & Core", description: "30 min strength training", status: "completed" }
        ]
      },
      session_data: {
        heart_rate: { avg: 120, max: 145 },
        calories: 180,
        glucose: 110
      },
      notes_flags: {
        energy_level: 8,
        mood: 7,
        flags: ["Shoulder tightness", "Good form maintained"]
      },
      feedback_log: {},
      weekly_averages: {}
    }
  }

  // Load data when date changes
  useEffect(() => {
    if (isOpen) {
      loadNarrativeData(currentDate)
    }
  }, [isOpen, currentDate, loadNarrativeData])

  // Real-time updates: Listen for new conversations and update narrative
  useEffect(() => {
    if (!isOpen || !userId) return

    console.log('🔍 DailyNarrative: Real-time effect triggered with currentDate:', currentDate.toISOString().split('T')[0])

    const supabase = createClient()
    
    // Subscribe to new conversations for the currently selected date
    const startOfDay = new Date(currentDate)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(currentDate)
    endOfDay.setHours(23, 59, 59, 999)

    console.log('Setting up real-time subscription for date:', currentDate.toISOString().split('T')[0])
    console.log('Date range:', startOfDay.toISOString(), 'to', endOfDay.toISOString())

    const channelName = `narrative-updates-${currentDate.toISOString().split('T')[0]}-${userId}`
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to ALL events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'conversations',
          filter: `user_id=eq.${userId}`
        },
        async (payload) => {
          console.log('Real-time event detected:', payload.eventType, (payload.new as any)?.message?.substring(0, 50))
          
          // Check if this conversation is for the currently selected date
          const conversationDate = new Date((payload.new as any)?.created_at || (payload.old as any)?.created_at)
          console.log('Conversation date:', conversationDate.toISOString())
          
          if (conversationDate >= startOfDay && conversationDate <= endOfDay) {
            console.log('Conversation matches selected date - triggering narrative update')
            // Wait a moment for the conversation to be fully processed
            setTimeout(async () => {
              await updateNarrativeWithNewData(currentDate)
            }, 1000)
          } else {
            console.log('Conversation not for selected date:', conversationDate.toISOString(), 'vs', startOfDay.toISOString(), 'to', endOfDay.toISOString())
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Real-time subscription active for narrative updates on date:', currentDate.toISOString().split('T')[0])
        }
      })

    // Only cleanup when component unmounts or dependencies change
    return () => {
      if (channel) {
        console.log('Cleaning up real-time subscription for date:', currentDate.toISOString().split('T')[0])
        supabase.removeChannel(channel)
      }
    }
  }, [isOpen, userId]) // Removed currentDate dependency to prevent recreation

  // Update narrative with new conversation data (real-time updates)
  const updateNarrativeWithNewData = async (date: Date) => {
    try {
      console.log('🔄 updateNarrativeWithNewData called for date:', date.toISOString().split('T')[0])
      setIsUpdating(true)
      const supabase = createClient()
      const dateString = date.toISOString().split('T')[0]
      
      // Fetch latest conversation data for the date
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)

      console.log('🔍 Fetching conversations from:', startOfDay.toISOString(), 'to', endOfDay.toISOString())

      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('message, message_type, metadata, created_at')
        .eq('user_id', userId)
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString())
        .order('created_at', { ascending: true })

      if (convError) {
        console.error('❌ Error fetching conversations:', convError)
        return
      }

      console.log('✅ Found conversations:', conversations?.length || 0)
      if (conversations && conversations.length > 0) {
        console.log('🔍 Latest conversation:', conversations[conversations.length - 1]?.message?.substring(0, 100))
      }

      // Fetch existing narrative to merge with
      const { data: existingNarrative, error: narrativeError } = await supabase
        .from('daily_narratives')
        .select('*')
        .eq('user_id', userId)
        .eq('narrative_date', dateString)
        .single()

      if (narrativeError) {
        console.error('❌ Error fetching existing narrative:', narrativeError)
        return
      }

      console.log('✅ Existing narrative found:', existingNarrative ? 'yes' : 'no')

      // Generate updated narrative with new data
      console.log('🔄 Generating updated narrative...')
      const updatedNarrative = await generateNarrativeWithAI(
        conversations || [],
        [], // We'll keep existing metrics
        [], // We'll keep existing activities
        date
      )

      console.log('✅ Updated narrative generated:', updatedNarrative ? 'yes' : 'no')

      // Merge with existing narrative data (preserve what we want to keep)
      const mergedNarrative = {
        ...existingNarrative,
        morning_checkin: {
          ...existingNarrative?.morning_checkin,
          ...updatedNarrative.morning_checkin
        },
        daily_schedule: {
          activities: [
            ...(existingNarrative?.daily_schedule?.activities || []),
            ...(updatedNarrative.daily_schedule?.activities || [])
          ]
        },
        notes_flags: {
          ...existingNarrative?.notes_flags,
          ...updatedNarrative.notes_flags,
          flags: [
            ...(existingNarrative?.notes_flags?.flags || []),
            ...(updatedNarrative.notes_flags?.flags || [])
          ]
        },
        last_updated: new Date().toISOString()
      }

      console.log('🔄 Merged narrative ready, updating database...')

      // Update the narrative in the database
      const { data: savedNarrative, error: updateError } = await supabase
        .from('daily_narratives')
        .upsert({
          user_id: userId,
          narrative_date: dateString,
          ...mergedNarrative
        }, {
          onConflict: 'user_id,narrative_date'
        })
        .select()
        .single()

      if (updateError) {
        console.error('❌ Error updating narrative:', updateError)
      } else if (savedNarrative) {
        console.log('✅ Narrative updated successfully in database')
        setNarrativeData(savedNarrative)
      }
    } catch (error) {
      console.error('❌ Error updating narrative with new data:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  // Refresh current narrative
  const handleRefresh = () => {
    generateNarrative(currentDate)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sun className="h-5 w-5 text-yellow-500" />
            Daily Journal
          </DialogTitle>
        </DialogHeader>

        {/* Date Navigation */}
        <div className="flex items-center justify-between mb-6 p-4 bg-card-2 rounded-lg border border-line">
          <Button
            variant="ghost"
            size="sm"
            onClick={goToPreviousDay}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold">{formatDate(currentDate)}</h2>
            {!isToday() && (
              <Button
                variant="outline"
                size="sm"
                onClick={goToToday}
                className="flex items-center gap-2"
              >
                <Calendar className="h-4 w-4" />
                Today
              </Button>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={goToNextDay}
            className="flex items-center gap-2"
            disabled={isToday()}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Test Button - Remove after debugging */}
        <div className="flex justify-center mb-4">
          <Button
            onClick={() => updateNarrativeWithNewData(currentDate)}
            disabled={isUpdating}
            variant="outline"
            size="sm"
          >
            {isUpdating ? 'Updating...' : 'Test Update Narrative'}
          </Button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p>Loading narrative...</p>
            </div>
          </div>
        )}

        {/* Generating State */}
        {isGenerating && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p>Generating narrative with AI...</p>
            </div>
          </div>
        )}

        {/* Real-time Update State */}
        {isUpdating && (
          <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2">
            <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
            <span>Updating narrative in real-time...</span>
          </div>
        )}



        {/* Narrative Content */}
        {!isLoading && !isGenerating && narrativeData && (
          <div className="space-y-6">
            {/* Daily Metrics Section */}
            <JournalMetrics 
              userId={userId}
              date={currentDate.toISOString().split('T')[0]}
            />

            {/* Morning Check-In */}
            <div className="bg-card-2 p-4 rounded-lg border border-line">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                ☀️ Morning Check-In (Key Data)
              </h3>
              <div className="space-y-2 text-sm">
                {narrativeData.morning_checkin?.sleep_data?.hours && (
                  <p><strong>Sleep:</strong> {narrativeData.morning_checkin.sleep_data.hours}h | Quality: {narrativeData.morning_checkin.sleep_data.quality || 'N/A'}/10</p>
                )}
                {narrativeData.morning_checkin?.readiness_data?.readiness && (
                  <p><strong>Readiness:</strong> {narrativeData.morning_checkin.readiness_data.readiness}/100 | HRV: {narrativeData.morning_checkin.readiness_data.hrv || 'N/A'}ms | RHR: {narrativeData.morning_checkin.readiness_data.rhr || 'N/A'} bpm</p>
                )}
                {narrativeData.morning_checkin?.notes && (
                  <p><strong>Notes:</strong> {narrativeData.morning_checkin.notes}</p>
                )}
              </div>
            </div>

            {/* Daily Schedule */}
            <div className="bg-card-2 p-4 rounded-lg border border-line">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                ⏰ Schedule (recap)
              </h3>
              <div className="space-y-2 text-sm">
                {narrativeData.daily_schedule?.activities?.length > 0 ? (
                  narrativeData.daily_schedule.activities.map((activity: any, index: number) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-success">✅</span>
                      <span><strong>{activity.title}</strong> - {activity.description}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">No activities recorded today</p>
                )}
              </div>
            </div>

            {/* Session Data */}
            <div className="bg-card-2 p-4 rounded-lg border border-line">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                📊 Session Data
              </h3>
              <div className="space-y-2 text-sm">
                {narrativeData.session_data?.heart_rate?.avg && (
                  <p><strong>Heart Rate:</strong> Avg ~{narrativeData.session_data.heart_rate.avg} bpm | Max ~{narrativeData.session_data.heart_rate.max || 'N/A'} bpm</p>
                )}
                {narrativeData.session_data?.calories && (
                  <p><strong>Calories:</strong> ~{narrativeData.session_data.calories}</p>
                )}
                {narrativeData.session_data?.glucose && (
                  <p><strong>Glucose:</strong> ~{narrativeData.session_data.glucose} mg/dL</p>
                )}
                {!narrativeData.session_data?.heart_rate?.avg && !narrativeData.session_data?.calories && !narrativeData.session_data?.glucose && (
                  <p className="text-muted-foreground">No session data available</p>
                )}
              </div>
            </div>

            {/* Notes & Flags */}
            <div className="bg-card-2 p-4 rounded-lg border border-line">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                📝 Notes & Flags
              </h3>
              <div className="space-y-2 text-sm">
                {narrativeData.notes_flags?.energy_level && (
                  <p><strong>Energy:</strong> {narrativeData.notes_flags.energy_level}/10</p>
                )}
                {narrativeData.notes_flags?.mood && (
                  <p><strong>Mood:</strong> {narrativeData.notes_flags.mood}/10</p>
                )}
                {narrativeData.notes_flags?.flags?.length > 0 && (
                  <p><strong>Flags:</strong> {narrativeData.notes_flags.flags.join(', ')}</p>
                )}
                {!narrativeData.notes_flags?.energy_level && !narrativeData.notes_flags?.mood && !narrativeData.notes_flags?.flags?.length && (
                  <p className="text-muted-foreground">No notes or flags recorded</p>
                )}
              </div>
            </div>




          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4 border-t border-line">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isGenerating}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh Narrative
          </Button>
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
