export interface DataClassification {
  type: 'metric' | 'journal' | 'goal' | 'note';
  category:
    | 'health'
    | 'fitness'
    | 'wellness'
    | 'lifestyle'
    | 'biometric'
    | 'sleep'
    | 'activity';
  displayType: 'card' | 'journal' | 'hidden';
  priority: number;
  editable: boolean;
  deletable: boolean;
}

export interface ClassifiedData {
  key: string;
  value: any;
  classification: DataClassification;
  metadata?: {
    source: string;
    confidence: number;
    timestamp: string;
  };
}

// AI-powered classification function
export async function classifyData(
  key: string,
  value: any
): Promise<DataClassification> {
  // Simple rule-based classification (can be enhanced with AI)
  const lowerKey = key.toLowerCase();
  const valueType = typeof value;

  // Metric classification (numeric/boolean values)
  if (valueType === 'number' || valueType === 'boolean') {
    if (
      lowerKey.includes('weight') ||
      lowerKey.includes('heart') ||
      lowerKey.includes('rate')
    ) {
      return {
        type: 'metric',
        category: 'biometric',
        displayType: 'card',
        priority: 1,
        editable: true,
        deletable: true,
      };
    }

    if (
      lowerKey.includes('sleep') ||
      lowerKey.includes('mood') ||
      lowerKey.includes('energy')
    ) {
      return {
        type: 'metric',
        category: 'wellness',
        displayType: 'card',
        priority: 2,
        editable: true,
        deletable: true,
      };
    }

    if (
      lowerKey.includes('workout') ||
      lowerKey.includes('exercise') ||
      lowerKey.includes('activity')
    ) {
      return {
        type: 'metric',
        category: 'fitness',
        displayType: 'card',
        priority: 3,
        editable: true,
        deletable: true,
      };
    }
  }

  // Journal classification (text content)
  if (valueType === 'string' || Array.isArray(value)) {
    if (
      lowerKey.includes('tip') ||
      lowerKey.includes('advice') ||
      lowerKey.includes('suggestion')
    ) {
      return {
        type: 'journal',
        category: 'lifestyle',
        displayType: 'journal',
        priority: 4,
        editable: true,
        deletable: true,
      };
    }

    if (lowerKey.includes('workout') && valueType === 'string') {
      return {
        type: 'journal',
        category: 'fitness',
        displayType: 'journal',
        priority: 5,
        editable: true,
        deletable: true,
      };
    }

    if (lowerKey.includes('goal') || lowerKey.includes('intention')) {
      return {
        type: 'goal',
        category: 'lifestyle',
        displayType: 'journal',
        priority: 6,
        editable: true,
        deletable: true,
      };
    }
  }

  // Default classification
  return {
    type: 'note',
    category: 'lifestyle',
    displayType: 'journal',
    priority: 10,
    editable: true,
    deletable: true,
  };
}

// Separate data into Daily Card vs Journal
export function separateDataByType(data: Record<string, any>): {
  dailyCard: ClassifiedData[];
  journal: ClassifiedData[];
} {
  const dailyCard: ClassifiedData[] = [];
  const journal: ClassifiedData[] = [];

  Object.entries(data).forEach(([key, value]) => {
    if (value && typeof value === 'object' && 'value' in value) {
      // Since classifyData is async but we need sync here, let's use a simple sync version
      const classification = classifyDataSync(key, value.value);

      const classifiedData: ClassifiedData = {
        key,
        value: value.value,
        classification,
        metadata: {
          source: value.source || 'unknown',
          confidence: value.confidence || 0.5,
          timestamp: value.timestamp || new Date().toISOString(),
        },
      };

      if (classification.displayType === 'card') {
        dailyCard.push(classifiedData);
      } else if (classification.displayType === 'journal') {
        journal.push(classifiedData);
      }
    }
  });

  // Sort by priority
  dailyCard.sort(
    (a, b) => a.classification.priority - b.classification.priority
  );
  journal.sort((a, b) => a.classification.priority - b.classification.priority);

  return { dailyCard, journal };
}

// Synchronous version of classifyData for use in separateDataByType
function classifyDataSync(key: string, value: any): DataClassification {
  // Simple rule-based classification (can be enhanced with AI)
  const lowerKey = key.toLowerCase();
  const valueType = typeof value;

  // Metric classification (numeric/boolean values)
  if (valueType === 'number' || valueType === 'boolean') {
    if (
      lowerKey.includes('weight') ||
      lowerKey.includes('heart') ||
      lowerKey.includes('rate') ||
      lowerKey.includes('hr')
    ) {
      return {
        type: 'metric',
        category: 'biometric',
        displayType: 'card',
        priority: 1,
        editable: true,
        deletable: true,
      };
    }

    if (
      lowerKey.includes('sleep') ||
      lowerKey.includes('mood') ||
      lowerKey.includes('energy') ||
      lowerKey.includes('stress') ||
      lowerKey.includes('readiness')
    ) {
      return {
        type: 'metric',
        category: 'wellness',
        displayType: 'card',
        priority: 2,
        editable: true,
        deletable: true,
      };
    }

    if (
      lowerKey.includes('workout') ||
      lowerKey.includes('exercise') ||
      lowerKey.includes('activity')
    ) {
      return {
        type: 'metric',
        category: 'fitness',
        displayType: 'card',
        priority: 3,
        editable: true,
        deletable: true,
      };
    }
  }

  // Journal classification (text content)
  if (valueType === 'string' || Array.isArray(value)) {
    if (
      lowerKey.includes('tip') ||
      lowerKey.includes('advice') ||
      lowerKey.includes('suggestion')
    ) {
      return {
        type: 'journal',
        category: 'lifestyle',
        displayType: 'journal',
        priority: 4,
        editable: true,
        deletable: true,
      };
    }

    if (lowerKey.includes('workout') && valueType === 'string') {
      return {
        type: 'journal',
        category: 'fitness',
        displayType: 'journal',
        priority: 5,
        editable: true,
        deletable: true,
      };
    }

    if (lowerKey.includes('goal') || lowerKey.includes('intention')) {
      return {
        type: 'goal',
        category: 'lifestyle',
        displayType: 'journal',
        priority: 6,
        editable: true,
        deletable: true,
      };
    }
  }

  // Default classification
  return {
    type: 'note',
    category: 'lifestyle',
    displayType: 'journal',
    priority: 10,
    editable: true,
    deletable: true,
  };
}
