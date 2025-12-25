'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

const HexArenaGame = dynamic(
  () => import('@/components/games/HexArenaGame'),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-[600px] bg-gray-900 rounded-xl flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading HexArena...</p>
        </div>
      </div>
    )
  }
);

type ThemeType = 'default' | 'halloween' | 'christmas';

export default function HexArenaPage() {
  const [theme, setTheme] = useState<ThemeType>('default');
  const [gameKey, setGameKey] = useState(0);

  const themes: { id: ThemeType; name: string; icon: string; colors: string }[] = [
    { id: 'default', name: 'Neon', icon: '⬡', colors: 'from-cyan-600 to-purple-600' },
    { id: 'halloween', name: 'Halloween', icon: '🎃', colors: 'from-orange-600 to-purple-800' },
    { id: 'christmas', name: 'Christmas', icon: '🎄', colors: 'from-red-600 to-green-600' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="bg-black/50 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/games" 
                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all"
              >
                <ArrowLeftIcon className="w-5 h-5 text-white" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  ⬡ HexArena
                </h1>
                <p className="text-sm text-gray-400">Survive the collapsing hex tiles!</p>
              </div>
            </div>
            
            {/* Theme Selector */}
            <div className="flex gap-2">
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setTheme(t.id);
                    setGameKey(prev => prev + 1);
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                    theme === t.id
                      ? `bg-gradient-to-r ${t.colors} text-white shadow-lg`
                      : 'bg-white/10 text-gray-400 hover:bg-white/20 hover:text-white'
                  }`}
                >
                  <span>{t.icon}</span>
                  <span className="hidden sm:inline">{t.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Game Container */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="aspect-[16/10] w-full">
          <HexArenaGame 
            key={gameKey}
            isPractice={true} 
            theme={theme}
          />
        </div>
        
        {/* How to Play */}
        <div className="mt-6 bg-white/5 border border-white/10 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">How to Play</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-cyan-400 mb-2">🎯 Objective</h3>
              <p className="text-gray-400 text-sm">
                Move across the hexagonal arena. Every tile you step on will 
                collapse shortly after - keep moving to survive!
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-yellow-400 mb-2">🎮 Controls</h3>
              <ul className="text-gray-400 text-sm space-y-1">
                <li>• <strong>Desktop:</strong> WASD or Arrow Keys</li>
                <li>• <strong>Mobile:</strong> Touch & drag to move</li>
                <li>• Move continuously - don't stop!</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-green-400 mb-2">⚡ Scoring</h3>
              <ul className="text-gray-400 text-sm space-y-1">
                <li>• Each new tile: +10 points</li>
                <li>• Combo bonus: +25 per 5 chain</li>
                <li>• Survival bonus: +5 per second</li>
                <li>• Coverage bonus at end</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-red-400 mb-2">⚠️ Watch Out</h3>
              <ul className="text-gray-400 text-sm space-y-1">
                <li>• <span className="text-yellow-400">Orange</span> = Warning (move away!)</li>
                <li>• <span className="text-red-400">Red</span> = Falling now!</li>
                <li>• Don't backtrack to fallen tiles</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

