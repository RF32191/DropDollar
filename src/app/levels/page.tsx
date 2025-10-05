'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface LevelInfo {
  level: number;
  name: string;
  pointsRequired: number;
  gamesRequired: number;
  color: string;
  icon: string;
  spendablePoints: number;
  tokens: number;
  description: string;
}

export default function LevelsPage() {
  const [selectedTier, setSelectedTier] = useState<'beginner' | 'intermediate' | 'advanced' | 'master' | 'transcendent' | 'god'>('beginner');
  const [searchLevel, setSearchLevel] = useState('');

  // Generate level data based on 100,000 games = level 100
  const generateLevelData = (): LevelInfo[] => {
    const levels: LevelInfo[] = [];
    
    for (let level = 1; level <= 100; level++) {
      // Exponential scaling: games required = level^2 * 10
      const gamesRequired = Math.floor(Math.pow(level, 2) * 10);
      // Points = games * average 15 points per game
      const pointsRequired = level === 1 ? 0 : Math.floor(gamesRequired * 15);
      // Spendable points = 50% of total points earned
      const spendablePoints = Math.floor(pointsRequired * 0.5);
      // Tokens = level * 10
      const tokens = level * 10;

      let tier = 'beginner';
      let color = '#6B7280';
      let icon = '🎮';
      let name = `Level ${level}`;
      let description = `Reach ${gamesRequired.toLocaleString()} games played to unlock this level.`;

      // Tier-based customization
      if (level <= 10) {
        tier = 'beginner';
        color = ['#6B7280', '#10B981', '#3B82F6', '#8B5CF6', '#06B6D4', '#F59E0B', '#EF4444', '#EC4899', '#84CC16', '#F97316'][level - 1];
        icon = ['🎮', '🎯', '🎲', '📚', '⚡', '🔥', '💎', '🏃', '🎪', '🌟'][level - 1];
        name = ['Rookie', 'Novice', 'Apprentice', 'Student', 'Trainee', 'Player', 'Gamer', 'Competitor', 'Skilled', 'Talented'][level - 1];
      } else if (level <= 25) {
        tier = 'intermediate';
        color = '#DC2626';
        icon = '⚔️';
        name = `${['Adept', 'Proficient', 'Expert', 'Specialist', 'Veteran', 'Elite', 'Master', 'Grandmaster', 'Champion', 'Hero', 'Legend', 'Mythic', 'Immortal', 'Divine', 'Ascended'][level - 11] || `Intermediate ${level}`}`;
      } else if (level <= 50) {
        tier = 'advanced';
        color = '#9C27B0';
        icon = '🌌';
        name = level <= 35 ? 
          ['Cosmic', 'Galactic', 'Universal', 'Infinite', 'Eternal', 'Omega', 'Alpha', 'Prime', 'Supreme', 'Ultimate'][level - 26] || `Advanced ${level}` :
          ['Transcendent', 'Apex', 'Zenith', 'Pinnacle', 'Paragon', 'Sovereign', 'Emperor', 'Deity', 'Avatar', 'Omnipotent', 'Omniscient', 'Omnipresent', 'Absolute', 'Perfect', 'Flawless'][level - 36] || `Advanced ${level}`;
      } else if (level <= 75) {
        tier = 'master';
        color = '#FF0000';
        icon = '🚀';
        name = level <= 60 ?
          ['Unstoppable', 'Invincible', 'Unbeatable', 'Legendary', 'Mythical', 'Celestial', 'Stellar', 'Galactic Lord', 'Universe Master', 'Reality Bender'][level - 51] || `Master ${level}` :
          ['Time Lord', 'Space Conqueror', 'Dimension Walker', 'Multiverse Guardian', 'Infinity Master', 'Eternity Keeper', 'Creation Force', 'Destruction Power', 'Balance Keeper', 'Chaos Master', 'Order Guardian', 'Void Walker', 'Light Bearer', 'Shadow Master', 'Nexus Point'][level - 61] || `Master ${level}`;
      } else if (level <= 90) {
        tier = 'transcendent';
        color = '#FFD700';
        icon = '🌀';
        name = ['Origin', 'Genesis', 'Exodus', 'Revelation', 'Ascension', 'Enlightenment', 'Nirvana', 'Moksha', 'Satori', 'Samadhi', 'Kaivalya', 'Turiya', 'Brahman', 'Atman', 'Parabrahman'][level - 76] || `Transcendent ${level}`;
      } else {
        tier = 'god';
        color = level === 100 ? '#RAINBOW' : '#FFFFFF';
        icon = level === 100 ? '🎮👑' : ['1️⃣', '∞', '⭕', '🌍', '🚀', '❌', '🔄', '⚫', 'Ω'][level - 91] || '🌟';
        name = level === 100 ? 'DropGod' : ['One', 'All', 'Nothing', 'Everything', 'Beyond', 'Impossible', 'Paradox', 'Singularity', 'Omega Point'][level - 91] || `God Tier ${level}`;
        description = level === 100 ? 'The ultimate DropDollar deity! You have transcended all limits and become the DropGod!' : description;
      }

      levels.push({
        level,
        name,
        pointsRequired,
        gamesRequired,
        color,
        icon,
        spendablePoints,
        tokens,
        description
      });
    }

    return levels;
  };

  const levels = generateLevelData();
  
  const getTierLevels = (tier: string) => {
    switch (tier) {
      case 'beginner': return levels.slice(0, 10);
      case 'intermediate': return levels.slice(10, 25);
      case 'advanced': return levels.slice(25, 50);
      case 'master': return levels.slice(50, 75);
      case 'transcendent': return levels.slice(75, 90);
      case 'god': return levels.slice(90, 100);
      default: return levels.slice(0, 10);
    }
  };

  const filteredLevels = searchLevel ? 
    levels.filter(level => 
      level.level.toString().includes(searchLevel) || 
      level.name.toLowerCase().includes(searchLevel.toLowerCase())
    ) : getTierLevels(selectedTier);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 text-white">
      {/* Header */}
      <header className="bg-gradient-to-r from-purple-800 via-purple-900 to-indigo-900 shadow-2xl border-b border-purple-500/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-3">
              <img src="/DropCoin.png" alt="DropDollar" className="h-12 w-12" />
              <span className="text-2xl font-bold bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                DropDollar
              </span>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link href="/" className="text-purple-200 hover:text-white transition-colors">Home</Link>
              <Link href="/games" className="text-purple-200 hover:text-white transition-colors">Games</Link>
              <Link href="/tournaments" className="text-purple-200 hover:text-white transition-colors">Tournaments</Link>
              <Link href="/hot-sell" className="text-purple-200 hover:text-white transition-colors">Hot Sell</Link>
              <span className="text-purple-100 font-bold">Levels</span>
            </nav>

            {/* User Actions */}
            <div className="flex items-center space-x-3">
              <Link href="/auth/login" className="px-4 py-2 text-purple-200 hover:text-white transition-colors">
                Sign In
              </Link>
              <Link href="/auth/register" className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-500 hover:to-blue-500 text-white font-bold rounded-lg transition-all duration-300 shadow-lg">
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Title Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-7xl font-black mb-6">
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
              DropPoints
            </span>
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
            Level up your gaming journey! Earn DropPoints by playing games, unlock exclusive rewards, and climb the leaderboards to become the ultimate DropGod!
          </p>
          
          {/* How It Works */}
          <div className="bg-gradient-to-r from-purple-800/50 to-indigo-800/50 rounded-2xl p-8 mb-12 border border-purple-500/30">
            <h2 className="text-3xl font-bold mb-6 text-purple-200">How DropPoints Work</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-4xl mb-3">🎮</div>
                <h3 className="text-xl font-bold mb-2 text-green-400">Play Games</h3>
                <p className="text-gray-300">Earn 10-25 DropPoints per game based on your score and performance</p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-3">📈</div>
                <h3 className="text-xl font-bold mb-2 text-blue-400">Level Up</h3>
                <p className="text-gray-300">Accumulate points to unlock new levels, badges, and exclusive rewards</p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-3">🛍️</div>
                <h3 className="text-xl font-bold mb-2 text-purple-400">Spend Points</h3>
                <p className="text-gray-300">Use your points in the upcoming Points Store for cosmetics and boosts</p>
              </div>
            </div>
          </div>
        </div>

        {/* Level Progression Overview */}
        <div className="bg-gradient-to-r from-gray-800/50 to-purple-800/50 rounded-2xl p-8 mb-12 border border-purple-500/30">
          <h2 className="text-3xl font-bold mb-6 text-center text-purple-200">Level Progression</h2>
          <div className="text-center mb-6">
            <p className="text-lg text-gray-300 mb-4">
              <strong className="text-purple-400">100,000 games</strong> will get you to <strong className="text-gold-400">Level 100 - DropGod</strong>
            </p>
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-full h-4 w-full max-w-md mx-auto relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-blue-500 rounded-full" style={{width: '0%'}}></div>
              <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                Your Progress: 0 / 100,000 games
              </div>
            </div>
          </div>
          
          {/* Key Milestones */}
          <div className="grid md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-green-600/30 to-blue-600/30 rounded-lg p-4 border border-green-500/30">
              <div className="text-2xl mb-2">🎯</div>
              <h4 className="font-bold text-green-400">Level 10</h4>
              <p className="text-sm text-gray-300">1,000 games</p>
            </div>
            <div className="bg-gradient-to-br from-purple-600/30 to-pink-600/30 rounded-lg p-4 border border-purple-500/30">
              <div className="text-2xl mb-2">🌌</div>
              <h4 className="font-bold text-purple-400">Level 25</h4>
              <p className="text-sm text-gray-300">6,250 games</p>
            </div>
            <div className="bg-gradient-to-br from-orange-600/30 to-red-600/30 rounded-lg p-4 border border-orange-500/30">
              <div className="text-2xl mb-2">🚀</div>
              <h4 className="font-bold text-orange-400">Level 50</h4>
              <p className="text-sm text-gray-300">25,000 games</p>
            </div>
            <div className="bg-gradient-to-br from-yellow-600/30 to-gold-600/30 rounded-lg p-4 border border-yellow-500/30">
              <div className="text-2xl mb-2">🎮👑</div>
              <h4 className="font-bold text-yellow-400">Level 100</h4>
              <p className="text-sm text-gray-300">100,000 games</p>
            </div>
          </div>
        </div>

        {/* Tier Selection - Gaming Style */}
        <div className="mb-8">
          <div className="flex flex-wrap justify-center gap-4 mb-6">
            {[
              { 
                id: 'beginner', 
                name: 'ROOKIE DIVISION', 
                levels: 'Levels 1-10', 
                color: 'from-green-600 to-blue-600',
                icon: '🎮',
                description: 'Pokemon Badge Style'
              },
              { 
                id: 'intermediate', 
                name: 'SPARTAN RANKS', 
                levels: 'Levels 11-25', 
                color: 'from-blue-600 to-indigo-600',
                icon: '⚔️',
                description: 'Halo Inspired'
              },
              { 
                id: 'advanced', 
                name: 'PRESTIGE TIER', 
                levels: 'Levels 26-50', 
                color: 'from-orange-600 to-red-600',
                icon: '🔥',
                description: 'Call of Duty Style'
              },
              { 
                id: 'master', 
                name: 'MASTER CHIEF', 
                levels: 'Levels 51-75', 
                color: 'from-purple-600 to-fuchsia-600',
                icon: '👑',
                description: 'Elite Warriors'
              },
              { 
                id: 'transcendent', 
                name: 'LEGENDARY', 
                levels: 'Levels 76-90', 
                color: 'from-yellow-500 to-orange-500',
                icon: '⭐',
                description: 'Mythic Ascension'
              },
              { 
                id: 'god', 
                name: 'GOD TIER', 
                levels: 'Levels 91-100', 
                color: 'from-pink-500 to-purple-500',
                icon: '🌟',
                description: 'Ultimate Prestige'
              }
            ].map((tier) => (
              <button
                key={tier.id}
                onClick={() => {setSelectedTier(tier.id as any); setSearchLevel('');}}
                className={`relative group px-6 py-4 rounded-xl font-bold transition-all duration-300 border-2 ${
                  selectedTier === tier.id
                    ? `bg-gradient-to-r ${tier.color} text-white shadow-2xl scale-105 border-white/50`
                    : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 border-gray-600/50 hover:border-gray-500/50'
                }`}
              >
                {/* Gaming-style background effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700 rounded-xl"></div>
                
                <div className="relative z-10 text-center">
                  <div className="text-2xl mb-1">{tier.icon}</div>
                  <div className="text-sm font-black tracking-wider uppercase">{tier.name}</div>
                  <div className="text-xs opacity-75 font-medium mt-1">{tier.levels}</div>
                  <div className="text-xs opacity-60 mt-1 italic">{tier.description}</div>
                </div>
                
                {/* Selected indicator */}
                {selectedTier === tier.id && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full border-2 border-white animate-pulse"></div>
                )}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="max-w-md mx-auto">
            <input
              type="text"
              placeholder="Search level or name..."
              value={searchLevel}
              onChange={(e) => setSearchLevel(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
            />
          </div>
        </div>

        {/* Levels Grid - Gaming Inspired Design */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredLevels.map((level) => {
            // Determine tier styling based on level
            let tierClass = '';
            let badgeGlow = '';
            let rankStyle = '';
            let prestigeEffect = '';
            
            if (level.level <= 10) {
              // Pokemon Badge Style - Beginner
              tierClass = 'bg-gradient-to-br from-slate-800 via-slate-700 to-slate-600';
              badgeGlow = 'shadow-lg shadow-green-500/20';
              rankStyle = 'border-2 border-green-400/50';
            } else if (level.level <= 25) {
              // Halo Rank Style - Intermediate
              tierClass = 'bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-800';
              badgeGlow = 'shadow-xl shadow-blue-400/30';
              rankStyle = 'border-2 border-blue-400/60';
            } else if (level.level <= 50) {
              // Call of Duty Style - Advanced
              tierClass = 'bg-gradient-to-br from-orange-900 via-red-800 to-yellow-800';
              badgeGlow = 'shadow-xl shadow-orange-400/40';
              rankStyle = 'border-2 border-orange-400/70';
              prestigeEffect = 'animate-pulse';
            } else if (level.level <= 75) {
              // Master Chief Style - Master
              tierClass = 'bg-gradient-to-br from-purple-900 via-violet-800 to-fuchsia-800';
              badgeGlow = 'shadow-2xl shadow-purple-400/50';
              rankStyle = 'border-3 border-purple-400/80';
              prestigeEffect = 'animate-pulse';
            } else if (level.level <= 90) {
              // Legendary/Mythic Style - Transcendent
              tierClass = 'bg-gradient-to-br from-yellow-900 via-amber-800 to-orange-800';
              badgeGlow = 'shadow-2xl shadow-yellow-400/60 drop-shadow-2xl';
              rankStyle = 'border-4 border-yellow-400/90';
              prestigeEffect = 'animate-pulse';
            } else {
              // God Tier - Ultimate prestige
              tierClass = 'bg-gradient-to-br from-pink-900 via-purple-800 to-indigo-900';
              badgeGlow = 'shadow-2xl shadow-pink-400/70 drop-shadow-2xl';
              rankStyle = 'border-4 border-pink-400/100';
              prestigeEffect = 'animate-bounce';
            }

            return (
              <div
                key={level.level}
                className={`${tierClass} ${badgeGlow} ${rankStyle} ${prestigeEffect} rounded-2xl p-6 hover:scale-105 transition-all duration-500 hover:shadow-2xl relative overflow-hidden group`}
              >
                {/* Prestige Background Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                
                {/* Badge-Style Header */}
                <div className="relative z-10">
                  {/* Level Number Badge (Pokemon/Halo Style) */}
                  <div className="flex justify-center mb-4">
                    <div className={`relative w-20 h-20 rounded-full flex items-center justify-center border-4 ${
                      level.level <= 10 ? 'border-green-400 bg-gradient-to-br from-green-600 to-green-800' :
                      level.level <= 25 ? 'border-blue-400 bg-gradient-to-br from-blue-600 to-blue-800' :
                      level.level <= 50 ? 'border-orange-400 bg-gradient-to-br from-orange-600 to-red-700' :
                      level.level <= 75 ? 'border-purple-400 bg-gradient-to-br from-purple-600 to-fuchsia-700' :
                      level.level <= 90 ? 'border-yellow-400 bg-gradient-to-br from-yellow-500 to-orange-600' :
                      'border-pink-400 bg-gradient-to-br from-pink-500 to-purple-600'
                    } shadow-lg`}>
                      <span className="text-2xl font-black text-white drop-shadow-lg">
                        {level.level}
                      </span>
                      {/* Prestige Stars for high levels */}
                      {level.level > 50 && (
                        <div className="absolute -top-2 -right-2">
                          <div className="flex">
                            {Array.from({length: Math.min(5, Math.floor((level.level - 50) / 10))}).map((_, i) => (
                              <span key={i} className="text-yellow-300 text-xs animate-pulse">⭐</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Rank Icon (Call of Duty/Halo Style) */}
                  <div className="text-center mb-4">
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-xl ${
                      level.level <= 10 ? 'bg-green-600/30 border border-green-400/50' :
                      level.level <= 25 ? 'bg-blue-600/30 border border-blue-400/50' :
                      level.level <= 50 ? 'bg-orange-600/30 border border-orange-400/50' :
                      level.level <= 75 ? 'bg-purple-600/30 border border-purple-400/50' :
                      level.level <= 90 ? 'bg-yellow-600/30 border border-yellow-400/50' :
                      'bg-pink-600/30 border border-pink-400/50'
                    } shadow-inner`}>
                      <span className="text-3xl drop-shadow-lg">{level.icon}</span>
                    </div>
                  </div>

                  {/* Rank Name (Military Style) */}
                  <div className="text-center mb-4">
                    <h3 className="text-xl font-black tracking-wider uppercase" style={{color: level.color, textShadow: '2px 2px 4px rgba(0,0,0,0.8)'}}>
                      {level.name}
                    </h3>
                    <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold mt-2 ${
                      level.level <= 10 ? 'bg-green-600/20 text-green-300 border border-green-400/30' :
                      level.level <= 25 ? 'bg-blue-600/20 text-blue-300 border border-blue-400/30' :
                      level.level <= 50 ? 'bg-orange-600/20 text-orange-300 border border-orange-400/30' :
                      level.level <= 75 ? 'bg-purple-600/20 text-purple-300 border border-purple-400/30' :
                      level.level <= 90 ? 'bg-yellow-600/20 text-yellow-300 border border-yellow-400/30' :
                      'bg-pink-600/20 text-pink-300 border border-pink-400/30'
                    }`}>
                      RANK {level.level}
                    </div>
                  </div>

                  {/* Stats Display (FPS Style) */}
                  <div className="space-y-2 mb-4">
                    <div className="bg-black/30 rounded-lg p-3 border border-gray-600/30">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="text-center">
                          <div className="text-gray-400 uppercase tracking-wide">GAMES REQ</div>
                          <div className="text-green-300 font-bold text-sm">{level.gamesRequired.toLocaleString()}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-gray-400 uppercase tracking-wide">POINTS REQ</div>
                          <div className="text-purple-300 font-bold text-sm">{level.pointsRequired.toLocaleString()}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Rewards Section (Loot Box Style) */}
                  <div className={`rounded-lg p-3 mb-4 border ${
                    level.level <= 10 ? 'bg-green-600/10 border-green-400/30' :
                    level.level <= 25 ? 'bg-blue-600/10 border-blue-400/30' :
                    level.level <= 50 ? 'bg-orange-600/10 border-orange-400/30' :
                    level.level <= 75 ? 'bg-purple-600/10 border-purple-400/30' :
                    level.level <= 90 ? 'bg-yellow-600/10 border-yellow-400/30' :
                    'bg-pink-600/10 border-pink-400/30'
                  }`}>
                    <h4 className="text-xs font-bold text-center mb-2 uppercase tracking-wide text-gray-300">
                      🎁 UNLOCK REWARDS
                    </h4>
                    <div className="grid grid-cols-3 gap-1 text-xs">
                      <div className="text-center">
                        <div className="text-purple-300 font-bold">{level.spendablePoints.toLocaleString()}</div>
                        <div className="text-gray-400 text-xs">POINTS</div>
                      </div>
                      <div className="text-center">
                        <div className="text-green-300 font-bold">{level.tokens}</div>
                        <div className="text-gray-400 text-xs">TOKENS</div>
                      </div>
                      <div className="text-center">
                        <div className="text-blue-300 font-bold">🏆</div>
                        <div className="text-gray-400 text-xs">BADGE</div>
                      </div>
                    </div>
                  </div>

                  {/* Challenge Description (Mission Brief Style) */}
                  <div className="bg-black/20 rounded-lg p-3 border border-gray-700/30">
                    <p className="text-xs text-gray-300 leading-relaxed text-center">
                      {level.description}
                    </p>
                  </div>

                  {/* Special Effects for High Levels */}
                  {level.level === 100 && (
                    <div className="absolute inset-0 rounded-2xl border-4 border-rainbow animate-pulse bg-gradient-to-r from-red-500/10 via-yellow-500/10 via-green-500/10 via-blue-500/10 to-purple-500/10"></div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Points Store Teaser */}
        <div className="mt-16 bg-gradient-to-r from-purple-800/50 to-pink-800/50 rounded-2xl p-8 border border-purple-500/30 text-center">
          <h2 className="text-3xl font-bold mb-4 text-purple-200">Points Store Coming Soon!</h2>
          <p className="text-lg text-gray-300 mb-6">
            Use your spendable DropPoints to purchase exclusive cosmetics, game boosts, special badges, and more!
          </p>
          <div className="grid md:grid-cols-4 gap-4 max-w-2xl mx-auto">
            <div className="bg-gradient-to-br from-blue-600/30 to-purple-600/30 rounded-lg p-4">
              <div className="text-2xl mb-2">🎨</div>
              <h4 className="font-bold text-blue-400">Cosmetics</h4>
              <p className="text-xs text-gray-400">Custom themes & styles</p>
            </div>
            <div className="bg-gradient-to-br from-green-600/30 to-blue-600/30 rounded-lg p-4">
              <div className="text-2xl mb-2">⚡</div>
              <h4 className="font-bold text-green-400">Boosts</h4>
              <p className="text-xs text-gray-400">Score multipliers</p>
            </div>
            <div className="bg-gradient-to-br from-purple-600/30 to-pink-600/30 rounded-lg p-4">
              <div className="text-2xl mb-2">🏆</div>
              <h4 className="font-bold text-purple-400">Badges</h4>
              <p className="text-xs text-gray-400">Special achievements</p>
            </div>
            <div className="bg-gradient-to-br from-orange-600/30 to-red-600/30 rounded-lg p-4">
              <div className="text-2xl mb-2">🎁</div>
              <h4 className="font-bold text-orange-400">Specials</h4>
              <p className="text-xs text-gray-400">Limited time items</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
