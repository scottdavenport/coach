'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface DashboardMetric {
  id: string;
  metric_key: string;
  display_name: string;
  data_type: 'number' | 'boolean' | 'text' | 'time';
  unit?: string;
  metric_value?: number;
  text_value?: string;
  boolean_value?: boolean;
  time_value?: string;
  category: {
    name: string;
    display_name: string;
    icon?: string;
    color?: string;
  };
  source: string;
  confidence: number;
  metric_date: string;
}

export interface DashboardInsights {
  todayMetrics: DashboardMetric[];
  weeklyTrends: {
    sleep: { date: string; value: number }[];
    energy: { date: string; value: number }[];
    activity: { date: string; value: number }[];
  };
  recentInsights: {
    type: 'sleep' | 'energy' | 'activity' | 'mood' | 'general';
    message: string;
    priority: 'high' | 'medium' | 'low';
    timestamp: string;
  }[];
  goals: {
    id: string;
    title: string;
    description?: string;
    is_completed: boolean;
    goal_type: string;
  }[];
  activities: {
    id: string;
    title: string;
    activity_type: string;
    status: 'planned' | 'completed';
    description?: string;
  }[];
}

export function useDashboardInsights(userId: string, selectedDate?: string) {
  const [insights, setInsights] = useState<DashboardInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);
      const supabase = createClient();

      const targetDate = selectedDate || new Date().toISOString().split('T')[0];

      // Fetch today's metrics with category information
      const { data: metrics, error: metricsError } = await supabase
        .from('user_daily_metrics')
        .select(`
          id,
          metric_key,
          metric_value,
          text_value,
          boolean_value,
          time_value,
          source,
          confidence,
          metric_date,
          standard_metrics (
            display_name,
            data_type,
            unit,
            metric_categories (
              name,
              display_name,
              icon,
              color
            )
          )
        `)
        .eq('user_id', userId)
        .eq('metric_date', targetDate)
        .order('created_at');

      if (metricsError) {
        throw new Error(`Failed to fetch metrics: ${metricsError.message}`);
      }

      // Fetch weekly trends (last 7 days)
      const weekStart = new Date(targetDate);
      weekStart.setDate(weekStart.getDate() - 6);

      const { data: weeklyMetrics } = await supabase
        .from('user_daily_metrics')
        .select(`
          metric_date,
          metric_value,
          standard_metrics (
            metric_key,
            metric_categories (name)
          )
        `)
        .eq('user_id', userId)
        .gte('metric_date', weekStart.toISOString().split('T')[0])
        .lte('metric_date', targetDate)
        .order('metric_date');

      // Fetch recent insights from daily journal
      const { data: journalEntries } = await supabase
        .from('daily_journal')
        .select('id, entry_type, category, content, created_at')
        .eq('user_id', userId)
        .gte('journal_date', weekStart.toISOString().split('T')[0])
        .order('created_at', { ascending: false })
        .limit(5);

      // Fetch today's goals
      const { data: goals } = await supabase
        .from('daily_goals')
        .select('id, goal_title, goal_description, is_completed, goal_type')
        .eq('user_id', userId)
        .eq('goal_date', targetDate)
        .order('created_at');

      // Fetch today's activities
      const { data: activities } = await supabase
        .from('daily_activities')
        .select('id, title, activity_type, status, description')
        .eq('user_id', userId)
        .eq('activity_date', targetDate)
        .order('created_at');

      // Process metrics data
      const todayMetrics: DashboardMetric[] = (metrics || []).map(metric => {
        const standardMetric = Array.isArray(metric.standard_metrics) 
          ? metric.standard_metrics[0] 
          : metric.standard_metrics;
        const category = Array.isArray(standardMetric?.metric_categories)
          ? standardMetric.metric_categories[0]
          : standardMetric?.metric_categories;

        return {
          id: metric.id,
          metric_key: metric.metric_key,
          display_name: standardMetric?.display_name || metric.metric_key,
          data_type: standardMetric?.data_type || 'number',
          unit: standardMetric?.unit,
          metric_value: metric.metric_value,
          text_value: metric.text_value,
          boolean_value: metric.boolean_value,
          time_value: metric.time_value,
          category: {
            name: category?.name || 'general',
            display_name: category?.display_name || 'General',
            icon: category?.icon,
            color: category?.color,
          },
          source: metric.source,
          confidence: metric.confidence,
          metric_date: metric.metric_date,
        };
      });

      // Process weekly trends
      const weeklyTrends = {
        sleep: [] as { date: string; value: number }[],
        energy: [] as { date: string; value: number }[],
        activity: [] as { date: string; value: number }[],
      };

      (weeklyMetrics || []).forEach(metric => {
        const standardMetric = Array.isArray(metric.standard_metrics) 
          ? metric.standard_metrics[0] 
          : metric.standard_metrics;
        const categoryData = Array.isArray(standardMetric?.metric_categories)
          ? standardMetric.metric_categories[0]
          : standardMetric?.metric_categories;
        const category = categoryData?.name;
        const date = metric.metric_date;
        const value = metric.metric_value;

        if (category === 'sleep' && value !== null) {
          weeklyTrends.sleep.push({ date, value });
        } else if (category === 'energy' && value !== null) {
          weeklyTrends.energy.push({ date, value });
        } else if (category === 'activity' && value !== null) {
          weeklyTrends.activity.push({ date, value });
        }
      });

      // Process recent insights
      const recentInsights = (journalEntries || []).map(entry => ({
        type: entry.category as 'sleep' | 'energy' | 'activity' | 'mood' | 'general',
        message: entry.content,
        priority: entry.entry_type === 'tip' ? 'high' : 'medium' as 'high' | 'medium' | 'low',
        timestamp: entry.created_at,
      }));

      setInsights({
        todayMetrics,
        weeklyTrends,
        recentInsights,
        goals: (goals || []).map(goal => ({
          id: goal.id,
          title: goal.goal_title,
          description: goal.goal_description,
          is_completed: goal.is_completed,
          goal_type: goal.goal_type,
        })),
        activities: (activities || []).map(activity => ({
          id: activity.id,
          title: activity.title,
          activity_type: activity.activity_type,
          status: activity.status,
          description: activity.description,
        })),
      });
    } catch (err) {
      console.error('Error fetching dashboard insights:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch insights');
    } finally {
      setLoading(false);
    }
  }, [userId, selectedDate]);

  const updateMetric = useCallback(async (
    metricId: string,
    updates: Partial<Pick<DashboardMetric, 'metric_value' | 'text_value' | 'boolean_value' | 'time_value'>>
  ) => {
    try {
      const supabase = createClient();
      
      const { error } = await supabase
        .from('user_daily_metrics')
        .update({
          ...updates,
          source: 'manual',
          confidence: 1.0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', metricId);

      if (error) {
        throw new Error(`Failed to update metric: ${error.message}`);
      }

      // Refresh insights after update
      await fetchInsights();
    } catch (err) {
      console.error('Error updating metric:', err);
      setError(err instanceof Error ? err.message : 'Failed to update metric');
    }
  }, [fetchInsights]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  return {
    insights,
    loading,
    error,
    refetch: fetchInsights,
    updateMetric,
  };
}