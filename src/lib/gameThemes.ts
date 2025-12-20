'use client';

/**
 * Game Theme System
 * Allows users to select and permanently save their preferred game themes
 * Themes persist across sessions and are used in both practice and competition modes
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

export const THEME_INFO: Record<GameTheme, { name: string; emoji: string; description: string }> = {
  standard: {
    name: 'Standard',
    emoji: '🎮',
    description: 'Classic game experience',
  },
  halloween: {
    name: 'Halloween',
    emoji: '🎃',
    description: 'Spooky atmosphere with moonlight',
  },
  christmas: {
    name: 'Christmas',
    emoji: '🎄',
    description: 'Festive winter wonderland',
  },
};

const THEME_STORAGE_KEY = 'dropDollarGameTheme';

/**
 * Get the saved theme from localStorage
 */
export function getSavedTheme(): GameTheme {
  if (typeof window === 'undefined') return 'standard';
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved && (saved === 'standard' || saved === 'halloween' || saved === 'christmas')) {
      return saved as GameTheme;
    }
  } catch (e) {
    console.warn('Failed to read theme from localStorage:', e);
  }
  return 'standard';
}

/**
 * Save theme preference to localStorage
 */
export function saveTheme(theme: GameTheme): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    console.log('🎨 Theme saved:', theme);
  } catch (e) {
    console.warn('Failed to save theme to localStorage:', e);
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
}

