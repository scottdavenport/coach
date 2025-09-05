'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  Pause, 
  Square, 
  Clock, 
  Dumbbell, 
  Target, 
  TrendingUp,
  CheckCircle,
  Circle,
  Timer,
  Zap,
  Heart,
  Star
} from 'lucide-react';
import { WorkoutTemplate, UserWorkout, WorkoutExercise } from '@/types';

interface WorkoutDisplayProps {
  workout: WorkoutTemplate | UserWorkout;
  isActive?: boolean;
  onStart?: () => void;
  onPause?: () => void;
  onComplete?: () => void;
  onExerciseComplete?: (exerciseId: string, data: any) => void;
  showProgress?: boolean;
  showControls?: boolean;
}

export function WorkoutDisplay({
  workout,
  isActive = false,
  onStart,
  onPause,
  onComplete,
  onExerciseComplete,
  showProgress = true,
  showControls = true,
}: WorkoutDisplayProps) {
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [exerciseData, setExerciseData] = useState<Record<string, any>>({});
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);

  const exercises = 'exercises' in workout ? workout.exercises : [];
  const currentExercise = exercises[currentExerciseIndex];

  // Timer effect
  useEffect(() => {
    if (isActive && !isPaused) {
      const interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
      setTimerInterval(interval);
    } else {
      if (timerInterval) {
        clearInterval(timerInterval);
        setTimerInterval(null);
      }
    }

    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [isActive, isPaused]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    setIsPaused(false);
    onStart?.();
  };

  const handlePause = () => {
    setIsPaused(!isPaused);
    onPause?.();
  };

  const handleComplete = () => {
    if (timerInterval) {
      clearInterval(timerInterval);
    }
    onComplete?.();
  };

  const handleNextExercise = () => {
    if (currentExerciseIndex < exercises.length - 1) {
      setCurrentExerciseIndex(prev => prev + 1);
    }
  };

  const handlePreviousExercise = () => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex(prev => prev - 1);
    }
  };

  const handleExerciseDataChange = (exerciseId: string, field: string, value: any) => {
    setExerciseData(prev => ({
      ...prev,
      [exerciseId]: {
        ...prev[exerciseId],
        [field]: value,
      },
    }));
  };

  const handleExerciseComplete = (exerciseId: string) => {
    const data = exerciseData[exerciseId] || {};
    onExerciseComplete?.(exerciseId, data);
    
    // Move to next exercise
    if (currentExerciseIndex < exercises.length - 1) {
      setCurrentExerciseIndex(prev => prev + 1);
    }
  };

  const getDifficultyColor = (level: number) => {
    if (level <= 2) return 'bg-green-100 text-green-800';
    if (level <= 3) return 'bg-yellow-100 text-yellow-800';
    if (level <= 4) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'strength':
        return <Dumbbell className="h-4 w-4" />;
      case 'cardio':
        return <Heart className="h-4 w-4" />;
      case 'flexibility':
        return <Target className="h-4 w-4" />;
      default:
        return <Zap className="h-4 w-4" />;
    }
  };

  const progress = exercises.length > 0 ? ((currentExerciseIndex + 1) / exercises.length) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Workout Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {getCategoryIcon(workout.category)}
                {workout.name}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {workout.description}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={getDifficultyColor(workout.difficulty_level)}>
                Level {workout.difficulty_level}
              </Badge>
              <Badge variant="outline">
                {workout.estimated_duration} min
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        {showProgress && (
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span>Progress</span>
                <span>{currentExerciseIndex + 1} of {exercises.length} exercises</span>
              </div>
              <Progress value={progress} className="h-2" />
              
              {isActive && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Timer className="h-4 w-4" />
                    <span className="font-mono">{formatTime(elapsedTime)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isPaused ? (
                      <Button onClick={handleStart} size="sm">
                        <Play className="h-4 w-4 mr-1" />
                        Resume
                      </Button>
                    ) : (
                      <Button onClick={handlePause} variant="outline" size="sm">
                        <Pause className="h-4 w-4 mr-1" />
                        Pause
                      </Button>
                    )}
                    <Button onClick={handleComplete} variant="destructive" size="sm">
                      <Square className="h-4 w-4 mr-1" />
                      Complete
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Current Exercise */}
      {currentExercise && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl font-bold text-primary">
                  {currentExerciseIndex + 1}
                </span>
                {currentExercise.exercise?.name || 'Exercise'}
              </CardTitle>
              <div className="flex items-center gap-2">
                {currentExercise.sets && (
                  <Badge variant="outline">
                    {currentExercise.sets} sets
                  </Badge>
                )}
                {currentExercise.reps && (
                  <Badge variant="outline">
                    {currentExercise.reps} reps
                  </Badge>
                )}
                {currentExercise.duration_seconds && (
                  <Badge variant="outline">
                    {Math.floor(currentExercise.duration_seconds / 60)}:{(currentExercise.duration_seconds % 60).toString().padStart(2, '0')}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {currentExercise.exercise?.description && (
              <p className="text-sm text-muted-foreground">
                {currentExercise.exercise.description}
              </p>
            )}

            {currentExercise.exercise?.instructions && (
              <div className="space-y-2">
                <h4 className="font-medium">Instructions:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {currentExercise.exercise.instructions.map((instruction, index) => (
                    <li key={index}>{instruction}</li>
                  ))}
                </ul>
              </div>
            )}

            {currentExercise.exercise?.tips && (
              <div className="space-y-2">
                <h4 className="font-medium">Tips:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {currentExercise.exercise.tips.map((tip, index) => (
                    <li key={index}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Exercise Tracking Form */}
            {isActive && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                <h4 className="font-medium">Track Your Performance:</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  {currentExercise.sets && (
                    <div>
                      <label className="text-sm font-medium">Sets Completed</label>
                      <input
                        type="number"
                        min="0"
                        max={currentExercise.sets}
                        value={exerciseData[currentExercise.exercise_id]?.sets_completed || ''}
                        onChange={(e) => handleExerciseDataChange(
                          currentExercise.exercise_id,
                          'sets_completed',
                          parseInt(e.target.value) || 0
                        )}
                        className="w-full mt-1 px-3 py-2 border rounded-md"
                      />
                    </div>
                  )}
                  
                  {currentExercise.reps && (
                    <div>
                      <label className="text-sm font-medium">Reps Completed</label>
                      <input
                        type="number"
                        min="0"
                        value={exerciseData[currentExercise.exercise_id]?.reps_completed || ''}
                        onChange={(e) => handleExerciseDataChange(
                          currentExercise.exercise_id,
                          'reps_completed',
                          parseInt(e.target.value) || 0
                        )}
                        className="w-full mt-1 px-3 py-2 border rounded-md"
                      />
                    </div>
                  )}
                  
                  {currentExercise.duration_seconds && (
                    <div>
                      <label className="text-sm font-medium">Duration (seconds)</label>
                      <input
                        type="number"
                        min="0"
                        value={exerciseData[currentExercise.exercise_id]?.duration_completed || ''}
                        onChange={(e) => handleExerciseDataChange(
                          currentExercise.exercise_id,
                          'duration_completed',
                          parseInt(e.target.value) || 0
                        )}
                        className="w-full mt-1 px-3 py-2 border rounded-md"
                      />
                    </div>
                  )}
                  
                  <div>
                    <label className="text-sm font-medium">Weight Used (kg)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={exerciseData[currentExercise.exercise_id]?.weight_used || ''}
                      onChange={(e) => handleExerciseDataChange(
                        currentExercise.exercise_id,
                        'weight_used',
                        parseFloat(e.target.value) || 0
                      )}
                      className="w-full mt-1 px-3 py-2 border rounded-md"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Difficulty Rating (1-5)</label>
                  <div className="flex items-center gap-2 mt-1">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        onClick={() => handleExerciseDataChange(
                          currentExercise.exercise_id,
                          'difficulty_rating',
                          rating
                        )}
                        className={`p-2 rounded-full ${
                          exerciseData[currentExercise.exercise_id]?.difficulty_rating === rating
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted hover:bg-muted/80'
                        }`}
                      >
                        <Star className="h-4 w-4" />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Notes</label>
                  <textarea
                    value={exerciseData[currentExercise.exercise_id]?.notes || ''}
                    onChange={(e) => handleExerciseDataChange(
                      currentExercise.exercise_id,
                      'notes',
                      e.target.value
                    )}
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    rows={2}
                    placeholder="Any notes about this exercise..."
                  />
                </div>

                <Button 
                  onClick={() => handleExerciseComplete(currentExercise.exercise_id)}
                  className="w-full"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Complete Exercise
                </Button>
              </div>
            )}

            {/* Navigation */}
            {showControls && (
              <div className="flex items-center justify-between">
                <Button
                  onClick={handlePreviousExercise}
                  disabled={currentExerciseIndex === 0}
                  variant="outline"
                >
                  Previous
                </Button>
                
                <div className="flex items-center gap-2">
                  {exercises.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentExerciseIndex(index)}
                      className={`w-3 h-3 rounded-full ${
                        index === currentExerciseIndex
                          ? 'bg-primary'
                          : index < currentExerciseIndex
                          ? 'bg-green-500'
                          : 'bg-muted'
                      }`}
                    />
                  ))}
                </div>
                
                <Button
                  onClick={handleNextExercise}
                  disabled={currentExerciseIndex === exercises.length - 1}
                  variant="outline"
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Exercise List Overview */}
      {!isActive && (
        <Card>
          <CardHeader>
            <CardTitle>Exercise List</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {exercises.map((exercise, index) => (
                <div
                  key={exercise.exercise_id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      index < currentExerciseIndex
                        ? 'bg-green-100 text-green-800'
                        : index === currentExerciseIndex
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {index < currentExerciseIndex ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{exercise.exercise?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {exercise.sets && `${exercise.sets} sets`}
                        {exercise.reps && ` • ${exercise.reps} reps`}
                        {exercise.duration_seconds && ` • ${Math.floor(exercise.duration_seconds / 60)}:${(exercise.duration_seconds % 60).toString().padStart(2, '0')}`}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">
                    {exercise.exercise?.category}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}