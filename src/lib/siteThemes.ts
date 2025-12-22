'use client';

// Site-wide theme types
export type SiteTheme = 'default' | 'halloween' | 'christmas';

// Page-specific Halloween sub-themes
export interface HalloweenPageThemes {
  hotSell: 'hell';           // Flames, demons, hellfire
  oneVsOne: 'frankenstein';  // Lightning, lab, green glow
  winnerTakesAll: 'zombies'; // Undead, graveyard, decay
  coinPlay: 'styx';          // River of death, coins on eyes, Greek underworld
  dashboard: 'haunted';      // Spiders, webs, orange/purple, bats
  games: 'carnival';         // Creepy carnival, dark circus
  marketplace: 'crypt';      // Ancient crypt, treasure, skulls
}

// Page-specific Christmas sub-themes
export interface ChristmasPageThemes {
  hotSell: 'fireplace';      // Cozy fireplace, stockings
  oneVsOne: 'snowball';      // Snowball fight, winter wonderland
  winnerTakesAll: 'northPole'; // Santa's workshop, elves
  coinPlay: 'treasure';       // Gift boxes, golden coins
  dashboard: 'winter';        // Snowflakes, warm lights
  games: 'toyshop';          // Toy shop, presents
  marketplace: 'market';      // Christmas market, lanterns
}

// Theme configuration with CSS variables and animation settings
export interface ThemeConfig {
  id: SiteTheme;
  name: string;
  icon: string;
  description: string;
  cssVars: {
    '--theme-primary': string;
    '--theme-secondary': string;
    '--theme-accent': string;
    '--theme-bg-start': string;
    '--theme-bg-end': string;
    '--theme-text': string;
    '--theme-glow': string;
  };
}

export const SITE_THEMES: Record<SiteTheme, ThemeConfig> = {
  default: {
    id: 'default',
    name: 'Default',
    icon: '🌐',
    description: 'Classic Drop Dollar experience',
    cssVars: {
      '--theme-primary': '#3B82F6',
      '--theme-secondary': '#8B5CF6',
      '--theme-accent': '#10B981',
      '--theme-bg-start': '#0F172A',
      '--theme-bg-end': '#1E293B',
      '--theme-text': '#FFFFFF',
      '--theme-glow': 'rgba(59, 130, 246, 0.5)',
    },
  },
  halloween: {
    id: 'halloween',
    name: 'Halloween',
    icon: '🎃',
    description: 'Spooky season with unique page themes',
    cssVars: {
      '--theme-primary': '#F97316',
      '--theme-secondary': '#A855F7',
      '--theme-accent': '#22C55E',
      '--theme-bg-start': '#1a0a1a',
      '--theme-bg-end': '#2a1a2a',
      '--theme-text': '#FFFFFF',
      '--theme-glow': 'rgba(249, 115, 22, 0.5)',
    },
  },
  christmas: {
    id: 'christmas',
    name: 'Christmas',
    icon: '🎄',
    description: 'Holiday cheer with festive decorations',
    cssVars: {
      '--theme-primary': '#DC2626',
      '--theme-secondary': '#16A34A',
      '--theme-accent': '#EAB308',
      '--theme-bg-start': '#0F172A',
      '--theme-bg-end': '#1E3A5F',
      '--theme-text': '#FFFFFF',
      '--theme-glow': 'rgba(220, 38, 38, 0.5)',
    },
  },
};

// Local storage key
const SITE_THEME_KEY = 'drop-dollar-site-theme';

// Save theme preference
export function saveSiteTheme(theme: SiteTheme): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SITE_THEME_KEY, theme);
    
    // Apply CSS variables to document
    const config = SITE_THEMES[theme];
    const root = document.documentElement;
    Object.entries(config.cssVars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }
}

// Get saved theme
export function getSavedSiteTheme(): SiteTheme {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(SITE_THEME_KEY) as SiteTheme | null;
    if (saved && SITE_THEMES[saved]) {
      return saved;
    }
  }
  return 'default';
}

// Apply theme on load
export function applySavedTheme(): void {
  const theme = getSavedSiteTheme();
  saveSiteTheme(theme);
}

