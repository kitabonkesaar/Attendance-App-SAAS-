-- -----------------------------------------------------------------------------
-- 1. TABLES & EXTENSIONS
-- -----------------------------------------------------------------------------

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PROFILES (Linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  role TEXT DEFAULT 'EMPLOYEE', -- 'ADMIN' or 'EMPLOYEE'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- EMPLOYEES (Detailed Staff Records)
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  employee_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  mobile TEXT UNIQUE,
  department TEXT,
  role TEXT DEFAULT 'Staff',
  joining_date DATE,
  shift_start TIME DEFAULT '09:00',
  shift_end TIME DEFAULT '18:00',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Additional fields
  status TEXT DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE, ON_LEAVE
  address TEXT,
  emergency_contact TEXT,
  manager_id UUID REFERENCES public.employees(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  referred_by TEXT
);

-- ATTENDANCE LOGS
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  time TIME NOT NULL, -- Check-in time
  punch_out_time TIME, -- Check-out time
  photo_url TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  device_id TEXT,
  status TEXT DEFAULT 'PRESENT', -- PRESENT, LATE, ABSENT
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Correction fields
  edit_reason TEXT,
  edited_by TEXT -- Admin ID or Name
);

-- APP SETTINGS
CREATE TABLE IF NOT EXISTS public.app_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  attendance_window_start TIME DEFAULT '09:00',
  attendance_window_end TIME DEFAULT '10:00',
  late_threshold_minutes INTEGER DEFAULT 15,
  location_mandatory BOOLEAN DEFAULT TRUE,
  photo_mandatory BOOLEAN DEFAULT TRUE,
  device_binding BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ANNOUNCEMENTS
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT DEFAULT 'NORMAL', -- NORMAL, HIGH, URGENT
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at DATE
);

-- -----------------------------------------------------------------------------
-- 2. PROJECTS & ASSIGNMENTS
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'ACTIVE', -- ACTIVE, COMPLETED, ON_HOLD
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.project_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  role_in_project TEXT,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, employee_id) -- Prevent duplicate assignments
);

CREATE INDEX IF NOT EXISTS idx_project_assignments_emp ON public.project_assignments(employee_id);

-- -----------------------------------------------------------------------------
-- 3. EXTENDED MODULES (Skills, Promotions, Projects)
-- -----------------------------------------------------------------------------

-- SKILLS & CERTIFICATIONS
CREATE TABLE IF NOT EXISTS public.employee_skills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  skill_name TEXT NOT NULL,
  certification_url TEXT, -- Link to document
  issue_date DATE,
  expiry_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skills_employee ON public.employee_skills(employee_id);

-- PROMOTION HISTORY
CREATE TABLE IF NOT EXISTS public.promotions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  previous_role TEXT,
  new_role TEXT NOT NULL,
  promotion_date DATE DEFAULT CURRENT_DATE,
  approved_by UUID REFERENCES public.profiles(id),
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promotions_employee ON public.promotions(employee_id);

-- -----------------------------------------------------------------------------
-- 4. ANALYTICS & AUDIT
-- -----------------------------------------------------------------------------

-- PERFORMANCE METRICS (Aggregated or Periodic)
CREATE TABLE IF NOT EXISTS public.performance_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  review_date DATE DEFAULT CURRENT_DATE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5), -- 1-5 Scale
  comments TEXT,
  reviewer_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AUDIT LOGS (Security & Tracking)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id UUID REFERENCES public.profiles(id), -- Who performed the action
  action TEXT NOT NULL, -- e.g., 'UPDATE_PROFILE', 'APPROVE_LEAVE'
  entity_type TEXT NOT NULL, -- e.g., 'EMPLOYEE', 'PROJECT'
  entity_id TEXT NOT NULL,
  changes JSONB, -- Stores old/new values for detailed tracking
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure created_at exists for existing tables
DO $$ BEGIN
    ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
EXCEPTION
    WHEN undefined_table THEN null;
END $$;

CREATE INDEX IF NOT EXISTS idx_audit_created_at ON public.audit_logs(created_at DESC);

-- -----------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- -----------------------------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- Helper Function to Prevent Recursion
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- POLICIES
-- -----------------------------------------------------------------------------

-- 1. PROFILES
DROP POLICY IF EXISTS "Authenticated view all profiles" ON public.profiles;
CREATE POLICY "Authenticated view all profiles" ON public.profiles 
  FOR SELECT TO authenticated USING (true);

-- 2. EMPLOYEES
DROP POLICY IF EXISTS "View own employee record" ON public.employees;
DROP POLICY IF EXISTS "Admins manage employees" ON public.employees;
DROP POLICY IF EXISTS "Authenticated users view employees" ON public.employees;

CREATE POLICY "View own employee record" ON public.employees 
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Authenticated users view employees" ON public.employees
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage employees" ON public.employees 
  FOR ALL USING (public.is_admin());

-- 3. ATTENDANCE
DROP POLICY IF EXISTS "View own attendance" ON public.attendance;
DROP POLICY IF EXISTS "Admins manage attendance" ON public.attendance;

CREATE POLICY "View own attendance" ON public.attendance
  FOR SELECT USING (employee_id = auth.uid());

CREATE POLICY "Employees can clock in" ON public.attendance
  FOR INSERT WITH CHECK (employee_id = auth.uid());

CREATE POLICY "Admins manage attendance" ON public.attendance
  FOR ALL USING (public.is_admin());

-- 4. EMPLOYEE SKILLS
DROP POLICY IF EXISTS "View own skills" ON public.employee_skills;
DROP POLICY IF EXISTS "Admins manage skills" ON public.employee_skills;

CREATE POLICY "View own skills" ON public.employee_skills
  FOR SELECT USING (employee_id = auth.uid());

CREATE POLICY "Admins manage skills" ON public.employee_skills
  FOR ALL USING (public.is_admin());

-- 5. PROMOTIONS
DROP POLICY IF EXISTS "View own promotions" ON public.promotions;
DROP POLICY IF EXISTS "Admins manage promotions" ON public.promotions;

CREATE POLICY "View own promotions" ON public.promotions
  FOR SELECT USING (employee_id = auth.uid());

CREATE POLICY "Admins manage promotions" ON public.promotions
  FOR ALL USING (public.is_admin());

-- 6. PERFORMANCE REVIEWS
DROP POLICY IF EXISTS "View own reviews" ON public.performance_reviews;
DROP POLICY IF EXISTS "Admins manage reviews" ON public.performance_reviews;

CREATE POLICY "View own reviews" ON public.performance_reviews
  FOR SELECT USING (employee_id = auth.uid());

CREATE POLICY "Admins manage reviews" ON public.performance_reviews
  FOR ALL USING (public.is_admin());

-- 7. AUDIT LOGS
DROP POLICY IF EXISTS "Admins view logs" ON public.audit_logs;
CREATE POLICY "Admins view logs" ON public.audit_logs
  FOR SELECT USING (public.is_admin());
  
-- 8. APP SETTINGS
DROP POLICY IF EXISTS "Read settings" ON public.app_settings;
DROP POLICY IF EXISTS "Admins update settings" ON public.app_settings;

CREATE POLICY "Read settings" ON public.app_settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins update settings" ON public.app_settings
  FOR ALL USING (public.is_admin());

-- 9. ANNOUNCEMENTS
DROP POLICY IF EXISTS "Read announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins manage announcements" ON public.announcements;

CREATE POLICY "Read announcements" ON public.announcements
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage announcements" ON public.announcements
  FOR ALL USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- 6. FUNCTIONS & TRIGGERS
-- -----------------------------------------------------------------------------

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing triggers to avoid duplication
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_employees_updated_at ON public.employees;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_employees_updated_at
BEFORE UPDATE ON public.employees
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
