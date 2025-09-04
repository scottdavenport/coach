import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function generateDailyNarrative(userId: string, date: string) {
  try {
    const supabase = await createClient()
    
    console.log(`📝 Generating daily narrative for ${date}`)

    // Fetch conversation insights for the date
    const { data: insights, error: insightsError } = await supabase
      .from('conversation_insights')
      .select('*')
      .eq('user_id', userId)
      .eq('conversation_date', date)
      .order('created_at', { ascending: true })

    if (insightsError) {
      console.error('Error fetching insights:', insightsError)
      return { success: false, error: 'Failed to fetch insights' }
    }

    if (!insights || insights.length === 0) {
      console.log('No insights found for date:', date)
      return { success: true, message: 'No insights to process' }
    }

    // Fetch related file attachments via conversation links
    const { data: conversationIds } = await supabase
      .from('conversations')
      .select('id')
      .eq('user_id', userId)
      .gte('created_at', `${date}T00:00:00.000Z`)
      .lt('created_at', `${date}T23:59:59.999Z`)

    let fileAttachments: any[] = []
    if (conversationIds && conversationIds.length > 0) {
      const conversationIdList = conversationIds.map(c => c.id)
      
      const { data: attachments } = await supabase
        .from('conversation_file_attachments')
        .select(`
          user_uploads (
            file_name,
            file_type,
            ocr_text,
            processed_data,
            extracted_content,
            mime_type
          )
        `)
        .in('conversation_id', conversationIdList)
        .order('attachment_order', { ascending: true })
      
      fileAttachments = attachments || []
    }
    
    // Also get any files uploaded today (fallback)
    const { data: todaysFiles } = await supabase
      .from('user_uploads')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', `${date}T00:00:00.000Z`)
      .lt('created_at', `${date}T23:59:59.999Z`)
      .order('created_at', { ascending: true })
    
    // Combine linked files and today's files
    const allFileAttachments = [
      ...fileAttachments.map(f => f.user_uploads).filter(Boolean),
      ...(todaysFiles || [])
    ]

    // Fetch any health metrics for the date
    const { data: healthMetrics } = await supabase
      .from('user_daily_metrics')
      .select(`
        metric_value,
        text_value,
        standard_metrics (
          metric_key,
          display_name,
          unit
        )
      `)
      .eq('user_id', userId)
      .eq('metric_date', date)

    // Generate rich narrative using AI
    const narrative = await generateRichNarrative(insights, fileAttachments || [], healthMetrics || [])

    // Store multiple journal entries (one per major topic/activity)
    const journalEntries = await createJournalEntries(narrative, userId, date)

    // Save to daily_journal table
    const results = await Promise.all(
      journalEntries.map(entry => 
        supabase
          .from('daily_journal')
          .upsert({
            user_id: userId,
            journal_date: date,
            entry_type: entry.type,
            category: entry.category,
            content: entry.content,
            source: 'conversation',
            confidence: entry.confidence,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,journal_date,entry_type,category'
          })
      )
    )

    const errors = results.filter(r => r.error)
    if (errors.length > 0) {
      console.error('Some journal entries failed to save:', errors)
    }

    console.log('✅ Created/updated daily journal entries:', journalEntries.length)
    return { 
      success: true, 
      entriesCreated: journalEntries.length,
      insightsProcessed: insights.length,
      fileAttachmentsProcessed: fileAttachments?.length || 0
    }

  } catch (error) {
    console.error('Error generating narrative:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

async function generateRichNarrative(insights: any[], fileAttachments: any[], healthMetrics: any[]) {
  try {
    // Prepare comprehensive context for AI
    const conversationContext = insights.map(insight => ({
      message: insight.message,
      insights: insight.insights,
      dataTypes: insight.data_types,
      followUpQuestions: insight.follow_up_questions,
      timestamp: insight.created_at
    }))

    // Prepare file context
    const fileContext = allFileAttachments.map(attachment => ({
      fileName: attachment.file_name,
      fileType: attachment.file_type,
      ocrText: attachment.ocr_text,
      extractedContent: attachment.extracted_content,
      processedData: attachment.processed_data,
      mimeType: attachment.mime_type
    }))

    // Prepare health context
    const healthContext = healthMetrics.map(metric => ({
      metric: metric.standard_metrics?.display_name,
      value: metric.metric_value || metric.text_value,
      unit: metric.standard_metrics?.unit
    }))

    // Create AI prompt for rich narrative generation
    const prompt = `Create a rich, personal daily journal entry based on the user's conversations and data. Write in first person as if the user is writing their own diary entry. Be specific and contextual.

CONVERSATION DATA:
${conversationContext.map(c => `- Message: "${c.message}"\n  AI Insights: ${c.insights?.join(', ') || 'None'}\n  Data Types: ${Object.entries(c.dataTypes || {}).filter(([_, v]) => v).map(([k]) => k).join(', ') || 'None'}`).join('\n')}

${fileContext.length > 0 ? `UPLOADED FILES:\n${fileContext.map(f => `- ${f.fileName} (${f.fileType}):\n  OCR Text: ${f.ocrText?.substring(0, 300) || 'None'}\n  Extracted Content: ${f.extractedContent?.substring(0, 300) || 'None'}\n  Processed Data: ${JSON.stringify(f.processedData || {}).substring(0, 200)}...`).join('\n')}\n` : ''}

${healthContext.length > 0 ? `HEALTH METRICS:\n${healthContext.map(h => `- ${h.metric}: ${h.value}${h.unit || ''}`).join('\n')}\n` : ''}

IMPORTANT GUIDELINES:
- Use SPECIFIC details from conversations (restaurant names, locations, etc.)
- Include file upload context (heart rate data, workout analysis, etc.)
- Write as a personal diary entry in first person
- Be emotionally engaging and contextual
- Reference specific places, people, activities mentioned
- Include time context (morning, evening, etc.)

EXAMPLES:

For "We are heading to Open Range Grill in uptown sedona for dinner tonight":
{
  "activities": ["Dinner at Open Range Grill", "Exploring uptown Sedona"],
  "narrative": "Planning an exciting dinner at Open Range Grill in uptown Sedona tonight. Looking forward to exploring the local cuisine and enjoying the beautiful Sedona atmosphere. It feels great to have such a nice evening planned in this stunning location.",
  "notes": ["Dinner reservation at Open Range Grill", "Evening plans in uptown Sedona", "Anticipating local cuisine experience"],
  "health_context": "Evening dining experience - mindful eating and social connection",
  "follow_up": "How was the dinner at Open Range Grill? What was your favorite dish?"
}

For conversation with heart rate image upload:
{
  "activities": ["Heart rate monitoring", "Health tracking"],
  "narrative": "Tracked my heart rate today using uploaded data. It's great to stay on top of my health metrics and understand how my body is responding to daily activities.",
  "notes": ["Heart rate data: 72 bpm", "Health monitoring via image upload"],
  "health_context": "Heart rate: 72 bpm - within healthy range for resting heart rate",
  "follow_up": "How are you feeling physically today compared to yesterday?"
}

Format as JSON:
{
  "activities": ["Specific activity with details"],
  "narrative": "Rich personal narrative in first person with specific details...",
  "notes": ["Specific insight with context"],
  "health_context": "Health/wellness connection if relevant",
  "follow_up": "Thoughtful, specific follow-up question"
}`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "system",
        content: prompt
      }],
      max_tokens: 600,
      temperature: 0.7,
    })

    const responseText = completion.choices[0]?.message?.content || '{}'
    
    try {
      const parsed = JSON.parse(responseText)
      return {
        activities: parsed.activities || [],
        narrative: parsed.narrative || 'Had meaningful conversations today.',
        notes: parsed.notes || [],
        healthContext: parsed.health_context || '',
        followUp: parsed.follow_up || ''
      }
    } catch (parseError) {
      console.error('Error parsing AI narrative response:', parseError)
      // Fallback to basic narrative from insights
      return buildBasicNarrativeFromInsights(insights, allFileAttachments || [])
    }

  } catch (error) {
    console.error('Error generating rich narrative:', error)
    return buildBasicNarrativeFromInsights(insights, allFileAttachments || [])
  }
}

function buildBasicNarrativeFromInsights(insights: any[], fileAttachments: any[]) {
  const activities: string[] = []
  const notes: string[] = []
  let healthContext = ''

  insights.forEach(insight => {
    const message = insight.message.toLowerCase()
    
    // Extract specific activities from actual message content with rich context
    if (message.includes('open range grill')) {
      activities.push('Dinner at Open Range Grill in uptown Sedona')
    } else if (message.includes('dinner') && message.includes('sedona')) {
      activities.push('Dinner in Sedona')
    } else if (message.includes('dinner') && message.includes('restaurant')) {
      activities.push('Restaurant dinner')
    } else if (message.includes('dinner')) {
      activities.push('Dinner plans')
    }
    
    if (message.includes('uptown sedona')) {
      activities.push('Exploring uptown Sedona')
    } else if (message.includes('sedona')) {
      activities.push('Sedona exploration')
    }
    
    // More specific activity detection
    if (message.includes('golf')) activities.push('Golf outing')
    if (message.includes('hike')) activities.push('Hiking adventure')
    if (message.includes('workout')) activities.push('Workout session')
    if (message.includes('resort')) activities.push('Resort relaxation')
    if (message.includes('coffee')) activities.push('Coffee time')
    
    // Add insights as notes with better formatting
    if (insight.insights && Array.isArray(insight.insights)) {
      insight.insights.forEach((insightText: string) => {
        const cleanInsight = insightText
          .replace(/^User\s+/i, '')
          .replace(/^I\s+/i, '')
          .charAt(0).toUpperCase() + insightText.slice(1)
        notes.push(cleanInsight)
      })
    }
  })

  // Add rich file context to activities and health context
  fileAttachments.forEach(file => {
    if (file.file_type === 'image' && file.ocr_text) {
      const ocrLower = file.ocr_text.toLowerCase()
      
      // Heart rate data
      if (ocrLower.includes('heart rate') || ocrLower.includes('hr') || ocrLower.includes('bpm')) {
        activities.push('Heart rate monitoring')
        const hrMatch = file.ocr_text.match(/(\d+)\s*bpm/i)
        if (hrMatch) {
          healthContext += `Heart rate: ${hrMatch[1]} bpm recorded. `
        } else {
          healthContext += `Heart rate data captured from uploaded image. `
        }
      }
      
      // Workout data
      if (ocrLower.includes('workout') || ocrLower.includes('exercise') || ocrLower.includes('calories')) {
        activities.push('Workout session tracking')
        healthContext += `Workout metrics analyzed from uploaded screenshot. `
      }
      
      // Sleep data
      if (ocrLower.includes('sleep') || ocrLower.includes('hours slept')) {
        activities.push('Sleep tracking')
        healthContext += `Sleep data captured from uploaded image. `
      }
      
      // General health screenshot
      if (ocrLower.includes('health') || ocrLower.includes('vitals')) {
        activities.push('Health monitoring')
        healthContext += `Health metrics documented via screenshot. `
      }
    }
    
    // Document processing
    if (file.file_type === 'document') {
      if (file.mime_type?.includes('csv') || file.file_name?.endsWith('.csv')) {
        activities.push('Data analysis')
        healthContext += `CSV data uploaded and analyzed. `
        
        // Try to extract insights from processed data
        if (file.processed_data) {
          try {
            const data = typeof file.processed_data === 'string' 
              ? JSON.parse(file.processed_data) 
              : file.processed_data
            
            if (data.type === 'workout' || data.type === 'fitness') {
              activities.push('Workout data review')
              healthContext += `Fitness data from ${file.file_name} analyzed. `
            }
          } catch (e) {
            console.log('Could not parse processed data for', file.file_name)
          }
        }
      }
      
      if (file.extracted_content) {
        const contentLower = file.extracted_content.toLowerCase()
        if (contentLower.includes('nutrition') || contentLower.includes('calories')) {
          activities.push('Nutrition tracking')
          healthContext += `Nutrition data from ${file.file_name} reviewed. `
        }
        if (contentLower.includes('weight') || contentLower.includes('body')) {
          activities.push('Body metrics tracking')
          healthContext += `Body metrics from ${file.file_name} recorded. `
        }
      }
    }
    
    // Add file upload as an activity
    if (file.file_name) {
      notes.push(`Uploaded ${file.file_name} for analysis`)
    }
  })

  // Create rich narrative based on specific content
  let narrative = ''
  if (activities.some(a => a.includes('Open Range Grill'))) {
    narrative = `Planning an exciting dinner at Open Range Grill in uptown Sedona tonight. Looking forward to exploring the local cuisine and enjoying the beautiful Sedona atmosphere. It feels wonderful to have such a special evening planned in this stunning location.`
  } else if (activities.some(a => a.includes('Sedona'))) {
    narrative = `Spending time in the beautiful Sedona area. ${activities.filter(a => !a.includes('Sedona')).join(' and ')} made for a wonderful day of exploration and enjoyment in this magical place.`
  } else if (activities.length > 0) {
    narrative = `Today was filled with meaningful activities: ${activities.join(', ')}. Each experience added something special to the day.`
  } else {
    narrative = 'Had thoughtful conversations and meaningful exchanges today. Sometimes the best days come from genuine connection and sharing.'
  }

  return {
    activities: Array.from(new Set(activities)),
    narrative,
    notes: Array.from(new Set(notes)),
    healthContext: healthContext.trim(),
    followUp: activities.some(a => a.includes('dinner')) 
      ? 'How was the dining experience? What stood out most?'
      : activities.some(a => a.includes('heart rate') || a.includes('workout'))
      ? 'How are you feeling physically after reviewing your health data?'
      : 'What are you most looking forward to tomorrow?'
  }
}

async function createJournalEntries(narrative: any, userId: string, date: string) {
  const entries = []

  // Main reflection entry
  entries.push({
    type: 'reflection',
    category: 'lifestyle',
    content: narrative.narrative,
    confidence: 0.9
  })

  // Activity entries
  if (narrative.activities && narrative.activities.length > 0) {
    entries.push({
      type: 'note',
      category: 'fitness',
      content: `Activities: ${narrative.activities.join(', ')}`,
      confidence: 0.95
    })
  }

  // Health context entry
  if (narrative.healthContext) {
    entries.push({
      type: 'note',
      category: 'health',
      content: narrative.healthContext,
      confidence: 0.8
    })
  }

  // Follow-up entry for tomorrow
  if (narrative.followUp) {
    entries.push({
      type: 'goal',
      category: 'wellness',
      content: `Tomorrow's reflection: ${narrative.followUp}`,
      confidence: 0.7
    })
  }

  // Individual insight entries
  narrative.notes?.forEach((note: string, index: number) => {
    if (note && note.length > 10) { // Only meaningful notes
      entries.push({
        type: 'note',
        category: 'lifestyle',
        content: note,
        confidence: 0.8
      })
    }
  })

  return entries.slice(0, 8) // Limit to prevent spam
}

// Legacy function - kept for compatibility but not used in new rich narrative generation
function getActivityDescription(activity: string): string {
  const descriptions: { [key: string]: string } = {
    'Dining out': 'Enjoying a meal at a nice restaurant',
    'Exploring town': 'Walking around and taking in the local sights',
    'Outdoor activity': 'Time spent in nature and fresh air',
    'Exercise session': 'Physical activity and movement',
    'Resort time': 'Enjoying the beautiful resort surroundings',
    'Relaxation time': 'Taking time to unwind and enjoy'
  }
  return descriptions[activity] || 'Activity from natural conversation'
}
