// Mobile detection utility
export const isMobile = () => {
  if (typeof window === 'undefined') return false;
  
  // Check for mobile user agent
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  const isMobileUA = mobileRegex.test(navigator.userAgent);
  
  // Check for touch capability
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  // Check screen size
  const isSmallScreen = window.innerWidth <= 768;
  
  return isMobileUA || (isTouchDevice && isSmallScreen);
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
