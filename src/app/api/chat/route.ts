import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// REMOVED: Old complex interface types - now using simplified ParsedConversation

interface ParsedConversation {
  // Simplified structure - just basic flags for what we found
  has_health_data: boolean
  has_activity_data: boolean
  has_mood_data: boolean
  has_nutrition_data: boolean
  has_sleep_data: boolean
  has_workout_data: boolean
  // Simple insights without rigid categorization
  insights: string[]
  // Natural follow-up questions
  follow_up_questions: string[]
}

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Chat API called')
    
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      console.error('❌ No user found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('👤 User authenticated:', user.id)

    const body = await request.json()
    const { message, conversationId, conversationState, checkinProgress, ocrData, multiFileData } = body

    console.log('📝 Message received:', {
      messageLength: message?.length || 0,
      hasOcrData: !!ocrData,
      hasMultiFileData: !!multiFileData,
      conversationState,
      checkinProgress: !!checkinProgress
    })

    // Ensure user exists in the users table
    const { error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single()

    if (userError && userError.code === 'PGRST116') {
      // User doesn't exist, create them
      console.log('👤 Creating new user in database')
      const { error: createUserError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email
        })

      if (createUserError) {
        console.error('❌ Error creating user:', createUserError)
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
      }
    } else if (userError) {
      console.error('❌ Error checking user:', userError)
      return NextResponse.json({ error: 'Failed to verify user' }, { status: 500 })
    }

    console.log('✅ User verified in database')

    // Fetch conversation history (last 30 messages for context)
    const { data: conversationHistory } = await supabase
      .from('conversations')
      .select('message, message_type, metadata, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30)

    // Fetch last 7 days of structured metrics for context
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const { data: weeklyMetrics } = await supabase
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
      .eq('user_id', user.id)
      .gte('metric_date', sevenDaysAgo)
      .order('metric_date', { ascending: false })

    // Transform metrics to match expected format
    const weeklyCards = weeklyMetrics ? weeklyMetrics.map(metric => ({
      summary: {
        [metric.standard_metrics?.[0]?.metric_key || 'unknown']: metric.metric_value || metric.text_value || metric.boolean_value
      },
      log_date: metric.metric_date
    })) : []

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
    
    // Log OCR data if present
    if (ocrData) {
      console.log('🔍 OCR DATA RECEIVED:', JSON.stringify(ocrData, null, 2))
    }

    // Log multi-file data if present
    if (multiFileData) {
      console.log('🔍 MULTI-FILE DATA RECEIVED:', JSON.stringify(multiFileData, null, 2))
    }

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
    console.log('🔍 Starting conversation parsing...')
    const parsedData = await parseConversationForRichContext(message)
    console.log('✅ Conversation parsing complete:', {
      hasHealthData: parsedData.has_health_data,
      hasActivityData: parsedData.has_activity_data,
      insightsCount: parsedData.insights.length
    })

    // Show extracted data in console for development review
    if (parsedData && (parsedData.has_health_data || parsedData.has_activity_data || parsedData.has_mood_data || parsedData.has_nutrition_data || parsedData.has_sleep_data || parsedData.has_workout_data)) {
      console.log('🔍 **CONVERSATION INSIGHTS DETECTED:**')
      console.log('User ID:', user.id)
      console.log('Original message:', message)
      console.log('Insights:', parsedData.insights)
      console.log('Follow-up questions:', parsedData.follow_up_questions)
      console.log('Data types:', {
        health: parsedData.has_health_data,
        activity: parsedData.has_activity_data,
        mood: parsedData.has_mood_data,
        nutrition: parsedData.has_nutrition_data,
        sleep: parsedData.has_sleep_data,
        workout: parsedData.has_workout_data
      })
      console.log('---')
    }

    // Create OpenAI chat completion with enhanced system prompt
    console.log('🤖 Starting OpenAI completion...')
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are Coach, an AI health and fitness companion with specialized expertise in personal training, weight loss, longevity, and holistic wellness. You're warm, encouraging, and genuinely interested in helping users achieve their health goals. You ask thoughtful questions, provide actionable insights, and build comprehensive training plans.

${userContext}

${stateContext}

${ocrData ? `OCR DATA AVAILABLE: The user has uploaded a screenshot with workout/health data. Here is the extracted data: ${JSON.stringify(ocrData)}. IMPORTANT: This OCR data contains the user's actual workout information. You MUST acknowledge and analyze this data in your response. Do NOT say you don't see the data - it's right here in the OCR data. Process this data naturally and conversationally without mentioning the technical OCR process. Focus on the health insights and provide natural coaching responses based on the actual workout metrics.` : ''}

${multiFileData ? `MULTI-FILE DATA AVAILABLE: The user has uploaded multiple files. Here is the processed content:

IMAGES WITH OCR DATA:
${multiFileData.images?.map((img: any) => `
- ${img.fileName}: ${img.error ? `Error: ${img.error}` : `OCR Data: ${JSON.stringify(img.ocrData)}`}
`).join('') || 'No images uploaded'}

DOCUMENTS:
${multiFileData.documents?.map((doc: any) => `
- ${doc.fileName}: ${doc.error ? `Error: ${doc.error}` : `Content: ${doc.content?.substring(0, 500)}${doc.content?.length > 500 ? '...' : ''}`}
`).join('') || 'No documents uploaded'}

IMPORTANT: Process all this data naturally and provide comprehensive coaching insights based on ALL the uploaded content. Reference specific files when relevant and provide actionable advice based on the combined information.` : ''}

SPECIALIZED EXPERTISE:
- PERSONAL TRAINING: Design progressive, safe, and effective workout programs
- WEIGHT LOSS: Provide evidence-based nutrition and exercise strategies
- LONGEVITY: Focus on sustainable health practices for long-term wellness
- HOLISTIC WELLNESS: Address physical, mental, and emotional health integration

CONVERSATION STYLE:
- Be conversational and engaging, like a supportive friend who's also a fitness expert
- Ask follow-up questions to build complete context
- Provide actionable insights based on the data you collect
- Suggest specific activities, mobility work, and nutrition strategies
- Reference previous conversations and build on established patterns
- Use the user's name when appropriate and maintain a personal connection
- Adapt your coaching style based on the user's energy, mood, and current situation

ENGAGING QUESTION APPROACH:
- ALWAYS end your responses with an engaging question or suggestion to deepen the conversation
- Ask ONE thoughtful question that goes to the next level of depth
- Questions should be natural and conversational, not interrogative
- Examples: "What was the highlight of your hike today?", "How are you feeling about tomorrow's plans?", "What's on your mind for the rest of the day?"
- Don't require answers - this is just to keep the conversation flowing naturally
- Questions should relate to what you just discussed or suggest next steps

COACHING APPROACH:
- Start with broad questions and get more specific
- Acknowledge the user's current state and provide context for why it matters
- Suggest practical next steps based on their goals and current situation
- Integrate activities into broader training plans
- Provide encouragement and celebrate progress
- Consider the user's age, fitness level, and health history when making recommendations

MORNING CHECK-IN FLOW:
When users start a conversation, guide them through a structured check-in:
1. "Good morning! How are you feeling today? Let's do a quick check-in - what's your weight today?"
2. "Got it. How's your energy level on a scale of 1-10?"
3. "What's your mood like today?"
4. "Any congestion, soreness, or other physical notes?"
5. Provide a summary and actionable insights

HISTORICAL CONTEXT HANDLING:
- When users mention past events ("I forgot to tell you yesterday..."), acknowledge and integrate that information
- Update your understanding of previous days based on new context
- Maintain continuity in your coaching approach
- Reference past conversations and patterns to provide personalized insights

EXAMPLE RESPONSES:
- "Perfect, thanks — here's your morning check-in summary for today: Weight: 254 lbs, Energy: 5/10. Given that you're feeling groggy and in vacation mode, your body is clearly in recovery reserves mode. That's actually fine heading into vacation — today should be about pacing, not pushing."
- "Want me to suggest a light pre-golf mobility and warm-up flow so you're loose on the course?"
- "Your training log has been updated with today's weight, sleep data, glucose notes, and BM update. The plan now centers around golf as your main activity, with a light recovery-focused morning."
- "Ah, you mentioned that scenic drive yesterday - that's great! Outdoor activities like that can really help with stress reduction and mood. Let me update yesterday's journal with that context."

Always be curious and supportive, building a rich understanding of the user's context while providing practical, actionable coaching. Remember that you're not just tracking data - you're building a relationship and helping them create sustainable, long-term health habits.`
        },
        ...conversationContext,
        ...(ocrData ? [{
          role: "user" as const,
          content: `I've uploaded a screenshot with workout data. Here's what was extracted: ${JSON.stringify(ocrData)}`
        }] : []),
        {
          role: "user",
          content: message
        }
      ],
      max_tokens: 800,
      temperature: 0.7,
    })

    const aiResponse = completion.choices[0]?.message?.content || "I'm sorry, I couldn't process that request."

    // Store conversation insights if we have any data types detected
    if (parsedData && (parsedData.has_health_data || parsedData.has_activity_data || parsedData.has_mood_data || parsedData.has_nutrition_data || parsedData.has_sleep_data || parsedData.has_workout_data)) {
      try {
        console.log('🔍 **CONVERSATION INSIGHTS DETECTED:**')
        console.log('User ID:', user.id)
        console.log('Original message:', message)
        console.log('Insights:', parsedData?.insights)
        console.log('Follow-up questions:', parsedData?.follow_up_questions)
        console.log('Data types detected:', {
          health: parsedData?.has_health_data,
          activity: parsedData?.has_activity_data,
          mood: parsedData?.has_mood_data,
          nutrition: parsedData?.has_nutrition_data,
          sleep: parsedData?.has_sleep_data,
          workout: parsedData?.has_workout_data
        })
        console.log('---')

        // Store the conversation insights in a simple way
        const { error: insightError } = await supabase
          .from('conversation_insights')
          .insert({
            user_id: user.id,
            conversation_date: new Date().toISOString().split('T')[0],
            message: message,
            insights: parsedData.insights,
            data_types: {
              health: parsedData.has_health_data,
              activity: parsedData.has_activity_data,
              mood: parsedData.has_mood_data,
              nutrition: parsedData.has_nutrition_data,
              sleep: parsedData.has_sleep_data,
              workout: parsedData.has_workout_data
            },
            follow_up_questions: parsedData.follow_up_questions,
            created_at: new Date().toISOString()
          })

        if (insightError) {
          console.error('Error storing conversation insights:', insightError)
        } else {
          console.log('✅ Conversation insights stored successfully')
        }
      } catch (error) {
        console.error('Error storing conversation insights:', error)
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
          parsed_health_data: parsedData, // Store the parsed data for reference
          conversation_state: conversationState // Track the conversation type
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
    console.error('❌ CHAT API ERROR:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      timestamp: new Date().toISOString()
    })
    
    // Return a more detailed error response
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
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

async function parseConversationForRichContext(message: string): Promise<ParsedConversation> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a smart conversation analyzer. Your job is to identify what types of information the user shared and suggest natural follow-up questions. Keep it simple and natural.

RESPONSE FORMAT (JSON only):
{
  "has_health_data": boolean,
  "has_activity_data": boolean, 
  "has_mood_data": boolean,
  "has_nutrition_data": boolean,
  "has_sleep_data": boolean,
  "has_workout_data": boolean,
  "insights": [
    "Brief insight about what the user shared"
  ],
  "follow_up_questions": [
    "Natural, conversational question to ask"
  ]
}

RULES:
- Keep it simple - just identify what types of information are present
- Don't force rigid categorization
- Focus on natural, engaging follow-up questions
- Insights should be brief observations, not data extractions
- Questions should feel conversational, not interrogative

EXAMPLES:
- User says "I slept great last night" → has_sleep_data: true, insights: ["User had good sleep"], follow_up_questions: ["What do you think contributed to the good sleep?"]
- User says "I'm going golfing today" → has_activity_data: true, insights: ["User has golf planned"], follow_up_questions: ["How are you feeling about your golf game lately?"]
- User says "I'm feeling a bit tired" → has_mood_data: true, insights: ["User is experiencing fatigue"], follow_up_questions: ["What's been going on that might be contributing to the tiredness?"]`
        },
        {
          role: "user",
          content: message
        }
      ],
      max_tokens: 400,
      temperature: 0.7,
    })

    const responseText = completion.choices[0]?.message?.content || "{}"
    
    try {
      const parsed = JSON.parse(responseText)
      return {
        has_health_data: parsed.has_health_data || false,
        has_activity_data: parsed.has_activity_data || false,
        has_mood_data: parsed.has_mood_data || false,
        has_nutrition_data: parsed.has_nutrition_data || false,
        has_sleep_data: parsed.has_sleep_data || false,
        has_workout_data: parsed.has_workout_data || false,
        insights: parsed.insights || [],
        follow_up_questions: parsed.follow_up_questions || []
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError)
      // Return simple fallback
      return {
        has_health_data: false,
        has_activity_data: false,
        has_mood_data: false,
        has_nutrition_data: false,
        has_sleep_data: false,
        has_workout_data: false,
        insights: [],
        follow_up_questions: []
      }
    }
  } catch (error) {
    console.error('Error in conversation parsing:', error)
    return {
      has_health_data: false,
      has_activity_data: false,
      has_mood_data: false,
      has_nutrition_data: false,
      has_sleep_data: false,
      has_workout_data: false,
      insights: [],
      follow_up_questions: []
    }
  }
}
