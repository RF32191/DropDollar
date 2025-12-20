'use client';

import React, { useState, useEffect } from 'react';
import { GameTheme, THEME_INFO, getSavedTheme, saveTheme } from '@/lib/gameThemes';

interface GameThemeSelectorProps {
  currentTheme: GameTheme;
  onThemeChange: (theme: GameTheme) => void;
  compact?: boolean; // For inline display in instructions
}

export default function GameThemeSelector({ 
  currentTheme, 
  onThemeChange,
  compact = false 
}: GameThemeSelectorProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [savedTheme, setSavedTheme] = useState<GameTheme>('standard');

  useEffect(() => {
    const saved = getSavedTheme();
    setSavedTheme(saved);
    setIsSaved(currentTheme === saved);
  }, [currentTheme]);

  const handleThemeSelect = (theme: GameTheme) => {
    onThemeChange(theme);
    setIsSaved(theme === savedTheme);
  };

  const handleSaveAsDefault = () => {
    saveTheme(currentTheme);
    setSavedTheme(currentTheme);
    setIsSaved(true);
  };

  if (compact) {
    return (
      <div className="flex flex-col items-center gap-2 w-full">
        <div className="text-sm text-gray-400 mb-1">🎨 Game Theme</div>
        <div className="flex gap-2 flex-wrap justify-center">
          {(Object.keys(THEME_INFO) as GameTheme[]).map((theme) => (
            <button
              key={theme}
              onClick={() => handleThemeSelect(theme)}
              className={`px-3 py-2 rounded-lg font-bold text-sm transition-all ${
                currentTheme === theme
                  ? theme === 'standard' 
                    ? 'bg-blue-500 text-white ring-2 ring-white'
                    : theme === 'halloween'
                    ? 'bg-orange-600 text-white ring-2 ring-orange-300'
                    : 'bg-red-600 text-white ring-2 ring-green-300'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {THEME_INFO[theme].emoji} {THEME_INFO[theme].name}
            </button>
          ))}
        </div>
        {!isSaved && (
          <button
            onClick={handleSaveAsDefault}
            className="mt-2 px-4 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-full transition-all flex items-center gap-1"
          >
            💾 Save as Default (for competitions)
          </button>
        )}
        {isSaved && currentTheme !== 'standard' && (
          <div className="mt-2 text-xs text-green-400 flex items-center gap-1">
            ✅ Saved as your default theme!
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-600 w-full max-w-md">
      <h3 className="text-lg font-bold text-white mb-3 text-center">
        🎨 Choose Your Theme
      </h3>
      <p className="text-xs text-gray-400 text-center mb-4">
        Theme applies to practice and competitions
      </p>
      
      <div className="grid grid-cols-3 gap-2 mb-4">
        {(Object.keys(THEME_INFO) as GameTheme[]).map((theme) => (
          <button
            key={theme}
            onClick={() => handleThemeSelect(theme)}
            className={`p-3 rounded-lg transition-all flex flex-col items-center gap-1 ${
              currentTheme === theme
                ? theme === 'standard' 
                  ? 'bg-gradient-to-br from-blue-500 to-cyan-500 ring-2 ring-white'
                  : theme === 'halloween'
                  ? 'bg-gradient-to-br from-orange-600 to-purple-800 ring-2 ring-orange-300'
                  : 'bg-gradient-to-br from-red-600 to-green-700 ring-2 ring-white'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            <span className="text-2xl">{THEME_INFO[theme].emoji}</span>
            <span className="text-xs font-bold text-white">{THEME_INFO[theme].name}</span>
          </button>
        ))}
      </div>
      
      <div className="text-center">
        {!isSaved ? (
          <button
            onClick={handleSaveAsDefault}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-all flex items-center gap-2 mx-auto"
          >
            💾 Save as Default Theme
          </button>
        ) : (
          <div className="text-sm text-green-400 flex items-center justify-center gap-2">
            ✅ {THEME_INFO[currentTheme].name} is your default!
          </div>
        )}
      </div>
    </div>
  );
}

