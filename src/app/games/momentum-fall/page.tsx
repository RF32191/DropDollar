'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

const MomentumFallGame = dynamic(
  () => import('@/components/games/MomentumFallGame'),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-[600px] bg-gray-900 rounded-xl flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading Momentum Fall...</p>
        </div>
      </div>
    )
  }
);

type ThemeType = 'default' | 'halloween' | 'christmas';

export default function MomentumFallPage() {
  const [theme, setTheme] = useState<ThemeType>('default');
  const [gameKey, setGameKey] = useState(0);

  const themes: { id: ThemeType; name: string; icon: string; colors: string }[] = [
    { id: 'default', name: 'Neon', icon: '⬇️', colors: 'from-cyan-600 to-purple-600' },
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
                  ⬇️ Momentum Fall
                </h1>
                <p className="text-sm text-gray-400">Master momentum, conquer the abyss</p>
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
          <MomentumFallGame 
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
                Fall as deep as possible through the infinite shaft! Dodge obstacles,
                collect gems, and master momentum to achieve the highest score.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-yellow-400 mb-2">🎮 Controls</h3>
              <ul className="text-gray-400 text-sm space-y-1">
                <li>• <strong>Desktop:</strong> WASD or Arrow Keys</li>
                <li>• <strong>Mobile:</strong> Touch and drag to tilt</li>
                <li>• <strong>Tip:</strong> Smooth movements = better control</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-green-400 mb-2">⚡ Scoring</h3>
              <ul className="text-gray-400 text-sm space-y-1">
                <li>• Pass obstacle: 50+ points (combo bonus)</li>
                <li>• Perfect pass (center): +100 bonus!</li>
                <li>• Gems: 25-100 points each</li>
                <li>• Boost pickups: Increase fall speed</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-purple-400 mb-2">🏆 Strategy</h3>
              <ul className="text-gray-400 text-sm space-y-1">
                <li>• Build combos for multiplied points</li>
                <li>• Stay centered for perfect passes</li>
                <li>• Watch for spinning obstacles!</li>
                <li>• Same layout daily - master the path</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

