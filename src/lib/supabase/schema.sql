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
    event_type in ('checkin','workout','biometric','meal','note')
  ),
  data jsonb not null, -- flexible schema per event
  created_at timestamp with time zone default now()
);

-- Daily Log Cards (aggregated view per day)
create table daily_log_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  log_date date not null,
  summary jsonb default '{}', -- aggregated daily summary (sleep, mood, readiness, etc.)
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(user_id, log_date)
);

-- Indexes for performance
create index idx_conversations_user_id on conversations(user_id);
create index idx_events_user_id on events(user_id);
create index idx_events_type on events(event_type);
create index idx_daily_log_cards_user_date on daily_log_cards(user_id, log_date);

-- Oura Integration Tables
create table oura_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
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
  user_id uuid references users(id) on delete cascade,
  date date not null,
  data_type text not null check (data_type in ('sleep', 'activity', 'readiness', 'heartrate')),
  raw_data jsonb not null,
  created_at timestamp with time zone default now(),
  unique(user_id, date, data_type)
);

-- Row Level Security (RLS) setup
alter table users enable row level security;
alter table conversations enable row level security;
alter table events enable row level security;
alter table daily_log_cards enable row level security;
alter table oura_integrations enable row level security;
alter table oura_data enable row level security;

-- Example RLS policy: user can only access their own rows
create policy "Users can view own data"
on users for select
using (id = auth.uid());

create policy "Users can manage own conversations"
on conversations for all
using (user_id = auth.uid());

create policy "Users can manage own events"
on events for all
using (user_id = auth.uid());

create policy "Users can manage own daily log cards"
on daily_log_cards for all
using (user_id = auth.uid());

create policy "Users can manage own oura integrations"
on oura_integrations for all
using (user_id = auth.uid());

create policy "Users can manage own oura data"
on oura_data for all
using (user_id = auth.uid());

-- OCR Training Data Collection Tables
CREATE TABLE ocr_training_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Global training data (no personal info)
  image_hash TEXT NOT NULL,
  app_type TEXT NOT NULL,
  screenshot_type TEXT NOT NULL,
  original_ocr_text TEXT NOT NULL,
  corrected_data JSONB,
  parsing_errors TEXT[],
  confidence DECIMAL(5,2),
  processing_time INTEGER,
  
  -- Metadata
  image_dimensions JSONB,
  text_blocks_detected INTEGER,
  language TEXT DEFAULT 'en',
  
  -- Training flags
  is_anonymized BOOLEAN DEFAULT true,
  approved_for_training BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE ocr_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('parsing_error', 'missing_data', 'incorrect_value', 'suggestion')),
  description TEXT NOT NULL,
  original_data JSONB,
  suggested_correction JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS policies for OCR training data
ALTER TABLE ocr_training_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocr_feedback ENABLE ROW LEVEL SECURITY;

-- OCR training data is global (no user-specific access needed)
CREATE POLICY "Allow read access to OCR training data"
ON ocr_training_data FOR SELECT
USING (true);

CREATE POLICY "Allow insert access to OCR training data"
ON ocr_training_data FOR INSERT
WITH CHECK (true);

-- OCR feedback is user-specific
CREATE POLICY "Users can manage own OCR feedback"
ON ocr_feedback FOR ALL
USING (user_id = auth.uid());
