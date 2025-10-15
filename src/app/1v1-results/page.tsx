'use client';

import React, { Suspense, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import CleanNavigation from '@/components/navigation/CleanNavigation';
import MatchmakingService from '@/lib/supabase/matchmakingService';
import OpponentAssignmentService from '@/lib/supabase/opponentAssignmentService';
import { createClient } from '@supabase/supabase-js';
import { usePreventBackNavigation } from '@/hooks/usePreventBackNavigation';

// Create Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface MatchResult {
  matchId: string;
  player1Id: string;
  player1Name: string;
  player1Score: number;
  player2Id: string;
  player2Name: string;
  player2Score: number;
  winnerId: string | null;
  prizeAmount: number;
  gameType: string;
  entryFee: number;
}

function ResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Prevent back navigation to prevent replay
  usePreventBackNavigation();
  
  const score = parseInt(searchParams.get('score') || '0');
  const gameType = searchParams.get('game') || 'quick-click';
  const entryFee = parseInt(searchParams.get('fee') || '1');
  const queueId = searchParams.get('queueId');
  const prizeAmount = (entryFee + entryFee * 0.85).toFixed(2); // Stake back + 85% of opponent's stake
  
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [confirmationNumber, setConfirmationNumber] = useState<string>('');
  const [showTokenAnimation, setShowTokenAnimation] = useState(false);
  const [showGraffiti, setShowGraffiti] = useState(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const tokenContainerRef = useRef<HTMLDivElement>(null);

  // Initialize audio context
  useEffect(() => {
    const initAudio = async () => {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        setAudioContext(audioCtx);
        console.log('🔊 [Results] Audio context initialized');
      } catch (error) {
        console.error('❌ [Results] Audio initialization failed:', error);
      }
    };
    initAudio();
  }, []);

  // Play victory sound
  const playVictorySound = () => {
    if (!audioContext) return;
    
    try {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Victory melody
      oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
      oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.2); // E5
      oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.4); // G5
      oscillator.frequency.setValueAtTime(1046.50, audioContext.currentTime + 0.6); // C6
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 1);
      
      console.log('🎵 [Results] Victory sound played');
    } catch (error) {
      console.error('❌ [Results] Sound playback failed:', error);
    }
  };

  // Create token animation
  const createTokenAnimation = () => {
    if (!tokenContainerRef.current) return;
    
    const container = tokenContainerRef.current;
    const tokenCount = Math.floor(matchResult?.prizeAmount || 0);
    
    for (let i = 0; i < tokenCount; i++) {
      setTimeout(() => {
        const token = document.createElement('div');
        token.className = 'absolute text-4xl animate-bounce';
        token.textContent = '🪙';
        token.style.left = Math.random() * 100 + '%';
        token.style.top = Math.random() * 100 + '%';
        token.style.animationDelay = Math.random() * 2 + 's';
        token.style.animationDuration = '3s';
        
        container.appendChild(token);
        
        // Remove token after animation
        setTimeout(() => {
          if (token.parentNode) {
            token.parentNode.removeChild(token);
          }
        }, 3000);
      }, i * 100);
    }
  };

  useEffect(() => {
    // Generate confirmation number
    const confNum = `DD-${Date.now().toString().slice(-8)}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    setConfirmationNumber(confNum);
    console.log('🎫 [Results] Confirmation number generated:', confNum);
    
    // Get user ID from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setUserId(user.id);
        console.log('🔍 [Results] User ID loaded:', user.id);
      } catch (error) {
        console.error('❌ [Results] Error parsing user data:', error);
        router.push('/signin');
        return;
      }
    } else {
      console.log('❌ [Results] No user data found, redirecting to signin');
      router.push('/signin');
      return;
    }
    
    // Try to fetch match results
    if (queueId) {
      fetchMatchResults(user.id, queueId);
    } else {
      setIsLoading(false);
    }
  }, [queueId]);

  // Trigger animations when match result is found
  useEffect(() => {
    if (matchResult && matchResult.winnerId) {
      const isWinner = matchResult.winnerId === userId;
      
      if (isWinner) {
        // Play victory sound
        playVictorySound();
        
        // Show token animation
        setShowTokenAnimation(true);
        setTimeout(() => createTokenAnimation(), 500);
        
        // Show graffiti effect
        setShowGraffiti(true);
        setTimeout(() => setShowGraffiti(false), 3000);
      }
    }
  }, [matchResult, userId]);

  const fetchMatchResults = async (userId: string, queueId: string) => {
    try {
      console.log('🔍 [Results] Fetching match for queue:', queueId);
      
      // Query matches table for this user's match
      const { data: matches, error } = await supabase
        .from('matches')
        .select('*')
        .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
        .eq('game_type', gameType)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('❌ [Results] Error fetching match:', error);
        setIsLoading(false);
        return;
      }

      if (matches && matches.length > 0) {
        const match = matches[0];
        console.log('✅ [Results] Match found:', match);

        // Fetch player names
        const { data: users } = await supabase
          .from('users')
          .select('id, username, email')
          .in('id', [match.player1_id, match.player2_id]);

        const player1 = users?.find(u => u.id === match.player1_id);
        const player2 = users?.find(u => u.id === match.player2_id);

        setMatchResult({
          matchId: match.id,
          player1Id: match.player1_id,
          player1Name: player1?.username || player1?.email || 'Player 1',
          player1Score: match.player1_score || 0,
          player2Id: match.player2_id,
          player2Name: player2?.username || player2?.email || 'Player 2',
          player2Score: match.player2_score || 0,
          winnerId: match.winner_id,
          prizeAmount: match.prize_amount || parseFloat(prizeAmount),
          gameType: match.game_type,
          entryFee: match.entry_fee
        });
      } else {
        console.log('⏳ [Results] No match found yet - still searching');
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('❌ [Results] Exception:', error);
      setIsLoading(false);
    }
  };

  // Determine if current user won
  const isWinner = matchResult && userId && matchResult.winnerId === userId;
  const isLoser = matchResult && userId && matchResult.winnerId && matchResult.winnerId !== userId;
  const isTie = matchResult && matchResult.player1Score === matchResult.player2Score;
  
  // Get current user's data
  const isPlayer1 = matchResult && userId && matchResult.player1Id === userId;
  const currentPlayerScore = isPlayer1 ? matchResult?.player1Score : matchResult?.player2Score;
  const opponentScore = isPlayer1 ? matchResult?.player2Score : matchResult?.player1Score;
  const opponentName = isPlayer1 ? matchResult?.player2Name : matchResult?.player1Name;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900">
      <CleanNavigation variant="gradient" currentPage="/tournaments" />
      
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-2xl mx-auto">
          
          {/* Match Found - Show Results */}
          {matchResult && matchResult.winnerId ? (
            <>
              {/* Winner/Loser Animation with Token Container */}
              <div className="relative text-center mb-8">
                {/* Token Animation Container */}
                {showTokenAnimation && (
                  <div 
                    ref={tokenContainerRef}
                    className="absolute inset-0 pointer-events-none z-10 overflow-hidden"
                    style={{ width: '100%', height: '400px' }}
                  />
                )}
                
                {/* Graffiti Effect */}
                {showGraffiti && isWinner && (
                  <div className="absolute inset-0 pointer-events-none z-20">
                    <div className="text-6xl font-black text-yellow-400 animate-pulse opacity-80 transform rotate-12">
                      WINNER!
                    </div>
                    <div className="text-4xl font-black text-green-400 animate-pulse opacity-60 transform -rotate-12 mt-8">
                      CHAMPION!
                    </div>
                    <div className="text-3xl font-black text-purple-400 animate-pulse opacity-70 transform rotate-6 mt-4">
                      VICTORY!
                    </div>
                  </div>
                )}
                
                <div className="text-8xl mb-4 animate-bounce">
                  {isWinner ? '🏆' : isTie ? '🤝' : '😢'}
                </div>
                <h1 className={`text-5xl font-black mb-4 ${
                  isWinner ? 'text-yellow-400 animate-pulse' : 
                  isTie ? 'text-blue-400' : 
                  'text-red-400'
                }`}>
                  {isWinner ? 'YOU WON!' : isTie ? 'TIE GAME!' : 'YOU LOST'}
                </h1>
                <p className="text-2xl text-purple-300">
                  {isWinner ? `+$${matchResult.prizeAmount.toFixed(2)} tokens!` : 
                   isTie ? 'Both players refunded' : 
                   'Better luck next time!'}
                </p>
                
                {/* Enhanced Prize Display for Winners */}
                {isWinner && (
                  <div className="mt-6 p-6 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-2xl border-4 border-yellow-400 animate-pulse">
                    <div className="text-6xl mb-2">💰</div>
                    <p className="text-3xl font-black text-yellow-400">
                      +${matchResult.prizeAmount.toFixed(2)} TOKENS ADDED!
                    </p>
                    <p className="text-yellow-200 text-sm mt-2">
                      Tokens have been added to your wallet
                    </p>
                  </div>
                )}
                
                {/* Confirmation Number */}
                <div className="mt-6 p-4 bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-xl border-2 border-blue-500/30">
                  <p className="text-blue-300 text-sm mb-1">Confirmation Number</p>
                  <p className="text-2xl font-black text-blue-400 font-mono">
                    {confirmationNumber}
                  </p>
                  <p className="text-blue-200 text-xs mt-1">Save this number for your records</p>
                </div>
              </div>

              {/* Match Scorecard */}
              <div className="bg-gradient-to-br from-gray-900 via-black to-gray-800 rounded-3xl p-8 shadow-2xl border-2 border-yellow-500/30 mb-8">
                <h2 className="text-center text-2xl font-bold text-white mb-6">Match Results</h2>
                
                {/* Player 1 */}
                <div className={`flex items-center justify-between p-6 rounded-xl mb-4 ${
                  matchResult.winnerId === matchResult.player1Id 
                    ? 'bg-green-500/20 border-2 border-green-500' 
                    : 'bg-gray-800/50 border border-gray-700'
                }`}>
                  <div className="flex items-center gap-4">
                    {matchResult.winnerId === matchResult.player1Id && (
                      <div className="text-4xl">👑</div>
                    )}
                    <div>
                      <p className="text-white font-bold text-lg">
                        {matchResult.player1Name}
                        {userId === matchResult.player1Id && ' (You)'}
                      </p>
                      <p className="text-gray-400 text-sm">{matchResult.gameType}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-4xl font-black text-yellow-400">
                      {matchResult.player1Score.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* VS Divider */}
                <div className="text-center text-gray-500 font-bold text-2xl my-4">VS</div>

                {/* Player 2 */}
                <div className={`flex items-center justify-between p-6 rounded-xl mb-6 ${
                  matchResult.winnerId === matchResult.player2Id 
                    ? 'bg-green-500/20 border-2 border-green-500' 
                    : 'bg-gray-800/50 border border-gray-700'
                }`}>
                  <div className="flex items-center gap-4">
                    {matchResult.winnerId === matchResult.player2Id && (
                      <div className="text-4xl">👑</div>
                    )}
                    <div>
                      <p className="text-white font-bold text-lg">
                        {matchResult.player2Name}
                        {userId === matchResult.player2Id && ' (You)'}
                      </p>
                      <p className="text-gray-400 text-sm">{matchResult.gameType}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-4xl font-black text-yellow-400">
                      {matchResult.player2Score.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Prize Info */}
                <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500 rounded-xl p-6 text-center">
                  <p className="text-gray-300 text-sm mb-2">Prize Amount</p>
                  <p className="text-4xl font-black text-yellow-400">
                    ${matchResult.prizeAmount.toFixed(2)}
                  </p>
                  <p className="text-gray-400 text-xs mt-2">
                    ({(matchResult.entryFee * 2).toFixed(2)} - 6% platform fee)
                  </p>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Still Searching for Opponent */}
              <div className="text-center mb-8">
                <div className="text-8xl mb-4 animate-bounce">🎉</div>
                <h1 className="text-5xl font-black text-white mb-4 animate-pulse">
                  GAME COMPLETE!
                </h1>
                <p className="text-2xl text-purple-300">Your score: {score.toLocaleString()}</p>
                
                {/* Score Celebration */}
                <div className="mt-6 p-6 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl border-2 border-purple-400 animate-pulse">
                  <div className="text-6xl mb-2">🎯</div>
                  <p className="text-3xl font-black text-purple-400">
                    SCORE: {score.toLocaleString()}
                  </p>
                  <p className="text-purple-200 text-sm mt-2">
                    Waiting for opponent to complete their game...
                  </p>
                </div>
                
                {/* Confirmation Number */}
                <div className="mt-6 p-4 bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-xl border-2 border-blue-500/30">
                  <p className="text-blue-300 text-sm mb-1">Confirmation Number</p>
                  <p className="text-2xl font-black text-blue-400 font-mono">
                    {confirmationNumber}
                  </p>
                  <p className="text-blue-200 text-xs mt-1">Save this number for your records</p>
                </div>
              </div>

              {/* Searching Card */}
              <div className="bg-gradient-to-br from-gray-900 via-black to-gray-800 rounded-3xl p-12 shadow-2xl border-2 border-purple-500/30 mb-8">
                <div className="text-center mb-8">
                  <div className="text-6xl mb-4 animate-spin">🔍</div>
                  <h2 className="text-2xl font-bold text-white mb-4">
                    Searching for Opponent...
                  </h2>
                  <p className="text-gray-400">
                    We're finding someone who played the same game
                  </p>
                </div>

                <div className="bg-purple-500/20 border border-purple-500 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-white mb-3 text-center">
                    🎯 What Happens Next
                  </h3>
                  <ul className="space-y-2 text-gray-300 text-sm">
                    <li className="flex items-start">
                      <span className="mr-2">✅</span>
                      <span>Your score has been saved: {score.toLocaleString()}</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">🔍</span>
                      <span>Matching with opponents who chose {gameType}</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">⚔️</span>
                      <span>Highest score wins ${prizeAmount}!</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">💰</span>
                      <span>Winnings added to your wallet automatically</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Match Info */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-8">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-gray-400 text-sm">Entry Fee</p>
                    <p className="text-2xl font-bold text-white">${entryFee}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-400 text-sm">Potential Prize</p>
                    <p className="text-2xl font-bold text-yellow-400">${prizeAmount}</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="space-y-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-4 px-6 rounded-xl transition-all hover:scale-105 shadow-lg"
            >
              📊 View Dashboard
            </button>
            <button
              onClick={() => router.push('/tournaments')}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-bold py-4 px-6 rounded-xl transition-all hover:scale-105 shadow-lg"
            >
              ⚔️ Play Another 1v1
            </button>
            <button
              onClick={() => router.push('/games')}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-xl transition-all"
            >
              🎮 Practice Mode
            </button>
          </div>

          {/* Info Note */}
          <div className="mt-8 text-center text-sm text-gray-400">
            <p>💡 Check your dashboard to see if you've been matched yet!</p>
            <p className="mt-2">Matching happens automatically when someone else plays the same game.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-2xl">Loading results...</div>
      </div>
    }>
      <ResultsContent />
    </Suspense>
  );
}

