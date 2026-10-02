-- ============================================================
-- SUPABASE MIGRATION: CLINICAL DOCUMENTS & SUMMARIES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.clinical_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.chat_sessions(id) ON DELETE SET NULL,
  user_id UUID DEFAULT auth.uid(),
  model TEXT NOT NULL DEFAULT 'Aegis Core', -- 'Aegis Core' | 'Aegis Pro' | 'Aegis Hybrid'
  document_type TEXT NOT NULL DEFAULT 'AI_CLINICAL_SUMMARY',
  document_status TEXT NOT NULL DEFAULT 'AI GENERATED', -- 'AI GENERATED' | 'CLINICIAN REVIEWED'
  elevenlabs_conversation_id TEXT,
  structured_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  storage_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Upgrade columns if table pre-existed
ALTER TABLE public.clinical_documents
  ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid(),
  ADD COLUMN IF NOT EXISTS model TEXT NOT NULL DEFAULT 'Aegis Core',
  ADD COLUMN IF NOT EXISTS document_type TEXT NOT NULL DEFAULT 'AI_CLINICAL_SUMMARY',
  ADD COLUMN IF NOT EXISTS document_status TEXT NOT NULL DEFAULT 'AI GENERATED',
  ADD COLUMN IF NOT EXISTS elevenlabs_conversation_id TEXT,
  ADD COLUMN IF NOT EXISTS structured_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_clinical_docs_user_id ON public.clinical_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_clinical_docs_session_id ON public.clinical_documents(session_id);
CREATE INDEX IF NOT EXISTS idx_clinical_docs_created_at ON public.clinical_documents(created_at DESC);

-- Enable RLS
ALTER TABLE public.clinical_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can manage their own clinical documents" ON public.clinical_documents;
CREATE POLICY "Users can manage their own clinical documents"
  ON public.clinical_documents FOR ALL
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
