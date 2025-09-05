import { CoachingInsight, MorningBriefing, WeeklyInsights, SmartNotification } from './types';

export class InsightGenerator {
  private userData: any;
  private patterns: any;

  constructor(userData: any, patterns: any) {
    this.userData = userData;
    this.patterns = patterns;
  }

  generateMorningBriefing(): MorningBriefing {
    const sleepScore = this.userData.sleep?.current || 75;
    const readinessScore = this.userData.readiness?.current || 70;
    const sleepTrend = this.userData.sleep?.trend || 'stable';
    const readinessTrend = this.userData.readiness?.trend || 'stable';

    // Generate focus based on lowest performing metric
    let focus = "Maintain your current routine";
    if (sleepScore < 70) {
      focus = "Focus on improving your sleep quality tonight";
    } else if (readinessScore < 70) {
      focus = "Take it easy today and prioritize recovery";
    } else if (sleepScore > 85 && readinessScore > 80) {
      focus = "You're in great shape - tackle your most challenging tasks today";
    }

    // Generate insight based on trends
    let insight = "Your health metrics are stable";
    if (sleepTrend === 'up' && sleepScore > 80) {
      insight = `Your sleep improved ${Math.abs(this.userData.sleep?.change || 0).toFixed(1)}% this week - keep it up!`;
    } else if (readinessTrend === 'up') {
      insight = `Your readiness scores are trending up - you're building great momentum!`;
    } else if (sleepTrend === 'down') {
      insight = "Your sleep has been challenging this week - let's focus on recovery";
    }

    // Generate recommendation based on readiness
    let recommendation = "Continue with your normal routine";
    if (readinessScore < 60) {
      recommendation = "Consider lighter activities and prioritize rest today";
    } else if (readinessScore > 80) {
      recommendation = "You're ready for a challenging workout or intense focus work";
    } else if (readinessScore >= 70 && readinessScore <= 80) {
      recommendation = "Moderate exercise and balanced activities would be ideal today";
    }

    // Generate motivation based on streaks and improvements
    let motivation = "Keep up the great work!";
    const sleepStreak = this.calculateSleepStreak();
    if (sleepStreak >= 3) {
      motivation = `You're on a ${sleepStreak}-day sleep improvement streak!`;
    } else if (this.userData.sleep?.change && this.userData.sleep.change > 5) {
      motivation = `Your sleep improved ${this.userData.sleep.change.toFixed(1)}% this week - amazing progress!`;
    }

    return {
      focus,
      insight,
      recommendation,
      motivation,
      timestamp: new Date()
    };
  }

  generateWeeklyInsights(): WeeklyInsights {
    const sleepChange = this.userData.sleep?.change || 0;
    const readinessChange = this.userData.readiness?.change || 0;
    const weightChange = this.userData.weight?.change || 0;

    // Determine top performer
    let topPerformer = "Consistent routine";
    if (Math.abs(sleepChange) > Math.abs(readinessChange) && Math.abs(sleepChange) > Math.abs(weightChange)) {
      topPerformer = sleepChange > 0 ? "Sleep consistency" : "Sleep recovery";
    } else if (Math.abs(readinessChange) > Math.abs(weightChange)) {
      topPerformer = readinessChange > 0 ? "Energy management" : "Recovery focus";
    } else {
      topPerformer = weightChange < 0 ? "Weight management" : "Body composition";
    }

    // Determine biggest improvement
    let improvement = "Overall wellness";
    if (sleepChange > 5) {
      improvement = "Sleep quality";
    } else if (readinessChange > 5) {
      improvement = "Daily readiness";
    } else if (weightChange < -1) {
      improvement = "Weight management";
    }

    // Generate recommendation
    let recommendation = "Maintain your current routine";
    if (sleepChange < -5) {
      recommendation = "Focus on sleep hygiene and bedtime routine";
    } else if (readinessChange < -5) {
      recommendation = "Prioritize recovery and stress management";
    } else if (sleepChange > 5 && readinessChange > 5) {
      recommendation = "You're in a great rhythm - consider adding new challenges";
    }

    // Generate celebration
    let celebration = "Great consistency this week";
    const personalBests = this.countPersonalBests();
    if (personalBests > 0) {
      celebration = `Hit ${personalBests} personal best${personalBests > 1 ? 's' : ''} this week!`;
    } else if (sleepChange > 10 || readinessChange > 10) {
      celebration = "Outstanding improvement this week!";
    }

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const weekEnd = new Date();

    return {
      topPerformer,
      improvement,
      recommendation,
      celebration,
      weekStart,
      weekEnd
    };
  }

  generateSmartNotifications(): SmartNotification[] {
    const notifications: SmartNotification[] = [];
    const now = new Date();
    const hour = now.getHours();

    // Context-aware notifications based on current metrics
    if (this.userData.readiness?.current < 60) {
      notifications.push({
        id: 'low-readiness',
        type: 'context_aware',
        title: 'Low Readiness Score',
        message: 'Your readiness is below 60 - consider lighter activities today',
        action: 'Adjust today\'s plan',
        priority: 'high',
        timestamp: now,
        read: false
      });
    }

    // Timing-based notifications
    if (hour >= 21 && hour <= 23) {
      notifications.push({
        id: 'wind-down',
        type: 'timing_based',
        title: 'Wind-Down Time',
        message: 'It\'s time to start your evening routine for better sleep',
        action: 'Start wind-down routine',
        priority: 'medium',
        timestamp: now,
        read: false
      });
    }

    // Pattern-based notifications
    if (this.patterns?.sleep?.eveningWalks && this.userData.sleep?.current < 75) {
      notifications.push({
        id: 'evening-walk',
        type: 'pattern_based',
        title: 'Evening Walk Reminder',
        message: 'You usually sleep better after evening walks',
        action: 'Take an evening walk',
        priority: 'medium',
        timestamp: now,
        read: false
      });
    }

    // Goal-based notifications
    const daysToGoal = this.calculateDaysToMonthlyGoal();
    if (daysToGoal <= 3 && daysToGoal > 0) {
      notifications.push({
        id: 'goal-reminder',
        type: 'goal_based',
        title: 'Goal Deadline Approaching',
        message: `You're ${daysToGoal} day${daysToGoal > 1 ? 's' : ''} away from your monthly sleep goal`,
        action: 'Review goal progress',
        priority: 'high',
        timestamp: now,
        read: false
      });
    }

    return notifications;
  }

  private calculateSleepStreak(): number {
    // Mock implementation - in real app, this would analyze historical data
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

  private countPersonalBests(): number {
    // Mock implementation - count improvements
    let count = 0;
    if (this.userData.sleep?.change > 5) count++;
    if (this.userData.readiness?.change > 5) count++;
    if (this.userData.weight?.change < -1) count++;
    return count;
  }

  private calculateDaysToMonthlyGoal(): number {
    // Mock implementation - calculate days to monthly goal
    const today = new Date();
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return Math.ceil((lastDayOfMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }
}