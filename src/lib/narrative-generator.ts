import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';
import {
  generateWorkoutRecommendations,
  getWorkoutContextSummary,
} from '@/lib/workout-recommendations';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateDailyNarrative(userId: string, date: string) {
  try {
    const supabase = await createClient();

    console.log(`📝 Generating daily narrative for ${date}`);

    // Fetch conversation insights for the date
    const { data: insights, error: insightsError } = await supabase
      .from('conversation_insights')
      .select('*')
      .eq('user_id', userId)
      .eq('conversation_date', date)
      .order('created_at', { ascending: true });

    if (insightsError) {
      console.error('Error fetching insights:', insightsError);
      return { success: false, error: 'Failed to fetch insights' };
    }

    if (!insights || insights.length === 0) {
      console.log('No insights found for date:', date);
      return { success: true, message: 'No insights to process' };
    }

    // Fetch related file attachments via conversation links
    const { data: conversationIds } = await supabase
      .from('conversations')
      .select('id')
      .eq('user_id', userId)
      .gte('created_at', `${date}T00:00:00.000Z`)
      .lt('created_at', `${date}T23:59:59.999Z`);

    let fileAttachments: any[] = [];
    if (conversationIds && conversationIds.length > 0) {
      const conversationIdList = conversationIds.map(c => c.id);

      const { data: attachments } = await supabase
        .from('conversation_file_attachments')
        .select(
          `
          user_uploads (
            file_name,
            file_type,
            ocr_text,
            processed_data,
            extracted_content,
            mime_type
          )
        `
        )
        .in('conversation_id', conversationIdList)
        .order('attachment_order', { ascending: true });

      fileAttachments = attachments || [];
    }

    // Also get any files uploaded today (fallback)
    const { data: todaysFiles } = await supabase
      .from('user_uploads')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', `${date}T00:00:00.000Z`)
      .lt('created_at', `${date}T23:59:59.999Z`)
      .order('created_at', { ascending: true });

    // Combine linked files and today's files
    const allFileAttachments = [
      ...fileAttachments.map(f => f.user_uploads).filter(Boolean),
      ...(todaysFiles || []),
    ];

    // Fetch any health metrics for the date
    const { data: healthMetrics } = await supabase
      .from('user_daily_metrics')
      .select(
        `
        metric_value,
        text_value,
        standard_metrics (
          metric_key,
          display_name,
          unit
        )
      `
      )
      .eq('user_id', userId)
      .eq('metric_date', date);

    // Fetch existing journal content for intelligent merging
    const { data: existingEntries } = await supabase
      .from('daily_journal')
      .select('entry_type, category, content')
      .eq('user_id', userId)
      .eq('journal_date', date);

    // Build existing content string for AI prompt
    let existingContent = '';
    if (existingEntries && existingEntries.length > 0) {
      const reflectionEntry = existingEntries.find(
        e => e.entry_type === 'reflection'
      );
      const healthEntry = existingEntries.find(e => e.category === 'health');
      const insightEntries = existingEntries.filter(
        e => e.entry_type === 'note' && e.category === 'lifestyle'
      );

      if (reflectionEntry) {
        existingContent += `Current narrative: ${reflectionEntry.content}\n`;
      }
      if (healthEntry) {
        existingContent += `Current health context: ${healthEntry.content}\n`;
      }
      if (insightEntries.length > 0) {
        existingContent += `Current insights: ${insightEntries.map(e => e.content).join(', ')}\n`;
      }
    }

    // Generate workout recommendations based on health metrics
    const workoutRecommendations = await generateWorkoutRecommendations(
      userId,
      date
    );
    const workoutContext = getWorkoutContextSummary(workoutRecommendations);

    // Generate rich narrative using AI with existing content for intelligent merging
    const narrative = await generateRichNarrative(
      insights,
      allFileAttachments || [],
      healthMetrics || [],
      existingContent,
      workoutContext
    );

    // Store single comprehensive journal entry (replaces entire day's content)
    const journalEntries = await createJournalEntries(narrative, userId, date);

    // Delete existing entries for this date to replace with new comprehensive entry
    if (existingEntries && existingEntries.length > 0) {
      const { error: deleteError } = await supabase
        .from('daily_journal')
        .delete()
        .eq('user_id', userId)
        .eq('journal_date', date);

      if (deleteError) {
        console.error('Error deleting existing journal entries:', deleteError);
      } else {
        console.log(
          `🗑️ Deleted ${existingEntries.length} existing journal entries for date: ${date}`
        );
      }
    }

    console.log(
      `📊 Journal entry regeneration: ${journalEntries.length} new entries replacing previous content`
    );

    // Save all new entries to daily_journal table
    const results = [];
    for (const entry of journalEntries) {
      try {
        const { data, error } = await supabase
          .from('daily_journal')
          .insert({
            user_id: userId,
            journal_date: date,
            entry_type: entry.type,
            category: entry.category,
            content: entry.content,
            source: 'conversation',
            confidence: entry.confidence,
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) {
          console.error('Error saving journal entry:', error);
          results.push({ error });
        } else {
          console.log(
            '✅ Saved journal entry:',
            entry.type,
            entry.category,
            entry.content.substring(0, 50) + '...'
          );
          results.push({ data });
        }
      } catch (err) {
        console.error('Exception saving journal entry:', err);
        results.push({ error: err });
      }
    }

    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
      console.error('Some journal entries failed to save:', errors);
    }

    console.log(
      '✅ Created/updated daily journal entries:',
      journalEntries.length
    );
    return {
      success: true,
      entriesCreated: journalEntries.length,
      entriesFiltered: 0, // No filtering in new system - entries are replaced
      insightsProcessed: insights.length,
      fileAttachmentsProcessed: fileAttachments?.length || 0,
    };
  } catch (error) {
    console.error('Error generating narrative:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function generateRichNarrative(
  insights: any[],
  fileAttachments: any[],
  healthMetrics: any[],
  existingContent?: string,
  workoutContext?: string
) {
  try {
    // Prepare comprehensive context for AI
    const conversationContext = insights.map(insight => ({
      message: insight.message,
      insights: insight.insights,
      dataTypes: insight.data_types,
      followUpQuestions: insight.follow_up_questions,
      timestamp: insight.created_at,
    }));

    // Prepare file context
    const fileContext = fileAttachments.map(attachment => ({
      fileName: attachment.file_name,
      fileType: attachment.file_type,
      ocrText: attachment.ocr_text,
      extractedContent: attachment.extracted_content,
      processedData: attachment.processed_data,
      mimeType: attachment.mime_type,
    }));

    // Prepare health context
    const healthContext = healthMetrics.map(metric => ({
      metric: metric.standard_metrics?.display_name,
      value: metric.metric_value || metric.text_value,
      unit: metric.standard_metrics?.unit,
    }));

    // Create AI prompt for rich narrative generation
    const prompt = `Create a concise, coherent daily journal entry that intelligently merges new information with existing content. Write in first person with specific, concrete details. Follow these writing guidelines:

WRITING STYLE RULES:
- Be specific and concrete - avoid vague terms like "experiences," "great," "amazing"
- Use active voice and contractions for warmth
- Avoid corporate jargon and marketing fluff
- Be direct and confident - no softening phrases
- Personal but not flowery - reduce emotional language significantly
- Focus on concrete activities rather than abstract concepts

CONVERSATION DATA:
${conversationContext
  .map(
    c =>
      `- Message: "${c.message}"\n  AI Insights: ${c.insights?.join(', ') || 'None'}\n  Data Types: ${
        Object.entries(c.dataTypes || {})
          .filter(([_, v]) => v)
          .map(([k]) => k)
          .join(', ') || 'None'
      }`
  )
  .join('\n')}

${fileContext.length > 0 ? `UPLOADED FILES:\n${fileContext.map(f => `- ${f.fileName} (${f.fileType}):\n  OCR Text: ${f.ocrText?.substring(0, 300) || 'None'}\n  Extracted Content: ${f.extractedContent?.substring(0, 300) || 'None'}\n  Processed Data: ${JSON.stringify(f.processedData || {}).substring(0, 200)}...`).join('\n')}\n` : ''}

${healthContext.length > 0 ? `HEALTH METRICS:\n${healthContext.map(h => `- ${h.metric}: ${h.value}${h.unit || ''}`).join('\n')}\n` : ''}

${existingContent ? `EXISTING JOURNAL CONTENT FOR TODAY:\n${existingContent}\n\nMERGE new information with existing content intelligently. Don't completely rewrite - enhance and build upon what's already there.\n` : ''}

${workoutContext ? `WORKOUT RECOMMENDATIONS:\n${workoutContext}\n\nInclude this context in your health insights if relevant.\n` : ''}

REQUIREMENTS:
- Main narrative: 1-2 sentences with activities and brief context
- Use specific details from conversations (restaurant names, locations, etc.)
- Include file upload context when relevant
- Generate max 5 health insights that are actionable and specific
- Focus on concrete activities and patterns
- Avoid emotional language and vague superlatives

EXAMPLES:

For "We are heading to Open Range Grill in uptown sedona for dinner tonight":
{
  "narrative": "Planning dinner at Open Range Grill in uptown Sedona tonight. Looking forward to exploring the local dining scene in this beautiful area.",
  "health_context": "Evening dining - mindful eating and social connection",
  "insights": ["Social dining promotes mental wellness", "Exploring new restaurants supports cultural engagement", "Evening activities in beautiful locations boost mood"]
}

For conversation with heart rate image upload:
{
  "narrative": "Tracked heart rate data today. Monitoring biometrics helps me understand how my body responds to daily activities.",
  "health_context": "Heart rate: 72 bpm - within healthy range for resting heart rate",
  "insights": ["Consistent heart rate monitoring builds health awareness", "Regular biometric tracking helps identify patterns", "Technology-assisted health monitoring supports wellness goals"]
}

Format as JSON:
{
  "narrative": "Concise 1-2 sentence narrative with specific details...",
  "health_context": "Health/wellness connection if relevant",
  "insights": ["Specific insight with context", "Max 5 insights total"]
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: prompt,
        },
      ],
      max_tokens: 600,
      temperature: 0.7,
    });

    const responseText = completion.choices[0]?.message?.content || '{}';

    try {
      const parsed = JSON.parse(responseText);
      return {
        activities: parsed.activities || [],
        narrative: parsed.narrative || 'Had meaningful conversations today.',
        notes: parsed.notes || [],
        healthContext: parsed.health_context || '',
        followUp: parsed.follow_up || '',
      };
    } catch (parseError) {
      console.error('Error parsing AI narrative response:', parseError);
      // Fallback to basic narrative from insights
      return buildBasicNarrativeFromInsights(insights, fileAttachments || []);
    }
  } catch (error) {
    console.error('Error generating rich narrative:', error);
    return buildBasicNarrativeFromInsights(insights, fileAttachments || []);
  }
}

function buildBasicNarrativeFromInsights(
  insights: any[],
  fileAttachments: any[]
) {
  const activities: string[] = [];
  const notes: string[] = [];
  let healthContext = '';

  insights.forEach(insight => {
    const message = insight.message.toLowerCase();

    // Extract specific activities from actual message content with rich context
    if (message.includes('open range grill')) {
      activities.push('Dinner at Open Range Grill in uptown Sedona');
    } else if (message.includes('dinner') && message.includes('sedona')) {
      activities.push('Dinner in Sedona');
    } else if (message.includes('dinner') && message.includes('restaurant')) {
      activities.push('Restaurant dinner');
    } else if (message.includes('dinner')) {
      activities.push('Dinner plans');
    }

    if (message.includes('uptown sedona')) {
      activities.push('Exploring uptown Sedona');
    } else if (message.includes('sedona')) {
      activities.push('Sedona exploration');
    }

    // More specific activity detection
    if (message.includes('golf')) activities.push('Golf outing');
    if (message.includes('hike')) activities.push('Hiking adventure');
    if (message.includes('workout')) activities.push('Workout session');
    if (message.includes('resort')) activities.push('Resort relaxation');
    if (message.includes('coffee')) activities.push('Coffee time');

    // Generate health-focused insights from activities and context
    if (insight.insights && Array.isArray(insight.insights)) {
      insight.insights.forEach((insightText: string) => {
        // Transform basic insights into health/wellness focused ones
        const lowerInsight = insightText.toLowerCase();

        if (
          lowerInsight.includes('dinner') &&
          lowerInsight.includes('restaurant')
        ) {
          notes.push(
            'Social dining experiences support mental wellness and community connection'
          );
          notes.push(
            'Mindful restaurant choices can align with nutrition goals'
          );
        } else if (
          lowerInsight.includes('outdoor') ||
          lowerInsight.includes('walk') ||
          lowerInsight.includes('hike')
        ) {
          notes.push(
            'Outdoor activities boost vitamin D and improve cardiovascular health'
          );
          notes.push(
            'Nature exposure reduces stress and enhances mental clarity'
          );
        } else if (
          lowerInsight.includes('workout') ||
          lowerInsight.includes('exercise')
        ) {
          notes.push(
            'Regular physical activity strengthens both body and mind'
          );
          notes.push('Exercise consistency builds long-term health resilience');
        } else if (
          lowerInsight.includes('sleep') ||
          lowerInsight.includes('rest')
        ) {
          notes.push(
            'Quality sleep is foundational for recovery and cognitive function'
          );
          notes.push(
            'Sleep patterns directly impact energy levels and mood regulation'
          );
        } else if (
          lowerInsight.includes('coffee') ||
          lowerInsight.includes('energy')
        ) {
          notes.push(
            'Mindful caffeine intake can optimize energy without disrupting sleep'
          );
        } else {
          // Generic wellness insight for any activity
          notes.push(
            'Engaging in meaningful activities contributes to overall life satisfaction'
          );
        }
      });
    }
  });

  // Add rich file context to activities and health context
  fileAttachments.forEach(file => {
    if (file.file_type === 'image' && file.ocr_text) {
      const ocrLower = file.ocr_text.toLowerCase();

      // Heart rate data
      if (
        ocrLower.includes('heart rate') ||
        ocrLower.includes('hr') ||
        ocrLower.includes('bpm')
      ) {
        activities.push('Heart rate monitoring');
        const hrMatch = file.ocr_text.match(/(\d+)\s*bpm/i);
        if (hrMatch) {
          healthContext += `Heart rate: ${hrMatch[1]} bpm recorded. `;
        } else {
          healthContext += `Heart rate data captured from uploaded image. `;
        }
      }

      // Workout data
      if (
        ocrLower.includes('workout') ||
        ocrLower.includes('exercise') ||
        ocrLower.includes('calories')
      ) {
        activities.push('Workout session tracking');
        healthContext += `Workout metrics analyzed from uploaded screenshot. `;
      }

      // Sleep data
      if (ocrLower.includes('sleep') || ocrLower.includes('hours slept')) {
        activities.push('Sleep tracking');
        healthContext += `Sleep data captured from uploaded image. `;
      }

      // General health screenshot
      if (ocrLower.includes('health') || ocrLower.includes('vitals')) {
        activities.push('Health monitoring');
        healthContext += `Health metrics documented via screenshot. `;
      }
    }

    // Document processing
    if (file.file_type === 'document') {
      if (file.mime_type?.includes('csv') || file.file_name?.endsWith('.csv')) {
        activities.push('Data analysis');
        healthContext += `CSV data uploaded and analyzed. `;

        // Try to extract insights from processed data
        if (file.processed_data) {
          try {
            const data =
              typeof file.processed_data === 'string'
                ? JSON.parse(file.processed_data)
                : file.processed_data;

            if (data.type === 'workout' || data.type === 'fitness') {
              activities.push('Workout data review');
              healthContext += `Fitness data from ${file.file_name} analyzed. `;
            }
          } catch (e) {
            console.log('Could not parse processed data for', file.file_name);
          }
        }
      }

      if (file.extracted_content) {
        const contentLower = file.extracted_content.toLowerCase();
        if (
          contentLower.includes('nutrition') ||
          contentLower.includes('calories')
        ) {
          activities.push('Nutrition tracking');
          healthContext += `Nutrition data from ${file.file_name} reviewed. `;
        }
        if (contentLower.includes('weight') || contentLower.includes('body')) {
          activities.push('Body metrics tracking');
          healthContext += `Body metrics from ${file.file_name} recorded. `;
        }
      }
    }

    // Add file upload as an activity
    if (file.file_name) {
      notes.push(`Uploaded ${file.file_name} for analysis`);
    }
  });

  // Create rich narrative based on specific content
  let narrative = '';
  if (activities.some(a => a.includes('Open Range Grill'))) {
    narrative = `Planning an exciting dinner at Open Range Grill in uptown Sedona tonight. Looking forward to exploring the local cuisine and enjoying the beautiful Sedona atmosphere. It feels wonderful to have such a special evening planned in this stunning location.`;
  } else if (activities.some(a => a.includes('Sedona'))) {
    narrative = `Spending time in the beautiful Sedona area. ${activities.filter(a => !a.includes('Sedona')).join(' and ')} made for a wonderful day of exploration and enjoyment in this magical place.`;
  } else if (activities.length > 0) {
    narrative = `Today was filled with meaningful activities: ${activities.join(', ')}. Each experience added something special to the day.`;
  } else {
    narrative =
      'Had thoughtful conversations and meaningful exchanges today. Sometimes the best days come from genuine connection and sharing.';
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
        : 'What are you most looking forward to tomorrow?',
  };
}

async function createJournalEntries(
  narrative: any,
  userId: string,
  date: string
) {
  const entries = [];

  // Add timestamp to make entries unique for accumulation (kept internally for deduplication)
  const timestamp = new Date().toISOString().split('.')[0];

  // Single comprehensive reflection entry - replaces entire day's content
  if (narrative.narrative) {
    entries.push({
      type: 'reflection',
      category: 'lifestyle',
      content: narrative.narrative, // No timestamp prefix in displayed content
      confidence: 0.9,
      internal_timestamp: timestamp, // Keep timestamp internally for deduplication
    });
  }

  // Health context entry (if present)
  if (narrative.health_context) {
    entries.push({
      type: 'note',
      category: 'health',
      content: narrative.health_context, // No timestamp prefix in displayed content
      confidence: 0.8,
      internal_timestamp: timestamp,
    });
  }

  // Key insights entries (max 5) - consolidated from notes
  if (narrative.insights && narrative.insights.length > 0) {
    const limitedInsights = narrative.insights.slice(0, 5); // Max 5 insights
    limitedInsights.forEach((insight: string, index: number) => {
      if (insight && insight.length > 10) {
        entries.push({
          type: 'note',
          category: 'lifestyle',
          content: insight, // No timestamp prefix in displayed content
          confidence: 0.8,
          internal_timestamp: timestamp,
        });
      }
    });
  }

  return entries;
}

// Legacy function - kept for compatibility but not used in new rich narrative generation
function getActivityDescription(activity: string): string {
  const descriptions: { [key: string]: string } = {
    'Dining out': 'Enjoying a meal at a nice restaurant',
    'Exploring town': 'Walking around and taking in the local sights',
    'Outdoor activity': 'Time spent in nature and fresh air',
    'Exercise session': 'Physical activity and movement',
    'Resort time': 'Enjoying the beautiful resort surroundings',
    'Relaxation time': 'Taking time to unwind and enjoy',
  };
  return descriptions[activity] || 'Activity from natural conversation';
}
