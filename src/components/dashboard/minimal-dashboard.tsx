'use client';

import React from 'react';
import { HeroMetricCard } from './hero-metric-card';
import { getMockDashboardData, USE_MOCK_DATA } from '@/hooks/use-mock-data';
import { useDashboardInsights } from '@/hooks/use-dashboard-insights';
import { Loader2 } from 'lucide-react';

interface MinimalDashboardProps {
  userId: string;
  onChatMessage?: (message: string) => void;
}

export function MinimalDashboard({ userId, onChatMessage }: MinimalDashboardProps) {
  const { insights, loading, error } = useDashboardInsights(userId);
  
  // Use mock data if enabled, otherwise use real data
  const mockData = USE_MOCK_DATA ? getMockDashboardData() : null;
  
  const handleAskAboutTrend = (metric: 'sleep' | 'readiness' | 'weight') => {
    const messages = {
      sleep: "Tell me about my sleep trend this week. How can I improve my sleep quality?",
      readiness: "I'd like to understand my readiness trend. What factors are affecting my energy levels?",
      weight: "Help me analyze my weight trend. What should I focus on for healthy weight management?",
    };
    
    onChatMessage?.(messages[metric]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted">Loading your health insights...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <p className="text-sm text-destructive mb-2">Failed to load insights</p>
          <p className="text-xs text-muted">{error}</p>
          {USE_MOCK_DATA && (
            <p className="text-xs text-subtle">
              Mock data is enabled. Check your environment variables.
            </p>
          )}
        </div>
      </div>
    );
  }

  // Use mock data if available, otherwise show empty state
  if (USE_MOCK_DATA && mockData) {
    return (
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-text">Your Health Overview</h1>
          <p className="text-muted">
            Weekly trends and insights to guide your wellness journey
          </p>
        </div>

        {/* Hero Metrics - Single Column Layout */}
        <div className="space-y-6">
          {/* Sleep Score */}
          <HeroMetricCard
            title="Sleep Score"
            value={mockData.sleep.current}
            unit=""
            data={mockData.sleep}
            metric="sleep"
            onAskAboutTrend={() => handleAskAboutTrend('sleep')}
          />

          {/* Readiness Score */}
          <HeroMetricCard
            title="Readiness Score"
            value={mockData.readiness.current}
            unit=""
            data={mockData.readiness}
            metric="readiness"
            onAskAboutTrend={() => handleAskAboutTrend('readiness')}
          />

          {/* Weight */}
          <HeroMetricCard
            title="Weight"
            value={mockData.weight.current}
            unit="lbs"
            data={mockData.weight}
            metric="weight"
            onAskAboutTrend={() => handleAskAboutTrend('weight')}
          />
        </div>

        {/* Quick Actions */}
        <div className="flex justify-center space-x-4 pt-6">
          <button
            onClick={() => onChatMessage?.("Give me a comprehensive health overview and recommendations for this week.")}
            className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Get Health Summary
          </button>
          <button
            onClick={() => onChatMessage?.("Help me set goals for next week based on my current trends.")}
            className="px-6 py-3 border border-line text-text rounded-lg font-medium hover:bg-card-2 transition-colors"
          >
            Plan Next Week
          </button>
        </div>

        {/* Mock Data Indicator */}
        <div className="text-center">
          <p className="text-xs text-subtle">
            📊 Showing mock data for development
          </p>
        </div>
      </div>
    );
  }

  // Real data fallback - show empty state or basic metrics
  if (!insights || insights.todayMetrics.length === 0) {
    return (
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-text">Your Health Overview</h1>
          <p className="text-muted">
            Start tracking your health metrics to see your trends here
          </p>
        </div>

        {/* Empty State */}
        <div className="text-center space-y-4 py-12">
          <div className="w-16 h-16 bg-card-2 rounded-full flex items-center justify-center mx-auto">
            <span className="text-2xl">📊</span>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-text">No data yet</h3>
            <p className="text-sm text-muted max-w-md mx-auto">
              Add some health metrics to start seeing your trends and insights
            </p>
          </div>
          <button
            onClick={() => onChatMessage?.("Help me set up my health tracking and add my first metrics.")}
            className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Get Started
          </button>
        </div>
      </div>
    );
  }

  // Real data implementation would go here
  // For now, show the mock data as a fallback
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-text">Your Health Overview</h1>
        <p className="text-muted">
          Real data integration coming soon
        </p>
      </div>
      
      <div className="text-center py-12">
        <p className="text-sm text-muted">
          Found {insights.todayMetrics.length} metrics. 
          Enable mock data for the full minimal dashboard experience.
        </p>
      </div>
    </div>
  );
}