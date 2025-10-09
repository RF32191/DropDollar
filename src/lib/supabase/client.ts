import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Helper function to check if Supabase is configured
export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseAnonKey);
};

// Create a mock client if Supabase is not configured
const createMockClient = () => {
  return {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      signInWithPassword: () => Promise.resolve({ data: { user: null }, error: { message: 'Supabase not configured' } }),
      signUp: () => Promise.resolve({ data: { user: null }, error: { message: 'Supabase not configured' } }),
      signOut: () => Promise.resolve({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      resetPasswordForEmail: () => Promise.resolve({ error: { message: 'Supabase not configured' } }),
      updateUser: () => Promise.resolve({ error: { message: 'Supabase not configured' } }),
      refreshSession: () => Promise.resolve({ data: { session: null }, error: { message: 'Supabase not configured' } }),
      signInWithOAuth: () => Promise.resolve({ error: { message: 'Supabase not configured' } }),
    },
    from: () => ({
      select: () => Promise.resolve({ data: [], error: { message: 'Supabase not configured' } }),
      insert: () => Promise.resolve({ data: [], error: { message: 'Supabase not configured' } }),
      update: () => Promise.resolve({ data: [], error: { message: 'Supabase not configured' } }),
      upsert: () => Promise.resolve({ data: [], error: { message: 'Supabase not configured' } }),
      delete: () => Promise.resolve({ data: [], error: { message: 'Supabase not configured' } }),
      eq: () => ({ select: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }) }),
    }),
  };
};

// Export the appropriate client
export const supabase = isSupabaseConfigured() 
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        storageKey: 'dropdollar-auth-token',
        flowType: 'pkce'
      }
    })
  : createMockClient() as any;