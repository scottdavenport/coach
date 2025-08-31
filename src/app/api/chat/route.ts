import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Enhanced types for rich context extraction
interface HealthData {
  event_type: 'checkin' | 'workout' | 'biometric' | 'meal' | 'note'
  data: Record<string, unknown>
  confidence: number
  should_store: boolean
}

interface ContextData {
  category: 'health' | 'activity' | 'preference' | 'goal' | 'challenge' | 'pattern' | 'mood' | 'energy' | 'sleep' | 'nutrition' | 'workout' | 'social' | 'work' | 'other'
  key: string
  value: string | number | boolean | null
  confidence: number
  should_store: boolean
  source: 'explicit' | 'inferred' | 'asked'
  needsClarification?: boolean
  clarificationQuestion?: string
  expectedFormat?: string
}

interface ParsedConversation {
  health_events: HealthData[]
  context_data: ContextData[]
  daily_summary?: {
    sleep_hours?: number
    sleep_quality?: number
    mood?: number
    energy?: number
    stress?: number
    readiness?: number
  }
  follow_up_questions?: string[]
  should_update_card: boolean
  clarification_needed?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { message, conversationId, conversationState, checkinProgress } = await request.json()

    // Ensure user exists in the users table
    const { error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single()

    if (userError && userError.code === 'PGRST116') {
      // User doesn't exist, create them
      const { error: createUserError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email
        })

      if (createUserError) {
        console.error('Error creating user:', createUserError)
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
      }
    } else     if (userError) {
      console.error('Error checking user:', userError)
      return NextResponse.json({ error: 'Failed to verify user' }, { status: 500 })
    }

    // Fetch conversation history (last 30 messages for context)
    const { data: conversationHistory } = await supabase
      .from('conversations')
      .select('message, message_type, metadata, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30)

    // Fetch last 7 days of daily cards for context
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const { data: weeklyCards } = await supabase
      .from('daily_log_cards')
      .select('summary, log_date')
      .eq('user_id', user.id)
      .gte('log_date', sevenDaysAgo)
      .order('log_date', { ascending: false })

    // Fetch recent user context data (last 7 days)
    const { data: recentContext } = await supabase
      .from('events')
      .select('data, created_at')
      .eq('user_id', user.id)
      .eq('event_type', 'note')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(20)

    // Build context for the AI
    const conversationContext = buildConversationContext(conversationHistory || [])
    const userContext = buildEnhancedUserContext(weeklyCards || [], recentContext || [])
    
    // Build conversation state context
    const stateContext = buildStateContext(conversationState, checkinProgress)

    // Save user message to database
    const { data: conversationData, error: conversationError } = await supabase
      .from('conversations')
      .insert({
        user_id: user.id,
        message: message,
        message_type: 'text',
        metadata: { conversation_id: conversationId }
      })
      .select()
      .single()

    if (conversationError) {
      console.error('Error saving conversation:', conversationError)
    }

    // Parse the conversation for rich context data
    const parsedData = await parseConversationForRichContext(message, user.id, conversationContext, userContext)

    // Show extracted data in console for development review
    if (parsedData.health_events.length > 0 || parsedData.context_data.length > 0) {
      console.log('🔍 **EXTRACTED RICH CONTEXT DATA (REVIEW REQUIRED):**')
      console.log('User ID:', user.id)
      console.log('Original message:', message)
      if (parsedData.health_events.length > 0) {
        console.log('Health events:', JSON.stringify(parsedData.health_events, null, 2))
      }
      if (parsedData.context_data.length > 0) {
        console.log('Context data:', JSON.stringify(parsedData.context_data, null, 2))
      }
      if (parsedData.daily_summary) {
        console.log('Daily summary:', JSON.stringify(parsedData.daily_summary, null, 2))
      }
      if (parsedData.follow_up_questions && parsedData.follow_up_questions.length > 0) {
        console.log('Follow-up questions:', parsedData.follow_up_questions)
      }
      console.log('Should update card:', parsedData.should_update_card)
      console.log('Clarification needed:', parsedData.clarification_needed)
      console.log('---')
    }

    // Create OpenAI chat completion with enhanced system prompt
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are Coach, an AI health and fitness companion. You're warm, encouraging, and genuinely interested in helping users achieve their health goals. You ask thoughtful questions, provide actionable insights, and build comprehensive training plans.

${userContext}

${stateContext}

CONVERSATION STYLE:
- Be conversational and engaging, like a supportive friend who's also a fitness expert
- Ask follow-up questions to build complete context
- Provide actionable insights based on the data you collect
- Suggest specific activities, mobility work, and nutrition strategies
- Reference previous conversations and build on established patterns
- Use the user's name when appropriate and maintain a personal connection

COACHING APPROACH:
- Start with broad questions and get more specific
- Acknowledge the user's current state and provide context for why it matters
- Suggest practical next steps based on their goals and current situation
- Integrate activities into broader training plans
- Provide encouragement and celebrate progress

MORNING CHECK-IN FLOW:
When users start a conversation, guide them through a structured check-in:
1. "Good morning! How are you feeling today? Let's do a quick check-in - what's your weight today?"
2. "Got it. How's your energy level on a scale of 1-10?"
3. "What's your mood like today?"
4. "Any congestion, soreness, or other physical notes?"
5. Provide a summary and actionable insights

EXAMPLE RESPONSES:
- "Perfect, thanks — here's your morning check-in summary for today: Weight: 254 lbs, Energy: 5/10. Given that you're feeling groggy and in vacation mode, your body is clearly in recovery reserves mode. That's actually fine heading into vacation — today should be about pacing, not pushing."
- "Want me to suggest a light pre-golf mobility and warm-up flow so you're loose on the course?"
- "Your training log has been updated with today's weight, sleep data, glucose notes, and BM update. The plan now centers around golf as your main activity, with a light recovery-focused morning."

Always be curious and supportive, building a rich understanding of the user's context while providing practical, actionable coaching.`
        },
        ...conversationContext,
        {
          role: "user",
          content: message
        }
      ],
      max_tokens: 800,
      temperature: 0.7,
    })

    const aiResponse = completion.choices[0]?.message?.content || "I'm sorry, I couldn't process that request."

    // Store parsed health data to daily card if we have data to store
    if (parsedData && (parsedData.health_events.length > 0 || parsedData.context_data.length > 0 || parsedData.daily_summary)) {
      try {
        console.log('🔍 **EXTRACTED RICH CONTEXT DATA (REVIEW REQUIRED):**')
        console.log('User ID:', user.id)
        console.log('Original message:', message)
        console.log('Health events:', parsedData.health_events)
        console.log('Context data:', parsedData.context_data)
        console.log('Daily summary:', parsedData.daily_summary)
        console.log('Follow-up questions:', parsedData.follow_up_questions)
        console.log('Should update card:', parsedData.should_update_card)
        console.log('Clarification needed:', parsedData.clarification_needed)
        console.log('---')

        // Call the health store API to update the daily card
        const healthStoreResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/health/store`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            events: parsedData.health_events.filter((e: any) => e.should_store),
            contextData: parsedData.context_data.filter((c: any) => c.should_store),
            dailySummary: parsedData.daily_summary,
            userId: user.id
          })
        })

        if (healthStoreResponse.ok) {
          console.log('💾 **STORING RICH CONTEXT DATA:**')
          console.log('User ID:', user.id)
          console.log('Events to store:', parsedData.health_events.filter((e: any) => e.should_store))
          console.log('Context data to store:', parsedData.context_data.filter((c: any) => c.should_store))
          console.log('Daily summary to store:', parsedData.daily_summary)
          console.log('---')
        } else {
          console.error('Failed to store health data:', await healthStoreResponse.text())
        }
      } catch (error) {
        console.error('Error storing health data:', error)
      }
    }

    // Save AI response to database
    const { error: aiConversationError } = await supabase
      .from('conversations')
      .insert({
        user_id: user.id,
        message: aiResponse,
        message_type: 'text',
        metadata: { 
          conversation_id: conversationId,
          role: 'assistant',
          parsed_health_data: parsedData // Store the parsed data for reference
        }
      })

    if (aiConversationError) {
      console.error('Error saving AI response:', aiConversationError)
    }

    return NextResponse.json({ 
      message: aiResponse,
      conversationId: conversationData?.id,
      parsedData: parsedData // Return parsed data for frontend display
    })

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

// Helper function to build conversation context
function buildConversationContext(conversationHistory: Array<{message: string, metadata?: {role?: string}}>): Array<{role: 'system' | 'user' | 'assistant', content: string}> {
  if (!conversationHistory || conversationHistory.length === 0) {
    return []
  }

  // Reverse to get chronological order and limit to last 20 messages (10 exchanges)
  const recentMessages = conversationHistory.slice(0, 20).reverse()
  
  return recentMessages.map(msg => ({
    role: msg.metadata?.role === 'assistant' ? 'assistant' : 'user',
    content: msg.message
  }))
}

// Helper function to build enhanced user context with weekly data
function buildEnhancedUserContext(weeklyCards: Array<{summary?: Record<string, unknown>, log_date: string}>, recentContext: Array<{data: Record<string, unknown>}>): string {
  let context = ""

  if (weeklyCards && weeklyCards.length > 0) {
    // Add today's context (most recent card)
    const todayCard = weeklyCards[0]
    if (todayCard?.summary) {
      const summary = todayCard.summary
      context += "TODAY'S CONTEXT:\n"
      
      if (summary.sleep_hours) context += `- Sleep: ${summary.sleep_hours} hours\n`
      if (summary.sleep_quality) context += `- Sleep Quality: ${summary.sleep_quality}/10\n`
      if (summary.mood) context += `- Mood: ${summary.mood}/10\n`
      if (summary.energy) context += `- Energy: ${summary.energy}/10\n`
      if (summary.stress) context += `- Stress: ${summary.stress}/10\n`
      if (summary.readiness) context += `- Readiness: ${summary.readiness}/10\n`

      // Add context data
      if (summary.context_data) {
        context += "\nRECENT CONTEXT:\n"
        Object.entries(summary.context_data).forEach(([category, data]: [string, Record<string, unknown>]) => {
          Object.entries(data).forEach(([key, value]: [string, unknown]) => {
            if (value && typeof value === 'object' && value !== null && 'value' in value) {
              const valueObj = value as { value: unknown }
              context += `- ${category}.${key}: ${JSON.stringify(valueObj.value)}\n`
            }
          })
        })
      }
    }

    // Note: Weekly trends are stored in database but not included in AI context
    // to keep responses focused and avoid overwhelming the user
  }

  // Add recent context from events
  if (recentContext && recentContext.length > 0) {
    context += "\nRECENT PATTERNS:\n"
    recentContext.slice(0, 5).forEach(event => {
      const data = event.data
      if (data.context_category && data.context_key && data.context_value) {
        context += `- ${data.context_category}.${data.context_key}: ${JSON.stringify(data.context_value)}\n`
      }
    })
  }

  return context || "No previous context available."
}

// Note: Weekly trend analysis is now handled by PostgreSQL functions
// for better performance and automatic updates

// Helper function to build conversation state context
function buildStateContext(conversationState: string, checkinProgress: Record<string, unknown>): string {
  let context = ""
  
  if (conversationState) {
    context += `CURRENT CONVERSATION STATE: ${conversationState}\n`
  }
  
  if (checkinProgress) {
    context += "CHECK-IN PROGRESS:\n"
    if (checkinProgress.weight) context += `- Weight: ${checkinProgress.weight}\n`
    if (checkinProgress.energy) context += `- Energy: ${checkinProgress.energy}/10\n`
    if (checkinProgress.mood) context += `- Mood: ${checkinProgress.mood}\n`
    if (checkinProgress.physical_notes) context += `- Physical Notes: ${checkinProgress.physical_notes}\n`
  }
  
  return context
}

async function parseConversationForRichContext(message: string, userId: string, conversationContext: Array<{role: string, content: string}>, userContext: string): Promise<ParsedConversation> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a smart health data parser. Extract comprehensive information from user messages and identify when clarification is needed. Return JSON only.

USER CONTEXT:
${userContext}

CONVERSATION HISTORY:
${conversationContext.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

CURRENT MESSAGE: ${message}

          RESPONSE FORMAT (JSON only):
          {
            "health_events": [
              {
                "event_type": "checkin" | "workout" | "biometric" | "meal" | "note" | "activity" | "social" | "work" | "travel" | "hobby" | "health" | "mood" | "energy" | "sleep" | "nutrition",
                "data": { /* flexible schema per event type */ },
                "confidence": 0.0-1.0,
                "should_store": true/false
              }
            ],
            "context_data": [
              {
                "category": "health" | "activity" | "preference" | "goal" | "challenge" | "pattern" | "mood" | "energy" | "sleep" | "nutrition" | "workout" | "social" | "work" | "other",
                "key": "string identifier",
                "value": "any value",
                "confidence": 0.0-1.0,
                "should_store": true/false,
                "source": "explicit" | "inferred" | "asked",
                "needsClarification": true/false,
                "clarificationQuestion": "specific question to ask",
                "expectedFormat": "expected format (e.g., '1-10 scale', 'hours', 'yes/no')"
              }
            ],
            "daily_summary": {
              "sleep_hours": number,
              "sleep_quality": 1-10,
              "mood": 1-10,
              "energy": 1-10,
              "stress": 1-10,
              "readiness": 1-10
            },
            "follow_up_questions": [
              "string questions to ask user"
            ],
            "should_update_card": true/false,
            "clarification_needed": true/false
          }

          EVENT TYPE RULES (FLEXIBLE):
          - "checkin": Morning/evening check-ins, general health status
          - "workout": Gym, running, structured exercise
          - "activity": Any physical activity (golf, tennis, walking, etc.)
          - "social": Social events, gatherings, relationships
          - "work": Job-related activities, stress, schedule
          - "travel": Trips, vacations, location changes
          - "hobby": Recreational activities, interests
          - "health": Medical info, symptoms, recovery
          - "mood": Emotional state, feelings
          - "energy": Energy levels, fatigue
          - "sleep": Sleep patterns, quality, issues
          - "nutrition": Food, hydration, supplements
          - "biometric": Measurements, vitals, weight
          - "meal": Food intake, nutrition
          - "note": General notes, observations, anything else

          CLARIFICATION RULES:
          - If user says "I slept pretty well" → needsClarification: true, clarificationQuestion: "On a scale of 1-10, how would you rate your sleep quality?", expectedFormat: "1-10 scale"
          - If user says "I'm tired" → needsClarification: true, clarificationQuestion: "On a scale of 1-10, how would you rate your energy level?", expectedFormat: "1-10 scale"
          - If user says "I'm stressed" → needsClarification: true, clarificationQuestion: "On a scale of 1-10, how would you rate your stress level?", expectedFormat: "1-10 scale"
          - If user says "I slept for a while" → needsClarification: true, clarificationQuestion: "How many hours did you sleep?", expectedFormat: "hours"
          - If user says "I feel okay" → needsClarification: true, clarificationQuestion: "On a scale of 1-10, how would you rate your mood?", expectedFormat: "1-10 scale"

          NUTRITION STORAGE RULES:
          - When user mentions beverages, food, or nutrition → store as BOTH event AND context_data
          - Beverages (coffee, cold brew, water, etc.) → store as nutrition event + nutrition context_data
          - Food items → store as meal event + nutrition context_data
          - This ensures nutrition appears in both the events log AND the daily card display

          CONTEXT CATEGORIES:
          - health: medical info, symptoms, recovery
          - activity: what they did today, hobbies, events
          - preference: likes/dislikes, comfort zones, style
          - goal: short/long term objectives, progress
          - challenge: obstacles, pain points, struggles
          - pattern: recurring behaviors, habits, triggers
          - mood: emotional state, feelings
          - energy: energy levels, fatigue
          - sleep: sleep patterns, quality, issues
          - nutrition: food, hydration, supplements
          - workout: exercise details, performance
          - social: relationships, social activities
          - work: job, stress, schedule
          - other: anything else relevant

          RULES:
          - Extract both explicit statements and inferred context
          - Set confidence based on clarity and certainty
          - Set should_store=true for high-confidence, actionable data
          - Include follow-up questions to learn more
          - Set should_update_card=true if significant new context found
          - Set clarification_needed=true if any data needs clarification
          - Be comprehensive but conservative - better to ask than assume
          - Focus on building rich user profiles for future training plans
          - Use the most specific event type that fits the activity
          - Be adaptive - if a new category emerges, use the closest existing type`
        },
        {
          role: "user",
          content: message
        }
      ],
      max_tokens: 1500,
      temperature: 0.1,
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      return { 
        health_events: [], 
        context_data: [], 
        should_update_card: false,
        clarification_needed: false
      }
    }

    // Try to parse the JSON response
    try {
      const parsed = JSON.parse(response)
      return parsed as ParsedConversation
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError)
      return { 
        health_events: [], 
        context_data: [], 
        should_update_card: false,
        clarification_needed: false
      }
    }

  } catch (error) {
    console.error('Error parsing conversation:', error)
    return { 
      health_events: [], 
      context_data: [], 
      should_update_card: false,
      clarification_needed: false
    }
  }
}
