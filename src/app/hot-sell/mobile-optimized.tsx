'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { FixedGamesService, FixedGameConfig, HotSellSession } from '@/lib/supabase/fixedGamesService';
import { UserService } from '@/lib/supabase/userService';
import CleanNavigation from '@/components/navigation/CleanNavigation';
import { 
  FireIcon, 
  TrophyIcon, 
  BanknotesIcon, 
  UsersIcon,
  ClockIcon,
  StarIcon,
  BoltIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline';

export default function MobileOptimizedHotSell() {
  const { user, isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [fixedGameConfigs, setFixedGameConfigs] = useState<FixedGameConfig[]>([]);
  const [hotSellSessions, setHotSellSessions] = useState<HotSellSession[]>([]);
  const [userTokens, setUserTokens] = useState(0);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      loadMobileData();
    }
  }, [isAuthenticated]);

  const loadMobileData = async () => {
    try {
      setIsLoading(true);
      
      // Mobile: Load only essential data with short timeout
      const data = await Promise.race([
        Promise.all([
          FixedGamesService.getFixedGameConfigs('hot_sell').catch(() => []),
          user ? UserService.getUserProfile(user.id).then(profile => {
            setUserTokens(profile?.tokens || 0);
            return profile;
          }).catch(() => {
            setUserTokens(0);
            return null;
          }) : Promise.resolve(null),
        ]),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Mobile timeout')), 1500)
        )
      ]);

      const [configs, profile] = data as any;
      setFixedGameConfigs(configs);

      // Load sessions in background
      setTimeout(async () => {
        try {
          const sessions = await FixedGamesService.getHotSellSessions();
          setHotSellSessions(sessions);
        } catch (error) {
          console.warn('Sessions load failed:', error);
        }
      }, 100);

    } catch (error) {
      console.error('Essential data load failed:', error);
      setFixedGameConfigs([]);
      setUserTokens(0);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrizeAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getGameIcon = (gameType: string) => {
    switch (gameType) {
      case 'multi_target_reaction': return '🎯';
      case 'sword_parry': return '⚔️';
      case 'laser_dodge': return '🚀';
      case 'memory_color': return '🧠';
      case 'number_tap': return '🔢';
      default: return '🎮';
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900">
        <CleanNavigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Please log in to view tournaments</h1>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900">
        <CleanNavigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white">Loading tournaments...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900">
      <CleanNavigation />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">🔥 Hot Sell Tournaments</h1>
          <p className="text-lg text-gray-300 mb-4">Massive Cash Prize Tournaments</p>
          
          {/* User Token Balance */}
          <div className="inline-flex items-center bg-white/10 backdrop-blur-xl rounded-2xl px-6 py-3 border border-white/20">
            <BanknotesIcon className="w-6 h-6 text-yellow-400 mr-3" />
            <span className="text-lg font-semibold">Your Tokens: {userTokens}</span>
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl border ${
            message.type === 'success' 
              ? 'bg-green-500/20 border-green-500/50 text-green-300' 
              : 'bg-red-500/20 border-red-500/50 text-red-300'
          }`}>
            <div className="flex items-center">
              {message.type === 'success' ? (
                <CheckCircleIcon className="w-5 h-5 mr-2" />
              ) : (
                <ExclamationTriangleIcon className="w-5 h-5 mr-2" />
              )}
              {message.text}
            </div>
          </div>
        )}

        {/* Hot Sell Games */}
        <div className="mb-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">🎯 Hot Sell Games</h2>
            <p className="text-gray-300">Daily tournaments with guaranteed prizes</p>
          </div>

          <div className="space-y-4">
            {fixedGameConfigs.map((config) => {
              const session = hotSellSessions.find(s => s.config_id === config.id);
              const isHotSell = session?.status === 'hot_sell';
              
              return (
                <div key={config.id} className={`bg-white/10 backdrop-blur-xl rounded-2xl p-4 border transition-all duration-300 ${
                  isHotSell ? 'border-red-500/50 bg-red-500/10' : 'border-white/20'
                }`}>
                  {/* Game Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">{getGameIcon(config.game_type)}</span>
                      <h3 className="text-lg font-bold text-white">{config.title}</h3>
                    </div>
                    <div className={`flex items-center rounded-full px-3 py-1 ${
                      isHotSell ? 'bg-red-500/20 text-red-300' : 'bg-blue-500/20 text-blue-300'
                    }`}>
                      {isHotSell ? (
                        <>
                          <BoltIcon className="w-4 h-4 mr-1" />
                          <span className="text-xs font-semibold">HOT SELL</span>
                        </>
                      ) : (
                        <>
                          <ClockIcon className="w-4 h-4 mr-1" />
                          <span className="text-xs font-semibold">WAITING</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-gray-300 mb-4 text-sm">{config.description}</p>
                  
                  {/* Prize Pool */}
                  <div className={`rounded-xl p-3 mb-4 ${
                    isHotSell 
                      ? 'bg-gradient-to-r from-red-500 to-orange-500' 
                      : 'bg-gradient-to-r from-yellow-500 to-orange-500'
                  }`}>
                    <div className="text-center">
                      <p className="text-yellow-100 text-sm font-medium mb-1">PRIZE POOL</p>
                      <p className="text-xl font-bold text-white">{formatPrizeAmount(config.prize_pool)}</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-300 mb-2">
                      <span>Progress</span>
                      <span>{session?.participants_count || 0} / {config.max_participants} players</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          isHotSell 
                            ? 'bg-gradient-to-r from-red-500 to-orange-500' 
                            : 'bg-gradient-to-r from-blue-500 to-purple-500'
                        }`} 
                        style={{ 
                          width: `${Math.min(100, ((session?.participants_count || 0) / config.max_participants) * 100)}%` 
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Game Info */}
                  <div className="space-y-2 text-sm text-gray-300 mb-4">
                    <div className="flex justify-between">
                      <span>Entry Fee:</span>
                      <span className="text-white font-semibold">{config.entry_fee} tokens</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Max Players:</span>
                      <span className="text-white font-semibold">{config.max_participants}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Duration:</span>
                      <span className="text-white font-semibold">{config.game_duration}s</span>
                    </div>
                  </div>

                  {/* Join Button */}
                  <button
                    onClick={() => {
                      if (userTokens >= config.entry_fee) {
                        setMessage({ type: 'success', text: `Joined ${config.title}! Good luck!` });
                      } else {
                        setMessage({ type: 'error', text: `You need ${config.entry_fee} tokens to join` });
                      }
                    }}
                    disabled={userTokens < config.entry_fee}
                    className={`w-full py-3 px-4 rounded-xl font-bold text-white transition-all duration-300 ${
                      userTokens >= config.entry_fee
                        ? isHotSell
                          ? 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500'
                          : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500'
                        : 'bg-gray-600 cursor-not-allowed opacity-50'
                    }`}
                  >
                    <div className="flex items-center justify-center">
                      <LockClosedIcon className="w-4 h-4 mr-2" />
                      {userTokens >= config.entry_fee 
                        ? `JOIN FOR ${config.entry_fee} TOKENS`
                        : 'INSUFFICIENT TOKENS'
                      }
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Winner Takes It All Section */}
        <div className="mb-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">🏆 Winner Takes It All</h2>
            <p className="text-gray-300">$1 entry tournaments - Winner gets everything!</p>
          </div>

          <div className="space-y-4">
            {fixedGameConfigs.slice(0, 3).map((config) => (
              <div key={`winner-${config.id}`} className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">🏆</span>
                    <h3 className="text-lg font-bold text-white">Winner Takes All - {config.title}</h3>
                  </div>
                  <div className="flex items-center rounded-full px-3 py-1 bg-purple-500/20 text-purple-300">
                    <StarIcon className="w-4 h-4 mr-1" />
                    <span className="text-xs font-semibold">WINNER TAKES ALL</span>
                  </div>
                </div>
                
                <p className="text-gray-300 mb-4 text-sm">$1 entry - Winner takes everything!</p>
                
                {/* Entry Fee */}
                <div className="rounded-xl p-3 mb-4 bg-gradient-to-r from-green-500 to-emerald-500">
                  <div className="text-center">
                    <p className="text-green-100 text-sm font-medium mb-1">ENTRY FEE</p>
                    <p className="text-xl font-bold text-white">{formatPrizeAmount(1)}</p>
                  </div>
                </div>

                {/* Current Pot */}
                <div className="rounded-xl p-3 mb-4 bg-gradient-to-r from-purple-500 to-pink-500">
                  <div className="text-center">
                    <p className="text-purple-100 text-sm font-medium mb-1">CURRENT POT</p>
                    <p className="text-xl font-bold text-white">{formatPrizeAmount(0)}</p>
                    <p className="text-purple-200 text-xs mt-1">0 players joined</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-300 mb-2">
                    <span>Progress to Target</span>
                    <span>0 / 50 players</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full" style={{ width: '0%' }}></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>Target: 50 players</span>
                    <span>Remaining: 50 players</span>
                  </div>
                </div>

                {/* Join Button */}
                <button
                  onClick={() => {
                    if (userTokens >= 1) {
                      setMessage({ type: 'success', text: 'Joined Winner Takes All tournament! Good luck!' });
                    } else {
                      setMessage({ type: 'error', text: 'You need 1 token to join' });
                    }
                  }}
                  disabled={userTokens < 1}
                  className={`w-full py-3 px-4 rounded-xl font-bold text-white transition-all duration-300 ${
                    userTokens >= 1
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500'
                      : 'bg-gray-600 cursor-not-allowed opacity-50'
                  }`}
                >
                  {userTokens >= 1 ? '🔒 JOIN FOR $1' : '❌ INSUFFICIENT TOKENS'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
