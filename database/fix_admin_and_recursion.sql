-- COMPREHENSIVE FIX: Admin Function & Recursion
-- Run this script in Supabase SQL Editor to fully resolve the issues.

-- 1. Ensure the is_admin function exists and is correct
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if the user has 'ADMIN' role in profiles
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Break Recursion in Profiles Policy
-- The recursion happened because "Admins view all" used is_admin(), which queried profiles, 
-- which triggered the policy again. We break this loop.
DROP POLICY IF EXISTS "View own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated view all profiles" ON public.profiles;

-- Simple policy: All logged-in users can view profiles (needed for directory/manager views)
CREATE POLICY "Authenticated view all profiles" ON public.profiles 
  FOR SELECT TO authenticated USING (true);

-- 3. Fix Employee Table Access
DROP POLICY IF EXISTS "View own employee record" ON public.employees;
DROP POLICY IF EXISTS "Admins manage employees" ON public.employees;
DROP POLICY IF EXISTS "Authenticated users view employees" ON public.employees;

-- Allow everyone to see the employee list
CREATE POLICY "Authenticated users view employees" ON public.employees
  FOR SELECT TO authenticated USING (true);

-- Allow Admins to manage (Insert/Update/Delete)
CREATE POLICY "Admins manage employees" ON public.employees 
  FOR ALL USING (public.is_admin());

-- Allow Users to view their own record explicitly (good for future row-level logic)
CREATE POLICY "View own employee record" ON public.employees 
  FOR SELECT USING (auth.uid() = id);

-- 4. Fix Attendance Table Access
DROP POLICY IF EXISTS "Admins manage all attendance" ON public.attendance;
DROP POLICY IF EXISTS "Employees view own attendance" ON public.attendance;

-- Admins can do everything with attendance
CREATE POLICY "Admins manage all attendance" ON public.attendance
  FOR ALL USING (public.is_admin());

-- Employees can see their own attendance
CREATE POLICY "Employees view own attendance" ON public.attendance
  FOR SELECT USING (employee_id = auth.uid()::text);

-- Employees can insert/update their own attendance (for punch in/out)
CREATE POLICY "Employees manage own attendance" ON public.attendance
  FOR INSERT WITH CHECK (employee_id = auth.uid()::text);

CREATE POLICY "Employees update own attendance" ON public.attendance
  FOR UPDATE USING (employee_id = auth.uid()::text);
