'use client';

import React, { useState, useEffect } from 'react';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { WorkoutDisplay } from '@/components/workout/WorkoutDisplay';
import { WorkoutPreferences } from '@/components/workout/WorkoutPreferences';
import { WorkoutProgress } from '@/components/workout/WorkoutProgress';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dumbbell,
  Settings,
  BarChart3,
  Plus,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import { WorkoutTemplate, UserWorkout } from '@/types';

interface WorkoutClientProps {
  userId: string;
}

export default function WorkoutClient({ userId }: WorkoutClientProps) {
  const [activeTab, setActiveTab] = useState('generate');
  const [currentWorkout, setCurrentWorkout] = useState<WorkoutTemplate | null>(
    null
  );
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [workoutHistory, setWorkoutHistory] = useState<UserWorkout[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateWorkout = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/workouts/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: new Date().toISOString().split('T')[0],
          workout_type: 'mixed',
          duration: 45,
          intensity_preference: 'moderate',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        throw new Error(`Failed to generate workout: ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.workout) {
        setCurrentWorkout(data.workout);
        setActiveTab('workout');
      }
    } catch (error) {
      console.error('Error generating workout:', error);
      alert('Failed to generate workout. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartWorkout = () => {
    setIsWorkoutActive(true);
  };

  const handleCompleteWorkout = async (workoutData: any) => {
    try {
      const response = await fetch('/api/workouts/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workout_name: currentWorkout?.name || 'Generated Workout',
          workout_date: new Date().toISOString().split('T')[0],
          category: currentWorkout?.category || 'mixed',
          total_duration: workoutData.totalDuration,
          completion_status: 'completed',
          perceived_exertion: workoutData.perceivedExertion,
          exercises: workoutData.exercises,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        throw new Error(`Failed to track workout: ${response.status}`);
      }

      setIsWorkoutActive(false);
      setCurrentWorkout(null);
      setActiveTab('progress');
      // Refresh workout history
      loadWorkoutHistory();
    } catch (error) {
      console.error('Error tracking workout:', error);
      alert('Failed to save workout. Please try again.');
    }
  };

  const loadWorkoutHistory = async () => {
    try {
      const response = await fetch('/api/workouts/track');
      if (response.ok) {
        const data = await response.json();
        setWorkoutHistory(data.workouts || []);
      }
    } catch (error) {
      console.error('Error loading workout history:', error);
    }
  };

  useEffect(() => {
    loadWorkoutHistory();
  }, []);

  return (
    <div className="h-screen flex flex-col">
      {/* Fixed Header */}
      <div
        className="fixed top-0 left-0 right-0 z-50 border-b border-line"
        style={{ backgroundColor: 'hsl(var(--bg))' }}
      >
        <DashboardHeader userId={userId} />
      </div>

      {/* Main Content */}
      <div className="flex-1 pt-24 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Dumbbell className="h-8 w-8 text-primary" />
                <div>
                  <h1 className="text-3xl font-bold">Workout Companion</h1>
                  <p className="text-muted-foreground">
                    AI-powered personalized workouts based on your health data
                    and preferences
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={handleGenerateWorkout}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Generate Workout</h3>
                    <p className="text-sm text-muted-foreground">
                      AI-powered personalized routine
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setActiveTab('preferences')}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Settings className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Preferences</h3>
                    <p className="text-sm text-muted-foreground">
                      Set your fitness goals
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setActiveTab('progress')}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Progress</h3>
                    <p className="text-sm text-muted-foreground">
                      Track your improvements
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-4 bg-card border border-line">
              <TabsTrigger 
                value="generate"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-semibold data-[state=active]:shadow-md transition-all duration-200"
              >
                Generate
              </TabsTrigger>
              <TabsTrigger 
                value="workout"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-semibold data-[state=active]:shadow-md transition-all duration-200"
              >
                Workout
              </TabsTrigger>
              <TabsTrigger 
                value="preferences"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-semibold data-[state=active]:shadow-md transition-all duration-200"
              >
                Preferences
              </TabsTrigger>
              <TabsTrigger 
                value="progress"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-semibold data-[state=active]:shadow-md transition-all duration-200"
              >
                Progress
              </TabsTrigger>
            </TabsList>

            <TabsContent value="generate" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Generate Your Workout
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <p className="text-muted-foreground">
                    Get a personalized workout based on your health data,
                    preferences, and current fitness level.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="font-semibold">What you'll get:</h3>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-primary rounded-full" />
                          Personalized exercise selection
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-primary rounded-full" />
                          Health-based intensity adjustments
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-primary rounded-full" />
                          Equipment-based recommendations
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-primary rounded-full" />
                          Real-time tracking capabilities
                        </li>
                      </ul>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-semibold">Based on your:</h3>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full" />
                          Sleep quality and recovery
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full" />
                          Fitness level and goals
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full" />
                          Available equipment
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full" />
                          Workout history
                        </li>
                      </ul>
                    </div>
                  </div>

                  <Button
                    onClick={handleGenerateWorkout}
                    disabled={isGenerating}
                    className="w-full"
                    size="lg"
                  >
                    {isGenerating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate My Workout
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="workout" className="mt-6">
              {currentWorkout ? (
                <WorkoutDisplay
                  workout={currentWorkout}
                  isActive={isWorkoutActive}
                  onStart={handleStartWorkout}
                  onComplete={handleCompleteWorkout}
                  showProgress={true}
                  showControls={true}
                />
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Dumbbell className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">
                      No Active Workout
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      Generate a workout to get started with your fitness
                      journey.
                    </p>
                    <Button
                      onClick={handleGenerateWorkout}
                      disabled={isGenerating}
                    >
                      {isGenerating ? 'Generating...' : 'Generate Workout'}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="preferences" className="mt-6">
              <WorkoutPreferences userId={userId} />
            </TabsContent>

            <TabsContent value="progress" className="mt-6">
              <WorkoutProgress userId={userId} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
