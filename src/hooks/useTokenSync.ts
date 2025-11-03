'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Custom hook for token synchronization across all pages
 * Provides real-time token balance updates and synchronization
 */
export function useTokenSync() {
  const { user, isAuthenticated, refreshTokens } = useAuth();
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || !isAuthenticated) {
      setTokenBalance(0);
      setIsLoading(false);
      return;
    }

    // Initialize token balance
    const initializeTokens = async () => {
      try {
        setIsLoading(true);
        const balance = await refreshTokens();
        setTokenBalance(balance);
        console.log('💰 [useTokenSync] Initialized token balance:', balance);
      } catch (error) {
        console.error('❌ [useTokenSync] Failed to initialize tokens:', error);
        // Fallback: calculate from DUAL WALLET (purchased + won)
        const purchased = user.purchased_tokens || 0;
        const won = user.won_tokens || 0;
        setTokenBalance(purchased + won);
      } finally {
        setIsLoading(false);
      }
    };

    initializeTokens();

    // Listen for token update events from AuthContext
    const handleTokensUpdated = (event: CustomEvent) => {
      if (event.detail?.userId === user.id) {
        console.log('💰 [useTokenSync] Tokens updated:', event.detail.newBalance);
        setTokenBalance(event.detail.newBalance);
      }
    };

    const handleTokensRefreshed = (event: CustomEvent) => {
      if (event.detail?.userId === user.id) {
        console.log('🔄 [useTokenSync] Tokens refreshed:', event.detail.newBalance);
        setTokenBalance(event.detail.newBalance);
      }
    };

    // Listen for localStorage changes (cross-page updates)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user' && e.newValue) {
        try {
          const userData = JSON.parse(e.newValue);
          if (userData.id === user.id) {
            // Calculate total from DUAL WALLET (purchased + won)
            const purchased = userData.purchased_tokens || 0;
            const won = userData.won_tokens || 0;
            const total = purchased + won;
            console.log('💰 [useTokenSync] Tokens updated from localStorage:', { purchased, won, total });
            setTokenBalance(total);
          }
        } catch (error) {
          console.error('❌ [useTokenSync] Failed to parse localStorage user data:', error);
        }
      }
    };

    // Listen for page visibility changes
    const handleVisibilityChange = async () => {
      if (!document.hidden && user && isAuthenticated) {
        console.log('🔄 [useTokenSync] Page visible, refreshing tokens...');
        try {
          const balance = await refreshTokens();
          setTokenBalance(balance);
        } catch (error) {
          console.error('❌ [useTokenSync] Failed to refresh tokens on visibility change:', error);
        }
      }
    };

    // Listen for window focus
    const handleFocus = async () => {
      if (user?.id && isAuthenticated) {
        console.log('🔄 [useTokenSync] Window focused, refreshing tokens...');
        try {
          const balance = await refreshTokens();
          setTokenBalance(balance);
        } catch (error) {
          console.error('❌ [useTokenSync] Failed to refresh tokens on focus:', error);
        }
      }
    };

    // Listen for login events to ensure seamless loading
    const handleUserLoggedIn = (event: CustomEvent) => {
      if (event.detail?.seamless && event.detail?.userId === user.id) {
        // Calculate from DUAL WALLET (purchased + won)
        const purchased = event.detail.purchased_tokens || 0;
        const won = event.detail.won_tokens || 0;
        const total = purchased + won;
        console.log('💰 [useTokenSync] User logged in seamlessly, updating tokens:', { purchased, won, total });
        setTokenBalance(total);
        setIsLoading(false);
      }
    };

    // Listen for logout events
    const handleUserLoggedOut = () => {
      console.log('💰 [useTokenSync] User logged out, clearing tokens');
      setTokenBalance(0);
      setIsLoading(false);
    };

    // Add event listeners
    window.addEventListener('userLoggedIn', handleUserLoggedIn as EventListener);
    window.addEventListener('userLoggedOut', handleUserLoggedOut);
    window.addEventListener('tokensUpdated', handleTokensUpdated as EventListener);
    window.addEventListener('tokensRefreshed', handleTokensRefreshed as EventListener);
    window.addEventListener('storage', handleStorageChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // Cleanup
    return () => {
      window.removeEventListener('userLoggedIn', handleUserLoggedIn as EventListener);
      window.removeEventListener('userLoggedOut', handleUserLoggedOut);
      window.removeEventListener('tokensUpdated', handleTokensUpdated as EventListener);
      window.removeEventListener('tokensRefreshed', handleTokensRefreshed as EventListener);
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user?.id, isAuthenticated, refreshTokens]);

  return {
    tokenBalance,
    isLoading,
    refreshTokens: async () => {
      if (!user || !isAuthenticated) return 0;
      try {
        const balance = await refreshTokens();
        setTokenBalance(balance);
        return balance;
      } catch (error) {
        console.error('❌ [useTokenSync] Failed to refresh tokens:', error);
        return tokenBalance;
      }
    }
  };
}
