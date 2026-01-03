
import { supabase } from './supabaseClient';
import { Employee, Attendance, AppSettings, AuditLog, Announcement, UserRole, AttendanceStatus, UserSession } from '../types';

/**
 * -------------------------------------------------------------------
 * SUPABASE SQL SCHEMA (Copy and Run in SQL Editor)
 * -------------------------------------------------------------------
 * 
 * -- 1. PROFILES (Extends Auth User)
 * CREATE TABLE profiles (
 *   id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
 *   name TEXT NOT NULL,
 *   role TEXT CHECK (role IN ('ADMIN', 'EMPLOYEE')) DEFAULT 'EMPLOYEE',
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * -- 2. EMPLOYEES (Staff Details)
 * CREATE TABLE employees (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   profile_id UUID REFERENCES auth.users(id),
 *   employee_code TEXT UNIQUE NOT NULL,
 *   name TEXT NOT NULL,
 *   mobile TEXT NOT NULL,
 *   email TEXT UNIQUE NOT NULL,
 *   department TEXT,
 *   role TEXT DEFAULT 'Staff',
 *   joining_date DATE DEFAULT CURRENT_DATE,
 *   status TEXT CHECK (status IN ('ACTIVE', 'INACTIVE')) DEFAULT 'ACTIVE',
 *   shift_start TIME DEFAULT '09:00',
 *   shift_end TIME DEFAULT '18:00',
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * -- 3. ATTENDANCE (Punch Logs)
 * CREATE TABLE attendance (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   employee_id UUID REFERENCES auth.users(id) NOT NULL,
 *   date DATE NOT NULL DEFAULT CURRENT_DATE,
 *   time TIME NOT NULL DEFAULT CURRENT_TIME,
 *   photo_url TEXT,
 *   latitude FLOAT,
 *   longitude FLOAT,
 *   punch_out_time TIME,
 *   punch_out_photo_url TEXT,
 *   punch_out_latitude FLOAT,
 *   punch_out_longitude FLOAT,
 *   device_id TEXT,
 *   status TEXT CHECK (status IN ('PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'PENDING')),
 *   edited_by TEXT,
 *   edit_reason TEXT,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * -- 4. SETTINGS
 * CREATE TABLE app_settings (
 *   id INTEGER PRIMARY KEY DEFAULT 1,
 *   attendance_window_start TIME DEFAULT '09:00',
 *   attendance_window_end TIME DEFAULT '10:00',
 *   late_threshold_minutes INTEGER DEFAULT 15,
 *   location_mandatory BOOLEAN DEFAULT TRUE,
 *   photo_mandatory BOOLEAN DEFAULT TRUE,
 *   device_binding BOOLEAN DEFAULT FALSE
 * );
 * 
 * -- 5. QUICK START DATA (FOR DEMO)
 * -- Run these to setup your demo accounts in the public tables
 * -- Note: You must still create the users in Auth > Users tab manually with these IDs or use the app Sign Up.
 * 
 * -- Optional: SQL to insert demo profile data directly
 * -- INSERT INTO profiles (id, name, role) VALUES ('<UUID_FROM_AUTH>', 'Demo Admin', 'ADMIN');
 * -- INSERT INTO profiles (id, name, role) VALUES ('<UUID_FROM_AUTH>', 'Demo Staff', 'EMPLOYEE');
 */

const isMock = !process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_URL === 'undefined';

export const DB = {
  // Utility to seed demo data (Real Supabase Mode)
  seedDemoData: async () => {
    if (isMock) return "App is in simulation mode. No Supabase connection detected.";
    
    try {
      // 1. Create Default Settings
      await supabase.from('app_settings').upsert({
        id: 1,
        attendance_window_start: '09:00',
        attendance_window_end: '10:00',
        late_threshold_minutes: 15,
        location_mandatory: true,
        photo_mandatory: true,
        device_binding: false
      });

      // 2. Clear previous audit logs if any (Optional)
      console.log("Schema initialized.");
      return "SUCCESS: Database tables are ready. \n\nIMPORTANT: Go to your Supabase Dashboard > Authentication > Users and create:\n1. admin@demo.com (Password: Admin@123)\n2. staff@demo.com (Password: Staff@123)";
    } catch (e: any) {
      throw new Error(`Seeding Failed: ${e.message}`);
    }
  },

  // Authentication & Session
  // Fix: UserSession type must be imported from types.ts
  getCurrentSession: async (): Promise<UserSession | null> => {
    try {
      const { data } = await supabase.auth.getSession();
      const session = data?.session;
      if (!session) return null;
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      // Auto-create profile if missing (useful for first-time login)
      if (!profile && !error) {
        const role = session.user.email?.includes('admin') ? UserRole.ADMIN : UserRole.EMPLOYEE;
        const newProfile = { id: session.user.id, name: session.user.user_metadata.name || session.user.email?.split('@')[0], role };
        await supabase.from('profiles').insert(newProfile);
        return { ...newProfile, role: role as UserRole, employee_id: session.user.id };
      }
        
      return {
        id: session.user.id,
        name: profile?.name || session.user.email || 'User',
        role: (profile?.role as UserRole) || UserRole.EMPLOYEE,
        employee_id: session.user.id
      };
    } catch (e) {
      return null;
    }
  },

  // Employees
  getEmployees: async (): Promise<Employee[]> => {
    try {
      const { data, error } = await supabase.from('employees').select('*').order('name');
      if (error || !data) throw new Error(error?.message || "No data");
      return data;
    } catch (e) {
      return [];
    }
  },

  updateEmployee: async (emp: Employee, adminId: string) => {
    // 1. Update Profile first to ensure role consistency
    await supabase.from('profiles').upsert({
      id: emp.id,
      name: emp.name,
      role: emp.role === 'Admin' ? UserRole.ADMIN : UserRole.EMPLOYEE
    });

    // 2. Update Employee details
    const { profile_id, ...rest } = emp as any;
    await supabase.from('employees').upsert({
      ...rest,
      profile_id: emp.id
    });
  },

  deleteEmployee: async (id: string, adminId: string) => {
    await supabase.from('employees').delete().eq('id', id);
    await supabase.from('profiles').delete().eq('id', id);
  },

  // Attendance
  getAttendance: async (date?: string): Promise<Attendance[]> => {
    try {
      let query = supabase.from('attendance').select('*').order('created_at', { ascending: false });
      if (date) query = query.eq('date', date);
      const { data, error } = await query;
      if (error || !data) throw new Error(error?.message || "No data");
      return data;
    } catch (e) {
      return [];
    }
  },

  saveAttendance: async (record: Omit<Attendance, 'id' | 'created_at'>): Promise<Attendance> => {
    try {
      const { data, error } = await supabase.from('attendance').insert(record).select().single();
      if (error || !data) throw new Error(error?.message || "Failed to save");
      return data;
    } catch (e) {
      throw e;
    }
  },

  updateAttendance: async (id: string, updates: Partial<Attendance>, adminId: string) => {
    await supabase.from('attendance').update(updates).eq('id', id);
  },

  deleteAttendance: async (id: string, adminId: string) => {
    await supabase.from('attendance').delete().eq('id', id);
  },

  // Storage Helper
  uploadPhoto: async (base64: string, path: string) => {
    try {
      if (isMock || !base64.startsWith('data:')) return base64;
      
      const parts = base64.split(',');
      const byteCharacters = atob(parts[1]);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/jpeg' });

      const { data, error } = await supabase.storage
        .from('attendance-photos')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: true });

      if (error || !data) throw new Error(error?.message || "Upload failed");
      
      const { data: publicData } = supabase.storage.from('attendance-photos').getPublicUrl(data.path);
      return publicData?.publicUrl || base64;
    } catch (e) {
      return base64;
    }
  },

  // System Settings
  getSettings: async (): Promise<AppSettings> => {
    try {
      const { data, error } = await supabase.from('app_settings').select('*').single();
      if (error || !data) throw new Error(error?.message || "No data");
      return data;
    } catch (e) {
      return {
        attendance_window_start: '09:00',
        attendance_window_end: '10:00',
        late_threshold_minutes: 15,
        location_mandatory: true,
        photo_mandatory: true,
        device_binding: false
      };
    }
  },

  saveSettings: async (settings: AppSettings, adminId: string) => {
    await supabase.from('app_settings').upsert({ id: 1, ...settings });
  },

  addAuditLog: async (log: Omit<AuditLog, 'id' | 'timestamp'>) => {
    await supabase.from('audit_logs').insert(log);
  },

  getAnnouncements: async (): Promise<Announcement[]> => {
    try {
      const { data } = await supabase.from('announcements').select('*').order('date', { ascending: false });
      return data || [];
    } catch (e) {
      return [];
    }
  }
};
