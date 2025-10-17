'use client';

import { useState, useEffect } from 'react';

// Safe mobile detection hook
export const useMobileDetection = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      if (typeof window === 'undefined') {
        setIsMobile(false);
        setIsLoading(false);
        return;
      }

      // Check for mobile user agent
      const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
      const isMobileUA = mobileRegex.test(navigator.userAgent);
      
      // Check for touch capability (with error handling)
      let isTouchDevice = false;
      try {
        isTouchDevice = 'ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
      } catch (e) {
        console.warn('Touch detection failed:', e);
      }
      
      // Check screen size (with error handling)
      let isSmallScreen = false;
      try {
        isSmallScreen = window.innerWidth <= 768;
      } catch (e) {
        console.warn('Screen size detection failed:', e);
      }
      
      setIsMobile(isMobileUA || (isTouchDevice && isSmallScreen));
    } catch (error) {
      console.error('Mobile detection failed:', error);
      setIsMobile(false); // Default to desktop on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isMobile, isLoading };
};

// Legacy function for backward compatibility (with better error handling)
export const isMobile = () => {
  try {
    if (typeof window === 'undefined') return false;
    
    // Check for mobile user agent
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    const isMobileUA = mobileRegex.test(navigator.userAgent);
    
    // Check for touch capability (with error handling)
    let isTouchDevice = false;
    try {
      isTouchDevice = 'ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
    } catch (e) {
      console.warn('Touch detection failed:', e);
    }
    
    // Check screen size (with error handling)
    let isSmallScreen = false;
    try {
      isSmallScreen = window.innerWidth <= 768;
    } catch (e) {
      console.warn('Screen size detection failed:', e);
    }
    
    return isMobileUA || (isTouchDevice && isSmallScreen);
  } catch (error) {
    console.error('Mobile detection failed:', error);
    return false; // Default to desktop on error
  }
};

// Mobile-optimized data loading helper
export const createMobileTimeout = (timeoutMs: number = 1500) => {
  return new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Mobile timeout')), timeoutMs)
  );
};

// Mobile-optimized Promise.race wrapper
export const mobileRace = <T>(promises: Promise<T>[], timeoutMs: number = 1500): Promise<T> => {
  return Promise.race([
    Promise.all(promises),
    createMobileTimeout(timeoutMs)
  ]) as Promise<T>;
};