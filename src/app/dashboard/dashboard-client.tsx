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
  Settings
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
    { id: 'activity', name: 'Activity', icon: Activity, color: 'text-green-500' },
    { id: 'nutrition', name: 'Nutrition', icon: Apple, color: 'text-orange-500' },
    { id: 'recovery', name: 'Recovery', icon: Heart, color: 'text-red-500' },
  ];

  const handleChatMessage = (message: string) => {
    // Navigate to chat with the message
    window.location.href = `/chat?message=${encodeURIComponent(message)}`;
  };

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
                  {healthCategories.map((category) => {
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
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="trends">Trends</TabsTrigger>
                  <TabsTrigger value="insights">Insights</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-6">
                  <div className="space-y-6">
                    {/* Key Metrics Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Sleep Score</p>
                              <p className="text-2xl font-bold">85</p>
                              <p className="text-xs text-green-500">+2 from yesterday</p>
                            </div>
                            <Moon className="h-8 w-8 text-blue-500" />
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Readiness</p>
                              <p className="text-2xl font-bold">78</p>
                              <p className="text-xs text-yellow-500">-1 from yesterday</p>
                            </div>
                            <Heart className="h-8 w-8 text-red-500" />
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Activity</p>
                              <p className="text-2xl font-bold">7,234</p>
                              <p className="text-xs text-green-500">+456 steps</p>
                            </div>
                            <Activity className="h-8 w-8 text-green-500" />
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Enhanced Dashboard Component */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Health Overview</CardTitle>
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

                <TabsContent value="trends" className="mt-6">
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5" />
                          Weekly Trends
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64 flex items-center justify-center text-muted-foreground">
                          <div className="text-center">
                            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>Trend charts will be displayed here</p>
                            <p className="text-sm">Interactive visualizations coming soon</p>
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
                        <CardTitle>AI Insights & Recommendations</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <h4 className="font-semibold text-blue-900 mb-2">Sleep Optimization</h4>
                            <p className="text-blue-800 text-sm">
                              Your sleep quality has improved 15% this week. Consider maintaining your current bedtime routine.
                            </p>
                          </div>
                          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                            <h4 className="font-semibold text-green-900 mb-2">Activity Goal</h4>
                            <p className="text-green-800 text-sm">
                              You're on track to exceed your weekly activity goal. Great job staying consistent!
                            </p>
                          </div>
                          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                            <h4 className="font-semibold text-orange-900 mb-2">Recovery Focus</h4>
                            <p className="text-orange-800 text-sm">
                              Consider adding 10 minutes of meditation to improve your recovery scores.
                            </p>
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
