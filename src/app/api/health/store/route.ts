import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { mapToStructuredMetrics } from '@/lib/metric-mapping';
import {
  createRateLimit,
  RATE_LIMITS,
  getClientIdentifier,
} from '@/lib/rate-limiter';
import { validateRequestBody, healthSchemas } from '@/lib/input-validation';

export async function POST(request: NextRequest) {
  try {
    // Add rate limiting
    const rateLimit = createRateLimit(RATE_LIMITS.general);
    const clientId = getClientIdentifier(request);
    rateLimit(clientId, 'health-store');

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Add input validation
    const body = await request.json();
    const validation = validateRequestBody(body, healthSchemas.eventData);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: (validation as any).details },
        { status: 400 }
      );
    }

    const { events, contextData, dailySummary } = validation.data;

    console.log('💾 **STORING RICH CONTEXT DATA:**');
    console.log('User ID:', user.id);
    if (events && events.length > 0) {
      console.log('Events to store:', JSON.stringify(events, null, 2));
    }
    if (contextData && contextData.length > 0) {
      console.log(
        'Context data to store:',
        JSON.stringify(contextData, null, 2)
      );
    }
    if (dailySummary) {
      console.log(
        'Daily summary to store:',
        JSON.stringify(dailySummary, null, 2)
      );
    }
    console.log('---');

    // Ensure user exists in the users table
    const { error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single();

    if (userError && userError.code === 'PGRST116') {
      // User doesn't exist, create them
      const { error: createUserError } = await supabase.from('users').insert({
        id: user.id,
        email: user.email,
      });

      if (createUserError) {
        console.error('Error creating user:', createUserError);
        return NextResponse.json(
          { error: 'Failed to create user' },
          { status: 500 }
        );
      }
    } else if (userError) {
      console.error('Error checking user:', userError);
      return NextResponse.json(
        { error: 'Failed to verify user' },
        { status: 500 }
      );
    }

    const today = new Date().toISOString().split('T')[0];
    const storedMetrics = [];
    const storedJournalEntries = [];

    // Use service client for data storage operations
    const serviceSupabase = await createServiceClient();
    console.log('🔍 Service client created:', !!serviceSupabase);
    console.log('🔍 Service client URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log(
      '🔍 Service role key exists:',
      !!process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Store metrics using new structured system
    if (dailySummary) {
      // Map daily summary to structured metrics
      const parsedMetrics = mapToStructuredMetrics(
        dailySummary,
        'conversation'
      );

      // Get standard metrics to find metric IDs
      const { data: standardMetrics, error: metricsError } =
        await serviceSupabase.from('standard_metrics').select('id, metric_key');

      if (metricsError) {
        console.error('Error fetching standard metrics:', metricsError);
      } else {
        // Create metric ID mapping
        const metricIdMap = new Map(
          standardMetrics?.map(m => [m.metric_key, m.id]) || []
        );

        // Store each parsed metric
        for (const parsedMetric of parsedMetrics) {
          const metricId = metricIdMap.get(parsedMetric.metric);

          if (metricId) {
            const { data: metricData, error: metricError } =
              await serviceSupabase
                .from('user_daily_metrics')
                .upsert(
                  {
                    user_id: user.id,
                    metric_id: metricId,
                    metric_date: today,
                    metric_value:
                      typeof parsedMetric.value === 'number'
                        ? parsedMetric.value
                        : null,
                    text_value:
                      typeof parsedMetric.value === 'string'
                        ? parsedMetric.value
                        : null,
                    boolean_value:
                      typeof parsedMetric.value === 'boolean'
                        ? parsedMetric.value
                        : null,
                    source: parsedMetric.source,
                    confidence: parsedMetric.confidence,
                  },
                  {
                    onConflict: 'user_id,metric_id,metric_date',
                  }
                )
                .select()
                .single();

            if (metricError) {
              console.error(
                `Error storing metric ${parsedMetric.metric}:`,
                metricError
              );
            } else {
              storedMetrics.push(metricData);
            }
          }
        }
      }
    }

    // Store context data as journal entries
    if (contextData && contextData.length > 0) {
      for (const context of contextData) {
        // Determine entry type based on category and key
        let entryType = 'note';
        if (context.key.includes('tip') || context.key.includes('advice')) {
          entryType = 'tip';
        } else if (
          context.key.includes('goal') ||
          context.key.includes('intention')
        ) {
          entryType = 'goal';
        }

        // Determine category
        let category = 'lifestyle';
        if (context.category === 'sleep' || context.category === 'wellness') {
          category = 'wellness';
        } else if (
          context.category === 'workout' ||
          context.category === 'fitness'
        ) {
          category = 'fitness';
        } else if (
          context.category === 'biometric' ||
          context.category === 'health'
        ) {
          category = 'health';
        }

        const { data: journalData, error: journalError } = await serviceSupabase
          .from('daily_journal')
          .insert({
            user_id: user.id,
            journal_date: today,
            entry_type: entryType,
            category: category,
            content: Array.isArray(context.value)
              ? context.value.join('\n')
              : context.value,
            source: 'conversation',
            confidence: context.confidence || 0.8,
          })
          .select()
          .single();

        if (journalError) {
          console.error('Error storing journal entry:', journalError);
        } else {
          storedJournalEntries.push(journalData);
        }
      }
    }

    // Store workout events as daily activities
    const storedActivities = [];
    if (events && events.length > 0) {
      for (const event of events) {
        if (event.event_type === 'workout' || event.event_type === 'activity') {
          const { data: activityData, error: activityError } =
            await serviceSupabase
              .from('daily_activities')
              .insert({
                user_id: user.id,
                activity_date: today,
                activity_type: event.data.activity_type || 'workout',
                status: 'completed',
                title:
                  event.data.workout_type ||
                  event.data.activity_type ||
                  'Workout',
                description: event.data.description || '',
                completed_data: event.data,
                source: 'conversation',
                confidence: event.confidence || 0.8,
              })
              .select()
              .single();

          if (activityError) {
            console.error('Error storing workout activity:', activityError);
          } else {
            storedActivities.push(activityData);
          }
        }
      }
    }

    console.log('✅ **STORAGE COMPLETE:**');
    console.log(`- Stored ${storedMetrics.length} metrics`);
    console.log(`- Stored ${storedJournalEntries.length} journal entries`);
    console.log(`- Stored ${storedActivities.length} activities`);
    console.log('---');

    return NextResponse.json({
      success: true,
      message: 'Health data stored successfully',
      data: {
        metrics: storedMetrics,
        journalEntries: storedJournalEntries,
        activities: storedActivities,
      },
    });
  } catch (error: any) {
    // Handle rate limit errors
    if (error.statusCode === 429) {
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

    console.error('Health store error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
