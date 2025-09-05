'use client';

import { useState, useEffect, useMemo } from 'react';
import { MotivationEngine } from '@/lib/coaching/motivation-engine';
import { ProgressCelebration, StreakData, AchievementBadge, MotivationChallenge } from '@/lib/coaching/types';

interface UseMotivationSystemProps {
  userId: string;
  userData?: any;
  historicalData?: any;
}

export function useMotivationSystem({ 
  userId, 
  userData, 
  historicalData 
}: UseMotivationSystemProps) {
  const [celebrations, setCelebrations] = useState<ProgressCelebration[]>([]);
  const [streaks, setStreaks] = useState<StreakData[]>([]);
  const [achievements, setAchievements] = useState<AchievementBadge[]>([]);
  const [challenges, setChallenges] = useState<MotivationChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize motivation engine
  const motivationEngine = useMemo(() => {
    if (!userData) return null;
    return new MotivationEngine(userData, historicalData);
  }, [userData, historicalData]);

  // Generate motivation data
  useEffect(() => {
    if (!motivationEngine) {
      setLoading(false);
      return;
    }

    try {
      const newCelebrations = motivationEngine.generateProgressCelebrations();
      const newStreaks = motivationEngine.generateStreaks();
      const newAchievements = motivationEngine.generateAchievements();
      const newChallenges = motivationEngine.generateChallenges();

      setCelebrations(newCelebrations);
      setStreaks(newStreaks);
      setAchievements(newAchievements);
      setChallenges(newChallenges);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate motivation data');
    } finally {
      setLoading(false);
    }
  }, [motivationEngine]);

  // Get streak by type
  const getStreakByType = (type: 'sleep' | 'exercise' | 'goal_completion' | 'readiness') => {
    return streaks.find(streak => streak.type === type);
  };

  // Get longest streak
  const longestStreak = useMemo(() => {
    if (streaks.length === 0) return null;
    return streaks.reduce((longest, current) => 
      current.current > longest.current ? current : longest
    );
  }, [streaks]);

  // Get total achievements count
  const totalAchievements = useMemo(() => {
    return achievements.length;
  }, [achievements]);

  // Get achievements by category
  const getAchievementsByCategory = (category: 'sleep' | 'exercise' | 'consistency' | 'improvement') => {
    return achievements.filter(achievement => achievement.category === category);
  };

  // Get completed challenges
  const completedChallenges = useMemo(() => {
    return challenges.filter(challenge => challenge.completed);
  }, [challenges]);

  // Get active challenges
  const activeChallenges = useMemo(() => {
    return challenges.filter(challenge => !challenge.completed);
  }, [challenges]);

  // Get challenge progress percentage
  const getChallengeProgress = (challengeId: string) => {
    const challenge = challenges.find(c => c.id === challengeId);
    if (!challenge) return 0;
    return Math.min(100, (challenge.current / challenge.target) * 100);
  };

  // Get motivation score (0-100)
  const motivationScore = useMemo(() => {
    let score = 0;
    
    // Base score from streaks
    const totalStreakDays = streaks.reduce((sum, streak) => sum + streak.current, 0);
    score += Math.min(40, totalStreakDays * 2);
    
    // Score from achievements
    score += Math.min(30, achievements.length * 5);
    
    // Score from celebrations
    score += Math.min(20, celebrations.length * 4);
    
    // Score from challenge completion
    const completionRate = challenges.length > 0 ? completedChallenges.length / challenges.length : 0;
    score += Math.min(10, completionRate * 10);
    
    return Math.min(100, score);
  }, [streaks, achievements, celebrations, challenges, completedChallenges]);

  // Get motivation level
  const motivationLevel = useMemo(() => {
    if (motivationScore >= 80) return 'high';
    if (motivationScore >= 60) return 'medium';
    if (motivationScore >= 40) return 'low';
    return 'very-low';
  }, [motivationScore]);

  // Get motivation message
  const motivationMessage = useMemo(() => {
    switch (motivationLevel) {
      case 'high':
        return "You're on fire! Keep up the amazing work! 🔥";
      case 'medium':
        return "Great progress! You're building solid habits! 💪";
      case 'low':
        return "You're making progress! Every step counts! 🌱";
      case 'very-low':
        return "Ready to start your wellness journey? Let's do this! 🚀";
      default:
        return "Keep going! You've got this! 💫";
    }
  }, [motivationLevel]);

  // Get next milestone
  const nextMilestone = useMemo(() => {
    // Find the next logical milestone based on current progress
    const sleepStreak = getStreakByType('sleep');
    const exerciseStreak = getStreakByType('exercise');
    
    if (sleepStreak && sleepStreak.current < 7) {
      return {
        type: 'sleep',
        target: 7,
        current: sleepStreak.current,
        message: 'Reach 7 days of consistent sleep'
      };
    }
    
    if (exerciseStreak && exerciseStreak.current < 5) {
      return {
        type: 'exercise',
        target: 5,
        current: exerciseStreak.current,
        message: 'Reach 5 days of exercise'
      };
    }
    
    if (totalAchievements < 3) {
      return {
        type: 'achievement',
        target: 3,
        current: totalAchievements,
        message: 'Unlock 3 achievements'
      };
    }
    
    return null;
  }, [streaks, totalAchievements]);

  return {
    celebrations,
    streaks,
    achievements,
    challenges,
    loading,
    error,
    // Computed values
    longestStreak,
    totalAchievements,
    completedChallenges,
    activeChallenges,
    motivationScore,
    motivationLevel,
    motivationMessage,
    nextMilestone,
    // Helper functions
    getStreakByType,
    getAchievementsByCategory,
    getChallengeProgress
  };
}