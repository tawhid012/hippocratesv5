-- ============================================================
-- SUPABASE MIGRATION — HIPPOCRATES CONVERSATION PERSISTENCE
-- ============================================================
-- Fully idempotent migration to support persistent conversations,
-- message history, attachments, model attribution, and RLS security.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------
-- 1. CONVERSATIONS / CHAT_SESSIONS TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID DEFAULT auth.uid(),
  title TEXT NOT NULL DEFAULT 'Untitled Session',
  workspace_type TEXT NOT NULL DEFAULT 'oracle',
  model TEXT NOT NULL DEFAULT 'oracle-core',
  persona TEXT NOT NULL DEFAULT 'doctor',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  elevenlabs_conversation_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Ensure all required columns exist on chat_sessions (idempotent alterations)
ALTER TABLE public.chat_sessions ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid();
ALTER TABLE public.chat_sessions ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT 'Untitled Session';
ALTER TABLE public.chat_sessions ADD COLUMN IF NOT EXISTS workspace_type TEXT NOT NULL DEFAULT 'oracle';
ALTER TABLE public.chat_sessions ADD COLUMN IF NOT EXISTS model TEXT NOT NULL DEFAULT 'oracle-core';
ALTER TABLE public.chat_sessions ADD COLUMN IF NOT EXISTS persona TEXT NOT NULL DEFAULT 'doctor';
ALTER TABLE public.chat_sessions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.chat_sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.chat_sessions ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.chat_sessions ADD COLUMN IF NOT EXISTS elevenlabs_conversation_id TEXT;
ALTER TABLE public.chat_sessions ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- ------------------------------------------------------------
-- 2. MESSAGES / CHAT_MESSAGES TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  user_id UUID DEFAULT auth.uid(),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'streaming', 'completed', 'error')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Ensure all required columns exist on chat_messages (idempotent alterations)
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid();
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'completed';
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ------------------------------------------------------------
-- 3. ATTACHMENTS TABLE (Metadata and References only)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id UUID DEFAULT auth.uid(),
  storage_path TEXT,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Ensure columns exist
ALTER TABLE public.attachments ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid();
ALTER TABLE public.attachments ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- ------------------------------------------------------------
-- 4. MEDICAL REPORTS & REPORT ANALYSES TABLES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.medical_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

CREATE TABLE IF NOT EXISTS public.report_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- ------------------------------------------------------------
-- 5. UPDATED_AT & LAST_MESSAGE_AT TRIGGERS
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_chat_sessions_updated_at ON public.chat_sessions;
CREATE TRIGGER trg_chat_sessions_updated_at
BEFORE UPDATE ON public.chat_sessions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_chat_messages_updated_at ON public.chat_messages;
CREATE TRIGGER trg_chat_messages_updated_at
BEFORE UPDATE ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.sync_session_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.chat_sessions
  SET 
    last_message_at = NEW.created_at,
    updated_at = NOW()
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_session_last_message ON public.chat_messages;
CREATE TRIGGER trg_sync_session_last_message
AFTER INSERT ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public.sync_session_last_message();

-- ------------------------------------------------------------
-- 6. PERFORMANCE INDEXES
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON public.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated_at ON public.chat_sessions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_last_message_at ON public.chat_sessions(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_workspace ON public.chat_sessions(workspace_type, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_model ON public.chat_sessions(model);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON public.chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON public.chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(session_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_attachments_session_id ON public.attachments(session_id);
CREATE INDEX IF NOT EXISTS idx_attachments_message_id ON public.attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_attachments_user_id ON public.attachments(user_id);
CREATE INDEX IF NOT EXISTS idx_medical_reports_session_id ON public.medical_reports(session_id);
CREATE INDEX IF NOT EXISTS idx_report_analyses_session_id ON public.report_analyses(session_id);

-- ------------------------------------------------------------
-- 7. ROW LEVEL SECURITY (RLS) & POLICIES
-- ------------------------------------------------------------
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_analyses ENABLE ROW LEVEL SECURITY;

-- Clean existing policies for idempotency
DROP POLICY IF EXISTS "Users can manage their own sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can manage their own chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can manage their own attachments" ON public.attachments;
DROP POLICY IF EXISTS "Users can manage their own medical reports" ON public.medical_reports;
DROP POLICY IF EXISTS "Users can manage their own report analyses" ON public.report_analyses;

-- chat_sessions policy
CREATE POLICY "Users can manage their own sessions"
  ON public.chat_sessions FOR ALL
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- chat_messages policy
CREATE POLICY "Users can manage their own chat messages"
  ON public.chat_messages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_sessions s 
      WHERE s.id = chat_messages.session_id 
      AND (s.user_id = auth.uid() OR s.user_id IS NULL)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_sessions s 
      WHERE s.id = chat_messages.session_id 
      AND (s.user_id = auth.uid() OR s.user_id IS NULL)
    )
  );

-- attachments policy
CREATE POLICY "Users can manage their own attachments"
  ON public.attachments FOR ALL
  USING (
    auth.uid() = user_id OR user_id IS NULL OR
    EXISTS (
      SELECT 1 FROM public.chat_sessions s 
      WHERE s.id = attachments.session_id 
      AND (s.user_id = auth.uid() OR s.user_id IS NULL)
    )
  )
  WITH CHECK (
    auth.uid() = user_id OR user_id IS NULL OR
    EXISTS (
      SELECT 1 FROM public.chat_sessions s 
      WHERE s.id = attachments.session_id 
      AND (s.user_id = auth.uid() OR s.user_id IS NULL)
    )
  );

-- medical_reports policy
CREATE POLICY "Users can manage their own medical reports"
  ON public.medical_reports FOR ALL
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- report_analyses policy
CREATE POLICY "Users can manage their own report analyses"
  ON public.report_analyses FOR ALL
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- ------------------------------------------------------------
-- 8. STORAGE BUCKET CONFIGURATION (Medical Reports)
-- ------------------------------------------------------------
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
