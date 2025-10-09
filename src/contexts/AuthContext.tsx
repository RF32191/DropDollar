'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';

// User interface
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  role: 'buyer' | 'seller' | 'admin';
  avatar?: string;
  phone?: string;
  location?: string;
  createdAt: string;
  lastLoginAt: string;
  isVerified: boolean;
  preferences: {
    theme: 'light' | 'dark' | 'system';
    notifications: boolean;
    marketing: boolean;
  };
}

// Registration parameters
export interface RegisterParams {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  username: string;
  phone?: string;
  location?: string;
  role?: 'buyer' | 'seller';
  marketingConsent?: boolean;
}

// Authentication context type
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  sessionExpiry: Date | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (params: RegisterParams) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  refreshSession: () => Promise<void>;
  extendSession: () => Promise<void>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  loginWithGitHub: () => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  forceLogout: () => Promise<void>;
  clearAllAccounts: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Session timeout constants
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const WARNING_TIME = 5 * 60 * 1000; // 5 minutes before timeout
const REFRESH_INTERVAL = 5 * 60 * 1000; // Refresh every 5 minutes

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionExpiry, setSessionExpiry] = useState<Date | null>(null);

  // Session management
  useEffect(() => {
    let sessionTimer: NodeJS.Timeout;
    let refreshTimer: NodeJS.Timeout;

    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        
        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          setUser(null);
          setIsAuthenticated(false);
          return;
        }

        if (session?.user) {
          await loadUserProfile(session.user);
          setSessionExpiry(new Date(Date.now() + SESSION_TIMEOUT));
          startSessionTimers();
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    const startSessionTimers = () => {
      // Clear existing timers
      if (sessionTimer) clearTimeout(sessionTimer);
      if (refreshTimer) clearInterval(refreshTimer);

      // Set session timeout
      sessionTimer = setTimeout(() => {
        console.log('Session expired - logging out');
        logout();
      }, SESSION_TIMEOUT);

      // Set refresh interval
      refreshTimer = setInterval(async () => {
        await refreshSession();
      }, REFRESH_INTERVAL);
    };

    const loadUserProfile = async (supabaseUser: SupabaseUser) => {
      try {
        // Get user profile from database
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', supabaseUser.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error loading user profile:', error);
          return;
        }

        const userData: User = {
          id: supabaseUser.id,
          email: supabaseUser.email || '',
          firstName: profile?.first_name || '',
          lastName: profile?.last_name || '',
          username: profile?.username || '',
          role: profile?.role || 'buyer',
          avatar: profile?.avatar_url,
          phone: profile?.phone,
          location: profile?.location,
          createdAt: supabaseUser.created_at,
          lastLoginAt: new Date().toISOString(),
          isVerified: supabaseUser.email_confirmed_at ? true : false,
          preferences: {
            theme: profile?.theme_preference || 'system',
            notifications: profile?.notifications_enabled ?? true,
            marketing: profile?.marketing_consent ?? false,
          },
        };

        setUser(userData);
        setIsAuthenticated(true);

        // Update last login
        await supabase
          .from('user_profiles')
          .upsert({
            id: supabaseUser.id,
            last_login_at: new Date().toISOString(),
          });

      } catch (error) {
        console.error('Error loading user profile:', error);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.email);
      
      if (event === 'SIGNED_IN' && session?.user) {
        await loadUserProfile(session.user);
        setSessionExpiry(new Date(Date.now() + SESSION_TIMEOUT));
        startSessionTimers();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsAuthenticated(false);
        setSessionExpiry(null);
        if (sessionTimer) clearTimeout(sessionTimer);
        if (refreshTimer) clearInterval(refreshTimer);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        console.log('Token refreshed for user:', session.user.email);
        setSessionExpiry(new Date(Date.now() + SESSION_TIMEOUT));
        startSessionTimers();
      }
    });

    return () => {
      subscription.unsubscribe();
      if (sessionTimer) clearTimeout(sessionTimer);
      if (refreshTimer) clearInterval(refreshTimer);
    };
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        await loadUserProfile(data.user);
        setSessionExpiry(new Date(Date.now() + SESSION_TIMEOUT));
        return { success: true };
      }

      return { success: false, error: 'Login failed' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (params: RegisterParams): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);

      // Validate password strength
      if (params.password.length < 8) {
        return { success: false, error: 'Password must be at least 8 characters long' };
      }

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: params.email,
        password: params.password,
        options: {
          data: {
            first_name: params.firstName,
            last_name: params.lastName,
            username: params.username,
          },
        },
      });

      if (authError) {
        return { success: false, error: authError.message };
      }

      if (authData.user) {
        // Create user profile
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            id: authData.user.id,
            email: params.email,
            first_name: params.firstName,
            last_name: params.lastName,
            username: params.username,
            phone: params.phone,
            location: params.location,
            role: params.role || 'buyer',
            theme_preference: 'system',
            notifications_enabled: true,
            marketing_consent: params.marketingConsent || false,
            created_at: new Date().toISOString(),
          });

        if (profileError) {
          console.error('Error creating user profile:', profileError);
          // Don't fail registration if profile creation fails
        }

        return { success: true };
      }

      return { success: false, error: 'Registration failed' };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setIsAuthenticated(false);
      setSessionExpiry(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updateProfile = async (updates: Partial<User>): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'No user logged in' };
    }

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          first_name: updates.firstName,
          last_name: updates.lastName,
          username: updates.username,
          phone: updates.phone,
          location: updates.location,
          avatar_url: updates.avatar,
          theme_preference: updates.preferences?.theme,
          notifications_enabled: updates.preferences?.notifications,
          marketing_consent: updates.preferences?.marketing,
        })
        .eq('id', user.id);

      if (error) {
        return { success: false, error: error.message };
      }

      // Update local state
      setUser(prev => prev ? { ...prev, ...updates } : null);
      return { success: true };
    } catch (error) {
      console.error('Update profile error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  const refreshSession = async (): Promise<void> => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        console.error('Session refresh error:', error);
        await logout();
      } else if (data.session) {
        setSessionExpiry(new Date(Date.now() + SESSION_TIMEOUT));
      }
    } catch (error) {
      console.error('Session refresh error:', error);
      await logout();
    }
  };

  const extendSession = async (): Promise<void> => {
    await refreshSession();
  };

  const loginWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Google login error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  const loginWithGitHub = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('GitHub login error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Reset password error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  const updatePassword = async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Update password error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  const forceLogout = async (): Promise<void> => {
    try {
      // Clear all local storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear all cookies
      document.cookie.split(";").forEach((c) => {
        const eqPos = c.indexOf("=");
        const name = eqPos > -1 ? c.substr(0, eqPos) : c;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${window.location.hostname}`;
      });

      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Clear all state
      setUser(null);
      setIsAuthenticated(false);
      setSessionExpiry(null);
      
      // Clear any timers
      if (typeof window !== 'undefined') {
        // Clear all intervals and timeouts
        for (let i = 1; i < 10000; i++) {
          clearInterval(i);
          clearTimeout(i);
        }
      }
      
      console.log('Force logout completed - all accounts cleared');
    } catch (error) {
      console.error('Force logout error:', error);
    }
  };

  const clearAllAccounts = async (): Promise<void> => {
    try {
      // Clear all browser data
      if (typeof window !== 'undefined') {
        // Clear IndexedDB
        if ('indexedDB' in window) {
          const databases = await indexedDB.databases();
          databases.forEach(db => {
            if (db.name) {
              indexedDB.deleteDatabase(db.name);
            }
          });
        }
        
        // Clear WebSQL (if supported)
        if ('openDatabase' in window) {
          // WebSQL is deprecated but clear if exists
        }
        
        // Clear Cache API
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
        }
      }
      
      // Force logout
      await forceLogout();
      
      console.log('All accounts and data cleared');
    } catch (error) {
      console.error('Clear all accounts error:', error);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    sessionExpiry,
    login,
    register,
    logout,
    updateProfile,
    refreshSession,
    extendSession,
    loginWithGoogle,
    loginWithGitHub,
    resetPassword,
    updatePassword,
    forceLogout,
    clearAllAccounts,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}