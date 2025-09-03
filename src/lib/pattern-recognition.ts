import { createServiceClient } from '@/lib/supabase/server'

export interface UserPatterns {
  userId: string
  conversationPatterns: ConversationPattern[]
  topicPreferences: TopicPreference[]
  languagePatterns: LanguagePattern[]
  activityPatterns: ActivityPattern[]
  moodPatterns: MoodPattern[]
  sleepPatterns: SleepPattern[]
  lastUpdated: Date
}

export interface ConversationPattern {
  pattern: string
  frequency: number
  firstSeen: Date
  lastSeen: Date
  examples: string[]
  confidence: number
}

export interface TopicPreference {
  topic: string
  interestLevel: number // 0-10
  frequency: number
  lastDiscussed: Date
  relatedTopics: string[]
}

export interface LanguagePattern {
  pattern: string
  type: 'phrase' | 'word' | 'structure'
  frequency: number
  context: string[]
}

export interface ActivityPattern {
  activity: string
  frequency: number
  preferredTimes: string[]
  context: string[]
  lastMentioned: Date
}

export interface MoodPattern {
  mood: string
  frequency: number
  triggers: string[]
  timeOfDay: string[]
  lastMentioned: Date
}

export interface SleepPattern {
  sleepQuality: number
  sleepDuration: number
  sleepTime: string
  wakeTime: string
  factors: string[]
  lastMentioned: Date
}

export class PatternRecognitionService {
  /**
   * Analyze conversation insights to discover user patterns
   */
  async analyzeUserPatterns(userId: string, daysBack: number = 30): Promise<UserPatterns> {
    try {
      console.log(`🔍 Analyzing patterns for user ${userId} over last ${daysBack} days`)
      
      // Get conversation insights from the specified time period
      const insights = await this.getConversationInsights(userId, daysBack)
      
      if (!insights || insights.length === 0) {
        console.log('No conversation insights found for pattern analysis')
        return this.createEmptyPatterns(userId)
      }

      console.log(`📊 Found ${insights.length} conversation insights to analyze`)

      // Analyze different types of patterns
      const conversationPatterns = await this.analyzeConversationPatterns(insights)
      const topicPreferences = await this.analyzeTopicPreferences(insights)
      const languagePatterns = await this.analyzeLanguagePatterns(insights)
      const activityPatterns = await this.analyzeActivityPatterns(insights)
      const moodPatterns = await this.analyzeMoodPatterns(insights)
      const sleepPatterns = await this.analyzeSleepPatterns(insights)

      const userPatterns: UserPatterns = {
        userId,
        conversationPatterns,
        topicPreferences,
        languagePatterns,
        activityPatterns,
        moodPatterns,
        sleepPatterns,
        lastUpdated: new Date()
      }

      console.log(`✅ Pattern analysis complete for user ${userId}`)
      return userPatterns

    } catch (error) {
      console.error('Error analyzing user patterns:', error)
      return this.createEmptyPatterns(userId)
    }
  }

  /**
   * Get conversation insights for pattern analysis
   */
  private async getConversationInsights(userId: string, daysBack: number) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysBack)
    
    const supabase = await createServiceClient()
    
    const { data: insights, error } = await supabase
      .from('conversation_insights')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching conversation insights:', error)
      return []
    }

    return insights || []
  }

  /**
   * Analyze conversation patterns and recurring themes
   */
  private async analyzeConversationPatterns(insights: any[]): Promise<ConversationPattern[]> {
    const patterns: Map<string, ConversationPattern> = new Map()
    
    insights.forEach(insight => {
      const message = insight.message.toLowerCase()
      
      // Look for recurring phrases and themes
      const phrases = this.extractPhrases(message)
      
      phrases.forEach(phrase => {
        if (phrase.length < 3) return // Skip very short phrases
        
        const existing = patterns.get(phrase)
        if (existing) {
          existing.frequency++
          existing.lastSeen = new Date(insight.created_at)
          existing.examples.push(insight.message.substring(0, 100))
        } else {
          patterns.set(phrase, {
            pattern: phrase,
            frequency: 1,
            firstSeen: new Date(insight.created_at),
            lastSeen: new Date(insight.created_at),
            examples: [insight.message.substring(0, 100)],
            confidence: 0.5
          })
        }
      })
    })

    // Calculate confidence based on frequency and recency
    const patternsArray = Array.from(patterns.values())
      .filter(p => p.frequency > 1) // Only include recurring patterns
      .map(p => ({
        ...p,
        confidence: Math.min(0.9, 0.5 + (p.frequency * 0.1))
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 20) // Top 20 patterns

    return patternsArray
  }

  /**
   * Analyze topic preferences based on conversation content
   */
  private async analyzeTopicPreferences(insights: any[]): Promise<TopicPreference[]> {
    const topics: Map<string, TopicPreference> = new Map()
    
    // Define topic keywords
    const topicKeywords = {
      'health': ['health', 'wellness', 'fitness', 'workout', 'exercise', 'nutrition', 'diet'],
      'sleep': ['sleep', 'rest', 'bed', 'tired', 'energy', 'recovery'],
      'mood': ['mood', 'feeling', 'happy', 'sad', 'stressed', 'anxious', 'excited'],
      'work': ['work', 'job', 'career', 'meeting', 'project', 'deadline'],
      'relationships': ['family', 'friend', 'partner', 'relationship', 'social'],
      'travel': ['travel', 'trip', 'vacation', 'hotel', 'resort', 'destination'],
      'hobbies': ['hobby', 'interest', 'passion', 'creative', 'art', 'music', 'reading'],
      'weather': ['weather', 'temperature', 'sunny', 'rainy', 'cold', 'hot']
    }

    insights.forEach(insight => {
      const message = insight.message.toLowerCase()
      const date = new Date(insight.created_at)
      
      Object.entries(topicKeywords).forEach(([topic, keywords]) => {
        const matches = keywords.filter(keyword => message.includes(keyword))
        
        if (matches.length > 0) {
          const existing = topics.get(topic)
          if (existing) {
            existing.frequency++
            existing.lastDiscussed = date
            existing.interestLevel = Math.min(10, existing.interestLevel + 0.5)
          } else {
            topics.set(topic, {
              topic,
              interestLevel: 5,
              frequency: 1,
              lastDiscussed: date,
              relatedTopics: []
            })
          }
        }
      })
    })

    return Array.from(topics.values())
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 15)
  }

  /**
   * Analyze language patterns and communication style
   */
  private async analyzeLanguagePatterns(insights: any[]): Promise<LanguagePattern[]> {
    const patterns: Map<string, LanguagePattern> = new Map()
    
    insights.forEach(insight => {
      const message = insight.message
      
      // Analyze sentence structure
      const sentences = message.split(/[.!?]+/).filter(s => s.trim().length > 0)
      
      sentences.forEach(sentence => {
        const words = sentence.trim().split(/\s+/)
        
        // Look for sentence length patterns
        if (words.length > 15) {
          this.addLanguagePattern(patterns, 'long_sentences', 'structure', 'Long, detailed sentences')
        } else if (words.length < 5) {
          this.addLanguagePattern(patterns, 'short_sentences', 'structure', 'Short, concise sentences')
        }
        
        // Look for question patterns
        if (sentence.includes('?')) {
          this.addLanguagePattern(patterns, 'questions', 'structure', 'Asking questions')
        }
        
        // Look for exclamation patterns
        if (sentence.includes('!')) {
          this.addLanguagePattern(patterns, 'exclamations', 'structure', 'Expressive language')
        }
      })
    })

    return Array.from(patterns.values())
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10)
  }

  /**
   * Analyze activity patterns and preferences
   */
  private async analyzeActivityPatterns(insights: any[]): Promise<ActivityPattern[]> {
    const activities: Map<string, ActivityPattern> = new Map()
    
    const activityKeywords = {
      'exercise': ['workout', 'exercise', 'gym', 'run', 'jog', 'walk', 'hike', 'swim'],
      'social': ['meet', 'party', 'dinner', 'lunch', 'coffee', 'drink'],
      'creative': ['write', 'paint', 'draw', 'create', 'design', 'build'],
      'relaxation': ['relax', 'chill', 'rest', 'meditate', 'yoga', 'massage'],
      'outdoor': ['outdoor', 'nature', 'park', 'beach', 'mountain', 'trail'],
      'indoor': ['indoor', 'home', 'room', 'office', 'kitchen']
    }

    insights.forEach(insight => {
      const message = insight.message.toLowerCase()
      const date = new Date(insight.created_at)
      const timeOfDay = this.getTimeOfDay(date)
      
      Object.entries(activityKeywords).forEach(([activity, keywords]) => {
        const matches = keywords.filter(keyword => message.includes(keyword))
        
        if (matches.length > 0) {
          const existing = activities.get(activity)
          if (existing) {
            existing.frequency++
            existing.lastMentioned = date
            if (!existing.preferredTimes.includes(timeOfDay)) {
              existing.preferredTimes.push(timeOfDay)
            }
          } else {
            activities.set(activity, {
              activity,
              frequency: 1,
              preferredTimes: [timeOfDay],
              context: [insight.message.substring(0, 100)],
              lastMentioned: date
            })
          }
        }
      })
    })

    return Array.from(activities.values())
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10)
  }

  /**
   * Analyze mood patterns and emotional trends
   */
  private async analyzeMoodPatterns(insights: any[]): Promise<MoodPattern[]> {
    const moods: Map<string, MoodPattern> = new Map()
    
    const moodKeywords = {
      'positive': ['happy', 'excited', 'great', 'wonderful', 'amazing', 'love', 'enjoy'],
      'negative': ['sad', 'angry', 'frustrated', 'tired', 'stressed', 'worried', 'anxious'],
      'neutral': ['okay', 'fine', 'alright', 'normal', 'usual', 'typical'],
      'energetic': ['energetic', 'motivated', 'inspired', 'pumped', 'ready', 'focused'],
      'calm': ['calm', 'peaceful', 'relaxed', 'chill', 'serene', 'tranquil']
    }

    insights.forEach(insight => {
      const message = insight.message.toLowerCase()
      const date = new Date(insight.created_at)
      const timeOfDay = this.getTimeOfDay(date)
      
      Object.entries(moodKeywords).forEach(([mood, keywords]) => {
        const matches = keywords.filter(keyword => message.includes(keyword))
        
        if (matches.length > 0) {
          const existing = moods.get(mood)
          if (existing) {
            existing.frequency++
            existing.lastMentioned = date
            if (!existing.timeOfDay.includes(timeOfDay)) {
              existing.timeOfDay.push(timeOfDay)
            }
            // Add context triggers
            const context = this.extractContext(message, keywords)
            if (context && !existing.triggers.includes(context)) {
              existing.triggers.push(context)
            }
          } else {
            moods.set(mood, {
              mood,
              frequency: 1,
              triggers: [this.extractContext(message, keywords) || 'general'],
              timeOfDay: [timeOfDay],
              lastMentioned: date
            })
          }
        }
      })
    })

    return Array.from(moods.values())
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 8)
  }

  /**
   * Analyze sleep patterns and quality
   */
  private async analyzeSleepPatterns(insights: any[]): Promise<SleepPattern[]> {
    const sleepPatterns: SleepPattern[] = []
    
    insights.forEach(insight => {
      const message = insight.message.toLowerCase()
      
      // Look for sleep-related content
      if (message.includes('sleep') || message.includes('rest') || message.includes('bed')) {
        const sleepPattern: SleepPattern = {
          sleepQuality: this.extractSleepQuality(message),
          sleepDuration: this.extractSleepDuration(message),
          sleepTime: this.extractSleepTime(message),
          wakeTime: this.extractWakeTime(message),
          factors: this.extractSleepFactors(message),
          lastMentioned: new Date(insight.created_at)
        }
        
        sleepPatterns.push(sleepPattern)
      }
    })

    return sleepPatterns.slice(0, 5)
  }

  /**
   * Helper methods for pattern extraction
   */
  private extractPhrases(message: string): string[] {
    const words = message.split(/\s+/)
    const phrases: string[] = []
    
    // Extract 3-5 word phrases
    for (let i = 0; i <= words.length - 3; i++) {
      for (let len = 3; len <= Math.min(5, words.length - i); len++) {
        const phrase = words.slice(i, i + len).join(' ')
        if (phrase.length > 10) { // Only meaningful phrases
          phrases.push(phrase)
        }
      }
    }
    
    return phrases
  }

  private addLanguagePattern(patterns: Map<string, LanguagePattern>, key: string, type: 'phrase' | 'word' | 'structure', context: string) {
    const existing = patterns.get(key)
    if (existing) {
      existing.frequency++
    } else {
      patterns.set(key, {
        pattern: key,
        type,
        frequency: 1,
        context: [context]
      })
    }
  }

  private getTimeOfDay(date: Date): string {
    const hour = date.getHours()
    if (hour < 12) return 'morning'
    if (hour < 17) return 'afternoon'
    if (hour < 21) return 'evening'
    return 'night'
  }

  private extractContext(message: string, keywords: string[]): string | null {
    // Find the sentence containing the mood keyword
    const sentences = message.split(/[.!?]+/)
    for (const sentence of sentences) {
      if (keywords.some(keyword => sentence.toLowerCase().includes(keyword))) {
        return sentence.trim()
      }
    }
    return null
  }

  private extractSleepQuality(message: string): number {
    if (message.includes('great') || message.includes('amazing') || message.includes('wonderful')) return 9
    if (message.includes('good') || message.includes('nice') || message.includes('decent')) return 7
    if (message.includes('okay') || message.includes('fine') || message.includes('alright')) return 5
    if (message.includes('bad') || message.includes('poor') || message.includes('terrible')) return 3
    return 5 // Default neutral
  }

  private extractSleepDuration(message: string): number {
    const durationMatch = message.match(/(\d+)\s*(?:hours?|hrs?|h)/i)
    if (durationMatch) {
      return parseInt(durationMatch[1])
    }
    return 7 // Default 7 hours
  }

  private extractSleepTime(message: string): string {
    const timeMatch = message.match(/(\d{1,2}):?(\d{2})?\s*(?:pm|am)/i)
    if (timeMatch) {
      return `${timeMatch[1]}:${timeMatch[2] || '00'} ${timeMatch[3]?.toUpperCase() || 'PM'}`
    }
    return 'Unknown'
  }

  private extractWakeTime(message: string): string {
    const timeMatch = message.match(/(?:woke|wake|up)\s*(?:at|around)?\s*(\d{1,2}):?(\d{2})?\s*(?:pm|am)/i)
    if (timeMatch) {
      return `${timeMatch[1]}:${timeMatch[2] || '00'} ${timeMatch[3]?.toUpperCase() || 'AM'}`
    }
    return 'Unknown'
  }

  private extractSleepFactors(message: string): string[] {
    const factors: string[] = []
    
    if (message.includes('stress') || message.includes('anxious')) factors.push('stress')
    if (message.includes('caffeine') || message.includes('coffee')) factors.push('caffeine')
    if (message.includes('exercise') || message.includes('workout')) factors.push('exercise')
    if (message.includes('noise') || message.includes('loud')) factors.push('noise')
    if (message.includes('temperature') || message.includes('hot') || message.includes('cold')) factors.push('temperature')
    if (message.includes('screen') || message.includes('phone') || message.includes('tv')) factors.push('screen_time')
    
    return factors
  }

  /**
   * Create empty patterns for new users
   */
  private createEmptyPatterns(userId: string): UserPatterns {
    return {
      userId,
      conversationPatterns: [],
      topicPreferences: [],
      languagePatterns: [],
      activityPatterns: [],
      moodPatterns: [],
      sleepPatterns: [],
      lastUpdated: new Date()
    }
  }
}
