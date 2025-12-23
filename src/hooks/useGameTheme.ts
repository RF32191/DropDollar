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

// Theme definitions
export const GAME_THEMES = {
  standard: { id: 'standard', name: 'Standard', price: 0, icon: '🎮', locked: false },
  halloween: { id: 'halloween', name: 'Halloween', price: 1500, icon: '🎃', locked: true },
  christmas: { id: 'christmas', name: 'Christmas', price: 1500, icon: '🎄', locked: true },
} as const;

// Games that support themes
export const THEMED_GAMES = [
  'laser-dodge',
  'blade-bounce', 
  'dead-shot',
  'lightning-maze',
  'flippy-coin',
  'parry-pro',
  'click-draw',
  'cash-stack',
  'penny-passer',
  'neon-striker',
  'falling-objects',
  'quick-click',
  'color-sequence',
] as const;

export function useGameTheme(gameId: string) {
  const [ownedThemes, setOwnedThemes] = useState<ThemeOwnership>({ standard: true });
  const [selectedTheme, setSelectedTheme] = useState<string>('standard');
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [userRP, setUserRP] = useState<number>(0);

  // Load user's purchased themes for this game
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

      // Get purchased themes
      const { data, error } = await supabase.rpc('get_user_theme_purchases');
      
      if (error) {
        console.error('Error loading theme purchases:', error);
        // Standard is always free
        setOwnedThemes({ standard: true });
        return;
      }

      const ownership: ThemeOwnership = { standard: true };
      
      if (data) {
        data.forEach((purchase: { game_id: string; theme_id: string }) => {
          if (purchase.game_id === gameId) {
            ownership[purchase.theme_id] = true;
          }
        });
      }

      setOwnedThemes(ownership);
      
      // Load saved theme preference from localStorage
      const savedTheme = localStorage.getItem(`game_theme_${gameId}`);
      if (savedTheme && ownership[savedTheme]) {
        setSelectedTheme(savedTheme);
      }
    } catch (error) {
      console.error('Error loading themes:', error);
      setOwnedThemes({ standard: true });
    } finally {
      setIsLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    loadOwnedThemes();
  }, [loadOwnedThemes]);

  // Purchase a theme
  const purchaseTheme = async (themeId: string): Promise<PurchaseResult> => {
    if (themeId === 'standard') {
      return { success: true };
    }

    if (ownedThemes[themeId]) {
      return { success: true };
    }

    setIsPurchasing(true);
    
    try {
      const { data, error } = await supabase.rpc('purchase_game_theme', {
        p_game_id: gameId,
        p_theme_id: themeId,
        p_rp_cost: GAME_THEMES[themeId as keyof typeof GAME_THEMES]?.price || 1500
      });

      if (error) {
        console.error('Purchase error:', error);
        return { success: false, error: error.message };
      }

      if (data?.success) {
        setOwnedThemes(prev => ({ ...prev, [themeId]: true }));
        setUserRP(prev => prev - (GAME_THEMES[themeId as keyof typeof GAME_THEMES]?.price || 1500));
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
      console.error('Purchase exception:', error);
      return { success: false, error: 'An error occurred' };
    } finally {
      setIsPurchasing(false);
    }
  };

  // Select a theme (only if owned)
  const selectTheme = (themeId: string) => {
    if (ownedThemes[themeId] || themeId === 'standard') {
      setSelectedTheme(themeId);
      localStorage.setItem(`game_theme_${gameId}`, themeId);
      return true;
    }
    return false;
  };

  // Check if a theme is owned
  const isThemeOwned = (themeId: string): boolean => {
    return themeId === 'standard' || ownedThemes[themeId] === true;
  };

  // Get available themes with ownership status
  const getAvailableThemes = () => {
    return Object.values(GAME_THEMES).map(theme => ({
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

