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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const INACTIVITY_TIMEOUT = 3 * 60 * 60 * 1000; // 3 hours in milliseconds

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastActivity, setLastActivity] = useState(Date.now());

  // Check for inactivity timeout
  useEffect(() => {
    const checkInactivity = () => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivity;
      
      if (isAuthenticated && timeSinceLastActivity > INACTIVITY_TIMEOUT) {
        console.log('⏰ Session timed out due to inactivity');
        logout();
      }
    };

    const interval = setInterval(checkInactivity, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [isAuthenticated, lastActivity]);

  // Update last activity on user interaction
  useEffect(() => {
    const updateActivity = () => {
      setLastActivity(Date.now());
      if (isAuthenticated) {
        localStorage.setItem('lastActivity', Date.now().toString());
      }
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

  // Initialize authentication on mount
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      console.log('🔐 Initializing authentication...');
      
      // Check for remember me preference
      const rememberMe = localStorage.getItem('rememberMe') === 'true';
      console.log('Remember me:', rememberMe);

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
          console.log('🧹 Clearing corrupted localStorage data...');
          localStorage.clear();
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
      console.log('🔍 [AuthContext] Loading user profile for ID:', userId);
      
      // First, get the auth user to get the email
      const { data: authUser, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser.user) {
        console.error('❌ [AuthContext] Error getting auth user:', authError);
        return;
      }
      
      const userEmail = authUser.user.email;
      console.log('📧 [AuthContext] Auth user email:', userEmail);
      
      // Use UserService to get profile by email (ensures we get the right user)
      const profile = await UserService.getUserProfileByEmail(userEmail);
      
      if (!profile) {
        console.error('❌ [AuthContext] No user profile found for email:', userEmail);
        return;
      }
      
      setUser(profile);
      setIsAuthenticated(true);
      setIsLoading(false); // Stop loading immediately!
      
      // Store in localStorage for faster access
      localStorage.setItem('user', JSON.stringify(profile));
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('userId', profile.id);
      localStorage.setItem('userEmail', profile.email);
      localStorage.setItem('lastActivity', Date.now().toString());
      
      // Dispatch event for instant wallet display
      window.dispatchEvent(new CustomEvent('userProfileLoaded', {
        detail: {
          user: profile,
          purchased_tokens: profile.purchased_tokens || 0,
          won_tokens: profile.won_tokens || 0,
          totalBalance: (profile.purchased_tokens || 0) + (profile.won_tokens || 0)
        }
      }));
      
      console.log('✅ [AuthContext] User profile loaded successfully:', {
        id: profile.id,
        email: profile.email,
        username: profile.username,
        purchased: profile.purchased_tokens,
        won: profile.won_tokens,
        total: (profile.purchased_tokens || 0) + (profile.won_tokens || 0)
      });
      
    } catch (error) {
      console.error('❌ [AuthContext] Failed to load user profile:', error);
    }
  };

  const login = async (email: string, password: string, rememberMe: boolean = true) => {
    try {
      console.log('🔐 Logging in:', email);
      
      // Clear previous user data first to prevent cross-contamination
      console.log('🧹 Clearing previous user data...');
      setUser(null);
      setIsAuthenticated(false);
      
      // Clear all localStorage items that might contain user-specific data
      localStorage.removeItem('user');
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('userId');
      localStorage.removeItem('sessionId');
      localStorage.removeItem('loginTime');
      localStorage.removeItem('lastActivity');
      
      // Clear ALL localStorage data to prevent any cross-contamination
      console.log('🧹 Clearing ALL localStorage data to prevent cross-contamination...');
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log('🧹 Removed localStorage key:', key);
      });
      
      // Also clear sessionStorage
      sessionStorage.clear();
      console.log('🧹 Cleared sessionStorage');
      
      // Clear cookies
      document.cookie = 'dropdollar_session=; path=/; max-age=0';
      document.cookie = 'dropdollar_user=; path=/; max-age=0';
      document.cookie = 'dropdollar_remember=; path=/; max-age=0';
      
      console.log('✅ Previous user data cleared');
      
      // Try Supabase authentication
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Supabase login error:', error);
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

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshUser,
    updateTokens,
    refreshTokens,
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
