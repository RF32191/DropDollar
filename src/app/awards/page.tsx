'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import CleanNavigation from '@/components/navigation/CleanNavigation';
import Link from 'next/link';
import { 
  TrophyIcon, 
  StarIcon,
  SparklesIcon,
  LockClosedIcon,
  CheckCircleIcon,
  FireIcon,
  BoltIcon,
  GiftIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid, TrophyIcon as TrophySolid } from '@heroicons/react/24/solid';

interface Award {
  award_id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  rarity: string;
  game_type: string | null;
  earned_at: string | null;
  score_achieved: number | null;
  is_new: boolean;
  rp_reward: number;
}

interface AwardDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  rarity: string;
  game_type: string | null;
  requirement_type: string;
  requirement_value: number;
  rp_reward: number;
}

interface AwardStats {
  total_earned: number;
  total_available: number;
  rp_from_awards: number;
  rarity_breakdown: { [key: string]: number } | null;
}

// Particle effect for trophy page
function TrophyParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    
    interface Particle {
      x: number;
      y: number;
      size: number;
      speedY: number;
      speedX: number;
      opacity: number;
      color: string;
      type: 'star' | 'sparkle';
    }
    
    const particles: Particle[] = [];
    const colors = ['#FFD700', '#FFA500', '#FFEC8B', '#C0C0C0', '#CD7F32', '#E5E4E2'];
    
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 4 + 1,
        speedY: -Math.random() * 0.3 - 0.1,
        speedX: (Math.random() - 0.5) * 0.2,
        opacity: Math.random() * 0.6 + 0.2,
        color: colors[Math.floor(Math.random() * colors.length)],
        type: Math.random() > 0.5 ? 'star' : 'sparkle'
      });
    }
    
    let animationId: number;
    
    function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, opacity: number) {
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.fillStyle = color;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
        const px = x + Math.cos(angle) * size;
        const py = y + Math.sin(angle) * size;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    
    function animate() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      
      particles.forEach(p => {
        if (p.type === 'star') {
          drawStar(ctx!, p.x, p.y, p.size, p.color, p.opacity);
        } else {
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx!.fillStyle = p.color;
          ctx!.globalAlpha = p.opacity;
          ctx!.fill();
        }
        
        p.y += p.speedY;
        p.x += p.speedX;
        p.opacity -= 0.001;
        
        if (p.y < 0 || p.opacity <= 0) {
          p.y = canvas!.height + 10;
          p.x = Math.random() * canvas!.width;
          p.opacity = Math.random() * 0.6 + 0.2;
        }
      });
      
      ctx!.globalAlpha = 1;
      animationId = requestAnimationFrame(animate);
    }
    
    animate();
    
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);
  
  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
    />
  );
}

// Rarity styling
const rarityStyles: { [key: string]: { bg: string; border: string; text: string; glow: string } } = {
  common: { bg: 'from-gray-600/20 to-gray-700/10', border: 'border-gray-500/30', text: 'text-gray-300', glow: '' },
  uncommon: { bg: 'from-green-600/20 to-emerald-700/10', border: 'border-green-500/30', text: 'text-green-400', glow: 'shadow-green-500/20' },
  rare: { bg: 'from-blue-600/20 to-cyan-700/10', border: 'border-blue-500/30', text: 'text-blue-400', glow: 'shadow-blue-500/20' },
  epic: { bg: 'from-purple-600/20 to-pink-700/10', border: 'border-purple-500/30', text: 'text-purple-400', glow: 'shadow-purple-500/30' },
  legendary: { bg: 'from-yellow-500/30 to-amber-600/20', border: 'border-yellow-400/50', text: 'text-yellow-400', glow: 'shadow-yellow-500/40' }
};

const gameNames: { [key: string]: string } = {
  'quick-click': 'Quick Click',
  'laser-dodge': 'Laser Dodge',
  'dead-shot': 'Dead Shot',
  'blade-bounce': 'Blade Bounce',
  'parry-pro': 'Parry Pro',
  'click-draw': 'Click Draw',
  'cash-stack': 'Cash Stack',
  'penny-passer': 'Penny Passer',
  'flippy-coin': 'Flippy Coin',
  'circuit-runner': 'Circuit Runner',
  'neon-striker': 'Neon Striker',
  'wormhole': 'Wormhole',
  'falling-objects': 'Falling Objects',
  'color-sequence': 'Color Sequence'
};

export default function AwardsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [earnedAwards, setEarnedAwards] = useState<Award[]>([]);
  const [allAwards, setAllAwards] = useState<AwardDefinition[]>([]);
  const [stats, setStats] = useState<AwardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedGame, setSelectedGame] = useState<string>('all');
  const [showEarnedOnly, setShowEarnedOnly] = useState(false);

  // Load awards data
  const loadAwards = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Load all award definitions
      const { data: definitions, error: defError } = await supabase
        .from('award_definitions')
        .select('*')
        .order('rarity', { ascending: false });
      
      if (!defError && definitions) {
        setAllAwards(definitions);
      }
      
      if (user?.id) {
        // Load user's earned awards
        const { data: earned, error: earnedError } = await supabase.rpc('get_user_awards');
        
        if (!earnedError && earned) {
          setEarnedAwards(earned);
        }
        
        // Load stats
        const { data: statsData, error: statsError } = await supabase.rpc('get_award_stats');
        
        if (!statsError && statsData && statsData.length > 0) {
          setStats(statsData[0]);
        }
        
        // Mark awards as seen
        await supabase.rpc('mark_awards_seen');
      }
    } catch (error) {
      console.error('Error loading awards:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadAwards();
  }, [loadAwards]);

  // Get unique categories and games
  const categories = ['all', ...new Set(allAwards.map(a => a.category))];
  const games = ['all', ...new Set(allAwards.filter(a => a.game_type).map(a => a.game_type!))];

  // Filter awards
  const filteredAwards = allAwards.filter(award => {
    if (selectedCategory !== 'all' && award.category !== selectedCategory) return false;
    if (selectedGame !== 'all' && award.game_type !== selectedGame) return false;
    if (showEarnedOnly) {
      const isEarned = earnedAwards.some(e => e.award_id === award.id);
      if (!isEarned) return false;
    }
    return true;
  });

  // Check if award is earned
  const isAwardEarned = (awardId: string) => {
    return earnedAwards.some(e => e.award_id === awardId);
  };

  // Get earned award data
  const getEarnedData = (awardId: string) => {
    return earnedAwards.find(e => e.award_id === awardId);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-yellow-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/50 to-gray-900 relative overflow-hidden">
      <TrophyParticles />
      
      {/* Decorative glows */}
      <div className="absolute top-20 left-1/4 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      
      <CleanNavigation />
      
      <div className="relative z-10 container mx-auto px-4 py-8 pt-24 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-4">
            <TrophySolid className="w-14 h-14 text-yellow-400 animate-pulse" />
            <h1 className="text-5xl font-black bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
              TROPHY ROOM
            </h1>
            <TrophySolid className="w-14 h-14 text-yellow-400 animate-pulse" />
          </div>
          <p className="text-gray-400 text-lg">Earn achievements by playing games and reaching milestones!</p>
        </div>

        {/* Stats Cards */}
        {isAuthenticated && stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-br from-yellow-500/20 to-amber-600/10 rounded-xl p-4 border border-yellow-500/30">
              <div className="flex items-center gap-2 mb-2">
                <TrophyIcon className="w-5 h-5 text-yellow-400" />
                <span className="text-sm text-gray-400">Earned</span>
              </div>
              <div className="text-3xl font-bold text-yellow-400">{stats.total_earned}</div>
              <div className="text-xs text-gray-500">of {stats.total_available}</div>
            </div>
            
            <div className="bg-gradient-to-br from-purple-500/20 to-pink-600/10 rounded-xl p-4 border border-purple-500/30">
              <div className="flex items-center gap-2 mb-2">
                <SparklesIcon className="w-5 h-5 text-purple-400" />
                <span className="text-sm text-gray-400">RP Earned</span>
              </div>
              <div className="text-3xl font-bold text-purple-400">{stats.rp_from_awards}</div>
              <div className="text-xs text-gray-500">from awards</div>
            </div>
            
            <div className="bg-gradient-to-br from-green-500/20 to-emerald-600/10 rounded-xl p-4 border border-green-500/30">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircleIcon className="w-5 h-5 text-green-400" />
                <span className="text-sm text-gray-400">Progress</span>
              </div>
              <div className="text-3xl font-bold text-green-400">
                {stats.total_available > 0 ? Math.round((stats.total_earned / stats.total_available) * 100) : 0}%
              </div>
              <div className="text-xs text-gray-500">complete</div>
            </div>
            
            <div className="bg-gradient-to-br from-orange-500/20 to-red-600/10 rounded-xl p-4 border border-orange-500/30">
              <div className="flex items-center gap-2 mb-2">
                <FireIcon className="w-5 h-5 text-orange-400" />
                <span className="text-sm text-gray-400">Legendary</span>
              </div>
              <div className="text-3xl font-bold text-orange-400">
                {stats.rarity_breakdown?.legendary || 0}
              </div>
              <div className="text-xs text-gray-500">earned</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 mb-8 border border-white/10">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Category Filter */}
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs text-gray-400 mb-1">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-yellow-500"
              >
                <option value="all">All Categories</option>
                <option value="score">Score</option>
                <option value="streak">Streak</option>
                <option value="milestone">Milestone</option>
                <option value="special">Special</option>
                <option value="mastery">Mastery</option>
              </select>
            </div>
            
            {/* Game Filter */}
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs text-gray-400 mb-1">Game</label>
              <select
                value={selectedGame}
                onChange={(e) => setSelectedGame(e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-yellow-500"
              >
                <option value="all">All Games</option>
                {games.filter(g => g !== 'all').map(game => (
                  <option key={game} value={game}>{gameNames[game] || game}</option>
                ))}
              </select>
            </div>
            
            {/* Earned Toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowEarnedOnly(!showEarnedOnly)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  showEarnedOnly 
                    ? 'bg-yellow-500 text-black' 
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                {showEarnedOnly ? '✓ Earned Only' : 'Show All'}
              </button>
            </div>
          </div>
        </div>

        {/* Awards Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-yellow-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredAwards.map((award) => {
              const earned = isAwardEarned(award.id);
              const earnedData = getEarnedData(award.id);
              const style = rarityStyles[award.rarity] || rarityStyles.common;
              
              return (
                <div 
                  key={award.id}
                  className={`relative rounded-xl p-4 border transition-all duration-300 overflow-hidden ${
                    earned 
                      ? `bg-gradient-to-br ${style.bg} ${style.border} shadow-lg ${style.glow}` 
                      : 'bg-gray-800/50 border-gray-700/50 opacity-60 hover:opacity-80'
                  }`}
                >
                  {/* New Badge */}
                  {earnedData?.is_new && (
                    <div className="absolute top-2 right-2 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
                      NEW!
                    </div>
                  )}
                  
                  {/* Lock overlay for unearned */}
                  {!earned && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-10">
                      <LockClosedIcon className="w-8 h-8 text-gray-500" />
                    </div>
                  )}
                  
                  {/* Icon */}
                  <div className="text-4xl mb-3 text-center">
                    {award.icon}
                  </div>
                  
                  {/* Name */}
                  <h3 className={`font-bold text-center mb-1 ${earned ? 'text-white' : 'text-gray-400'}`}>
                    {award.name}
                  </h3>
                  
                  {/* Description */}
                  <p className="text-xs text-gray-400 text-center mb-3">
                    {award.description}
                  </p>
                  
                  {/* Game Badge */}
                  {award.game_type && (
                    <div className="text-center mb-2">
                      <span className="px-2 py-0.5 bg-white/10 rounded-full text-xs text-gray-300">
                        {gameNames[award.game_type] || award.game_type}
                      </span>
                    </div>
                  )}
                  
                  {/* Footer */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
                    {/* Rarity */}
                    <span className={`text-xs font-semibold uppercase ${style.text}`}>
                      {award.rarity}
                    </span>
                    
                    {/* RP Reward */}
                    <span className="text-xs text-yellow-400 flex items-center gap-1">
                      <GiftIcon className="w-3 h-3" />
                      +{award.rp_reward} RP
                    </span>
                  </div>
                  
                  {/* Earned Date */}
                  {earned && earnedData?.earned_at && (
                    <div className="text-center mt-2 text-xs text-green-400">
                      ✓ Earned {new Date(earnedData.earned_at).toLocaleDateString()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredAwards.length === 0 && (
          <div className="text-center py-20">
            <TrophyIcon className="w-20 h-20 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Awards Found</h3>
            <p className="text-gray-400">Try adjusting your filters</p>
          </div>
        )}

        {/* CTA for non-authenticated */}
        {!isAuthenticated && (
          <div className="text-center py-12 bg-gradient-to-r from-yellow-500/10 to-purple-500/10 rounded-2xl border border-yellow-500/20 mt-8">
            <TrophySolid className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">Start Earning Awards!</h3>
            <p className="text-gray-400 mb-6">Sign in to track your achievements and earn RP rewards</p>
            <Link 
              href="/login"
              className="inline-flex items-center gap-2 px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl transition-all"
            >
              <BoltIcon className="w-5 h-5" />
              Sign In
            </Link>
          </div>
        )}

        {/* Back to Dashboard */}
        <div className="text-center mt-12">
          <Link 
            href="/dashboard"
            className="text-gray-400 hover:text-white transition-colors"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

