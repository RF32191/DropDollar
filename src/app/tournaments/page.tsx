'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useGlobalLocation } from '@/hooks/useGlobalLocation';
import { ShieldCheckIcon } from '@heroicons/react/24/outline';

const AVAILABLE_GAMES = [
  { id: 'multi-target', name: 'Multi-Target Reaction', icon: '🎯' },
  { id: 'falling-objects', name: 'Falling Object Catch', icon: '💰' },
  { id: 'color-sequence', name: 'Color Sequence Memory', icon: '🌈' },
  { id: 'laser-dodge', name: 'Laser Dodge EXTREME', icon: '🔥' },
  { id: 'quick-click', name: 'QuickClick Challenge', icon: '⚡' },
  { id: 'sword-slash', name: 'Sword Slash', icon: '⚔️' }
];

export default function TournamentsPage() {
  const [selectedGames, setSelectedGames] = useState({
    '$1': 'multi-target',
    '$5': 'falling-objects', 
    '$10': 'color-sequence',
    '$25': 'multi-target'
  });
  const { user, isLoading } = useAuth();
  const globalLocation = useGlobalLocation();

  // Check if gaming is allowed in the user's state
  const isGamingAllowed = (state: string): { allowed: boolean; message: string } => {
    const stateLower = state.toLowerCase();
    
    // States where skill-based gaming is generally allowed
    const allowedStates = [
      'california', 'texas', 'florida', 'new york', 'illinois', 'pennsylvania',
      'ohio', 'georgia', 'north carolina', 'michigan', 'new jersey', 'virginia',
      'washington', 'arizona', 'massachusetts', 'tennessee', 'indiana', 'missouri',
      'maryland', 'wisconsin', 'colorado', 'minnesota', 'south carolina', 'alabama',
      'louisiana', 'kentucky', 'oregon', 'oklahoma', 'connecticut', 'utah',
      'iowa', 'nevada', 'arkansas', 'mississippi', 'kansas', 'new mexico',
      'nebraska', 'west virginia', 'idaho', 'hawaii', 'new hampshire', 'maine',
      'montana', 'rhode island', 'delaware', 'south dakota', 'north dakota',
      'alaska', 'vermont', 'wyoming'
    ];

    if (allowedStates.includes(stateLower)) {
      return {
        allowed: true,
        message: `✅ Gaming allowed in ${state}! You can participate in skill-based competitions.`
      };
    } else {
      return {
        allowed: false,
        message: `⚠️ Gaming restrictions may apply in ${state}. Please check local regulations.`
      };
    }
  };

  const handleGameChange = (matchType: string, gameId: string) => {
    setSelectedGames(prev => ({
      ...prev,
      [matchType]: gameId
    }));
  };

  const getSelectedGame = (matchType: string) => {
    const gameId = selectedGames[matchType as keyof typeof selectedGames];
    return AVAILABLE_GAMES.find(game => game.id === gameId) || AVAILABLE_GAMES[0];
  };

  const handleCreateMatch = (type: string, amount: string, gameType: string) => {
    console.log(`Creating ${type} match for ${amount} with game: ${gameType}`);
    // TODO: Implement actual match creation logic
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      {/* GOLD TOURNAMENTS Header */}
      <header className="bg-gradient-to-r from-yellow-600 via-yellow-700 to-amber-800 shadow-2xl border-b-4 border-yellow-500">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <div className="flex justify-between items-center">
            {/* Logo Section */}
            <Link href="/" className="flex items-center group">
              <div className="bg-gradient-to-br from-yellow-400 to-amber-600 p-3 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105 mr-4">
                <img
                  src="/DropCoin.png"
                  alt="DropDollar Logo"
                  className="w-8 h-8 object-contain"
                />
              </div>
              <div className="text-white">
                <h1 className="text-2xl font-black tracking-tight">DropDollar</h1>
                <p className="text-yellow-200 text-sm font-medium">Skill Tournaments</p>
              </div>
            </Link>

            {/* Navigation Links */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link href="/buy-tokens" className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold px-4 py-2 rounded-lg transition-all hover:scale-105 shadow-lg">
                💰 Buy Tokens
              </Link>
              <Link href="/listings" className="text-white hover:text-yellow-200 font-medium transition-colors">
                Browse
              </Link>
              <Link href="/hot-sell" className="text-white hover:text-yellow-200 font-medium transition-colors">
                Hot Sell
              </Link>
              <Link href="/games" className="text-white hover:text-yellow-200 font-medium transition-colors">
                Games
              </Link>
              <Link href="/testimonials" className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-bold px-4 py-2 rounded-lg transition-all hover:scale-105 shadow-lg">
                ⭐ Victory Stories
              </Link>
              <Link href="/faq" className="bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white font-bold px-4 py-2 rounded-lg transition-all hover:scale-105 shadow-lg">
                ❓ FAQ
              </Link>
            </nav>

            {/* User Actions */}
            <div className="flex items-center space-x-4">
              <Link href="/seller/apply" className="bg-gradient-to-r from-yellow-300 to-amber-400 hover:from-yellow-400 hover:to-amber-500 text-yellow-900 px-6 py-2.5 rounded-xl font-bold transition-all hover:scale-105 shadow-lg">
                Sell
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Enhanced Tournament Banners (Hot Sell Style) */}
        <div className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-6xl font-extrabold mb-6">
              <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent animate-pulse">
                🏆 LIVE SKILL TOURNAMENTS
              </span>
            </h2>
            <div className="w-32 h-1 bg-gradient-to-r from-yellow-400 to-red-500 mx-auto rounded-full animate-pulse mb-6"></div>
            <p className="text-xl text-transparent bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text animate-pulse">Join high-stakes tournaments with winner tracking and weekly limits!</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {/* $500 Tournament */}
          <div className="relative bg-gradient-to-br from-gray-900 via-black to-gray-800 rounded-3xl p-8 shadow-2xl border-2 border-red-500/30 hover:scale-105 transition-all duration-300 group overflow-hidden">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-4 right-4 w-24 h-24 bg-red-500/20 rounded-full blur-xl animate-pulse"></div>
              <div className="absolute bottom-4 left-4 w-32 h-32 bg-red-500/10 rounded-full blur-xl animate-pulse delay-1000"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-red-900/20 to-transparent"></div>
            </div>
            <div className="relative z-10 text-center mb-6">
              <div className="text-6xl mb-4">⚡</div>
              <h3 className="text-2xl font-black text-white mb-2">$500 Prize Pool</h3>
              <div className="text-3xl font-black text-red-400 mb-2">Winner Gets: $425</div>
              <p className="text-xl font-bold text-white/90 mb-1">$500 Elite Championship</p>
              <p className="text-red-300">Multi-Target Reaction</p>
              <div className="text-sm text-gray-400 mt-2">(-15% platform fee)</div>
            </div>
            
            <div className="relative z-10 space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-red-500/20">
                  <div className="text-2xl font-bold text-white">0/100</div>
                  <div className="text-xs text-gray-300">Participants</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-red-500/20">
                  <div className="text-2xl font-bold text-white">$5</div>
                  <div className="text-xs text-gray-300">Entry Fee</div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-300 font-medium">Tournament Progress</span>
                  <span className="text-gray-400">0%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3">
                  <div className="bg-gradient-to-r from-red-500 to-red-600 h-3 rounded-full transition-all duration-500" style={{width: '0%'}}></div>
                </div>
              </div>
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-red-500/10">
                <div className="flex items-center justify-between text-sm text-gray-300">
                  <div className="flex items-center">
                    <span className="mr-1">🛡️</span><span>1 Submission Only</span>
                  </div>
                  <div className="flex items-center">
                    <span className="mr-1">📅</span><span>Weekly Limit</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="relative z-10">
              {globalLocation.status === 'granted' ? (
                <button className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black py-4 px-6 rounded-xl transition-all hover:scale-105 shadow-lg border border-red-500/50">
                  ⚡ JOIN TOURNAMENT - $5
                </button>
              ) : (
                <div className="w-full py-4 px-6 rounded-xl bg-gray-700 border border-gray-600 text-center">
                  <div className="text-gray-400 text-sm mb-2">
                    <ShieldCheckIcon className="h-5 w-5 inline mr-2" />
                    Location Verification Required
                  </div>
                  <button 
                    onClick={() => globalLocation.requestLocation()}
                    className="text-red-400 hover:text-red-300 font-medium text-sm"
                  >
                    Enable Location to Join Tournament
                  </button>
                </div>
              )}
            </div>
            <div className="absolute top-4 left-4 bg-red-600/80 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-bold text-white">🤖 Auto-Generated</div>
          </div>

          {/* $250 Tournament */}
          <div className="relative bg-gradient-to-br from-gray-900 via-black to-gray-800 rounded-3xl p-8 shadow-2xl border-2 border-orange-500/30 hover:scale-105 transition-all duration-300 group overflow-hidden">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-4 right-4 w-24 h-24 bg-orange-500/20 rounded-full blur-xl animate-pulse"></div>
              <div className="absolute bottom-4 left-4 w-32 h-32 bg-orange-500/10 rounded-full blur-xl animate-pulse delay-1000"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-orange-900/20 to-transparent"></div>
            </div>
            <div className="relative z-10 text-center mb-6">
              <div className="text-6xl mb-4">🔥</div>
              <h3 className="text-2xl font-black text-white mb-2">$250 Prize Pool</h3>
              <div className="text-3xl font-black text-orange-400 mb-2">Winner Gets: $212.50</div>
              <p className="text-xl font-bold text-white/90 mb-1">$250 Pro Tournament</p>
              <p className="text-orange-300">Falling Object Catch</p>
              <div className="text-sm text-gray-400 mt-2">(-15% platform fee)</div>
            </div>
            
            <div className="relative z-10 space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-orange-500/20">
                  <div className="text-2xl font-bold text-white">0/50</div>
                  <div className="text-xs text-gray-300">Participants</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-orange-500/20">
                  <div className="text-2xl font-bold text-white">$5</div>
                  <div className="text-xs text-gray-300">Entry Fee</div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-300 font-medium">Tournament Progress</span>
                  <span className="text-gray-400">0%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3">
                  <div className="bg-gradient-to-r from-orange-500 to-orange-600 h-3 rounded-full transition-all duration-500" style={{width: '0%'}}></div>
                </div>
              </div>
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-orange-500/10">
                <div className="flex items-center justify-between text-sm text-gray-300">
                  <div className="flex items-center">
                    <span className="mr-1">🛡️</span><span>1 Submission Only</span>
                  </div>
                  <div className="flex items-center">
                    <span className="mr-1">📅</span><span>Weekly Limit</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="relative z-10">
              {globalLocation.status === 'granted' ? (
                <button className="w-full bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 text-white font-black py-4 px-6 rounded-xl transition-all hover:scale-105 shadow-lg border border-orange-500/50">
                  🔥 JOIN TOURNAMENT - $5
                </button>
              ) : (
                <div className="w-full py-4 px-6 rounded-xl bg-gray-700 border border-gray-600 text-center">
                  <div className="text-gray-400 text-sm mb-2">
                    <ShieldCheckIcon className="h-5 w-5 inline mr-2" />
                    Location Verification Required
                  </div>
                  <button 
                    onClick={() => globalLocation.requestLocation()}
                    className="text-orange-400 hover:text-orange-300 font-medium text-sm"
                  >
                    Enable Location to Join Tournament
                  </button>
                </div>
              )}
            </div>
            <div className="absolute top-4 left-4 bg-orange-600/80 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-bold text-white">🤖 Auto-Generated</div>
          </div>

          {/* $100 Tournament */}
          <div className="relative bg-gradient-to-br from-gray-900 via-black to-gray-800 rounded-3xl p-8 shadow-2xl border-2 border-yellow-500/30 hover:scale-105 transition-all duration-300 group overflow-hidden">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-4 right-4 w-24 h-24 bg-yellow-500/20 rounded-full blur-xl animate-pulse"></div>
              <div className="absolute bottom-4 left-4 w-32 h-32 bg-yellow-500/10 rounded-full blur-xl animate-pulse delay-1000"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-yellow-900/20 to-transparent"></div>
            </div>
            <div className="relative z-10 text-center mb-6">
              <div className="text-6xl mb-4">💫</div>
              <h3 className="text-2xl font-black text-white mb-2">$100 Prize Pool</h3>
              <div className="text-3xl font-black text-yellow-400 mb-2">Winner Gets: $85</div>
              <p className="text-xl font-bold text-white/90 mb-1">$100 Challenger Cup</p>
              <p className="text-yellow-300">Color Sequence Memory</p>
              <div className="text-sm text-gray-400 mt-2">(-15% platform fee)</div>
            </div>
            
            <div className="relative z-10 space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-yellow-500/20">
                  <div className="text-2xl font-bold text-white">0/25</div>
                  <div className="text-xs text-gray-300">Participants</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-yellow-500/20">
                  <div className="text-2xl font-bold text-white">$5</div>
                  <div className="text-xs text-gray-300">Entry Fee</div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-300 font-medium">Tournament Progress</span>
                  <span className="text-gray-400">0%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3">
                  <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 h-3 rounded-full transition-all duration-500" style={{width: '0%'}}></div>
                </div>
              </div>
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-yellow-500/10">
                <div className="flex items-center justify-between text-sm text-gray-300">
                  <div className="flex items-center">
                    <span className="mr-1">🛡️</span><span>1 Submission Only</span>
                  </div>
                  <div className="flex items-center">
                    <span className="mr-1">📅</span><span>Weekly Limit</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="relative z-10">
              {globalLocation.status === 'granted' ? (
                <button className="w-full bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-500 hover:to-yellow-600 text-white font-black py-4 px-6 rounded-xl transition-all hover:scale-105 shadow-lg border border-yellow-500/50">
                  💫 JOIN TOURNAMENT - $5
                </button>
              ) : (
                <div className="w-full py-4 px-6 rounded-xl bg-gray-700 border border-gray-600 text-center">
                  <div className="text-gray-400 text-sm mb-2">
                    <ShieldCheckIcon className="h-5 w-5 inline mr-2" />
                    Location Verification Required
                  </div>
                  <button 
                    onClick={() => globalLocation.requestLocation()}
                    className="text-yellow-400 hover:text-yellow-300 font-medium text-sm"
                  >
                    Enable Location to Join Tournament
                  </button>
                </div>
              )}
            </div>
            <div className="absolute top-4 left-4 bg-yellow-600/80 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-bold text-black">🤖 Auto-Generated</div>
          </div>
        </div>
        </div>

        {/* 1v1 SKILL MATCHES Section */}
        <div className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-black text-purple-600 dark:text-purple-400 mb-4">⚔️ 1v1 SKILL MATCHES</h2>
            <p className="text-lg text-gray-600 dark:text-gray-300">Challenge players of similar skill level in direct competition!</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* $1 Match */}
            <div className="relative bg-gradient-to-br from-gray-900 via-black to-gray-800 rounded-3xl p-6 shadow-2xl border-2 border-green-500/30 hover:scale-105 transition-all duration-300 group overflow-hidden">
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-3 right-3 w-16 h-16 bg-green-500/20 rounded-full blur-lg animate-pulse"></div>
                <div className="absolute bottom-3 left-3 w-20 h-20 bg-green-500/10 rounded-full blur-lg animate-pulse delay-500"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-green-900/20 to-transparent"></div>
              </div>
              <div className="relative z-10 text-center mb-4">
                <div className="text-4xl mb-3">💚</div>
                <h3 className="text-xl font-black text-white mb-2">$1 Quick Match</h3>
                <div className="text-2xl font-black text-green-400 mb-1">Winner: $0.85</div>
                <p className="text-green-300 text-sm">Starter Duel</p>
                <div className="text-xs text-gray-400 mt-1">(-15% platform fee)</div>
              </div>
              
              {/* Game Selection */}
              <div className="relative z-10 mb-4">
                <label className="block text-xs text-gray-300 mb-2 text-center">Choose Game:</label>
                <select 
                  value={selectedGames['$1']}
                  onChange={(e) => handleGameChange('$1', e.target.value)}
                  className="w-full bg-white/10 backdrop-blur-sm border border-green-500/30 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-green-400"
                >
                  {AVAILABLE_GAMES.map(game => (
                    <option key={game.id} value={game.id} className="bg-gray-800 text-white">
                      {game.icon} {game.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="relative z-10 space-y-3 mb-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 text-center border border-green-500/20">
                  <div className="text-lg font-bold text-white">$1</div>
                  <div className="text-xs text-gray-300">Entry Fee</div>
                </div>
                <div className="bg-white/5 backdrop-blur-sm rounded-lg p-2 border border-green-500/10">
                  <div className="flex items-center justify-center text-xs text-gray-300">
                    <span className="mr-1">🎯</span><span>Skill Matched</span>
                  </div>
                </div>
              </div>
              
              <div className="relative z-10">
                <button 
                  onClick={() => handleCreateMatch('1v1', '$1', getSelectedGame('$1').name)}
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white font-bold py-3 px-4 rounded-lg transition-all hover:scale-105 shadow-lg border border-green-500/50 text-sm"
                >
                  💚 CREATE MATCH - $1
                </button>
              </div>
              <div className="absolute top-3 left-3 bg-green-600/80 backdrop-blur-sm rounded-full px-2 py-1 text-xs font-bold text-white">⚡ NEW</div>
            </div>

            {/* $5 Match */}
            <div className="relative bg-gradient-to-br from-gray-900 via-black to-gray-800 rounded-3xl p-6 shadow-2xl border-2 border-blue-500/30 hover:scale-105 transition-all duration-300 group overflow-hidden">
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-3 right-3 w-16 h-16 bg-blue-500/20 rounded-full blur-lg animate-pulse"></div>
                <div className="absolute bottom-3 left-3 w-20 h-20 bg-blue-500/10 rounded-full blur-lg animate-pulse delay-500"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-blue-900/20 to-transparent"></div>
              </div>
              <div className="relative z-10 text-center mb-4">
                <div className="text-4xl mb-3">🛡️</div>
                <h3 className="text-xl font-black text-white mb-2">$5 Standard</h3>
                <div className="text-2xl font-black text-blue-400 mb-1">Winner: $4.25</div>
                <p className="text-blue-300 text-sm">Classic Duel</p>
                <div className="text-xs text-gray-400 mt-1">(-15% platform fee)</div>
              </div>
              
              {/* Game Selection */}
              <div className="relative z-10 mb-4">
                <label className="block text-xs text-gray-300 mb-2 text-center">Choose Game:</label>
                <select 
                  value={selectedGames['$5']}
                  onChange={(e) => handleGameChange('$5', e.target.value)}
                  className="w-full bg-white/10 backdrop-blur-sm border border-blue-500/30 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-blue-400"
                >
                  {AVAILABLE_GAMES.map(game => (
                    <option key={game.id} value={game.id} className="bg-gray-800 text-white">
                      {game.icon} {game.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="relative z-10 space-y-3 mb-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 text-center border border-blue-500/20">
                  <div className="text-lg font-bold text-white">$5</div>
                  <div className="text-xs text-gray-300">Entry Fee</div>
                </div>
                <div className="bg-white/5 backdrop-blur-sm rounded-lg p-2 border border-blue-500/10">
                  <div className="flex items-center justify-center text-xs text-gray-300">
                    <span className="mr-1">🎯</span><span>Skill Matched</span>
                  </div>
                </div>
              </div>
              
              <div className="relative z-10">
                <button 
                  onClick={() => handleCreateMatch('1v1', '$5', getSelectedGame('$5').name)}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-3 px-4 rounded-lg transition-all hover:scale-105 shadow-lg border border-blue-500/50 text-sm"
                >
                  🛡️ CREATE MATCH - $5
                </button>
              </div>
              <div className="absolute top-3 left-3 bg-blue-600/80 backdrop-blur-sm rounded-full px-2 py-1 text-xs font-bold text-white">🔥 Popular</div>
            </div>

            {/* $10 Match */}
            <div className="relative bg-gradient-to-br from-gray-900 via-black to-gray-800 rounded-3xl p-6 shadow-2xl border-2 border-purple-500/30 hover:scale-105 transition-all duration-300 group overflow-hidden">
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-3 right-3 w-16 h-16 bg-purple-500/20 rounded-full blur-lg animate-pulse"></div>
                <div className="absolute bottom-3 left-3 w-20 h-20 bg-purple-500/10 rounded-full blur-lg animate-pulse delay-500"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-purple-900/20 to-transparent"></div>
              </div>
              <div className="relative z-10 text-center mb-4">
                <div className="text-4xl mb-3">⚔️</div>
                <h3 className="text-xl font-black text-white mb-2">$10 Advanced</h3>
                <div className="text-2xl font-black text-purple-400 mb-1">Winner: $8.50</div>
                <p className="text-purple-300 text-sm">Pro Duel</p>
                <div className="text-xs text-gray-400 mt-1">(-15% platform fee)</div>
              </div>
              
              {/* Game Selection */}
              <div className="relative z-10 mb-4">
                <label className="block text-xs text-gray-300 mb-2 text-center">Choose Game:</label>
                <select 
                  value={selectedGames['$10']}
                  onChange={(e) => handleGameChange('$10', e.target.value)}
                  className="w-full bg-white/10 backdrop-blur-sm border border-purple-500/30 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-purple-400"
                >
                  {AVAILABLE_GAMES.map(game => (
                    <option key={game.id} value={game.id} className="bg-gray-800 text-white">
                      {game.icon} {game.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="relative z-10 space-y-3 mb-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 text-center border border-purple-500/20">
                  <div className="text-lg font-bold text-white">$10</div>
                  <div className="text-xs text-gray-300">Entry Fee</div>
                </div>
                <div className="bg-white/5 backdrop-blur-sm rounded-lg p-2 border border-purple-500/10">
                  <div className="flex items-center justify-center text-xs text-gray-300">
                    <span className="mr-1">🎯</span><span>Skill Matched</span>
                  </div>
                </div>
              </div>
              
              <div className="relative z-10">
                <button 
                  onClick={() => handleCreateMatch('1v1', '$10', getSelectedGame('$10').name)}
                  className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-bold py-3 px-4 rounded-lg transition-all hover:scale-105 shadow-lg border border-purple-500/50 text-sm"
                >
                  ⚔️ CREATE MATCH - $10
                </button>
              </div>
              <div className="absolute top-3 left-3 bg-purple-600/80 backdrop-blur-sm rounded-full px-2 py-1 text-xs font-bold text-white">💎 Premium</div>
            </div>

            {/* $25 Match */}
            <div className="relative bg-gradient-to-br from-gray-900 via-black to-gray-800 rounded-3xl p-6 shadow-2xl border-2 border-red-500/30 hover:scale-105 transition-all duration-300 group overflow-hidden">
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-3 right-3 w-16 h-16 bg-red-500/20 rounded-full blur-lg animate-pulse"></div>
                <div className="absolute bottom-3 left-3 w-20 h-20 bg-red-500/10 rounded-full blur-lg animate-pulse delay-500"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-red-900/20 to-transparent"></div>
              </div>
              <div className="relative z-10 text-center mb-4">
                <div className="text-4xl mb-3">👑</div>
                <h3 className="text-xl font-black text-white mb-2">$25 Elite</h3>
                <div className="text-2xl font-black text-red-400 mb-1">Winner: $21.25</div>
                <p className="text-red-300 text-sm">Master Duel</p>
                <div className="text-xs text-gray-400 mt-1">(-15% platform fee)</div>
              </div>
              
              {/* Game Selection */}
              <div className="relative z-10 mb-4">
                <label className="block text-xs text-gray-300 mb-2 text-center">Choose Game:</label>
                <select 
                  value={selectedGames['$25']}
                  onChange={(e) => handleGameChange('$25', e.target.value)}
                  className="w-full bg-white/10 backdrop-blur-sm border border-red-500/30 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-red-400"
                >
                  {AVAILABLE_GAMES.map(game => (
                    <option key={game.id} value={game.id} className="bg-gray-800 text-white">
                      {game.icon} {game.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="relative z-10 space-y-3 mb-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 text-center border border-red-500/20">
                  <div className="text-lg font-bold text-white">$25</div>
                  <div className="text-xs text-gray-300">Entry Fee</div>
                </div>
                <div className="bg-white/5 backdrop-blur-sm rounded-lg p-2 border border-red-500/10">
                  <div className="flex items-center justify-center text-xs text-gray-300">
                    <span className="mr-1">🎯</span><span>Skill Matched</span>
                  </div>
                </div>
              </div>
              
              <div className="relative z-10">
                <button 
                  onClick={() => handleCreateMatch('1v1', '$25', getSelectedGame('$25').name)}
                  className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold py-3 px-4 rounded-lg transition-all hover:scale-105 shadow-lg border border-red-500/50 text-sm"
                >
                  👑 CREATE MATCH - $25
                </button>
              </div>
              <div className="absolute top-3 left-3 bg-red-600/80 backdrop-blur-sm rounded-full px-2 py-1 text-xs font-bold text-white">⚡ Elite</div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-gray-800 to-gray-900 border-2 border-purple-500/30 rounded-2xl p-6">
            <div className="flex items-start">
              <span className="text-purple-400 text-2xl mr-3 mt-0.5">⚔️</span>
              <div className="text-sm text-gray-300">
                <p className="font-bold mb-3 text-lg text-purple-400">💡 1v1 Match Prize Breakdown</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ul className="space-y-2 text-sm">
                    <li>• <strong className="text-green-400">$1 Match:</strong> $2 pool → Winner gets $0.85 (-15%)</li>
                    <li>• <strong className="text-blue-400">$5 Match:</strong> $10 pool → Winner gets $4.25 (-15%)</li>
                    <li>• <strong className="text-purple-400">$10 Match:</strong> $20 pool → Winner gets $8.50 (-15%)</li>
                    <li>• <strong className="text-red-400">$25 Match:</strong> $50 pool → Winner gets $21.25 (-15%)</li>
                  </ul>
                  <ul className="space-y-2 text-sm">
                    <li>• <strong className="text-yellow-400">Platform Fee:</strong> 15% deducted from total prize pool</li>
                    <li>• <strong className="text-cyan-400">Skill Matching:</strong> Players matched by ELO rating</li>
                    <li>• <strong className="text-pink-400">Instant Play:</strong> Direct 1v1 competition</li>
                    <li>• <strong className="text-orange-400">Fair Play:</strong> Same RNG seed for both players</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="bg-gradient-to-r from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30 border-2 border-red-300 dark:border-red-600 rounded-2xl p-6 mb-8">
          <div className="text-center">
            <h3 className="text-lg font-bold text-red-900 dark:text-red-100 mb-4">💰 Daily Tournament Rules</h3>
            <div className="text-red-800 dark:text-red-200 text-center mb-4">
              <p className="mb-2"><strong>$5 Entry Fee:</strong> All daily tournaments have a fixed $5 entry fee to keep competition accessible.</p>
              <p className="mb-2"><strong>15% Platform Fee:</strong> DropDollar takes 15% of the total prize pool. Winners get 85% of collected fees.</p>
              <p><strong>Daily Reset:</strong> Tournaments reset every day unless they haven't filled up - then they continue until complete.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}