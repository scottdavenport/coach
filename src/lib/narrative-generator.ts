import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';
import {
  generateWorkoutRecommendations,
  getWorkoutContextSummary,
} from '@/lib/workout-recommendations';

// Sleep and Readiness Context Interfaces
export interface SleepReadinessContext {
  sleepQuality: string;
  sleepInsights: string[];
  readinessInsights: string[];
  trendAnalysis: string[];
  recommendations: string[];
  healthSummary: string;
}

export interface HealthMetric {
  metric_key: string;
  display_name: string;
  metric_value?: number;
  text_value?: string;
  boolean_value?: boolean;
  unit?: string;
  source?: string;
  confidence?: number;
}

export interface HistoricalHealthData {
  date: string;
  sleep_score?: number;
  sleep_duration?: number;
  time_in_bed?: number;
  sleep_efficiency?: number;
  rem_sleep?: number;
  deep_sleep?: number;
  readiness?: number;
  resting_heart_rate?: number;
  heart_rate_variability?: number;
  body_temperature?: number;
  respiratory_rate?: number;
  oxygen_saturation?: number;
  breathing_regularity?: number;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to fetch historical health data for trend analysis
async function fetchHistoricalHealthData(
  userId: string,
  date: string,
  days: number = 7
): Promise<HistoricalHealthData[]> {
  try {
    const supabase = await createClient();

    // Calculate start date for historical data
    const startDate = new Date(date);
    startDate.setDate(startDate.getDate() - days);
    const startDateString = startDate.toISOString().split('T')[0];

    console.log(
      `📊 Fetching ${days} days of health data from ${startDateString} to ${date}`
    );

    // Fetch health metrics for the specified date range
    const { data: healthMetrics, error } = await supabase
      .from('user_daily_metrics')
      .select(
        `
        metric_date,
        metric_value,
        text_value,
        boolean_value,
        standard_metrics (
          metric_key,
          display_name,
          unit
        )
      `
      )
      .eq('user_id', userId)
      .gte('metric_date', startDateString)
      .lte('metric_date', date)
      .in('standard_metrics.metric_key', [
        'sleep_score',
        'sleep_duration',
        'time_in_bed',
        'sleep_efficiency',
        'rem_sleep',
        'deep_sleep',
        'readiness',
        'resting_heart_rate',
        'heart_rate_variability',
        'body_temperature',
        'respiratory_rate',
        'oxygen_saturation',
        'breathing_regularity',
      ])
      .order('metric_date', { ascending: true });

    if (error) {
      console.error('Error fetching historical health data:', error);
      return [];
    }

    // Group metrics by date and convert to HistoricalHealthData format
    const dateMap = new Map<string, HistoricalHealthData>();

    healthMetrics?.forEach(metric => {
      const metricKey = (metric.standard_metrics as any)?.metric_key;
      const date = metric.metric_date;
      const value =
        metric.metric_value || metric.text_value || metric.boolean_value;

      if (!dateMap.has(date)) {
        dateMap.set(date, { date });
      }

      const dayData = dateMap.get(date)!;

      // Map metric keys to HistoricalHealthData properties
      switch (metricKey) {
        case 'sleep_score':
          dayData.sleep_score = typeof value === 'number' ? value : undefined;
          break;
        case 'sleep_duration':
          dayData.sleep_duration =
            typeof value === 'number' ? value : undefined;
          break;
        case 'time_in_bed':
          dayData.time_in_bed = typeof value === 'number' ? value : undefined;
          break;
        case 'sleep_efficiency':
          dayData.sleep_efficiency =
            typeof value === 'number' ? value : undefined;
          break;
        case 'rem_sleep':
          dayData.rem_sleep = typeof value === 'number' ? value : undefined;
          break;
        case 'deep_sleep':
          dayData.deep_sleep = typeof value === 'number' ? value : undefined;
          break;
        case 'readiness':
          dayData.readiness = typeof value === 'number' ? value : undefined;
          break;
        case 'resting_heart_rate':
          dayData.resting_heart_rate =
            typeof value === 'number' ? value : undefined;
          break;
        case 'heart_rate_variability':
          dayData.heart_rate_variability =
            typeof value === 'number' ? value : undefined;
          break;
        case 'body_temperature':
          dayData.body_temperature =
            typeof value === 'number' ? value : undefined;
          break;
        case 'respiratory_rate':
          dayData.respiratory_rate =
            typeof value === 'number' ? value : undefined;
          break;
        case 'oxygen_saturation':
          dayData.oxygen_saturation =
            typeof value === 'number' ? value : undefined;
          break;
        case 'breathing_regularity':
          dayData.breathing_regularity =
            typeof value === 'number' ? value : undefined;
          break;
      }
    });

    const historicalData = Array.from(dateMap.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    console.log(
      `📈 Retrieved ${historicalData.length} days of historical health data`
    );
    return historicalData;
  } catch (error) {
    console.error('Error in fetchHistoricalHealthData:', error);
    return [];
  }
}

// Main function to generate sleep and readiness context with analysis
export async function generateSleepReadinessContext(
  healthMetrics: any[],
  userId: string,
  date: string
): Promise<SleepReadinessContext> {
  try {
    console.log(`🛌 Generating sleep and readiness context for ${date}`);

    // Fetch historical data for trend analysis
    const historicalData = await fetchHistoricalHealthData(userId, date, 7);

    // Extract current day metrics
    const currentMetrics = extractCurrentDayMetrics(healthMetrics);

    // Analyze sleep quality
    const sleepQuality = analyzeSleepQuality(currentMetrics);
    const sleepInsights = generateSleepInsights(currentMetrics);

    // Analyze readiness
    const readinessInsights = generateReadinessInsights(currentMetrics);

    // Generate trend analysis
    const trendAnalysis = generateTrendAnalysis(currentMetrics, historicalData);

    // Generate recommendations
    const recommendations = generateRecommendations(
      currentMetrics,
      historicalData
    );

    // Create health summary
    const healthSummary = generateHealthSummary(currentMetrics, sleepQuality);

    const context: SleepReadinessContext = {
      sleepQuality,
      sleepInsights,
      readinessInsights,
      trendAnalysis,
      recommendations,
      healthSummary,
    };

    console.log('✅ Generated sleep and readiness context:', {
      sleepQuality,
      insightsCount: sleepInsights.length + readinessInsights.length,
      trendsCount: trendAnalysis.length,
      recommendationsCount: recommendations.length,
    });

    return context;
  } catch (error) {
    console.error('Error generating sleep readiness context:', error);
    return {
      sleepQuality: 'Unknown',
      sleepInsights: ['Unable to analyze sleep data'],
      readinessInsights: ['Unable to analyze readiness data'],
      trendAnalysis: ['Historical data unavailable'],
      recommendations: [
        'Focus on maintaining healthy sleep and recovery habits',
      ],
      healthSummary: 'Health metrics analysis unavailable',
    };
  }
}

// Helper function to extract current day metrics from health metrics array
function extractCurrentDayMetrics(healthMetrics: any[]): HistoricalHealthData {
  const currentMetrics: HistoricalHealthData = {
    date: new Date().toISOString().split('T')[0],
  };

  healthMetrics?.forEach(metric => {
    const metricKey = (metric.standard_metrics as any)?.metric_key;
    const value =
      metric.metric_value || metric.text_value || metric.boolean_value;

    if (typeof value === 'number') {
      switch (metricKey) {
        case 'sleep_score':
          currentMetrics.sleep_score = value;
          break;
        case 'sleep_duration':
          currentMetrics.sleep_duration = value;
          break;
        case 'time_in_bed':
          currentMetrics.time_in_bed = value;
          break;
        case 'sleep_efficiency':
          currentMetrics.sleep_efficiency = value;
          break;
        case 'rem_sleep':
          currentMetrics.rem_sleep = value;
          break;
        case 'deep_sleep':
          currentMetrics.deep_sleep = value;
          break;
        case 'readiness':
          currentMetrics.readiness = value;
          break;
        case 'resting_heart_rate':
          currentMetrics.resting_heart_rate = value;
          break;
        case 'heart_rate_variability':
          currentMetrics.heart_rate_variability = value;
          break;
        case 'body_temperature':
          currentMetrics.body_temperature = value;
          break;
        case 'respiratory_rate':
          currentMetrics.respiratory_rate = value;
          break;
        case 'oxygen_saturation':
          currentMetrics.oxygen_saturation = value;
          break;
        case 'breathing_regularity':
          currentMetrics.breathing_regularity = value;
          break;
      }
    }
  });

  return currentMetrics;
}

// Analyze sleep quality based on score, efficiency, and duration
function analyzeSleepQuality(metrics: HistoricalHealthData): string {
  const { sleep_score, sleep_efficiency, sleep_duration } = metrics;

  if (!sleep_score && !sleep_efficiency && !sleep_duration) {
    return 'No sleep data available';
  }

  let qualityScore = 0;
  let factors = 0;

  // Sleep score (0-100)
  if (sleep_score !== undefined) {
    qualityScore += sleep_score;
    factors++;
  }

  // Sleep efficiency (0-100%)
  if (sleep_efficiency !== undefined) {
    qualityScore += sleep_efficiency;
    factors++;
  }

  // Sleep duration (hours) - target 8 hours
  if (sleep_duration !== undefined) {
    const durationScore = Math.min(100, (sleep_duration / 8) * 100);
    qualityScore += durationScore;
    factors++;
  }

  if (factors === 0) return 'No sleep data available';

  const averageScore = qualityScore / factors;

  if (averageScore >= 80) return 'Good';
  if (averageScore >= 60) return 'Fair';
  return 'Poor';
}

// Generate sleep insights based on current metrics
function generateSleepInsights(metrics: HistoricalHealthData): string[] {
  const insights: string[] = [];
  const {
    sleep_score,
    sleep_efficiency,
    sleep_duration,
    rem_sleep,
    deep_sleep,
  } = metrics;

  if (sleep_score !== undefined) {
    if (sleep_score >= 85) {
      insights.push(
        `Excellent sleep score of ${sleep_score} - well-rested and recovered`
      );
    } else if (sleep_score >= 70) {
      insights.push(
        `Good sleep score of ${sleep_score} - adequate rest for the day`
      );
    } else if (sleep_score >= 50) {
      insights.push(
        `Sleep score of ${sleep_score} indicates room for improvement in sleep quality`
      );
    } else {
      insights.push(
        `Low sleep score of ${sleep_score} - consider focusing on sleep recovery`
      );
    }
  }

  if (sleep_efficiency !== undefined) {
    if (sleep_efficiency >= 85) {
      insights.push(
        `High sleep efficiency of ${sleep_efficiency}% - time in bed was well-utilized`
      );
    } else if (sleep_efficiency < 80) {
      insights.push(
        `Sleep efficiency of ${sleep_efficiency}% suggests opportunities to improve sleep quality`
      );
    }
  }

  if (sleep_duration !== undefined) {
    if (sleep_duration >= 8) {
      insights.push(
        `Adequate sleep duration of ${sleep_duration.toFixed(1)} hours`
      );
    } else if (sleep_duration < 7) {
      insights.push(
        `Sleep duration of ${sleep_duration.toFixed(1)} hours is below the 8-hour target`
      );
    } else {
      insights.push(
        `Sleep duration of ${sleep_duration.toFixed(1)} hours is close to optimal`
      );
    }
  }

  if (rem_sleep !== undefined && deep_sleep !== undefined) {
    const totalSleep = rem_sleep + deep_sleep;
    if (totalSleep > 0) {
      const remPercentage = (rem_sleep / totalSleep) * 100;
      const deepPercentage = (deep_sleep / totalSleep) * 100;

      if (remPercentage >= 20 && remPercentage <= 25) {
        insights.push(
          `Healthy REM sleep proportion of ${remPercentage.toFixed(1)}%`
        );
      }

      if (deepPercentage >= 15 && deepPercentage <= 20) {
        insights.push(
          `Good deep sleep proportion of ${deepPercentage.toFixed(1)}%`
        );
      }
    }
  }

  return insights;
}

// Generate readiness insights based on current metrics
function generateReadinessInsights(metrics: HistoricalHealthData): string[] {
  const insights: string[] = [];
  const {
    readiness,
    resting_heart_rate,
    heart_rate_variability,
    body_temperature,
  } = metrics;

  if (readiness !== undefined) {
    if (readiness >= 85) {
      insights.push(
        `Excellent readiness score of ${readiness} - well-recovered and ready for high-intensity activity`
      );
    } else if (readiness >= 70) {
      insights.push(
        `Good readiness score of ${readiness} - suitable for moderate activity`
      );
    } else if (readiness >= 50) {
      insights.push(
        `Readiness score of ${readiness} suggests taking it easy today - focus on recovery`
      );
    } else {
      insights.push(
        `Low readiness score of ${readiness} - prioritize rest and recovery activities`
      );
    }
  }

  if (resting_heart_rate !== undefined) {
    if (resting_heart_rate >= 60 && resting_heart_rate <= 100) {
      insights.push(
        `Resting heart rate of ${resting_heart_rate} bpm is within healthy range`
      );
    } else if (resting_heart_rate < 60) {
      insights.push(
        `Low resting heart rate of ${resting_heart_rate} bpm indicates good cardiovascular fitness`
      );
    } else {
      insights.push(
        `Elevated resting heart rate of ${resting_heart_rate} bpm - monitor for stress or fatigue`
      );
    }
  }

  if (heart_rate_variability !== undefined) {
    if (heart_rate_variability >= 40) {
      insights.push(
        `HRV of ${heart_rate_variability}ms indicates good recovery and autonomic balance`
      );
    } else if (heart_rate_variability < 30) {
      insights.push(
        `Low HRV of ${heart_rate_variability}ms suggests high stress or poor recovery`
      );
    } else {
      insights.push(
        `HRV of ${heart_rate_variability}ms shows moderate recovery status`
      );
    }
  }

  if (body_temperature !== undefined) {
    if (body_temperature >= 97.5 && body_temperature <= 99.5) {
      insights.push(
        `Body temperature of ${body_temperature}°F is within normal range`
      );
    } else if (body_temperature > 99.5) {
      insights.push(
        `Elevated body temperature of ${body_temperature}°F - monitor for signs of illness`
      );
    }
  }

  return insights;
}

// Generate trend analysis comparing current day to historical data
function generateTrendAnalysis(
  currentMetrics: HistoricalHealthData,
  historicalData: HistoricalHealthData[]
): string[] {
  const trends: string[] = [];

  if (historicalData.length < 2) {
    trends.push('Insufficient historical data for trend analysis');
    return trends;
  }

  // Calculate averages for the last 3-7 days (excluding current day)
  const recentData = historicalData.slice(0, -1).slice(-7); // Last 7 days excluding current

  const averages = calculateAverages(recentData);

  // Sleep score trend
  if (
    currentMetrics.sleep_score !== undefined &&
    averages.sleep_score !== undefined
  ) {
    const change = currentMetrics.sleep_score - averages.sleep_score;
    const percentChange = (change / averages.sleep_score) * 100;

    if (Math.abs(percentChange) >= 15) {
      if (change > 0) {
        trends.push(
          `Sleep score improved ${Math.abs(percentChange).toFixed(1)}% from recent average`
        );
      } else {
        trends.push(
          `Sleep score declined ${Math.abs(percentChange).toFixed(1)}% from recent average`
        );
      }
    }
  }

  // Sleep efficiency trend
  if (
    currentMetrics.sleep_efficiency !== undefined &&
    averages.sleep_efficiency !== undefined
  ) {
    const change = currentMetrics.sleep_efficiency - averages.sleep_efficiency;
    const percentChange = (change / averages.sleep_efficiency) * 100;

    if (Math.abs(percentChange) >= 15) {
      if (change > 0) {
        trends.push(
          `Sleep efficiency improved ${Math.abs(percentChange).toFixed(1)}% from recent average`
        );
      } else {
        trends.push(
          `Sleep efficiency declined ${Math.abs(percentChange).toFixed(1)}% from recent average`
        );
      }
    }
  }

  // Readiness trend
  if (
    currentMetrics.readiness !== undefined &&
    averages.readiness !== undefined
  ) {
    const change = currentMetrics.readiness - averages.readiness;
    const percentChange = (change / averages.readiness) * 100;

    if (Math.abs(percentChange) >= 15) {
      if (change > 0) {
        trends.push(
          `Readiness score improved ${Math.abs(percentChange).toFixed(1)}% from recent average`
        );
      } else {
        trends.push(
          `Readiness score declined ${Math.abs(percentChange).toFixed(1)}% from recent average`
        );
      }
    }
  }

  // Sleep duration trend
  if (
    currentMetrics.sleep_duration !== undefined &&
    averages.sleep_duration !== undefined
  ) {
    const change = currentMetrics.sleep_duration - averages.sleep_duration;

    if (Math.abs(change) >= 0.5) {
      // 30 minutes or more
      if (change > 0) {
        trends.push(
          `Sleep duration increased ${change.toFixed(1)} hours from recent average`
        );
      } else {
        trends.push(
          `Sleep duration decreased ${Math.abs(change).toFixed(1)} hours from recent average`
        );
      }
    }
  }

  if (trends.length === 0) {
    trends.push(
      'Sleep and readiness metrics are consistent with recent patterns'
    );
  }

  return trends;
}

// Calculate averages for historical data
function calculateAverages(
  data: HistoricalHealthData[]
): Partial<HistoricalHealthData> {
  const averages: any = {};
  const counts: { [key: string]: number } = {};

  data.forEach(day => {
    Object.entries(day).forEach(([key, value]) => {
      if (key !== 'date' && typeof value === 'number') {
        if (!averages[key]) {
          averages[key] = 0;
          counts[key] = 0;
        }
        averages[key] += value;
        counts[key]++;
      }
    });
  });

  // Calculate actual averages
  Object.keys(averages).forEach(key => {
    if (key !== 'date' && counts[key] > 0) {
      averages[key] /= counts[key];
    }
  });

  return averages;
}

// Generate actionable recommendations based on current and historical data
function generateRecommendations(
  currentMetrics: HistoricalHealthData,
  historicalData: HistoricalHealthData[]
): string[] {
  const recommendations: string[] = [];

  // Sleep duration recommendations
  if (currentMetrics.sleep_duration !== undefined) {
    if (currentMetrics.sleep_duration < 7) {
      recommendations.push(
        'Consider going to bed 30-60 minutes earlier to reach 8-hour sleep target'
      );
    } else if (currentMetrics.sleep_duration > 9) {
      recommendations.push(
        'Monitor if extended sleep duration affects energy levels during the day'
      );
    }
  }

  // Sleep efficiency recommendations
  if (
    currentMetrics.sleep_efficiency !== undefined &&
    currentMetrics.sleep_efficiency < 80
  ) {
    recommendations.push(
      'Review evening routine for better sleep quality - avoid screens 1 hour before bed'
    );
  }

  // Readiness-based workout recommendations
  if (currentMetrics.readiness !== undefined) {
    if (currentMetrics.readiness >= 80) {
      recommendations.push(
        'High readiness score - suitable for higher intensity workout or challenging activities'
      );
    } else if (currentMetrics.readiness < 60) {
      recommendations.push(
        'Lower readiness score - focus on light activity, stretching, or recovery work'
      );
    }
  }

  // HRV-based recommendations
  if (currentMetrics.heart_rate_variability !== undefined) {
    if (currentMetrics.heart_rate_variability >= 45) {
      recommendations.push(
        'Good HRV indicates strong recovery - suitable for higher intensity training'
      );
    } else if (currentMetrics.heart_rate_variability < 30) {
      recommendations.push(
        'Low HRV suggests high stress - prioritize stress management and recovery'
      );
    }
  }

  // Temperature-based recommendations
  if (
    currentMetrics.body_temperature !== undefined &&
    currentMetrics.body_temperature > 99.5
  ) {
    recommendations.push(
      'Elevated body temperature - consider lighter activity and monitor for illness'
    );
  }

  // Historical trend-based recommendations
  if (historicalData.length >= 3) {
    const recentAverages = calculateAverages(
      historicalData.slice(0, -1).slice(-3)
    );

    if (
      currentMetrics.sleep_score !== undefined &&
      recentAverages.sleep_score !== undefined
    ) {
      const sleepTrend =
        currentMetrics.sleep_score - recentAverages.sleep_score;
      if (sleepTrend < -10) {
        recommendations.push(
          'Sleep quality declining - review sleep hygiene and stress management'
        );
      }
    }

    if (
      currentMetrics.readiness !== undefined &&
      recentAverages.readiness !== undefined
    ) {
      const readinessTrend =
        currentMetrics.readiness - recentAverages.readiness;
      if (readinessTrend < -10) {
        recommendations.push(
          'Readiness declining - consider taking a recovery day or reducing training load'
        );
      }
    }
  }

  // Default recommendation if no specific ones generated
  if (recommendations.length === 0) {
    recommendations.push(
      'Continue monitoring sleep and readiness patterns for optimal health and performance'
    );
  }

  return recommendations.slice(0, 3); // Limit to 3 recommendations
}

// Generate concise health summary
function generateHealthSummary(
  metrics: HistoricalHealthData,
  sleepQuality: string
): string {
  const parts: string[] = [];

  if (sleepQuality !== 'No sleep data available') {
    parts.push(`Sleep quality: ${sleepQuality}`);
  }

  if (metrics.readiness !== undefined) {
    parts.push(`Readiness: ${metrics.readiness}`);
  }

  if (metrics.sleep_duration !== undefined) {
    parts.push(`Sleep: ${metrics.sleep_duration.toFixed(1)}h`);
  }

  if (metrics.resting_heart_rate !== undefined) {
    parts.push(`RHR: ${metrics.resting_heart_rate} bpm`);
  }

  if (parts.length === 0) {
    return 'Health metrics analysis unavailable';
  }

  return parts.join(' | ');
}

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

    // Generate sleep and readiness context for enhanced narrative
    const sleepReadinessContext = await generateSleepReadinessContext(
      healthMetrics || [],
      userId,
      date
    );

    // Generate rich narrative using AI with existing content for intelligent merging
    const narrative = await generateRichNarrative(
      insights,
      allFileAttachments || [],
      healthMetrics || [],
      existingContent,
      workoutContext,
      sleepReadinessContext
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
  workoutContext?: string,
  sleepReadinessContext?: SleepReadinessContext
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

${
  sleepReadinessContext
    ? `SLEEP & READINESS ANALYSIS:
${sleepReadinessContext.healthSummary}

Sleep Quality: ${sleepReadinessContext.sleepQuality}
${sleepReadinessContext.sleepInsights.map(insight => `- ${insight}`).join('\n')}

Readiness Assessment:
${sleepReadinessContext.readinessInsights.map(insight => `- ${insight}`).join('\n')}

Trend Analysis:
${sleepReadinessContext.trendAnalysis.map(trend => `- ${trend}`).join('\n')}

Recommendations:
${sleepReadinessContext.recommendations.map(rec => `- ${rec}`).join('\n')}

Use this health context to inform your narrative and insights. Include specific sleep/readiness observations in the health_context field and generate relevant insights.\n`
    : ''
}

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
