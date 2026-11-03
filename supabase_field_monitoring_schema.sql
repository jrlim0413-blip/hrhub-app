-- ==============================================================================
-- HRHUB APP: FIELD MONITORING ACCOUNTS SCHEMA
-- ==============================================================================
-- I-run ang buong script na ito sa:
-- Supabase Dashboard -> SQL Editor -> New Query -> Run
--
-- Sakop ng script na ito ang:
-- 1. Table: public.field_monitoring_accounts
--    - Persistent database storage para sa Field Monitoring accounts
--    - Columns: id, full_name, username, password, area, role, is_active, created_at, updated_at
-- 2. Row Level Security (RLS) policies para sa SELECT, INSERT, UPDATE, DELETE
-- 3. Automatic updated_at trigger
-- 4. Initial Seed Data (Default FM-01 Field Monitor Account)
-- 5. Realtime publication para kusa / auto-update sa screen ni HR
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. TABLE: public.field_monitoring_accounts
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.field_monitoring_accounts (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    area TEXT NOT NULL DEFAULT 'Mandaue City',
    role TEXT NOT NULL DEFAULT 'Field Monitoring',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Manila', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Manila', NOW())
);

-- Kung nagawa na ang table, siguraduhing kompleto ang mga kolum:
ALTER TABLE public.field_monitoring_accounts ADD COLUMN IF NOT EXISTS area TEXT NOT NULL DEFAULT 'Mandaue City';
ALTER TABLE public.field_monitoring_accounts ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'Field Monitoring';
ALTER TABLE public.field_monitoring_accounts ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Indexes para mabilis ang search at login verification
CREATE INDEX IF NOT EXISTS idx_fm_username ON public.field_monitoring_accounts (username);
CREATE INDEX IF NOT EXISTS idx_fm_area ON public.field_monitoring_accounts (area);
CREATE INDEX IF NOT EXISTS idx_fm_active ON public.field_monitoring_accounts (is_active);

-- ------------------------------------------------------------------------------
-- 2. AUTO-UPDATE TRIGGER PARA SA updated_at
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_fm_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('Asia/Manila', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_fm_accounts_updated_at ON public.field_monitoring_accounts;
CREATE TRIGGER trg_fm_accounts_updated_at
    BEFORE UPDATE ON public.field_monitoring_accounts
    FOR EACH ROW EXECUTE FUNCTION public.handle_fm_accounts_updated_at();

-- ------------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.field_monitoring_accounts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow select on field_monitoring_accounts" ON public.field_monitoring_accounts;
    DROP POLICY IF EXISTS "Allow insert on field_monitoring_accounts" ON public.field_monitoring_accounts;
    DROP POLICY IF EXISTS "Allow update on field_monitoring_accounts" ON public.field_monitoring_accounts;
    DROP POLICY IF EXISTS "Allow delete on field_monitoring_accounts" ON public.field_monitoring_accounts;

    CREATE POLICY "Allow select on field_monitoring_accounts" 
        ON public.field_monitoring_accounts FOR SELECT USING (true);

    CREATE POLICY "Allow insert on field_monitoring_accounts" 
        ON public.field_monitoring_accounts FOR INSERT WITH CHECK (true);

    CREATE POLICY "Allow update on field_monitoring_accounts" 
        ON public.field_monitoring_accounts FOR UPDATE USING (true) WITH CHECK (true);

    CREATE POLICY "Allow delete on field_monitoring_accounts" 
        ON public.field_monitoring_accounts FOR DELETE USING (true);
END $$;

-- ------------------------------------------------------------------------------
-- 4. INITIAL SEED DATA (Default FM-01 Field Monitor Account)
-- ------------------------------------------------------------------------------
INSERT INTO public.field_monitoring_accounts (id, full_name, username, password, area, role, is_active)
VALUES (
    'FM-01',
    'FIELD MONITOR - MANDAUE',
    'monitor.mandaue',
    'Password123!',
    'Mandaue City',
    'Field Monitoring',
    true
)
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    username = EXCLUDED.username,
    area = EXCLUDED.area,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active;

-- ------------------------------------------------------------------------------
-- 5. REALTIME PUBLICATION
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.field_monitoring_accounts;
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Ignore error if already added or restricted
END $$;
