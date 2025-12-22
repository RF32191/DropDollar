'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { SiteTheme, getSavedSiteTheme, saveSiteTheme, SITE_THEMES, ThemeConfig } from '@/lib/siteThemes';
import { supabase } from '@/lib/supabase/client';

interface SiteThemeContextType {
  currentTheme: SiteTheme;
  setTheme: (theme: SiteTheme) => void;
  themeConfig: ThemeConfig;
  isHalloween: boolean;
  isChristmas: boolean;
  isDefault: boolean;
  isSaving: boolean;
}

const SiteThemeContext = createContext<SiteThemeContextType | undefined>(undefined);

interface SiteThemeProviderProps {
  children: ReactNode;
}

export function SiteThemeProvider({ children }: SiteThemeProviderProps) {
  const [currentTheme, setCurrentTheme] = useState<SiteTheme>('default');
  const [mounted, setMounted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Load theme from localStorage first (for fast initial load), then from user profile
  useEffect(() => {
    const loadTheme = async () => {
      // First, load from localStorage for immediate display
      const localTheme = getSavedSiteTheme();
      setCurrentTheme(localTheme);
      saveSiteTheme(localTheme); // Apply CSS variables
      setMounted(true);

      // Then check if user is logged in and load their saved preference
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
          
          // Try to get theme from user metadata
          const userTheme = user.user_metadata?.site_theme as SiteTheme | undefined;
          if (userTheme && SITE_THEMES[userTheme]) {
            setCurrentTheme(userTheme);
            saveSiteTheme(userTheme); // Update localStorage and CSS
            console.log('🎨 [SiteTheme] Loaded user theme from profile:', userTheme);
          }
        }
      } catch (error) {
        console.warn('⚠️ [SiteTheme] Could not load user theme:', error);
      }
    };

    loadTheme();

    // Listen for auth changes to load theme when user logs in
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUserId(session.user.id);
        const userTheme = session.user.user_metadata?.site_theme as SiteTheme | undefined;
        if (userTheme && SITE_THEMES[userTheme]) {
          setCurrentTheme(userTheme);
          saveSiteTheme(userTheme);
          console.log('🎨 [SiteTheme] Loaded theme on sign in:', userTheme);
        }
      } else if (event === 'SIGNED_OUT') {
        setUserId(null);
        // Keep the current theme on sign out (it's in localStorage)
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Save theme to both localStorage and user profile
  const setTheme = useCallback(async (theme: SiteTheme) => {
    setCurrentTheme(theme);
    saveSiteTheme(theme); // Save to localStorage and apply CSS

    // If user is logged in, save to their profile
    if (userId) {
      setIsSaving(true);
      try {
        const { error } = await supabase.auth.updateUser({
          data: { site_theme: theme }
        });
        
        if (error) {
          console.warn('⚠️ [SiteTheme] Could not save to profile:', error);
        } else {
          console.log('✅ [SiteTheme] Saved to user profile:', theme);
        }
      } catch (error) {
        console.warn('⚠️ [SiteTheme] Error saving theme:', error);
      } finally {
        setIsSaving(false);
      }
    }
  }, [userId]);

  const value: SiteThemeContextType = {
    currentTheme,
    setTheme,
    themeConfig: SITE_THEMES[currentTheme],
    isHalloween: currentTheme === 'halloween',
    isChristmas: currentTheme === 'christmas',
    isDefault: currentTheme === 'default',
    isSaving,
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
      isSaving: false,
    };
  }
  return context;
}
