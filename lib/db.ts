
import { supabase } from './supabaseClient';
import { Employee, Attendance, AppSettings, AuditLog, Announcement, UserRole, AttendanceStatus, UserSession } from '../types';

/**
 * -------------------------------------------------------------------
 * SUPABASE SQL SCHEMA (Idempotent Setup)
 * -------------------------------------------------------------------
 * -- 1. Tables
 * CREATE TABLE IF NOT EXISTS public.profiles (
 *   id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
 *   name TEXT NOT NULL,
 *   role TEXT CHECK (role IN ('ADMIN', 'EMPLOYEE')) DEFAULT 'EMPLOYEE',
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * CREATE TABLE IF NOT EXISTS public.employees (
 *   id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
 *   employee_code TEXT UNIQUE NOT NULL,
 *   name TEXT NOT NULL,
 *   mobile TEXT NOT NULL,
 *   email TEXT UNIQUE NOT NULL,
 *   department TEXT DEFAULT 'Operations',
 *   role TEXT DEFAULT 'Staff',
 *   joining_date DATE DEFAULT CURRENT_DATE,
 *   status TEXT CHECK (status IN ('ACTIVE', 'INACTIVE')) DEFAULT 'ACTIVE',
 *   shift_start TIME DEFAULT '09:00',
 *   shift_end TIME DEFAULT '18:00',
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * -- 2. Trigger Function
 * CREATE OR REPLACE FUNCTION public.handle_new_user() 
 * RETURNS TRIGGER AS $$
 * BEGIN
 *   INSERT INTO public.profiles (id, name, role)
 *   VALUES (
 *     NEW.id, 
 *     COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
 *     CASE WHEN NEW.email LIKE '%admin%' THEN 'ADMIN' ELSE 'EMPLOYEE' END
 *   ) ON CONFLICT (id) DO NOTHING;
 *   RETURN NEW;
 * END;
 * $$ LANGUAGE plpgsql SECURITY DEFINER;
 * 
 * -- 3. Trigger Setup
 * DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
 * CREATE TRIGGER on_auth_user_created
 *   AFTER INSERT ON auth.users
 *   FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
 * 
 * -- 4. RLS (Disable temporarily if login still fails to test)
 * ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Profiles are readable by everyone" ON public.profiles FOR SELECT USING (true);
 * CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
 * 
 * -- 5. BACKFILL SCRIPT (Run this if you created users manually in the dashboard)
 * INSERT INTO public.profiles (id, name, role)
 * SELECT id, email, 'ADMIN' FROM auth.users WHERE email LIKE '%admin%'
 * ON CONFLICT (id) DO NOTHING;
 * 
 * INSERT INTO public.profiles (id, name, role)
 * SELECT id, email, 'EMPLOYEE' FROM auth.users WHERE email NOT LIKE '%admin%'
 * ON CONFLICT (id) DO NOTHING;
 */

const isMock = !process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_URL === 'undefined';

export const DB = {
  seedDemoData: async () => {
    if (isMock) return "App is in simulation mode.";
    try {
      await supabase.from('app_settings').upsert({
        id: 1,
        attendance_window_start: '09:00',
        attendance_window_end: '10:00',
        late_threshold_minutes: 15,
        location_mandatory: true,
        photo_mandatory: true,
        device_binding: false
      });
      return "SUCCESS: Settings initialized.";
    } catch (e: any) {
      throw new Error(`Seeding Failed: ${e.message}`);
    }
  },

  getCurrentSession: async (): Promise<UserSession | null> => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) return null;
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();
      
      if (profileError) {
        console.error("Profile Fetch Error:", profileError);
      }
      
      // CRITICAL FALLBACK: If auth session exists but profile doesn't, create it on the fly
      if (!profile) {
        console.warn("Profile missing for active session. Attempting auto-creation...");
        const isEmailAdmin = session.user.email?.toLowerCase().includes('admin');
        const role = isEmailAdmin ? UserRole.ADMIN : UserRole.EMPLOYEE;
        const name = session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User';
        
        const newProfile = { id: session.user.id, name, role };
        
        // Try inserting, but don't crash if it fails (might be RLS)
        const { error: insertError } = await supabase.from('profiles').insert(newProfile);
        if (insertError) {
          console.error("Auto-profile creation failed:", insertError);
          // Return the expected session anyway so the UI doesn't block the user
        }
        
        return { id: session.user.id, name, role, employee_id: session.user.id };
      }
        
      return {
        id: session.user.id,
        name: profile.name,
        role: (profile.role as UserRole),
        employee_id: session.user.id
      };
    } catch (e) {
      console.error("Critical Failure in getCurrentSession:", e);
      return null;
    }
  },

  getEmployees: async (): Promise<Employee[]> => {
    const { data, error } = await supabase.from('employees').select('*').order('name');
    if (error) console.error("getEmployees error:", error);
    return data || [];
  },

  updateEmployee: async (emp: Employee, adminId: string) => {
    await supabase.from('profiles').upsert({
      id: emp.id,
      name: emp.name,
      role: emp.role.toUpperCase().includes('ADMIN') ? UserRole.ADMIN : UserRole.EMPLOYEE
    });
    await supabase.from('employees').upsert(emp);
  },

  deleteEmployee: async (id: string, adminId: string) => {
    await supabase.from('employees').delete().eq('id', id);
    await supabase.from('profiles').delete().eq('id', id);
  },

  getAttendance: async (date?: string): Promise<Attendance[]> => {
    let query = supabase.from('attendance').select('*').order('date', { ascending: false });
    if (date) query = query.eq('date', date);
    const { data, error } = await query;
    if (error) console.error("getAttendance error:", error);
    return data || [];
  },

  saveAttendance: async (record: Omit<Attendance, 'id' | 'created_at'>): Promise<Attendance> => {
    const { data, error } = await supabase.from('attendance').insert(record).select().single();
    if (error) throw error;
    return data;
  },

  updateAttendance: async (id: string, updates: Partial<Attendance>, adminId: string) => {
    const { error } = await supabase.from('attendance').update(updates).eq('id', id);
    if (error) throw error;
  },

  deleteAttendance: async (id: string, adminId: string) => {
    const { error } = await supabase.from('attendance').delete().eq('id', id);
    if (error) throw error;
  },

  getAnnouncements: async (): Promise<Announcement[]> => {
    const { data } = await supabase.from('announcements').select('*').order('date', { ascending: false });
    return data || [];
  },

  getSettings: async (): Promise<AppSettings> => {
    const { data } = await supabase.from('app_settings').select('*').eq('id', 1).maybeSingle();
    return data || {
      attendance_window_start: '09:00',
      attendance_window_end: '10:00',
      late_threshold_minutes: 15,
      location_mandatory: true,
      photo_mandatory: true,
      device_binding: false
    };
  },

  saveSettings: async (settings: AppSettings, adminId: string) => {
    await supabase.from('app_settings').upsert({ id: 1, ...settings });
  },

  addAuditLog: async (log: Omit<AuditLog, 'id' | 'timestamp'>) => {
    await supabase.from('audit_logs').insert(log);
  },

  uploadPhoto: async (base64: string, path: string): Promise<string> => {
    if (isMock) return "https://via.placeholder.com/400x500?text=Mock_Photo";
    try {
      const byteString = atob(base64.split(',')[1]);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
      const blob = new Blob([ab], { type: 'image/jpeg' });
      const { error } = await supabase.storage.from('attendance_photos').upload(path, blob);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('attendance_photos').getPublicUrl(path);
      return publicUrl;
    } catch (e) {
      console.error("Upload error:", e);
      return base64;
    }
  }
};
