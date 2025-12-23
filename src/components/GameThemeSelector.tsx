'use client';

import { useState } from 'react';
import { LockClosedIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { useGameTheme, GAME_THEMES } from '@/hooks/useGameTheme';
import ThemePurchaseModal from './ThemePurchaseModal';

interface GameThemeSelectorProps {
  gameId: string;
  gameName: string;
  onThemeChange?: (themeId: string) => void;
  className?: string;
}

export default function GameThemeSelector({ 
  gameId, 
  gameName, 
  onThemeChange,
  className = ''
}: GameThemeSelectorProps) {
  const {
    selectedTheme,
    isLoading,
    isPurchasing,
    userRP,
    purchaseTheme,
    selectTheme,
    getAvailableThemes
  } = useGameTheme(gameId);

  const [purchaseModalTheme, setPurchaseModalTheme] = useState<typeof GAME_THEMES[keyof typeof GAME_THEMES] & { owned: boolean; canAfford: boolean } | null>(null);

  const themes = getAvailableThemes();

  const handleThemeClick = (theme: typeof themes[0]) => {
    if (theme.owned) {
      selectTheme(theme.id);
      onThemeChange?.(theme.id);
    } else {
      setPurchaseModalTheme(theme);
    }
  };

  const handlePurchase = async () => {
    if (!purchaseModalTheme) return { success: false, error: 'No theme selected' };
    
    const result = await purchaseTheme(purchaseModalTheme.id);
    if (result.success) {
      selectTheme(purchaseModalTheme.id);
      onThemeChange?.(purchaseModalTheme.id);
    }
    return result;
  };

  if (isLoading) {
    return (
      <div className={`flex gap-2 ${className}`}>
        {[1, 2, 3].map(i => (
          <div key={i} className="w-20 h-12 bg-gray-700/50 rounded-lg animate-pulse"></div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className={`flex flex-wrap gap-2 ${className}`}>
        {themes.map(theme => (
          <button
            key={theme.id}
            onClick={() => handleThemeClick(theme)}
            className={`relative px-4 py-2 rounded-lg font-semibold transition-all duration-300 flex items-center gap-2 ${
              selectedTheme === theme.id
                ? theme.id === 'halloween'
                  ? 'bg-gradient-to-r from-orange-600 to-purple-600 text-white ring-2 ring-orange-400'
                  : theme.id === 'christmas'
                  ? 'bg-gradient-to-r from-red-600 to-green-600 text-white ring-2 ring-red-400'
                  : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white ring-2 ring-purple-400'
                : theme.owned
                ? 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                : 'bg-gray-800/50 text-gray-500 hover:bg-gray-700/50 border border-gray-600/50'
            }`}
          >
            <span>{theme.icon}</span>
            <span className="hidden sm:inline">{theme.name}</span>
            
            {/* Lock icon for unpurchased */}
            {!theme.owned && (
              <LockClosedIcon className="w-4 h-4 text-yellow-500" />
            )}
            
            {/* Check for selected */}
            {selectedTheme === theme.id && theme.owned && (
              <CheckCircleIcon className="w-4 h-4" />
            )}
            
            {/* Price badge for locked themes */}
            {!theme.owned && (
              <span className="absolute -top-2 -right-2 bg-yellow-500 text-black text-xs font-bold px-1.5 py-0.5 rounded-full">
                {theme.price}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Purchase Modal */}
      {purchaseModalTheme && (
        <ThemePurchaseModal
          isOpen={!!purchaseModalTheme}
          onClose={() => setPurchaseModalTheme(null)}
          theme={purchaseModalTheme}
          userRP={userRP}
          onPurchase={handlePurchase}
          isPurchasing={isPurchasing}
          type="game"
          gameName={gameName}
        />
      )}
    </>
  );
}

