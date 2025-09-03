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

    // Fetch conversation history (last 6 messages for context, with size limits)
    const { data: conversationHistory } = await supabase
      .from('conversations')
      .select('message, message_type, metadata, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(6)

    // Fetch last 2 days of structured metrics for context (minimal)
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const { data: weeklyMetrics } = await supabase
      .from('user_daily_metrics')
      .select(`
        metric_date,
        metric_value,
        text_value,
        standard_metrics (
          metric_key,
          display_name
        )
      `)
      .eq('user_id', user.id)
      .gte('metric_date', twoDaysAgo)
      .order('metric_date', { ascending: false })
      .limit(10)

    // Transform metrics to match expected format
    const weeklyCards = weeklyMetrics ? weeklyMetrics.map((metric: any) => ({
      summary: {
        [metric.standard_metrics?.[0]?.metric_key || 'unknown']: metric.metric_value || metric.text_value
      },
      log_date: metric.metric_date
    })) : []

    // Fetch recent user context data (last 1 day only)
    const { data: recentContext } = await supabase
      .from('events')
      .select('data, created_at')
      .eq('user_id', user.id)
      .eq('event_type', 'note')
      .gte('created_at', new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(5)

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

    // Save user message to database (truncate if too large to prevent performance issues)
    const truncatedMessage = message.length > 1000 ? message.substring(0, 1000) + '... [truncated for performance]' : message
    const { data: conversationData, error: conversationError } = await supabase
      .from('conversations')
      .insert({
        user_id: user.id,
        message: truncatedMessage,
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

    // Build system prompt with token counting
    const baseSystemPrompt = `You are Coach, an AI health and fitness companion. You're warm, encouraging, and help users achieve their health goals through actionable insights and personalized coaching.`
    
    // Build context sections with strict limits
    const limitedUserContext = userContext.length > 1000 ? userContext.substring(0, 1000) + '...' : userContext
    const limitedStateContext = stateContext.length > 500 ? stateContext.substring(0, 500) + '...' : stateContext
    
    // Handle OCR data with strict limits
    const ocrSection = ocrData ? `OCR DATA: ${JSON.stringify(ocrData).substring(0, 1000)}${JSON.stringify(ocrData).length > 1000 ? '...' : ''}` : ''
    
    // Handle multi-file data with very strict limits
    let multiFileSection = ''
    if (multiFileData) {
      const imagesSummary = multiFileData.images?.map((img: any) => 
        `${img.fileName}: ${img.error || 'OCR data available'}`
      ).join(', ') || ''
      
      const docsSummary = multiFileData.documents?.map((doc: any) => 
        `${doc.fileName}: ${doc.error || doc.content?.substring(0, 50) + '...' || 'Content available'}`
      ).join(', ') || ''
      
      multiFileSection = `FILES: Images: ${imagesSummary} Documents: ${docsSummary}`
      if (multiFileSection.length > 1000) {
        multiFileSection = multiFileSection.substring(0, 1000) + '...'
      }
    }

    const systemPrompt = [baseSystemPrompt, limitedUserContext, limitedStateContext, ocrSection, multiFileSection]
      .filter(Boolean)
      .join('\n\n')

    // Token counting and logging
    const estimatedTokens = Math.ceil(systemPrompt.length / 4) + 
                           Math.ceil(message.length / 4) + 
                           (conversationContext.length * 50) // rough estimate per message
    
    console.log('🔍 TOKEN USAGE ESTIMATE:', {
      systemPromptChars: systemPrompt.length,
      systemPromptTokens: Math.ceil(systemPrompt.length / 4),
      messageTokens: Math.ceil(message.length / 4),
      conversationMessages: conversationContext.length,
      totalEstimatedTokens: estimatedTokens,
      isOverLimit: estimatedTokens > 150000
    })

    // Emergency fallback if still too large
    if (estimatedTokens > 150000) {
      console.log('⚠️ EMERGENCY: Using minimal prompt due to token limit')
      const minimalPrompt = `You are Coach, a helpful AI fitness companion. Respond naturally to: "${message}"`
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: minimalPrompt },
          { role: "user", content: message }
        ],
        max_tokens: 400,
        temperature: 0.7,
      })
      
      const aiResponse = completion.choices[0]?.message?.content || "I'm having trouble processing that request right now."
      
      // Save minimal response
      const { error: aiConversationError } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          message: aiResponse,
          message_type: 'text',
          metadata: { 
            conversation_id: conversationId,
            role: 'assistant',
            emergency_mode: true
          }
        })

      if (aiConversationError) {
        console.error('Error saving AI response:', aiConversationError)
      }

      return NextResponse.json({ 
        message: aiResponse,
        conversationId: conversationData?.id,
        emergencyMode: true
      })
    }

    // Create OpenAI chat completion with reduced context
    console.log('🤖 Starting OpenAI completion...')
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemPrompt
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
          
          // Trigger daily narrative generation (non-blocking)
          const today = new Date().toISOString().split('T')[0]
          fetch('/api/narratives/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date: today })
          }).catch(error => {
            console.error('Error triggering narrative generation:', error)
          })
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

  // Reverse to get chronological order and limit to last 4 messages (2 exchanges) for token savings
  const recentMessages = conversationHistory.slice(0, 4).reverse()
  
  return recentMessages.map(msg => ({
    role: msg.metadata?.role === 'assistant' ? 'assistant' : 'user',
    content: msg.message.length > 300 ? msg.message.substring(0, 300) + '... [truncated]' : msg.message
  }))
}

// Helper function to build enhanced user context with weekly data (MINIMAL VERSION)
function buildEnhancedUserContext(weeklyCards: Array<{summary?: Record<string, unknown>, log_date: string}>, recentContext: Array<{data: Record<string, unknown>}>): string {
  // Drastically reduced context to save tokens
  if (weeklyCards && weeklyCards.length > 0) {
    const todayCard = weeklyCards[0]
    if (todayCard?.summary) {
      const summary = todayCard.summary
      const metrics = []
      
      if (summary.sleep_hours) metrics.push(`Sleep: ${summary.sleep_hours}h`)
      if (summary.energy) metrics.push(`Energy: ${summary.energy}/10`)
      if (summary.mood) metrics.push(`Mood: ${summary.mood}/10`)
      
      return metrics.length > 0 ? `TODAY: ${metrics.join(', ')}` : ""
    }
  }
  
  return ""
}

// Note: Weekly trend analysis is now handled by PostgreSQL functions
// for better performance and automatic updates

// Helper function to build conversation state context (MINIMAL VERSION)
function buildStateContext(conversationState: string, checkinProgress: Record<string, unknown>): string {
  // Minimal state context to save tokens
  if (conversationState && conversationState !== 'idle') {
    return `STATE: ${conversationState}`
  }
  return ""
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
