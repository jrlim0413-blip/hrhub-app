-- ==============================================================================
-- HRHUB APP: COMPLETE MASTER DATABASE SCHEMA & MIGRATION SCRIPT
-- ==============================================================================
-- I-copy at i-run ang buong script na ito sa inyong:
-- Supabase Dashboard -> SQL Editor -> New Query -> Run
--
-- Sakop ng script na ito ang:
-- 1. Table: public.employees (Pre-registered staff directory & activation status)
-- 2. Table: public.profiles (Supabase auth & employee directory sync + Fix FK blocker)
-- 3. Table: public.user_settings (Account settings, backup storage, at credentials fallback)
-- 4. Table: public.saved_memos (Official memorandums archive)
-- 5. Row Level Security (RLS) policies para sa instant reading at updating
-- 6. Initial pre-registered accounts (Remark Joy Gaviola, HRMD Admin, etc.)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. EMPLOYEES TABLE (Directory at Activation Management)
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
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'employees' AND policyname = 'Allow select on employees') THEN
        CREATE POLICY "Allow select on employees" ON public.employees FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'employees' AND policyname = 'Allow all on employees') THEN
        CREATE POLICY "Allow all on employees" ON public.employees FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. PROFILES TABLE (Sync at Fix sa Foreign Key)
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

-- Siguraduhing may name, company, role, at is_approved columns ang profiles table
-- (kung dati nang ginawa ang table nang wala ang mga kolum na ito)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company TEXT DEFAULT 'Simpal Group of Companies';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'Team Member';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT TRUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());

-- Crucial: Tanggalin ang foreign key constraint sa auth.users para hindi ma-block
-- ang activation kapag nag-i-insert o nag-u-update ng pre-registered personnel
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Siguraduhing may unique constraint ang email para sa ON CONFLICT
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
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Allow select on profiles') THEN
        CREATE POLICY "Allow select on profiles" ON public.profiles FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Allow insert on profiles') THEN
        CREATE POLICY "Allow insert on profiles" ON public.profiles FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Allow update on profiles') THEN
        CREATE POLICY "Allow update on profiles" ON public.profiles FOR UPDATE USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Allow delete on profiles') THEN
        CREATE POLICY "Allow delete on profiles" ON public.profiles FOR DELETE USING (true);
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 3. USER SETTINGS TABLE (Memo Preferences, Letterheads, & Backup Fallback)
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
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_settings' AND policyname = 'Allow select on user_settings') THEN
        CREATE POLICY "Allow select on user_settings" ON public.user_settings FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_settings' AND policyname = 'Allow all on user_settings') THEN
        CREATE POLICY "Allow all on user_settings" ON public.user_settings FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 4. SAVED MEMOS TABLE (Official Memorandums Archive)
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
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'saved_memos' AND policyname = 'Allow select on saved_memos') THEN
        CREATE POLICY "Allow select on saved_memos" ON public.saved_memos FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'saved_memos' AND policyname = 'Allow all on saved_memos') THEN
        CREATE POLICY "Allow all on saved_memos" ON public.saved_memos FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 5. PRE-SEED INITIAL ACCOUNTS (Guarantees instant activation and access)
-- ------------------------------------------------------------------------------
INSERT INTO public.employees (id, email, name, company, role, is_approved)
VALUES
    (
        'emp-remark-joy',
        'remarkjoymark@gmail.com',
        'Remark Joy Gaviola',
        'Lucky Betplay Corporation',
        'Team Member',
        TRUE
    ),
    (
        'e159a891-36ad-444c-b7d1-a991a2e0a8a7',
        'caquennie6@gmail.com',
        'Caquennie6',
        'Simpal Group of Companies',
        'Team Member',
        TRUE
    ),
    (
        '43eb7f87-a4e5-4e38-8c00-dcbdabd7b66b',
        'efilfonimda@gmail.com',
        'Efilfonimda',
        'Simpal Group of Companies',
        'Team Member',
        TRUE
    ),
    (
        'admin-hrmd-master',
        'admin@hrhub.com',
        'H R M D',
        'Simpal Group of Companies',
        'HR Administrator',
        TRUE
    )
ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    company = EXCLUDED.company,
    role = EXCLUDED.role,
    is_approved = EXCLUDED.is_approved,
    updated_at = TIMEZONE('utc'::text, NOW());

-- Pre-seed din sa profiles table para synchronised ang listahan
INSERT INTO public.profiles (id, email, name, company, role, is_approved)
VALUES
    (gen_random_uuid(), 'remarkjoymark@gmail.com', 'Remark Joy Gaviola', 'Lucky Betplay Corporation', 'Team Member', TRUE),
    (gen_random_uuid(), 'caquennie6@gmail.com', 'Caquennie6', 'Simpal Group of Companies', 'Team Member', TRUE),
    (gen_random_uuid(), 'efilfonimda@gmail.com', 'Efilfonimda', 'Simpal Group of Companies', 'Team Member', TRUE),
    (gen_random_uuid(), 'admin@hrhub.com', 'H R M D', 'Simpal Group of Companies', 'HR Administrator', TRUE)
ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    company = EXCLUDED.company,
    role = EXCLUDED.role,
    is_approved = TRUE,
    updated_at = TIMEZONE('utc'::text, NOW());
