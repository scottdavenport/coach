import { ProgressCelebration, StreakData, AchievementBadge, MotivationChallenge } from './types';

export class MotivationEngine {
  private userData: any;
  private historicalData: any;

  constructor(userData: any, historicalData: any = {}) {
    this.userData = userData;
    this.historicalData = historicalData;
  }

  generateProgressCelebrations(): ProgressCelebration[] {
    const celebrations: ProgressCelebration[] = [];

    // Sleep streak celebration
    const sleepStreak = this.calculateSleepStreak();
    if (sleepStreak >= 3) {
      celebrations.push({
        type: 'streak',
        title: 'Sleep Streak',
        description: `${sleepStreak} days of 8+ hour sleep`,
        value: sleepStreak,
        icon: '🔥',
        color: 'text-orange-400'
      });
    }

    // Sleep improvement celebration
    const sleepChange = this.userData.sleep?.change || 0;
    if (sleepChange > 5) {
      celebrations.push({
        type: 'improvement',
        title: 'Sleep Improvement',
        description: `${sleepChange.toFixed(1)}% better this week`,
        value: sleepChange,
        icon: '📈',
        color: 'text-green-400'
      });
    }

    // Readiness improvement celebration
    const readinessChange = this.userData.readiness?.change || 0;
    if (readinessChange > 5) {
      celebrations.push({
        type: 'improvement',
        title: 'Energy Boost',
        description: `${readinessChange.toFixed(1)}% better readiness`,
        value: readinessChange,
        icon: '⚡',
        color: 'text-blue-400'
      });
    }

    // Weight management celebration
    const weightChange = this.userData.weight?.change || 0;
    if (weightChange < -1) {
      celebrations.push({
        type: 'improvement',
        title: 'Weight Progress',
        description: `${Math.abs(weightChange).toFixed(1)}% weight loss`,
        value: Math.abs(weightChange),
        icon: '🎯',
        color: 'text-purple-400'
      });
    }

    // Personal best celebrations
    const personalBests = this.identifyPersonalBests();
    personalBests.forEach(best => {
      celebrations.push({
        type: 'personal_best',
        title: best.title,
        description: best.description,
        value: best.value,
        icon: best.icon,
        color: best.color
      });
    });

    return celebrations;
  }

  generateStreaks(): StreakData[] {
    const streaks: StreakData[] = [];

    // Sleep streak
    const sleepStreak = this.calculateSleepStreak();
    if (sleepStreak > 0) {
      streaks.push({
        type: 'sleep',
        current: sleepStreak,
        best: Math.max(sleepStreak, this.historicalData.bestSleepStreak || 0),
        startDate: this.calculateStreakStartDate('sleep', sleepStreak),
        lastUpdate: new Date()
      });
    }

    // Exercise streak (mock data)
    const exerciseStreak = this.calculateExerciseStreak();
    if (exerciseStreak > 0) {
      streaks.push({
        type: 'exercise',
        current: exerciseStreak,
        best: Math.max(exerciseStreak, this.historicalData.bestExerciseStreak || 0),
        startDate: this.calculateStreakStartDate('exercise', exerciseStreak),
        lastUpdate: new Date()
      });
    }

    // Goal completion streak
    const goalStreak = this.calculateGoalCompletionStreak();
    if (goalStreak > 0) {
      streaks.push({
        type: 'goal_completion',
        current: goalStreak,
        best: Math.max(goalStreak, this.historicalData.bestGoalStreak || 0),
        startDate: this.calculateStreakStartDate('goal_completion', goalStreak),
        lastUpdate: new Date()
      });
    }

    return streaks;
  }

  generateAchievements(): AchievementBadge[] {
    const achievements: AchievementBadge[] = [];

    // Sleep achievements
    const sleepStreak = this.calculateSleepStreak();
    if (sleepStreak >= 7 && !this.historicalData.sleepChampion) {
      achievements.push({
        id: 'sleep-champion',
        name: 'Sleep Champion',
        description: '7+ days of consistent sleep',
        icon: '😴',
        color: 'text-blue-500',
        unlockedAt: new Date(),
        category: 'sleep'
      });
    }

    if (sleepStreak >= 30 && !this.historicalData.sleepMaster) {
      achievements.push({
        id: 'sleep-master',
        name: 'Sleep Master',
        description: '30+ days of consistent sleep',
        icon: '👑',
        color: 'text-purple-500',
        unlockedAt: new Date(),
        category: 'sleep'
      });
    }

    // Consistency achievements
    const consistencyScore = this.calculateConsistencyScore();
    if (consistencyScore >= 80 && !this.historicalData.consistencyMaster) {
      achievements.push({
        id: 'consistency-master',
        name: 'Consistency Master',
        description: '80%+ consistency across all metrics',
        icon: '🎯',
        color: 'text-green-500',
        unlockedAt: new Date(),
        category: 'consistency'
      });
    }

    // Improvement achievements
    const totalImprovement = this.calculateTotalImprovement();
    if (totalImprovement >= 20 && !this.historicalData.improvementExpert) {
      achievements.push({
        id: 'improvement-expert',
        name: 'Improvement Expert',
        description: '20%+ improvement across metrics',
        icon: '📈',
        color: 'text-orange-500',
        unlockedAt: new Date(),
        category: 'improvement'
      });
    }

    return achievements;
  }

  generateChallenges(): MotivationChallenge[] {
    const challenges: MotivationChallenge[] = [];

    // Daily sleep challenge
    challenges.push({
      id: 'daily-sleep',
      title: 'Daily Sleep Goal',
      description: 'Maintain 8+ hours of sleep for 7 days',
      type: 'daily',
      target: 7,
      current: this.calculateSleepStreak(),
      reward: 'Sleep Champion Badge',
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      completed: this.calculateSleepStreak() >= 7
    });

    // Weekly improvement challenge
    const weeklyImprovement = this.calculateWeeklyImprovement();
    challenges.push({
      id: 'weekly-improvement',
      title: 'Weekly Improvement',
      description: 'Improve any metric by 10% this week',
      type: 'weekly',
      target: 10,
      current: weeklyImprovement,
      reward: 'Improvement Badge',
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      completed: weeklyImprovement >= 10
    });

    // Monthly consistency challenge
    const monthlyConsistency = this.calculateMonthlyConsistency();
    challenges.push({
      id: 'monthly-consistency',
      title: 'Monthly Consistency',
      description: 'Maintain 80%+ consistency for the month',
      type: 'monthly',
      target: 80,
      current: monthlyConsistency,
      reward: 'Consistency Master Badge',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      completed: monthlyConsistency >= 80
    });

    return challenges;
  }

  private calculateSleepStreak(): number {
    const sleepScores = this.userData.sleep?.weeklyData || [];
    let streak = 0;
    
    for (let i = sleepScores.length - 1; i >= 0; i--) {
      if (sleepScores[i] >= 75) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  }

  private calculateExerciseStreak(): number {
    // Mock implementation - in real app, this would analyze exercise data
    return Math.floor(Math.random() * 5) + 1;
  }

  private calculateGoalCompletionStreak(): number {
    // Mock implementation - in real app, this would analyze goal completion
    return Math.floor(Math.random() * 3) + 1;
  }

  private calculateStreakStartDate(type: string, streakLength: number): Date {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - streakLength);
    return startDate;
  }

  private identifyPersonalBests(): Array<{
    title: string;
    description: string;
    value: number;
    icon: string;
    color: string;
  }> {
    const personalBests = [];

    // Sleep personal best
    const sleepScores = this.userData.sleep?.weeklyData || [];
    const maxSleep = Math.max(...sleepScores);
    if (maxSleep >= 90) {
      personalBests.push({
        title: 'Sleep Personal Best',
        description: `${maxSleep} sleep score`,
        value: maxSleep,
        icon: '⭐',
        color: 'text-yellow-400'
      });
    }

    // Readiness personal best
    const readinessScores = this.userData.readiness?.weeklyData || [];
    const maxReadiness = Math.max(...readinessScores);
    if (maxReadiness >= 85) {
      personalBests.push({
        title: 'Readiness Personal Best',
        description: `${maxReadiness} readiness score`,
        value: maxReadiness,
        icon: '🚀',
        color: 'text-blue-400'
      });
    }

    return personalBests;
  }

  private calculateConsistencyScore(): number {
    // Mock implementation - calculate consistency across metrics
    const sleepConsistency = this.userData.sleep?.change ? Math.abs(this.userData.sleep.change) : 0;
    const readinessConsistency = this.userData.readiness?.change ? Math.abs(this.userData.readiness.change) : 0;
    return Math.min(100, (sleepConsistency + readinessConsistency) / 2);
  }

  private calculateTotalImprovement(): number {
    const sleepChange = this.userData.sleep?.change || 0;
    const readinessChange = this.userData.readiness?.change || 0;
    const weightChange = this.userData.weight?.change || 0;
    
    return Math.abs(sleepChange) + Math.abs(readinessChange) + Math.abs(weightChange);
  }

  private calculateWeeklyImprovement(): number {
    const sleepChange = this.userData.sleep?.change || 0;
    const readinessChange = this.userData.readiness?.change || 0;
    return Math.max(sleepChange, readinessChange);
  }

  private calculateMonthlyConsistency(): number {
    // Mock implementation - in real app, this would analyze monthly data
    return Math.floor(Math.random() * 30) + 70;
  }
}