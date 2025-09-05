'use client';

import { useState, useEffect, useMemo } from 'react';
import { InsightGenerator } from '@/lib/coaching/insight-generator';
import { MotivationEngine } from '@/lib/coaching/motivation-engine';
import {
  CoachingData,
  MorningBriefing,
  WeeklyInsights,
  SmartNotification,
} from '@/lib/coaching/types';
import { getMockCoachingData } from '@/hooks/use-mock-data';

interface UseCoachingInsightsProps {
  userId: string;
  userData?: any;
  patterns?: any;
  historicalData?: any;
}

export function useCoachingInsights({
  userId,
  userData,
  patterns,
  historicalData,
}: UseCoachingInsightsProps) {
  const [coachingData, setCoachingData] = useState<CoachingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Generate coaching data
  useEffect(() => {
    try {
      // For now, use mock data directly to avoid dependency issues
      // In production, this would use real userData, patterns, and historicalData
      const mockCoachingData = getMockCoachingData();

      setCoachingData(mockCoachingData);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to generate coaching insights'
      );
    } finally {
      setLoading(false);
    }
  }, [userId]); // Only depend on userId to avoid infinite loops

  // Mark notification as read
  const markNotificationAsRead = (notificationId: string) => {
    if (!coachingData) return;

    setCoachingData(prev => {
      if (!prev) return null;

      return {
        ...prev,
        notifications: prev.notifications.map(notification =>
          notification.id === notificationId
            ? { ...notification, read: true }
            : notification
        ),
      };
    });
  };

  // Mark all notifications as read
  const markAllNotificationsAsRead = () => {
    if (!coachingData) return;

    setCoachingData(prev => {
      if (!prev) return null;

      return {
        ...prev,
        notifications: prev.notifications.map(notification => ({
          ...notification,
          read: true,
        })),
      };
    });
  };

  // Get unread notifications count
  const unreadNotificationsCount = useMemo(() => {
    if (!coachingData || !coachingData.notifications) return 0;
    return coachingData.notifications.filter(n => !n.read).length;
  }, [coachingData]);

  // Get high priority notifications
  const highPriorityNotifications = useMemo(() => {
    if (!coachingData || !coachingData.notifications) return [];
    return coachingData.notifications.filter(
      n => n.priority === 'high' && !n.read
    );
  }, [coachingData]);

  // Get active streaks
  const activeStreaks = useMemo(() => {
    if (!coachingData || !coachingData.streaks) return [];
    return coachingData.streaks.filter(s => s.current > 0);
  }, [coachingData]);

  // Get recent achievements
  const recentAchievements = useMemo(() => {
    if (!coachingData || !coachingData.achievements) return [];
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    return coachingData.achievements.filter(
      a => new Date(a.unlockedAt) > oneWeekAgo
    );
  }, [coachingData]);

  // Get active challenges
  const activeChallenges = useMemo(() => {
    if (!coachingData || !coachingData.challenges) return [];
    return coachingData.challenges.filter(c => !c.completed);
  }, [coachingData]);

  return {
    coachingData,
    loading,
    error,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    unreadNotificationsCount,
    highPriorityNotifications,
    activeStreaks,
    recentAchievements,
    activeChallenges,
    // Individual data accessors
    morningBriefing: coachingData?.morningBriefing,
    celebrations: coachingData?.celebrations || [],
    weeklyInsights: coachingData?.weeklyInsights,
    notifications: coachingData?.notifications || [],
    streaks: coachingData?.streaks || [],
    achievements: coachingData?.achievements || [],
    challenges: coachingData?.challenges || [],
  };
}
