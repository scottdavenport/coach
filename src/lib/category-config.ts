export interface CategoryConfig {
  name: string;
  displayName: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  sortOrder: number;
}

export const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  sleep: {
    name: 'sleep',
    displayName: 'Sleep',
    description: 'Sleep quality, duration, and patterns',
    icon: '🌙',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/5',
    borderColor: 'border-blue-500/20',
    sortOrder: 1,
  },
  health: {
    name: 'health',
    displayName: 'Health Metrics',
    description: 'Vital signs and biometric data',
    icon: '❤️',
    color: 'text-red-400',
    bgColor: 'bg-red-500/5',
    borderColor: 'border-red-500/20',
    sortOrder: 2,
  },
  activity: {
    name: 'activity',
    displayName: 'Activity & Fitness',
    description: 'Physical activity and exercise data',
    icon: '🏃',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/5',
    borderColor: 'border-orange-500/20',
    sortOrder: 3,
  },
  wellness: {
    name: 'wellness',
    displayName: 'Wellness & Readiness',
    description: 'Mood, energy, stress, and readiness',
    icon: '🧠',
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-500/5',
    borderColor: 'border-indigo-500/20',
    sortOrder: 4,
  },
  nutrition: {
    name: 'nutrition',
    displayName: 'Nutrition & Hydration',
    description: 'Food, water, and supplement intake',
    icon: '🥗',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/5',
    borderColor: 'border-yellow-500/20',
    sortOrder: 5,
  },
  lifestyle: {
    name: 'lifestyle',
    displayName: 'Lifestyle & Habits',
    description: 'Daily habits and lifestyle factors',
    icon: '☕',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/5',
    borderColor: 'border-cyan-500/20',
    sortOrder: 6,
  },
};

// Helper function to get category config
export function getCategoryConfig(categoryName: string): CategoryConfig {
  return (
    CATEGORY_CONFIG[categoryName] || {
      name: categoryName,
      displayName: categoryName.charAt(0).toUpperCase() + categoryName.slice(1),
      description: 'Health and wellness data',
      icon: '📊',
      color: 'text-gray-400',
      bgColor: 'bg-gray-500/5',
      borderColor: 'border-gray-500/20',
      sortOrder: 999,
    }
  );
}

// Helper function to get sorted categories
export function getSortedCategories(): CategoryConfig[] {
  return Object.values(CATEGORY_CONFIG).sort(
    (a, b) => a.sortOrder - b.sortOrder
  );
}
