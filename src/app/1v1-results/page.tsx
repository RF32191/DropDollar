'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import CleanNavigation from '@/components/navigation/CleanNavigation';
import MatchmakingService from '@/lib/supabase/matchmakingService';

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
  
  const score = parseInt(searchParams.get('score') || '0');
  const gameType = searchParams.get('game') || 'quick-click';
  const entryFee = parseInt(searchParams.get('fee') || '1');
  const queueId = searchParams.get('queueId');
  const prizeAmount = (entryFee * 2 * 0.94).toFixed(2); // 94% after 6% platform fee
  
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Get user ID
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      setUserId(user.id);
      
      // Try to fetch match results
      if (queueId) {
        fetchMatchResults(user.id, queueId);
      } else {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, [queueId]);

  const fetchMatchResults = async (userId: string, queueId: string) => {
    try {
      console.log('🔍 [Results] Fetching match for queue:', queueId);
      
      // Import supabase client
      const supabase = (await import('@/lib/supabase/client')).default;
      
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
              {/* Winner/Loser Animation */}
              <div className="text-center mb-8">
                <div className="text-8xl mb-4 animate-bounce">
                  {isWinner ? '🏆' : isTie ? '🤝' : '😢'}
                </div>
                <h1 className="text-5xl font-black text-white mb-4">
                  {isWinner ? 'YOU WON!' : isTie ? 'TIE GAME!' : 'YOU LOST'}
                </h1>
                <p className="text-2xl text-purple-300">
                  {isWinner ? `+$${matchResult.prizeAmount.toFixed(2)} tokens!` : 
                   isTie ? 'Both players refunded' : 
                   'Better luck next time!'}
                </p>
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
                <h1 className="text-5xl font-black text-white mb-4">
                  GAME COMPLETE!
                </h1>
                <p className="text-2xl text-purple-300">Your score: {score.toLocaleString()}</p>
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

