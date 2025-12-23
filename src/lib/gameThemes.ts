'use client';

import { supabase } from '@/lib/supabase/client';

/**
 * Game Theme System with RP Paywall
 * Themes persist across sessions and require RP purchase for premium themes
 * Standard theme is always FREE - Halloween & Christmas cost 1500 RP each
 */

export type GameTheme = 'standard' | 'halloween' | 'christmas';

export interface ThemeColors {
  skyTop: number;
  skyBottom: number;
  ambientLight: number;
  ambientIntensity: number;
  mainLight: number;
  mainLightIntensity: number;
  ground: number;
  accent: number;
}

// Theme pricing - Standard is FREE, premium themes cost RP
export const THEME_PRICES: Record<GameTheme, number> = {
  standard: 0,      // FREE
  halloween: 1500,  // 1500 RP
  christmas: 1500,  // 1500 RP
};

export const THEME_CONFIGS: Record<GameTheme, ThemeColors> = {
  standard: {
    skyTop: 0x1e90ff,
    skyBottom: 0x87CEEB,
    ambientLight: 0xFFFFFF,
    ambientIntensity: 0.7,
    mainLight: 0xFFFFCC,
    mainLightIntensity: 1.0,
    ground: 0x228B22,
    accent: 0x00BFFF,
  },
  halloween: {
    skyTop: 0x0a0a1a,
    skyBottom: 0x2a1a3a,
    ambientLight: 0x4444AA,
    ambientIntensity: 0.4,
    mainLight: 0xFFFFCC,
    mainLightIntensity: 0.6,
    ground: 0x1a1a1a,
    accent: 0xFF6600,
  },
  christmas: {
    skyTop: 0x1a2a4a,
    skyBottom: 0x4a5a7a,
    ambientLight: 0x8888FF,
    ambientIntensity: 0.6,
    mainLight: 0xFFFFFF,
    mainLightIntensity: 0.9,
    ground: 0xFFFFFF,
    accent: 0xFF0000,
  },
};

export const THEME_INFO: Record<GameTheme, { name: string; emoji: string; description: string; price: number; locked: boolean }> = {
  standard: {
    name: 'Standard',
    emoji: '🎮',
    description: 'Classic game experience',
    price: 0,
    locked: false,
  },
  halloween: {
    name: 'Halloween',
    emoji: '🎃',
    description: 'Spooky atmosphere with moonlight',
    price: 1500,
    locked: true,
  },
  christmas: {
    name: 'Christmas',
    emoji: '🎄',
    description: 'Festive winter wonderland',
    price: 1500,
    locked: true,
  },
};

const THEME_STORAGE_KEY = 'dropDollarGameTheme';
const OWNED_THEMES_KEY = 'dropDollarOwnedThemes';

/**
 * Check if user owns a theme for a specific game (from Supabase)
 */
export async function checkThemeOwnership(gameId: string, themeId: GameTheme): Promise<boolean> {
  // Standard is always free
  if (themeId === 'standard') return true;
  
  try {
    const { data, error } = await supabase.rpc('check_theme_ownership', {
      p_game_id: gameId,
      p_theme_id: themeId
    });
    
    if (error) {
      console.error('Error checking theme ownership:', error);
      return false;
    }
    
    return data === true;
  } catch (e) {
    console.error('Exception checking theme ownership:', e);
    return false;
  }
}

/**
 * Get all owned themes for a game from Supabase
 */
export async function getOwnedThemesForGame(gameId: string): Promise<Set<GameTheme>> {
  const owned = new Set<GameTheme>(['standard']); // Standard is always owned
  
  try {
    const { data, error } = await supabase.rpc('get_user_theme_purchases');
    
    if (error) {
      console.error('Error getting owned themes:', error);
      return owned;
    }
    
    if (data) {
      data.forEach((purchase: { game_id: string; theme_id: string }) => {
        if (purchase.game_id === gameId) {
          owned.add(purchase.theme_id as GameTheme);
        }
      });
    }
  } catch (e) {
    console.error('Exception getting owned themes:', e);
  }
  
  return owned;
}

/**
 * Get the saved theme from localStorage - ONLY if user owns it
 * Falls back to 'standard' if the saved theme is not owned
 */
export function getSavedTheme(ownedThemes?: Set<GameTheme>): GameTheme {
  if (typeof window === 'undefined') return 'standard';
  
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved && (saved === 'standard' || saved === 'halloween' || saved === 'christmas')) {
      const theme = saved as GameTheme;
      
      // If we have ownership info, check it
      if (ownedThemes) {
        if (ownedThemes.has(theme)) {
          return theme;
        } else {
          // User doesn't own this theme anymore, reset to standard
          console.log('🔒 Theme not owned, resetting to standard:', theme);
          localStorage.setItem(THEME_STORAGE_KEY, 'standard');
          return 'standard';
        }
      }
      
      // If no ownership info provided, only allow standard
      if (theme !== 'standard') {
        return 'standard'; // Safety: default to standard until ownership confirmed
      }
      
      return theme;
    }
  } catch (e) {
    console.warn('Failed to read theme from localStorage:', e);
  }
  return 'standard';
}

/**
 * Save theme preference to localStorage - ONLY if user owns it
 */
export function saveTheme(theme: GameTheme, ownedThemes?: Set<GameTheme>): boolean {
  if (typeof window === 'undefined') return false;
  
  // Standard is always allowed
  if (theme === 'standard') {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
      console.log('🎨 Theme saved:', theme);
      return true;
    } catch (e) {
      console.warn('Failed to save theme to localStorage:', e);
      return false;
    }
  }
  
  // For premium themes, check ownership
  if (ownedThemes && !ownedThemes.has(theme)) {
    console.warn('🔒 Cannot save theme - not owned:', theme);
    return false;
  }
  
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    console.log('🎨 Theme saved:', theme);
    return true;
  } catch (e) {
    console.warn('Failed to save theme to localStorage:', e);
    return false;
  }
}

/**
 * Theme Selector Button Component Props
 */
export interface ThemeSelectorProps {
  currentTheme: GameTheme;
  onThemeChange: (theme: GameTheme) => void;
  onSave?: () => void;
  showSaveButton?: boolean;
  ownedThemes?: Set<GameTheme>;
  gameId?: string;
}

