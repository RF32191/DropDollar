'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { 
  TrophyIcon, 
  StarIcon,
  SparklesIcon,
  ShareIcon,
  ArrowLeftIcon,
  FireIcon,
  BoltIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';

interface LeaderboardEntry {
  friend_id: string;
  friend_username: string;
  friend_avatar: string | null;
  game_type: string;
  best_score: number;
  is_practice: boolean;
  achieved_at: string;
}

interface GameScores {
  [gameType: string]: {
    practice: LeaderboardEntry[];
    competitive: LeaderboardEntry[];
  };
}

// Particle effect component
function GoldParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    interface Particle {
      x: number;
      y: number;
      size: number;
      speedY: number;
      speedX: number;
      opacity: number;
      color: string;
    }
    
    const particles: Particle[] = [];
    const colors = ['#FFD700', '#FFA500', '#FFEC8B', '#FFFACD', '#F4A460'];
    
    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 3 + 1,
        speedY: -Math.random() * 0.5 - 0.2,
        speedX: (Math.random() - 0.5) * 0.3,
        opacity: Math.random() * 0.5 + 0.3,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
    
    let animationId: number;
    
    function animate() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      
      particles.forEach(p => {
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx!.fillStyle = p.color;
        ctx!.globalAlpha = p.opacity;
        ctx!.fill();
        
        // Add sparkle
        ctx!.beginPath();
        ctx!.moveTo(p.x - p.size * 2, p.y);
        ctx!.lineTo(p.x + p.size * 2, p.y);
        ctx!.moveTo(p.x, p.y - p.size * 2);
        ctx!.lineTo(p.x, p.y + p.size * 2);
        ctx!.strokeStyle = p.color;
        ctx!.lineWidth = 0.5;
        ctx!.globalAlpha = p.opacity * 0.5;
        ctx!.stroke();
        
        p.y += p.speedY;
        p.x += p.speedX;
        p.opacity -= 0.002;
        
        if (p.y < 0 || p.opacity <= 0) {
          p.y = canvas!.height + 10;
          p.x = Math.random() * canvas!.width;
          p.opacity = Math.random() * 0.5 + 0.3;
        }
      });
      
      ctx!.globalAlpha = 1;
      animationId = requestAnimationFrame(animate);
    }
    
    animate();
    
    return () => cancelAnimationFrame(animationId);
  }, []);
  
  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
    />
  );
}

// Gold score display with sparkle effect
function GoldScore({ score, isPersonalBest = false }: { score: number; isPersonalBest?: boolean }) {
  return (
    <div className="relative inline-flex items-center">
      <span className={`font-bold text-2xl sm:text-3xl bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent ${isPersonalBest ? 'animate-pulse' : ''}`}>
        {score.toLocaleString()}
      </span>
      {isPersonalBest && (
        <SparklesIcon className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400 ml-1 animate-spin" style={{ animationDuration: '3s' }} />
      )}
    </div>
  );
}

export default function FriendsLeaderboardPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [gameScores, setGameScores] = useState<GameScores>({});
  const [selectedGame, setSelectedGame] = useState<string>('all');
  const [selectedMode, setSelectedMode] = useState<'all' | 'practice' | 'competitive'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [shareMessage, setShareMessage] = useState('');

  const gameNames: { [key: string]: { name: string; icon: string; color: string } } = {
    'quick-click': { name: 'Quick Click', icon: '⚡', color: 'from-yellow-500 to-orange-500' },
    'laser-dodge': { name: 'Laser Dodge', icon: '🔴', color: 'from-red-500 to-pink-500' },
    'dead-shot': { name: 'Dead Shot', icon: '🎯', color: 'from-green-500 to-cyan-500' },
    'blade-bounce': { name: 'Blade Bounce', icon: '⚔️', color: 'from-purple-500 to-blue-500' },
    'cash-stack': { name: 'Cash Stack', icon: '💵', color: 'from-green-600 to-emerald-500' },
    'color-sequence': { name: 'Color Sequence', icon: '🎨', color: 'from-pink-500 to-purple-500' },
    'falling-objects': { name: 'Falling Objects', icon: '🍎', color: 'from-orange-500 to-red-500' },
    'penny-passer': { name: 'Penny Passer', icon: '🪙', color: 'from-amber-500 to-yellow-500' },
    'flippy-coin': { name: 'Flippy Coin', icon: '🪙', color: 'from-gray-400 to-slate-500' },
    'circuit-runner': { name: 'Circuit Runner', icon: '⚡', color: 'from-cyan-500 to-blue-500' },
    'parry-pro': { name: 'Parry Pro', icon: '🛡️', color: 'from-blue-500 to-indigo-500' },
    'click-draw': { name: 'Click Draw', icon: '🤠', color: 'from-amber-600 to-brown-500' },
    'neon-striker': { name: 'Neon Striker', icon: '💫', color: 'from-pink-500 to-cyan-500' },
    'wormhole': { name: 'Wormhole', icon: '🌀', color: 'from-green-500 to-cyan-500' }
  };

  // Load leaderboard data
  const loadLeaderboard = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      const { data, error } = await supabase.rpc('get_friends_leaderboard');
      
      if (error) {
        console.error('Error loading leaderboard:', error);
        return;
      }
      
      if (data) {
        setLeaderboardData(data);
        
        // Organize by game type
        const organized: GameScores = {};
        data.forEach((entry: LeaderboardEntry) => {
          if (!organized[entry.game_type]) {
            organized[entry.game_type] = { practice: [], competitive: [] };
          }
          if (entry.is_practice) {
            organized[entry.game_type].practice.push(entry);
          } else {
            organized[entry.game_type].competitive.push(entry);
          }
        });
        
        // Sort each category by score
        Object.keys(organized).forEach(gameType => {
          organized[gameType].practice.sort((a, b) => b.best_score - a.best_score);
          organized[gameType].competitive.sort((a, b) => b.best_score - a.best_score);
        });
        
        setGameScores(organized);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      loadLeaderboard();
    }
  }, [isAuthenticated, user?.id, loadLeaderboard]);

  // Share score
  const shareScore = (entry: LeaderboardEntry) => {
    const gameName = gameNames[entry.game_type]?.name || entry.game_type;
    const mode = entry.is_practice ? 'Practice' : 'Competitive';
    const text = `🏆 Check out my ${gameName} score on Drop Dollar!\n\n${mode} Mode: ${entry.best_score.toLocaleString()} points\n\nPlay now: https://drop-dollar.com/practice`;
    
    if (navigator.share) {
      navigator.share({ title: 'My Drop Dollar Score', text });
    } else {
      navigator.clipboard.writeText(text);
      setShareMessage('Score copied to clipboard!');
      setTimeout(() => setShareMessage(''), 2000);
    }
  };

  // Filter data based on selection
  const getFilteredData = () => {
    let filtered = leaderboardData;
    
    if (selectedGame !== 'all') {
      filtered = filtered.filter(e => e.game_type === selectedGame);
    }
    
    if (selectedMode === 'practice') {
      filtered = filtered.filter(e => e.is_practice);
    } else if (selectedMode === 'competitive') {
      filtered = filtered.filter(e => !e.is_practice);
    }
    
    return filtered.sort((a, b) => b.best_score - a.best_score);
  };

  // Get user's personal best for a game
  const getPersonalBest = (gameType: string, isPractice: boolean) => {
    return leaderboardData.find(
      e => e.game_type === gameType && e.is_practice === isPractice && e.friend_id === user?.id
    );
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-yellow-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <TrophyIcon className="w-20 h-20 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-2">Friends Leaderboard</h1>
          <p className="text-gray-400 mb-6">Sign in to view your friends' scores</p>
          <Link href="/login" className="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 relative overflow-hidden">
      {/* Background particles */}
      <GoldParticles />
      
      {/* Decorative elements */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
      
      <div className="relative z-10 container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/dashboard?tab=friends"
            className="inline-flex items-center text-gray-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 mr-2" />
            Back to Dashboard
          </Link>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white flex items-center gap-3">
                <TrophyIcon className="w-10 h-10 text-yellow-400" />
                Friends Leaderboard
              </h1>
              <p className="text-gray-400 mt-1">Compete with your friends and share your best scores!</p>
            </div>
            
            {shareMessage && (
              <div className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg text-sm">
                {shareMessage}
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {/* Game Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Game</label>
            <select
              value={selectedGame}
              onChange={(e) => setSelectedGame(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-yellow-500"
            >
              <option value="all">All Games</option>
              {Object.keys(gameScores).map(gameType => (
                <option key={gameType} value={gameType}>
                  {gameNames[gameType]?.icon} {gameNames[gameType]?.name || gameType}
                </option>
              ))}
            </select>
          </div>
          
          {/* Mode Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Mode</label>
            <div className="flex gap-2">
              {['all', 'practice', 'competitive'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setSelectedMode(mode as any)}
                  className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all ${
                    selectedMode === mode
                      ? 'bg-yellow-500 text-black'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  {mode === 'all' ? '🎮 All' : mode === 'practice' ? '⭐ Practice' : '🏆 Competitive'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-yellow-500"></div>
          </div>
        ) : getFilteredData().length === 0 ? (
          <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/10">
            <TrophyIcon className="w-20 h-20 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Scores Yet</h3>
            <p className="text-gray-400 mb-6">Add friends and play games to see the leaderboard!</p>
            <Link 
              href="/practice"
              className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl transition-all"
            >
              <BoltIcon className="w-5 h-5" />
              Play Now
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Leaderboard Cards */}
            {getFilteredData().slice(0, 50).map((entry, index) => {
              const isPersonalBest = entry.friend_id === user?.id;
              const gameInfo = gameNames[entry.game_type] || { name: entry.game_type, icon: '🎮', color: 'from-gray-500 to-gray-600' };
              const rankStyles = index === 0 ? 'border-yellow-400/50 bg-gradient-to-r from-yellow-500/20 to-amber-500/10' :
                                index === 1 ? 'border-gray-400/50 bg-gradient-to-r from-gray-400/20 to-slate-500/10' :
                                index === 2 ? 'border-amber-600/50 bg-gradient-to-r from-amber-600/20 to-orange-600/10' :
                                'border-white/10 bg-white/5';
              
              return (
                <div 
                  key={`${entry.friend_id}-${entry.game_type}-${entry.is_practice}`}
                  className={`relative rounded-2xl border p-4 sm:p-6 transition-all hover:scale-[1.01] ${rankStyles} ${isPersonalBest ? 'ring-2 ring-yellow-400/50' : ''}`}
                >
                  {/* Personal Best Badge */}
                  {isPersonalBest && (
                    <div className="absolute -top-2 -right-2 px-3 py-1 bg-gradient-to-r from-yellow-400 to-amber-500 text-black text-xs font-bold rounded-full flex items-center gap-1 shadow-lg shadow-yellow-500/30">
                      <StarIcon className="w-3 h-3" />
                      YOUR BEST
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between gap-4">
                    {/* Rank & User */}
                    <div className="flex items-center gap-3 sm:gap-4">
                      {/* Rank Badge */}
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
                        index === 0 ? 'bg-yellow-500 text-black' :
                        index === 1 ? 'bg-gray-400 text-black' :
                        index === 2 ? 'bg-amber-600 text-white' :
                        'bg-white/10 text-white'
                      }`}>
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                      </div>
                      
                      {/* Avatar */}
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                        {entry.friend_avatar ? (
                          <img src={entry.friend_avatar} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          entry.friend_username?.charAt(0)?.toUpperCase() || '?'
                        )}
                      </div>
                      
                      {/* User Info */}
                      <div>
                        <p className="font-semibold text-white text-sm sm:text-base">
                          {entry.friend_username}
                          {isPersonalBest && <span className="ml-2 text-yellow-400">(You)</span>}
                        </p>
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-400">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r ${gameInfo.color} text-white`}>
                            {gameInfo.icon} {gameInfo.name}
                          </span>
                          <span className={entry.is_practice ? 'text-cyan-400' : 'text-yellow-400'}>
                            {entry.is_practice ? '⭐ Practice' : '🏆 Competitive'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Score & Actions */}
                    <div className="flex items-center gap-3">
                      <GoldScore score={entry.best_score} isPersonalBest={isPersonalBest} />
                      
                      {isPersonalBest && (
                        <button
                          onClick={() => shareScore(entry)}
                          className="p-2 sm:p-3 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-xl transition-all"
                          title="Share Score"
                        >
                          <ShareIcon className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Personal Bests Summary */}
        {!isLoading && Object.keys(gameScores).length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <FireIcon className="w-7 h-7 text-orange-400" />
              Your Personal Bests
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.keys(gameScores).map(gameType => {
                const gameInfo = gameNames[gameType] || { name: gameType, icon: '🎮', color: 'from-gray-500 to-gray-600' };
                const practiceBest = getPersonalBest(gameType, true);
                const compBest = getPersonalBest(gameType, false);
                
                if (!practiceBest && !compBest) return null;
                
                return (
                  <div 
                    key={gameType}
                    className="relative bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl p-5 overflow-hidden"
                  >
                    {/* Gold accent */}
                    <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-500/20 rounded-full blur-2xl" />
                    
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r ${gameInfo.color} text-white text-sm font-medium mb-4`}>
                      {gameInfo.icon} {gameInfo.name}
                    </div>
                    
                    <div className="space-y-3">
                      {practiceBest && (
                        <div className="flex items-center justify-between">
                          <span className="text-cyan-400 text-sm">⭐ Practice</span>
                          <GoldScore score={practiceBest.best_score} isPersonalBest />
                        </div>
                      )}
                      {compBest && (
                        <div className="flex items-center justify-between">
                          <span className="text-yellow-400 text-sm">🏆 Competitive</span>
                          <GoldScore score={compBest.best_score} isPersonalBest />
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={() => shareScore(compBest || practiceBest!)}
                      className="mt-4 w-full flex items-center justify-center gap-2 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg text-sm font-medium transition-all"
                    >
                      <ShareIcon className="w-4 h-4" />
                      Share Best
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

