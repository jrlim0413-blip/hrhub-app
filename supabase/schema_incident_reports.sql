-- Schema: Incident Reports & Notice to Explain (NTE) Workflow
-- Enables peer-to-peer HR incident reporting, central HR review, and official NTE issuance

CREATE TABLE IF NOT EXISTS public.incident_reports (
  id TEXT PRIMARY KEY,
  case_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'SUBMITTED_TO_CENTRAL_HR',
  date_of_incident DATE,
  date_reported DATE,
  reporting_hr_name TEXT,
  reporting_hr_title TEXT,
  employee_name TEXT NOT NULL,
  employee_position TEXT,
  company TEXT DEFAULT '5A Royal Gaming OPC',
  branch TEXT,
  incident_category TEXT,
  cash_shortage_amount TEXT,
  specific_findings TEXT,
  full_incident_narrative TEXT,
  nte_subject TEXT DEFAULT 'Notice to Explain',
  nte_body TEXT,
  activity_log JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view and manage incident reports
CREATE POLICY "Allow authenticated read incident_reports"
ON public.incident_reports
FOR SELECT
TO authenticated, anon
USING (true);

CREATE POLICY "Allow authenticated insert incident_reports"
ON public.incident_reports
FOR INSERT
TO authenticated, anon
WITH CHECK (true);

CREATE POLICY "Allow authenticated update incident_reports"
ON public.incident_reports
FOR UPDATE
TO authenticated, anon
USING (true);

CREATE POLICY "Allow authenticated delete incident_reports"
ON public.incident_reports
FOR DELETE
TO authenticated, anon
USING (true);
