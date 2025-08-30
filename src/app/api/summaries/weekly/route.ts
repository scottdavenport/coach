import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { weekStart } = await request.json()

    // Get the week's daily cards
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    
    const { data: weeklyCards } = await supabase
      .from('daily_log_cards')
      .select('summary, log_date')
      .eq('user_id', user.id)
      .gte('log_date', weekStart)
      .lte('log_date', weekEnd.toISOString().split('T')[0])
      .order('log_date', { ascending: true })

    if (!weeklyCards || weeklyCards.length === 0) {
      return NextResponse.json({ error: 'No data found for this week' }, { status: 404 })
    }

    // Get conversations for the week
    const weekStartDate = new Date(weekStart)
    const weekEndDate = new Date(weekEnd)
    
    const { data: weeklyConversations } = await supabase
      .from('conversations')
      .select('message, message_type, created_at')
      .eq('user_id', user.id)
      .gte('created_at', weekStartDate.toISOString())
      .lte('created_at', weekEndDate.toISOString())
      .order('created_at', { ascending: true })

    // Prepare data for summary generation
    const summaryData = {
      daily_cards: weeklyCards,
      conversations: weeklyConversations || [],
      week_start: weekStart,
      week_end: weekEnd.toISOString().split('T')[0]
    }

    // Generate weekly summary using OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a health coach analyzing a user's weekly data. Create a concise, insightful summary focusing on:
1. Key patterns and trends
2. Notable achievements or challenges
3. Health insights and correlations
4. Recommendations for the following week

Keep the summary under 300 words and focus on actionable insights.`
        },
        {
          role: "user",
          content: `Analyze this weekly health data and create a summary:

${JSON.stringify(summaryData, null, 2)}`
        }
      ],
      max_tokens: 500,
      temperature: 0.7
    })

    const summary = completion.choices[0].message.content

    // Extract trends from the data
    const trends = extractWeeklyTrends(weeklyCards)

    // Store the weekly summary
    const { data: storedSummary, error: storeError } = await supabase
      .from('weekly_summaries')
      .upsert({
        user_id: user.id,
        week_start: weekStart,
        summary: summary,
        trends: trends,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,week_start'
      })
      .select()
      .single()

    if (storeError) {
      console.error('Error storing weekly summary:', storeError)
      return NextResponse.json({ error: 'Failed to store summary' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      summary: storedSummary
    })

  } catch (error) {
    console.error('Weekly summary generation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function extractWeeklyTrends(weeklyCards: Array<{summary?: Record<string, unknown>, log_date: string}>): Record<string, any> {
  const trends: Record<string, any> = {}
  
  if (weeklyCards.length === 0) return trends

  // Sleep trends
  const sleepHours = weeklyCards
    .map(card => card.summary?.sleep_hours)
    .filter(hours => hours !== undefined && hours !== null)
    .map(hours => Number(hours))
  
  if (sleepHours.length > 0) {
    const avgSleep = sleepHours.reduce((a, b) => a + b, 0) / sleepHours.length
    const minSleep = Math.min(...sleepHours)
    const maxSleep = Math.max(...sleepHours)
    
    trends.sleep_trend = {
      average: avgSleep.toFixed(1),
      range: `${minSleep.toFixed(1)}-${maxSleep.toFixed(1)}`,
      consistency: maxSleep - minSleep <= 2 ? 'consistent' : 'variable',
      days_tracked: sleepHours.length
    }
  }

  // Energy trends
  const energyLevels = weeklyCards
    .map(card => card.summary?.energy)
    .filter(energy => energy !== undefined && energy !== null)
    .map(energy => Number(energy))
  
  if (energyLevels.length > 0) {
    const avgEnergy = energyLevels.reduce((a, b) => a + b, 0) / energyLevels.length
    const recentEnergy = energyLevels[energyLevels.length - 1]
    
    trends.energy_trend = {
      average: avgEnergy.toFixed(1),
      recent: recentEnergy,
      direction: recentEnergy > avgEnergy + 1 ? 'improving' : 
                 recentEnergy < avgEnergy - 1 ? 'declining' : 'stable',
      days_tracked: energyLevels.length
    }
  }

  // Mood trends
  const moods = weeklyCards
    .map(card => card.summary?.mood)
    .filter(mood => mood !== undefined && mood !== null)
    .map(mood => Number(mood))
  
  if (moods.length > 0) {
    const avgMood = moods.reduce((a, b) => a + b, 0) / moods.length
    const recentMood = moods[moods.length - 1]
    
    trends.mood_trend = {
      average: avgMood.toFixed(1),
      recent: recentMood,
      direction: recentMood > avgMood + 1 ? 'improving' : 
                 recentMood < avgMood - 1 ? 'declining' : 'stable',
      days_tracked: moods.length
    }
  }

  // Workout consistency
  const workoutDays = weeklyCards.filter(card => 
    card.summary?.context_data?.workout || 
    card.summary?.workout_completed
  ).length
  
  if (workoutDays > 0) {
    const consistency = (workoutDays / weeklyCards.length) * 100
    trends.workout_consistency = {
      days: workoutDays,
      total_days: weeklyCards.length,
      percentage: consistency.toFixed(1),
      rating: consistency >= 70 ? 'excellent' : 
              consistency >= 50 ? 'good' : 'needs_improvement'
    }
  }

  return trends
}
