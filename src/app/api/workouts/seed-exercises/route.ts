import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

// Comprehensive exercise database seed data
const exerciseSeedData = [
  // Bodyweight Strength Exercises
  {
    name: 'Push-ups',
    description: 'Classic upper body strength exercise targeting chest, shoulders, and triceps',
    category: 'strength',
    muscle_groups: ['chest', 'shoulders', 'triceps', 'core'],
    equipment_needed: ['bodyweight'],
    difficulty_level: 2,
    instructions: [
      'Start in a plank position with hands slightly wider than shoulders',
      'Lower your body until chest nearly touches the floor',
      'Push back up to starting position',
      'Keep core tight and body straight throughout'
    ],
    tips: [
      'Keep elbows at 45-degree angle to body',
      'Don\'t let hips sag or pike up',
      'Breathe out on the way up'
    ],
    variations: ['Knee push-ups', 'Incline push-ups', 'Decline push-ups', 'Diamond push-ups']
  },
  {
    name: 'Squats',
    description: 'Fundamental lower body exercise targeting quadriceps, glutes, and hamstrings',
    category: 'strength',
    muscle_groups: ['quadriceps', 'glutes', 'hamstrings', 'calves'],
    equipment_needed: ['bodyweight'],
    difficulty_level: 1,
    instructions: [
      'Stand with feet shoulder-width apart',
      'Lower body by bending knees and hips',
      'Go down until thighs are parallel to floor',
      'Push through heels to return to standing'
    ],
    tips: [
      'Keep chest up and core engaged',
      'Knees should track over toes',
      'Weight should be on heels'
    ],
    variations: ['Jump squats', 'Pistol squats', 'Sumo squats', 'Wall sits']
  },
  {
    name: 'Plank',
    description: 'Isometric core strengthening exercise',
    category: 'strength',
    muscle_groups: ['core', 'shoulders', 'glutes'],
    equipment_needed: ['bodyweight'],
    difficulty_level: 2,
    instructions: [
      'Start in push-up position',
      'Lower to forearms, keeping body straight',
      'Hold position with core engaged',
      'Breathe normally throughout'
    ],
    tips: [
      'Keep hips level with shoulders',
      'Don\'t let lower back sag',
      'Engage core muscles throughout'
    ],
    variations: ['Side plank', 'Plank with leg lift', 'Plank jacks', 'Mountain climbers']
  },
  {
    name: 'Lunges',
    description: 'Single-leg strength exercise for lower body',
    category: 'strength',
    muscle_groups: ['quadriceps', 'glutes', 'hamstrings', 'calves'],
    equipment_needed: ['bodyweight'],
    difficulty_level: 2,
    instructions: [
      'Step forward with one leg',
      'Lower hips until both knees are at 90 degrees',
      'Push back to starting position',
      'Alternate legs'
    ],
    tips: [
      'Keep front knee over ankle',
      'Don\'t let back knee touch ground hard',
      'Keep torso upright'
    ],
    variations: ['Reverse lunges', 'Walking lunges', 'Lateral lunges', 'Jumping lunges']
  },
  {
    name: 'Burpees',
    description: 'Full-body high-intensity exercise combining squat, push-up, and jump',
    category: 'cardio',
    muscle_groups: ['full_body'],
    equipment_needed: ['bodyweight'],
    difficulty_level: 4,
    instructions: [
      'Start standing',
      'Drop into squat and place hands on floor',
      'Jump feet back to plank position',
      'Do a push-up',
      'Jump feet back to squat',
      'Jump up with arms overhead'
    ],
    tips: [
      'Maintain good form over speed',
      'Land softly on jumps',
      'Keep core engaged throughout'
    ],
    variations: ['Half burpees', 'Burpee with tuck jump', 'Burpee with mountain climber']
  },
  {
    name: 'Mountain Climbers',
    description: 'High-intensity cardio exercise targeting core and legs',
    category: 'cardio',
    muscle_groups: ['core', 'legs', 'shoulders'],
    equipment_needed: ['bodyweight'],
    difficulty_level: 3,
    instructions: [
      'Start in plank position',
      'Bring right knee to chest',
      'Quickly switch legs',
      'Continue alternating at fast pace'
    ],
    tips: [
      'Keep hips level',
      'Maintain plank position',
      'Drive knees toward chest'
    ],
    variations: ['Slow mountain climbers', 'Cross-body mountain climbers', 'Mountain climber burpees']
  },
  {
    name: 'Jumping Jacks',
    description: 'Classic cardio warm-up exercise',
    category: 'cardio',
    muscle_groups: ['legs', 'shoulders', 'core'],
    equipment_needed: ['bodyweight'],
    difficulty_level: 1,
    instructions: [
      'Start standing with arms at sides',
      'Jump feet apart while raising arms overhead',
      'Jump feet back together while lowering arms',
      'Repeat at steady pace'
    ],
    tips: [
      'Land softly on balls of feet',
      'Keep knees slightly bent',
      'Maintain good posture'
    ],
    variations: ['Low-impact jacks', 'Star jumps', 'Seal jacks']
  },
  {
    name: 'High Knees',
    description: 'Running in place with high knee lifts',
    category: 'cardio',
    muscle_groups: ['legs', 'core', 'hip_flexors'],
    equipment_needed: ['bodyweight'],
    difficulty_level: 2,
    instructions: [
      'Run in place',
      'Lift knees as high as possible',
      'Pump arms naturally',
      'Stay on balls of feet'
    ],
    tips: [
      'Keep core engaged',
      'Maintain upright posture',
      'Land softly'
    ],
    variations: ['Butt kicks', 'High knees with arm circles', 'High knees in place']
  },
  {
    name: 'Downward Dog',
    description: 'Yoga pose for stretching and strengthening',
    category: 'flexibility',
    muscle_groups: ['hamstrings', 'calves', 'shoulders', 'back'],
    equipment_needed: ['bodyweight'],
    difficulty_level: 2,
    instructions: [
      'Start on hands and knees',
      'Tuck toes and lift hips up',
      'Straighten legs as much as possible',
      'Press hands into floor'
    ],
    tips: [
      'Keep spine long',
      'Bend knees if hamstrings are tight',
      'Press heels toward floor'
    ],
    variations: ['Puppy pose', 'Three-legged dog', 'Downward dog with knee to nose']
  },
  {
    name: 'Cat-Cow Stretch',
    description: 'Gentle spinal mobility exercise',
    category: 'flexibility',
    muscle_groups: ['spine', 'back', 'core'],
    equipment_needed: ['bodyweight'],
    difficulty_level: 1,
    instructions: [
      'Start on hands and knees',
      'Arch back and look up (cow)',
      'Round spine and look down (cat)',
      'Flow between positions slowly'
    ],
    tips: [
      'Move slowly and mindfully',
      'Breathe with the movement',
      'Keep movements smooth'
    ],
    variations: ['Seated cat-cow', 'Standing cat-cow']
  },
  {
    name: 'Hip Flexor Stretch',
    description: 'Stretch for hip flexors and quadriceps',
    category: 'flexibility',
    muscle_groups: ['hip_flexors', 'quadriceps'],
    equipment_needed: ['bodyweight'],
    difficulty_level: 2,
    instructions: [
      'Step forward into lunge position',
      'Lower back knee to ground',
      'Push hips forward gently',
      'Hold stretch for 30 seconds'
    ],
    tips: [
      'Keep front knee over ankle',
      'Don\'t overstretch',
      'Breathe deeply'
    ],
    variations: ['Standing hip flexor stretch', 'Hip flexor stretch with rotation']
  },
  {
    name: 'Shoulder Rolls',
    description: 'Gentle shoulder mobility exercise',
    category: 'flexibility',
    muscle_groups: ['shoulders', 'upper_back'],
    equipment_needed: ['bodyweight'],
    difficulty_level: 1,
    instructions: [
      'Stand or sit with arms at sides',
      'Roll shoulders backward in circles',
      'Make circles larger gradually',
      'Reverse direction after 10 rolls'
    ],
    tips: [
      'Keep movements smooth',
      'Don\'t force the movement',
      'Relax neck and jaw'
    ],
    variations: ['Forward shoulder rolls', 'Single arm shoulder rolls']
  },
  // Equipment-based exercises
  {
    name: 'Dumbbell Bench Press',
    description: 'Upper body strength exercise with dumbbells',
    category: 'strength',
    muscle_groups: ['chest', 'shoulders', 'triceps'],
    equipment_needed: ['dumbbells', 'bench'],
    difficulty_level: 3,
    instructions: [
      'Lie on bench with dumbbells at chest level',
      'Press weights up until arms are extended',
      'Lower weights with control to chest',
      'Repeat for desired reps'
    ],
    tips: [
      'Keep feet flat on floor',
      'Don\'t bounce weights off chest',
      'Maintain slight arch in back'
    ],
    variations: ['Incline dumbbell press', 'Decline dumbbell press', 'Single arm press']
  },
  {
    name: 'Dumbbell Rows',
    description: 'Back strengthening exercise with dumbbells',
    category: 'strength',
    muscle_groups: ['back', 'biceps', 'rear_delts'],
    equipment_needed: ['dumbbells', 'bench'],
    difficulty_level: 3,
    instructions: [
      'Place knee and hand on bench',
      'Hold dumbbell in free hand',
      'Pull weight to hip, squeezing shoulder blade',
      'Lower with control and repeat'
    ],
    tips: [
      'Keep core engaged',
      'Don\'t rotate torso',
      'Focus on pulling with back muscles'
    ],
    variations: ['Bent-over rows', 'Seated rows', 'Single arm rows']
  },
  {
    name: 'Dumbbell Squats',
    description: 'Lower body strength exercise with added weight',
    category: 'strength',
    muscle_groups: ['quadriceps', 'glutes', 'hamstrings'],
    equipment_needed: ['dumbbells'],
    difficulty_level: 3,
    instructions: [
      'Hold dumbbells at shoulder level',
      'Stand with feet shoulder-width apart',
      'Lower into squat position',
      'Drive through heels to stand up'
    ],
    tips: [
      'Keep chest up',
      'Knees track over toes',
      'Don\'t let knees cave in'
    ],
    variations: ['Goblet squats', 'Front squats', 'Bulgarian split squats']
  },
  {
    name: 'Resistance Band Pull-aparts',
    description: 'Shoulder and upper back strengthening with resistance band',
    category: 'strength',
    muscle_groups: ['rear_delts', 'upper_back', 'rhomboids'],
    equipment_needed: ['resistance_bands'],
    difficulty_level: 2,
    instructions: [
      'Hold band with both hands at chest level',
      'Pull band apart by squeezing shoulder blades',
      'Return to starting position slowly',
      'Keep arms straight throughout'
    ],
    tips: [
      'Focus on squeezing shoulder blades',
      'Don\'t let shoulders shrug up',
      'Control the return movement'
    ],
    variations: ['Overhead pull-aparts', 'Low pull-aparts', 'Single arm pull-aparts']
  },
  {
    name: 'Resistance Band Bicep Curls',
    description: 'Bicep strengthening with resistance band',
    category: 'strength',
    muscle_groups: ['biceps', 'forearms'],
    equipment_needed: ['resistance_bands'],
    difficulty_level: 2,
    instructions: [
      'Stand on band with feet shoulder-width apart',
      'Hold handles with palms facing forward',
      'Curl hands up to shoulders',
      'Lower with control and repeat'
    ],
    tips: [
      'Keep elbows at sides',
      'Don\'t swing the weight',
      'Squeeze biceps at top'
    ],
    variations: ['Hammer curls', 'Concentration curls', 'Single arm curls']
  }
];

export async function POST(request: NextRequest) {
  try {
    logger.apiRequest('POST', '/api/workouts/seed-exercises');

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      logger.error('Authentication failed - no user found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if exercises already exist
    const { data: existingExercises, error: checkError } = await supabase
      .from('exercises')
      .select('id')
      .limit(1);

    if (checkError) {
      logger.error('Failed to check existing exercises', checkError);
      return NextResponse.json(
        { error: 'Failed to check database' },
        { status: 500 }
      );
    }

    if (existingExercises && existingExercises.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Exercises already seeded',
        count: existingExercises.length,
      });
    }

    // Insert exercise seed data
    const { data: insertedExercises, error: insertError } = await supabase
      .from('exercises')
      .insert(exerciseSeedData)
      .select('id, name');

    if (insertError) {
      logger.error('Failed to insert exercise seed data', insertError);
      return NextResponse.json(
        { error: 'Failed to seed exercises' },
        { status: 500 }
      );
    }

    logger.info('Exercise seed data inserted successfully', {
      count: insertedExercises.length,
    });

    return NextResponse.json({
      success: true,
      message: 'Exercises seeded successfully',
      count: insertedExercises.length,
      exercises: insertedExercises,
    });

  } catch (error: any) {
    logger.error(
      'Exercise seeding API error',
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