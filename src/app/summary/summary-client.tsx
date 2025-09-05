'use client';

import React, { useState } from 'react';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { WeeklySummaryCard } from '@/components/card/weekly-summary-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  TrendingUp, 
  Target, 
  BarChart3, 
  Lightbulb,
  ChevronLeft,
  ChevronRight,
  Download,
  Share,
  Settings,
  CheckCircle,
  Circle,
  Plus,
  Edit3,
  Trash2
} from 'lucide-react';

interface SummaryClientProps {
  userId: string;
}

interface WeeklyGoal {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  category: string;
  created_at: string;
}

export default function SummaryClient({ userId }: SummaryClientProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    // Get the start of the current week (Monday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 0, Monday = 1
    const monday = new Date(now);
    monday.setDate(now.getDate() - daysToSubtract);
    return monday.toISOString().split('T')[0];
  });
  const [weeklyGoals, setWeeklyGoals] = useState<WeeklyGoal[]>([]);
  const [newGoal, setNewGoal] = useState('');
  const [newGoalDescription, setNewGoalDescription] = useState('');
  const [isAddingGoal, setIsAddingGoal] = useState(false);

  const navigateWeek = (direction: 'prev' | 'next') => {
    const current = new Date(currentWeekStart);
    if (direction === 'prev') {
      current.setDate(current.getDate() - 7);
    } else {
      current.setDate(current.getDate() + 7);
    }
    setCurrentWeekStart(current.toISOString().split('T')[0]);
  };

  const getWeekDates = () => {
    const dates = [];
    const start = new Date(currentWeekStart);
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const getWeekRange = () => {
    const start = new Date(currentWeekStart);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    
    return {
      start: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      end: end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      year: start.getFullYear()
    };
  };

  const handleAddGoal = async () => {
    if (!newGoal.trim()) return;

    try {
      // In a real implementation, you would save to database
      const goal: WeeklyGoal = {
        id: Date.now().toString(),
        title: newGoal.trim(),
        description: newGoalDescription.trim(),
        completed: false,
        category: 'general',
        created_at: new Date().toISOString(),
      };

      setWeeklyGoals([...weeklyGoals, goal]);
      setNewGoal('');
      setNewGoalDescription('');
      setIsAddingGoal(false);
    } catch (error) {
      console.error('Error adding goal:', error);
    }
  };

  const handleToggleGoal = (goalId: string) => {
    setWeeklyGoals(goals =>
      goals.map(goal =>
        goal.id === goalId ? { ...goal, completed: !goal.completed } : goal
      )
    );
  };

  const handleDeleteGoal = (goalId: string) => {
    setWeeklyGoals(goals => goals.filter(goal => goal.id !== goalId));
  };

  const completedGoals = weeklyGoals.filter(goal => goal.completed).length;
  const totalGoals = weeklyGoals.length;
  const completionRate = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;

  const weekRange = getWeekRange();
  const weekDates = getWeekDates();

  return (
    <div className="h-screen flex flex-col">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50 border-b border-line" style={{ backgroundColor: 'hsl(var(--bg))' }}>
        <DashboardHeader userId={userId} />
      </div>

      {/* Main Content */}
      <div className="flex-1 pt-24">
        <div className="max-w-7xl mx-auto p-6">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-8 w-8 text-primary" />
                <div>
                  <h1 className="text-3xl font-bold">Weekly Summary</h1>
                  <p className="text-muted-foreground">
                    Review your week and plan ahead
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button variant="outline" size="sm">
                  <Share className="h-4 w-4 mr-2" />
                  Share
                </Button>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </div>
            </div>

            {/* Week Navigation */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateWeek('prev')}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous Week
                </Button>
                <div className="text-center">
                  <h2 className="text-xl font-semibold">
                    {weekRange.start} - {weekRange.end}, {weekRange.year}
                  </h2>
                  <p className="text-sm text-muted-foreground">Week of {weekRange.start}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateWeek('next')}
                >
                  Next Week
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Sidebar - Week Overview */}
            <div className="lg:col-span-1">
              <div className="space-y-6">
                {/* Week Calendar */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Week Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-7 gap-1 mb-4">
                      {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
                        <div key={day} className="text-center text-xs font-medium text-muted-foreground p-2">
                          {day}
                        </div>
                      ))}
                      {weekDates.map((date, index) => (
                        <div
                          key={index}
                          className={`text-center p-2 rounded-md text-sm ${
                            date.toDateString() === new Date().toDateString()
                              ? 'bg-primary text-white'
                              : 'hover:bg-card-2'
                          }`}
                        >
                          {date.getDate()}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Goals Progress */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Weekly Goals</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {completedGoals}/{totalGoals}
                      </div>
                      <p className="text-sm text-muted-foreground">Goals Completed</p>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${completionRate}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {Math.round(completionRate)}% Complete
                      </p>
                    </div>

                    {isAddingGoal ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={newGoal}
                          onChange={(e) => setNewGoal(e.target.value)}
                          placeholder="Goal title..."
                          className="w-full p-2 border border-line rounded-md bg-background text-sm"
                        />
                        <textarea
                          value={newGoalDescription}
                          onChange={(e) => setNewGoalDescription(e.target.value)}
                          placeholder="Description (optional)..."
                          className="w-full p-2 border border-line rounded-md bg-background text-sm resize-none"
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleAddGoal}>
                            Add Goal
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setIsAddingGoal(false);
                              setNewGoal('');
                              setNewGoalDescription('');
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        onClick={() => setIsAddingGoal(true)}
                        className="w-full"
                        variant="outline"
                        size="sm"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Goal
                      </Button>
                    )}

                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {weeklyGoals.map((goal) => (
                        <div
                          key={goal.id}
                          className="flex items-start gap-2 p-2 border border-line rounded-md"
                        >
                          <button
                            onClick={() => handleToggleGoal(goal.id)}
                            className="mt-0.5"
                          >
                            {goal.completed ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <Circle className="h-4 w-4 text-muted-foreground" />
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${goal.completed ? 'line-through text-muted-foreground' : ''}`}>
                              {goal.title}
                            </p>
                            {goal.description && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {goal.description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="ghost">
                              <Edit3 className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteGoal(goal.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-2">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="progress">Progress</TabsTrigger>
                  <TabsTrigger value="insights">Insights</TabsTrigger>
                  <TabsTrigger value="planning">Planning</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-6">
                  <div className="space-y-6">
                    {/* Weekly Summary Card */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Weekly Summary</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <WeeklySummaryCard 
                          weekStart={currentWeekStart} 
                          onClose={() => {}} 
                        />
                      </CardContent>
                    </Card>

                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Sleep Average</p>
                              <p className="text-2xl font-bold">7.2h</p>
                              <p className="text-xs text-green-500">+0.3h from last week</p>
                            </div>
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                              <Calendar className="h-6 w-6 text-blue-500" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Activity Score</p>
                              <p className="text-2xl font-bold">8.4</p>
                              <p className="text-xs text-green-500">+0.8 from last week</p>
                            </div>
                            <div className="p-2 bg-green-500/10 rounded-lg">
                              <TrendingUp className="h-6 w-6 text-green-500" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Goals Completed</p>
                              <p className="text-2xl font-bold">{completedGoals}</p>
                              <p className="text-xs text-blue-500">of {totalGoals} total</p>
                            </div>
                            <div className="p-2 bg-purple-500/10 rounded-lg">
                              <Target className="h-6 w-6 text-purple-500" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="progress" className="mt-6">
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <BarChart3 className="h-5 w-5" />
                          Weekly Progress Charts
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64 flex items-center justify-center text-muted-foreground">
                          <div className="text-center">
                            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>Progress charts will be displayed here</p>
                            <p className="text-sm">Visual representations of your weekly achievements</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Week-over-Week Comparison</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-3 border border-line rounded-lg">
                            <div>
                              <p className="font-medium">Sleep Quality</p>
                              <p className="text-sm text-muted-foreground">Average score this week</p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-green-500">+12%</p>
                              <p className="text-sm text-muted-foreground">vs last week</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between p-3 border border-line rounded-lg">
                            <div>
                              <p className="font-medium">Activity Level</p>
                              <p className="text-sm text-muted-foreground">Daily steps average</p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-green-500">+8%</p>
                              <p className="text-sm text-muted-foreground">vs last week</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between p-3 border border-line rounded-lg">
                            <div>
                              <p className="font-medium">Goal Completion</p>
                              <p className="text-sm text-muted-foreground">Weekly goals achieved</p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-blue-500">75%</p>
                              <p className="text-sm text-muted-foreground">completion rate</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="insights" className="mt-6">
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Lightbulb className="h-5 w-5" />
                          AI Insights & Recommendations
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <h4 className="font-semibold text-blue-900 mb-2">Weekly Highlights</h4>
                            <p className="text-blue-800 text-sm">
                              You had your best sleep week in the last month, with an average of 7.2 hours per night. 
                              Your consistency in going to bed at the same time each night is paying off.
                            </p>
                          </div>
                          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                            <h4 className="font-semibold text-green-900 mb-2">Activity Achievement</h4>
                            <p className="text-green-800 text-sm">
                              You exceeded your daily step goal on 5 out of 7 days this week. 
                              Consider setting a higher target for next week to continue challenging yourself.
                            </p>
                          </div>
                          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                            <h4 className="font-semibold text-purple-900 mb-2">Goal Focus</h4>
                            <p className="text-purple-800 text-sm">
                              You completed 75% of your weekly goals. The goals you didn't complete were mostly 
                              related to evening routines. Consider scheduling these earlier in the day.
                            </p>
                          </div>
                          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                            <h4 className="font-semibold text-orange-900 mb-2">Next Week Focus</h4>
                            <p className="text-orange-800 text-sm">
                              Based on your patterns, focus on maintaining your sleep schedule and consider 
                              adding one new habit to your morning routine for better consistency.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="planning" className="mt-6">
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Next Week Planning</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div>
                          <h4 className="font-semibold mb-3">Recommended Goals for Next Week</h4>
                          <div className="space-y-3">
                            <div className="p-3 border border-line rounded-lg">
                              <div className="flex items-center gap-2 mb-1">
                                <Target className="h-4 w-4 text-green-500" />
                                <span className="font-medium">Maintain Sleep Schedule</span>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Keep your current bedtime routine to maintain the sleep quality improvements
                              </p>
                            </div>
                            <div className="p-3 border border-line rounded-lg">
                              <div className="flex items-center gap-2 mb-1">
                                <TrendingUp className="h-4 w-4 text-blue-500" />
                                <span className="font-medium">Increase Daily Steps</span>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Aim for 8,500 steps daily to build on this week's success
                              </p>
                            </div>
                            <div className="p-3 border border-line rounded-lg">
                              <div className="flex items-center gap-2 mb-1">
                                <Lightbulb className="h-4 w-4 text-purple-500" />
                                <span className="font-medium">Morning Routine</span>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Add 10 minutes of morning journaling to start each day with intention
                              </p>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-3">Weekly Intentions</h4>
                          <div className="space-y-2">
                            <div className="p-3 bg-card-2 rounded-lg">
                              <p className="text-sm">
                                <strong>Focus:</strong> Consistency over perfection
                              </p>
                            </div>
                            <div className="p-3 bg-card-2 rounded-lg">
                              <p className="text-sm">
                                <strong>Energy:</strong> Prioritize sleep and recovery
                              </p>
                            </div>
                            <div className="p-3 bg-card-2 rounded-lg">
                              <p className="text-sm">
                                <strong>Growth:</strong> Build on this week's momentum
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}