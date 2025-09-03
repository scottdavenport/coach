-- Coach App Database Schema
-- Updated to reflect the new structured metrics system

-- Users table
create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  profile jsonb default '{}' -- equipment, injuries, goals, preferences
);

-- Conversations (raw chat logs)
create table conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  message text, -- raw user/coach message
  message_type text check (message_type in ('text', 'image', 'system')),
  metadata jsonb default '{}', -- e.g. OCR result, sentiment, tags
  created_at timestamp with time zone default now()
);

-- Events (structured logs extracted from conversation/screenshot)
create table events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete set null,
  event_type text check (
    event_type in ('checkin','workout','biometric','meal','note','activity','social','work','travel','hobby','health','mood','energy','sleep','nutrition')
  ),
  data jsonb not null, -- flexible schema per event
  created_at timestamp with time zone default now()
);

-- User uploads (screenshots, documents)
create table user_uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  file_name text not null,
  file_url text not null,
  file_type text check (file_type in ('image', 'document', 'screenshot')),
  file_size integer,
  ocr_text text,
  processed_data jsonb,
  created_at timestamp with time zone default now(),
  processed_at timestamp with time zone
);

-- Oura Integration Tables
create table oura_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  access_token text not null,
  refresh_token text,
  token_expires_at timestamp with time zone,
  last_sync_at timestamp with time zone default now(),
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(user_id)
);

-- Oura raw data storage
create table oura_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  date date not null,
  data_type text not null check (data_type in ('sleep', 'activity', 'readiness', 'heartrate')),
  raw_data jsonb not null,
  created_at timestamp with time zone default now(),
  unique(user_id, date, data_type)
);

-- OCR Training Data
create table ocr_training_data (
  id uuid primary key default gen_random_uuid(),
  timestamp timestamp with time zone default now(),
  image_hash text not null,
  app_type text not null,
  screenshot_type text not null,
  original_ocr_text text not null,
  corrected_data jsonb,
  parsing_errors text[],
  confidence numeric,
  processing_time integer,
  image_dimensions jsonb,
  text_blocks_detected integer,
  language text default 'en',
  is_anonymized boolean default true,
  approved_for_training boolean default true,
  created_at timestamp with time zone default now()
);

-- OCR Feedback
create table ocr_feedback (
  id uuid primary key default gen_random_uuid(),
  message_id text not null,
  user_id uuid references auth.users(id) on delete cascade,
  feedback_type text check (feedback_type in ('parsing_error', 'missing_data', 'incorrect_value', 'suggestion')),
  description text not null,
  original_data jsonb,
  suggested_correction jsonb,
  timestamp timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

-- Weekly Summaries
create table weekly_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  week_start date not null,
  summary text,
  trends jsonb,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Monthly Trends
create table monthly_trends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  month_start date not null,
  sleep_patterns jsonb,
  energy_trends jsonb,
  workout_history jsonb,
  nutrition_patterns jsonb,
  stress_patterns jsonb,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Daily Journal
create table daily_journal (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  journal_date date not null,
  entry_type text check (entry_type in ('tip', 'note', 'goal', 'reflection', 'advice')),
  category text check (category in ('lifestyle', 'fitness', 'wellness', 'health')),
  content text not null,
  source text default 'conversation',
  confidence numeric default 0.8,
  is_editable boolean default true,
  is_deletable boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Daily Goals
create table daily_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  goal_date date not null,
  goal_type text check (goal_type in ('fitness', 'nutrition', 'sleep', 'wellness', 'lifestyle')),
  goal_title text not null,
  goal_description text,
  is_completed boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Daily Activities
create table daily_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  activity_date date not null,
  activity_type text check (activity_type in ('workout', 'walk', 'run', 'yoga', 'peloton', 'strength', 'cardio', 'sports', 'other')),
  status text default 'planned' check (status in ('planned', 'completed')),
  title text not null,
  description text,
  planned_data jsonb default '{}',
  completed_data jsonb default '{}',
  planned_activity_id uuid references daily_activities(id),
  source text default 'manual_entry',
  screenshot_url text,
  screenshot_metadata jsonb default '{}',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- NEW STRUCTURED METRICS SYSTEM

-- Core metric categories
create table metric_categories (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  display_name text not null,
  description text,
  icon text,
  color text,
  sort_order integer default 0,
  is_active boolean default true,
  created_at timestamp with time zone default now()
);

-- Standard metrics for each category
create table standard_metrics (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references metric_categories(id) on delete cascade,
  metric_key text not null,
  display_name text not null,
  description text,
  data_type text not null check (data_type in ('number', 'boolean', 'text', 'time')),
  unit text,
  min_value numeric,
  max_value numeric,
  default_value numeric,
  is_required boolean default false,
  sort_order integer default 0,
  created_at timestamp with time zone default now(),
  unique(category_id, metric_key)
);

-- User's daily metric values
create table user_daily_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  metric_id uuid references standard_metrics(id) on delete cascade,
  metric_date date not null,
  metric_value numeric,
  text_value text,
  boolean_value boolean,
  time_value time,
  source text not null, -- 'manual', 'oura', 'apple_health', 'conversation', 'ocr'
  confidence numeric default 1.0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(user_id, metric_id, metric_date)
);

-- User preferences for which metrics to show
create table user_metric_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  metric_id uuid references standard_metrics(id) on delete cascade,
  is_enabled boolean default true,
  display_order integer default 0,
  created_at timestamp with time zone default now(),
  unique(user_id, metric_id)
);

-- Conversation Insights (extracted from chat interactions)
create table conversation_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  conversation_date date not null,
  message text not null,
  insights text[] default '{}',
  data_types jsonb default '{}',
  follow_up_questions text[] default '{}',
  created_at timestamp with time zone default now()
);

-- Indexes for performance
create index idx_conversations_user_id on conversations(user_id);
create index idx_events_user_id on events(user_id);
create index idx_events_type on events(event_type);
create index idx_user_uploads_user_id on user_uploads(user_id);
create index idx_oura_integrations_user_id on oura_integrations(user_id);
create index idx_oura_data_user_id on oura_data(user_id);
create index idx_weekly_summaries_user_id on weekly_summaries(user_id);
create index idx_monthly_trends_user_id on monthly_trends(user_id);
create index idx_daily_journal_user_id on daily_journal(user_id);
create index idx_daily_goals_user_id on daily_goals(user_id);
create index idx_daily_activities_user_id on daily_activities(user_id);
create index idx_standard_metrics_category on standard_metrics(category_id);
create index idx_user_daily_metrics_user_date on user_daily_metrics(user_id, metric_date);
create index idx_user_daily_metrics_metric on user_daily_metrics(metric_id);
create index idx_user_metric_preferences_user on user_metric_preferences(user_id);
create index idx_conversation_insights_user_id on conversation_insights(user_id);
create index idx_conversation_insights_date on conversation_insights(conversation_date);

-- Row Level Security (RLS) setup
alter table users enable row level security;
alter table conversations enable row level security;
alter table events enable row level security;
alter table user_uploads enable row level security;
alter table oura_integrations enable row level security;
alter table oura_data enable row level security;
alter table ocr_training_data enable row level security;
alter table ocr_feedback enable row level security;
alter table weekly_summaries enable row level security;
alter table monthly_trends enable row level security;
alter table daily_journal enable row level security;
alter table daily_goals enable row level security;
alter table daily_activities enable row level security;
alter table metric_categories enable row level security;
alter table standard_metrics enable row level security;
alter table user_daily_metrics enable row level security;
alter table user_metric_preferences enable row level security;
alter table conversation_insights enable row level security;

-- RLS Policies
create policy "Users can view own data" on users for select using (id = auth.uid());
create policy "Users can manage own conversations" on conversations for all using (user_id = auth.uid());
create policy "Users can manage own events" on events for all using (user_id = auth.uid());
create policy "Users can manage own uploads" on user_uploads for all using (user_id = auth.uid());
create policy "Users can manage own oura integrations" on oura_integrations for all using (user_id = auth.uid());
create policy "Users can manage own oura data" on oura_data for all using (user_id = auth.uid());
create policy "Users can manage own ocr feedback" on ocr_feedback for all using (user_id = auth.uid());
create policy "Users can manage own weekly summaries" on weekly_summaries for all using (user_id = auth.uid());
create policy "Users can manage own monthly trends" on monthly_trends for all using (user_id = auth.uid());
create policy "Users can manage own daily journal" on daily_journal for all using (user_id = auth.uid());
create policy "Users can manage own daily goals" on daily_goals for all using (user_id = auth.uid());
create policy "Users can manage own daily activities" on daily_activities for all using (user_id = auth.uid());

-- Public read access for metric categories and standard metrics
create policy "Allow read access to metric categories" on metric_categories for select using (true);
create policy "Allow read access to standard metrics" on standard_metrics for select using (true);

-- User-specific policies for structured metrics
create policy "Users can manage own daily metrics" on user_daily_metrics for all using (user_id = auth.uid());
create policy "Users can manage own metric preferences" on user_metric_preferences for all using (user_id = auth.uid());
create policy "Users can manage own conversation insights" on conversation_insights for all using (user_id = auth.uid());
