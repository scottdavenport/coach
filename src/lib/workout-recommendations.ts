import { createClient } from '@/lib/supabase/server';

export interface WorkoutRecommendation {
  type: 'cardio' | 'strength' | 'recovery' | 'flexibility';
  intensity: 'low' | 'moderate' | 'high';
  duration: number; // minutes
  reasoning: string;
  considerations: string[];
}

export interface HealthContext {
  sleepScore?: number;
  sleepDuration?: number; // minutes
  readinessScore?: number;
  restingHeartRate?: number;
  heartRateVariability?: number;
  bodyTemperature?: number;
  stress?: number;
  fatigue?: number;
  energy?: number;
}

/**
 * Generate workout recommendations based on health metrics
 */
export async function generateWorkoutRecommendations(
  userId: string,
  date: string
): Promise<WorkoutRecommendation[]> {
  try {
    const supabase = await createClient();

    // Fetch recent health metrics (last 3 days)
    const { data: healthMetrics } = await supabase
      .from('user_daily_metrics')
      .select(
        `
        metric_value,
        text_value,
        metric_date,
        standard_metrics (
          metric_key,
          display_name,
          unit
        )
      `
      )
      .eq('user_id', userId)
      .gte(
        'metric_date',
        new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0]
      )
      .lte('metric_date', date)
      .order('metric_date', { ascending: false });

    if (!healthMetrics || healthMetrics.length === 0) {
      return getDefaultRecommendations();
    }

    // Process health metrics into context
    const healthContext = processHealthMetrics(healthMetrics);

    // Generate recommendations based on health context
    return generateRecommendationsFromContext(healthContext);
  } catch (error) {
    console.error('Error generating workout recommendations:', error);
    return getDefaultRecommendations();
  }
}

/**
 * Process raw health metrics into structured context
 */
function processHealthMetrics(metrics: any[]): HealthContext {
  const context: HealthContext = {};

  // Group metrics by date and find the most recent values
  const latestMetrics = new Map();

  for (const metric of metrics) {
    const key = metric.standard_metrics?.metric_key;
    const value = metric.metric_value || metric.text_value;

    if (key && value !== null && value !== undefined) {
      // Only keep the most recent value for each metric
      if (
        !latestMetrics.has(key) ||
        new Date(metric.metric_date) > new Date(latestMetrics.get(key).date)
      ) {
        latestMetrics.set(key, { value, date: metric.metric_date });
      }
    }
  }

  // Map to context object
  for (const [key, data] of latestMetrics) {
    switch (key) {
      case 'sleep_score':
        context.sleepScore = Number(data.value);
        break;
      case 'sleep_duration':
        context.sleepDuration = Number(data.value);
        break;
      case 'readiness':
        context.readinessScore = Number(data.value);
        break;
      case 'resting_heart_rate':
        context.restingHeartRate = Number(data.value);
        break;
      case 'heart_rate_variability':
        context.heartRateVariability = Number(data.value);
        break;
      case 'body_temperature':
        context.bodyTemperature = Number(data.value);
        break;
      case 'stress':
        context.stress = Number(data.value);
        break;
      case 'fatigue':
        context.fatigue = Number(data.value);
        break;
      case 'energy':
        context.energy = Number(data.value);
        break;
    }
  }

  return context;
}

/**
 * Generate workout recommendations based on health context
 */
function generateRecommendationsFromContext(
  context: HealthContext
): WorkoutRecommendation[] {
  const recommendations: WorkoutRecommendation[] = [];

  // Sleep-based recommendations
  if (context.sleepScore !== undefined) {
    if (context.sleepScore >= 85) {
      recommendations.push({
        type: 'cardio',
        intensity: 'high',
        duration: 45,
        reasoning:
          "Excellent sleep quality indicates you're well-recovered and ready for intense training.",
        considerations: [
          'Focus on high-intensity intervals',
          'Consider longer duration workouts',
        ],
      });
    } else if (context.sleepScore >= 70) {
      recommendations.push({
        type: 'strength',
        intensity: 'moderate',
        duration: 30,
        reasoning:
          'Good sleep quality suggests moderate training intensity is appropriate.',
        considerations: [
          'Focus on compound movements',
          'Maintain good form throughout',
        ],
      });
    } else if (context.sleepScore >= 50) {
      recommendations.push({
        type: 'recovery',
        intensity: 'low',
        duration: 20,
        reasoning:
          'Lower sleep quality indicates you should prioritize recovery and light movement.',
        considerations: [
          'Focus on mobility work',
          'Avoid high-intensity training',
          'Consider active recovery',
        ],
      });
    } else {
      recommendations.push({
        type: 'flexibility',
        intensity: 'low',
        duration: 15,
        reasoning:
          'Poor sleep quality suggests you need rest and gentle movement only.',
        considerations: [
          'Light stretching only',
          'Avoid any intense training',
          'Prioritize sleep hygiene',
        ],
      });
    }
  }

  // Readiness-based adjustments
  if (context.readinessScore !== undefined) {
    if (context.readinessScore < 50) {
      // Override previous recommendations if readiness is very low
      recommendations.length = 0;
      recommendations.push({
        type: 'recovery',
        intensity: 'low',
        duration: 15,
        reasoning:
          'Low readiness score indicates you need a complete rest day.',
        considerations: [
          'Light walking or stretching only',
          'Focus on hydration and nutrition',
          'Avoid any structured training',
        ],
      });
    }
  }

  // Heart rate variability considerations
  if (context.heartRateVariability !== undefined) {
    if (context.heartRateVariability < 30) {
      // Low HRV suggests high stress - adjust recommendations
      recommendations.forEach(rec => {
        if (rec.intensity === 'high') {
          rec.intensity = 'moderate';
          rec.duration = Math.min(rec.duration, 30);
          rec.considerations.push('Low HRV detected - reduce intensity');
        }
      });
    }
  }

  // Body temperature considerations
  if (context.bodyTemperature !== undefined) {
    if (context.bodyTemperature > 99.0) {
      recommendations.forEach(rec => {
        rec.considerations.push(
          'Elevated body temperature - monitor closely and stay hydrated'
        );
      });
    }
  }

  return recommendations.length > 0
    ? recommendations
    : getDefaultRecommendations();
}

/**
 * Default recommendations when no health data is available
 */
function getDefaultRecommendations(): WorkoutRecommendation[] {
  return [
    {
      type: 'cardio',
      intensity: 'moderate',
      duration: 30,
      reasoning:
        'No recent health data available - moderate intensity is a safe starting point.',
      considerations: [
        'Start conservatively',
        'Monitor how you feel',
        'Adjust based on perceived exertion',
      ],
    },
  ];
}

/**
 * Get workout context summary for journal entries
 */
export function getWorkoutContextSummary(
  recommendations: WorkoutRecommendation[]
): string {
  if (recommendations.length === 0) return '';

  const primary = recommendations[0];
  const intensity =
    primary.intensity.charAt(0).toUpperCase() + primary.intensity.slice(1);
  const type = primary.type.charAt(0).toUpperCase() + primary.type.slice(1);

  return `${intensity} intensity ${type} training recommended (${primary.duration} min) - ${primary.reasoning}`;
}
