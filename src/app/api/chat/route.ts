import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';
import { logger } from '@/lib/logger';
import { getTodayInTimezone } from '@/lib/timezone-utils';
import { ParsedConversation } from '@/types';
import {
  createRateLimit,
  RATE_LIMITS,
  getClientIdentifier,
} from '@/lib/rate-limiter';
import { validateRequestBody, chatSchemas } from '@/lib/input-validation';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// REMOVED: Old complex interface types - now using enhanced ParsedConversation from types

export async function POST(request: NextRequest) {
  try {
    logger.apiRequest('POST', '/api/chat');

    // Add rate limiting
    const rateLimit = createRateLimit(RATE_LIMITS.chat);
    const clientId = getClientIdentifier(request);
    rateLimit(clientId, 'chat');

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      logger.error('Authentication failed - no user found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.info('User authenticated', { userId: user.id });

    // Add input validation
    const body = await request.json();
    const validation = validateRequestBody(body, chatSchemas.message);

    if (!validation.success) {
      logger.error('Input validation failed', {
        error: validation.error,
        details: validation.details,
      });
      return NextResponse.json(
        { error: 'Invalid input', details: (validation as any).details },
        { status: 400 }
      );
    }

    const {
      message,
      conversationId,
      conversationState,
      ocrData,
      multiFileData,
    } = validation.data;

    logger.info('Message received', {
      messageLength: message?.length || 0,
      hasOcrData: !!ocrData,
      hasMultiFileData: !!multiFileData,
      conversationState,
    });

    // Ensure user exists in the users table
    const { error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single();

    if (userError && userError.code === 'PGRST116') {
      // User doesn't exist, create them
      logger.info('Creating new user in database', { userId: user.id });
      const { error: createUserError } = await supabase.from('users').insert({
        id: user.id,
        email: user.email,
      });

      if (createUserError) {
        logger.error('Failed to create user', createUserError, {
          userId: user.id,
        });
        return NextResponse.json(
          { error: 'Failed to create user' },
          { status: 500 }
        );
      }
    } else if (userError) {
      logger.error('Failed to verify user', userError, { userId: user.id });
      return NextResponse.json(
        { error: 'Failed to verify user' },
        { status: 500 }
      );
    }

    logger.debug('User verified in database', { userId: user.id });

    // Fetch conversation history (last 6 messages for context, with size limits)
    const { data: conversationHistory } = await supabase
      .from('conversations')
      .select('message, message_type, metadata, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(6);

    // Fetch last 2 days of structured metrics for context (minimal)
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const twoDaysAgoString = twoDaysAgo.toISOString().split('T')[0];
    const { data: weeklyMetrics } = await supabase
      .from('user_daily_metrics')
      .select(
        `
        metric_date,
        metric_value,
        text_value,
        standard_metrics (
          metric_key,
          display_name
        )
      `
      )
      .eq('user_id', user.id)
      .gte('metric_date', twoDaysAgoString)
      .order('metric_date', { ascending: false })
      .limit(10);

    // Transform metrics to match expected format
    const weeklyCards = weeklyMetrics
      ? weeklyMetrics.map((metric: any) => ({
          summary: {
            [metric.standard_metrics?.[0]?.metric_key || 'unknown']:
              metric.metric_value || metric.text_value,
          },
          log_date: metric.metric_date,
        }))
      : [];

    // Fetch recent user context data (last 1 day only)
    const { data: recentContext } = await supabase
      .from('events')
      .select('data, created_at')
      .eq('user_id', user.id)
      .eq('event_type', 'note')
      .gte(
        'created_at',
        new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      )
      .order('created_at', { ascending: false })
      .limit(5);

    // Build context for the AI
    const conversationContext = buildConversationContext(
      conversationHistory || []
    );
    const userContext = buildEnhancedUserContext(
      weeklyCards || [],
      recentContext || []
    );

    // Build conversation state context
    const stateContext = buildStateContext(conversationState);

    // Log OCR data if present
    if (ocrData) {
      logger.debug('OCR data received', {
        ocrDataSize: JSON.stringify(ocrData).length,
      });
    }

    // Log multi-file data if present
    if (multiFileData) {
      logger.debug('Multi-file data received', {
        imageCount: multiFileData.images?.length || 0,
        documentCount: multiFileData.documents?.length || 0,
      });
    }

    // Save user message to database (truncate if too large to prevent performance issues)
    const truncatedMessage =
      message.length > 1000
        ? message.substring(0, 1000) + '... [truncated for performance]'
        : message;
    const { data: conversationData, error: conversationError } = await supabase
      .from('conversations')
      .insert({
        user_id: user.id,
        message: truncatedMessage,
        message_type: 'text',
        metadata: { conversation_id: conversationId },
      })
      .select()
      .single();

    if (conversationError) {
      logger.error('Failed to save conversation', conversationError, {
        userId: user.id,
      });
    }

    // Note: Conversation parsing now happens in the unified AI call below
    // This eliminates the need for a separate parsing call, reducing API costs and latency

    // Note: Conversation insights logging now happens after the unified AI call

    // Build system prompt with token counting
    const baseSystemPrompt = `You are Coach, an AI health and fitness companion focused on holistic wellness.

CORE IDENTITY:
- Supportive life companion (not just fitness drill sergeant)
- Evidence-based guidance with warm, encouraging tone
- Holistic approach: physical, mental, emotional wellness
- Meet users where they are on their health journey

RESPONSE STYLE:
- Conversational and encouraging
- Ask 1-2 thoughtful follow-up questions
- Reference user data when relevant
- Provide actionable, personalized advice
- Focus on consistency over perfection
- Be natural and engaging in your responses`;

    // Build context sections with reasonable limits
    const limitedUserContext =
      userContext.length > 2500
        ? userContext.substring(0, 2500) + '...'
        : userContext;
    const limitedStateContext =
      stateContext.length > 1500
        ? stateContext.substring(0, 1500) + '...'
        : stateContext;

    // Handle multi-file data with very strict limits
    let multiFileSection = '';
    let extractedOcrData = null;

    if (multiFileData) {
      // Extract OCR data from images
      if (multiFileData.images?.length > 0) {
        const imageWithOcr = multiFileData.images.find(
          (img: any) => img.ocrData
        );
        if (imageWithOcr?.ocrData) {
          extractedOcrData = imageWithOcr.ocrData;
        }
      }

      const imagesSummary =
        multiFileData.images
          ?.map(
            (img: any) =>
              `${img.fileName}: ${img.error || (img.ocrData ? 'OCR data extracted' : 'No OCR data')}`
          )
          .join(', ') || '';

      const docsSummary =
        multiFileData.documents
          ?.map(
            (doc: any) =>
              `${doc.fileName}: ${doc.error || doc.content?.substring(0, 50) + '...' || 'Content available'}`
          )
          .join(', ') || '';

      multiFileSection = `FILES: Images: ${imagesSummary} Documents: ${docsSummary}`;
      if (multiFileSection.length > 1000) {
        multiFileSection = multiFileSection.substring(0, 1000) + '...';
      }
    }

    // Handle OCR data with strict limits (from direct ocrData or extracted from multiFileData)
    const finalOcrData = ocrData || extractedOcrData;
    const ocrSection = finalOcrData
      ? `OCR DATA: ${JSON.stringify(finalOcrData).substring(0, 1000)}${JSON.stringify(finalOcrData).length > 1000 ? '...' : ''}`
      : '';

    const systemPrompt = [
      baseSystemPrompt,
      limitedUserContext,
      limitedStateContext,
      ocrSection,
      multiFileSection,
    ]
      .filter(Boolean)
      .join('\n\n');

    // Token counting and logging
    const estimatedTokens =
      Math.ceil(systemPrompt.length / 4) +
      Math.ceil(message.length / 4) +
      conversationContext.length * 50; // rough estimate per message

    logger.debug('Token usage estimate', {
      systemPromptChars: systemPrompt.length,
      systemPromptTokens: Math.ceil(systemPrompt.length / 4),
      messageTokens: Math.ceil(message.length / 4),
      conversationMessages: conversationContext.length,
      totalEstimatedTokens: estimatedTokens,
      isOverLimit: estimatedTokens > 150000,
    });

    // Emergency fallback if still too large
    if (estimatedTokens > 150000) {
      logger.warn('Using minimal prompt due to token limit', {
        estimatedTokens,
      });
      const minimalPrompt = `You are Coach, a helpful AI fitness companion. Respond naturally and conversationally to: "${message}"`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: minimalPrompt },
          { role: 'user', content: message },
        ],
        max_tokens: 400,
        temperature: 0.7,
      });

      const aiResponse =
        completion.choices[0]?.message?.content ||
        "I'm having trouble processing that request right now.";

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
            emergency_mode: true,
          },
        });

      if (aiConversationError) {
        logger.error(
          'Failed to save AI response in emergency mode',
          aiConversationError
        );
      }

      return NextResponse.json({
        message: aiResponse,
        conversationId: conversationData?.id,
        emergencyMode: true,
      });
    }

    // Create OpenAI chat completion with reduced context
    logger.debug('Starting OpenAI completion');
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        ...conversationContext,
        ...(finalOcrData
          ? [
              {
                role: 'user' as const,
                content: `I've uploaded a screenshot with health data. Here's what was extracted: ${JSON.stringify(finalOcrData)}`,
              },
            ]
          : []),
        {
          role: 'user',
          content: message,
        },
      ],
      max_tokens: 800,
      temperature: 0.7,
    });

    const aiResponse =
      completion.choices[0]?.message?.content ||
      "I'm sorry, I couldn't process that request.";

    logger.info('AI response generated', {
      responseLength: aiResponse.length,
      userId: user.id,
    });

    // Post-process conversation for insights extraction
    let extractedInsights: ParsedConversation | null = null;
    try {
      extractedInsights = await extractInsightsFromConversation(
        message,
        aiResponse
      );
      logger.info('Insights extracted from conversation', {
        hasInsights: !!extractedInsights,
        dataTypes: extractedInsights?.data_types,
      });
    } catch (error) {
      logger.warn('Failed to extract insights from conversation', { error });
    }

    // Store conversation insights if we have any data types detected
    if (
      extractedInsights &&
      (extractedInsights.data_types?.health ||
        extractedInsights.data_types?.activity ||
        extractedInsights.data_types?.mood ||
        extractedInsights.data_types?.lifestyle ||
        extractedInsights.data_types?.goals ||
        extractedInsights.insights?.observations?.length > 0)
    ) {
      try {
        logger.info('Conversation insights detected for storage', {
          userId: user.id,
          messagePreview: message.substring(0, 100),
          insights: extractedInsights?.insights,
          followUpQuestions: extractedInsights?.follow_up_questions,
          dataTypes: {
            health: extractedInsights?.data_types?.health,
            activity: extractedInsights?.data_types?.activity,
            mood: extractedInsights?.data_types?.mood,
            lifestyle: extractedInsights?.data_types?.lifestyle,
            goals: extractedInsights?.data_types?.goals,
          },
        });

        // Store the conversation insights with simplified context
        // Get user's timezone preference for proper date handling
        const { data: userData } = await supabase
          .from('users')
          .select('timezone')
          .eq('id', user.id)
          .single();

        const userTimezone = userData?.timezone || 'UTC';

        // Convert current UTC time to user's timezone for date storage
        const now = new Date();
        const userDate = new Intl.DateTimeFormat('en-CA', {
          timeZone: userTimezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(now);

        const simplifiedInsights = {
          user_id: user.id,
          conversation_date: userDate,
          message: message,
          insights: extractedInsights.insights?.observations || [],
          data_types: {
            health: extractedInsights.data_types?.health,
            activity: extractedInsights.data_types?.activity,
            mood: extractedInsights.data_types?.mood,
            lifestyle: extractedInsights.data_types?.lifestyle,
            goals: extractedInsights.data_types?.goals,
            // Add flags for file data
            has_ocr_data: !!finalOcrData,
            has_multifile_data: !!multiFileData,
          },
          follow_up_questions: extractedInsights.follow_up_questions || [],
          created_at: new Date().toISOString(),
        };

        // Add OCR and multi-file context to insights if present
        if (ocrData) {
          simplifiedInsights.insights.push(
            `OCR data extracted from uploaded image: ${JSON.stringify(ocrData).substring(0, 200)}...`
          );
        }

        if (multiFileData) {
          if (multiFileData.images?.length > 0) {
            simplifiedInsights.insights.push(
              `Uploaded ${multiFileData.images.length} image(s) with analysis`
            );
          }
          if (multiFileData.documents?.length > 0) {
            multiFileData.documents.forEach((doc: any) => {
              if (doc.content) {
                simplifiedInsights.insights.push(
                  `Document analysis: ${doc.fileName} - ${doc.content.substring(0, 150)}...`
                );
              }
            });
          }
        }

        // Debug: Log the data being inserted
        logger.debug('Attempting to store conversation insights', {
          userId: user.id,
          userDate,
          userTimezone,
          insightsCount: simplifiedInsights.insights.length,
          dataTypes: simplifiedInsights.data_types,
          simplifiedInsights: JSON.stringify(simplifiedInsights, null, 2),
        });

        const { data: insertedData, error: insightError } = await supabase
          .from('conversation_insights')
          .insert(simplifiedInsights)
          .select();

        if (insightError) {
          logger.error('Failed to store conversation insights', insightError, {
            userId: user.id,
            errorDetails: insightError,
            attemptedData: simplifiedInsights,
          });
        } else {
          logger.info('Conversation insights stored successfully', {
            userId: user.id,
            insertedRecordId: insertedData?.[0]?.id,
            conversationDate: userDate,
          });

          // Store health metrics from OCR data if available
          if (finalOcrData && finalOcrData.rawOcrText) {
            await storeHealthMetricsFromOcr(
              finalOcrData,
              user.id,
              userDate,
              supabase
            );
          }

          // Link any uploaded files to this conversation
          if (conversationData?.id && multiFileData) {
            try {
              const fileLinks = [];

              // Process images with OCR data
              if (multiFileData.images) {
                for (const image of multiFileData.images) {
                  if (image.uploadId) {
                    fileLinks.push({
                      conversation_id: conversationData.id,
                      file_id: image.uploadId,
                      attachment_order: fileLinks.length,
                    });
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
                      attachment_order: fileLinks.length,
                    });
                  }
                }
              }

              if (fileLinks.length > 0) {
                const { error: linkError } = await supabase
                  .from('conversation_file_attachments')
                  .insert(fileLinks);

                if (linkError) {
                  logger.error(
                    'Failed to link files to conversation',
                    linkError,
                    { userId: user.id, conversationId: conversationData.id }
                  );
                } else {
                  logger.info('Files linked to conversation successfully', {
                    userId: user.id,
                    conversationId: conversationData.id,
                    fileCount: fileLinks.length,
                  });
                }
              }
            } catch (linkError) {
              logger.error(
                'Failed to process file links',
                linkError instanceof Error
                  ? linkError
                  : new Error('Unknown error'),
                { userId: user.id }
              );
            }
          }

          // Trigger daily narrative generation (non-blocking)
          // Use the same userDate that we used for storing insights to ensure consistency

          // Call narrative generation directly - this should work now
          try {
            const { generateDailyNarrative } = await import(
              '@/lib/narrative-generator'
            );
            logger.debug('Calling narrative generation', {
              userId: user.id,
              userDate,
              userTimezone,
              utcDate: new Date().toISOString().split('T')[0],
            });
            const result = await generateDailyNarrative(user.id, userDate);
            if (result.success) {
              logger.info('Daily narrative generation completed', {
                userId: user.id,
                date: userDate,
              });
            } else {
              logger.error(
                'Daily narrative generation failed',
                new Error(result.error),
                { userId: user.id, date: userDate }
              );
            }
          } catch (error) {
            logger.error(
              'Failed to trigger narrative generation',
              error instanceof Error ? error : new Error('Unknown error'),
              { userId: user.id }
            );
          }
        }
      } catch (error) {
        logger.error(
          'Failed to store conversation insights',
          error instanceof Error ? error : new Error('Unknown error'),
          { userId: user.id }
        );
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
          extracted_insights: extractedInsights, // Store the extracted insights for reference
          conversation_state: conversationState, // Track the conversation type
        },
      });

    if (aiConversationError) {
      logger.error('Failed to save AI response', aiConversationError, {
        userId: user.id,
      });
    }

    return NextResponse.json({
      message: aiResponse,
      conversationId: conversationData?.id,
      extractedInsights: extractedInsights, // Return extracted insights for frontend display
    });
  } catch (error: any) {
    // Handle rate limit errors
    if (error.statusCode === 429) {
      logger.warn('Rate limit exceeded', {
        clientId: getClientIdentifier(request),
        error: error.message,
      });
      return NextResponse.json(
        {
          error: error.message,
          remaining: error.remaining,
          resetTime: error.resetTime,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': error.remaining?.toString() || '0',
            'X-RateLimit-Reset': error.resetTime?.toString() || '0',
            'Retry-After': error.resetTime
              ? Math.ceil((error.resetTime - Date.now()) / 1000).toString()
              : '60',
          },
        }
      );
    }

    logger.error(
      'Chat API error',
      error instanceof Error ? error : new Error('Unknown error'),
      {
        timestamp: new Date().toISOString(),
      }
    );

    // Return a more detailed error response
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Helper function to build conversation context
function buildConversationContext(
  conversationHistory: Array<{ message: string; metadata?: { role?: string } }>
): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  if (!conversationHistory || conversationHistory.length === 0) {
    return [];
  }

  // Reverse to get chronological order and limit to last 4 messages (2 exchanges) for token savings
  const recentMessages = conversationHistory.slice(0, 4).reverse();

  return recentMessages.map(msg => ({
    role: msg.metadata?.role === 'assistant' ? 'assistant' : 'user',
    content:
      msg.message.length > 300
        ? msg.message.substring(0, 300) + '... [truncated]'
        : msg.message,
  }));
}

// Helper function to build enhanced user context with weekly data (MINIMAL VERSION)
function buildEnhancedUserContext(
  weeklyCards: Array<{ summary?: Record<string, unknown>; log_date: string }>,
  recentContext: Array<{ data: Record<string, unknown> }>
): string {
  // Drastically reduced context to save tokens
  if (weeklyCards && weeklyCards.length > 0) {
    const todayCard = weeklyCards[0];
    if (todayCard?.summary) {
      const summary = todayCard.summary;
      const metrics = [];

      if (summary.sleep_hours) metrics.push(`Sleep: ${summary.sleep_hours}h`);
      if (summary.energy) metrics.push(`Energy: ${summary.energy}/10`);
      if (summary.mood) metrics.push(`Mood: ${summary.mood}/10`);

      return metrics.length > 0 ? `TODAY: ${metrics.join(', ')}` : '';
    }
  }

  return '';
}

// Note: Weekly trend analysis is now handled by PostgreSQL functions
// for better performance and automatic updates

// Helper function to build conversation state context (MINIMAL VERSION)
function buildStateContext(conversationState: string): string {
  // Minimal state context to save tokens
  if (conversationState && conversationState !== 'idle') {
    return `STATE: ${conversationState}`;
  }
  return '';
}

// Post-process conversation for insights extraction
async function extractInsightsFromConversation(
  userMessage: string,
  aiResponse: string
): Promise<ParsedConversation> {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a health and wellness conversation analyzer. Extract key insights from the conversation between user and AI coach.

RESPONSE FORMAT (JSON only):
{
  "data_types": {
    "health": boolean,      // Physical health metrics, symptoms, medical info
    "activity": boolean,    // Exercise, workouts, physical activity
    "mood": boolean,        // Emotional state, mental health, feelings
    "lifestyle": boolean,   // Daily habits, routines, social activities
    "goals": boolean        // Intentions, plans, aspirations
  },
  "insights": {
    "observations": ["string"],     // What the user shared
    "recommendations": ["string"],  // Actionable advice given
    "concerns": ["string"]          // Things to watch or address
  },
  "extracted_metrics": {
    "metric_key": {
      "value": any,
      "confidence": number,
      "source": "conversation"
    }
  },
  "follow_up_questions": ["string"],
  "emotional_context": {
    "tone": "positive|neutral|concerned",
    "intensity": 1-10
  }
}

ANALYSIS GUIDELINES:
- Focus on actionable insights that help the user
- Extract specific values when mentioned (e.g., "slept 8 hours" → sleep_duration: 8)
- Detect emotional context and intensity
- Generate natural follow-up questions
- Keep insights practical and relevant`,
        },
        {
          role: 'user',
          content: `User: ${userMessage}\n\nAI Coach: ${aiResponse}`,
        },
      ],
      max_tokens: 600,
      temperature: 0.7,
    });

    const responseText = completion.choices[0]?.message?.content || '{}';

    try {
      const parsed = JSON.parse(responseText);
      return parsed as ParsedConversation;
    } catch (parseError) {
      logger.error(
        'Failed to parse insights extraction response',
        parseError instanceof Error ? parseError : new Error('Parse error')
      );
      return createSimplifiedFallback();
    }
  } catch (error) {
    logger.error(
      'Error in insights extraction',
      error instanceof Error ? error : new Error('Unknown error')
    );
    return createSimplifiedFallback();
  }
}

function createSimplifiedFallback(): ParsedConversation {
  return {
    data_types: {
      health: false,
      activity: false,
      mood: false,
      lifestyle: false,
      goals: false,
    },
    insights: {
      observations: [],
      recommendations: [],
      concerns: [],
    },
    extracted_metrics: {},
    goals_mentioned: [],
    emotional_context: { tone: 'neutral', intensity: 5 },
    follow_up_questions: [],
  };
}

/**
 * Store health metrics extracted from OCR data
 */
async function storeHealthMetricsFromOcr(
  ocrData: any,
  userId: string,
  date: string,
  supabase: any
) {
  try {
    const metricsToStore = [];

    // Map OCR data fields to standard metrics
    const metricMappings = {
      sleepScore: 'sleep_score',
      totalSleep: 'sleep_duration',
      timeInBed: 'time_in_bed',
      sleepEfficiency: 'sleep_efficiency',
      restingHeartRate: 'resting_heart_rate',
      heartRateVariability: 'heart_rate_variability',
      readiness_score: 'readiness',
      bodyTemperature: 'body_temperature',
      respiratoryRate: 'respiratory_rate',
      oxygenSaturation: 'oxygen_saturation',
      remSleep: 'rem_sleep',
      deepSleep: 'deep_sleep',
    };

    // Get all standard metrics to find their IDs
    const { data: standardMetrics } = await supabase
      .from('standard_metrics')
      .select('id, metric_key');

    if (!standardMetrics) return;

    const metricIdMap = standardMetrics.reduce((acc: any, metric: any) => {
      acc[metric.metric_key] = metric.id;
      return acc;
    }, {});

    // Process each metric from OCR data
    for (const [ocrField, metricKey] of Object.entries(metricMappings)) {
      const value = ocrData[ocrField];
      if (value !== null && value !== undefined && value !== '') {
        const metricId = metricIdMap[metricKey];
        if (metricId) {
          metricsToStore.push({
            user_id: userId,
            metric_id: metricId,
            metric_date: date,
            metric_value: typeof value === 'number' ? value : null,
            text_value: typeof value === 'string' ? value : null,
            source: 'ocr_extraction',
            confidence: 0.8, // OCR confidence
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      }
    }

    // Store all metrics
    if (metricsToStore.length > 0) {
      const { error } = await supabase
        .from('user_daily_metrics')
        .upsert(metricsToStore, {
          onConflict: 'user_id,metric_id,metric_date',
        });

      if (error) {
        console.error('Error storing health metrics from OCR:', error);
      } else {
        console.log(
          `✅ Stored ${metricsToStore.length} health metrics from OCR data`
        );
      }
    }
  } catch (error) {
    console.error('Error in storeHealthMetricsFromOcr:', error);
  }
}
