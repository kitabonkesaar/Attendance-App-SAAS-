
import { createClient } from '@supabase/supabase-js';

// Use Vite's import.meta.env for environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://bnyiujoijyftorvvycuz.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJueWl1am9panlmdG9ydnZ5Y3V6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MjI1MTEsImV4cCI6MjA4Mjk5ODUxMX0.dCX6BZBjYeD8nF4nc9HdesKHy-RdK1DWaieavsr1slE";
// Temporarily hardcoded for immediate fix without restart
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJueWl1am9panlmdG9ydnZ5Y3V6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQyMjUxMSwiZXhwIjoyMDgyOTk4NTExfQ.r-VQMDBGkkIRangrxc6r0OFMGSC5bGZjyHCN-kU2sS4";

console.log('Supabase Config:', {
  url: !!supabaseUrl,
  anonKey: !!supabaseAnonKey,
  serviceKey: !!supabaseServiceKey
});

// --- Mock Implementation ---

const MOCK_STORAGE_KEY = 'mock_supabase_data';
const MOCK_SESSION_KEY = 'mock_supabase_session';

const getMockData = () => {
  const data = localStorage.getItem(MOCK_STORAGE_KEY);
  return data ? JSON.parse(data) : { profiles: [], employees: [], attendance: [], app_settings: [] };
};

const setMockData = (data: any) => {
  localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(data));
};

const getMockSession = () => {
  const session = localStorage.getItem(MOCK_SESSION_KEY);
  return session ? JSON.parse(session) : null;
};

const setMockSession = (session: any) => {
  if (session) {
    localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(MOCK_SESSION_KEY);
  }
};

const createMockSupabaseClient = () => {
  console.warn("Supabase credentials missing or invalid. Using robust local simulation mode.");

  // Ensure basic mock data exists
  const initMockData = getMockData();
  if (!initMockData.profiles || initMockData.profiles.length === 0) {
    // Seed some initial data if empty
    const adminId = 'mock-admin-id';
    const employeeId = 'mock-employee-id';
    
    initMockData.profiles = [
      { id: adminId, name: 'Admin User', role: 'ADMIN', email: 'admin@demo.com' },
      { id: employeeId, name: 'Staff User', role: 'EMPLOYEE', email: 'staff@demo.com' }
    ];
    setMockData(initMockData);
  }

  const mockAuth = {
    getSession: async () => {
      const session = getMockSession();
      return { data: { session }, error: null };
    },
    onAuthStateChange: (callback: any) => {
      // In a real mock, we'd trigger this on login/logout. 
      // For now, we just return a subscription.
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
    signInWithPassword: async ({ email, password }: any) => {
        // Simple mock authentication
        if (email === 'admin@demo.com' && password === 'Admin@123') {
            const user = { id: 'mock-admin-id', email, role: 'authenticated' };
            const session = { user, access_token: 'mock-token' };
            setMockSession(session);
            return { data: { user, session }, error: null };
        }
        if (email === 'staff@demo.com' && password === 'Staff@123') {
            const user = { id: 'mock-employee-id', email, role: 'authenticated' };
            const session = { user, access_token: 'mock-token' };
            setMockSession(session);
            return { data: { user, session }, error: null };
        }
        return { data: { user: null, session: null }, error: { message: 'Invalid login credentials' } };
    },
    signUp: async ({ email, password, options }: any) => {
        // Mock sign up
        const userId = Math.random().toString(36).substring(7);
        const user = { 
            id: userId, 
            email, 
            role: 'authenticated',
            user_metadata: options?.data || {} 
        };
        
        // In a real app, we might sign them in automatically, or require email verification.
        // For this mock, let's just return the user data.
        return { data: { user, session: null }, error: null };
    },
    signOut: async () => {
      setMockSession(null);
      return { error: null };
    }
  };

  const mockStorage = {
    from: (bucket: string) => ({
      upload: async (path: string, file: any) => {
        console.log(`[Mock] Uploaded ${path} to ${bucket}`);
        return { data: { path }, error: null };
      },
      getPublicUrl: (path: string) => ({
        data: { publicUrl: `https://mock-storage.com/${bucket}/${path}` }
      })
    })
  };

  // Helper to simulate query building
  const createQueryBuilder = (table: string) => {
    let currentData = getMockData()[table] || [];
    let error: any = null;
    let singleResult = false;

    const builder = {
      select: (columns: string = '*') => {
        // In a real mock, we'd parse columns. For now, return all.
        return builder;
      },
      insert: (rows: any) => {
         const data = getMockData();
         if (!data[table]) data[table] = [];
         const newRows = Array.isArray(rows) ? rows : [rows];
         // Add IDs if missing
         newRows.forEach((r: any) => {
             if(!r.id) r.id = Math.random().toString(36).substring(7);
             data[table].push(r);
         });
         setMockData(data);
         return builder;
      },
      upsert: (rows: any) => {
        const data = getMockData();
        if (!data[table]) data[table] = [];
        const newRows = Array.isArray(rows) ? rows : [rows];
        
        newRows.forEach((newRow: any) => {
            const idx = data[table].findIndex((r: any) => r.id === newRow.id);
            if (idx >= 0) {
                data[table][idx] = { ...data[table][idx], ...newRow };
            } else {
                data[table].push(newRow);
            }
        });
        setMockData(data);
        return builder;
      },
      update: (updates: any) => {
          // This is tricky without knowing which rows to update (needs .eq first)
          // We'll store the updates and apply them in .eq or .then
          // Simplification: We only support update after eq
          (builder as any)._pendingUpdate = updates;
          return builder;
      },
      eq: (column: string, value: any) => {
        if ((builder as any)._pendingUpdate) {
             const data = getMockData();
             if (data[table]) {
                 data[table] = data[table].map((row: any) => {
                     if (row[column] === value) {
                         return { ...row, ...(builder as any)._pendingUpdate };
                     }
                     return row;
                 });
                 setMockData(data);
             }
        }
        
        currentData = currentData.filter((row: any) => row[column] === value);
        return builder;
      },
      single: () => {
        singleResult = true;
        return builder;
      },
      maybeSingle: () => {
        singleResult = true;
        return builder;
      },
      order: (column: string, { ascending = true }: any = {}) => {
        currentData.sort((a: any, b: any) => {
            if (a[column] < b[column]) return ascending ? -1 : 1;
            if (a[column] > b[column]) return ascending ? 1 : -1;
            return 0;
        });
        return builder;
      },
      // Promise interface
      then: (resolve: any, reject: any) => {
        const result = singleResult ? (currentData[0] || null) : currentData;
        resolve({ data: result, error });
      }
    };
    return builder;
  };

  return {
    auth: mockAuth,
    storage: mockStorage,
    from: (table: string) => createQueryBuilder(table),
    channel: () => ({
      on: () => ({
        subscribe: (cb: any) => { cb('SUBSCRIBED'); return { unsubscribe: () => {} }; }
      })
    }),
    removeChannel: () => {}
  } as any;
};

// Revert to default localStorage for reliability
// Cookies have a 4KB limit which Supabase sessions often exceed, causing persistence failure
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      }
    }) 
  : createMockSupabaseClient();

export const adminSupabase = (supabaseUrl && supabaseServiceKey)
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      }
    })
  : supabase;
