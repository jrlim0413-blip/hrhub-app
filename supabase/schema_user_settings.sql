-- ==============================================================================
-- DEDICATED TABLE: user_settings
-- Purpose: Store per-user account default settings as JSON in Supabase
-- Run this in the Supabase Dashboard -> SQL Editor
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id TEXT PRIMARY KEY,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Comments for documentation
COMMENT ON TABLE public.user_settings IS 'Dedicated table for user account default settings saved as JSON';
COMMENT ON COLUMN public.user_settings.user_id IS 'Unique user account identifier (email or user UUID)';
COMMENT ON COLUMN public.user_settings.settings IS 'Complete user default settings payload saved in JSON format';

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Allow read & write access for authenticated users & public anon client
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'user_settings' AND policyname = 'Allow select on user_settings'
    ) THEN
        CREATE POLICY "Allow select on user_settings" ON public.user_settings FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'user_settings' AND policyname = 'Allow all on user_settings'
    ) THEN
        CREATE POLICY "Allow all on user_settings" ON public.user_settings FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
