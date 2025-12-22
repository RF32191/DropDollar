'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SiteTheme, getSavedSiteTheme, saveSiteTheme, SITE_THEMES, ThemeConfig } from '@/lib/siteThemes';

interface SiteThemeContextType {
  currentTheme: SiteTheme;
  setTheme: (theme: SiteTheme) => void;
  themeConfig: ThemeConfig;
  isHalloween: boolean;
  isChristmas: boolean;
  isDefault: boolean;
}

const SiteThemeContext = createContext<SiteThemeContextType | undefined>(undefined);

interface SiteThemeProviderProps {
  children: ReactNode;
}

export function SiteThemeProvider({ children }: SiteThemeProviderProps) {
  const [currentTheme, setCurrentTheme] = useState<SiteTheme>('default');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Load saved theme on mount
    const saved = getSavedSiteTheme();
    setCurrentTheme(saved);
    saveSiteTheme(saved); // Apply CSS variables
    setMounted(true);
  }, []);

  const setTheme = (theme: SiteTheme) => {
    setCurrentTheme(theme);
    saveSiteTheme(theme);
  };

  const value: SiteThemeContextType = {
    currentTheme,
    setTheme,
    themeConfig: SITE_THEMES[currentTheme],
    isHalloween: currentTheme === 'halloween',
    isChristmas: currentTheme === 'christmas',
    isDefault: currentTheme === 'default',
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <SiteThemeContext.Provider value={value}>
      {children}
    </SiteThemeContext.Provider>
  );
}

export function useSiteTheme() {
  const context = useContext(SiteThemeContext);
  if (context === undefined) {
    // Return default values if used outside provider
    return {
      currentTheme: 'default' as SiteTheme,
      setTheme: () => {},
      themeConfig: SITE_THEMES.default,
      isHalloween: false,
      isChristmas: false,
      isDefault: true,
    };
  }
  return context;
}

