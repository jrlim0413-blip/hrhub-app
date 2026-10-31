-- ==============================================================================
-- HRHUB APP: ALL-IN-ONE LIGHTWEIGHT DATABASE SCHEMA & POLICIES SETUP
-- ==============================================================================
-- I-paste ang BUONG script na ito sa inyong bagong Supabase project:
-- Dashboard -> SQL Editor -> New Query -> Run
--
-- Sakop nito ang:
-- 1. Extensions (pgcrypto, uuid-ossp)
-- 2. 11 Comprehensive Tables:
--    - public.employees (Employee directory & role permissions)
--    - public.profiles (Auth & system sync)
--    - public.user_settings (HR settings, signatories, letterheads)
--    - public.saved_memos (Official memorandums repository)
--    - public.incident_reports (HR Incidents & NTE workflow)
--    - public.agent_requirements (201 employee files & uploaded IDs)
--    - public.agent_profiles (Agent profile custom details & booth overrides)
--    - public.chat_messages (In-app real-time messaging)
--    - public.memos (General noticeboard & announcements)
--    - public.memo_acknowledgements (Employee digital acknowledgments & e-signatures)
--    - public.supervisor_attendance (Live camera photo, coordinates & logs)
-- 3. Row Level Security (RLS) Policies (Full read & write access for web & mobile app)
-- 4. Storage Buckets & Policies (requirements, nte-proofs, chat-attachments, supervisor-attendance)
-- 5. Realtime Sync Subscription (Auto-update sa screen ni HR)
-- 6. Default Admin Account (Para instant login pagkatapos ma-run)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- EXTENSIONS
-- ------------------------------------------------------------------------------
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

DO $$ BEGIN
    DROP POLICY IF EXISTS "Allow all on employees" ON public.employees;
    CREATE POLICY "Allow all on employees" ON public.employees FOR ALL USING (true) WITH CHECK (true);
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

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Allow all on profiles" ON public.profiles;
    CREATE POLICY "Allow all on profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
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

DO $$ BEGIN
    DROP POLICY IF EXISTS "Allow all on user_settings" ON public.user_settings;
    CREATE POLICY "Allow all on user_settings" ON public.user_settings FOR ALL USING (true) WITH CHECK (true);
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

DO $$ BEGIN
    DROP POLICY IF EXISTS "Allow all on saved_memos" ON public.saved_memos;
    CREATE POLICY "Allow all on saved_memos" ON public.saved_memos FOR ALL USING (true) WITH CHECK (true);
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

DO $$ BEGIN
    DROP POLICY IF EXISTS "Allow all on incident_reports" ON public.incident_reports;
    CREATE POLICY "Allow all on incident_reports" ON public.incident_reports FOR ALL USING (true) WITH CHECK (true);
END $$;

-- ------------------------------------------------------------------------------
-- 6. TABLE: public.agent_requirements (201 Files, IDs, Uploaded Proofs)
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

DO $$ BEGIN
    DROP POLICY IF EXISTS "Allow all on agent_requirements" ON public.agent_requirements;
    CREATE POLICY "Allow all on agent_requirements" ON public.agent_requirements FOR ALL USING (true) WITH CHECK (true);
END $$;

-- ------------------------------------------------------------------------------
-- 7. TABLE: public.agent_profiles (Agent Overrides & Extended Details)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agent_profiles (
    agent_key TEXT PRIMARY KEY,
    full_name TEXT,
    birthday TEXT,
    home_address TEXT,
    contact_number TEXT,
    emergency_name TEXT,
    emergency_contact_number TEXT,
    booth_number TEXT,
    booth_location TEXT,
    id_number TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

ALTER TABLE public.agent_profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Allow all on agent_profiles" ON public.agent_profiles;
    CREATE POLICY "Allow all on agent_profiles" ON public.agent_profiles FOR ALL USING (true) WITH CHECK (true);
END $$;

-- ------------------------------------------------------------------------------
-- 8. TABLE: public.chat_messages (In-App Team Messaging)
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

DO $$ BEGIN
    DROP POLICY IF EXISTS "Allow all on chat_messages" ON public.chat_messages;
    CREATE POLICY "Allow all on chat_messages" ON public.chat_messages FOR ALL USING (true) WITH CHECK (true);
END $$;

-- ------------------------------------------------------------------------------
-- 9. TABLE: public.memos (Noticeboard Feed)
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

DO $$ BEGIN
    DROP POLICY IF EXISTS "Allow all on memos" ON public.memos;
    CREATE POLICY "Allow all on memos" ON public.memos FOR ALL USING (true) WITH CHECK (true);
END $$;

-- ------------------------------------------------------------------------------
-- 10. TABLE: public.memo_acknowledgements (Employee Digital Acknowledgments & Signatures)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.memo_acknowledgements (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    memo_id TEXT NOT NULL,
    memo_ref_no TEXT,
    memo_subject TEXT,
    employee_id TEXT,
    employee_name TEXT NOT NULL,
    employee_email TEXT,
    company TEXT DEFAULT 'Simpal Group of Companies',
    status TEXT DEFAULT 'ACKNOWLEDGED',
    signature_data TEXT,
    remarks TEXT,
    ip_address TEXT,
    device_info TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    acknowledged_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Manila', NOW()),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Manila', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Manila', NOW()),
    CONSTRAINT uq_memo_ack UNIQUE (memo_id, employee_email)
);

CREATE INDEX IF NOT EXISTS idx_memo_ack_memo_id ON public.memo_acknowledgements (memo_id);
CREATE INDEX IF NOT EXISTS idx_memo_ack_employee ON public.memo_acknowledgements (employee_email);

ALTER TABLE public.memo_acknowledgements ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Allow all on memo_acknowledgements" ON public.memo_acknowledgements;
    CREATE POLICY "Allow all on memo_acknowledgements" ON public.memo_acknowledgements FOR ALL USING (true) WITH CHECK (true);
END $$;

-- ------------------------------------------------------------------------------
-- 11. TABLE: public.supervisor_attendance (Live Camera & GPS Coordinates)
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

CREATE INDEX IF NOT EXISTS idx_spvr_att_date ON public.supervisor_attendance (attendance_date);
CREATE INDEX IF NOT EXISTS idx_spvr_att_supervisor_id ON public.supervisor_attendance (supervisor_id);

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

ALTER TABLE public.supervisor_attendance ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Allow all on supervisor_attendance" ON public.supervisor_attendance;
    CREATE POLICY "Allow all on supervisor_attendance" ON public.supervisor_attendance FOR ALL USING (true) WITH CHECK (true);
END $$;

-- ------------------------------------------------------------------------------
-- 12. STORAGE BUCKETS SETUP & STORAGE RLS POLICIES
-- ------------------------------------------------------------------------------
-- Pag-create ng 4 public buckets: requirements, nte-proofs, chat-attachments, supervisor-attendance
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('requirements', 'requirements', true),
    ('nte-proofs', 'nte-proofs', true),
    ('chat-attachments', 'chat-attachments', true),
    ('supervisor-attendance', 'supervisor-attendance', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage Objects Policies (Allow select, insert, update, delete for public)
DO $$ BEGIN
    DROP POLICY IF EXISTS "Public Access - Read" ON storage.objects;
    DROP POLICY IF EXISTS "Public Access - Insert" ON storage.objects;
    DROP POLICY IF EXISTS "Public Access - Update" ON storage.objects;
    DROP POLICY IF EXISTS "Public Access - Delete" ON storage.objects;

    CREATE POLICY "Public Access - Read" ON storage.objects
        FOR SELECT TO public USING (bucket_id IN ('requirements', 'nte-proofs', 'chat-attachments', 'supervisor-attendance'));

    CREATE POLICY "Public Access - Insert" ON storage.objects
        FOR INSERT TO public WITH CHECK (bucket_id IN ('requirements', 'nte-proofs', 'chat-attachments', 'supervisor-attendance'));

    CREATE POLICY "Public Access - Update" ON storage.objects
        FOR UPDATE TO public USING (bucket_id IN ('requirements', 'nte-proofs', 'chat-attachments', 'supervisor-attendance'));

    CREATE POLICY "Public Access - Delete" ON storage.objects
        FOR DELETE TO public USING (bucket_id IN ('requirements', 'nte-proofs', 'chat-attachments', 'supervisor-attendance'));
END $$;

-- ------------------------------------------------------------------------------
-- 13. REALTIME PUBLICATION SETUP
-- ------------------------------------------------------------------------------
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.supervisor_attendance;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.incident_reports;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.memo_acknowledgements;
EXCEPTION WHEN others THEN NULL; END $$;

-- ------------------------------------------------------------------------------
-- 14. SEED DEFAULT ADMIN ACCOUNTS & SETTINGS (Para makapasok agad)
-- ------------------------------------------------------------------------------
INSERT INTO public.profiles (email, name, company, role, is_approved)
VALUES 
    ('admin@hrhub.com', 'H R M D', 'Simpal Group of Companies', 'Admin', true),
    ('hr@5aroyal.com', 'Central HR', '5A Royal Gaming OPC', 'Admin', true)
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.employees (id, email, name, company, role, is_approved)
VALUES 
    ('emp-admin', 'admin@hrhub.com', 'H R M D', 'Simpal Group of Companies', 'Admin', true),
    ('emp-central-hr', 'hr@5aroyal.com', 'Central HR', '5A Royal Gaming OPC', 'Admin', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_settings (user_id, signatory_name, signatory_title, approver_name, approver_title)
VALUES 
    ('default_admin', 'JEVINCE JAYE S. JUBAY, CHRP', 'HRMD Manager', 'CHARMIE JEAN M. SIMPAL', 'President & CEO')
ON CONFLICT (user_id) DO NOTHING;
