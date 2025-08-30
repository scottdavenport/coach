import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { events, contextData, dailySummary } = await request.json()

    console.log('💾 **STORING RICH CONTEXT DATA:**')
    console.log('User ID:', user.id)
    if (events && events.length > 0) {
      console.log('Events to store:', JSON.stringify(events, null, 2))
    }
    if (contextData && contextData.length > 0) {
      console.log('Context data to store:', JSON.stringify(contextData, null, 2))
    }
    if (dailySummary) {
      console.log('Daily summary to store:', JSON.stringify(dailySummary, null, 2))
    }
    console.log('---')

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
    } else if (userError) {
      console.error('Error checking user:', userError)
      return NextResponse.json({ error: 'Failed to verify user' }, { status: 500 })
    }

    const storedEvents = []
    const storedContextData = []

    // Store individual health events
    if (events && events.length > 0) {
      for (const event of events) {
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .insert({
            user_id: user.id,
            conversation_id: null, // Don't link to conversation for now since conversationId is not a UUID
            event_type: event.event_type,
            data: event.data
          })
          .select()
          .single()

        if (eventError) {
          console.error('Error storing event:', eventError)
          return NextResponse.json({ error: 'Failed to store event' }, { status: 500 })
        }

        storedEvents.push(eventData)
      }
    }

    // Store context data as events with special type
    if (contextData && contextData.length > 0) {
      for (const context of contextData) {
        const { data: contextEventData, error: contextError } = await supabase
          .from('events')
          .insert({
            user_id: user.id,
            conversation_id: null,
            event_type: 'note', // Use note type for context data
            data: {
              context_category: context.category,
              context_key: context.key,
              context_value: context.value,
              confidence: context.confidence,
              source: context.source,
              timestamp: new Date().toISOString()
            }
          })
          .select()
          .single()

        if (contextError) {
          console.error('Error storing context data:', contextError)
          return NextResponse.json({ error: 'Failed to store context data' }, { status: 500 })
        }

        storedContextData.push(contextEventData)
      }
    }

    // Store or update daily log card with rich context
    if (dailySummary || (contextData && contextData.length > 0)) {
      const today = new Date().toISOString().split('T')[0]
      
      // Check if we already have a log card for today
      const { data: existingCard } = await supabase
        .from('daily_log_cards')
        .select('*')
        .eq('user_id', user.id)
        .eq('log_date', today)
        .single()

      // Build rich daily summary
      const existingContextData = existingCard?.summary?.context_data || {}
      const newContextData = contextData ? contextData.reduce((acc: any, context: any) => {
        if (!acc[context.category]) acc[context.category] = {}
        acc[context.category][context.key] = {
          value: context.value,
          confidence: context.confidence,
          source: context.source,
          timestamp: new Date().toISOString()
        }
        return acc
      }, existingContextData) : existingContextData

      const richSummary = {
        ...(existingCard?.summary || {}),
        ...(dailySummary || {}),
        context_data: newContextData,
        last_updated: new Date().toISOString()
      }

      console.log('🔧 **MERGING CONTEXT DATA:**')
      console.log('Existing context data:', JSON.stringify(existingContextData, null, 2))
      console.log('New context data:', JSON.stringify(contextData, null, 2))
      console.log('Merged context data:', JSON.stringify(newContextData, null, 2))
      console.log('---')

      if (existingCard) {
        // Update existing card
        const { error: updateError } = await supabase
          .from('daily_log_cards')
          .update({
            summary: richSummary,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingCard.id)

        if (updateError) {
          console.error('Error updating daily log card:', updateError)
        }
      } else {
        // Create new card
        const { error: insertError } = await supabase
          .from('daily_log_cards')
          .insert({
            user_id: user.id,
            log_date: today,
            summary: richSummary
          })

        if (insertError) {
          console.error('Error creating daily log card:', insertError)
        }
      }
    }

    return NextResponse.json({ 
      success: true,
      storedEvents,
      storedContextData,
      message: `Successfully stored ${storedEvents.length} health events and ${storedContextData.length} context data points`
    })

  } catch (error) {
    console.error('Health store API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}
