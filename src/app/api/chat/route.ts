import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import { logger } from '@/lib/logger'
import { getTodayInTimezone } from '@/lib/timezone-utils'
import { ParsedConversation } from '@/types'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// REMOVED: Old complex interface types - now using enhanced ParsedConversation from types

export async function POST(request: NextRequest) {
  try {
    logger.apiRequest('POST', '/api/chat')
    
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      logger.error('Authentication failed - no user found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    logger.info('User authenticated', { userId: user.id })

    const body = await request.json()
    const { message, conversationId, conversationState, ocrData, multiFileData } = body

    logger.info('Message received', {
      messageLength: message?.length || 0,
      hasOcrData: !!ocrData,
      hasMultiFileData: !!multiFileData,
      conversationState
    })

    // Ensure user exists in the users table
    const { error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single()

    if (userError && userError.code === 'PGRST116') {
      // User doesn't exist, create them
      logger.info('Creating new user in database', { userId: user.id })
      const { error: createUserError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email
        })

      if (createUserError) {
        logger.error('Failed to create user', createUserError, { userId: user.id })
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
      }
    } else if (userError) {
      logger.error('Failed to verify user', userError, { userId: user.id })
      return NextResponse.json({ error: 'Failed to verify user' }, { status: 500 })
    }

    logger.debug('User verified in database', { userId: user.id })

    // Fetch conversation history (last 6 messages for context, with size limits)
    const { data: conversationHistory } = await supabase
      .from('conversations')
      .select('message, message_type, metadata, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(6)

    // Fetch last 2 days of structured metrics for context (minimal)
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    const twoDaysAgoString = twoDaysAgo.toISOString().split('T')[0]
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
      .gte('metric_date', twoDaysAgoString)
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
    const stateContext = buildStateContext(conversationState)
    
    // Log OCR data if present
    if (ocrData) {
      logger.debug('OCR data received', { ocrDataSize: JSON.stringify(ocrData).length })
    }

    // Log multi-file data if present
    if (multiFileData) {
      logger.debug('Multi-file data received', { 
        imageCount: multiFileData.images?.length || 0,
        documentCount: multiFileData.documents?.length || 0
      })
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
      logger.error('Failed to save conversation', conversationError, { userId: user.id })
    }

    // Parse the conversation for rich context data
    logger.debug('Starting conversation parsing')
    const parsedData = await parseConversationForRichContext(message)
    logger.debug('Conversation parsing complete', {
      hasHealthData: parsedData.data_types?.health || false,
      hasActivityData: parsedData.data_types?.activity || false,
      insightsCount: parsedData.insights?.observations?.length || 0,
      userId: user.id
    })

    // Log extracted data for development review
    if (parsedData && (parsedData.data_types?.health || parsedData.data_types?.activity || parsedData.data_types?.mood || parsedData.data_types?.nutrition || parsedData.data_types?.sleep || parsedData.data_types?.workout)) {
      logger.debug('Conversation insights detected', {
        userId: user.id,
        messagePreview: message.substring(0, 100),
        insights: parsedData.insights?.observations || [],
        followUpQuestions: parsedData.follow_up_questions?.immediate || [],
        dataTypes: {
          health: parsedData.data_types?.health,
          activity: parsedData.data_types?.activity,
          mood: parsedData.data_types?.mood,
          nutrition: parsedData.data_types?.nutrition,
          sleep: parsedData.data_types?.sleep,
          workout: parsedData.data_types?.workout
        }
      })
    }

    // Build system prompt with token counting
    const baseSystemPrompt = `You are Coach, an AI health and fitness companion designed to help users achieve their health and longevity goals through personalized, evidence-based guidance. You combine the expertise of a personal trainer, health coach, and supportive friend.

## CORE IDENTITY
- **Professional but warm**: Knowledgeable and encouraging without being overly enthusiastic or generic
- **Honest yet supportive**: Give honest feedback while always encouraging simple steps forward
- **Adaptive companion**: Meet users exactly where they are on their health journey
- **Evidence-based**: Ground recommendations in trusted sources and scientific evidence

## CORE PRINCIPLES
- **Consistency over perfection**: Focus on sustainable habits rather than perfect execution
- **Holistic approach**: Balance prevention and optimization across all health domains
- **Data-driven personalization**: Use rich user data to make custom recommendations
- **Adaptive responses**: Adjust advice based on real-time data (sleep quality, recovery, etc.)

## YOUR CAPABILITIES & DATA ACCESS
You have access to comprehensive user data including:
- **Health metrics**: Sleep, heart rate, HRV, weight, blood pressure, glucose, etc.
- **Activity data**: Steps, workouts, recovery scores, VO2 max, etc.
- **Wellness indicators**: Mood, energy, stress, mental clarity, etc.
- **Nutrition tracking**: Water intake, calories, macros, caffeine, etc.
- **Lifestyle factors**: Screen time, social activities, work stress, travel, etc.
- **Conversation history**: Past discussions, goals, preferences, patterns
- **File uploads**: Workout screenshots, health documents, OCR data
- **Oura integration**: Sleep, activity, and readiness scores
- **Pattern recognition**: Trends, correlations, and behavioral insights

## INTERACTION GUIDELINES

### Data Integration & Personalization
- **Proactively reference** past conversations, patterns, and uploaded data
- **Adapt recommendations** based on real-time data (e.g., adjust workout intensity if sleep was poor)
- **Use data contextually** when building training plans and daily journal entries
- **Ask for clarification** when data conflicts rather than making assumptions
- **Track user-specified trends** and share insights about patterns you notice

### Response Style
- **Highly context-aware**: Reference relevant data and conversation history
- **Ask thoughtful follow-ups** that build on what users share
- **Make specific recommendations** based on their unique data and goals
- **Incorporate all knowledge domains** - this is a journaling, workout, health metrics, and trends app
- **Adapt to skill levels** and accommodate injuries, pain, or soreness

### Health Guidance Boundaries
- **Provide evidence-based recommendations** for areas with high confidence
- **Always encourage professional consultation** for medical concerns
- **Use disclaimers sparingly** - only when giving specific health advice
- **Position yourself as guidance**, not healthcare
- **Focus on optimization and prevention** while respecting medical boundaries

### Daily Journal & Workout Integration
- **Document health data** in daily journal entries for historical tracking
- **Use metrics to build personalized training plans** that adapt to current body state
- **Reference uploaded data** when creating journal entries and workout recommendations
- **Share trend insights** and help users understand their data patterns

## CONVERSATION FLOW
1. **Acknowledge** what the user shared with warmth and understanding
2. **Reference relevant data** from their metrics, history, or uploads when applicable
3. **Provide specific, actionable guidance** based on their unique situation
4. **Ask thoughtful follow-ups** that deepen the conversation
5. **Suggest next steps** that align with their goals and current state

## EXAMPLE RESPONSES
- "I see your sleep score was lower last night (72 vs your usual 85). Given that, let's adjust today's workout to focus on lighter movement rather than high-intensity training."
- "Your heart rate variability has been trending upward over the past week - that's a great sign of improved recovery. What changes have you noticed in your routine?"
- "I remember you mentioned feeling stressed about work last week. How has that been affecting your sleep and energy levels?"

Remember: You're not just responding to messages - you're building a comprehensive understanding of each user's health journey and providing personalized guidance that evolves with their data and needs.`
    
    // Build context sections with reasonable limits
    const limitedUserContext = userContext.length > 2500 ? userContext.substring(0, 2500) + '...' : userContext
    const limitedStateContext = stateContext.length > 1500 ? stateContext.substring(0, 1500) + '...' : stateContext
    
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
    
    logger.debug('Token usage estimate', {
      systemPromptChars: systemPrompt.length,
      systemPromptTokens: Math.ceil(systemPrompt.length / 4),
      messageTokens: Math.ceil(message.length / 4),
      conversationMessages: conversationContext.length,
      totalEstimatedTokens: estimatedTokens,
      isOverLimit: estimatedTokens > 150000
    })

    // Emergency fallback if still too large
    if (estimatedTokens > 150000) {
      logger.warn('Using minimal prompt due to token limit', { estimatedTokens })
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
        logger.error('Failed to save AI response in emergency mode', aiConversationError)
      }

      return NextResponse.json({ 
        message: aiResponse,
        conversationId: conversationData?.id,
        emergencyMode: true
      })
    }

    // Create OpenAI chat completion with reduced context
    logger.debug('Starting OpenAI completion')
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
    if (parsedData && (parsedData.data_types?.health || parsedData.data_types?.activity || parsedData.data_types?.mood || parsedData.data_types?.nutrition || parsedData.data_types?.sleep || parsedData.data_types?.workout)) {
      try {
        logger.info('Conversation insights detected for storage', {
          userId: user.id,
          messagePreview: message.substring(0, 100),
          insights: parsedData?.insights,
          followUpQuestions: parsedData?.follow_up_questions,
          dataTypes: {
            health: parsedData?.data_types?.health,
            activity: parsedData?.data_types?.activity,
            mood: parsedData?.data_types?.mood,
            nutrition: parsedData?.data_types?.nutrition,
            sleep: parsedData?.data_types?.sleep,
            workout: parsedData?.data_types?.workout
          }
        })

        // Store the conversation insights with enhanced context
        // Get user's timezone preference for proper date handling
        const { data: userData } = await supabase
          .from('users')
          .select('timezone')
          .eq('id', user.id)
          .single()
        
        const userTimezone = userData?.timezone || 'UTC'
        
        // Convert current UTC time to user's timezone for date storage
        const now = new Date()
        const userDate = new Intl.DateTimeFormat('en-CA', {
          timeZone: userTimezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).format(now)
        
        const enhancedInsights = {
          user_id: user.id,
          conversation_date: userDate, // Using user's timezone date for consistency
          message: message,
          insights: Array.isArray(parsedData.insights) ? parsedData.insights : parsedData.insights?.observations || [],
          data_types: {
            health: parsedData.data_types?.health,
            activity: parsedData.data_types?.activity,
            mood: parsedData.data_types?.mood,
            nutrition: parsedData.data_types?.nutrition,
            sleep: parsedData.data_types?.sleep,
            workout: parsedData.data_types?.workout,
            // Add flags for file data
            has_ocr_data: !!ocrData,
            has_multifile_data: !!multiFileData
          },
          follow_up_questions: Array.isArray(parsedData.follow_up_questions) ? parsedData.follow_up_questions : parsedData.follow_up_questions?.immediate || [],
          created_at: new Date().toISOString()
        }

        // Add OCR and multi-file context to insights if present
        if (ocrData) {
          enhancedInsights.insights.push(`OCR data extracted from uploaded image: ${JSON.stringify(ocrData).substring(0, 200)}...`)
        }
        
        if (multiFileData) {
          if (multiFileData.images?.length > 0) {
            enhancedInsights.insights.push(`Uploaded ${multiFileData.images.length} image(s) with analysis`)
          }
          if (multiFileData.documents?.length > 0) {
            multiFileData.documents.forEach((doc: any) => {
              if (doc.content) {
                enhancedInsights.insights.push(`Document analysis: ${doc.fileName} - ${doc.content.substring(0, 150)}...`)
              }
            })
          }
        }

        const { error: insightError } = await supabase
          .from('conversation_insights')
          .insert(enhancedInsights)

        if (insightError) {
          logger.error('Failed to store conversation insights', insightError, { userId: user.id })
        } else {
          logger.info('Conversation insights stored successfully', { userId: user.id })
          
          // Link any uploaded files to this conversation
          if (conversationData?.id && multiFileData) {
            try {
              const fileLinks = []
              
              // Process images with OCR data
              if (multiFileData.images) {
                for (const image of multiFileData.images) {
                  if (image.uploadId) {
                    fileLinks.push({
                      conversation_id: conversationData.id,
                      file_id: image.uploadId,
                      attachment_order: fileLinks.length
                    })
                  }
                }
              }
              
              // Process documents
              if (multiFileData.documents) {
                for (const doc of multiFileData.documents) {
                  if (doc.uploadId) {
                    fileLinks.push({
                      conversation_id: conversationData.id,
                      file_id: doc.uploadId,
                      attachment_order: fileLinks.length
                    })
                  }
                }
              }
              
              if (fileLinks.length > 0) {
                const { error: linkError } = await supabase
                  .from('conversation_file_attachments')
                  .insert(fileLinks)
                
                if (linkError) {
                  logger.error('Failed to link files to conversation', linkError, { userId: user.id, conversationId: conversationData.id })
                } else {
                  logger.info('Files linked to conversation successfully', { userId: user.id, conversationId: conversationData.id, fileCount: fileLinks.length })
                }
              }
            } catch (linkError) {
              logger.error('Failed to process file links', linkError instanceof Error ? linkError : new Error('Unknown error'), { userId: user.id })
            }
          }
          
          // Trigger daily narrative generation (non-blocking)
          const today = new Date().toISOString().split('T')[0] // Note: Using UTC date for database consistency
          
          // Call narrative generation directly - this should work now
          try {
            const { generateDailyNarrative } = await import('@/lib/narrative-generator')
            const result = await generateDailyNarrative(user.id, today)
            if (result.success) {
              logger.info('Daily narrative generation completed', { userId: user.id, date: today })
            } else {
              logger.error('Daily narrative generation failed', new Error(result.error), { userId: user.id, date: today })
            }
          } catch (error) {
            logger.error('Failed to trigger narrative generation', error instanceof Error ? error : new Error('Unknown error'), { userId: user.id })
          }
        }
      } catch (error) {
        logger.error('Failed to store conversation insights', error instanceof Error ? error : new Error('Unknown error'), { userId: user.id })
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
      logger.error('Failed to save AI response', aiConversationError, { userId: user.id })
    }

    return NextResponse.json({ 
      message: aiResponse,
      conversationId: conversationData?.id,
      parsedData: parsedData // Return parsed data for frontend display
    })

  } catch (error) {
    logger.error('Chat API error', error instanceof Error ? error : new Error('Unknown error'), {
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
function buildStateContext(conversationState: string): string {
  // Minimal state context to save tokens
  if (conversationState && conversationState !== 'idle') {
    return `STATE: ${conversationState}`
  }
  return ""
}

async function parseConversationForRichContext(
  message: string, 
  userHistory?: any, // Optional: past conversation context
  fileData?: any // Optional: OCR/file upload data
): Promise<ParsedConversation> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an advanced conversation analyzer for a health and fitness AI companion. Extract rich, contextual information from user messages to enable personalized coaching.

RESPONSE FORMAT (JSON only):
{
  "data_types": {
    "health": boolean,
    "activity": boolean,
    "mood": boolean,
    "nutrition": boolean,
    "sleep": boolean,
    "workout": boolean,
    "lifestyle": boolean,
    "biometric": boolean,
    "wellness": boolean,
    "social": boolean,
    "work": boolean,
    "travel": boolean
  },
  "extracted_metrics": {
    "metric_key": {
      "value": any,
      "confidence": number,
      "source": "conversation|ocr|file|inferred",
      "time_reference": "string (optional)",
      "comparative": "better|worse|same|improving|declining (optional)"
    }
  },
  "goals_mentioned": [
    {
      "goal": "string",
      "category": "string",
      "timeframe": "string (optional)",
      "confidence": number
    }
  ],
  "emotional_context": {
    "tone": "positive|negative|neutral|frustrated|excited|concerned",
    "intensity": number,
    "specific_emotions": ["string"]
  },
  "time_references": [
    {
      "reference": "string",
      "associated_date": "ISO date (optional)",
      "context": "string"
    }
  ],
  "preferences": [
    {
      "type": "workout_time|equipment|activity_type|diet|schedule",
      "value": "string",
      "confidence": number
    }
  ],
  "insights": {
    "observations": ["string"],
    "patterns": ["string"],
    "recommendations": ["string"],
    "concerns": ["string"],
    "data_quality_issues": ["string"]
  },
  "follow_up_questions": {
    "immediate": ["string"],
    "contextual": ["string"],
    "data_driven": ["string"]
  },
  "file_context": {
    "has_ocr_data": boolean,
    "has_document_data": boolean,
    "extracted_data": ["string"],
    "data_validation_needed": ["string"]
  },
  "conversation_themes": ["string"],
  "historical_context": {
    "references_past_data": boolean,
    "pattern_continuations": ["string"],
    "trend_mentions": ["string"]
  }
}

ANALYSIS GUIDELINES:
- Extract specific values when mentioned (e.g., "slept 8 hours" → sleep_duration: 8)
- Detect emotional context and intensity
- Identify time references and associate with proper dates when possible
- Extract user preferences and goals
- Look for comparative statements ("better than yesterday", "worse than usual")
- Identify data quality issues (conflicting information)
- Generate context-aware follow-ups based on user's likely patterns
- Detect conversation themes and ongoing topics
- Reference past data patterns when relevant

EXAMPLES:
User: "I slept terribly last night, only 5 hours, but I'm feeling surprisingly energetic this morning"
→ {
  "data_types": {"sleep": true, "mood": true},
  "extracted_metrics": {
    "sleep_duration": {"value": 5, "confidence": 0.9, "source": "conversation", "time_reference": "last night"},
    "energy_level": {"value": "high", "confidence": 0.8, "source": "conversation", "time_reference": "this morning", "comparative": "better"}
  },
  "emotional_context": {"tone": "neutral", "intensity": 6, "specific_emotions": ["surprised"]},
  "insights": {
    "observations": ["User had poor sleep but high energy - unusual pattern"],
    "patterns": ["Disconnect between sleep quality and energy levels"],
    "concerns": ["Poor sleep quality may impact recovery"]
  }
}

User: "I want to start working out in the mornings before work"
→ {
  "data_types": {"workout": true, "lifestyle": true},
  "goals_mentioned": [{"goal": "morning workouts", "category": "fitness", "timeframe": "ongoing", "confidence": 0.9}],
  "preferences": [{"type": "workout_time", "value": "morning", "confidence": 0.9}],
  "insights": {
    "recommendations": ["Consider gradual transition to morning workouts", "Plan workout routine that fits morning schedule"]
  }
}`
        },
        {
          role: "user",
          content: message
        }
      ],
      max_tokens: 800,
      temperature: 0.7,
    })

    const responseText = completion.choices[0]?.message?.content || "{}"
    
    try {
      const parsed = JSON.parse(responseText)
      
      // Return the parsed data directly
      const enhancedParsed: ParsedConversation = {
        ...parsed
      }
      
      return enhancedParsed
    } catch (parseError) {
      logger.error('Failed to parse AI response', parseError instanceof Error ? parseError : new Error('Parse error'))
      // Return enhanced fallback
      return createEnhancedFallback()
    }
  } catch (error) {
    logger.error('Error in conversation parsing', error instanceof Error ? error : new Error('Unknown error'))
    return createEnhancedFallback()
  }
}

function createEnhancedFallback(): ParsedConversation {
  return {
    data_types: {
      health: false, activity: false, mood: false, nutrition: false,
      sleep: false, workout: false, lifestyle: false, biometric: false,
      wellness: false, social: false, work: false, travel: false
    },
    extracted_metrics: {},
    goals_mentioned: [],
    emotional_context: { tone: 'neutral', intensity: 5, specific_emotions: [] },
    time_references: [],
    preferences: [],
    insights: { observations: [], patterns: [], recommendations: [], concerns: [], data_quality_issues: [] },
    follow_up_questions: { immediate: [], contextual: [], data_driven: [] },
    conversation_themes: []
  }
}
