'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Save,
  User,
  Target,
  Dumbbell,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { UserWorkoutPreferences } from '@/types';

interface WorkoutPreferencesProps {
  userId: string;
  onPreferencesUpdate?: (preferences: UserWorkoutPreferences) => void;
}

export function WorkoutPreferences({
  userId,
  onPreferencesUpdate,
}: WorkoutPreferencesProps) {
  const [preferences, setPreferences] = useState<UserWorkoutPreferences>({
    id: '',
    user_id: userId,
    fitness_level: 'beginner',
    primary_goals: ['general_fitness'],
    available_equipment: ['bodyweight'],
    preferred_workout_duration: 30,
    preferred_workout_times: ['morning'],
    workout_frequency: 3,
    injury_limitations: [],
    exercise_preferences: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>(
    'idle'
  );

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, [userId]);

  const loadPreferences = async () => {
    try {
      const response = await fetch('/api/workouts/preferences');
      const data = await response.json();

      if (data.success && data.preferences) {
        setPreferences(data.preferences);
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const savePreferences = async () => {
    setIsSaving(true);
    setSaveStatus('idle');

    try {
      const response = await fetch('/api/workouts/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      });

      const data = await response.json();

      if (data.success) {
        setSaveStatus('success');
        onPreferencesUpdate?.(data.preferences);
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        setSaveStatus('error');
      }
    } catch (error) {
      console.error('Failed to save preferences:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const updatePreference = (
    field: keyof UserWorkoutPreferences,
    value: any
  ) => {
    setPreferences(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const toggleArrayItem = (
    field:
      | 'primary_goals'
      | 'available_equipment'
      | 'preferred_workout_times'
      | 'injury_limitations'
      | 'exercise_preferences',
    item: string
  ) => {
    setPreferences(prev => ({
      ...prev,
      [field]: prev[field].includes(item)
        ? prev[field].filter(i => i !== item)
        : [...prev[field], item],
    }));
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Workout Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Fitness Level */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Fitness Level
            </label>
            <div className="flex gap-2">
              {['beginner', 'intermediate', 'advanced'].map(level => (
                <Button
                  key={level}
                  variant={
                    preferences.fitness_level === level ? 'default' : 'outline'
                  }
                  size="sm"
                  onClick={() => updatePreference('fitness_level', level)}
                  className="capitalize"
                >
                  {level}
                </Button>
              ))}
            </div>
          </div>

          {/* Primary Goals */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Primary Goals
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                'general_fitness',
                'weight_loss',
                'muscle_gain',
                'strength',
                'endurance',
                'flexibility',
                'sports_performance',
                'rehabilitation',
              ].map(goal => (
                <Badge
                  key={goal}
                  variant={
                    preferences.primary_goals.includes(goal)
                      ? 'default'
                      : 'outline'
                  }
                  className="cursor-pointer capitalize"
                  onClick={() => toggleArrayItem('primary_goals', goal)}
                >
                  {goal.replace('_', ' ')}
                </Badge>
              ))}
            </div>
          </div>

          {/* Available Equipment */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Available Equipment
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                'bodyweight',
                'dumbbells',
                'barbell',
                'kettlebell',
                'resistance_bands',
                'yoga_mat',
                'pull_up_bar',
                'bench',
                'treadmill',
                'bike',
                'elliptical',
                'rower',
              ].map(equipment => (
                <Badge
                  key={equipment}
                  variant={
                    preferences.available_equipment.includes(equipment)
                      ? 'default'
                      : 'outline'
                  }
                  className="cursor-pointer capitalize"
                  onClick={() =>
                    toggleArrayItem('available_equipment', equipment)
                  }
                >
                  {equipment.replace('_', ' ')}
                </Badge>
              ))}
            </div>
          </div>

          {/* Workout Duration */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Preferred Workout Duration (minutes)
            </label>
            <div className="flex gap-2">
              {[15, 30, 45, 60, 90].map(duration => (
                <Button
                  key={duration}
                  variant={
                    preferences.preferred_workout_duration === duration
                      ? 'default'
                      : 'outline'
                  }
                  size="sm"
                  onClick={() =>
                    updatePreference('preferred_workout_duration', duration)
                  }
                >
                  {duration} min
                </Button>
              ))}
            </div>
          </div>

          {/* Workout Times */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Preferred Workout Times
            </label>
            <div className="flex flex-wrap gap-2">
              {['morning', 'afternoon', 'evening', 'anytime'].map(time => (
                <Badge
                  key={time}
                  variant={
                    preferences.preferred_workout_times.includes(time)
                      ? 'default'
                      : 'outline'
                  }
                  className="cursor-pointer capitalize"
                  onClick={() =>
                    toggleArrayItem('preferred_workout_times', time)
                  }
                >
                  {time}
                </Badge>
              ))}
            </div>
          </div>

          {/* Workout Frequency */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Workout Frequency (days per week)
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5, 6, 7].map(frequency => (
                <Button
                  key={frequency}
                  variant={
                    preferences.workout_frequency === frequency
                      ? 'default'
                      : 'outline'
                  }
                  size="sm"
                  onClick={() =>
                    updatePreference('workout_frequency', frequency)
                  }
                >
                  {frequency} days
                </Button>
              ))}
            </div>
          </div>

          {/* Injury Limitations */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Injury Limitations
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                'knee_injury',
                'back_injury',
                'shoulder_injury',
                'wrist_injury',
                'ankle_injury',
                'neck_injury',
                'hip_injury',
                'none',
              ].map(injury => (
                <Badge
                  key={injury}
                  variant={
                    preferences.injury_limitations.includes(injury)
                      ? 'destructive'
                      : 'outline'
                  }
                  className="cursor-pointer capitalize"
                  onClick={() => toggleArrayItem('injury_limitations', injury)}
                >
                  {injury.replace('_', ' ')}
                </Badge>
              ))}
            </div>
          </div>

          {/* Exercise Preferences */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Exercise Preferences
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                'strength_training',
                'cardio',
                'yoga',
                'pilates',
                'hiit',
                'swimming',
                'running',
                'cycling',
                'dancing',
                'martial_arts',
                'sports',
                'outdoor_activities',
              ].map(preference => (
                <Badge
                  key={preference}
                  variant={
                    preferences.exercise_preferences.includes(preference)
                      ? 'default'
                      : 'outline'
                  }
                  className="cursor-pointer capitalize"
                  onClick={() =>
                    toggleArrayItem('exercise_preferences', preference)
                  }
                >
                  {preference.replace('_', ' ')}
                </Badge>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-2">
              {saveStatus === 'success' && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">Preferences saved!</span>
                </div>
              )}
              {saveStatus === 'error' && (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">Failed to save preferences</span>
                </div>
              )}
            </div>

            <Button
              onClick={savePreferences}
              disabled={isSaving}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Preferences'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preferences Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Preferences Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Fitness Level:</span>
              <span className="ml-2 capitalize">
                {preferences.fitness_level}
              </span>
            </div>
            <div>
              <span className="font-medium">Duration:</span>
              <span className="ml-2">
                {preferences.preferred_workout_duration} minutes
              </span>
            </div>
            <div>
              <span className="font-medium">Frequency:</span>
              <span className="ml-2">
                {preferences.workout_frequency} days/week
              </span>
            </div>
            <div>
              <span className="font-medium">Equipment:</span>
              <span className="ml-2">
                {preferences.available_equipment.length} types
              </span>
            </div>
            <div className="col-span-2">
              <span className="font-medium">Goals:</span>
              <span className="ml-2">
                {preferences.primary_goals
                  .map(goal => goal.replace('_', ' '))
                  .join(', ')}
              </span>
            </div>
            {preferences.injury_limitations.length > 0 && (
              <div className="col-span-2">
                <span className="font-medium">Limitations:</span>
                <span className="ml-2">
                  {preferences.injury_limitations
                    .map(injury => injury.replace('_', ' '))
                    .join(', ')}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
