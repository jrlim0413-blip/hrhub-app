-- ==============================================================================
-- DEDICATED SUPABASE TABLES FOR MEMORANDUM GENERATOR
-- Eliminates localStorage: stores all default settings and saved memos per user account
-- Run this in the Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. TABLE: user_settings (Per-User Account Default Settings & Preferences)
CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id TEXT PRIMARY KEY,
    directives_font_family TEXT DEFAULT 'Arial, Helvetica, sans-serif',
    directives_font_size NUMERIC DEFAULT 13.3,
    signatory_layout TEXT DEFAULT 'dual',
    signatory_name TEXT DEFAULT 'JEVINCE JAYE S. JUBAY, CHRP',
    signatory_title TEXT DEFAULT 'HRMD Manager',
    signatory_label TEXT DEFAULT 'ISSUED BY:',
    signatory_size INTEGER DEFAULT 52,
    signatory_offset_x INTEGER DEFAULT 0,
    signatory_offset_y INTEGER DEFAULT 0,
    signatory_signature TEXT,
    approver_name TEXT DEFAULT 'CHARMIE JEAN M. SIMPAL',
    approver_title TEXT DEFAULT 'President & CEO',
    approver_label TEXT DEFAULT 'NOTED & APPROVED BY:',
    approver_size INTEGER DEFAULT 52,
    approver_offset_x INTEGER DEFAULT 0,
    approver_offset_y INTEGER DEFAULT 0,
    approver_signature TEXT,
    watermark_size INTEGER DEFAULT 380,
    watermark_opacity INTEGER DEFAULT 18,
    show_diagonal_stamp BOOLEAN DEFAULT FALSE,
    diagonal_stamp_text TEXT DEFAULT 'OFFICIAL MEMORANDUM',
    memo_to_default TEXT DEFAULT 'HR ON-SITE, CIC, AND FIELD MONITORING',
    memo_from_default TEXT DEFAULT 'HUMAN RESOURCES DEPARTMENT',
    memo_subject_default TEXT DEFAULT 'IMMEDIATE RESPONSE AND COMMUNICATION ACCESSIBILITY',
    email_webhook_url TEXT DEFAULT '',
    included_company_ids JSONB DEFAULT '["lucky_betplay", "sgc", "simcon", "5a_royal", "imperial_gaming", "glowing_fortune"]'::jsonb,
    letterhead_defaults JSONB DEFAULT '{}'::jsonb,
    active_draft JSONB,
    settings_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Comments for user_settings
COMMENT ON TABLE public.user_settings IS 'Dedicated table for user account default settings in HrHub Memo Generator';
COMMENT ON COLUMN public.user_settings.user_id IS 'Unique user account identifier (email or user UUID)';
COMMENT ON COLUMN public.user_settings.letterhead_defaults IS 'Custom company letterhead overrides saved as JSON';
COMMENT ON COLUMN public.user_settings.settings_json IS 'Complete structured settings JSON payload';

-- Enable RLS on user_settings
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- 2. TABLE: saved_memos (Official Saved Memorandums Archive per User Account)
CREATE TABLE IF NOT EXISTS public.saved_memos (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    ref_no TEXT NOT NULL,
    date TEXT NOT NULL,
    to_field TEXT NOT NULL,
    from_field TEXT NOT NULL,
    subject TEXT NOT NULL,
    category TEXT DEFAULT 'General Policy',
    company_id TEXT DEFAULT 'lucky_betplay',
    content TEXT,
    directives_font_family TEXT DEFAULT 'Arial, Helvetica, sans-serif',
    directives_font_size NUMERIC DEFAULT 13.3,
    signatory_layout TEXT DEFAULT 'dual',
    signatory_name TEXT,
    signatory_title TEXT,
    approver_name TEXT,
    approver_title TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Comments for saved_memos
COMMENT ON TABLE public.saved_memos IS 'Dedicated archive of saved official memorandums per user account';
COMMENT ON COLUMN public.saved_memos.user_id IS 'Account key/email of the user who saved the memo';
COMMENT ON COLUMN public.saved_memos.metadata IS 'Full snapshot of company letterheads, e-signatures, and distribution';

-- Enable RLS on saved_memos
ALTER TABLE public.saved_memos ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies: Allow read & write access
DO $$
BEGIN
    -- user_settings policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_settings' AND policyname = 'Allow select on user_settings') THEN
        CREATE POLICY "Allow select on user_settings" ON public.user_settings FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_settings' AND policyname = 'Allow all on user_settings') THEN
        CREATE POLICY "Allow all on user_settings" ON public.user_settings FOR ALL USING (true) WITH CHECK (true);
    END IF;

    -- saved_memos policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'saved_memos' AND policyname = 'Allow select on saved_memos') THEN
        CREATE POLICY "Allow select on saved_memos" ON public.saved_memos FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'saved_memos' AND policyname = 'Allow all on saved_memos') THEN
        CREATE POLICY "Allow all on saved_memos" ON public.saved_memos FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
