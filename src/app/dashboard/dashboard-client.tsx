'use client';

import React, { useState } from 'react';
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
    // Use the global chat context instead of navigating
    // This will be handled by the chat provider
    console.log('Chat message:', message);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-text flex items-center gap-3">
          <BarChart3 className="h-8 w-8 text-primary" />
          Health Dashboard
        </h1>
        <p className="text-muted mt-2">
          Comprehensive health analytics and insights
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setActiveTab('overview')}
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Health Overview</h3>
                <p className="text-sm text-muted-foreground">
                  Your daily health metrics
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setActiveTab('trends')}
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <TrendingUp className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <h3 className="font-semibold">View Trends</h3>
                <p className="text-sm text-muted-foreground">
                  Track your progress over time
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setActiveTab('insights')}
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Heart className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <h3 className="font-semibold">AI Insights</h3>
                <p className="text-sm text-muted-foreground">
                  Personalized recommendations
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Health Categories Filter */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Filter className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Filter by Category
                </p>
                <p className="text-lg font-semibold">
                  {healthCategories.find(c => c.id === selectedCategory)
                    ?.name || 'All Metrics'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {healthCategories.map(category => {
                const Icon = category.icon;
                return (
                  <Button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    variant={
                      selectedCategory === category.id ? 'default' : 'outline'
                    }
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Icon className={`h-4 w-4 ${category.color}`} />
                    {category.name}
                  </Button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Area */}
      <div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
              {/* Empty State - No Data Yet */}
              <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
                <CardContent className="p-6">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                      <BarChart3 className="h-8 w-8 text-primary" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-text">
                        No Health Data Yet
                      </h3>
                      <p className="text-muted max-w-md mx-auto">
                        Start tracking your health metrics to see your
                        personalized dashboard and insights here.
                      </p>
                    </div>
                    <Button
                      onClick={() =>
                        handleChatMessage(
                          'Help me set up my health tracking and add my first metrics'
                        )
                      }
                      className="mt-4"
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Get Started
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Placeholder for Future Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="opacity-60">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Sleep Score
                        </p>
                        <p className="text-2xl font-bold text-subtle">--</p>
                        <p className="text-xs text-subtle">
                          Add sleep data to see trends
                        </p>
                      </div>
                      <Moon className="h-8 w-8 text-subtle" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="opacity-60">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Activity
                        </p>
                        <p className="text-2xl font-bold text-subtle">--</p>
                        <p className="text-xs text-subtle">
                          Add activity data to see trends
                        </p>
                      </div>
                      <Activity className="h-8 w-8 text-subtle" />
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
              {/* Empty State - No Trends Yet */}
              <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
                <CardContent className="p-6">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                      <TrendingUp className="h-8 w-8 text-primary" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-text">
                        No Trends Yet
                      </h3>
                      <p className="text-muted max-w-md mx-auto">
                        Start tracking your health metrics to see trends and
                        patterns in your wellness journey.
                      </p>
                    </div>
                    <Button
                      onClick={() =>
                        handleChatMessage(
                          'Help me understand what health trends I can track and how to get started'
                        )
                      }
                      className="mt-4"
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Start Tracking
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Placeholder for Future Trends */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="opacity-60">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Sleep Trends
                        </p>
                        <p className="text-2xl font-bold text-subtle">--</p>
                        <p className="text-xs text-subtle">
                          Add sleep data to see trends
                        </p>
                      </div>
                      <Moon className="h-8 w-8 text-subtle" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="opacity-60">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Activity Trends
                        </p>
                        <p className="text-2xl font-bold text-subtle">--</p>
                        <p className="text-xs text-subtle">
                          Add activity data to see trends
                        </p>
                      </div>
                      <Activity className="h-8 w-8 text-subtle" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Trend Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Button
                      variant="outline"
                      className="h-12 justify-start"
                      onClick={() =>
                        handleChatMessage(
                          'Help me analyze my health trends and patterns'
                        )
                      }
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Analyze Trends
                    </Button>
                    <Button
                      variant="outline"
                      className="h-12 justify-start"
                      onClick={() =>
                        handleChatMessage(
                          'What trends should I be tracking for better health?'
                        )
                      }
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Learn More
                    </Button>
                    <Button
                      variant="outline"
                      className="h-12 justify-start"
                      onClick={() =>
                        handleChatMessage(
                          'Help me set up tracking for key health metrics'
                        )
                      }
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Setup Tracking
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="insights" className="mt-6">
            <div className="space-y-6">
              {/* Empty State for Insights */}
              <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
                <CardContent className="p-6">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                      <TrendingUp className="h-8 w-8 text-primary" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-text">
                        No Insights Yet
                      </h3>
                      <p className="text-muted max-w-md mx-auto">
                        Start tracking your health data to receive personalized
                        insights and recommendations.
                      </p>
                    </div>
                    <Button
                      onClick={() =>
                        handleChatMessage(
                          'Help me understand what health insights I can get and how to start tracking my data'
                        )
                      }
                      className="mt-4"
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Learn About Insights
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Placeholder Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="opacity-60">
                  <CardHeader>
                    <CardTitle className="text-lg">Sleep Insights</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="p-3 bg-card-2 border border-line rounded-lg">
                        <h4 className="font-semibold text-muted text-sm">
                          Sleep Analysis
                        </h4>
                        <p className="text-subtle text-xs">
                          Add sleep data to get personalized sleep insights and
                          recommendations.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        disabled
                      >
                        Add Sleep Data First
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="opacity-60">
                  <CardHeader>
                    <CardTitle className="text-lg">Activity Insights</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="p-3 bg-card-2 border border-line rounded-lg">
                        <h4 className="font-semibold text-muted text-sm">
                          Activity Analysis
                        </h4>
                        <p className="text-subtle text-xs">
                          Add activity data to get personalized fitness insights
                          and goal tracking.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        disabled
                      >
                        Add Activity Data First
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
