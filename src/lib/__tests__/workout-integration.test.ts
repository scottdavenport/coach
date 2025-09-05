import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  parseWorkoutFromOcr, 
  parseWorkoutFromDocument,
  createGolfWarmupWorkout 
} from '../workout-parser';
import { generateWorkoutRecommendations } from '../workout-recommendations';
import { analyzeWorkoutPerformance, generateWeeklyWorkoutSummary } from '../workout-analytics';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        gte: vi.fn(() => ({
          lte: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: null, error: null }))
              }))
            }))
          }))
        }))
      }))
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      }))
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ error: null }))
    }))
  }))
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockSupabase
}));

describe('Workout Parser', () => {
  describe('parseWorkoutFromOcr', () => {
    it('should parse basic workout data from OCR text', () => {
      const ocrText = `
        Workout Session
        Today
        
        Push-ups 3x12
        Squats 3x15
        Plank 60 seconds
        
        Notes: Good workout
      `;

      const result = parseWorkoutFromOcr(ocrText);

      expect(result).toBeTruthy();
      expect(result?.workout_name).toBe('Workout Session');
      expect(result?.date).toBe('Today');
      expect(result?.exercises).toHaveLength(3);
      expect(result?.exercises[0].name).toBe('Push-ups');
      expect(result?.exercises[0].sets).toBe(3);
      expect(result?.exercises[0].reps).toBe(12);
      expect(result?.notes).toBe('Notes: Good workout');
    });

    it('should handle weight-based exercises', () => {
      const ocrText = `
        Bench Press 3x10x135
        Deadlift 1x5x225
      `;

      const result = parseWorkoutFromOcr(ocrText);

      expect(result).toBeTruthy();
      expect(result?.exercises[0].name).toBe('Bench Press');
      expect(result?.exercises[0].sets).toBe(3);
      expect(result?.exercises[0].reps).toBe(10);
      expect(result?.exercises[0].weight).toBe(135);
    });

    it('should handle duration-based exercises', () => {
      const ocrText = `
        Running 30 minutes
        Cycling 45 minutes
      `;

      const result = parseWorkoutFromOcr(ocrText);

      expect(result).toBeTruthy();
      expect(result?.exercises[0].name).toBe('Running');
      expect(result?.exercises[0].duration).toBe(30 * 60); // Convert to seconds
    });

    it('should return null for invalid OCR text', () => {
      const result = parseWorkoutFromOcr('Invalid text with no workout data');
      expect(result).toBeNull();
    });
  });

  describe('parseWorkoutFromDocument', () => {
    it('should parse workout data from document text', () => {
      const documentText = `
        Week 1 - Upper Body
        
        Bench Press
        3 sets of 10 reps
        135 lbs
        
        Pull-ups
        3 sets of 8 reps
        Bodyweight
        
        Notes: Focus on form
      `;

      const result = parseWorkoutFromDocument(documentText);

      expect(result).toBeTruthy();
      expect(result?.file_type).toBe('training_plan');
      expect(result?.extracted_workouts).toHaveLength(1);
      expect(result?.extracted_workouts[0].name).toBe('Week 1 - Upper Body');
      expect(result?.extracted_workouts[0].exercises).toHaveLength(2);
    });

    it('should handle multiple workout sections', () => {
      const documentText = `
        Day 1 - Upper Body
        Bench Press
        3x10
        
        Day 2 - Lower Body
        Squats
        3x15
      `;

      const result = parseWorkoutFromDocument(documentText);

      expect(result).toBeTruthy();
      expect(result?.extracted_workouts).toHaveLength(2);
    });
  });

  describe('createGolfWarmupWorkout', () => {
    it('should create a valid golf warmup workout', () => {
      const workout = createGolfWarmupWorkout();

      expect(workout.title).toBe('Pre-Golf Mobility and Warm-Up Routine');
      expect(workout.totalTime).toBe('8 minutes');
      expect(workout.steps).toHaveLength(7);
      expect(workout.steps[0].title).toBe('Dynamic Arm Circles');
    });
  });
});

describe('Workout Recommendations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate default recommendations when no health data is available', async () => {
    const recommendations = await generateWorkoutRecommendations('user123', '2024-01-01');

    expect(recommendations).toHaveLength(1);
    expect(recommendations[0].type).toBe('cardio');
    expect(recommendations[0].intensity).toBe('moderate');
    expect(recommendations[0].duration).toBe(30);
  });

  it('should generate high-intensity recommendations for good sleep', async () => {
    // Mock health metrics with good sleep
    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          gte: vi.fn(() => ({
            lte: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({
                data: [
                  {
                    metric_value: 85,
                    metric_date: '2024-01-01',
                    standard_metrics: { metric_key: 'sleep_score' }
                  }
                ],
                error: null
              }))
            }))
          }))
        }))
      }))
    });

    const recommendations = await generateWorkoutRecommendations('user123', '2024-01-01');

    expect(recommendations).toHaveLength(1);
    expect(recommendations[0].intensity).toBe('high');
    expect(recommendations[0].duration).toBe(45);
  });

  it('should generate low-intensity recommendations for poor sleep', async () => {
    // Mock health metrics with poor sleep
    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          gte: vi.fn(() => ({
            lte: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({
                data: [
                  {
                    metric_value: 45,
                    metric_date: '2024-01-01',
                    standard_metrics: { metric_key: 'sleep_score' }
                  }
                ],
                error: null
              }))
            }))
          }))
        }))
      }))
    });

    const recommendations = await generateWorkoutRecommendations('user123', '2024-01-01');

    expect(recommendations).toHaveLength(1);
    expect(recommendations[0].intensity).toBe('low');
    expect(recommendations[0].duration).toBe(15);
  });
});

describe('Workout Analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should calculate performance metrics correctly', async () => {
    const mockWorkout = {
      id: 'workout123',
      user_id: 'user123',
      total_duration: 60,
      exercises: [
        {
          exercise_id: 'ex1',
          sets_completed: 3,
          reps_completed: 10,
          weight_used: 135,
          duration_completed: 0,
          difficulty_rating: 7,
          exercise: { name: 'Bench Press' }
        },
        {
          exercise_id: 'ex2',
          sets_completed: 3,
          reps_completed: 15,
          weight_used: 0,
          duration_completed: 0,
          difficulty_rating: 5,
          exercise: { name: 'Squats' }
        }
      ]
    };

    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: mockWorkout, error: null }))
        }))
      })),
      insert: vi.fn(() => Promise.resolve({ error: null }))
    });

    const analysis = await analyzeWorkoutPerformance('user123', 'workout123');

    expect(analysis).toBeTruthy();
    expect(analysis?.performance_metrics.total_volume).toBe(135 * 10); // Only weighted exercise
    expect(analysis?.performance_metrics.average_intensity).toBe(6); // (7 + 5) / 2
    expect(analysis?.performance_metrics.completion_rate).toBe(100); // All exercises completed
  });

  it('should generate weekly workout summary', async () => {
    const mockWorkouts = [
      {
        id: 'w1',
        workout_date: '2024-01-01',
        category: 'strength',
        total_duration: 45,
        completion_status: 'completed',
        perceived_exertion: 7,
        exercises: [
          { weight_used: 135, reps_completed: 10 }
        ]
      },
      {
        id: 'w2',
        workout_date: '2024-01-02',
        category: 'cardio',
        total_duration: 30,
        completion_status: 'completed',
        perceived_exertion: 6,
        exercises: []
      }
    ];

    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          gte: vi.fn(() => ({
            lte: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: mockWorkouts, error: null }))
            }))
          }))
        }))
      }))
    });

    const summary = await generateWeeklyWorkoutSummary('user123', '2024-01-01');

    expect(summary).toBeTruthy();
    expect(summary.total_workouts).toBe(2);
    expect(summary.completed_workouts).toBe(2);
    expect(summary.completion_rate).toBe(100);
    expect(summary.total_duration).toBe(75);
    expect(summary.average_intensity).toBe(6.5);
  });
});

describe('Workout Integration', () => {
  it('should handle complete workout flow', async () => {
    // 1. Parse workout from OCR
    const ocrText = `
      Morning Workout
      Today
      
      Push-ups 3x12
      Squats 3x15
      Plank 60 seconds
    `;

    const parsedWorkout = parseWorkoutFromOcr(ocrText);
    expect(parsedWorkout).toBeTruthy();

    // 2. Generate recommendations
    const recommendations = await generateWorkoutRecommendations('user123', '2024-01-01');
    expect(recommendations).toHaveLength(1);

    // 3. Analyze performance (would be called after workout completion)
    const mockWorkout = {
      id: 'workout123',
      user_id: 'user123',
      total_duration: 30,
      exercises: [
        {
          exercise_id: 'ex1',
          sets_completed: 3,
          reps_completed: 12,
          weight_used: 0,
          duration_completed: 0,
          difficulty_rating: 6,
          exercise: { name: 'Push-ups' }
        }
      ]
    };

    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: mockWorkout, error: null }))
        }))
      })),
      insert: vi.fn(() => Promise.resolve({ error: null }))
    });

    const analysis = await analyzeWorkoutPerformance('user123', 'workout123');
    expect(analysis).toBeTruthy();
  });
});

describe('Error Handling', () => {
  it('should handle database errors gracefully', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          gte: vi.fn(() => ({
            lte: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: null, error: new Error('Database error') }))
            }))
          }))
        }))
      }))
    });

    const recommendations = await generateWorkoutRecommendations('user123', '2024-01-01');
    
    // Should return default recommendations on error
    expect(recommendations).toHaveLength(1);
    expect(recommendations[0].type).toBe('cardio');
  });

  it('should handle invalid input gracefully', () => {
    const result = parseWorkoutFromOcr('');
    expect(result).toBeNull();

    const result2 = parseWorkoutFromDocument('');
    expect(result2).toBeNull();
  });
});