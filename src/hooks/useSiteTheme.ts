'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';

interface ThemeOwnership {
  [themeId: string]: boolean;
}

interface PurchaseResult {
  success: boolean;
  error?: string;
  required?: number;
  current?: number;
}

// Site theme definitions
export const SITE_THEMES = {
  default: { id: 'default', name: 'Default', price: 0, icon: '🎮', locked: false, description: 'Classic DropDollar look' },
  halloween: { id: 'halloween', name: 'Halloween', price: 2000, icon: '🎃', locked: true, description: 'Spooky vibes across all pages' },
  christmas: { id: 'christmas', name: 'Christmas', price: 2000, icon: '🎄', locked: true, description: 'Festive holiday spirit' },
} as const;

export function useSiteTheme() {
  const [ownedThemes, setOwnedThemes] = useState<ThemeOwnership>({ default: true });
  const [selectedTheme, setSelectedTheme] = useState<string>('default');
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [userRP, setUserRP] = useState<number>(0);

  // Load user's purchased site themes
  const loadOwnedThemes = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Get user's RP balance
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: xpData } = await supabase
          .from('user_xp')
          .select('reward_points')
          .eq('user_id', user.id)
          .single();
        
        if (xpData) {
          setUserRP(xpData.reward_points || 0);
        }
      }

      // Get purchased site themes
      const { data, error } = await supabase.rpc('get_user_site_theme_purchases');
      
      if (error) {
        console.error('Error loading site theme purchases:', error);
        setOwnedThemes({ default: true });
        return;
      }

      const ownership: ThemeOwnership = { default: true };
      
      if (data) {
        data.forEach((purchase: { theme_id: string }) => {
          ownership[purchase.theme_id] = true;
        });
      }

      setOwnedThemes(ownership);
      
      // Load saved theme preference from localStorage
      const savedTheme = localStorage.getItem('site_theme');
      if (savedTheme && ownership[savedTheme]) {
        setSelectedTheme(savedTheme);
      }
    } catch (error) {
      console.error('Error loading site themes:', error);
      setOwnedThemes({ default: true });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOwnedThemes();
  }, [loadOwnedThemes]);

  // Purchase a site theme
  const purchaseTheme = async (themeId: string): Promise<PurchaseResult> => {
    if (themeId === 'default') {
      return { success: true };
    }

    if (ownedThemes[themeId]) {
      return { success: true };
    }

    setIsPurchasing(true);
    
    try {
      const { data, error } = await supabase.rpc('purchase_site_theme', {
        p_theme_id: themeId,
        p_rp_cost: SITE_THEMES[themeId as keyof typeof SITE_THEMES]?.price || 2000
      });

      if (error) {
        console.error('Site theme purchase error:', error);
        return { success: false, error: error.message };
      }

      if (data?.success) {
        setOwnedThemes(prev => ({ ...prev, [themeId]: true }));
        setUserRP(prev => prev - (SITE_THEMES[themeId as keyof typeof SITE_THEMES]?.price || 2000));
        return { success: true };
      } else {
        return { 
          success: false, 
          error: data?.error || 'Purchase failed',
          required: data?.required,
          current: data?.current
        };
      }
    } catch (error) {
      console.error('Site theme purchase exception:', error);
      return { success: false, error: 'An error occurred' };
    } finally {
      setIsPurchasing(false);
    }
  };

  // Select a site theme (only if owned)
  const selectTheme = (themeId: string): boolean => {
    if (ownedThemes[themeId] || themeId === 'default') {
      setSelectedTheme(themeId);
      localStorage.setItem('site_theme', themeId);
      // Dispatch event for other components to react
      window.dispatchEvent(new CustomEvent('siteThemeChanged', { detail: themeId }));
      return true;
    }
    return false;
  };

  // Check if a theme is owned
  const isThemeOwned = (themeId: string): boolean => {
    return themeId === 'default' || ownedThemes[themeId] === true;
  };

  // Get available themes with ownership status
  const getAvailableThemes = () => {
    return Object.values(SITE_THEMES).map(theme => ({
      ...theme,
      owned: isThemeOwned(theme.id),
      canAfford: theme.price === 0 || userRP >= theme.price
    }));
  };

  return {
    selectedTheme,
    ownedThemes,
    isLoading,
    isPurchasing,
    userRP,
    purchaseTheme,
    selectTheme,
    isThemeOwned,
    getAvailableThemes,
    refreshThemes: loadOwnedThemes
  };
}

