-- FIX: Infinite Recursion in RLS Policies & Employee Visibility
-- Run this script in your Supabase SQL Editor to resolve the "infinite recursion" error
-- and ensure employees are visible in the dashboard.

-- 1. Reset Profiles Policies (Breaks the recursion loop)
DROP POLICY IF EXISTS "View own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated view all profiles" ON public.profiles;

CREATE POLICY "Authenticated view all profiles" ON public.profiles 
  FOR SELECT TO authenticated USING (true);

-- 2. Reset Employees Policies (Ensures visibility)
DROP POLICY IF EXISTS "View own employee record" ON public.employees;
DROP POLICY IF EXISTS "Admins manage employees" ON public.employees;
DROP POLICY IF EXISTS "Authenticated users view employees" ON public.employees;

-- Allow everyone to see the employee list (fixes "0 records" issue)
CREATE POLICY "Authenticated users view employees" ON public.employees
  FOR SELECT TO authenticated USING (true);

-- Allow Admins to manage (Insert/Update/Delete)
CREATE POLICY "Admins manage employees" ON public.employees 
  FOR ALL USING (public.is_admin());

-- Allow Users to view their own record (redundant for Select, but good for specific row-level logic if needed later)
CREATE POLICY "View own employee record" ON public.employees 
  FOR SELECT USING (auth.uid() = id);

-- 3. Ensure is_admin function is robust
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Checks if the user has 'ADMIN' role in profiles
  -- Now safe because profiles policy allows reading without recursion
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
