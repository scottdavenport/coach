import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';
import { logger } from '@/lib/logger';
import { 
  WorkoutGenerationRequest, 
  WorkoutGenerationResponse,
  WorkoutTemplate,
  UserWorkoutPreferences,
  HealthContext 
} from '@/types';
import { generateWorkoutRecommendations } from '@/lib/workout-recommendations';
import { validateRequestBody } from '@/lib/input-validation';
import { z } from 'zod';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Validation schema for workout generation requests
const workoutGenerationSchema = z.object({
  date: z.string().optional(),
  workout_type: z.enum(['strength', 'cardio', 'flexibility', 'mixed']).optional(),
  duration: z.number().min(5).max(180).optional(),
  equipment_available: z.array(z.string()).optional(),
  intensity_preference: z.enum(['low', 'moderate', 'high']).optional(),
  preferences: z.object({
    fitness_level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    primary_goals: z.array(z.string()).optional(),
    available_equipment: z.array(z.string()).optional(),
    preferred_workout_duration: z.number().optional(),
    preferred_workout_times: z.array(z.string()).optional(),
    workout_frequency: z.number().optional(),
    injury_limitations: z.array(z.string()).optional(),
    exercise_preferences: z.array(z.string()).optional(),
  }).optional(),
});

export async function POST(request: NextRequest) {
  try {
    logger.apiRequest('POST', '/api/workouts/generate');

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      logger.error('Authentication failed - no user found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate request body
    const body = await request.json();
    const validation = validateRequestBody(body, workoutGenerationSchema);

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
      date = new Date().toISOString().split('T')[0],
      workout_type,
      duration,
      equipment_available,
      intensity_preference,
      preferences,
    } = validation.data;

    logger.info('Generating workout', {
      userId: user.id,
      date,
      workout_type,
      duration,
      equipment_available,
      intensity_preference,
    });

    // Get user's workout preferences
    const { data: userPreferences } = await supabase
      .from('user_workout_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Get health-based recommendations
    const healthRecommendations = await generateWorkoutRecommendations(user.id, date);

    // Build health context
    const healthContext = await buildHealthContext(user.id, date, supabase);

    // Generate workout using AI
    const workoutGeneration = await generateWorkoutWithAI({
      user_id: user.id,
      date,
      preferences: userPreferences || preferences,
      health_context: healthContext,
      workout_type,
      duration,
      equipment_available,
      intensity_preference,
      health_recommendations: healthRecommendations,
    });

    if (!workoutGeneration.success) {
      return NextResponse.json(
        { error: workoutGeneration.error },
        { status: 500 }
      );
    }

    // Store the generated workout as a template if it's new
    let templateId = null;
    if (workoutGeneration.workout) {
      const { data: template, error: templateError } = await supabase
        .from('workout_templates')
        .insert({
          name: workoutGeneration.workout.name,
          description: workoutGeneration.workout.description,
          category: workoutGeneration.workout.category,
          difficulty_level: workoutGeneration.workout.difficulty_level,
          estimated_duration: workoutGeneration.workout.estimated_duration,
          equipment_required: workoutGeneration.workout.equipment_required,
          target_audience: workoutGeneration.workout.target_audience,
        })
        .select()
        .single();

      if (templateError) {
        logger.error('Failed to create workout template', templateError);
      } else {
        templateId = template.id;

        // Insert template exercises
        if (workoutGeneration.workout.exercises?.length > 0) {
          const templateExercises = workoutGeneration.workout.exercises.map((exercise, index) => ({
            template_id: template.id,
            exercise_id: exercise.exercise_id,
            order_index: index + 1,
            sets: exercise.sets,
            reps: exercise.reps,
            duration_seconds: exercise.duration_seconds,
            weight_kg: exercise.weight_kg,
            rest_seconds: exercise.rest_seconds,
            notes: exercise.notes,
          }));

          const { error: exercisesError } = await supabase
            .from('template_exercises')
            .insert(templateExercises);

          if (exercisesError) {
            logger.error('Failed to create template exercises', exercisesError);
          }
        }
      }
    }

    // Store workout recommendation
    const { error: recommendationError } = await supabase
      .from('workout_recommendations')
      .insert({
        user_id: user.id,
        recommendation_date: date,
        recommendation_type: 'daily',
        recommended_template_id: templateId,
        reasoning: workoutGeneration.reasoning,
        health_context: healthContext,
        priority_score: 8, // High priority for daily recommendations
        is_completed: false,
      });

    if (recommendationError) {
      logger.error('Failed to store workout recommendation', recommendationError);
    }

    const response: WorkoutGenerationResponse = {
      success: true,
      workout: workoutGeneration.workout,
      reasoning: workoutGeneration.reasoning,
      alternatives: workoutGeneration.alternatives,
      health_considerations: workoutGeneration.health_considerations,
    };

    return NextResponse.json(response);

  } catch (error: any) {
    logger.error(
      'Workout generation API error',
      error instanceof Error ? error : new Error('Unknown error'),
      {
        timestamp: new Date().toISOString(),
      }
    );

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

async function buildHealthContext(
  userId: string,
  date: string,
  supabase: any
): Promise<HealthContext> {
  try {
    // Fetch recent health metrics (last 3 days)
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

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
      .gte('metric_date', threeDaysAgo)
      .lte('metric_date', date)
      .order('metric_date', { ascending: false });

    if (!healthMetrics || healthMetrics.length === 0) {
      return {};
    }

    // Process health metrics into context
    const context: HealthContext = {};
    const latestMetrics = new Map();

    for (const metric of healthMetrics) {
      const key = metric.standard_metrics?.metric_key;
      const value = metric.metric_value || metric.text_value;

      if (key && value !== null && value !== undefined) {
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
  } catch (error) {
    logger.error('Error building health context', error);
    return {};
  }
}

async function generateWorkoutWithAI(request: {
  user_id: string;
  date: string;
  preferences?: any;
  health_context: HealthContext;
  workout_type?: string;
  duration?: number;
  equipment_available?: string[];
  intensity_preference?: string;
  health_recommendations: any[];
}): Promise<WorkoutGenerationResponse> {
  try {
    const {
      preferences,
      health_context,
      workout_type,
      duration,
      equipment_available,
      intensity_preference,
      health_recommendations,
    } = request;

    // Get available exercises from database
    const supabase = await createClient();
    const { data: exercises } = await supabase
      .from('exercises')
      .select('*')
      .order('name');

    if (!exercises || exercises.length === 0) {
      return {
        success: false,
        reasoning: 'No exercises available in database',
        health_considerations: ['Exercise database is empty'],
        error: 'No exercises found',
      };
    }

    // Build context for AI
    const healthSummary = buildHealthSummary(health_context);
    const preferencesSummary = buildPreferencesSummary(preferences);
    const equipmentSummary = equipment_available?.join(', ') || 'No specific equipment specified';

    const systemPrompt = `You are an expert fitness coach and workout designer. Generate a personalized workout based on the user's health data, preferences, and goals.

USER CONTEXT:
- Health Status: ${healthSummary}
- Fitness Level: ${preferences?.fitness_level || 'Not specified'}
- Goals: ${preferences?.primary_goals?.join(', ') || 'General fitness'}
- Available Equipment: ${equipmentSummary}
- Preferred Duration: ${duration || preferences?.preferred_workout_duration || 'Not specified'} minutes
- Workout Type: ${workout_type || 'Mixed'}
- Intensity Preference: ${intensity_preference || 'Moderate'}

AVAILABLE EXERCISES:
${exercises.map(ex => `- ${ex.name} (${ex.category}, difficulty: ${ex.difficulty_level}/5, equipment: ${ex.equipment_needed.join(', ')})`).join('\n')}

HEALTH RECOMMENDATIONS:
${health_recommendations.map(rec => `- ${rec.type} training, ${rec.intensity} intensity, ${rec.duration} minutes: ${rec.reasoning}`).join('\n')}

Generate a workout that:
1. Matches the user's fitness level and goals
2. Considers their health status and recovery needs
3. Uses only available equipment
4. Fits within the time constraint
5. Provides appropriate intensity based on health data
6. Includes proper warm-up and cool-down

RESPONSE FORMAT (JSON only):
{
  "name": "Workout Name",
  "description": "Brief description of the workout",
  "category": "strength|cardio|flexibility|mixed",
  "difficulty_level": 1-5,
  "estimated_duration": minutes,
  "equipment_required": ["equipment1", "equipment2"],
  "target_audience": "beginner|intermediate|advanced|recovery",
  "exercises": [
    {
      "exercise_id": "exercise_uuid",
      "order_index": 1,
      "sets": 3,
      "reps": 12,
      "duration_seconds": null,
      "weight_kg": null,
      "rest_seconds": 60,
      "notes": "Optional notes"
    }
  ],
  "reasoning": "Why this workout was chosen",
  "health_considerations": ["Consideration 1", "Consideration 2"],
  "alternatives": [
    {
      "name": "Alternative Workout Name",
      "description": "Brief description",
      "category": "strength|cardio|flexibility|mixed",
      "difficulty_level": 1-5,
      "estimated_duration": minutes,
      "equipment_required": ["equipment1"],
      "target_audience": "beginner|intermediate|advanced|recovery"
    }
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Generate a personalized workout for today (${request.date}) based on the context provided.`,
        },
      ],
      max_tokens: 2000,
      temperature: 0.7,
    });

    const responseText = completion.choices[0]?.message?.content || '{}';

    try {
      const parsed = JSON.parse(responseText);
      
      return {
        success: true,
        workout: parsed,
        reasoning: parsed.reasoning || 'Workout generated based on health data and preferences',
        alternatives: parsed.alternatives || [],
        health_considerations: parsed.health_considerations || [],
      };
    } catch (parseError) {
      logger.error('Failed to parse AI workout response', parseError);
      return {
        success: false,
        reasoning: 'Failed to parse workout generation response',
        health_considerations: ['AI response parsing error'],
        error: 'Invalid AI response format',
      };
    }
  } catch (error) {
    logger.error('Error generating workout with AI', error);
    return {
      success: false,
      reasoning: 'Failed to generate workout',
      health_considerations: ['AI generation error'],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function buildHealthSummary(healthContext: HealthContext): string {
  const parts = [];
  
  if (healthContext.sleepScore !== undefined) {
    parts.push(`Sleep Score: ${healthContext.sleepScore}/100`);
  }
  if (healthContext.readinessScore !== undefined) {
    parts.push(`Readiness: ${healthContext.readinessScore}/100`);
  }
  if (healthContext.energy !== undefined) {
    parts.push(`Energy: ${healthContext.energy}/10`);
  }
  if (healthContext.stress !== undefined) {
    parts.push(`Stress: ${healthContext.stress}/10`);
  }
  if (healthContext.fatigue !== undefined) {
    parts.push(`Fatigue: ${healthContext.fatigue}/10`);
  }

  return parts.length > 0 ? parts.join(', ') : 'No recent health data available';
}

function buildPreferencesSummary(preferences: any): string {
  if (!preferences) return 'No preferences set';
  
  const parts = [];
  if (preferences.fitness_level) parts.push(`Level: ${preferences.fitness_level}`);
  if (preferences.primary_goals?.length) parts.push(`Goals: ${preferences.primary_goals.join(', ')}`);
  if (preferences.available_equipment?.length) parts.push(`Equipment: ${preferences.available_equipment.join(', ')}`);
  if (preferences.workout_frequency) parts.push(`Frequency: ${preferences.workout_frequency} days/week`);
  
  return parts.length > 0 ? parts.join(', ') : 'Basic preferences only';
}