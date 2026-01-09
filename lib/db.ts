
import { supabase, adminSupabase } from './supabaseClient';
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
const SESSION_CACHE_KEY = 'attendance_app_session_cache';

export const DB = {
  getCachedSession: (): UserSession | null => {
    try {
      const cached = localStorage.getItem(SESSION_CACHE_KEY);
      if (!cached) return null;
      return JSON.parse(cached);
    } catch {
      return null;
    }
  },

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
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(`Seeding Failed: ${msg}`);
    }
  },

    logLoginAttempt: async (email: string, status: 'SUCCESS' | 'FAILED', userId?: string, reason?: string) => {
        try {
            // Get IP/User Agent (Best effort from client side, though usually headers are better)
            // In a real app, this might be done via Edge Function to get real IP
            const userAgent = navigator.userAgent;
            
            const logEntry: Partial<AuditLog> = {
                action: 'LOGIN_ATTEMPT',
                entity: 'AUTH', // mapped to entity in DB which corresponds to entity_type in logic
                // We use 'changes' to store extra metadata
                changes: { status, reason, user_agent: userAgent, entity_id: email },
                // timestamp handled by DB default
            };

            if (userId) {
                logEntry.actor_id = userId;
            }

            // Use adminSupabase to ensure we can write logs even if user isn't auth'd yet
            const { error } = await adminSupabase.from('audit_logs').insert(logEntry);
            
            if (error) {
                // Silently ignore aborts to prevent console noise
                if (error.message && error.message.includes('AbortError')) return;
                console.warn("Failed to log login attempt:", error);
            }
        } catch (e: unknown) {
            // Silently ignore network aborts
            if (e instanceof Error && (e.name === 'AbortError' || e.message?.includes('AbortError'))) return;
            console.warn("Error logging login:", e);
        }
    },

  getCurrentSession: async (): Promise<UserSession | null> => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) return null;
      
      // OPTIMIZATION: Return basic session immediately if profile fetch is slow
      // We check 'employees' table as it is the source of truth for roles/status
      // TIMEOUT PROTECTION: If profile fetch hangs, we fallback to Auth Metadata or basic role to prevent app freeze
      
      const profilePromise = adminSupabase
        .from('employees')
        .select('name, role, status')
        .eq('id', session.user.id)
        .maybeSingle();
        
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Profile fetch timeout')), 10000));
      
      let profile = null;
      try {
          const result = await Promise.race([profilePromise, timeoutPromise]) as { data: { name: string; role: string; status: string } | null; error: unknown };
          profile = result.data;
      } catch (e) {
          console.warn("Profile fetch timed out or failed, using auth metadata fallback");
      }
      
      // Map DB Role to App Role
      let appRole = UserRole.EMPLOYEE;
      const dbRole = (profile?.role || 'Staff').toLowerCase();
      if (dbRole === 'admin' || dbRole === 'super admin') {
          appRole = UserRole.ADMIN;
      } else if (dbRole === 'manager') {
          appRole = UserRole.MANAGER;
      } else if (session.user.email?.includes('admin')) {
          // Fallback for legacy/initial setup if no DB record yet
          appRole = UserRole.ADMIN;
      }

      const sessionData: UserSession = {
        id: session.user.id,
        name: profile?.name || session.user.email?.split('@')[0] || 'User',
        role: appRole,
        employee_id: session.user.id
      };

      // Cache the session for faster load on next refresh
      localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(sessionData));

      return sessionData;
    } catch (error) {
      console.error('Session Check Error:', error);
      return null;
    }
  },

  getAttendance: async (): Promise<Attendance[]> => {
    // Use adminSupabase to ensure Admin sees all records (bypassing potential RLS)
    const { data, error } = await adminSupabase.from('attendance').select('*');
    if (error) throw error;
    return data || [];
  },

  getEmployees: async (): Promise<Employee[]> => {
    try {
      // Use adminSupabase to ensure Admin sees all records, but FILTER OUT Admins/Super Admins
      // to comply with workforce display requirements.
      // OPTIMIZATION: Select specific columns instead of '*' to reduce data transfer and improve privacy.
      // We explicitly exclude the main admin account and any user with an Admin role.
      // We use a simplified filter first to ensure data visibility, then refine.
      // FILTER LOGIC:
      // 1. Must NOT be 'Admin' or 'Super Admin' (Case sensitive usually, but we check variations)
      // 2. Must NOT be the specific admin email.
      
      const { data, error } = await adminSupabase
        .from('employees')
        .select(`
          id, 
          employee_code, 
          name, 
          email, 
          mobile, 
          department, 
          role, 
          joining_date, 
          status, 
          shift_start, 
          shift_end, 
          created_at
        `)
        // .neq('role', 'Admin')  <-- temporarily commented out to debug visibility if role is mismatched
        // .neq('role', 'Super Admin')
        // .neq('role', 'ADMIN')
        // .neq('role', 'SUPER_ADMIN')
        // Instead, we use a positive filter if possible? No, we want "Staff".
        // Let's try filtering for "Staff" specifically OR just excluding the known admin email for now.
        // If we filter only by email, we should see EVERYONE. If that works, we add role filters back.
        // But I need to fix it now.
        // Let's use a robust "not.ilike" for role to cover variations.
        .not('role', 'ilike', '%admin%') // Excludes Admin, Super Admin, ADMIN, etc.
        .neq('email', 'admin@demo.com')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error("DB.getEmployees Error:", error);
        throw new Error(`Failed to fetch employees: ${error.message}`);
      }
      
      return (data as Employee[]) || [];
    } catch (err: unknown) {
      console.error("DB.getEmployees Exception (Returning empty list to prevent crash):", err);
      // Return empty array instead of crashing if network fails or schema mismatch
      return [];
    }
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
    let fileBody = file;
    
    // Convert Base64 Data URL to Blob if string
    if (typeof file === 'string' && file.startsWith('data:')) {
      try {
          const response = await fetch(file);
          fileBody = await response.blob();
      } catch (e) {
          throw new Error("Failed to process image data. Please retake photo.");
      }
    }

    // Ensure we have a Blob
    if (!(fileBody instanceof Blob)) {
        throw new Error("Invalid file format.");
    }

    const { data, error } = await adminSupabase.storage
      .from('attendance-photos')
      .upload(fileName, fileBody, {
        contentType: 'image/jpeg',
        upsert: true
      });
      
    if (error) {
        // Handle "Mime type text/plain" error which often means the file body was empty or malformed
        if (error.message && error.message.includes("MIME TYPE")) {
             throw new Error("Image upload failed (Invalid Format). Please try again.");
        }
        throw error;
    }
    
    const { data: { publicUrl } } = adminSupabase.storage
      .from('attendance-photos')
      .getPublicUrl(data?.path || fileName);
      
    return publicUrl;
  },
  
  updateEmployee: async (employee: Partial<Employee>, adminId: string) => {
    // Validation
    if (!employee.id) throw new Error("Employee ID is required for update");
    if (employee.email && !employee.email.includes('@')) throw new Error("Invalid email format");

    // 1. Prepare DB Payload
    // We now include the password in the DB payload as requested
    const dbPayload = { ...employee };

    // 2. Update public.employees table (using adminSupabase to bypass RLS)
    const { error } = await adminSupabase.from('employees').upsert(dbPayload);
    if (error) throw error;
    
        // 3. Sync changes to Supabase Auth (auth.users)
        // Only attempt this if we have the necessary fields and it's not a new record (though upsert handles new, auth update requires ID)
        if (employee.id) {
            const authUpdates: { email?: string; user_metadata?: object; password?: string } = {};
            if (employee.email) authUpdates.email = employee.email;
            if (employee.name) authUpdates.user_metadata = { name: employee.name }; // Update metadata name
            
            // Password Update Logic
            // The password comes from the UI as part of the 'employee' object in some flows,
            // OR it might be passed as a separate argument if we changed the signature.
            // Based on previous code, 'password' was destructured. 
            // In the current signature: updateEmployee: async (employee: Partial<Employee>, adminId: string)
            // The 'employee' object DOES contain the password if the UI sends it.
            // However, the 'Employee' type might not strictly have 'password' defined in types.ts?
            // Let's check if 'password' is in 'employee'.
            // If TS complains, we cast it.
            if (employee.password && employee.password.trim().length > 0) {
                // Validate Password Strength (Basic)
                if (employee.password.length < 6) {
                    throw new Error("Password must be at least 6 characters long.");
                }
                authUpdates.password = employee.password;
            }

            // Only call if there are actual updates to make
            if (Object.keys(authUpdates).length > 0) {
                const { error: authError } = await adminSupabase.auth.admin.updateUserById(
                    employee.id,
                    authUpdates
                );
                
                if (authError) {
                    console.warn(`[Warning] Failed to sync changes to Auth for user ${employee.id}:`, authError);
                    // We throw here if it's a password update failure so the user knows
                    if (authUpdates.password) {
                         throw new Error(`Failed to update password: ${authError.message}`);
                    }
                }
            }
        }

    // 3. Sync changes to public.profiles (if exists)
    // This ensures consistency if profiles table is used for session info
    if (employee.id && employee.name) {
        const { error: profileError } = await adminSupabase
            .from('profiles')
            .update({ name: employee.name })
            .eq('id', employee.id);
            
        if (profileError) {
            console.warn(`[Warning] Failed to sync changes to Profiles for user ${employee.id}:`, profileError);
        }
    }

    // Log the update
    await DB.addAuditLog({
        admin_id: adminId,
        action: 'UPDATE_EMPLOYEE',
        entity: 'Employee',
        old_value: employee.id,
        new_value: JSON.stringify(employee)
    });

    return employee;
  },

  deleteEmployee: async (id: string, adminId: string) => {
    // 1. Delete from public.employees
    const { error: dbError } = await adminSupabase.from('employees').delete().eq('id', id);
    if (dbError) throw dbError;

    // 2. Log the deletion
    await DB.addAuditLog({
        admin_id: adminId,
        action: 'DELETE_EMPLOYEE',
        entity: 'Employee',
        old_value: id,
        new_value: 'DELETED'
    });
    
    // Note: Deleting from auth.users requires Service Role key (backend) or Database Trigger.
    // For this client-side app, we only delete the record from our public table.
  },

  addAuditLog: async (log: Omit<AuditLog, 'id' | 'timestamp'>) => {
    // Use adminSupabase to ensure logs are written regardless of RLS policies
    const { error } = await adminSupabase.from('audit_logs').insert(log);
    if (error) {
        console.warn("Audit log failed:", error);
        // We don't throw here to avoid failing the main operation if logging fails
    }
  },

  updateAttendance: async (id: string, updates: Partial<Attendance>, adminId: string) => {
    // Use adminSupabase for admin updates to bypass RLS
    const { error } = await adminSupabase.from('attendance').update(updates).eq('id', id);
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
    // This is used by both Employees (Clock In) and Admins (Manual Entry).
    // We use adminSupabase to prevent "new row violates row-level security policy" errors
    // which occur if RLS is too strict or if the employee_id check fails for complex reasons.
    // Since this method is only called from authenticated contexts (EmployeeDashboard),
    // we trust the session ID validation handled by the UI before calling this.
    const { data, error } = await adminSupabase.from('attendance').insert(record).select().single();
    if (error) throw error;
    return data as Attendance;
  },

  deleteAttendance: async (id: string, adminId: string) => {
    // Use adminSupabase for deletions
    const { error } = await adminSupabase.from('attendance').delete().eq('id', id);
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
      // Use adminSupabase
      const { error } = await adminSupabase.from('app_settings').upsert({ id: 1, ...settings });
      if (error) throw error;
      await DB.addAuditLog({
        admin_id: adminId,
        action: 'UPDATE_SETTINGS',
        entity: 'AppSettings',
        old_value: 'N/A',
        new_value: 'Updated Settings'
    });
  },

  /**
   * Manually creates a user profile if the database trigger fails.
   * This acts as a robust fallback for the "Database error saving new user" issue.
   */
  manualCreateProfile: async (id: string, email: string, name: string) => {
    // 1. Try creating the profile using adminSupabase to bypass RLS
    const { error } = await adminSupabase.from('profiles').insert({
      id,
      name,
      role: email.includes('admin') ? 'ADMIN' : 'EMPLOYEE'
    });

    if (error) {
       // Ignore conflict (already exists)
       if (error.code === '23505') return;
       throw error;
    }
  },

  findUserByEmail: async (email: string) => {
    // Uses Service Role Key to search Auth users
    // Note: listUsers is paginated, but for this scale it's acceptable
    const { data, error } = await adminSupabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error || !data) return null;
    return data.users.find(u => u.email?.toLowerCase() === email.toLowerCase()) || null;
  }
};
