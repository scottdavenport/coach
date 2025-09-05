export interface CoachingInsight {
  type: 'celebration' | 'recommendation' | 'alert' | 'motivation' | 'insight';
  priority: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  action?: string;
  data?: any;
  timestamp: Date;
}

export interface ProgressCelebration {
  type: 'streak' | 'achievement' | 'personal_best' | 'improvement';
  title: string;
  description: string;
  value: number;
  icon: string;
  color: string;
}

export interface MorningBriefing {
  focus: string;
  insight: string;
  recommendation: string;
  motivation: string;
  timestamp: Date;
}

export interface WeeklyInsights {
  topPerformer: string;
  improvement: string;
  recommendation: string;
  celebration: string;
  weekStart: Date;
  weekEnd: Date;
}

export interface SmartNotification {
  id: string;
  type: 'context_aware' | 'timing_based' | 'pattern_based' | 'goal_based';
  title: string;
  message: string;
  action?: string;
  priority: 'high' | 'medium' | 'low';
  timestamp: Date;
  read: boolean;
}

export interface StreakData {
  type: 'sleep' | 'exercise' | 'goal_completion' | 'readiness';
  current: number;
  best: number;
  startDate: Date;
  lastUpdate: Date;
}

export interface AchievementBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  unlockedAt: Date;
  category: 'sleep' | 'exercise' | 'consistency' | 'improvement';
}

export interface MotivationChallenge {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly';
  target: number;
  current: number;
  reward: string;
  startDate: Date;
  endDate: Date;
  completed: boolean;
}

export interface CoachingData {
  morningBriefing: MorningBriefing;
  celebrations: ProgressCelebration[];
  weeklyInsights: WeeklyInsights;
  notifications: SmartNotification[];
  streaks: StreakData[];
  achievements: AchievementBadge[];
  challenges: MotivationChallenge[];
}