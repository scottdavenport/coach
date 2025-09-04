'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ChevronLeft, ChevronRight, Sun, Calendar, RefreshCw, Loader2, Brain, TrendingUp, Lightbulb } from 'lucide-react'
import { JournalMetrics } from './journal-metrics'
import { usePatternRecognition } from '@/hooks/use-pattern-recognition'

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
  narrative_text?: string
}

export function DailyJournal({ userId, isOpen, onClose, selectedDate }: DailyJournalProps) {
  // Initialize with today's date in local timezone to avoid timezone issues
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  })
  const [narrativeData, setNarrativeData] = useState<NarrativeData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showPatterns, setShowPatterns] = useState(false)

  // Pattern recognition hook - TEMPORARILY DISABLED for performance debugging
  // const {
  //   patterns,
  //   isLoading: patternsLoading,
  //   error: patternsError,
  //   refreshPatterns,
  //   getTopTopics,
  //   getTopActivities,
  //   getTopMoods,
  //   getSleepInsights
  // } = usePatternRecognition(userId)
  
  // Temporary mock data while pattern recognition is disabled
  const patterns = null
  const patternsLoading = false
  const patternsError = null
  const refreshPatterns = async () => {}
  const getTopTopics = () => []
  const getTopActivities = () => []
  const getTopMoods = () => []
  const getSleepInsights = () => []

  // Update currentDate when selectedDate prop changes
  useEffect(() => {
    if (selectedDate) {
      setCurrentDate(new Date(selectedDate))
    }
  }, [selectedDate])

  // Ensure we start with current date if no date is selected
  useEffect(() => {
    if (!selectedDate) {
      const now = new Date()
      // Force to today's date in local timezone
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      console.log('🔍 Setting current date to today:', today.toISOString().split('T')[0])
      setCurrentDate(today)
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
    // Don't allow navigation to future dates
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    
    if (currentDate < tomorrow) {
      setCurrentDate(prev => {
        const newDate = new Date(prev)
        newDate.setDate(prev.getDate() + 1)
        return newDate
      })
    }
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  // Check if current date is today
  const isToday = () => {
    const today = new Date()
    return currentDate.toDateString() === today.toDateString()
  }

  // Check if current date is in the future
  const isFutureDate = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const currentDateStart = new Date(currentDate)
    currentDateStart.setHours(0, 0, 0, 0)
    return currentDateStart > today
  }

  // Check if we can navigate to next day
  const canGoToNextDay = () => {
    return !isToday() && !isFutureDate()
  }

  // Helper function to get natural activity descriptions
  const getActivityDescription = useCallback((activity: string): string => {
    const descriptions: { [key: string]: string } = {
      'Outdoor activity': 'Time spent in nature and fresh air',
      'Exercise session': 'Physical activity and movement',
      'Pool time': 'Relaxing by the water',
      'Relaxation time': 'Taking time to unwind and enjoy',
      'Coffee run': 'Morning coffee and energy boost',
      'Resort time': 'Enjoying the beautiful resort surroundings'
    }
    return descriptions[activity] || 'Activity from natural conversation'
  }, [])

  // Build narrative from natural conversation flow
  const buildNarrativeFromConversations = useCallback((insights: any[]) => {
    const narrative: any = {
      morning_checkin: {},
      daily_schedule: { activities: [] },
      session_data: {},
      notes_flags: { flags: [] },
      feedback_log: {},
      weekly_averages: {},
      data_sources: ['conversation'],
      is_complete: false,
      narrative_text: ''
    }

    // Extract activities and insights from conversations
    const activities: string[] = []
    const notes: string[] = []
    const sleepInsights: string[] = []
    const moodInsights: string[] = []
    const healthInsights: string[] = []
    
    insights.forEach(insight => {
      const message = insight.message.toLowerCase()
      
      // Extract activities based on data types and message content
      if (insight.data_types?.activity) {
        if (message.includes('golf') || message.includes('hike') || message.includes('walk') || message.includes('run')) {
          activities.push('Outdoor activity')
        }
        if (message.includes('workout') || message.includes('exercise') || message.includes('training')) {
          activities.push('Exercise session')
        }
        if (message.includes('pool') || message.includes('swim')) {
          activities.push('Pool time')
        }
        if (message.includes('relax') || message.includes('chill') || message.includes('enjoying')) {
          activities.push('Relaxation time')
        }
        if (message.includes('starbucks') || message.includes('coffee')) {
          activities.push('Coffee run')
        }
        if (message.includes('resort') || message.includes('sedona') || message.includes('views')) {
          activities.push('Resort time')
        }
        if (message.includes('dinner') || message.includes('restaurant') || message.includes('grill')) {
          activities.push('Dining out')
        }
        if (message.includes('uptown') || message.includes('shops') || message.includes('shopping')) {
          activities.push('Exploring town')
        }
      }
      
      // Extract sleep insights
      if (insight.data_types?.sleep) {
        if (message.includes('good night') || message.includes('good sleep') || message.includes('well rested')) {
          sleepInsights.push('Great sleep quality')
        }
        if (message.includes('woke up') || message.includes('around 6') || message.includes('early')) {
          sleepInsights.push('Early morning start')
        }
      }
      
      // Extract mood insights
      if (insight.data_types?.mood) {
        if (message.includes('enjoying') || message.includes('beautiful') || message.includes('good')) {
          moodInsights.push('Positive mood')
        }
      }
      
      // Extract health insights
      if (insight.data_types?.health) {
        healthInsights.push('Health update shared')
      }
      
      // Add any specific insights from AI analysis
      if (insight.insights && Array.isArray(insight.insights)) {
        insight.insights.forEach((insightText: string) => {
          // Clean up the insight text to remove "User" references
          const cleanInsight = insightText
            .replace(/^User\s+/i, '')
            .replace(/^I\s+had/i, 'Had')
            .replace(/^I\s+am/i, 'Am')
            .replace(/^I\s+was/i, 'Was')
          
          notes.push(cleanInsight)
        })
      }
    })

    // Build natural, human-sounding narrative text
    let narrativeText = ''
    
    if (activities.length > 0 && sleepInsights.length > 0) {
      // Combine sleep and activities naturally
      const sleepPhrase = sleepInsights.includes('Great sleep quality') ? 'felt well-rested' : 'got up early'
      const activityPhrase = activities.join(' and ')
      
      if (activities.includes('Coffee run') && activities.includes('Resort time')) {
        narrativeText = `Started the day feeling refreshed and made an early morning coffee run. Spent time enjoying the beautiful resort views and taking in the peaceful surroundings.`
      } else if (activities.includes('Coffee run')) {
        narrativeText = `Had a great start to the day with an early morning coffee run. ${activityPhrase} made for a productive morning.`
      } else {
        narrativeText = `Woke up ${sleepPhrase} and had a wonderful day that included ${activityPhrase}.`
      }
    } else if (activities.length > 0) {
      // Just activities
      const activityPhrase = activities.join(' and ')
      narrativeText = `Today was filled with ${activityPhrase}. It's been a great day of activity and enjoyment.`
    } else if (sleepInsights.length > 0) {
      // Just sleep insights
      if (sleepInsights.includes('Great sleep quality')) {
        narrativeText = `Had a really good night's sleep and woke up feeling refreshed and ready for the day.`
      } else {
        narrativeText = `Got an early start to the day and felt energized.`
      }
    } else if (notes.length > 0) {
      // Create rich narrative from actual insights
      const cleanNotes = notes.map(note => note.toLowerCase())
      
      // Check for specific patterns and create contextual narratives
      if (cleanNotes.some(note => note.includes('dinner') && note.includes('restaurant'))) {
        const restaurantNote = notes.find(note => note.toLowerCase().includes('restaurant'))
        narrativeText = `Planning a nice dinner out tonight. ${restaurantNote} Looking forward to a relaxing evening with good food and company.`
      } else if (cleanNotes.some(note => note.includes('walk') || note.includes('hike'))) {
        narrativeText = `Enjoyed some outdoor time today. ${notes.join('. ')}. Fresh air and movement are always energizing.`
      } else if (cleanNotes.some(note => note.includes('sedona') || note.includes('uptown'))) {
        narrativeText = `Exploring the beautiful Sedona area. ${notes.join('. ')}. The scenery and atmosphere here are truly special.`
      } else {
        // Use insights directly for rich, personalized narrative
        narrativeText = `${notes.join('. ')}. It's been a meaningful day with good experiences and connections.`
      }
    } else {
      // Fallback
      narrativeText = "Today was a day of natural conversation and connection. Sometimes the best moments come from simply sharing what's on your mind."
    }

    narrative.narrative_text = narrativeText

    // Set activities with natural descriptions
    narrative.daily_schedule.activities = activities.map(activity => ({
      type: 'activity',
      title: activity,
      description: getActivityDescription(activity),
      status: 'completed',
      source: 'conversation'
    }))

    // Set notes with cleaned content
    narrative.notes_flags.flags = notes

    return narrative
  }, [getActivityDescription])

  // Load narrative data for a specific date
  const loadNarrativeData = useCallback(async (date: Date) => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const dateString = date.toISOString().split('T')[0]
      
      console.log('🔍 Loading narrative data for date:', dateString)
      
      // Load conversation insights from the new simplified table
      const { data: conversationInsights, error: insightsError } = await supabase
        .from('conversation_insights')
        .select('*')
        .eq('user_id', userId)
        .eq('conversation_date', dateString)
        .order('created_at', { ascending: true })

      if (insightsError) {
        console.error('Error fetching conversation insights:', insightsError)
        throw insightsError
      }

      console.log('🔍 Found conversation insights:', conversationInsights?.length || 0)

      if (conversationInsights && conversationInsights.length > 0) {
        // Build narrative from natural conversation flow
        const narrativeData = buildNarrativeFromConversations(conversationInsights)
        setNarrativeData(narrativeData)
      } else {
        // No conversation insights found
        console.log('🔍 No conversation insights found for this date')
        setNarrativeData(null)
      }
    } catch (error) {
      console.error('Error loading narrative data:', error)
      // Set empty state on error
      setNarrativeData(null)
    } finally {
      setIsLoading(false)
    }
  }, [userId, buildNarrativeFromConversations])

  // Generate narrative using conversation insights (simplified approach)
  const generateNarrative = async (date: Date) => {
    setIsGenerating(true)
    try {
      // Simply reload the narrative data from conversation insights
      await loadNarrativeData(date)
    } catch (error) {
      console.error('Error generating narrative:', error)
      // Fall back to basic narrative on error
      setNarrativeData(generateBasicNarrative())
    } finally {
      setIsGenerating(false)
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

  // Load data when currentDate changes
  useEffect(() => {
    if (currentDate) {
      loadNarrativeData(currentDate)
    }
  }, [currentDate, loadNarrativeData])

  // Load data when modal opens
  useEffect(() => {
    if (isOpen) {
      loadNarrativeData(currentDate)
    }
  }, [isOpen, currentDate, loadNarrativeData])

  // Real-time updates: Listen for new conversation insights and update narrative
  useEffect(() => {
    if (!isOpen || !userId) return

    const supabase = createClient()
    
    // Subscribe to new conversation insights for the currently selected date
    const startOfDay = new Date(currentDate)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(currentDate)
    endOfDay.setHours(23, 59, 59, 999)

    console.log('Setting up real-time subscription for date:', currentDate.toISOString().split('T')[0])

    const channelName = `narrative-updates-${currentDate.toISOString().split('T')[0]}-${userId}`
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT', // Only listen to new insights (not updates/deletes)
          schema: 'public',
          table: 'conversation_insights',
          filter: `user_id=eq.${userId}`
        },
        async (payload) => {
          console.log('Real-time insight detected:', (payload.new as any)?.message?.substring(0, 50))
          
          // Check if this insight is for the currently selected date
          const insightDate = new Date((payload.new as any)?.conversation_date)
          
          if (insightDate >= startOfDay && insightDate <= endOfDay) {
            console.log('Insight matches selected date - triggering narrative update')
            // Debounce the update to prevent excessive calls
            setTimeout(async () => {
              await loadNarrativeData(currentDate)
            }, 2000) // 2 second delay to batch multiple insights
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Real-time subscription active for narrative updates on date:', currentDate.toISOString().split('T')[0])
        }
      })

    return () => {
      if (channel) {
        console.log('Cleaning up real-time subscription for date:', currentDate.toISOString().split('T')[0])
        supabase.removeChannel(channel)
      }
    }
  }, [isOpen, userId, currentDate]) // Removed loadNarrativeData dependency to prevent infinite loops

  // Refresh current narrative
  const handleRefresh = () => {
    generateNarrative(currentDate)
  }

  // Toggle pattern insights
  const togglePatterns = () => {
    setShowPatterns(!showPatterns)
    if (!showPatterns && patterns) {
      refreshPatterns()
    }
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
            disabled={!canGoToNextDay()}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Pattern Recognition Toggle */}
        <div className="flex justify-center mb-4">
          <Button
            onClick={togglePatterns}
            variant={showPatterns ? "default" : "outline"}
            size="sm"
            className="flex items-center gap-2"
          >
            {showPatterns ? (
              <>
                <Brain className="h-4 w-4" />
                Hide AI Insights
              </>
            ) : (
              <>
                <Lightbulb className="h-4 w-4" />
                Show AI Insights
              </>
            )}
          </Button>
        </div>

        {/* AI Pattern Insights */}
        {showPatterns && (
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-blue-700">
              <Brain className="h-5 w-5" />
              AI Discovered Patterns
            </h3>
            
            {patternsLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Analyzing your conversation patterns...</span>
              </div>
            ) : patternsError ? (
              <div className="text-red-600 text-center py-4">
                Error loading patterns: {patternsError}
              </div>
            ) : patterns ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Top Topics */}
                {getTopTopics(3).length > 0 && (
                  <div className="bg-white p-3 rounded-lg border">
                    <h4 className="font-medium text-blue-600 mb-2 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Topics You Love
                    </h4>
                    <div className="space-y-1">
                      {getTopTopics(3).map((topic, index) => (
                        <div key={index} className="text-sm">
                          <span className="font-medium">{topic.topic}</span>
                          <span className="text-gray-500 ml-2">({topic.frequency} mentions)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Top Activities */}
                {getTopActivities(3).length > 0 && (
                  <div className="bg-white p-3 rounded-lg border">
                    <h4 className="font-medium text-green-600 mb-2 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Your Favorite Activities
                    </h4>
                    <div className="space-y-1">
                      {getTopActivities(3).map((activity, index) => (
                        <div key={index} className="text-sm">
                          <span className="font-medium">{activity.activity}</span>
                          <span className="text-gray-500 ml-2">({activity.frequency} times)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mood Patterns */}
                {getTopMoods(3).length > 0 && (
                  <div className="bg-white p-3 rounded-lg border">
                    <h4 className="font-medium text-purple-600 mb-2 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Mood Patterns
                    </h4>
                    <div className="space-y-1">
                      {getTopMoods(3).map((mood, index) => (
                        <div key={index} className="text-sm">
                          <span className="font-medium">{mood.mood}</span>
                          <span className="text-gray-500 ml-2">({mood.frequency} times)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sleep Insights */}
                {getSleepInsights().length > 0 && (
                  <div className="bg-white p-3 rounded-lg border">
                    <h4 className="font-medium text-indigo-600 mb-2 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Sleep Patterns
                    </h4>
                    <div className="space-y-1">
                      {getSleepInsights().slice(0, 2).map((sleep, index) => (
                        <div key={index} className="text-sm">
                          <span className="font-medium">Quality: {sleep.sleepQuality}/10</span>
                          <span className="text-gray-500 ml-2">({sleep.sleepDuration}h)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-600">
                <Lightbulb className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p>Start more conversations to discover your patterns!</p>
                <p className="text-sm">AI will analyze your chat history to find insights.</p>
              </div>
            )}
          </div>
        )}

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

        {/* Narrative Content */}
        {!isLoading && !isGenerating && narrativeData && (
          <div className="space-y-6">
            {/* Daily Metrics Section */}
            <JournalMetrics 
              userId={userId}
              date={currentDate.toISOString().split('T')[0]}
            />

            {/* Natural Narrative Journal */}
            <div className="bg-card-2 p-4 rounded-lg border border-line">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                📖 {formatDate(currentDate)} - Your Day
              </h3>
              
              {/* Natural narrative content */}
              <div className="space-y-6">
                {/* Main Narrative */}
                {narrativeData.narrative_text ? (
                  <div className="prose prose-sm max-w-none">
                    <p className="text-muted-foreground leading-relaxed">
                      {narrativeData.narrative_text}
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="text-4xl mb-2">📝</div>
                    <p>Start a conversation to build your daily journal!</p>
                    <p className="text-xs mt-2">Tell me about your day, activities, thoughts, or anything on your mind.</p>
                  </div>
                )}

                {/* Key Activities - Clean Bullets */}
                {narrativeData.daily_schedule?.activities?.length > 0 && (
                  <div className="border-l-4 border-blue-400 pl-4">
                    <h4 className="font-medium text-blue-400 mb-3">🎯 Key Activities Today</h4>
                    <div className="space-y-2">
                      {narrativeData.daily_schedule.activities.map((activity: any, index: number) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <span className="text-green-500">•</span>
                          <span>{activity.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Health Metrics - Only if meaningful data exists */}
                {(narrativeData.session_data?.heart_rate?.avg || 
                  narrativeData.notes_flags?.energy_level || 
                  narrativeData.notes_flags?.mood) && (
                  <div className="border-l-4 border-green-400 pl-4">
                    <h4 className="font-medium text-green-400 mb-3">💚 Quick Health Check</h4>
                    <div className="space-y-2 text-sm">
                      {narrativeData.session_data?.heart_rate?.avg && (
                        <div className="flex items-center gap-2">
                          <span>❤️</span>
                          <span>Heart Rate: ~{narrativeData.session_data.heart_rate.avg} bpm</span>
                        </div>
                      )}
                      {narrativeData.notes_flags?.energy_level && (
                        <div className="flex items-center gap-2">
                          <span>🔋</span>
                          <span>Energy: {narrativeData.notes_flags.energy_level}/10</span>
                        </div>
                      )}
                      {narrativeData.notes_flags?.mood && (
                        <div className="flex items-center gap-2">
                          <span>😊</span>
                          <span>Mood: {narrativeData.notes_flags.mood}/10</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Additional Notes - Only if meaningful */}
                {narrativeData.notes_flags?.flags?.length > 0 && (
                  <div className="border-l-4 border-purple-400 pl-4">
                    <h4 className="font-medium text-purple-400 mb-3">💭 Additional Notes</h4>
                    <div className="space-y-2 text-sm">
                      {narrativeData.notes_flags.flags.map((flag: string, index: number) => (
                        <div key={index} className="flex items-center gap-2">
                          <span>💡</span>
                          <span>{flag}</span>
                        </div>
                      ))}
                    </div>
                  </div>
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
