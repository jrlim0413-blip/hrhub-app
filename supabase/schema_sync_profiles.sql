-- ==============================================================================
-- SYNC TO PROFILES TABLE: Remark Joy Gaviola & Pre-registered Personnel
-- Purpose: Allows Remark Joy Gaviola to appear in public.profiles table
-- Run this in the Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. Siguraduhing existing ang mga kinakailangang columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company TEXT DEFAULT 'Simpal Group of Companies';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'Team Member';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT TRUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());

-- 2. Alisin ang strict foreign key constraint sa profiles table
-- Dahil dito, hindi na magba-block ang Supabase kapag nag-insert ng pre-registered personnel
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 2. Siguraduhing may unique constraint ang email para sa ON CONFLICT
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'profiles_email_unique'
    ) THEN
        BEGIN
            ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_unique UNIQUE (email);
        EXCEPTION
            WHEN duplicate_table THEN NULL;
            WHEN others THEN NULL;
        END;
    END IF;
END $$;

-- 3. I-insert si Remark Joy Gaviola at mga empleyado sa public.profiles
INSERT INTO public.profiles (id, email, is_approved, created_at)
VALUES
    (gen_random_uuid(), 'remarkjoymark@gmail.com', TRUE, NOW()),
    (gen_random_uuid(), 'admin@hrhub.com', TRUE, NOW())
ON CONFLICT (email) DO UPDATE SET
    is_approved = TRUE;
