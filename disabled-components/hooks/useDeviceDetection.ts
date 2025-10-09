'use client';

import { useState, useEffect } from 'react';

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenWidth: number;
  screenHeight: number;
  orientation: 'portrait' | 'landscape';
  deviceType: 'mobile' | 'tablet' | 'desktop';
  isTouchDevice: boolean;
  userAgent: string;
  pixelRatio: number;
}

export const useDeviceDetection = (): DeviceInfo => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    screenWidth: 1920,
    screenHeight: 1080,
    orientation: 'landscape',
    deviceType: 'desktop',
    isTouchDevice: false,
    userAgent: '',
    pixelRatio: 1
  });

  useEffect(() => {
    const detectDevice = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const userAgent = navigator.userAgent;
      const pixelRatio = window.devicePixelRatio || 1;
      
      // Device type detection based on screen width
      const isMobile = width < 768;
      const isTablet = width >= 768 && width < 1024;
      const isDesktop = width >= 1024;
      
      // Touch device detection
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      // Orientation detection
      const orientation = width > height ? 'landscape' : 'portrait';
      
      // Device type priority
      let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
      if (isMobile) deviceType = 'mobile';
      else if (isTablet) deviceType = 'tablet';
      
      // Enhanced mobile detection using user agent
      const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
      const isMobileUA = mobileRegex.test(userAgent);
      
      // Final mobile determination
      const finalIsMobile = isMobile || (isMobileUA && width < 1024);
      const finalIsTablet = isTablet && !finalIsMobile;
      const finalIsDesktop = !finalIsMobile && !finalIsTablet;
      
      if (finalIsMobile) deviceType = 'mobile';
      else if (finalIsTablet) deviceType = 'tablet';
      else deviceType = 'desktop';

      setDeviceInfo({
        isMobile: finalIsMobile,
        isTablet: finalIsTablet,
        isDesktop: finalIsDesktop,
        screenWidth: width,
        screenHeight: height,
        orientation,
        deviceType,
        isTouchDevice: isTouchDevice || finalIsMobile,
        userAgent,
        pixelRatio
      });
    };

    // Initial detection
    detectDevice();

    // Listen for resize events
    const handleResize = () => {
      detectDevice();
    };

    // Listen for orientation changes
    const handleOrientationChange = () => {
      // Delay to ensure dimensions are updated
      setTimeout(detectDevice, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  return deviceInfo;
};

// Utility functions for responsive design
export const getResponsiveClasses = (deviceInfo: DeviceInfo) => {
  const { isMobile, isTablet, isDesktop } = deviceInfo;
  
  return {
    // Container classes
    container: isMobile 
      ? 'px-2 sm:px-4' 
      : isTablet 
        ? 'px-4 sm:px-6' 
        : 'px-4 sm:px-6 lg:px-8',
    
    // Grid classes
    grid: isMobile
      ? 'grid-cols-1'
      : isTablet
        ? 'grid-cols-1 md:grid-cols-2'
        : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    
    // Text classes
    heading: isMobile
      ? 'text-2xl sm:text-3xl'
      : isTablet
        ? 'text-3xl sm:text-4xl'
        : 'text-4xl md:text-5xl',
    
    subheading: isMobile
      ? 'text-lg sm:text-xl'
      : isTablet
        ? 'text-xl sm:text-2xl'
        : 'text-xl md:text-2xl',
    
    body: isMobile
      ? 'text-sm sm:text-base'
      : 'text-base',
    
    // Spacing classes
    spacing: isMobile
      ? 'space-y-4'
      : isTablet
        ? 'space-y-6'
        : 'space-y-8',
    
    // Button classes
    button: isMobile
      ? 'px-4 py-2 text-sm'
      : isTablet
        ? 'px-6 py-3 text-base'
        : 'px-6 py-3 text-base',
    
    // Modal/overlay classes
    modal: isMobile
      ? 'p-2 sm:p-4 max-h-screen overflow-y-auto'
      : isTablet
        ? 'p-4 sm:p-6 max-h-[90vh] overflow-y-auto'
        : 'p-6 sm:p-8 max-h-[80vh] overflow-y-auto'
  };
};

// Ad sizing utility
export const getAdSize = (deviceInfo: DeviceInfo) => {
  const { isMobile, isTablet, screenWidth, screenHeight } = deviceInfo;
  
  if (isMobile) {
    return {
      width: Math.min(screenWidth - 32, 320), // Max 320px width with 16px margin each side
      height: Math.min(screenHeight * 0.25, 180), // Max 25% of screen height or 180px
      className: 'w-full max-w-sm mx-auto',
      containerClass: 'fixed inset-x-4 bottom-4 z-40 max-h-48'
    };
  } else if (isTablet) {
    return {
      width: Math.min(screenWidth * 0.8, 468),
      height: Math.min(screenHeight * 0.3, 240),
      className: 'w-full max-w-md mx-auto',
      containerClass: 'fixed inset-x-8 bottom-8 z-40 max-h-60'
    };
  } else {
    return {
      width: Math.min(screenWidth * 0.6, 728),
      height: Math.min(screenHeight * 0.4, 300),
      className: 'w-full max-w-2xl mx-auto',
      containerClass: 'fixed inset-x-12 bottom-12 z-40 max-h-72'
    };
  }
};

export default useDeviceDetection;
