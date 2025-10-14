'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Hook to prevent back button navigation during game play
 * This prevents users from replaying games without paying tokens
 */
export function usePreventBackNavigation(isGameActive: boolean, redirectUrl: string = '/dashboard') {
  const router = useRouter();

  useEffect(() => {
    if (!isGameActive) return;

    console.log('🔒 [BackNavigation] Activating back button protection');

    // Push a dummy state to capture the back button
    window.history.pushState(null, '', window.location.href);

    const handlePopState = (e: PopStateEvent) => {
      console.log('⚠️ [BackNavigation] Back button pressed during game');
      
      // Push state again to prevent actual back navigation
      window.history.pushState(null, '', window.location.href);
      
      // Force redirect to dashboard
      window.location.href = redirectUrl;
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Warn user if they try to close/refresh during game
      e.preventDefault();
      e.returnValue = 'Game in progress! Are you sure you want to leave?';
      return e.returnValue;
    };

    // Add event listeners
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup
    return () => {
      console.log('🔓 [BackNavigation] Deactivating back button protection');
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isGameActive, redirectUrl]);
}

