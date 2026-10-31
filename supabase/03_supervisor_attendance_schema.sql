-- ==============================================================================
-- HRHUB APP: SUPERVISOR ATTENDANCE & FIELD GEO-PROOF SCHEMA
-- ==============================================================================
-- I-run ang buong script na ito sa:
-- Supabase Dashboard -> SQL Editor -> New Query -> Run
--
-- Sakop ng script na ito ang:
-- 1. Table: public.supervisor_attendance
--    - Naglalaman ng attendance per date, time in, area, status
--    - GPS Coordinates (latitude, longitude, accuracy)
--    - Photo proof URL mula sa Supabase Storage
--    - Unique constraint per supervisor kada araw (iwas duplicate records)
-- 2. Row Level Security (RLS) policies para sa instant reading at writing
-- 3. Storage Bucket: 'supervisor-attendance' para sa mga picture na kinunan sa area
-- 4. Storage Policies para ma-upload at ma-view ang mga litrato
-- 5. Realtime publication para kusa / auto-update sa screen ni HR
-- ==============================================================================

-- Siguraduhing active ang pgcrypto extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. TABLE: public.supervisor_attendance
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.supervisor_attendance (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    supervisor_id TEXT NOT NULL,
    supervisor_name TEXT NOT NULL,
    username TEXT,
    attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
    time_in TEXT,
    time_out TEXT,
    status TEXT NOT NULL DEFAULT 'Present',
    area TEXT DEFAULT '5',
    shift TEXT,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    location_accuracy NUMERIC,
    location_name TEXT,
    photo_url TEXT,
    photo_storage_path TEXT,
    remarks TEXT,
    device_info TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Manila', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Manila', NOW()),
    CONSTRAINT uq_spvr_attendance_date UNIQUE (supervisor_id, attendance_date)
);

-- Kung nagawa na ang table dati nang walang device_info o location_accuracy, i-add ang columns:
ALTER TABLE public.supervisor_attendance ADD COLUMN IF NOT EXISTS device_info TEXT;
ALTER TABLE public.supervisor_attendance ADD COLUMN IF NOT EXISTS location_accuracy NUMERIC;
ALTER TABLE public.supervisor_attendance ADD COLUMN IF NOT EXISTS location_name TEXT;
ALTER TABLE public.supervisor_attendance ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Indexes para mabilis ang filtering at date range queries
CREATE INDEX IF NOT EXISTS idx_spvr_att_date ON public.supervisor_attendance (attendance_date);
CREATE INDEX IF NOT EXISTS idx_spvr_att_supervisor_id ON public.supervisor_attendance (supervisor_id);
CREATE INDEX IF NOT EXISTS idx_spvr_att_area ON public.supervisor_attendance (area);

-- ------------------------------------------------------------------------------
-- 2. AUTO-UPDATE TRIGGER PARA SA updated_at
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_spvr_attendance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('Asia/Manila', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_spvr_attendance_updated_at ON public.supervisor_attendance;
CREATE TRIGGER trg_spvr_attendance_updated_at
    BEFORE UPDATE ON public.supervisor_attendance
    FOR EACH ROW EXECUTE FUNCTION public.handle_spvr_attendance_updated_at();

-- ------------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.supervisor_attendance ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow select on supervisor_attendance" ON public.supervisor_attendance;
    DROP POLICY IF EXISTS "Allow insert on supervisor_attendance" ON public.supervisor_attendance;
    DROP POLICY IF EXISTS "Allow update on supervisor_attendance" ON public.supervisor_attendance;
    DROP POLICY IF EXISTS "Allow delete on supervisor_attendance" ON public.supervisor_attendance;

    CREATE POLICY "Allow select on supervisor_attendance" 
        ON public.supervisor_attendance FOR SELECT USING (true);

    CREATE POLICY "Allow insert on supervisor_attendance" 
        ON public.supervisor_attendance FOR INSERT WITH CHECK (true);

    CREATE POLICY "Allow update on supervisor_attendance" 
        ON public.supervisor_attendance FOR UPDATE USING (true) WITH CHECK (true);

    CREATE POLICY "Allow delete on supervisor_attendance" 
        ON public.supervisor_attendance FOR DELETE USING (true);
END $$;

-- ------------------------------------------------------------------------------
-- 4. STORAGE BUCKET: supervisor-attendance
-- ------------------------------------------------------------------------------
-- Gagawa ng public storage bucket para sa mga kinunan na picture sa area
INSERT INTO storage.buckets (id, name, public)
VALUES ('supervisor-attendance', 'supervisor-attendance', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage Objects Access Policies (Pinapayagan ang anon at authenticated para makapag-upload mula sa app)
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public Access - Read supervisor-attendance" ON storage.objects;
    DROP POLICY IF EXISTS "Public Access - Insert supervisor-attendance" ON storage.objects;
    DROP POLICY IF EXISTS "Public Access - Update supervisor-attendance" ON storage.objects;
    DROP POLICY IF EXISTS "Public Access - Delete supervisor-attendance" ON storage.objects;
    DROP POLICY IF EXISTS "Allow anon and auth uploads to supervisor-attendance" ON storage.objects;
    DROP POLICY IF EXISTS "Allow anon and auth reads from supervisor-attendance" ON storage.objects;

    CREATE POLICY "Public Access - Read supervisor-attendance" 
        ON storage.objects FOR SELECT 
        TO public
        USING (bucket_id = 'supervisor-attendance');

    CREATE POLICY "Public Access - Insert supervisor-attendance" 
        ON storage.objects FOR INSERT 
        TO public
        WITH CHECK (bucket_id = 'supervisor-attendance');

    CREATE POLICY "Public Access - Update supervisor-attendance" 
        ON storage.objects FOR UPDATE 
        TO public
        USING (bucket_id = 'supervisor-attendance');

    CREATE POLICY "Public Access - Delete supervisor-attendance" 
        ON storage.objects FOR DELETE 
        TO public
        USING (bucket_id = 'supervisor-attendance');
END $$;

-- ------------------------------------------------------------------------------
-- 5. REALTIME PUBLICATION
-- ------------------------------------------------------------------------------
-- Papayagan ang Supabase Realtime para kusa mag-pop up sa screen ni HR ang attendance
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.supervisor_attendance;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN others THEN NULL;
END $$;

-- I-notify ang PostgREST schema cache para ma-detect agad ng web app
NOTIFY pgrst, 'reload schema';

