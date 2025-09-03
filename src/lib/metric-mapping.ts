// Simplified metric mapping system
// This replaces the complex AI classification with direct mapping

export interface MetricMapping {
  category: string;
  metric: string;
  confidence?: number;
}

export interface ParsedMetric {
  category: string;
  metric: string;
  value: number | string | boolean;
  unit?: string;
  source: string;
  confidence: number;
}

// Direct mapping from conversation/OCR data to structured metrics
export const METRIC_MAPPING: Record<string, MetricMapping> = {
  // Sleep metrics
  'sleep_score': { category: 'sleep', metric: 'sleep_score' },
  'sleep_hours': { category: 'sleep', metric: 'sleep_duration' },
  'sleep_duration': { category: 'sleep', metric: 'sleep_duration' },
  'sleep_quality': { category: 'sleep', metric: 'sleep_quality' },
  'time_in_bed': { category: 'sleep', metric: 'time_in_bed' },
  'rem_sleep': { category: 'sleep', metric: 'rem_sleep' },
  'deep_sleep': { category: 'sleep', metric: 'deep_sleep' },
  'sleep_efficiency': { category: 'sleep', metric: 'sleep_efficiency' },
  'total_sleep': { category: 'sleep', metric: 'sleep_duration' },
  'sleep': { category: 'sleep', metric: 'sleep_duration' },
  
  // Health metrics
  'resting_heart_rate': { category: 'health', metric: 'resting_heart_rate' },
  'heart_rate': { category: 'health', metric: 'resting_heart_rate' },
  'average_heart_rate': { category: 'health', metric: 'resting_heart_rate' },
  'lowest_heart_rate': { category: 'health', metric: 'resting_heart_rate' },
  'highest_heart_rate': { category: 'health', metric: 'resting_heart_rate' },
  'heart_rate_variability': { category: 'health', metric: 'heart_rate_variability' },
  'hrv': { category: 'health', metric: 'heart_rate_variability' },
  'blood_pressure': { category: 'health', metric: 'blood_pressure_systolic' },
  'weight': { category: 'health', metric: 'weight' },
  'body_fat': { category: 'health', metric: 'body_fat' },
  'glucose': { category: 'health', metric: 'glucose' },
  'glucose_level': { category: 'health', metric: 'glucose' },
  'body_temperature': { category: 'health', metric: 'body_temperature' },
  'temperature': { category: 'health', metric: 'body_temperature' },
  
  // Activity metrics
  'steps': { category: 'activity', metric: 'steps' },
  'calories_burned': { category: 'activity', metric: 'calories_burned' },
  'calories': { category: 'activity', metric: 'calories_burned' },
  'active_minutes': { category: 'activity', metric: 'active_minutes' },
  'workout_duration': { category: 'activity', metric: 'workout_duration' },
  'workout_intensity': { category: 'activity', metric: 'workout_intensity' },
  'vo2_max': { category: 'activity', metric: 'vo2_max' },
  'recovery_score': { category: 'activity', metric: 'recovery_score' },
  'activity_level': { category: 'activity', metric: 'recovery_score' },
  'readiness_score': { category: 'wellness', metric: 'readiness' },
  
  // Wellness metrics
  'mood': { category: 'wellness', metric: 'mood' },
  'energy': { category: 'wellness', metric: 'energy' },
  'energy_level': { category: 'wellness', metric: 'energy' },
  'stress': { category: 'wellness', metric: 'stress' },
  'stress_level': { category: 'wellness', metric: 'stress' },
  'readiness': { category: 'wellness', metric: 'readiness' },
  'fatigue': { category: 'wellness', metric: 'fatigue' },
  'mental_clarity': { category: 'wellness', metric: 'mental_clarity' },
  
  // Nutrition metrics
  'water_intake': { category: 'nutrition', metric: 'water_intake' },
  'water': { category: 'nutrition', metric: 'water_intake' },
  'calories_consumed': { category: 'nutrition', metric: 'calories_consumed' },
  'protein': { category: 'nutrition', metric: 'protein' },
  'carbs': { category: 'nutrition', metric: 'carbs' },
  'carbohydrates': { category: 'nutrition', metric: 'carbs' },
  'fat': { category: 'nutrition', metric: 'fat' },
  'caffeine': { category: 'nutrition', metric: 'caffeine' },
  
  // Lifestyle metrics
  'alcohol': { category: 'lifestyle', metric: 'alcohol_consumption' },
  'alcohol_consumption': { category: 'lifestyle', metric: 'alcohol_consumption' },
  'screen_time': { category: 'lifestyle', metric: 'screen_time' },
  'social_activities': { category: 'lifestyle', metric: 'social_activities' },
  'work_stress': { category: 'lifestyle', metric: 'work_stress' },
  'travel': { category: 'lifestyle', metric: 'travel_status' },
  'traveling': { category: 'lifestyle', metric: 'travel_status' }
};

// Helper function to map conversation/OCR data to structured metrics
export function mapToStructuredMetrics(data: Record<string, any>, source: string): ParsedMetric[] {
  const metrics: ParsedMetric[] = [];
  
  for (const [key, value] of Object.entries(data)) {
    const mapping = METRIC_MAPPING[key.toLowerCase()];
    
    if (mapping && value !== null && value !== undefined) {
      // Determine unit based on metric type
      let unit = '';
      if (typeof value === 'number') {
        unit = getUnitForMetric(mapping.metric);
      }
      
      metrics.push({
        category: mapping.category,
        metric: mapping.metric,
        value: value,
        unit,
        source,
        confidence: 0.9 // High confidence for direct mapping
      });
    }
  }
  
  return metrics;
}

// Helper function to get units for metrics
function getUnitForMetric(metric: string): string {
  const unitMap: Record<string, string> = {
    // Sleep
    'sleep_score': '/100',
    'sleep_duration': 'hours',
    'sleep_quality': '/10',
    'time_in_bed': 'hours',
    'rem_sleep': 'hours',
    'deep_sleep': 'hours',
    'sleep_efficiency': '%',
    
    // Health
    'resting_heart_rate': 'bpm',
    'heart_rate_variability': 'ms',
    'blood_pressure_systolic': 'mmHg',
    'blood_pressure_diastolic': 'mmHg',
    'weight': 'lbs',
    'body_fat': '%',
    'glucose': 'mg/dL',
    'body_temperature': '°F',
    
    // Activity
    'steps': 'steps',
    'calories_burned': 'cal',
    'active_minutes': 'minutes',
    'workout_duration': 'minutes',
    'workout_intensity': '/10',
    'vo2_max': 'ml/kg/min',
    'recovery_score': '/100',
    
    // Wellness
    'mood': '/10',
    'energy': '/10',
    'stress': '/10',
    'readiness': '/10',
    'fatigue': '/10',
    'mental_clarity': '/10',
    
    // Nutrition
    'water_intake': 'oz',
    'calories_consumed': 'cal',
    'protein': 'g',
    'carbs': 'g',
    'fat': 'g',
    'caffeine': 'mg',
    
    // Lifestyle
    'alcohol_consumption': 'drinks',
    'screen_time': 'hours',
    'social_activities': '/10',
    'work_stress': '/10'
  };
  
  return unitMap[metric] || '';
}

// Helper function to validate metric values
export function validateMetricValue(metric: string): boolean {
  const metricInfo = Object.values(METRIC_MAPPING).find(m => m.metric === metric);
  if (!metricInfo) return false;
  
  // Add validation logic here if needed
  return true;
}
