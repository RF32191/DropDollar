'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

const PhaseShifterGame = dynamic(
  () => import('@/components/games/PhaseShifterGame'),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-[600px] bg-gray-900 rounded-xl flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading Phase Shifter...</p>
        </div>
      </div>
    )
  }
);

type ThemeType = 'default' | 'halloween' | 'christmas';

export default function PhaseShifterPage() {
  const [theme, setTheme] = useState<ThemeType>('default');
  const [gameKey, setGameKey] = useState(0);

  const themes: { id: ThemeType; name: string; icon: string; colors: string }[] = [
    { id: 'default', name: 'Neon', icon: '🎵', colors: 'from-cyan-600 to-pink-600' },
    { id: 'halloween', name: 'Halloween', icon: '🎃', colors: 'from-orange-600 to-purple-800' },
    { id: 'christmas', name: 'Christmas', icon: '🎄', colors: 'from-red-600 to-green-600' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/30 to-gray-900">
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
                  🎵 Phase Shifter
                </h1>
                <p className="text-sm text-gray-400">Rhythm platformer in space</p>
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
          <PhaseShifterGame 
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
              <h3 className="font-semibold text-cyan-400 mb-2">🎵 Rhythm Mechanics</h3>
              <p className="text-gray-400 text-sm">
                The neon hexagonal platform oscillates with the beat - it disappears on 
                beats and reappears during silences. Jump when it disappears to avoid 
                falling into the void!
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-yellow-400 mb-2">🎮 Jump Controls</h3>
              <ul className="text-gray-400 text-sm space-y-1">
                <li>• <strong>LOW (1/↓):</strong> Small hop for low notes</li>
                <li>• <strong>MID (2/↑/Space):</strong> Medium jump</li>
                <li>• <strong>HIGH (3/→):</strong> Big jump for high notes</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-green-400 mb-2">🎹 Music Notes</h3>
              <p className="text-gray-400 text-sm">
                Neon music notes fly at three heights. Pick your jump height to 
                dodge them - if you're at the same height as a note, you'll get hit!
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-purple-400 mb-2">⚡ Scoring</h3>
              <ul className="text-gray-400 text-sm space-y-1">
                <li>• Jump on beat: 50+ points (combo bonus)</li>
                <li>• Dodge note: 25 points</li>
                <li>• Build combos for multipliers!</li>
                <li>• Same beat pattern for all - notes are RNG!</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

