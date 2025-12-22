'use client';

import React from 'react';
import { useSiteTheme } from '@/contexts/SiteThemeContext';
import {
  HellOverlay,
  FrankensteinOverlay,
  ZombiesOverlay,
  StyxOverlay,
  HauntedOverlay,
  CarnivalOverlay,
  SpiderOverlay,
  MoneyHorrorOverlay,
} from './HalloweenOverlays';
import {
  FireplaceOverlay,
  SnowballOverlay,
  NorthPoleOverlay,
  TreasureOverlay,
  WinterOverlay,
  ToyshopOverlay,
  BuyTokensOverlay,
} from './ChristmasOverlays';

// Page identifiers for themed overlays
export type ThemedPage = 
  | 'hot-sell' 
  | '1v1' 
  | 'winner-takes-all' 
  | 'coin-play' 
  | 'dashboard' 
  | 'games'
  | 'marketplace'
  | 'home'
  | 'buy-tokens';

interface PageThemeOverlayProps {
  page: ThemedPage;
}

export default function PageThemeOverlay({ page }: PageThemeOverlayProps) {
  const { currentTheme, isHalloween, isChristmas } = useSiteTheme();
  
  // Don't render overlay for default theme
  if (currentTheme === 'default') {
    return null;
  }
  
  // Halloween overlays
  if (isHalloween) {
    switch (page) {
      case 'hot-sell':
        return <HellOverlay />;
      case '1v1':
        return <FrankensteinOverlay />;
      case 'winner-takes-all':
        return <ZombiesOverlay />;
      case 'coin-play':
        return <StyxOverlay />;
      case 'dashboard':
        return <HauntedOverlay />;
      case 'games':
        return <CarnivalOverlay />;
      case 'marketplace':
        return <SpiderOverlay />; // Spider themed for marketplace
      case 'home':
        return <SpiderOverlay />; // Spider/haunted for home
      case 'buy-tokens':
        return <MoneyHorrorOverlay />; // Money horror for buy tokens
      default:
        return null;
    }
  }
  
  // Christmas overlays
  if (isChristmas) {
    switch (page) {
      case 'hot-sell':
        return <FireplaceOverlay />;
      case '1v1':
        return <SnowballOverlay />;
      case 'winner-takes-all':
        return <NorthPoleOverlay />;
      case 'coin-play':
        return <TreasureOverlay />;
      case 'dashboard':
        return <WinterOverlay />;
      case 'games':
        return <ToyshopOverlay />;
      case 'marketplace':
        return <WinterOverlay />; // Reuse winter for marketplace
      case 'home':
        return <WinterOverlay />; // Reuse winter for home
      case 'buy-tokens':
        return <BuyTokensOverlay />; // Snowmen and red/green for buy tokens
      default:
        return null;
    }
  }
  
  return null;
}

// Hook to get current page theme description
export function usePageThemeDescription(page: ThemedPage) {
  const { isHalloween, isChristmas, isDefault } = useSiteTheme();
  
  if (isDefault) return null;
  
  if (isHalloween) {
    switch (page) {
      case 'hot-sell': return { icon: '🔥', name: 'Hell', description: 'Ghostly veil and hellfire' };
      case '1v1': return { icon: '⚡', name: 'Frankenstein Lab', description: '3D Tesla coils with lightning' };
      case 'winner-takes-all': return { icon: '🧟', name: 'Zombie Graveyard', description: 'Undead rising' };
      case 'coin-play': return { icon: '💀', name: 'River Styx', description: 'Greek underworld' };
      case 'dashboard': return { icon: '🧪', name: 'Acid Rising', description: 'Green acid underglow' };
      case 'games': return { icon: '🎪', name: 'Creepy Carnival', description: 'Haunted circus with spotlights' };
      case 'home': return { icon: '🕷️', name: 'Spider Lair', description: 'Giant webs and spiders' };
      case 'marketplace': return { icon: '🕸️', name: 'Spider Web', description: 'Haunted market' };
      case 'buy-tokens': return { icon: '🕷️', name: 'Spider Money', description: 'Spiders & cursed riches' };
      default: return { icon: '🎃', name: 'Halloween', description: 'Spooky season' };
    }
  }
  
  if (isChristmas) {
    switch (page) {
      case 'hot-sell': return { icon: '🔥', name: 'Cozy Fireplace', description: 'Warm and toasty' };
      case '1v1': return { icon: '❄️', name: 'Snowball Fight', description: 'Icicles and snow' };
      case 'winner-takes-all': return { icon: '🎅', name: 'North Pole', description: "Santa's workshop" };
      case 'coin-play': return { icon: '🎁', name: 'Golden Treasure', description: 'Festive riches' };
      case 'dashboard': return { icon: '❄️', name: 'Winter Wonderland', description: 'Icicles and snow' };
      case 'games': return { icon: '🧸', name: 'Toy Shop', description: 'Magical toys' };
      case 'home': return { icon: '🏠', name: 'Winter Home', description: 'Cozy holiday' };
      case 'marketplace': return { icon: '🎄', name: 'Holiday Market', description: 'Festive shopping' };
      case 'buy-tokens': return { icon: '⛄', name: 'Snowman Shop', description: 'Frosty friends & gifts' };
      default: return { icon: '🎄', name: 'Christmas', description: 'Holiday cheer' };
    }
  }
  
  return null;
}

