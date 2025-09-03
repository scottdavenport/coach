// Core types for the application

export interface User {
  id: string;
  email?: string;
  profile?: UserProfile;
}

export interface UserProfile {
  trend_preferences?: TrendPreferences;
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

export interface ParsedConversation {
  events: Array<{
    event_type: string;
    data: Record<string, unknown>;
    confidence: number;
    should_store: boolean;
  }>;
  context_data: Array<{
    category: string;
    key: string;
    value: unknown;
    confidence: number;
    should_store: boolean;
    source: string;
    needsClarification: boolean;
  }>;
  daily_summary: {
    sleep_hours?: number;
    sleep_quality?: number;
    mood?: number;
    energy?: number;
    stress?: number;
    readiness?: number;
  };
  should_update_card: boolean;
  clarification_needed: boolean;
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
