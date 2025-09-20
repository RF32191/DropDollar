'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { WalletService } from '@/lib/walletService';
import { database, DatabaseUser } from '@/lib/database';

export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  role: 'buyer' | 'seller' | 'admin';
  tokens: number;
  isVerified: boolean;
  phoneVerified: boolean;
  twoFactorEnabled: boolean;
  createdAt: Date;
  lastLogin?: Date;
  wallet?: {
    address: string;
    privateKey: string;
    balances: {
      USD: number;
      DROP: number;
      ETH?: number;
    };
  };
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  register: (userData: RegisterData) => Promise<{ success: boolean; error?: string }>;
  updateUser: (userData: Partial<User>) => void;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  username: string;
  phoneNumber: string;
  role: 'buyer' | 'seller';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    const loadUser = () => {
      try {
        const storedUser = localStorage.getItem('dollar_drop_user');
        const storedToken = localStorage.getItem('dollar_drop_token');
        
        if (storedUser && storedToken) {
          const userData = JSON.parse(storedUser);
          // Convert date strings back to Date objects
          userData.createdAt = new Date(userData.createdAt);
          
          // Ensure user has a wallet (for existing users who might not have one)
          if (!userData.wallet && userData.id) {
            const walletRecord = WalletService.createWalletForUser(userData.id, { initialUSD: 25 });
            userData.wallet = {
              address: walletRecord.address,
              privateKey: walletRecord.privateKey,
              balances: walletRecord.balances
            };
            // Update stored user data with wallet info
            localStorage.setItem('dollar_drop_user', JSON.stringify(userData));
          }
          
          setUser(userData);
        }
      } catch (error) {
        console.error('Error loading user from localStorage:', error);
        // Clear corrupted data
        localStorage.removeItem('dollar_drop_user');
        localStorage.removeItem('dollar_drop_token');
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    
    try {
      // Check if user exists in database
      const dbUser = await database.getUserByEmail(email);
      
      if (!dbUser) {
        return { success: false, error: 'Invalid email or password' };
      }

      // Verify password
      if (!database.verifyPassword(password, dbUser.passwordHash)) {
        return { success: false, error: 'Invalid email or password' };
      }

      // Update last login
      await database.updateUser(dbUser.id, { 
        lastLogin: new Date().toISOString() 
      });

      // Create session
      const sessionResult = await database.createSession(dbUser.id);
      if (!sessionResult.success) {
        return { success: false, error: 'Failed to create session' };
      }

      // Convert DatabaseUser to User
      const user: User = {
        id: dbUser.id,
        email: dbUser.email,
        username: dbUser.username,
        firstName: dbUser.firstName,
        lastName: dbUser.lastName,
        phoneNumber: dbUser.phoneNumber,
        role: dbUser.role,
        tokens: dbUser.tokens,
        isVerified: dbUser.isVerified,
        phoneVerified: dbUser.phoneVerified,
        twoFactorEnabled: dbUser.twoFactorEnabled,
        createdAt: new Date(dbUser.createdAt),
        lastLogin: dbUser.lastLogin ? new Date(dbUser.lastLogin) : undefined,
        wallet: dbUser.wallet
      };

      // Store in localStorage for persistence
      localStorage.setItem('dollar_drop_user', JSON.stringify(user));
      localStorage.setItem('dollar_drop_token', sessionResult.session!.token);
      
      setUser(user);
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    // Clear localStorage
    localStorage.removeItem('dollar_drop_user');
    localStorage.removeItem('dollar_drop_token');
    
    // Clear user state
    setUser(null);
    
    // Optional: Redirect to home page
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  const register = async (userData: RegisterData): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    
    try {
      // Create a unique wallet for this new user
      const tempUserId = `temp_${Date.now()}`;
      const walletRecord = WalletService.createWalletForUser(tempUserId, { initialUSD: 25 });
      
      // Create user in database
      const dbUserResult = await database.createUser({
        email: userData.email,
        username: userData.username,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phoneNumber: userData.phoneNumber,
        passwordHash: database.hashPassword(userData.password),
        role: userData.role,
        tokens: 50, // Starting tokens
        isVerified: false,
        phoneVerified: false,
        twoFactorEnabled: false,
        wallet: {
          address: walletRecord.address,
          privateKey: walletRecord.privateKey,
          balances: walletRecord.balances
        }
      });

      if (!dbUserResult.success) {
        return { success: false, error: dbUserResult.error };
      }

      const dbUser = dbUserResult.user!;

      // Update wallet with correct user ID
      WalletService.updateWalletUserId(tempUserId, dbUser.id);

      // Create session
      const sessionResult = await database.createSession(dbUser.id);
      if (!sessionResult.success) {
        return { success: false, error: 'Failed to create session' };
      }

      // Convert DatabaseUser to User
      const user: User = {
        id: dbUser.id,
        email: dbUser.email,
        username: dbUser.username,
        firstName: dbUser.firstName,
        lastName: dbUser.lastName,
        phoneNumber: dbUser.phoneNumber,
        role: dbUser.role,
        tokens: dbUser.tokens,
        isVerified: dbUser.isVerified,
        phoneVerified: dbUser.phoneVerified,
        twoFactorEnabled: dbUser.twoFactorEnabled,
        createdAt: new Date(dbUser.createdAt),
        wallet: dbUser.wallet
      };

      // Store in localStorage for persistence
      localStorage.setItem('dollar_drop_user', JSON.stringify(user));
      localStorage.setItem('dollar_drop_token', sessionResult.session!.token);
      
      setUser(user);
      return { success: true };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Registration failed. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      localStorage.setItem('dollar_drop_user', JSON.stringify(updatedUser));
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    logout,
    register,
    updateUser
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
    // Return default values instead of throwing error during SSR or initial render
    return {
      user: null,
      isLoading: true,
      login: async () => ({ success: false, error: 'Auth not initialized' }),
      logout: () => {},
      register: async () => ({ success: false, error: 'Auth not initialized' }),
      updateUser: () => {}
    };
  }
  return context;
}
