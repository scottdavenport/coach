'use client';

// Easy toggle system for mock data
// For now, let's enable mock data by default in development
export const USE_MOCK_DATA = process.env.NODE_ENV === 'development';

export interface MockWeeklyData {
  current: number;
  trend: 'up' | 'down' | 'stable';
  weeklyData: number[];
  change: number; // percentage change from previous week
}

export interface MockDashboardData {
  sleep: MockWeeklyData;
  readiness: MockWeeklyData;
  weight: MockWeeklyData;
}

// Generate realistic sample data with actual trends
function generateMockData(): MockDashboardData {
  // Sleep scores: 65-95 range with realistic weekly variation
  const sleepWeeklyData = [78, 80, 82, 85, 83, 82, 84];
  const sleepCurrent = sleepWeeklyData[sleepWeeklyData.length - 1];
  const sleepPrevious = sleepWeeklyData[0];
  const sleepChange = ((sleepCurrent - sleepPrevious) / sleepPrevious) * 100;

  // Readiness scores: 60-90 range with realistic weekly variation
  const readinessWeeklyData = [73, 75, 74, 76, 75, 75, 75];
  const readinessCurrent = readinessWeeklyData[readinessWeeklyData.length - 1];
  const readinessPrevious = readinessWeeklyData[0];
  const readinessChange =
    ((readinessCurrent - readinessPrevious) / readinessPrevious) * 100;

  // Weight: 150-200 range with realistic weekly variation (in lbs)
  const weightWeeklyData = [166.1, 165.8, 165.5, 165.3, 165.4, 165.2, 165.2];
  const weightCurrent = weightWeeklyData[weightWeeklyData.length - 1];
  const weightPrevious = weightWeeklyData[0];
  const weightChange =
    ((weightCurrent - weightPrevious) / weightPrevious) * 100;

  return {
    sleep: {
      current: sleepCurrent,
      trend: sleepChange > 1 ? 'up' : sleepChange < -1 ? 'down' : 'stable',
      weeklyData: sleepWeeklyData,
      change: sleepChange,
    },
    readiness: {
      current: readinessCurrent,
      trend:
        readinessChange > 1 ? 'up' : readinessChange < -1 ? 'down' : 'stable',
      weeklyData: readinessWeeklyData,
      change: readinessChange,
    },
    weight: {
      current: weightCurrent,
      trend:
        weightChange > 0.5 ? 'up' : weightChange < -0.5 ? 'down' : 'stable',
      weeklyData: weightWeeklyData,
      change: weightChange,
    },
  };
}

// Alternative mock data sets for variety
function generateAlternativeMockData(): MockDashboardData {
  // Poor sleep week
  const sleepWeeklyData = [85, 82, 78, 75, 72, 70, 68];
  const sleepCurrent = sleepWeeklyData[sleepWeeklyData.length - 1];
  const sleepPrevious = sleepWeeklyData[0];
  const sleepChange = ((sleepCurrent - sleepPrevious) / sleepPrevious) * 100;

  // Improving readiness
  const readinessWeeklyData = [65, 68, 70, 72, 75, 78, 80];
  const readinessCurrent = readinessWeeklyData[readinessWeeklyData.length - 1];
  const readinessPrevious = readinessWeeklyData[0];
  const readinessChange =
    ((readinessCurrent - readinessPrevious) / readinessPrevious) * 100;

  // Stable weight
  const weightWeeklyData = [165.0, 165.1, 165.0, 164.9, 165.0, 165.1, 165.0];
  const weightCurrent = weightWeeklyData[weightWeeklyData.length - 1];
  const weightPrevious = weightWeeklyData[0];
  const weightChange =
    ((weightCurrent - weightPrevious) / weightPrevious) * 100;

  return {
    sleep: {
      current: sleepCurrent,
      trend: sleepChange > 1 ? 'up' : sleepChange < -1 ? 'down' : 'stable',
      weeklyData: sleepWeeklyData,
      change: sleepChange,
    },
    readiness: {
      current: readinessCurrent,
      trend:
        readinessChange > 1 ? 'up' : readinessChange < -1 ? 'down' : 'stable',
      weeklyData: readinessWeeklyData,
      change: readinessChange,
    },
    weight: {
      current: weightCurrent,
      trend:
        weightChange > 0.5 ? 'up' : weightChange < -0.5 ? 'down' : 'stable',
      weeklyData: weightWeeklyData,
      change: weightChange,
    },
  };
}

// Export the mock data generator
export function getMockDashboardData(): MockDashboardData {
  // You can switch between different mock data sets here
  // For now, using the default good trends
  return generateMockData();
}

// Helper function to get trend direction and color
export function getTrendInfo(
  trend: 'up' | 'down' | 'stable',
  metric: 'sleep' | 'readiness' | 'weight'
) {
  const isGoodTrend = (
    trend: 'up' | 'down' | 'stable',
    metric: 'sleep' | 'readiness' | 'weight'
  ) => {
    if (metric === 'weight') {
      return trend === 'down'; // Weight loss is generally good
    }
    return trend === 'up'; // Higher sleep and readiness scores are good
  };

  const isGood = isGoodTrend(trend, metric);

  return {
    direction: trend,
    isGood,
    color: isGood
      ? 'text-success'
      : trend === 'stable'
        ? 'text-muted'
        : 'text-warning',
    icon: trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→',
  };
}

// Helper to format change percentage
export function formatChange(change: number): string {
  const sign = change > 0 ? '+' : '';
  return `${sign}${change.toFixed(1)}%`;
}

// Helper to get week labels for charts
export function getWeekLabels(): string[] {
  const labels = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
  }

  return labels;
}
