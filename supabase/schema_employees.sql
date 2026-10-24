-- ==============================================================================
-- DEDICATED SUPABASE TABLE: employees
-- Purpose: Complete cloud database storage for employee directory and personnel accounts.
-- Eliminates localStorage saving: all personnel records (Remark Joy Gaviola,
-- Caquennie6, Efilfonimda, HRMD Admin, etc.) live permanently in Supabase database.
-- Run this in the Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. CREATE TABLE: employees
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

-- Documentation comments
COMMENT ON TABLE public.employees IS 'Dedicated database table for employee directory and user account profiles';
COMMENT ON COLUMN public.employees.id IS 'Unique identifier for employee record';
COMMENT ON COLUMN public.employees.email IS 'Unique email address of the employee';
COMMENT ON COLUMN public.employees.name IS 'Full employee display name';
COMMENT ON COLUMN public.employees.company IS 'Assigned company or corporate subsidiary';
COMMENT ON COLUMN public.employees.role IS 'Job title / organizational role';
COMMENT ON COLUMN public.employees.is_approved IS 'Access approval state (true = approved, false = suspended)';

-- 2. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- 3. POLICIES: Allow public anon client & authenticated users full read/write access
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'employees' AND policyname = 'Allow select on employees'
    ) THEN
        CREATE POLICY "Allow select on employees" ON public.employees FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'employees' AND policyname = 'Allow all on employees'
    ) THEN
        CREATE POLICY "Allow all on employees" ON public.employees FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 4. PRE-SEED INITIAL ACCOUNTS (Guarantees Remark Joy Gaviola and active personnel are in database)
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
