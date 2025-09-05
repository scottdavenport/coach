export interface WorkoutStep {
  title: string;
  duration: string;
  description: string;
}

export interface ParsedWorkout {
  title: string;
  steps: WorkoutStep[];
  totalTime: string;
}

// Enhanced workout parsing for OCR and document processing
export interface WorkoutOcrData {
  workout_name?: string;
  exercises: Array<{
    name: string;
    sets?: number;
    reps?: number;
    weight?: number;
    duration?: number;
    notes?: string;
  }>;
  total_duration?: number;
  date?: string;
  notes?: string;
}

export interface WorkoutDocumentData {
  file_type: 'workout_log' | 'training_plan' | 'exercise_guide';
  extracted_workouts: Array<{
    name: string;
    date: string;
    exercises: Array<{
      name: string;
      sets?: number;
      reps?: number;
      weight?: number;
      duration?: number;
      notes?: string;
    }>;
    total_duration?: number;
    notes?: string;
  }>;
  extracted_exercises: Array<{
    name: string;
    description?: string;
    category?: string;
    muscle_groups?: string[];
    equipment_needed?: string[];
  }>;
  metadata: {
    source: string;
    confidence: number;
    processing_notes: string[];
  };
}

export function parseWorkoutFromMarkdown(
  markdown: string
): ParsedWorkout | null {
  try {
    // Extract title (usually after ### or ##)
    const titleMatch = markdown.match(/(?:###|##)\s*(.+?)(?:\n|$)/);
    const title = titleMatch
      ? titleMatch[1].replace(/:/g, '').trim()
      : 'Workout Routine';

    // Extract total time
    const totalTimeMatch = markdown.match(/Total Time:\s*(\d+\s*minutes?)/i);
    const totalTime = totalTimeMatch ? totalTimeMatch[1] : '8 minutes';

    // Extract steps (numbered list items)
    const stepRegex =
      /(\d+)\.\s*\*\*(.+?)\*\*\s*\(([^)]+)\)\s*-\s*(.+?)(?=\n\d+\.|$)/gs;
    const steps: WorkoutStep[] = [];

    let match;
    while ((match = stepRegex.exec(markdown)) !== null) {
      const [, , title, duration, description] = match;
      steps.push({
        title: title.trim(),
        duration: duration.trim(),
        description: description.trim(),
      });
    }

    // If no numbered steps found, try alternative format
    if (steps.length === 0) {
      const altStepRegex =
        /(\d+)\.\s*(.+?)\s*\(([^)]+)\)\s*-\s*(.+?)(?=\n\d+\.|$)/gs;
      while ((match = altStepRegex.exec(markdown)) !== null) {
        const [, , title, duration, description] = match;
        steps.push({
          title: title.trim(),
          duration: duration.trim(),
          description: description.trim(),
        });
      }
    }

    // If still no steps, try to extract from any list format
    if (steps.length === 0) {
      const listItemRegex =
        /[-*]\s*(.+?)\s*\(([^)]+)\)\s*-\s*(.+?)(?=\n[-*]|$)/gs;
      while ((match = listItemRegex.exec(markdown)) !== null) {
        const [, title, duration, description] = match;
        steps.push({
          title: title.trim(),
          duration: duration.trim(),
          description: description.trim(),
        });
      }
    }

    if (steps.length === 0) {
      return null;
    }

    return {
      title,
      steps,
      totalTime,
    };
  } catch (error) {
    console.error('Error parsing workout from markdown:', error);
    return null;
  }
}

// Example usage for the golf warm-up workout
export function createGolfWarmupWorkout(): ParsedWorkout {
  return {
    title: 'Pre-Golf Mobility and Warm-Up Routine',
    totalTime: '8 minutes',
    steps: [
      {
        title: 'Dynamic Arm Circles',
        duration: '1 minute',
        description:
          'Stand tall and extend your arms out to the sides. Make small circles forward for 30 seconds, then reverse for another 30 seconds.',
      },
      {
        title: 'Torso Twists',
        duration: '1 minute',
        description:
          'Stand with your feet shoulder-width apart. Rotate your torso to the right and then to the left, allowing your arms to follow the motion. Repeat for 1 minute.',
      },
      {
        title: 'Leg Swings',
        duration: '1 minute',
        description:
          'Stand next to a wall for support. Swing one leg forward and backward for 30 seconds, then switch to the other leg.',
      },
      {
        title: 'Hip Openers',
        duration: '1 minute',
        description:
          'Stand tall and lift your right knee towards your chest. Rotate it outward and then back down. Repeat for 30 seconds on each leg.',
      },
      {
        title: 'Ankle Rolls',
        duration: '1 minute',
        description:
          'Lift one foot off the ground and roll your ankle in circles for 30 seconds, then switch to the other foot.',
      },
      {
        title: 'Walking Lunges',
        duration: '2 minutes',
        description:
          'Take a step forward with your right leg and lower into a lunge. Alternate legs while walking forward for about 2 minutes.',
      },
      {
        title: 'Gentle Stretching',
        duration: '2 minutes',
        description:
          'Finish with some gentle stretches for your arms, legs, and back to loosen up any tight spots.',
      },
    ],
  };
}

/**
 * Parse workout data from OCR text (e.g., from workout app screenshots)
 */
export function parseWorkoutFromOcr(ocrText: string): WorkoutOcrData | null {
  try {
    const lines = ocrText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    const workoutData: WorkoutOcrData = {
      exercises: [],
    };

    let currentExercise: any = null;
    let inExerciseSection = false;

    for (const line of lines) {
      // Look for workout name/title
      if (!workoutData.workout_name && (
        line.toLowerCase().includes('workout') ||
        line.toLowerCase().includes('training') ||
        line.toLowerCase().includes('session')
      )) {
        workoutData.workout_name = line;
        continue;
      }

      // Look for date
      if (!workoutData.date && (
        line.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/) ||
        line.match(/\d{4}-\d{2}-\d{2}/) ||
        line.toLowerCase().includes('today') ||
        line.toLowerCase().includes('yesterday')
      )) {
        workoutData.date = line;
        continue;
      }

      // Look for total duration
      if (!workoutData.total_duration && line.match(/\d+\s*(min|minutes?|hr|hours?)/i)) {
        const durationMatch = line.match(/(\d+)\s*(min|minutes?|hr|hours?)/i);
        if (durationMatch) {
          const value = parseInt(durationMatch[1]);
          const unit = durationMatch[2].toLowerCase();
          workoutData.total_duration = unit.startsWith('hr') ? value * 60 : value;
        }
        continue;
      }

      // Look for exercise patterns
      // Pattern: "Exercise Name" followed by sets/reps/weight
      if (line.match(/^\w+.*\d+.*\d+/) || line.match(/^\w+.*\d+\s*(sets?|reps?|x)/i)) {
        // Save previous exercise if exists
        if (currentExercise) {
          workoutData.exercises.push(currentExercise);
        }

        // Parse new exercise
        currentExercise = parseExerciseLine(line);
        inExerciseSection = true;
        continue;
      }

      // Look for sets/reps/weight patterns
      if (inExerciseSection && currentExercise && line.match(/\d+.*\d+/)) {
        const exerciseDetails = parseExerciseDetails(line);
        if (exerciseDetails) {
          Object.assign(currentExercise, exerciseDetails);
        }
        continue;
      }

      // Look for notes
      if (line.toLowerCase().includes('note') || line.toLowerCase().includes('comment')) {
        if (currentExercise) {
          currentExercise.notes = line;
        } else {
          workoutData.notes = line;
        }
        continue;
      }
    }

    // Add the last exercise
    if (currentExercise) {
      workoutData.exercises.push(currentExercise);
    }

    return workoutData.exercises.length > 0 ? workoutData : null;
  } catch (error) {
    console.error('Error parsing workout from OCR:', error);
    return null;
  }
}

/**
 * Parse a single exercise line from OCR text
 */
function parseExerciseLine(line: string): any {
  const exercise: any = {
    name: '',
    sets: undefined,
    reps: undefined,
    weight: undefined,
    duration: undefined,
  };

  // Extract exercise name (everything before numbers)
  const nameMatch = line.match(/^([^0-9]+)/);
  if (nameMatch) {
    exercise.name = nameMatch[1].trim();
  }

  // Extract numbers and try to identify what they represent
  const numbers = line.match(/\d+/g);
  if (numbers) {
    const nums = numbers.map(n => parseInt(n));
    
    // Common patterns:
    // "3x12" or "3 x 12" -> sets x reps
    // "3x12x50" -> sets x reps x weight
    // "12 reps" -> reps
    // "3 sets" -> sets
    // "50 lbs" or "50kg" -> weight
    
    if (line.includes('x') || line.includes('×')) {
      if (nums.length >= 2) {
        exercise.sets = nums[0];
        exercise.reps = nums[1];
        if (nums.length >= 3) {
          exercise.weight = nums[2];
        }
      }
    } else {
      // Try to identify based on context
      if (line.toLowerCase().includes('set')) {
        exercise.sets = nums[0];
      } else if (line.toLowerCase().includes('rep')) {
        exercise.reps = nums[0];
      } else if (line.toLowerCase().includes('lb') || line.toLowerCase().includes('kg')) {
        exercise.weight = nums[0];
      } else if (line.toLowerCase().includes('min') || line.toLowerCase().includes('sec')) {
        exercise.duration = nums[0];
      }
    }
  }

  return exercise;
}

/**
 * Parse additional exercise details from a line
 */
function parseExerciseDetails(line: string): any {
  const details: any = {};
  
  // Look for weight
  const weightMatch = line.match(/(\d+)\s*(lbs?|kg|pounds?)/i);
  if (weightMatch) {
    details.weight = parseInt(weightMatch[1]);
  }

  // Look for duration
  const durationMatch = line.match(/(\d+)\s*(min|minutes?|sec|seconds?)/i);
  if (durationMatch) {
    const value = parseInt(durationMatch[1]);
    const unit = durationMatch[2].toLowerCase();
    details.duration = unit.startsWith('min') ? value * 60 : value;
  }

  // Look for sets/reps
  const setsRepsMatch = line.match(/(\d+)\s*(sets?|reps?)/i);
  if (setsRepsMatch) {
    const value = parseInt(setsRepsMatch[1]);
    const type = setsRepsMatch[2].toLowerCase();
    if (type.startsWith('set')) {
      details.sets = value;
    } else if (type.startsWith('rep')) {
      details.reps = value;
    }
  }

  return Object.keys(details).length > 0 ? details : null;
}

/**
 * Parse workout data from document text (e.g., PDF training plans)
 */
export function parseWorkoutFromDocument(documentText: string): WorkoutDocumentData | null {
  try {
    const lines = documentText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    const documentData: WorkoutDocumentData = {
      file_type: 'training_plan',
      extracted_workouts: [],
      extracted_exercises: [],
      metadata: {
        source: 'document_parsing',
        confidence: 0.7,
        processing_notes: [],
      },
    };

    let currentWorkout: any = null;
    let currentExercise: any = null;
    let inWorkoutSection = false;
    let inExerciseSection = false;

    for (const line of lines) {
      // Look for workout/training plan headers
      if (line.match(/^(workout|training|session|day)\s*\d*/i) || 
          line.match(/^week\s*\d+/i) ||
          line.match(/^day\s*\d+/i)) {
        
        // Save previous workout if exists
        if (currentWorkout && currentWorkout.exercises.length > 0) {
          documentData.extracted_workouts.push(currentWorkout);
        }

        currentWorkout = {
          name: line,
          date: new Date().toISOString().split('T')[0], // Default to today
          exercises: [],
          total_duration: undefined,
          notes: undefined,
        };
        inWorkoutSection = true;
        inExerciseSection = false;
        continue;
      }

      // Look for exercise names (usually capitalized, not numbers)
      if (inWorkoutSection && line.match(/^[A-Z][a-z]+.*[a-z]$/) && !line.match(/\d+/)) {
        // Save previous exercise if exists
        if (currentExercise) {
          currentWorkout.exercises.push(currentExercise);
        }

        currentExercise = {
          name: line,
          sets: undefined,
          reps: undefined,
          weight: undefined,
          duration: undefined,
          notes: undefined,
        };
        inExerciseSection = true;
        continue;
      }

      // Look for exercise details
      if (inExerciseSection && currentExercise && line.match(/\d+/)) {
        const details = parseExerciseDetails(line);
        if (details) {
          Object.assign(currentExercise, details);
        }
        continue;
      }

      // Look for workout duration
      if (inWorkoutSection && currentWorkout && !currentWorkout.total_duration && 
          line.match(/\d+\s*(min|minutes?|hr|hours?)/i)) {
        const durationMatch = line.match(/(\d+)\s*(min|minutes?|hr|hours?)/i);
        if (durationMatch) {
          const value = parseInt(durationMatch[1]);
          const unit = durationMatch[2].toLowerCase();
          currentWorkout.total_duration = unit.startsWith('hr') ? value * 60 : value;
        }
        continue;
      }

      // Look for notes
      if (line.toLowerCase().includes('note') || line.toLowerCase().includes('comment')) {
        if (currentExercise) {
          currentExercise.notes = line;
        } else if (currentWorkout) {
          currentWorkout.notes = line;
        }
        continue;
      }
    }

    // Add the last exercise and workout
    if (currentExercise) {
      currentWorkout?.exercises.push(currentExercise);
    }
    if (currentWorkout && currentWorkout.exercises.length > 0) {
      documentData.extracted_workouts.push(currentWorkout);
    }

    return documentData.extracted_workouts.length > 0 ? documentData : null;
  } catch (error) {
    console.error('Error parsing workout from document:', error);
    return null;
  }
}
