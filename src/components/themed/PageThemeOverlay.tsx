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
} from './HalloweenOverlays';
import {
  FireplaceOverlay,
  SnowballOverlay,
  NorthPoleOverlay,
  TreasureOverlay,
  WinterOverlay,
  ToyshopOverlay,
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
  | 'home';

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
        return <HauntedOverlay />; // Reuse haunted for marketplace
      case 'home':
        return <HauntedOverlay />; // Reuse haunted for home
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
      case 'hot-sell': return { icon: '🔥', name: 'Hell', description: 'Flames and hellfire' };
      case '1v1': return { icon: '⚡', name: 'Frankenstein Lab', description: 'Lightning and electricity' };
      case 'winner-takes-all': return { icon: '🧟', name: 'Zombie Graveyard', description: 'Undead rising' };
      case 'coin-play': return { icon: '💀', name: 'River Styx', description: 'Greek underworld' };
      case 'dashboard': return { icon: '🕷️', name: 'Haunted', description: 'Spiders and bats' };
      case 'games': return { icon: '🎪', name: 'Creepy Carnival', description: 'Dark circus' };
      default: return { icon: '🎃', name: 'Halloween', description: 'Spooky season' };
    }
  }
  
  if (isChristmas) {
    switch (page) {
      case 'hot-sell': return { icon: '🔥', name: 'Cozy Fireplace', description: 'Warm and toasty' };
      case '1v1': return { icon: '❄️', name: 'Snowball Fight', description: 'Winter battle' };
      case 'winner-takes-all': return { icon: '🎅', name: 'North Pole', description: "Santa's workshop" };
      case 'coin-play': return { icon: '🎁', name: 'Golden Treasure', description: 'Festive riches' };
      case 'dashboard': return { icon: '❄️', name: 'Winter Wonderland', description: 'Gentle snow' };
      case 'games': return { icon: '🧸', name: 'Toy Shop', description: 'Magical toys' };
      default: return { icon: '🎄', name: 'Christmas', description: 'Holiday cheer' };
    }
  }
  
  return null;
}

