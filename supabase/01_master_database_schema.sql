-- ==============================================================================
-- HRHUB APP: MASTER DATABASE SCHEMA REPLICATION SCRIPT
-- ==============================================================================
-- I-run ang buong script na ito sa:
-- Supabase Dashboard -> SQL Editor -> New Query -> Run
--
-- Sakop ng script na ito ang:
-- 1. Extensions (pgcrypto, uuid-ossp)
-- 2. Tables:
--    - public.employees (Pre-registered staff directory)
--    - public.profiles (Auth & directory sync)
--    - public.user_settings (Memo generator settings & company configs)
--    - public.saved_memos (Official memorandums archive)
--    - public.incident_reports (HR Incident reports & NTE workflow)
--    - public.agent_requirements (Uploaded 201 file requirements & OCR metadata)
--    - public.chat_messages (In-app real-time messaging)
--    - public.memos (General noticeboard & announcements)
-- 3. Row Level Security (RLS) policies para sa bawat table
-- 4. Storage Buckets (requirements, nte-proofs, chat-attachments) at Storage RLS Policies
-- ==============================================================================

-- Siguraduhing active ang required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. TABLE: public.employees
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.employees (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    company TEXT DEFAULT 'Simpal Group of Companies',
    role TEXT DEFAULT 'Team Member',
    is_approved BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow select on employees" ON public.employees;
    DROP POLICY IF EXISTS "Allow all on employees" ON public.employees;
    DROP POLICY IF EXISTS "Allow insert on employees" ON public.employees;
    DROP POLICY IF EXISTS "Allow update on employees" ON public.employees;
    DROP POLICY IF EXISTS "Allow delete on employees" ON public.employees;

    CREATE POLICY "Allow select on employees" ON public.employees FOR SELECT USING (true);
    CREATE POLICY "Allow insert on employees" ON public.employees FOR INSERT WITH CHECK (true);
    CREATE POLICY "Allow update on employees" ON public.employees FOR UPDATE USING (true) WITH CHECK (true);
    CREATE POLICY "Allow delete on employees" ON public.employees FOR DELETE USING (true);
END $$;

-- ------------------------------------------------------------------------------
-- 2. TABLE: public.profiles
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE,
    name TEXT,
    company TEXT DEFAULT 'Simpal Group of Companies',
    role TEXT DEFAULT 'Team Member',
    is_approved BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company TEXT DEFAULT 'Simpal Group of Companies';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'Team Member';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT TRUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());

-- Crucial: Tanggalin ang foreign key constraint sa auth.users para hindi ma-block
-- ang activation kapag nag-i-insert o nag-u-update ng pre-registered personnel
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_email_unique') THEN
        BEGIN
            ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_unique UNIQUE (email);
        EXCEPTION
            WHEN duplicate_table THEN NULL;
            WHEN others THEN NULL;
        END;
    END IF;
END $$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow select on profiles" ON public.profiles;
    DROP POLICY IF EXISTS "Allow insert on profiles" ON public.profiles;
    DROP POLICY IF EXISTS "Allow update on profiles" ON public.profiles;
    DROP POLICY IF EXISTS "Allow delete on profiles" ON public.profiles;

    CREATE POLICY "Allow select on profiles" ON public.profiles FOR SELECT USING (true);
    CREATE POLICY "Allow insert on profiles" ON public.profiles FOR INSERT WITH CHECK (true);
    CREATE POLICY "Allow update on profiles" ON public.profiles FOR UPDATE USING (true) WITH CHECK (true);
    CREATE POLICY "Allow delete on profiles" ON public.profiles FOR DELETE USING (true);
END $$;

-- ------------------------------------------------------------------------------
-- 3. TABLE: public.user_settings
-- ------------------------------------------------------------------------------
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
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow select on user_settings" ON public.user_settings;
    DROP POLICY IF EXISTS "Allow all on user_settings" ON public.user_settings;
    DROP POLICY IF EXISTS "Allow insert on user_settings" ON public.user_settings;
    DROP POLICY IF EXISTS "Allow update on user_settings" ON public.user_settings;
    DROP POLICY IF EXISTS "Allow delete on user_settings" ON public.user_settings;

    CREATE POLICY "Allow select on user_settings" ON public.user_settings FOR SELECT USING (true);
    CREATE POLICY "Allow insert on user_settings" ON public.user_settings FOR INSERT WITH CHECK (true);
    CREATE POLICY "Allow update on user_settings" ON public.user_settings FOR UPDATE USING (true) WITH CHECK (true);
    CREATE POLICY "Allow delete on user_settings" ON public.user_settings FOR DELETE USING (true);
END $$;

-- ------------------------------------------------------------------------------
-- 4. TABLE: public.saved_memos
-- ------------------------------------------------------------------------------
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

ALTER TABLE public.saved_memos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow select on saved_memos" ON public.saved_memos;
    DROP POLICY IF EXISTS "Allow all on saved_memos" ON public.saved_memos;
    DROP POLICY IF EXISTS "Allow insert on saved_memos" ON public.saved_memos;
    DROP POLICY IF EXISTS "Allow update on saved_memos" ON public.saved_memos;
    DROP POLICY IF EXISTS "Allow delete on saved_memos" ON public.saved_memos;

    CREATE POLICY "Allow select on saved_memos" ON public.saved_memos FOR SELECT USING (true);
    CREATE POLICY "Allow insert on saved_memos" ON public.saved_memos FOR INSERT WITH CHECK (true);
    CREATE POLICY "Allow update on saved_memos" ON public.saved_memos FOR UPDATE USING (true) WITH CHECK (true);
    CREATE POLICY "Allow delete on saved_memos" ON public.saved_memos FOR DELETE USING (true);
END $$;

-- ------------------------------------------------------------------------------
-- 5. TABLE: public.incident_reports
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.incident_reports (
    id TEXT PRIMARY KEY,
    case_number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'SUBMITTED_TO_CENTRAL_HR',
    date_of_incident DATE,
    date_reported DATE,
    reporting_hr_name TEXT,
    reporting_hr_title TEXT,
    receiver_hr_name TEXT,
    receiver_hr_title TEXT,
    employee_name TEXT NOT NULL,
    employee_position TEXT,
    company TEXT DEFAULT '5A Royal Gaming OPC',
    sender_company TEXT,
    receiver_company TEXT,
    branch TEXT,
    incident_category TEXT,
    cash_shortage_amount TEXT,
    specific_findings TEXT,
    full_incident_narrative TEXT,
    nte_number TEXT,
    nte_date DATE,
    nte_subject TEXT DEFAULT 'Notice to Explain',
    nte_body TEXT,
    activity_log JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow authenticated read incident_reports" ON public.incident_reports;
    DROP POLICY IF EXISTS "Allow authenticated insert incident_reports" ON public.incident_reports;
    DROP POLICY IF EXISTS "Allow authenticated update incident_reports" ON public.incident_reports;
    DROP POLICY IF EXISTS "Allow authenticated delete incident_reports" ON public.incident_reports;

    CREATE POLICY "Allow authenticated read incident_reports" ON public.incident_reports FOR SELECT USING (true);
    CREATE POLICY "Allow authenticated insert incident_reports" ON public.incident_reports FOR INSERT WITH CHECK (true);
    CREATE POLICY "Allow authenticated update incident_reports" ON public.incident_reports FOR UPDATE USING (true) WITH CHECK (true);
    CREATE POLICY "Allow authenticated delete incident_reports" ON public.incident_reports FOR DELETE USING (true);
END $$;

-- ------------------------------------------------------------------------------
-- 6. TABLE: public.agent_requirements (201 Files & Requirement Attachments)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agent_requirements (
    id TEXT PRIMARY KEY,
    agent_key TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size NUMERIC,
    file_type TEXT,
    storage_path TEXT,
    data_url TEXT,
    category_key TEXT,
    sub_order NUMERIC,
    sort_order NUMERIC,
    classified_type TEXT,
    ocr_snippet JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_req_agent_key ON public.agent_requirements (agent_key);

ALTER TABLE public.agent_requirements ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow select on agent_requirements" ON public.agent_requirements;
    DROP POLICY IF EXISTS "Allow insert on agent_requirements" ON public.agent_requirements;
    DROP POLICY IF EXISTS "Allow update on agent_requirements" ON public.agent_requirements;
    DROP POLICY IF EXISTS "Allow delete on agent_requirements" ON public.agent_requirements;

    CREATE POLICY "Allow select on agent_requirements" ON public.agent_requirements FOR SELECT USING (true);
    CREATE POLICY "Allow insert on agent_requirements" ON public.agent_requirements FOR INSERT WITH CHECK (true);
    CREATE POLICY "Allow update on agent_requirements" ON public.agent_requirements FOR UPDATE USING (true) WITH CHECK (true);
    CREATE POLICY "Allow delete on agent_requirements" ON public.agent_requirements FOR DELETE USING (true);
END $$;

-- ------------------------------------------------------------------------------
-- 7. TABLE: public.chat_messages (In-App Messaging & Notifications)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id TEXT PRIMARY KEY,
    sender_email TEXT NOT NULL,
    sender_name TEXT DEFAULT 'Team Member',
    receiver_email TEXT NOT NULL,
    content TEXT DEFAULT '',
    image_url TEXT,
    reply_to JSONB,
    reactions JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_sender ON public.chat_messages (sender_email);
CREATE INDEX IF NOT EXISTS idx_chat_receiver ON public.chat_messages (receiver_email);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow select on chat_messages" ON public.chat_messages;
    DROP POLICY IF EXISTS "Allow insert on chat_messages" ON public.chat_messages;
    DROP POLICY IF EXISTS "Allow update on chat_messages" ON public.chat_messages;
    DROP POLICY IF EXISTS "Allow delete on chat_messages" ON public.chat_messages;

    CREATE POLICY "Allow select on chat_messages" ON public.chat_messages FOR SELECT USING (true);
    CREATE POLICY "Allow insert on chat_messages" ON public.chat_messages FOR INSERT WITH CHECK (true);
    CREATE POLICY "Allow update on chat_messages" ON public.chat_messages FOR UPDATE USING (true) WITH CHECK (true);
    CREATE POLICY "Allow delete on chat_messages" ON public.chat_messages FOR DELETE USING (true);
END $$;

-- ------------------------------------------------------------------------------
-- 8. TABLE: public.memos (Noticeboard Feed)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.memos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT,
    category TEXT DEFAULT 'Announcement',
    author_name TEXT DEFAULT 'HRMD Admin',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.memos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow select on memos" ON public.memos;
    DROP POLICY IF EXISTS "Allow insert on memos" ON public.memos;
    DROP POLICY IF EXISTS "Allow update on memos" ON public.memos;
    DROP POLICY IF EXISTS "Allow delete on memos" ON public.memos;

    CREATE POLICY "Allow select on memos" ON public.memos FOR SELECT USING (true);
    CREATE POLICY "Allow insert on memos" ON public.memos FOR INSERT WITH CHECK (true);
    CREATE POLICY "Allow update on memos" ON public.memos FOR UPDATE USING (true) WITH CHECK (true);
    CREATE POLICY "Allow delete on memos" ON public.memos FOR DELETE USING (true);
END $$;

-- ------------------------------------------------------------------------------
-- 9. STORAGE BUCKETS SETUP & STORAGE RLS POLICIES
-- ------------------------------------------------------------------------------
-- Siguraduhin na exist ang storage buckets:
-- 1. requirements (para sa 201 files at IDs)
-- 2. nte-proofs (para sa NTE incident report proofs)
-- 3. chat-attachments (para sa mga larawan o dokumento sa chat)

INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('requirements', 'requirements', true),
    ('nte-proofs', 'nte-proofs', true),
    ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage Objects RLS Policies
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public Access - Read" ON storage.objects;
    DROP POLICY IF EXISTS "Public Access - Insert" ON storage.objects;
    DROP POLICY IF EXISTS "Public Access - Update" ON storage.objects;
    DROP POLICY IF EXISTS "Public Access - Delete" ON storage.objects;

    CREATE POLICY "Public Access - Read" ON storage.objects
        FOR SELECT USING (bucket_id IN ('requirements', 'nte-proofs', 'chat-attachments'));

    CREATE POLICY "Public Access - Insert" ON storage.objects
        FOR INSERT WITH CHECK (bucket_id IN ('requirements', 'nte-proofs', 'chat-attachments'));

    CREATE POLICY "Public Access - Update" ON storage.objects
        FOR UPDATE USING (bucket_id IN ('requirements', 'nte-proofs', 'chat-attachments'));

    CREATE POLICY "Public Access - Delete" ON storage.objects
        FOR DELETE USING (bucket_id IN ('requirements', 'nte-proofs', 'chat-attachments'));
END $$;
