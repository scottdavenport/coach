import { useState, useEffect, useCallback } from 'react'
import { UserPatterns, ConversationPattern, TopicPreference, ActivityPattern, MoodPattern, SleepPattern } from '@/lib/pattern-recognition'

interface UsePatternRecognitionReturn {
  patterns: UserPatterns | null
  isLoading: boolean
  error: string | null
  analyzePatterns: (daysBack?: number) => Promise<void>
  refreshPatterns: () => Promise<void>
  getTopPatterns: (limit?: number) => ConversationPattern[]
  getTopTopics: (limit?: number) => TopicPreference[]
  getTopActivities: (limit?: number) => ActivityPattern[]
  getTopMoods: (limit?: number) => MoodPattern[]
  getSleepInsights: () => SleepPattern[]
}

export function usePatternRecognition(userId: string): UsePatternRecognitionReturn {
  const [patterns, setPatterns] = useState<UserPatterns | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Analyze user patterns
   */
  const analyzePatterns = useCallback(async (daysBack: number = 30) => {
    if (!userId) return

    setIsLoading(true)
    setError(null)

    try {
      console.log(`🔍 Analyzing patterns for user ${userId} over last ${daysBack} days`)
      
      const response = await fetch(`/api/patterns?days=${daysBack}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to analyze patterns: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success) {
        setPatterns(data.patterns)
        console.log(`✅ Pattern analysis complete:`, data.patterns)
      } else {
        throw new Error(data.error || 'Pattern analysis failed')
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      console.error('Error analyzing patterns:', errorMessage)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  /**
   * Refresh patterns (re-analyze)
   */
  const refreshPatterns = useCallback(async () => {
    await analyzePatterns()
  }, [analyzePatterns])

  /**
   * Get top conversation patterns
   */
  const getTopPatterns = useCallback((limit: number = 5): ConversationPattern[] => {
    if (!patterns?.conversationPatterns) return []
    return patterns.conversationPatterns.slice(0, limit)
  }, [patterns])

  /**
   * Get top topic preferences
   */
  const getTopTopics = useCallback((limit: number = 5): TopicPreference[] => {
    if (!patterns?.topicPreferences) return []
    return patterns.topicPreferences.slice(0, limit)
  }, [patterns])

  /**
   * Get top activity patterns
   */
  const getTopActivities = useCallback((limit: number = 5): ActivityPattern[] => {
    if (!patterns?.activityPatterns) return []
    return patterns.activityPatterns.slice(0, limit)
  }, [patterns])

  /**
   * Get top mood patterns
   */
  const getTopMoods = useCallback((limit: number = 5): MoodPattern[] => {
    if (!patterns?.moodPatterns) return []
    return patterns.moodPatterns.slice(0, limit)
  }, [patterns])

  /**
   * Get sleep insights
   */
  const getSleepInsights = useCallback((): SleepPattern[] => {
    if (!patterns?.sleepPatterns) return []
    return patterns.sleepPatterns
  }, [patterns])

  /**
   * Initial pattern analysis when hook is initialized
   * DISABLED to prevent background processing that causes typing lag
   * Pattern analysis will only run when explicitly requested
   */
  // useEffect(() => {
  //   if (userId) {
  //     analyzePatterns()
  //   }
  // }, [userId, analyzePatterns])

  return {
    patterns,
    isLoading,
    error,
    analyzePatterns,
    refreshPatterns,
    getTopPatterns,
    getTopTopics,
    getTopActivities,
    getTopMoods,
    getSleepInsights,
  }
}
