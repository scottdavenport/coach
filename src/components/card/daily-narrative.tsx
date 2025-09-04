'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ChevronLeft, ChevronRight, Sun, Calendar, RefreshCw, Loader2, Brain, TrendingUp, Lightbulb } from 'lucide-react'
import { 
  getTodayInTimezone, 
  formatDateLong, 
  navigateDateInTimezone,
  isTodayInTimezone,
  isFutureDateInTimezone
} from '@/lib/timezone-utils'
import { JournalMetrics } from './journal-metrics'
import { usePatternRecognition } from '@/hooks/use-pattern-recognition'

interface DailyJournalProps {
  userId: string
  isOpen: boolean
  onClose: () => void
  selectedDate?: string
}

interface NarrativeData {
  activities: string[]
  narrative_text: string
  notes: string[]
  health_context?: string
  follow_up?: string
  journal_entries?: Array<{
    entry_type: string
    category: string
    content: string
    confidence: number
  }>
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
  const getTopTopics = (limit?: number) => []
  const getTopActivities = (limit?: number) => []
  const getTopMoods = (limit?: number) => []
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
    return formatDateLong(date)
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

  // Build narrative from conversation insights and journal entries
  const buildNarrativeFromConversationsAndJournal = useCallback((insights: any[], journalEntries: any[]) => {
    // Extract activities from insights with more specific detection
    const activities: string[] = []
    const notes: string[] = []
    
    insights.forEach(insight => {
      const message = insight.message.toLowerCase()
      
      // Extract specific activities from actual message content
      if (message.includes('open range grill')) {
        activities.push('Dinner at Open Range Grill')
      } else if (message.includes('dinner') && message.includes('restaurant')) {
        activities.push('Restaurant dinner')
      } else if (message.includes('dinner')) {
        activities.push('Dinner plans')
      }
      
      if (message.includes('uptown sedona')) {
        activities.push('Exploring uptown Sedona')
      } else if (message.includes('sedona')) {
        activities.push('Sedona exploration')
      }
      
      // More specific activity detection
      if (message.includes('golf')) activities.push('Golf')
      if (message.includes('hike')) activities.push('Hiking')
      if (message.includes('workout')) activities.push('Workout')
      if (message.includes('coffee')) activities.push('Coffee time')
      if (message.includes('pool')) activities.push('Pool time')
      
      // Add insights as notes with cleaning
      if (insight.insights && Array.isArray(insight.insights)) {
        insight.insights.forEach((insightText: string) => {
          const cleanInsight = insightText
            .replace(/^User\s+/i, '')
            .replace(/^I\s+/i, '')
          notes.push(cleanInsight)
        })
      }
    })

    // Get narrative from journal entries
    const reflectionEntry = journalEntries.find(entry => entry.entry_type === 'reflection')
    const activityEntry = journalEntries.find(entry => entry.entry_type === 'note' && entry.category === 'fitness')
    const healthEntry = journalEntries.find(entry => entry.category === 'health')
    const followUpEntry = journalEntries.find(entry => entry.entry_type === 'goal')

    // Use AI-generated narrative if available, otherwise build from insights
    let narrativeText = reflectionEntry?.content || ''
    
    if (!narrativeText && activities.length > 0) {
      // Build rich narrative from activities
      if (activities.some(a => a.includes('Open Range Grill'))) {
        narrativeText = `Planning an evening at Open Range Grill in Sedona tonight. Looking forward to exploring the local dining scene and enjoying a relaxing dinner in this beautiful area.`
      } else if (activities.some(a => a.includes('Sedona'))) {
        narrativeText = `Spending time exploring the beautiful Sedona area. ${activities.join(' and ')} made for a wonderful day of discovery and enjoyment.`
      } else {
        narrativeText = `Today included ${activities.join(' and ')}. It's been a great day filled with meaningful activities and experiences.`
      }
    } else if (!narrativeText && notes.length > 0) {
      narrativeText = `${notes.join('. ')}. It's been a meaningful day with good conversations and connections.`
    } else if (!narrativeText) {
      narrativeText = "Today was a day of natural conversation and connection. Sometimes the best moments come from simply sharing what's on your mind."
    }

    return {
      activities: Array.from(new Set(activities)),
      narrative_text: narrativeText,
      notes: Array.from(new Set(notes)),
      health_context: healthEntry?.content || '',
      follow_up: followUpEntry?.content?.replace('Tomorrow\'s reflection: ', '') || '',
      journal_entries: journalEntries
    }
  }, [])

  // Build narrative from existing journal entries only
  const buildNarrativeFromJournalEntries = useCallback((journalEntries: any[]) => {
    const reflectionEntry = journalEntries.find(entry => entry.entry_type === 'reflection')
    const activityEntry = journalEntries.find(entry => entry.entry_type === 'note' && entry.category === 'fitness')
    const healthEntry = journalEntries.find(entry => entry.category === 'health')
    const followUpEntry = journalEntries.find(entry => entry.entry_type === 'goal')
    const noteEntries = journalEntries.filter(entry => entry.entry_type === 'note' && entry.category === 'lifestyle')

    // Extract activities from activity entry
    const activities = activityEntry?.content?.replace('Activities: ', '').split(', ') || []
    
    // Combine all health and lifestyle insights for Key Insights section
    const allInsights = [
      ...noteEntries.map(entry => entry.content),
      ...(healthEntry?.content ? [healthEntry.content] : [])
    ]
    
    return {
      activities,
      narrative_text: reflectionEntry?.content || 'Journal entries available for this day.',
      notes: allInsights, // Use the rich health insights from AI
      health_context: healthEntry?.content || '',
      follow_up: followUpEntry?.content?.replace('Tomorrow\'s reflection: ', '') || '',
      journal_entries: journalEntries
    }
  }, [])

  // Load narrative data for a specific date
  const loadNarrativeData = useCallback(async (date: Date) => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const dateString = date.toISOString().split('T')[0]
      
      console.log('🔍 Loading narrative data for date:', dateString)
      
      // Load conversation insights
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

      // Load existing journal entries for the date
      const { data: journalEntries, error: journalError } = await supabase
        .from('daily_journal')
        .select('*')
        .eq('user_id', userId)
        .eq('journal_date', dateString)
        .order('created_at', { ascending: true })

      if (journalError) {
        console.error('Error fetching journal entries:', journalError)
      }

      console.log('🔍 Found conversation insights:', conversationInsights?.length || 0)
      console.log('🔍 Found journal entries:', journalEntries?.length || 0)

      if (journalEntries && journalEntries.length > 0) {
        // Prioritize rich journal entries created by AI enhancement
        const narrativeData = buildNarrativeFromJournalEntries(journalEntries)
        setNarrativeData(narrativeData)
      } else if (conversationInsights && conversationInsights.length > 0) {
        // Fallback to conversation insights if no enhanced journal entries exist
        const narrativeData = buildNarrativeFromConversationsAndJournal(conversationInsights, [])
        setNarrativeData(narrativeData)
      } else {
        // No data found
        console.log('🔍 No journal entries or conversation insights found for this date')
        setNarrativeData(null)
      }
    } catch (error) {
      console.error('Error loading narrative data:', error)
      setNarrativeData(null)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

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
      activities: ['General activity'],
      narrative_text: 'Had a good day with various activities and experiences.',
      notes: ['Day included meaningful moments'],
      health_context: '',
      follow_up: 'How are you feeling about tomorrow?'
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
                {narrativeData.activities?.length > 0 && (
                  <div className="border-l-4 border-blue-400 pl-4">
                    <h4 className="font-medium text-blue-400 mb-3">🎯 Key Activities Today</h4>
                    <div className="space-y-2">
                      {narrativeData.activities.map((activity: string, index: number) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <span className="text-green-500">•</span>
                          <span>{activity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Health Context - From AI analysis */}
                {narrativeData.health_context && (
                  <div className="border-l-4 border-green-400 pl-4">
                    <h4 className="font-medium text-green-400 mb-3">💚 Health Context</h4>
                    <div className="text-sm">
                      <p>{narrativeData.health_context}</p>
                    </div>
                  </div>
                )}

                {/* Additional Notes */}
                {narrativeData.notes?.length > 0 && (
                  <div className="border-l-4 border-purple-400 pl-4">
                    <h4 className="font-medium text-purple-400 mb-3">💭 Key Insights</h4>
                    <div className="space-y-2 text-sm">
                      {narrativeData.notes.map((note: string, index: number) => (
                        <div key={index} className="flex items-center gap-2">
                          <span>💡</span>
                          <span>{note}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tomorrow's Reflection */}
                {narrativeData.follow_up && (
                  <div className="border-l-4 border-yellow-400 pl-4">
                    <h4 className="font-medium text-yellow-400 mb-3">🌅 Tomorrow's Reflection</h4>
                    <div className="text-sm italic">
                      <p>{narrativeData.follow_up}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* No Data State */}
        {!isLoading && !isGenerating && !narrativeData && (
          <div className="text-center py-8 text-muted-foreground">
            <div className="text-4xl mb-2">📝</div>
            <p>No journal entry for this day yet.</p>
            <p className="text-xs mt-2">Start a conversation to create your daily journal!</p>
            <p className="text-xs mt-1">Share your activities, thoughts, or upload files to generate rich entries.</p>
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
