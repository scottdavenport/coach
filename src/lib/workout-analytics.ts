import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { 
  UserWorkout, 
  WorkoutExercise, 
  WorkoutProgress, 
  WorkoutAnalysis,
  WorkoutRecommendation 
} from '@/types';

/**
 * Analyze workout performance and generate insights
 */
export async function analyzeWorkoutPerformance(
  userId: string,
  workoutId: string
): Promise<WorkoutAnalysis | null> {
  try {
    const supabase = await createClient();

    // Get workout data
    const { data: workout, error: workoutError } = await supabase
      .from('user_workouts')
      .select(`
        *,
        exercises:workout_exercises(
          *,
          exercise:exercises(*)
        )
      `)
      .eq('id', workoutId)
      .eq('user_id', userId)
      .single();

    if (workoutError || !workout) {
      logger.error('Failed to fetch workout for analysis', workoutError);
      return null;
    }

    // Calculate performance metrics
    const performanceMetrics = calculatePerformanceMetrics(workout);

    // Analyze progress indicators
    const progressIndicators = await analyzeProgressIndicators(userId, workout, supabase);

    // Generate recommendations
    const recommendations = generateWorkoutRecommendations(workout, performanceMetrics);

    // Identify patterns
    const patterns = await identifyWorkoutPatterns(userId, workout, supabase);

    const analysis: WorkoutAnalysis = {
      workout_id: workoutId,
      user_id: userId,
      analysis_date: new Date().toISOString().split('T')[0],
      performance_metrics: performanceMetrics,
      progress_indicators: progressIndicators,
      recommendations,
      patterns,
      created_at: new Date().toISOString(),
    };

    // Store analysis in database
    await storeWorkoutAnalysis(analysis, supabase);

    return analysis;
  } catch (error) {
    logger.error('Error analyzing workout performance', error);
    return null;
  }
}

/**
 * Calculate performance metrics for a workout
 */
function calculatePerformanceMetrics(workout: any) {
  const exercises = workout.exercises || [];
  
  // Calculate total volume (weight × reps for all exercises)
  let totalVolume = 0;
  let totalSets = 0;
  let totalReps = 0;
  let totalDuration = 0;
  let rpeSum = 0;
  let rpeCount = 0;

  for (const exercise of exercises) {
    if (exercise.weight_used && exercise.reps_completed) {
      totalVolume += exercise.weight_used * exercise.reps_completed;
    }
    if (exercise.sets_completed) {
      totalSets += exercise.sets_completed;
    }
    if (exercise.reps_completed) {
      totalReps += exercise.reps_completed;
    }
    if (exercise.duration_completed) {
      totalDuration += exercise.duration_completed;
    }
    if (exercise.difficulty_rating) {
      rpeSum += exercise.difficulty_rating;
      rpeCount++;
    }
  }

  // Calculate completion rate
  const plannedExercises = exercises.length;
  const completedExercises = exercises.filter((ex: any) => 
    ex.sets_completed > 0 || ex.duration_completed > 0
  ).length;
  const completionRate = plannedExercises > 0 ? (completedExercises / plannedExercises) * 100 : 0;

  // Calculate time efficiency
  const plannedDuration = workout.total_duration || 0;
  const actualDuration = totalDuration / 60; // Convert seconds to minutes
  const timeEfficiency = plannedDuration > 0 ? (actualDuration / plannedDuration) * 100 : 100;

  return {
    total_volume: totalVolume,
    average_intensity: rpeCount > 0 ? rpeSum / rpeCount : 0,
    completion_rate: completionRate,
    time_efficiency: timeEfficiency,
    total_sets: totalSets,
    total_reps: totalReps,
    total_duration_minutes: actualDuration,
  };
}

/**
 * Analyze progress indicators by comparing with historical data
 */
async function analyzeProgressIndicators(
  userId: string,
  currentWorkout: any,
  supabase: any
) {
  const progressIndicators = {
    strength_gains: [],
    endurance_improvements: [],
  };

  try {
    // Get historical workout data for the same exercises (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const { data: historicalWorkouts } = await supabase
      .from('user_workouts')
      .select(`
        workout_date,
        exercises:workout_exercises(
          exercise_id,
          weight_used,
          reps_completed,
          duration_completed,
          exercise:exercises(name, category)
        )
      `)
      .eq('user_id', userId)
      .gte('workout_date', thirtyDaysAgo)
      .lt('workout_date', currentWorkout.workout_date)
      .order('workout_date', { ascending: false });

    if (!historicalWorkouts || historicalWorkouts.length === 0) {
      return progressIndicators;
    }

    // Analyze each exercise in the current workout
    for (const currentExercise of currentWorkout.exercises) {
      const exerciseId = currentExercise.exercise_id;
      const exerciseName = currentExercise.exercise?.name || 'Unknown Exercise';

      // Find historical data for this exercise
      const historicalData = [];
      for (const workout of historicalWorkouts) {
        const matchingExercise = workout.exercises.find(
          (ex: any) => ex.exercise_id === exerciseId
        );
        if (matchingExercise) {
          historicalData.push({
            date: workout.workout_date,
            weight: matchingExercise.weight_used,
            reps: matchingExercise.reps_completed,
            duration: matchingExercise.duration_completed,
          });
        }
      }

      if (historicalData.length === 0) continue;

      // Calculate improvement for strength exercises
      if (currentExercise.weight_used && currentExercise.reps_completed) {
        const currentVolume = currentExercise.weight_used * currentExercise.reps_completed;
        const previousVolume = historicalData[0]?.weight * historicalData[0]?.reps || 0;
        
        if (previousVolume > 0) {
          const improvement = ((currentVolume - previousVolume) / previousVolume) * 100;
          if (improvement > 5) { // 5% improvement threshold
            progressIndicators.strength_gains.push({
              exercise_id: exerciseId,
              exercise_name: exerciseName,
              improvement: Math.round(improvement),
              time_period: '30 days',
            });
          }
        }
      }

      // Calculate improvement for endurance exercises
      if (currentExercise.duration_completed && !currentExercise.weight_used) {
        const currentDuration = currentExercise.duration_completed;
        const previousDuration = historicalData[0]?.duration || 0;
        
        if (previousDuration > 0) {
          const improvement = ((currentDuration - previousDuration) / previousDuration) * 100;
          if (improvement > 5) { // 5% improvement threshold
            progressIndicators.endurance_improvements.push({
              exercise_id: exerciseId,
              exercise_name: exerciseName,
              improvement: Math.round(improvement),
              time_period: '30 days',
            });
          }
        }
      }
    }

    return progressIndicators;
  } catch (error) {
    logger.error('Error analyzing progress indicators', error);
    return progressIndicators;
  }
}

/**
 * Generate workout-specific recommendations
 */
function generateWorkoutRecommendations(workout: any, performanceMetrics: any): string[] {
  const recommendations = [];

  // Completion rate recommendations
  if (performanceMetrics.completion_rate < 80) {
    recommendations.push(
      'Consider reducing the number of exercises or sets to improve completion rate'
    );
  }

  // Time efficiency recommendations
  if (performanceMetrics.time_efficiency > 120) {
    recommendations.push(
      'Workout took longer than planned - consider reducing rest time or exercise complexity'
    );
  } else if (performanceMetrics.time_efficiency < 80) {
    recommendations.push(
      'Workout completed quickly - consider adding more exercises or increasing intensity'
    );
  }

  // Intensity recommendations
  if (performanceMetrics.average_intensity < 3) {
    recommendations.push(
      'Workout intensity was low - consider increasing weight, reps, or exercise difficulty'
    );
  } else if (performanceMetrics.average_intensity > 8) {
    recommendations.push(
      'Workout intensity was very high - ensure adequate recovery time before next session'
    );
  }

  // Volume recommendations
  if (performanceMetrics.total_volume === 0) {
    recommendations.push(
      'No weighted exercises completed - consider adding resistance training for strength gains'
    );
  }

  // Mood and energy recommendations
  if (workout.mood_after && workout.mood_before) {
    const moodChange = workout.mood_after - workout.mood_before;
    if (moodChange < -2) {
      recommendations.push(
        'Mood decreased significantly after workout - consider reducing intensity or duration'
      );
    } else if (moodChange > 2) {
      recommendations.push(
        'Great mood boost from workout - this type of training works well for you'
      );
    }
  }

  if (workout.energy_after && workout.energy_before) {
    const energyChange = workout.energy_after - workout.energy_before;
    if (energyChange < -2) {
      recommendations.push(
        'Energy decreased significantly - ensure adequate nutrition and hydration'
      );
    }
  }

  return recommendations;
}

/**
 * Identify workout patterns and trends
 */
async function identifyWorkoutPatterns(
  userId: string,
  currentWorkout: any,
  supabase: any
): Promise<string[]> {
  const patterns = [];

  try {
    // Get workout frequency pattern
    const { data: recentWorkouts } = await supabase
      .from('user_workouts')
      .select('workout_date, category')
      .eq('user_id', userId)
      .gte('workout_date', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('workout_date', { ascending: false });

    if (recentWorkouts && recentWorkouts.length > 0) {
      const workoutCount = recentWorkouts.length;
      const frequency = workoutCount / 14; // workouts per day over 2 weeks
      
      if (frequency < 0.3) {
        patterns.push('Low workout frequency - consider increasing consistency');
      } else if (frequency > 1) {
        patterns.push('High workout frequency - ensure adequate recovery');
      }

      // Category distribution
      const categories = recentWorkouts.map(w => w.category);
      const categoryCounts = categories.reduce((acc: any, cat) => {
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
      }, {});

      const mostCommonCategory = Object.keys(categoryCounts).reduce((a, b) => 
        categoryCounts[a] > categoryCounts[b] ? a : b
      );

      if (categoryCounts[mostCommonCategory] / workoutCount > 0.7) {
        patterns.push(`Heavy focus on ${mostCommonCategory} training - consider adding variety`);
      }
    }

    // Consistency pattern
    const { data: completionData } = await supabase
      .from('user_workouts')
      .select('completion_status')
      .eq('user_id', userId)
      .gte('workout_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

    if (completionData && completionData.length > 0) {
      const completedCount = completionData.filter(w => w.completion_status === 'completed').length;
      const completionRate = (completedCount / completionData.length) * 100;
      
      if (completionRate < 70) {
        patterns.push('Low workout completion rate - consider adjusting workout difficulty');
      } else if (completionRate > 95) {
        patterns.push('Excellent workout consistency - great job!');
      }
    }

    return patterns;
  } catch (error) {
    logger.error('Error identifying workout patterns', error);
    return patterns;
  }
}

/**
 * Store workout analysis in database
 */
async function storeWorkoutAnalysis(analysis: WorkoutAnalysis, supabase: any) {
  try {
    const { error } = await supabase
      .from('workout_analyses')
      .insert({
        workout_id: analysis.workout_id,
        user_id: analysis.user_id,
        analysis_date: analysis.analysis_date,
        performance_metrics: analysis.performance_metrics,
        progress_indicators: analysis.progress_indicators,
        recommendations: analysis.recommendations,
        patterns: analysis.patterns,
        created_at: analysis.created_at,
      });

    if (error) {
      logger.error('Failed to store workout analysis', error);
    }
  } catch (error) {
    logger.error('Error storing workout analysis', error);
  }
}

/**
 * Generate weekly workout summary
 */
export async function generateWeeklyWorkoutSummary(
  userId: string,
  weekStartDate: string
): Promise<any> {
  try {
    const supabase = await createClient();
    const weekEndDate = new Date(new Date(weekStartDate).getTime() + 6 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    // Get workouts for the week
    const { data: workouts, error: workoutsError } = await supabase
      .from('user_workouts')
      .select(`
        *,
        exercises:workout_exercises(
          *,
          exercise:exercises(*)
        )
      `)
      .eq('user_id', userId)
      .gte('workout_date', weekStartDate)
      .lte('workout_date', weekEndDate)
      .order('workout_date', { ascending: true });

    if (workoutsError) {
      logger.error('Failed to fetch weekly workouts', workoutsError);
      return null;
    }

    if (!workouts || workouts.length === 0) {
      return {
        week_start: weekStartDate,
        week_end: weekEndDate,
        total_workouts: 0,
        total_duration: 0,
        total_volume: 0,
        average_intensity: 0,
        completion_rate: 0,
        categories: {},
        recommendations: ['No workouts completed this week - consider adding some movement'],
        patterns: ['No workout data available for analysis'],
      };
    }

    // Calculate weekly metrics
    let totalDuration = 0;
    let totalVolume = 0;
    let totalIntensity = 0;
    let intensityCount = 0;
    let completedWorkouts = 0;
    const categories: any = {};

    for (const workout of workouts) {
      if (workout.completion_status === 'completed') {
        completedWorkouts++;
      }

      if (workout.total_duration) {
        totalDuration += workout.total_duration;
      }

      if (workout.perceived_exertion) {
        totalIntensity += workout.perceived_exertion;
        intensityCount++;
      }

      // Count categories
      categories[workout.category] = (categories[workout.category] || 0) + 1;

      // Calculate volume
      for (const exercise of workout.exercises || []) {
        if (exercise.weight_used && exercise.reps_completed) {
          totalVolume += exercise.weight_used * exercise.reps_completed;
        }
      }
    }

    const averageIntensity = intensityCount > 0 ? totalIntensity / intensityCount : 0;
    const completionRate = (completedWorkouts / workouts.length) * 100;

    // Generate recommendations
    const recommendations = [];
    if (completedWorkouts === 0) {
      recommendations.push('No workouts completed this week - start with small, achievable goals');
    } else if (completedWorkouts < 3) {
      recommendations.push('Low workout frequency - aim for at least 3 workouts per week');
    } else if (completedWorkouts > 6) {
      recommendations.push('High workout frequency - ensure adequate recovery time');
    }

    if (totalDuration < 90) {
      recommendations.push('Low total workout time - consider increasing duration or frequency');
    }

    if (averageIntensity < 4) {
      recommendations.push('Low average intensity - consider increasing workout difficulty');
    } else if (averageIntensity > 8) {
      recommendations.push('High average intensity - ensure proper recovery and nutrition');
    }

    // Identify patterns
    const patterns = [];
    const mostCommonCategory = Object.keys(categories).reduce((a, b) => 
      categories[a] > categories[b] ? a : b, Object.keys(categories)[0]
    );

    if (mostCommonCategory && categories[mostCommonCategory] / completedWorkouts > 0.7) {
      patterns.push(`Heavy focus on ${mostCommonCategory} training this week`);
    }

    if (completionRate > 90) {
      patterns.push('Excellent workout consistency this week');
    } else if (completionRate < 50) {
      patterns.push('Low workout completion rate - consider adjusting goals');
    }

    return {
      week_start: weekStartDate,
      week_end: weekEndDate,
      total_workouts: workouts.length,
      completed_workouts: completedWorkouts,
      total_duration: totalDuration,
      total_volume: totalVolume,
      average_intensity: Math.round(averageIntensity * 10) / 10,
      completion_rate: Math.round(completionRate),
      categories,
      recommendations,
      patterns,
      workouts: workouts.map(w => ({
        id: w.id,
        name: w.workout_name,
        date: w.workout_date,
        category: w.category,
        duration: w.total_duration,
        completion_status: w.completion_status,
        perceived_exertion: w.perceived_exertion,
      })),
    };
  } catch (error) {
    logger.error('Error generating weekly workout summary', error);
    return null;
  }
}