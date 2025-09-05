// Core types for the application

export interface User {
  id: string;
  email?: string;
  profile?: UserProfile;
}

export interface UserProfile {
  trend_preferences?: TrendPreferences;
  timezone?: string; // User's preferred timezone (e.g., 'America/New_York', 'Europe/London')
  [key: string]: unknown;
}

export interface TrendPreferences {
  enabled_metrics: string[];
  suggested_metrics: string[];
  excluded_metrics: string[];
}

export interface ConversationMessage {
  id?: string;
  message: string;
  message_type: 'text' | 'image' | 'file' | 'multi_file';
  metadata?: {
    role?: 'user' | 'assistant';
    conversation_id?: string;
    parsed_health_data?: ParsedConversation;
    file_attachments?: FileAttachment[];
    [key: string]: unknown;
  };
  created_at?: string;
}

// New type for the chat interface
export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  created_at: string;
  attachments?: {
    id: string;
    name: string;
    type: string;
    size: number;
  }[];
}

export interface ParsedConversation {
  // Enhanced data type detection (expanded categories)
  data_types: {
    health: boolean;
    activity: boolean;
    mood: boolean;
    nutrition: boolean;
    sleep: boolean;
    workout: boolean;
    lifestyle: boolean;
    biometric: boolean;
    wellness: boolean;
    social: boolean;
    work: boolean;
    travel: boolean;
  };

  // Extracted specific values with confidence
  extracted_metrics: {
    [metric_key: string]: {
      value: any;
      confidence: number;
      source: 'conversation' | 'ocr' | 'file' | 'inferred';
      time_reference?: string; // "yesterday", "this morning", etc.
      comparative?: 'better' | 'worse' | 'same' | 'improving' | 'declining';
    };
  };

  // Goals and intentions mentioned
  goals_mentioned: Array<{
    goal: string;
    category: string;
    timeframe?: string;
    confidence: number;
  }>;

  // Emotional context and tone
  emotional_context: {
    tone:
      | 'positive'
      | 'negative'
      | 'neutral'
      | 'frustrated'
      | 'excited'
      | 'concerned';
    intensity: number; // 1-10
    specific_emotions: string[];
  };

  // Time references with proper date association
  time_references: Array<{
    reference: string; // "yesterday", "this morning", "last week"
    associated_date?: string; // ISO date if determinable
    context: string; // what happened at that time
  }>;

  // User preferences mentioned
  preferences: Array<{
    type: 'workout_time' | 'equipment' | 'activity_type' | 'diet' | 'schedule';
    value: string;
    confidence: number;
  }>;

  // Enhanced insights with pattern recognition
  insights: {
    observations: string[];
    patterns: string[]; // "This is the third time you've mentioned poor sleep"
    recommendations: string[];
    concerns: string[];
    data_quality_issues: string[]; // conflicting data, missing context
  };

  // Context-aware follow-ups
  follow_up_questions: {
    immediate: string[]; // natural conversational follow-ups
    contextual: string[]; // based on user's history and patterns
    data_driven: string[]; // based on extracted metrics and trends
  };

  // File upload context
  file_context?: {
    has_ocr_data: boolean;
    has_document_data: boolean;
    extracted_data: string[];
    data_validation_needed: string[];
  };

  // Conversation themes and topics
  conversation_themes: string[];

  // Historical context references
  historical_context?: {
    references_past_data: boolean;
    pattern_continuations: string[];
    trend_mentions: string[];
  };
}

export interface WeeklyCard {
  id?: string;
  user_id: string;
  log_date: string;
  summary?: WeeklySummary;
  created_at?: string;
  updated_at?: string;
}

export interface WeeklySummary {
  sleep_hours?: number;
  sleep_quality?: number;
  mood?: number;
  energy?: number;
  stress?: number;
  readiness?: number;
  context_data?: Record<string, Record<string, ContextValue>>;
  [key: string]: unknown;
}

export interface ContextValue {
  value: unknown;
  confidence?: number;
  source?: string;
  timestamp?: string;
}

export interface HealthEvent {
  id?: string;
  user_id: string;
  event_type: string;
  data: Record<string, unknown>;
  confidence: number;
  created_at?: string;
}

export interface ContextData {
  id?: string;
  user_id: string;
  category: string;
  key: string;
  value: unknown;
  confidence: number;
  source: string;
  created_at?: string;
}

export interface ConversationState {
  state: string;
  checkin_progress: Record<string, unknown>;
}

export interface EditableFieldProps {
  value: string | number;
  onSave: (value: string | number) => void;
  type?: 'text' | 'number';
  placeholder?: string;
  className?: string;
}

export interface SimpleTileProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  className?: string;
}

export interface WorkoutCardProps {
  workout: {
    id: string;
    name: string;
    description?: string;
    exercises: Array<{
      name: string;
      sets?: number;
      reps?: number;
      weight?: number;
      duration?: number;
      notes?: string;
    }>;
    created_at: string;
  };
}

export interface ChatMessageProps {
  message: ConversationMessage;
  isUser: boolean;
}

export interface FileUploadMenuProps {
  onFileUpload: (files: File[]) => void;
  disabled?: boolean;
  maxFiles?: number;
  supportedTypes?: string[];
}

export interface FileAttachment {
  id: string;
  file: File;
  fileName: string;
  fileSize: number;
  fileType: SupportedFileType;
  fileUrl?: string;
  uploadStatus: 'pending' | 'uploading' | 'uploaded' | 'error';
  processedContent?: string;
  errorMessage?: string;
}

export type SupportedFileType =
  | 'image/jpeg'
  | 'image/png'
  | 'image/gif'
  | 'image/webp'
  | 'application/pdf'
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // docx
  | 'application/msword' // doc
  | 'text/plain'
  | 'text/markdown'
  | 'text/csv'
  | 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' // xlsx
  | 'application/vnd.oasis.opendocument.spreadsheet' // ods
  | 'application/vnd.openxmlformats-officedocument.presentationml.presentation'; // pptx

export interface FileProcessingResult {
  success: boolean;
  fileId: string;
  content?: string;
  metadata?: {
    pageCount?: number;
    wordCount?: number;
    tableCount?: number;
    [key: string]: unknown;
  };
  error?: string;
}

export interface OuraIntegrationProps {
  userId: string;
  onIntegrationComplete?: () => void;
}

export interface TrendPreferencesProps {
  userId: string;
  onPreferencesUpdate?: () => void;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success?: boolean;
  error?: string;
  data?: T;
  message?: string;
}

export interface ChatApiResponse extends ApiResponse {
  message?: string;
  conversationId?: string;
  parsedData?: ParsedConversation;
}

export interface HealthStoreResponse extends ApiResponse {
  events?: HealthEvent[];
  contextData?: ContextData[];
  dailySummary?: WeeklySummary;
}

// Utility types
export type MessageRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: MessageRole;
  content: string;
}

// OCR and Training Data types
export interface TrainingExample {
  text: string;
  entities: Array<{
    text: string;
    label: string;
    start: number;
    end: number;
  }>;
}

export interface OcrResult {
  text: string;
  confidence: number;
  entities?: Array<{
    text: string;
    label: string;
    confidence: number;
  }>;
}

// Oura API types
export interface OuraTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface OuraUserData {
  id: string;
  email: string;
  [key: string]: unknown;
}

export interface OuraSleepData {
  summary_date: string;
  period_id: number;
  is_longest: number;
  timezone: number;
  bedtime_start: string;
  bedtime_end: string;
  [key: string]: unknown;
}

export interface OuraActivityData {
  summary_date: string;
  day_start: string;
  day_end: string;
  [key: string]: unknown;
}

export interface OuraReadinessData {
  summary_date: string;
  period_id: number;
  score: number;
  score_previous_night: number;
  [key: string]: unknown;
}

export interface StructuredCardData {
  categories: {
    [categoryName: string]: {
      displayName: string;
      icon?: string;
      color?: string;
      metrics: Array<{
        id: string;
        metric_key: string;
        display_name: string;
        value: number | string | boolean;
        unit: string;
        source: string;
        confidence: number;
        is_editable: boolean;
      }>;
    };
  };
  journalEntries: Array<{
    id?: string;
    entry_type: string;
    content: string;
    category: string;
    created_at?: string;
  }>;
  date: string;
}

// ===== WORKOUT COMPANION TYPES =====

export interface Exercise {
  id: string;
  name: string;
  description?: string;
  category: 'strength' | 'cardio' | 'flexibility' | 'sports_specific';
  muscle_groups: string[];
  equipment_needed: string[];
  difficulty_level: number; // 1-5
  instructions: string[];
  tips: string[];
  variations: string[];
  created_at: string;
  updated_at: string;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  description?: string;
  category: 'strength' | 'cardio' | 'flexibility' | 'mixed';
  difficulty_level: number; // 1-5
  estimated_duration: number; // minutes
  equipment_required: string[];
  target_audience: 'beginner' | 'intermediate' | 'advanced' | 'recovery';
  exercises: TemplateExercise[];
  created_at: string;
  updated_at: string;
}

export interface TemplateExercise {
  id: string;
  template_id: string;
  exercise_id: string;
  exercise: Exercise;
  order_index: number;
  sets?: number;
  reps?: number;
  duration_seconds?: number;
  weight_kg?: number;
  rest_seconds?: number;
  notes?: string;
  created_at: string;
}

export interface UserWorkout {
  id: string;
  user_id: string;
  template_id?: string;
  template?: WorkoutTemplate;
  workout_date: string;
  workout_name: string;
  category: string;
  total_duration?: number; // minutes
  notes?: string;
  mood_before?: number; // 1-10
  mood_after?: number; // 1-10
  energy_before?: number; // 1-10
  energy_after?: number; // 1-10
  perceived_exertion?: number; // 1-10 (RPE)
  completion_status: 'completed' | 'partial' | 'skipped';
  exercises: WorkoutExercise[];
  created_at: string;
  updated_at: string;
}

export interface WorkoutExercise {
  id: string;
  workout_id: string;
  exercise_id: string;
  exercise: Exercise;
  order_index: number;
  sets_completed?: number;
  reps_completed?: number;
  duration_completed?: number; // seconds
  weight_used?: number;
  rest_taken?: number; // seconds
  notes?: string;
  difficulty_rating?: number; // 1-5
  created_at: string;
}

export interface UserWorkoutPreferences {
  id: string;
  user_id: string;
  fitness_level: 'beginner' | 'intermediate' | 'advanced';
  primary_goals: string[];
  available_equipment: string[];
  preferred_workout_duration?: number; // minutes
  preferred_workout_times: string[];
  workout_frequency?: number; // days per week
  injury_limitations: string[];
  exercise_preferences: string[];
  created_at: string;
  updated_at: string;
}

export interface WorkoutProgress {
  id: string;
  user_id: string;
  exercise_id: string;
  exercise: Exercise;
  metric_type: 'max_weight' | 'max_reps' | 'max_duration' | 'personal_record';
  metric_value: number;
  metric_unit?: string;
  achieved_date: string;
  workout_id?: string;
  notes?: string;
  created_at: string;
}

export interface WorkoutRecommendation {
  id: string;
  user_id: string;
  recommendation_date: string;
  recommendation_type: 'daily' | 'weekly' | 'adaptive';
  recommended_template_id?: string;
  recommended_template?: WorkoutTemplate;
  reasoning: string;
  health_context: Record<string, any>;
  priority_score: number; // 1-10
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

// Workout generation and analysis types
export interface WorkoutGenerationRequest {
  user_id: string;
  date: string;
  preferences?: Partial<UserWorkoutPreferences>;
  health_context?: HealthContext;
  workout_type?: 'strength' | 'cardio' | 'flexibility' | 'mixed';
  duration?: number; // minutes
  equipment_available?: string[];
  intensity_preference?: 'low' | 'moderate' | 'high';
}

export interface WorkoutGenerationResponse {
  success: boolean;
  workout?: WorkoutTemplate;
  reasoning: string;
  alternatives?: WorkoutTemplate[];
  health_considerations: string[];
  error?: string;
}

export interface WorkoutAnalysis {
  workout_id: string;
  user_id: string;
  analysis_date: string;
  performance_metrics: {
    total_volume?: number; // total weight lifted
    average_intensity?: number; // average RPE
    completion_rate?: number; // percentage of exercises completed
    time_efficiency?: number; // actual vs planned duration
  };
  progress_indicators: {
    strength_gains?: Array<{
      exercise_id: string;
      exercise_name: string;
      improvement: number; // percentage improvement
      time_period: string;
    }>;
    endurance_improvements?: Array<{
      exercise_id: string;
      exercise_name: string;
      improvement: number;
      time_period: string;
    }>;
  };
  recommendations: string[];
  patterns: string[];
  created_at: string;
}

// Workout conversation integration types
export interface WorkoutConversationContext {
  current_workout?: UserWorkout;
  recent_workouts: UserWorkout[];
  workout_preferences: UserWorkoutPreferences;
  health_metrics: HealthContext;
  workout_recommendations: WorkoutRecommendation[];
  progress_summary: {
    total_workouts: number;
    average_frequency: number; // workouts per week
    favorite_categories: string[];
    improvement_areas: string[];
  };
}

// OCR and document processing for workouts
export interface WorkoutOcrData {
  workout_name?: string;
  exercises: Array<{
    name: string;
    sets?: number;
    reps?: number;
    weight?: number;
    duration?: number;
    notes?: string;
  }>;
  total_duration?: number;
  date?: string;
  notes?: string;
}

export interface WorkoutDocumentData {
  file_type: 'workout_log' | 'training_plan' | 'exercise_guide';
  extracted_workouts: UserWorkout[];
  extracted_exercises: Exercise[];
  metadata: {
    source: string;
    confidence: number;
    processing_notes: string[];
  };
}
