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

// Safari detection
const isSafari = typeof navigator !== 'undefined' && 
                 /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

// Custom storage for Safari compatibility
const createSafariCompatibleStorage = () => {
  if (typeof window === 'undefined') return undefined;
  
  return {
    getItem: (key: string) => {
      try {
        return localStorage.getItem(key);
      } catch (e) {
        console.warn('localStorage.getItem failed (Safari private mode?):', e);
        return null;
      }
    },
    setItem: (key: string, value: string) => {
      try {
        localStorage.setItem(key, value);
      } catch (e) {
        console.warn('localStorage.setItem failed (Safari private mode?):', e);
        // Fallback to sessionStorage
        try {
          sessionStorage.setItem(key, value);
        } catch (e2) {
          console.error('All storage failed:', e2);
        }
      }
    },
    removeItem: (key: string) => {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.warn('localStorage.removeItem failed:', e);
      }
    }
  };
};

// Export the appropriate client
export const supabase = isSupabaseConfigured() 
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: createSafariCompatibleStorage(),
        storageKey: 'dropdollar-auth-token',
        flowType: 'pkce',
        // Safari-specific fixes
        debug: false, // Disable debug logs for performance
      },
      // Global settings
      global: {
        headers: {
          'x-client-info': 'dropdollar-web'
        }
      },
      // Realtime disabled for faster initial load
      realtime: {
        params: {
          eventsPerSecond: 2
        }
      }
    })
  : createMockClient() as any;