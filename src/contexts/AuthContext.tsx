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
      
      // Check for existing Supabase session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Session error:', error);
        setIsLoading(false);
        return;
      }

      if (session?.user) {
        console.log('✅ Found Supabase session:', session.user.email);
        await loadUserProfile(session.user.id);
      } else {
        // Check for localStorage session (fallback)
        const storedUser = localStorage.getItem('user');
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        const lastActivityStr = localStorage.getItem('lastActivity');
        
        if (storedUser && isLoggedIn) {
          const userData = JSON.parse(storedUser);
          
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
          
          console.log('✅ Found localStorage session:', userData.email);
          // Try to load full profile from Supabase
          const profile = await UserService.getUserProfile(userData.id);
          if (profile) {
            setUser(profile);
            setIsAuthenticated(true);
            console.log('✅ Loaded user profile from Supabase');
          } else {
            // Use localStorage data as fallback
            setUser(userData);
            setIsAuthenticated(true);
            console.log('⚠️ Using localStorage data (Supabase profile not found)');
          }
        }
      }
    } catch (error) {
      console.error('❌ Auth initialization error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserProfile = async (userId: string) => {
    try {
      const profile = await UserService.getUserProfile(userId);
      if (profile) {
        setUser(profile);
        setIsAuthenticated(true);
        
        // Also store in localStorage for faster access
        localStorage.setItem('user', JSON.stringify(profile));
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userId', userId);
        localStorage.setItem('lastActivity', Date.now().toString());
        
        console.log('✅ User profile loaded:', profile.username);
      }
    } catch (error) {
      console.error('❌ Failed to load user profile:', error);
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
      
      // Clear all user-specific localStorage data
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith('winnerTakesAllCompletions_') || 
          key.startsWith('winnerTakesAllSessions') ||
          key.startsWith('user') ||
          key.startsWith('token') ||
          key.startsWith('game') ||
          key.startsWith('session') ||
          key.startsWith('login') ||
          key.startsWith('auth') ||
          key === 'isLoggedIn' ||
          key === 'userId' ||
          key === 'sessionId' ||
          key === 'loginTime' ||
          key === 'lastActivity'
        )) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log('🧹 Removed localStorage key:', key);
      });
      
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
        
        // Store remember me preference
        localStorage.setItem('rememberMe', rememberMe.toString());
        localStorage.setItem('lastActivity', Date.now().toString());
        
        // Load full user profile
        await loadUserProfile(data.user.id);
        
        // Refresh token balance after login
        try {
          const { data: userData } = await supabase
            .from('users')
            .select('tokens')
            .eq('id', data.user.id)
            .single();
          
          if (userData) {
            // Trigger token sync event
            window.dispatchEvent(new CustomEvent('tokenUpdate', { 
              detail: { tokens: userData.tokens || 0 } 
            }));
            console.log('✅ Token balance refreshed on login:', userData.tokens);
          }
        } catch (error) {
          console.error('❌ Error refreshing tokens on login:', error);
        }
      }
    } catch (error: any) {
      console.error('❌ Login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log('🚪 Logging out...');
      
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
      
      // Clear cookies
      document.cookie = 'dropdollar_session=; path=/; max-age=0';
      document.cookie = 'dropdollar_user=; path=/; max-age=0';
      document.cookie = 'dropdollar_remember=; path=/; max-age=0';
      
      // Clear state
      setUser(null);
      setIsAuthenticated(false);
      
      console.log('✅ Logged out successfully');
    } catch (error) {
      console.error('❌ Logout error:', error);
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
      if (profile && profile.tokens !== undefined) {
        const updatedUser = { ...user, tokens: profile.tokens };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        // Dispatch custom event for other components to listen
        window.dispatchEvent(new CustomEvent('tokensRefreshed', { 
          detail: { newBalance: profile.tokens, userId: user.id } 
        }));
        
        console.log('✅ Token balance refreshed:', profile.tokens);
        return profile.tokens;
      }
      return user.tokens || 0;
    } catch (error) {
      console.error('❌ Failed to refresh tokens:', error);
      return user.tokens || 0;
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
