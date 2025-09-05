'use client';

import React, { useState } from 'react';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { MinimalDashboard } from '@/components/dashboard/minimal-dashboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart3,
  Heart,
  Moon,
  Activity,
  Apple,
  TrendingUp,
  Filter,
  Download,
  Settings,
  Calendar,
} from 'lucide-react';

interface DashboardClientProps {
  userId: string;
}

export default function DashboardClient({ userId }: DashboardClientProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const healthCategories = [
    { id: 'all', name: 'All Metrics', icon: BarChart3, color: 'text-primary' },
    { id: 'sleep', name: 'Sleep', icon: Moon, color: 'text-blue-500' },
    {
      id: 'activity',
      name: 'Activity',
      icon: Activity,
      color: 'text-green-500',
    },
    {
      id: 'nutrition',
      name: 'Nutrition',
      icon: Apple,
      color: 'text-orange-500',
    },
    { id: 'recovery', name: 'Recovery', icon: Heart, color: 'text-red-500' },
  ];

  const handleChatMessage = (message: string) => {
    // Navigate to chat with the message
    window.location.href = `/chat?message=${encodeURIComponent(message)}`;
  };

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
      <div className="flex-1 pt-24">
        <div className="max-w-7xl mx-auto p-6">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-primary" />
                <div>
                  <h1 className="text-3xl font-bold">Health Dashboard</h1>
                  <p className="text-muted-foreground">
                    Comprehensive health analytics and insights
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Sidebar - Health Categories */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Health Categories</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {healthCategories.map(category => {
                    const Icon = category.icon;
                    return (
                      <button
                        key={category.id}
                        onClick={() => setSelectedCategory(category.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                          selectedCategory === category.id
                            ? 'bg-primary/10 border border-primary/20'
                            : 'hover:bg-card-2'
                        }`}
                      >
                        <Icon className={`h-5 w-5 ${category.color}`} />
                        <span className="font-medium">{category.name}</span>
                      </button>
                    );
                  })}
                </CardContent>
              </Card>
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-3">
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-3 bg-card border border-line">
                  <TabsTrigger 
                    value="overview"
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-semibold data-[state=active]:shadow-md transition-all duration-200"
                  >
                    Overview
                  </TabsTrigger>
                  <TabsTrigger 
                    value="trends"
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-semibold data-[state=active]:shadow-md transition-all duration-200"
                  >
                    Trends
                  </TabsTrigger>
                  <TabsTrigger 
                    value="insights"
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-semibold data-[state=active]:shadow-md transition-all duration-200"
                  >
                    Insights
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-6">
                  <div className="space-y-6">
                    {/* Today's Focus - Hero Section */}
                    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <h3 className="text-lg font-semibold text-blue-900">
                              Today's Focus
                            </h3>
                            <p className="text-blue-700">
                              Maintain your 8-hour sleep routine
                            </p>
                            <p className="text-sm text-blue-600">
                              You're on a 5-day sleep improvement streak!
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-blue-900">
                              85
                            </p>
                            <p className="text-sm text-blue-600">Sleep Score</p>
                            <p className="text-xs text-green-600">
                              +2 from yesterday
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Key Metrics - Simplified */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">
                                Readiness
                              </p>
                              <p className="text-2xl font-bold">78</p>
                              <p className="text-xs text-yellow-500">
                                -1 from yesterday
                              </p>
                            </div>
                            <Heart className="h-8 w-8 text-red-500" />
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">
                                Activity
                              </p>
                              <p className="text-2xl font-bold">7,234</p>
                              <p className="text-xs text-green-500">
                                +456 steps
                              </p>
                            </div>
                            <Activity className="h-8 w-8 text-green-500" />
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Quick Actions */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Quick Actions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <Button
                            variant="outline"
                            className="h-12 justify-start"
                            onClick={() =>
                              handleChatMessage(
                                'Help me plan my day based on my current health metrics'
                              )
                            }
                          >
                            <BarChart3 className="h-4 w-4 mr-2" />
                            Plan My Day
                          </Button>
                          <Button
                            variant="outline"
                            className="h-12 justify-start"
                            onClick={() =>
                              handleChatMessage(
                                'What should I focus on to improve my health today?'
                              )
                            }
                          >
                            <TrendingUp className="h-4 w-4 mr-2" />
                            Get Insights
                          </Button>
                          <Button
                            variant="outline"
                            className="h-12 justify-start"
                            onClick={() =>
                              handleChatMessage(
                                'Review my weekly progress and set goals'
                              )
                            }
                          >
                            <Calendar className="h-4 w-4 mr-2" />
                            Weekly Review
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="trends" className="mt-6">
                  <div className="space-y-6">
                    {/* Detailed Health Overview */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Detailed Health Overview</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <MinimalDashboard
                          userId={userId}
                          onChatMessage={handleChatMessage}
                        />
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="insights" className="mt-6">
                  <div className="space-y-6">
                    {/* Key Insights */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">
                            Sleep Insights
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <h4 className="font-semibold text-blue-900 text-sm">
                                Sleep Optimization
                              </h4>
                              <p className="text-blue-800 text-xs">
                                Your sleep quality has improved 15% this week.
                                Keep your current bedtime routine.
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() =>
                                handleChatMessage(
                                  'Tell me more about my sleep patterns and how to optimize them'
                                )
                              }
                            >
                              Learn More
                            </Button>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">
                            Activity Insights
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                              <h4 className="font-semibold text-green-900 text-sm">
                                Activity Goal
                              </h4>
                              <p className="text-green-800 text-xs">
                                You're on track to exceed your weekly activity
                                goal. Great consistency!
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() =>
                                handleChatMessage(
                                  'Help me optimize my activity routine and set better goals'
                                )
                              }
                            >
                              Optimize Routine
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Recovery Focus */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          Recovery & Wellness
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                            <h4 className="font-semibold text-orange-900 mb-2">
                              Recovery Focus
                            </h4>
                            <p className="text-orange-800 text-sm">
                              Consider adding 10 minutes of meditation to
                              improve your recovery scores.
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleChatMessage(
                                  'Help me create a meditation routine for better recovery'
                                )
                              }
                            >
                              Start Meditation
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleChatMessage(
                                  'What other recovery techniques should I try?'
                                )
                              }
                            >
                              More Options
                            </Button>
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
