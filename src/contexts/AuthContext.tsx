'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase/client';
import { LocationService, type LocationData } from '@/lib/locationService';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export interface User {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  full_name?: string;
  phoneNumber?: string;
  phone?: string;
  role: 'buyer' | 'seller' | 'admin';
  account_type: 'buyer' | 'seller' | 'admin';
  tokens: number;
  balance: number;
  isVerified: boolean;
  verification_status: 'unverified' | 'pending' | 'verified';
  phoneVerified: boolean;
  twoFactorEnabled: boolean;
  createdAt: Date;
  created_at: string;
  lastLogin?: Date;
  last_login?: string;
  avatar_url?: string;
  is_active: boolean;
}

interface RegisterParams {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phoneNumber?: string;
  password: string;
  role?: 'buyer' | 'seller' | 'admin';
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  loginWithGitHub: () => Promise<{ success: boolean; error?: string }>;
  register: (params: RegisterParams) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (updates: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
  role: 'buyer' | 'seller' | 'admin';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user session on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        
        // Get current session from storage
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          setUser(null);
          setIsLoading(false);
          return;
        }

        if (session?.user) {
          console.log('Found existing session for user:', session.user.email);
          await loadUserProfile(session.user);
        } else {
          console.log('No existing session found');
          setUser(null);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.email);
      
      if (event === 'SIGNED_IN' && session?.user) {
        await loadUserProfile(session.user);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        // Clear any cached data
        localStorage.removeItem('user_location_data');
        localStorage.removeItem('location_permission_granted');
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        console.log('Token refreshed for user:', session.user.email);
        await loadUserProfile(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (supabaseUser: SupabaseUser) => {
    try {
      console.log('Loading profile for user:', supabaseUser.email);
      
      // Try to get user profile from our users table
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching user profile:', profileError);
      }

      // Get user balance
      const { data: balance, error: balanceError } = await supabase
        .from('user_balances')
        .select('*')
        .eq('user_id', supabaseUser.id)
        .single();

      if (balanceError && balanceError.code !== 'PGRST116') {
        console.error('Error fetching user balance:', balanceError);
      }

      // Create combined user object
      const combinedUser: User = {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        username: userProfile?.username || supabaseUser.user_metadata?.username || '',
        firstName: userProfile?.first_name || supabaseUser.user_metadata?.first_name || '',
        lastName: userProfile?.last_name || supabaseUser.user_metadata?.last_name || '',
        full_name: userProfile ? `${userProfile.first_name} ${userProfile.last_name}` : '',
        phoneNumber: userProfile?.phone_number || '',
        phone: userProfile?.phone_number || '',
        role: (userProfile?.role as 'buyer' | 'seller' | 'admin') || 'buyer',
        account_type: (userProfile?.role as 'buyer' | 'seller' | 'admin') || 'buyer',
        tokens: balance?.drop_tokens || 0,
        balance: balance?.cash_balance_usd || 0,
        isVerified: userProfile?.is_verified || false,
        verification_status: userProfile?.is_verified ? 'verified' : 'unverified',
        phoneVerified: false,
        twoFactorEnabled: false,
        createdAt: new Date(userProfile?.created_at || supabaseUser.created_at),
        created_at: userProfile?.created_at || supabaseUser.created_at,
        lastLogin: userProfile?.last_login ? new Date(userProfile.last_login) : undefined,
        last_login: userProfile?.last_login || undefined,
        avatar_url: userProfile?.avatar_url || supabaseUser.user_metadata?.avatar_url,
        is_active: userProfile?.is_active !== false
      };
      
      console.log('User profile loaded successfully:', combinedUser.email);
      setUser(combinedUser);
    } catch (error) {
      console.error('Error loading user profile:', error);
      // Don't set user to null here, as we might still have a valid auth user
      // Create a minimal user object from Supabase auth data
      const minimalUser: User = {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        username: supabaseUser.user_metadata?.username || '',
        firstName: supabaseUser.user_metadata?.first_name || '',
        lastName: supabaseUser.user_metadata?.last_name || '',
        full_name: `${supabaseUser.user_metadata?.first_name || ''} ${supabaseUser.user_metadata?.last_name || ''}`.trim(),
        phoneNumber: '',
        phone: '',
        role: 'buyer',
        account_type: 'buyer',
        tokens: 0,
        balance: 0,
        isVerified: false,
        verification_status: 'unverified',
        phoneVerified: false,
        twoFactorEnabled: false,
        createdAt: new Date(supabaseUser.created_at),
        created_at: supabaseUser.created_at,
        lastLogin: undefined,
        last_login: undefined,
        avatar_url: supabaseUser.user_metadata?.avatar_url,
        is_active: true
      };
      setUser(minimalUser);
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('🔐 Starting login for:', email);
      setIsLoading(true);

      // Validate input
      if (!email || !password) {
        return { success: false, error: 'Email and password are required' };
      }

      // Sign in with Supabase Auth
      console.log('📡 Attempting Supabase authentication...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      });

      if (error) {
        console.error('❌ Supabase auth error:', error);
        
        // Provide user-friendly error messages
        let friendlyError = error.message;
        if (error.message.includes('Invalid login credentials')) {
          friendlyError = 'Invalid email or password. Please check your credentials and try again.';
        } else if (error.message.includes('Email not confirmed')) {
          friendlyError = 'Please check your email and click the confirmation link before signing in.';
        } else if (error.message.includes('Too many requests')) {
          friendlyError = 'Too many login attempts. Please wait a few minutes and try again.';
        }
        
        return { success: false, error: friendlyError };
      }

      if (!data.user || !data.session) {
        console.error('❌ No user or session returned from Supabase');
        return { success: false, error: 'Authentication failed - no user session created' };
      }

      console.log('✅ Supabase authentication successful');
      console.log('👤 User ID:', data.user.id);
      console.log('📧 User email:', data.user.email);

      // Load user profile - this will set the user state
      console.log('📋 Loading user profile...');
      await loadUserProfile(data.user);

      console.log('🎉 Login completed successfully');
      
      // Force a small delay to ensure state is updated
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return { success: true };
    } catch (error: any) {
      console.error('💥 Unexpected login error:', error);
      return { 
        success: false, 
        error: `Login failed: ${error.message || 'An unexpected error occurred'}` 
      };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (params: RegisterParams): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);

      const { firstName, lastName, username, email, phoneNumber, password, role = 'buyer' } = params;

      // Check location eligibility with improved error handling
      console.log('Starting location check...');
      let locationResult;
      
      try {
        locationResult = await LocationService.checkCurrentLocationAllowed();
        console.log('Location check result:', locationResult);
      } catch (error) {
        console.error('Location check failed:', error);
        return { 
          success: false, 
          error: 'Location verification failed. Please ensure location services are enabled and try again.' 
        };
      }
      
      if (!locationResult.allowed) {
        return { 
          success: false, 
          error: `Registration not available: ${locationResult.message || 'Location verification failed'}` 
        };
      }

      console.log('Location check passed, proceeding with registration...');

      // Check if username is available directly with Supabase
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .single();

      if (existingUser) {
        return { success: false, error: 'Username is already taken' };
      }

      // Use our API route instead of direct Supabase call
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          firstName,
          lastName,
          username,
          phoneNumber,
          role,
          location: locationResult.location // Include location data
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        return { success: false, error: result.error || 'Registration failed' };
      }

      // If registration was successful, try to sign in
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        // Registration succeeded but login failed - that's ok, user needs to verify email
        return { success: true };
      }

      if (data.user) {
        await loadUserProfile(data.user);
      }

      return { success: true };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'An unexpected error occurred during registration' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      // Clear location data on logout for privacy
      LocationService.clearStoredLocation();
      
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });

      if (error) {
        console.error('Password reset error:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Password reset error:', error);
      return { success: false, error: 'An unexpected error occurred while sending reset email' };
    }
  };

  const updatePassword = async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        console.error('Password update error:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Password update error:', error);
      return { success: false, error: 'An unexpected error occurred while updating password' };
    }
  };

  const updateProfile = async (updates: Partial<User>): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'No user logged in' };
    }

    try {
      // Update user profile in our users table
      const { error } = await supabase
        .from('users')
        .update({
          username: updates.username,
          first_name: updates.firstName,
          last_name: updates.lastName,
          phone_number: updates.phoneNumber,
          avatar_url: updates.avatar_url
        })
        .eq('id', user.id);
      
      if (error) {
        console.error('Error updating profile:', error);
        return { success: false, error: 'Failed to update profile' };
      }

      // Reload user profile to get updated data
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();
      if (supabaseUser) {
        await loadUserProfile(supabaseUser);
      }
      return { success: true };
    } catch (error) {
      console.error('Update profile error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  const refreshUser = async (): Promise<void> => {
    if (!user) return;

    try {
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();
      if (supabaseUser) {
        await loadUserProfile(supabaseUser);
      }
    } catch (error) {
      console.error('Refresh user error:', error);
    }
  };

  // OAuth Login Methods
  const loginWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        console.error('Google login error:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Google login error:', error);
      return { success: false, error: 'An unexpected error occurred during Google login' };
    }
  };

  const loginWithGitHub = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        console.error('GitHub login error:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      console.error('GitHub login error:', error);
      return { success: false, error: 'An unexpected error occurred during GitHub login' };
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    loginWithGoogle,
    loginWithGitHub,
    register,
    logout,
    resetPassword,
    updatePassword,
    updateProfile,
    refreshUser,
    role: user?.role || 'buyer'
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