'use client';

import React, { useState } from 'react';
import { useSiteTheme } from '@/contexts/SiteThemeContext';
import { SiteTheme, SITE_THEMES } from '@/lib/siteThemes';
import { CheckCircleIcon, SparklesIcon } from '@heroicons/react/24/solid';

interface ThemePreviewProps {
  theme: SiteTheme;
  isSelected: boolean;
  onSelect: () => void;
}

function ThemePreview({ theme, isSelected, onSelect }: ThemePreviewProps) {
  const config = SITE_THEMES[theme];
  
  // Page-specific sub-themes for preview
  const subThemes = theme === 'halloween' ? [
    { page: 'Hot Sell', subTheme: '🔥 Hell', color: '#FF4500' },
    { page: '1v1', subTheme: '⚡ Frankenstein', color: '#00FF00' },
    { page: 'Winner', subTheme: '🧟 Zombies', color: '#8B4513' },
    { page: 'Coin Play', subTheme: '💀 River Styx', color: '#4B0082' },
    { page: 'Dashboard', subTheme: '🕷️ Haunted', color: '#FF6600' },
    { page: 'Games', subTheme: '🎪 Carnival', color: '#9932CC' },
  ] : theme === 'christmas' ? [
    { page: 'Hot Sell', subTheme: '🔥 Fireplace', color: '#8B0000' },
    { page: '1v1', subTheme: '❄️ Snowball', color: '#87CEEB' },
    { page: 'Winner', subTheme: '🎅 North Pole', color: '#DC143C' },
    { page: 'Coin Play', subTheme: '🎁 Treasure', color: '#FFD700' },
    { page: 'Dashboard', subTheme: '❄️ Winter', color: '#00CED1' },
    { page: 'Games', subTheme: '🧸 Toyshop', color: '#228B22' },
  ] : [];
  
  return (
    <button
      onClick={onSelect}
      className={`relative w-full p-4 rounded-2xl border-2 transition-all duration-300 text-left ${
        isSelected 
          ? 'border-green-500 bg-green-500/10 ring-2 ring-green-500/50' 
          : 'border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10'
      }`}
    >
      {/* Selected checkmark */}
      {isSelected && (
        <div className="absolute top-3 right-3">
          <CheckCircleIcon className="w-6 h-6 text-green-500" />
        </div>
      )}
      
      {/* Theme header */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-4xl">{config.icon}</span>
        <div>
          <h3 className="text-xl font-bold text-white">{config.name}</h3>
          <p className="text-sm text-gray-400">{config.description}</p>
        </div>
      </div>
      
      {/* Color preview bar */}
      <div className="flex gap-1 mb-3 rounded-lg overflow-hidden h-2">
        <div className="flex-1" style={{ backgroundColor: config.cssVars['--theme-primary'] }} />
        <div className="flex-1" style={{ backgroundColor: config.cssVars['--theme-secondary'] }} />
        <div className="flex-1" style={{ backgroundColor: config.cssVars['--theme-accent'] }} />
      </div>
      
      {/* Sub-themes for Halloween/Christmas */}
      {subThemes.length > 0 && (
        <div className="mt-3 space-y-1">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Unique Page Themes:</p>
          <div className="grid grid-cols-2 gap-1">
            {subThemes.map((sub, i) => (
              <div 
                key={i} 
                className="flex items-center gap-2 text-xs py-1 px-2 rounded bg-black/30"
              >
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: sub.color }} />
                <span className="text-gray-400">{sub.page}:</span>
                <span className="text-white">{sub.subTheme}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Default theme info */}
      {theme === 'default' && (
        <div className="mt-3 text-xs text-gray-500">
          Classic Drop Dollar experience - no page-specific themes
        </div>
      )}
    </button>
  );
}

export default function SiteThemeSelector() {
  const { currentTheme, setTheme, isSaving } = useSiteTheme();
  const [showSuccess, setShowSuccess] = useState(false);
  
  const handleThemeSelect = async (theme: SiteTheme) => {
    await setTheme(theme);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };
  
  return (
    <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
          <SparklesIcon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Site Theme</h2>
          <p className="text-sm text-gray-400">Customize your Drop Dollar experience</p>
        </div>
        {isSaving && (
          <div className="ml-auto flex items-center gap-2 text-blue-400">
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs">Saving...</span>
          </div>
        )}
      </div>
      
      {/* Success message */}
      {showSuccess && (
        <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg flex items-center gap-2">
          <CheckCircleIcon className="w-5 h-5 text-green-500" />
          <span className="text-green-400 text-sm font-medium">
            Theme applied and saved to your account! 🎉
          </span>
        </div>
      )}
      
      {/* Theme options */}
      <div className="grid gap-4">
        {(Object.keys(SITE_THEMES) as SiteTheme[]).map((theme) => (
          <ThemePreview
            key={theme}
            theme={theme}
            isSelected={currentTheme === theme}
            onSelect={() => handleThemeSelect(theme)}
          />
        ))}
      </div>
      
      {/* Info note */}
      <div className="mt-6 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <p className="text-xs text-blue-300">
          💡 <strong>Tip:</strong> Each page has unique themed animations and visuals. 
          Your preference is saved automatically and persists across sessions.
        </p>
      </div>
    </div>
  );
}

