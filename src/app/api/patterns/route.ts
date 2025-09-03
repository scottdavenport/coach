import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PatternRecognitionService } from '@/lib/pattern-recognition'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const daysBack = parseInt(searchParams.get('days') || '30')
    
    console.log(`🔍 Pattern recognition requested for user ${user.id} over last ${daysBack} days`)

    // Initialize pattern recognition service
    const patternService = new PatternRecognitionService()
    
    // Analyze user patterns
    const userPatterns = await patternService.analyzeUserPatterns(user.id, daysBack)
    
    console.log(`✅ Pattern analysis complete for user ${user.id}`)
    console.log(`📊 Found ${userPatterns.conversationPatterns.length} conversation patterns`)
    console.log(`📊 Found ${userPatterns.topicPreferences.length} topic preferences`)
    console.log(`📊 Found ${userPatterns.activityPatterns.length} activity patterns`)
    console.log(`📊 Found ${userPatterns.moodPatterns.length} mood patterns`)

    return NextResponse.json({
      success: true,
      patterns: userPatterns,
      analysisDate: new Date().toISOString(),
      analysisPeriod: `${daysBack} days`
    })

  } catch (error) {
    console.error('Error in pattern recognition API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, data } = body

    switch (action) {
      case 'analyze_patterns':
        const daysBack = data?.days || 30
        const patternService = new PatternRecognitionService()
        const userPatterns = await patternService.analyzeUserPatterns(user.id, daysBack)
        
        return NextResponse.json({
          success: true,
          patterns: userPatterns,
          action: 'analyze_patterns'
        })

      case 'get_insights':
        // Get recent conversation insights for quick analysis
        const { data: insights, error: insightsError } = await supabase
          .from('conversation_insights')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10)

        if (insightsError) {
          throw insightsError
        }

        return NextResponse.json({
          success: true,
          insights: insights || [],
          action: 'get_insights'
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Error in pattern recognition POST API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
