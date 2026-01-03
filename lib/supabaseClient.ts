
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// A robust mock that returns standard objects instead of infinite Proxies
// to avoid "Cannot convert object to primitive value" errors.
const createMockSupabaseClient = () => {
  console.warn("Supabase credentials missing. Using local simulation mode.");
  
  const mockResult = { data: null, error: null };
  const mockAuth = {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signInWithPassword: () => Promise.resolve({ data: { user: null }, error: null }),
    signOut: () => Promise.resolve({ error: null })
  };

  const mockStorage = {
    from: () => ({
      upload: () => Promise.resolve({ data: { path: 'mock-path' }, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: '' } })
    })
  };

  const chain = {
    select: () => chain,
    insert: () => chain,
    update: () => chain,
    upsert: () => chain,
    delete: () => chain,
    eq: () => chain,
    single: () => Promise.resolve(mockResult),
    order: () => chain,
    then: (resolve: any) => resolve(mockResult)
  };

  return {
    auth: mockAuth,
    storage: mockStorage,
    from: () => chain,
    channel: () => ({
      on: () => ({
        subscribe: (cb: any) => { cb('SUBSCRIBED'); return { unsubscribe: () => {} }; }
      })
    }),
    removeChannel: () => {}
  } as any;
};

export const supabase = (supabaseUrl && supabaseAnonKey && supabaseUrl !== 'undefined') 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : createMockSupabaseClient();
