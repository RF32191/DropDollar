'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTokenSync } from '@/hooks/useTokenSync';
import { supabase } from '@/lib/supabase/client';
import CompetitionGameFlow from '@/components/games/CompetitionGameFlow';
import ErrorBoundary from '@/components/ErrorBoundary';
import CleanNavigation from '@/components/navigation/CleanNavigation';
import AdBanner from '@/components/ads/AdBanner';
import PageWalletDisplay from '@/components/wallet/PageWalletDisplay';
import LocationBanner from '@/components/location/LocationBanner';
import LocationVerificationModal from '@/components/modals/LocationVerificationModal';
import { useLocationVerification } from '@/hooks/useLocationVerification';
import {
  TrophyIcon,
  ClockIcon,
  BanknotesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  StarIcon,
  LockClosedIcon,
  MapPinIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';

interface CoinPlaySession {
  id: string;
  config_id: string;
  game_type: string;
  entry_fee: number;
  prize_pool: number;
  max_participants: number;
  participants_count: number;
  status: 'waiting' | 'active' | 'completed';
  timer_duration: number;
  timer_started_at: string | null;
  winner_user_id: string | null;
  winner_prize: number | null;
  created_at: string;
}

interface Message {
  type: 'success' | 'error';
  text: string;
}

const GAME_NAMES: { [key: string]: string } = {
  'multi_target': 'Multi-Target Reaction',
  'falling_object': 'Falling Objects',
  'color_sequence': 'Color Sequence',
  'laser_dodge': 'Laser Dodge',
  'quick_click': 'Quick Click',
  'sword_parry': 'Sword Parry',
  'blade_bounce': 'Blade Bounce',
  'cash_stack': 'Cash Stack',
  'penny_passer': 'Penny Passer'
};

export default function CoinPlayPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { tokenBalance: userTokens, isLoading: tokensLoading, refreshTokens } = useTokenSync();
  
  const [sessions, setSessions] = useState<CoinPlaySession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<Message | null>(null);
  const [currentView, setCurrentView] = useState<'list' | 'game'>('list');
  const [selectedGameFlow, setSelectedGameFlow] = useState<{
    gameType: string;
    sessionId: string;
    configId: string;
    entryFee: number;
  } | null>(null);
  const [joiningSession, setJoiningSession] = useState(false);
  const [selectedGame, setSelectedGame] = useState<string>('all');
  
  // Location verification
  const {
    locationVerified,
    improvedLocation,
    locationLoading,
    showLocationModal,
    handleLocationGranted,
    handleLocationDenied
  } = useLocationVerification(isAuthenticated);

  // Load sessions
  const loadSessions = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.rpc('get_coin_play_sessions');
      
      if (error) throw error;
      
      console.log('🪙 [Coin Play] Loaded sessions:', data?.length);
      setSessions(data || []);
    } catch (error) {
      console.error('Error loading Coin Play sessions:', error);
      setMessage({ type: 'error', text: 'Failed to load Coin Play sessions' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
    
    // Auto-refresh every 5 seconds
    const interval = setInterval(loadSessions, 5000);
    return () => clearInterval(interval);
  }, [loadSessions]);

  // Join session
  const handleJoinSession = async (session: CoinPlaySession) => {
    if (!user || !isAuthenticated) {
      setMessage({ type: 'error', text: 'Please log in to join' });
      return;
    }

    if (!locationVerified) {
      setMessage({ type: 'error', text: 'Location verification required' });
      return;
    }

    if (userTokens < session.entry_fee) {
      setMessage({ type: 'error', text: 'Insufficient tokens' });
      return;
    }

    try {
      setJoiningSession(true);
      
      // Deduct entry fee
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          gameplay_tokens: userTokens - session.entry_fee,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Add participant
      const { error: participantError } = await supabase
        .from('coin_play_participants')
        .insert({
          session_id: session.id,
          user_id: user.id,
          username: user.email?.split('@')[0] || 'Player'
        });

      if (participantError) {
        // Refund on error
        await supabase
          .from('users')
          .update({ gameplay_tokens: userTokens })
          .eq('id', user.id);
        throw participantError;
      }

      // Update session
      const newParticipants = session.participants_count + 1;
      const newPrizePool = session.prize_pool + session.entry_fee;
      const shouldStartTimer = newParticipants >= session.max_participants;

      const updateData: any = {
        participants_count: newParticipants,
        prize_pool: newPrizePool,
        updated_at: new Date().toISOString()
      };

      if (shouldStartTimer && !session.timer_started_at) {
        updateData.status = 'active';
        updateData.timer_started_at = new Date().toISOString();
      }

      await supabase
        .from('coin_play_sessions')
        .update(updateData)
        .eq('id', session.id);

      // Enter game
      setSelectedGameFlow({
        gameType: session.game_type,
        sessionId: session.id,
        configId: session.config_id,
        entryFee: session.entry_fee
      });
      setCurrentView('game');
      
      refreshTokens();
      await loadSessions();
      
      setMessage({ type: 'success', text: 'Joined successfully! Good luck!' });
    } catch (error: any) {
      console.error('Error joining session:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to join session' });
    } finally {
      setJoiningSession(false);
    }
  };

  // Exit game
  const handleExitGame = useCallback(() => {
    setCurrentView('list');
    setSelectedGameFlow(null);
    loadSessions();
    refreshTokens();
  }, [loadSessions, refreshTokens]);

  // Group sessions by game
  const sessionsByGame = sessions.reduce((acc, session) => {
    if (!acc[session.game_type]) {
      acc[session.game_type] = [];
    }
    acc[session.game_type].push(session);
    return acc;
  }, {} as { [key: string]: CoinPlaySession[] });

  // Sort games alphabetically
  const sortedGames = Object.keys(sessionsByGame).sort();

  // Filter games
  const filteredGames = selectedGame === 'all' 
    ? sortedGames 
    : sortedGames.filter(g => g === selectedGame);

  if (authLoading || tokensLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-900 via-orange-800 to-amber-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-amber-400"></div>
          <p className="mt-4 text-amber-200 font-semibold">Loading Coin Play...</p>
        </div>
      </div>
    );
  }

  if (currentView === 'game' && selectedGameFlow) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-gradient-to-br from-amber-900 via-orange-800 to-amber-900">
          <CleanNavigation showUsername={true} />
          <CompetitionGameFlow
            gameType={selectedGameFlow.gameType}
            listingId={selectedGameFlow.sessionId}
            entryNumber={1}
            isCompetitionMode={true}
            onExit={handleExitGame}
            gameId={selectedGameFlow.configId}
          />
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-amber-900 via-orange-800 to-amber-900">
        <CleanNavigation showUsername={true} />
        
        {/* Location Banner */}
        {!locationLoading && !locationVerified && (
          <LocationBanner 
            isVerified={locationVerified}
            location={improvedLocation}
          />
        )}

        {/* Wallet Display */}
        <PageWalletDisplay />

        {/* Ad Banner */}
        <div className="max-w-7xl mx-auto px-4 py-4">
          <AdBanner pageLocation="coin-play" position="top" />
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 py-8 pb-24">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-amber-400 to-orange-600 rounded-full mb-6 shadow-2xl animate-pulse">
              <CurrencyDollarIcon className="w-14 h-14 text-white" />
            </div>
            <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 mb-4 tracking-tight">
              🪙 COIN PLAY
            </h1>
            <p className="text-3xl font-bold text-amber-300 mb-4">
              Play for a Quarter • Win Up to $1,000!
            </p>
            <p className="text-xl text-amber-200/90 max-w-3xl mx-auto">
              25¢ entry fee • 85% to winner • All 9 games available
            </p>
          </div>

          {/* Message Display */}
          {message && (
            <div className={`max-w-2xl mx-auto mb-6 p-4 rounded-xl shadow-lg ${
              message.type === 'success' 
                ? 'bg-green-900/50 border-2 border-green-500 text-green-200'
                : 'bg-red-900/50 border-2 border-red-500 text-red-200'
            }`}>
              <div className="flex items-center gap-3">
                {message.type === 'success' ? (
                  <CheckCircleIcon className="w-6 h-6 flex-shrink-0" />
                ) : (
                  <ExclamationTriangleIcon className="w-6 h-6 flex-shrink-0" />
                )}
                <p className="font-semibold">{message.text}</p>
                <button
                  onClick={() => setMessage(null)}
                  className="ml-auto text-2xl hover:scale-110 transition-transform"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          {/* Game Filter */}
          <div className="mb-8 flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => setSelectedGame('all')}
              className={`px-6 py-3 rounded-xl font-bold transition-all ${
                selectedGame === 'all'
                  ? 'bg-amber-500 text-white shadow-lg scale-105'
                  : 'bg-amber-800/50 text-amber-200 hover:bg-amber-700/50'
              }`}
            >
              All Games ({sessions.length})
            </button>
            {sortedGames.map(gameType => (
              <button
                key={gameType}
                onClick={() => setSelectedGame(gameType)}
                className={`px-6 py-3 rounded-xl font-bold transition-all ${
                  selectedGame === gameType
                    ? 'bg-amber-500 text-white shadow-lg scale-105'
                    : 'bg-amber-800/50 text-amber-200 hover:bg-amber-700/50'
                }`}
              >
                {GAME_NAMES[gameType]} ({sessionsByGame[gameType].length})
              </button>
            ))}
          </div>

          {/* Games List */}
          {filteredGames.length === 0 ? (
            <div className="text-center py-16">
              <CurrencyDollarIcon className="w-24 h-24 mx-auto text-amber-400/30 mb-4" />
              <p className="text-2xl text-amber-300 font-bold">No sessions available</p>
              <p className="text-amber-200/70 mt-2">Check back soon!</p>
            </div>
          ) : (
            <div className="space-y-12">
              {filteredGames.map(gameType => (
                <div key={gameType} className="bg-gradient-to-br from-amber-800/40 to-orange-900/40 rounded-3xl p-8 backdrop-blur-sm border-2 border-amber-500/30 shadow-2xl">
                  <h2 className="text-4xl font-black text-amber-200 mb-6 flex items-center gap-4">
                    <TrophyIcon className="w-10 h-10 text-amber-400" />
                    {GAME_NAMES[gameType]}
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sessionsByGame[gameType]
                      .sort((a, b) => a.prize_pool - b.prize_pool)
                      .map(session => {
                        const progress = (session.participants_count / session.max_participants) * 100;
                        const isActive = session.status === 'active' && session.timer_started_at;
                        let timeRemaining = 0;
                        
                        if (isActive && session.timer_started_at) {
                          const elapsed = Math.floor((Date.now() - new Date(session.timer_started_at).getTime()) / 1000);
                          timeRemaining = Math.max(0, session.timer_duration - elapsed);
                        }

                        return (
                          <div
                            key={session.id}
                            className="bg-gradient-to-br from-amber-700/60 to-orange-800/60 rounded-2xl p-6 border-2 border-amber-500/40 hover:border-amber-400/80 transition-all hover:scale-105 shadow-xl"
                          >
                            {/* Prize Amount */}
                            <div className="text-center mb-4">
                              <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-amber-300">
                                ${session.prize_pool.toFixed(0)}
                              </div>
                              <div className="text-sm text-amber-200/80 mt-1">
                                Winner gets ${(session.prize_pool * 0.85).toFixed(2)}
                              </div>
                            </div>

                            {/* Progress */}
                            <div className="mb-4">
                              <div className="flex justify-between text-sm text-amber-200 mb-2">
                                <span>{session.participants_count} / {session.max_participants} players</span>
                                <span>{progress.toFixed(0)}%</span>
                              </div>
                              <div className="w-full bg-amber-950/50 rounded-full h-3 overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-amber-400 to-yellow-500 transition-all duration-300 shadow-lg"
                                  style={{ width: `${Math.min(progress, 100)}%` }}
                                ></div>
                              </div>
                            </div>

                            {/* Timer */}
                            {isActive && timeRemaining > 0 && (
                              <div className="flex items-center justify-center gap-2 mb-4 bg-red-900/40 border border-red-500/50 rounded-lg py-2">
                                <ClockIcon className="w-5 h-5 text-red-300 animate-pulse" />
                                <span className="text-xl font-black text-red-200">
                                  {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                                </span>
                              </div>
                            )}

                            {/* Entry Fee */}
                            <div className="flex items-center justify-center gap-2 mb-4 text-amber-200">
                              <BanknotesIcon className="w-5 h-5" />
                              <span className="font-bold">${session.entry_fee.toFixed(2)} entry</span>
                            </div>

                            {/* Join Button */}
                            <button
                              onClick={() => handleJoinSession(session)}
                              disabled={joiningSession || !locationVerified || session.status === 'completed'}
                              className={`w-full py-3 rounded-xl font-black text-lg transition-all ${
                                joiningSession || !locationVerified || session.status === 'completed'
                                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                  : 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white hover:from-amber-400 hover:to-yellow-500 shadow-lg hover:scale-105'
                              }`}
                            >
                              {joiningSession ? (
                                'Joining...'
                              ) : !locationVerified ? (
                                <span className="flex items-center justify-center gap-2">
                                  <LockClosedIcon className="w-5 h-5" />
                                  Location Required
                                </span>
                              ) : session.status === 'completed' ? (
                                'Completed'
                              ) : (
                                `JOIN FOR 25¢`
                              )}
                            </button>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* How It Works */}
          <div className="mt-16 bg-gradient-to-br from-amber-800/40 to-orange-900/40 rounded-3xl p-8 backdrop-blur-sm border-2 border-amber-500/30">
            <h3 className="text-3xl font-black text-amber-200 mb-6 text-center">
              💡 How Coin Play Works
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl font-black text-white">1</span>
                </div>
                <h4 className="text-xl font-bold text-amber-300 mb-2">Pay 25¢</h4>
                <p className="text-amber-200/80">
                  Every game costs just a quarter to enter. Affordable for everyone!
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl font-black text-white">2</span>
                </div>
                <h4 className="text-xl font-bold text-amber-300 mb-2">Play & Compete</h4>
                <p className="text-amber-200/80">
                  When max players join, you have 2 minutes to submit your best score!
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl font-black text-white">3</span>
                </div>
                <h4 className="text-xl font-bold text-amber-300 mb-2">Winner Takes 85%</h4>
                <p className="text-amber-200/80">
                  Highest score wins 85% of the prize pool. Win up to $850 from 25¢!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Location Modal */}
        {showLocationModal && (
          <LocationVerificationModal
            onGranted={handleLocationGranted}
            onDenied={handleLocationDenied}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}

