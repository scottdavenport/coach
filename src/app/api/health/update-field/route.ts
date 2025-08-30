import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { fieldPath, value, date } = await request.json()

    if (!fieldPath || value === undefined) {
      return NextResponse.json({ error: 'Field path and value are required' }, { status: 400 })
    }

    const targetDate = date || new Date().toISOString().split('T')[0]
    
    // Get existing card
    const { data: existingCard, error: fetchError } = await supabase
      .from('daily_log_cards')
      .select('*')
      .eq('user_id', user.id)
      .eq('log_date', targetDate)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching daily log card:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch card' }, { status: 500 })
    }

    let updatedSummary = existingCard?.summary || {}

    // Update the specific field based on the path
    const pathParts = fieldPath.split('.')
    let current = updatedSummary

    // Navigate to the parent object
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i]
      if (!current[part]) {
        current[part] = {}
      }
      current = current[part]
    }

    const lastPart = pathParts[pathParts.length - 1]
    
    // Handle different field types
    if (pathParts[0] === 'context_data') {
      // For context data, preserve the metadata structure
      if (!current[lastPart]) {
        current[lastPart] = {
          value: value,
          confidence: 1.0, // User-edited content gets full confidence
          source: 'user_edited',
          timestamp: new Date().toISOString()
        }
      } else {
        // Update only the value, preserve other metadata
        current[lastPart] = {
          ...current[lastPart],
          value: value,
          source: 'user_edited',
          timestamp: new Date().toISOString()
        }
      }
    } else {
      // For direct fields (sleep_hours, mood, etc.)
      current[lastPart] = value
    }

    // Add last_updated timestamp
    updatedSummary.last_updated = new Date().toISOString()

    if (existingCard) {
      // Update existing card
      const { error: updateError } = await supabase
        .from('daily_log_cards')
        .update({
          summary: updatedSummary,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingCard.id)

      if (updateError) {
        console.error('Error updating daily log card:', updateError)
        return NextResponse.json({ error: 'Failed to update card' }, { status: 500 })
      }
    } else {
      // Create new card
      const { error: insertError } = await supabase
        .from('daily_log_cards')
        .insert({
          user_id: user.id,
          log_date: targetDate,
          summary: updatedSummary
        })

      if (insertError) {
        console.error('Error creating daily log card:', insertError)
        return NextResponse.json({ error: 'Failed to create card' }, { status: 500 })
      }
    }

    console.log('✅ **UPDATED FIELD:**')
    console.log('User ID:', user.id)
    console.log('Date:', targetDate)
    console.log('Field Path:', fieldPath)
    console.log('New Value:', value)
    console.log('Updated Summary:', JSON.stringify(updatedSummary, null, 2))
    console.log('---')

    return NextResponse.json({ 
      success: true,
      message: 'Field updated successfully',
      data: updatedSummary
    })

  } catch (error) {
    console.error('Update field API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}
