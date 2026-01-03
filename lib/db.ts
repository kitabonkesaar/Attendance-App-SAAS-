
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
 * CREATE TABLE IF NOT EXISTS public.attendance (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   employee_id TEXT NOT NULL,
 *   date TEXT NOT NULL,
 *   time TEXT NOT NULL,
 *   photo_url TEXT,
 *   latitude NUMERIC,
 *   longitude NUMERIC,
 *   punch_out_time TEXT,
 *   punch_out_photo_url TEXT,
 *   punch_out_latitude NUMERIC,
 *   punch_out_longitude NUMERIC,
 *   device_id TEXT,
 *   status TEXT,
 *   edited_by TEXT,
 *   edit_reason TEXT,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * CREATE TABLE IF NOT EXISTS public.app_settings (
 *   id INTEGER PRIMARY KEY DEFAULT 1,
 *   attendance_window_start TEXT,
 *   attendance_window_end TEXT,
 *   late_threshold_minutes INTEGER,
 *   location_mandatory BOOLEAN,
 *   photo_mandatory BOOLEAN,
 *   device_binding BOOLEAN
 * );
 * 
 * CREATE TABLE IF NOT EXISTS public.audit_logs (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   admin_id TEXT,
 *   action TEXT,
 *   entity TEXT,
 *   old_value TEXT,
 *   new_value TEXT,
 *   timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * CREATE TABLE IF NOT EXISTS public.announcements (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   title TEXT,
 *   content TEXT,
 *   date TEXT,
 *   type TEXT
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

const isMock = !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY;

export const DB = {
  seedDemoData: async () => {
    // In mock mode, we still want to seed data to localStorage
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
        console.error("Profile fetch error:", profileError);
        // Fallback if profile missing but auth exists
        return {
            id: session.user.id,
            name: session.user.email?.split('@')[0] || 'User',
            role: session.user.email?.includes('admin') ? UserRole.ADMIN : UserRole.EMPLOYEE,
            employee_id: session.user.id
        };
      }

      return {
        id: session.user.id,
        name: profile?.name || session.user.email?.split('@')[0] || 'User',
        role: (profile?.role as UserRole) || (session.user.email?.includes('admin') ? UserRole.ADMIN : UserRole.EMPLOYEE),
        employee_id: session.user.id
      };
    } catch (error) {
      console.error('Session Check Error:', error);
      return null;
    }
  },

  getAttendance: async (): Promise<Attendance[]> => {
    const { data, error } = await supabase.from('attendance').select('*');
    if (error) throw error;
    return data || [];
  },

  getEmployees: async (): Promise<Employee[]> => {
    const { data, error } = await supabase.from('employees').select('*');
    if (error) throw error;
    return data || [];
  },

  getAnnouncements: async (): Promise<Announcement[]> => {
    const { data, error } = await supabase.from('announcements').select('*');
    if (error) throw error;
    return data || [];
  },

  getSettings: async (): Promise<AppSettings> => {
    const settings = await DB.getAppSettings();
    if (settings) return settings;
    return {
        attendance_window_start: '09:00',
        attendance_window_end: '10:00',
        late_threshold_minutes: 15,
        location_mandatory: true,
        photo_mandatory: true,
        device_binding: false
    };
  },

  uploadPhoto: async (file: string | Blob, fileName: string): Promise<string> => {
    const { data, error } = await supabase.storage
      .from('attendance-photos')
      .upload(fileName, file as any);
      
    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage
      .from('attendance-photos')
      .getPublicUrl(data?.path || fileName);
      
    return publicUrl;
  },
  
  updateEmployee: async (employee: Partial<Employee>, adminId: string) => {
    const { error } = await supabase.from('employees').upsert(employee);
    if (error) throw error;
    return employee;
  },

  addAuditLog: async (log: Omit<AuditLog, 'id' | 'timestamp'>) => {
    const { error } = await supabase.from('audit_logs').insert(log);
    if (error) throw error;
  },

  updateAttendance: async (id: string, updates: Partial<Attendance>, adminId: string) => {
    const { error } = await supabase.from('attendance').update(updates).eq('id', id);
    if (error) throw error;
    
    // Log the update
    await DB.addAuditLog({
        admin_id: adminId,
        action: 'UPDATE_ATTENDANCE',
        entity: 'Attendance',
        old_value: id,
        new_value: JSON.stringify(updates)
    });
  },

  saveAttendance: async (record: Omit<Attendance, 'id' | 'created_at'>) => {
    const { error } = await supabase.from('attendance').insert(record);
    if (error) throw error;
  },

  deleteAttendance: async (id: string, adminId: string) => {
    const { error } = await supabase.from('attendance').delete().eq('id', id);
    if (error) throw error;
     await DB.addAuditLog({
        admin_id: adminId,
        action: 'DELETE_ATTENDANCE',
        entity: 'Attendance',
        old_value: id,
        new_value: 'DELETED'
    });
  },

  getAppSettings: async (): Promise<AppSettings | null> => {
      const { data, error } = await supabase.from('app_settings').select('*').single();
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "Row not found"
      return data || null;
  },

  updateAppSettings: async (settings: AppSettings, adminId: string) => {
      const { error } = await supabase.from('app_settings').upsert({ id: 1, ...settings });
      if (error) throw error;
      await DB.addAuditLog({
        admin_id: adminId,
        action: 'UPDATE_SETTINGS',
        entity: 'AppSettings',
        old_value: 'N/A',
        new_value: 'Updated Settings'
    });
  }
};
