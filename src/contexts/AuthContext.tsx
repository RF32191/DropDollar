'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase/client';
import { UserProfile, UserService } from '@/lib/supabase/userService';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateTokens: (newBalance: number) => Promise<void>;
  refreshTokens: () => Promise<number>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const INACTIVITY_TIMEOUT = 3 * 60 * 60 * 1000; // 3 hours in milliseconds

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastActivity, setLastActivity] = useState(Date.now());

  // Initialize authentication on mount
  useEffect(() => {
    console.log('🔐 [AuthContext] Initializing authentication...');
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      console.log('🔐 [AuthContext] Starting initializeAuth...');
      setIsLoading(true); // Ensure loading is true at start
      
      // Check for remember me preference
      const rememberMe = localStorage.getItem('rememberMe') === 'true';
      console.log('🔐 [AuthContext] Remember me:', rememberMe);

      // INSTANT DISPLAY: Load from localStorage FIRST for immediate UI
      const storedUser = localStorage.getItem('user');
      const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
      const lastActivityStr = localStorage.getItem('lastActivity');
      
      if (storedUser && isLoggedIn) {
        const userData = JSON.parse(storedUser);
        
        // CRITICAL: Validate that user ID is a proper UUID, not old format
        const isValidUUID = (id: string) => {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          return uuidRegex.test(id);
        };
        
        if (!userData.id || !isValidUUID(userData.id)) {
          console.error('❌ [AuthContext] Invalid user ID format (not a UUID):', userData.id);
          console.log('🧹 Clearing corrupted user data (preserving Supabase auth)...');
          // CRITICAL: Only clear OUR data, NOT Supabase auth tokens!
          const appKeys = ['user', 'isLoggedIn', 'userId', 'userEmail', 'sessionId', 'loginTime', 'lastActivity', 'rememberMe'];
          appKeys.forEach(key => localStorage.removeItem(key));
          setIsLoading(false);
          return;
        }
        
        // Check if session has expired due to inactivity
        if (lastActivityStr) {
          const lastActivityTime = parseInt(lastActivityStr);
          const timeSinceLastActivity = Date.now() - lastActivityTime;
          
          if (!rememberMe || timeSinceLastActivity > INACTIVITY_TIMEOUT) {
            console.log('⏰ Session expired');
            await logout();
            setIsLoading(false);
            return;
          }
        }
        
        // INSTANT DISPLAY: Show user immediately from cache
        setUser(userData);
        setIsAuthenticated(true);
        setIsLoading(false); // UI shows instantly!
        console.log('⚡ INSTANT user display from localStorage:', userData.email);
        
        // BACKGROUND REFRESH: Update from database without blocking UI
        const refreshUserInBackground = async () => {
          try {
            // Check for existing Supabase session
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (error) {
              console.error('Session error:', error);
              return;
            }

            if (session?.user) {
              console.log('🔄 Background: Found Supabase session:', session.user.email);
              await loadUserProfile(session.user.id);
            } else {
              // Try to load profile by user ID
              const profile = await UserService.getUserProfile(userData.id);
              if (profile) {
                setUser(profile);
                console.log('🔄 Background: Updated user profile from Supabase');
              }
            }
          } catch (error) {
            console.error('❌ Background refresh error:', error);
            // User already displayed from cache, so no problem
          }
        };
        
        // Refresh in background without blocking display
        refreshUserInBackground();
        return; // Return early, user is already displayed
      }
      
      // No cached user, check Supabase session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Session error:', error);
        setIsLoading(false);
        return;
      }

      if (session?.user) {
        console.log('✅ Found Supabase session:', session.user.email);
        await loadUserProfile(session.user.id);
      }
    } catch (error) {
      console.error('❌ Auth initialization error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserProfile = async (userId: string) => {
    try {
      // Get auth user email (minimal logging for speed)
      const { data: authUser, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser.user) {
        console.error('Auth error:', authError);
        setIsLoading(false);
        return;
      }
      
      // Fetch profile by email
      const profile = await UserService.getUserProfileByEmail(authUser.user.email);
      
      if (!profile) {
        console.error('No profile found');
        setIsLoading(false);
        return;
      }
      
      // Update state immediately
      setUser(profile);
      setIsAuthenticated(true);
      setIsLoading(false);
      
      // Store in localStorage (batch)
      localStorage.setItem('user', JSON.stringify(profile));
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('userId', profile.id);
      localStorage.setItem('userEmail', profile.email);
      localStorage.setItem('lastActivity', Date.now().toString());
      
      // Dispatch event for wallet
      window.dispatchEvent(new CustomEvent('userProfileLoaded', {
        detail: {
          user: profile,
          purchased_tokens: profile.purchased_tokens || 0,
          won_tokens: profile.won_tokens || 0,
          totalBalance: (profile.purchased_tokens || 0) + (profile.won_tokens || 0)
        }
      }));
      
      console.log('✅ Logged in:', profile.email);
      
    } catch (error) {
      console.error('Login error:', error);
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string, rememberMe: boolean = true) => {
    try {
      console.log('🔐 Logging in:', email);
      
      // Clear previous user data (fast, minimal logging)
      setUser(null);
      setIsAuthenticated(false);
      
      // Quick clear of app keys (no individual logging for speed)
      const appKeys = ['user', 'isLoggedIn', 'userId', 'userEmail', 'sessionId', 'loginTime', 'lastActivity'];
      appKeys.forEach(key => localStorage.removeItem(key));
      sessionStorage.clear();
      
      // Clear app cookies
      document.cookie = 'dropdollar_session=; path=/; max-age=0';
      document.cookie = 'dropdollar_user=; path=/; max-age=0';
      document.cookie = 'dropdollar_remember=; path=/; max-age=0';
      
      // Try Supabase authentication with Safari compatibility
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Login error:', error);
        
        // Safari-specific error messages
        if (isSafari && error.message.includes('storage')) {
          throw new Error('Safari Private Mode detected. Please disable Private Browsing or enable cookies in Settings.');
        }
        
        if (isSafari && error.message.includes('network')) {
          throw new Error('Network error. Please check your connection and try again.');
        }
        
        throw new Error(error.message);
      }

      if (data.user) {
        console.log('✅ Supabase login successful');
        
        // Store remember me preference BEFORE loading profile
        localStorage.setItem('rememberMe', rememberMe.toString());
        localStorage.setItem('lastActivity', Date.now().toString());
        
        // Load full user profile (this will set user, tokens, and dispatch events)
        await loadUserProfile(data.user.id);
        
        console.log('✅ Login complete, user profile loaded with wallet data');
      }
    } catch (error: any) {
      console.error('❌ Login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log('🚪 Logging out...');
      
      // Clear state first to prevent UI issues
      setUser(null);
      setIsAuthenticated(false);
      
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Clear all local storage
      localStorage.removeItem('user');
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('userId');
      localStorage.removeItem('sessionId');
      localStorage.removeItem('loginTime');
      localStorage.removeItem('rememberMe');
      localStorage.removeItem('lastActivity');
      localStorage.removeItem('userLocation');
      localStorage.removeItem('locationPermission');
      localStorage.removeItem('locationTimestamp');
      
      // Clear cookies
      document.cookie = 'dropdollar_session=; path=/; max-age=0';
      document.cookie = 'dropdollar_user=; path=/; max-age=0';
      document.cookie = 'dropdollar_remember=; path=/; max-age=0';
      
      // Dispatch logout event for other components
      window.dispatchEvent(new CustomEvent('userLoggedOut'));
      
      console.log('✅ Logged out successfully');
    } catch (error) {
      console.error('❌ Logout error:', error);
      // Still clear state even if there's an error
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  // Check for inactivity timeout (MUST be after logout is defined)
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const checkInactivity = () => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivity;
      
      if (timeSinceLastActivity > INACTIVITY_TIMEOUT) {
        console.log('⏰ Session timed out due to inactivity');
        logout();
      }
    };

    const interval = setInterval(checkInactivity, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [isAuthenticated, lastActivity]);

  // Update last activity on user interaction (MUST be after logout is defined)
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const updateActivity = () => {
      setLastActivity(Date.now());
      localStorage.setItem('lastActivity', Date.now().toString());
    };

    // Track various user activities
    window.addEventListener('mousedown', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('scroll', updateActivity);
    window.addEventListener('touchstart', updateActivity);

    return () => {
      window.removeEventListener('mousedown', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('scroll', updateActivity);
      window.removeEventListener('touchstart', updateActivity);
    };
  }, [isAuthenticated]);

  const refreshUser = async () => {
    if (!user) return;
    
    try {
      console.log('🔄 Refreshing user profile...');
      const profile = await UserService.getUserProfile(user.id);
      if (profile) {
        setUser(profile);
        localStorage.setItem('user', JSON.stringify(profile));
        console.log('✅ User profile refreshed');
      }
    } catch (error) {
      console.error('❌ Failed to refresh user profile:', error);
    }
  };

  const updateTokens = async (newBalance: number) => {
    if (!user) return;
    
    try {
      console.log('💰 Updating tokens:', newBalance);
      await UserService.updateUserTokens(user.id, newBalance);
      
      // Update local state
      const updatedUser = { ...user, tokens: newBalance };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Dispatch custom event for other components to listen
      window.dispatchEvent(new CustomEvent('tokensUpdated', { 
        detail: { newBalance, userId: user.id } 
      }));
      
      console.log('✅ Tokens updated successfully');
    } catch (error) {
      console.error('❌ Failed to update tokens:', error);
      throw error;
    }
  };

  const refreshTokens = async (): Promise<number> => {
    if (!user) return 0;
    
    try {
      console.log('🔄 Refreshing token balance...');
      const profile = await UserService.getUserProfile(user.id);
      if (profile) {
        // Calculate total from DUAL WALLET (purchased + won)
        const purchased = profile.purchased_tokens || 0;
        const won = profile.won_tokens || 0;
        const totalBalance = purchased + won;
        
        const updatedUser = { 
          ...user, 
          tokens: totalBalance, // Legacy field for backward compatibility
          purchased_tokens: purchased,
          won_tokens: won
        };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        // Dispatch custom event for other components to listen
        window.dispatchEvent(new CustomEvent('tokensRefreshed', { 
          detail: { newBalance: totalBalance, userId: user.id } 
        }));
        
        console.log('✅ Token balance refreshed:', { purchased, won, total: totalBalance });
        return totalBalance;
      }
      return (user.purchased_tokens || 0) + (user.won_tokens || 0);
    } catch (error) {
      console.error('❌ Failed to refresh tokens:', error);
      return (user.purchased_tokens || 0) + (user.won_tokens || 0);
    }
  };

  // Reset password - sends recovery email to user
  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('🔐 Sending password reset email to:', email);
      
      // Get the current site URL for the redirect
      const siteUrl = typeof window !== 'undefined' 
        ? window.location.origin 
        : 'https://www.drop-dollar.com';
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl}/auth/reset-password`,
      });

      if (error) {
        console.error('❌ Password reset error:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Password reset email sent successfully');
      return { success: true };
    } catch (error: any) {
      console.error('❌ Password reset error:', error);
      return { success: false, error: error.message || 'Failed to send reset email' };
    }
  };

  // Update password - for use after clicking reset link
  const updatePassword = async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('🔐 Updating password...');
      
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        console.error('❌ Password update error:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Password updated successfully');
      return { success: true };
    } catch (error: any) {
      console.error('❌ Password update error:', error);
      return { success: false, error: error.message || 'Failed to update password' };
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshUser,
    updateTokens,
    refreshTokens,
    resetPassword,
    updatePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
