'use client';

import { useEffect, useRef } from 'react';

interface UseInactivityTimeoutOptions {
  timeout?: number; // in milliseconds
  onTimeout?: () => void;
  events?: string[];
  enabled?: boolean;
}

export function useInactivityTimeout({
  timeout = 10 * 60 * 1000, // 10 minutes default
  onTimeout = () => window.location.reload(),
  events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'],
  enabled = true
}: UseInactivityTimeoutOptions = {}) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const resetTimeout = () => {
    if (!enabled) return;
    
    lastActivityRef.current = Date.now();
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      const timeSinceLastActivity = Date.now() - lastActivityRef.current;
      
      // Only trigger timeout if no activity for the full timeout period
      if (timeSinceLastActivity >= timeout) {
        console.log('🕐 Inactivity timeout reached, reloading page...');
        onTimeout();
      }
    }, timeout);
  };

  useEffect(() => {
    if (!enabled) return;

    // Set initial timeout
    resetTimeout();

    // Add event listeners
    const handleActivity = () => {
      resetTimeout();
    };

    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, timeout, events.join(',')]);

  // Manual reset function
  const resetInactivityTimer = () => {
    resetTimeout();
  };

  return {
    resetInactivityTimer
  };
}
