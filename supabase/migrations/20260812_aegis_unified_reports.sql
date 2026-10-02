-- Supabase SQL Migration for Unified Aegis Medical Reports & Chat Intelligence
-- Run this script in your Supabase SQL Editor.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Ensure chat_sessions table exists and has user_id column
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL DEFAULT 'Untitled Session',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID DEFAULT auth.uid()
);

-- Add user_id column if chat_sessions already existed without it
ALTER TABLE public.chat_sessions 
ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid();

-- 2. Ensure chat_messages table exists and has metadata & user_id columns
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID DEFAULT auth.uid(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Add columns if chat_messages already existed without them
ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid();

ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 3. Create medical_reports table for uploaded patient reports
CREATE TABLE IF NOT EXISTS public.medical_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  user_id UUID DEFAULT auth.uid(),
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INT,
  report_type TEXT DEFAULT 'Medical Report',
  storage_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create report_analyses table for structured Gemini report extractions
CREATE TABLE IF NOT EXISTS public.report_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID REFERENCES public.medical_reports(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  user_id UUID DEFAULT auth.uid(),
  report_type TEXT,
  overall_summary TEXT,
  key_findings JSONB DEFAULT '[]'::jsonb,
  tests JSONB DEFAULT '[]'::jsonb,
  red_flags JSONB DEFAULT '[]'::jsonb,
  questions_for_doctor JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_analyses ENABLE ROW LEVEL SECURITY;

-- 6. Clean up old policies to prevent conflicts
DROP POLICY IF EXISTS "Users can manage their own sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can manage their own chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can manage their own medical reports" ON public.medical_reports;
DROP POLICY IF EXISTS "Users can manage their own report analyses" ON public.report_analyses;

-- 7. RLS Policies
CREATE POLICY "Users can manage their own sessions"
  ON public.chat_sessions FOR ALL
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can manage their own chat messages"
  ON public.chat_messages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_sessions s 
      WHERE s.id = chat_messages.session_id 
      AND (s.user_id = auth.uid() OR s.user_id IS NULL)
    )
  );

CREATE POLICY "Users can manage their own medical reports"
  ON public.medical_reports FOR ALL
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can manage their own report analyses"
  ON public.report_analyses FOR ALL
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 8. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON public.chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_medical_reports_session_id ON public.medical_reports(session_id);
CREATE INDEX IF NOT EXISTS idx_report_analyses_session_id ON public.report_analyses(session_id);

-- 9. Supabase Storage Bucket Setup
INSERT INTO storage.buckets (id, name, public)
VALUES ('medical_reports', 'medical_reports', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can upload report files" ON storage.objects;
DROP POLICY IF EXISTS "Users can read report files" ON storage.objects;

CREATE POLICY "Users can upload report files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'medical_reports' AND (auth.uid() = owner OR owner IS NULL));

CREATE POLICY "Users can read report files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'medical_reports' AND (auth.uid() = owner OR owner IS NULL));
