'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useGlobalLocation } from '@/hooks/useGlobalLocation';
import { useInactivityTimeout } from '@/hooks/useInactivityTimeout';
import { ShieldCheckIcon, TrophyIcon } from '@heroicons/react/24/outline';
import CleanNavigation from '@/components/navigation/CleanNavigation';
import TournamentService from '@/lib/supabase/tournamentService';
import LiveTournamentEntry from '@/components/LiveTournamentEntry';

export default function TournamentsPage() {
  const { user } = useAuth();
  const globalLocation = useGlobalLocation();
  
  // Live tournament data
  const [liveTournaments, setLiveTournaments] = useState<any[]>([]);
  const [isLoadingTournaments, setIsLoadingTournaments] = useState(true);
  const [selectedTournament, setSelectedTournament] = useState<any | null>(null);
  
  // 10-minute inactivity timeout
  useInactivityTimeout({
    timeout: 10 * 60 * 1000,
    onTimeout: () => {
      console.log('🕐 Tournaments page timeout - reloading');
      window.location.reload();
    },
    enabled: true
  });

  // Load live tournaments from database
  useEffect(() => {
    loadLiveTournaments();
    const interval = setInterval(loadLiveTournaments, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadLiveTournaments = async () => {
    try {
      const tournaments = await TournamentService.getActiveTournaments();
      console.log('🏆 [Tournaments] Loaded:', tournaments.length);
      setLiveTournaments(tournaments);
    } catch (error) {
      console.error('❌ [Tournaments] Load error:', error);
    } finally {
      setIsLoadingTournaments(false);
    }
  };

  const handleTournamentEntry = (tournament: any) => {
    if (!user) {
      alert('Please sign in to enter tournaments');
      window.location.href = '/auth/login';
      return;
    }
    setSelectedTournament(tournament);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      <CleanNavigation variant="gradient" currentPage="/tournaments" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* LIVE Tournament Banners */}
        <div className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-6xl font-extrabold mb-6">
              <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent animate-pulse">
                🏆 LIVE SKILL TOURNAMENTS
              </span>
            </h2>
            <div className="w-32 h-1 bg-gradient-to-r from-yellow-400 to-red-500 mx-auto rounded-full animate-pulse mb-6"></div>
            <p className="text-xl text-transparent bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text animate-pulse">
              {isLoadingTournaments ? 'Loading live tournaments...' : `${liveTournaments.length} Active Tournaments - Real Prizes!`}
            </p>
          </div>
          
          {isLoadingTournaments ? (
            <div className="text-center py-20">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-yellow-400 mx-auto mb-4"></div>
              <p className="text-white text-xl">Loading tournaments...</p>
            </div>
          ) : liveTournaments.length === 0 ? (
            <div className="text-center py-20 bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl border-2 border-gray-700">
              <TrophyIcon className="h-24 w-24 text-gray-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">No Active Tournaments</h3>
              <p className="text-gray-400 mb-4">Check back soon for new competitions!</p>
              <p className="text-sm text-gray-500">Administrators can create tournaments in the admin panel</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
              {liveTournaments.map((tournament) => {
                const progress = (tournament.current_players / tournament.max_players) * 100;
                const winnerPrize = tournament.prize_pool * 0.85; // 85% after platform fee
                
                return (
                  <div key={tournament.id} className="relative bg-gradient-to-br from-gray-900 via-black to-gray-800 rounded-3xl p-8 shadow-2xl border-2 border-yellow-500/30 hover:scale-105 transition-all duration-300 group overflow-hidden">
                    <div className="absolute inset-0 opacity-20">
                      <div className="absolute top-4 right-4 w-24 h-24 bg-yellow-500/20 rounded-full blur-xl animate-pulse"></div>
                      <div className="absolute bottom-4 left-4 w-32 h-32 bg-yellow-500/10 rounded-full blur-xl animate-pulse delay-1000"></div>
                      <div className="absolute inset-0 bg-gradient-to-t from-yellow-900/20 to-transparent"></div>
                    </div>
                    
                    <div className="relative z-10 text-center mb-6">
                      <div className="text-6xl mb-4">🏆</div>
                      <h3 className="text-2xl font-black text-white mb-2">${tournament.prize_pool.toLocaleString()} Prize Pool</h3>
                      <div className="text-3xl font-black text-yellow-400 mb-2">Winner Gets: ${winnerPrize.toFixed(2)}</div>
                      <p className="text-xl font-bold text-white/90 mb-1">{tournament.name}</p>
                      <p className="text-yellow-300">{tournament.game_type}</p>
                      <div className="text-sm text-gray-400 mt-2">(-15% platform fee)</div>
                    </div>
                    
                    <div className="relative z-10 space-y-4 mb-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-yellow-500/20">
                          <div className="text-2xl font-bold text-white">{tournament.current_players}/{tournament.max_players}</div>
                          <div className="text-xs text-gray-300">Participants</div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-yellow-500/20">
                          <div className="text-2xl font-bold text-white">${tournament.entry_fee}</div>
                          <div className="text-xs text-gray-300">{tournament.entry_fee} Tokens</div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-300 font-medium">Tournament Progress</span>
                          <span className="text-gray-400">{Math.round(progress)}%</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-3">
                          <div className="bg-gradient-to-r from-yellow-500 to-orange-600 h-3 rounded-full transition-all duration-500" style={{width: `${progress}%`}}></div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="relative z-10">
                      {globalLocation.status === 'granted' && globalLocation.isGamingAllowed ? (
                        <button 
                          onClick={() => handleTournamentEntry(tournament)}
                          className="w-full bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-500 hover:to-yellow-600 text-white font-black py-4 px-6 rounded-xl transition-all hover:scale-105 shadow-lg border border-yellow-500/50"
                        >
                          ⚡ PAY ${tournament.entry_fee} & PLAY NOW
                        </button>
                      ) : globalLocation.status === 'restricted' ? (
                        <div className="w-full py-4 px-6 rounded-xl bg-red-700 border border-red-600 text-center">
                          <div className="text-red-300 text-sm mb-2">
                            <ShieldCheckIcon className="h-5 w-5 inline mr-2" />
                            Gaming Not Allowed in Your Location
                          </div>
                        </div>
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
                            Enable Location to Join
                          </button>
                        </div>
                      )}
                    </div>
                    
                    <div className="absolute top-4 left-4 bg-green-600/80 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-bold text-white">
                      🔴 LIVE
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tournament Entry Modal */}
          {selectedTournament && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 max-w-md w-full border-2 border-yellow-500/30 shadow-2xl">
                <div className="text-center mb-6">
                  <h3 className="text-3xl font-black text-white mb-2">{selectedTournament.name}</h3>
                  <p className="text-gray-400">{selectedTournament.game_type}</p>
                </div>
                
                <LiveTournamentEntry 
                  tournament={selectedTournament}
                  onEntryComplete={() => {
                    setSelectedTournament(null);
                    loadLiveTournaments();
                  }}
                />
                
                <button
                  onClick={() => setSelectedTournament(null)}
                  className="mt-4 w-full py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 1v1 SKILL MATCHES */}
        <div className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-black text-purple-600 dark:text-purple-400 mb-4">⚔️ 1v1 SKILL MATCHES</h2>
            <p className="text-lg text-gray-300">Challenge players in direct competition!</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* $1 Match */}
            <div className="relative bg-gradient-to-br from-gray-900 via-black to-gray-800 rounded-3xl p-6 shadow-2xl border-2 border-green-500/30 hover:scale-105 transition-all duration-300">
              <div className="text-center mb-4">
                <div className="text-4xl mb-3">💚</div>
                <h3 className="text-xl font-black text-white mb-2">$1 Quick Match</h3>
                <div className="text-2xl font-black text-green-400 mb-1">Winner: $0.85</div>
                <p className="text-green-300 text-sm">Entry: $1 (1 token)</p>
              </div>

              {globalLocation.status === 'granted' && globalLocation.isGamingAllowed ? (
                <button className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white font-bold py-3 px-4 rounded-lg transition-all hover:scale-105 text-sm">
                  💚 FIND MATCH - $1
                </button>
              ) : globalLocation.status === 'restricted' ? (
                <div className="w-full py-3 px-4 rounded-lg bg-red-700 border border-red-600 text-center">
                  <div className="text-red-300 text-xs">
                    <ShieldCheckIcon className="h-4 w-4 inline mr-1" />
                    Not Available in Your State
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => globalLocation.requestLocation()}
                  className="w-full py-3 px-4 rounded-lg bg-gray-700 border border-gray-600 text-center hover:bg-gray-600 transition-all"
                >
                  <div className="text-gray-300 text-xs mb-1">
                    <ShieldCheckIcon className="h-4 w-4 inline mr-1" />
                    Location Required
                  </div>
                  <div className="text-green-400 text-xs font-medium">Enable Location</div>
                </button>
              )}
            </div>

            {/* $5 Match */}
            <div className="relative bg-gradient-to-br from-gray-900 via-black to-gray-800 rounded-3xl p-6 shadow-2xl border-2 border-blue-500/30 hover:scale-105 transition-all duration-300">
              <div className="text-center mb-4">
                <div className="text-4xl mb-3">🛡️</div>
                <h3 className="text-xl font-black text-white mb-2">$5 Standard</h3>
                <div className="text-2xl font-black text-blue-400 mb-1">Winner: $4.25</div>
                <p className="text-blue-300 text-sm">Entry: $5 (5 tokens)</p>
              </div>

              {globalLocation.status === 'granted' && globalLocation.isGamingAllowed ? (
                <button className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-3 px-4 rounded-lg transition-all hover:scale-105 text-sm">
                  🛡️ FIND MATCH - $5
                </button>
              ) : globalLocation.status === 'restricted' ? (
                <div className="w-full py-3 px-4 rounded-lg bg-red-700 border border-red-600 text-center">
                  <div className="text-red-300 text-xs">
                    <ShieldCheckIcon className="h-4 w-4 inline mr-1" />
                    Not Available in Your State
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => globalLocation.requestLocation()}
                  className="w-full py-3 px-4 rounded-lg bg-gray-700 border border-gray-600 text-center hover:bg-gray-600 transition-all"
                >
                  <div className="text-gray-300 text-xs mb-1">
                    <ShieldCheckIcon className="h-4 w-4 inline mr-1" />
                    Location Required
                  </div>
                  <div className="text-blue-400 text-xs font-medium">Enable Location</div>
                </button>
              )}
            </div>

            {/* $10 Match */}
            <div className="relative bg-gradient-to-br from-gray-900 via-black to-gray-800 rounded-3xl p-6 shadow-2xl border-2 border-purple-500/30 hover:scale-105 transition-all duration-300">
              <div className="text-center mb-4">
                <div className="text-4xl mb-3">⚔️</div>
                <h3 className="text-xl font-black text-white mb-2">$10 Advanced</h3>
                <div className="text-2xl font-black text-purple-400 mb-1">Winner: $8.50</div>
                <p className="text-purple-300 text-sm">Entry: $10 (10 tokens)</p>
              </div>

              {globalLocation.status === 'granted' && globalLocation.isGamingAllowed ? (
                <button className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-bold py-3 px-4 rounded-lg transition-all hover:scale-105 text-sm">
                  ⚔️ FIND MATCH - $10
                </button>
              ) : globalLocation.status === 'restricted' ? (
                <div className="w-full py-3 px-4 rounded-lg bg-red-700 border border-red-600 text-center">
                  <div className="text-red-300 text-xs">
                    <ShieldCheckIcon className="h-4 w-4 inline mr-1" />
                    Not Available in Your State
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => globalLocation.requestLocation()}
                  className="w-full py-3 px-4 rounded-lg bg-gray-700 border border-gray-600 text-center hover:bg-gray-600 transition-all"
                >
                  <div className="text-gray-300 text-xs mb-1">
                    <ShieldCheckIcon className="h-4 w-4 inline mr-1" />
                    Location Required
                  </div>
                  <div className="text-purple-400 text-xs font-medium">Enable Location</div>
                </button>
              )}
            </div>

            {/* $25 Match */}
            <div className="relative bg-gradient-to-br from-gray-900 via-black to-gray-800 rounded-3xl p-6 shadow-2xl border-2 border-red-500/30 hover:scale-105 transition-all duration-300">
              <div className="text-center mb-4">
                <div className="text-4xl mb-3">👑</div>
                <h3 className="text-xl font-black text-white mb-2">$25 Elite</h3>
                <div className="text-2xl font-black text-red-400 mb-1">Winner: $21.25</div>
                <p className="text-red-300 text-sm">Entry: $25 (25 tokens)</p>
              </div>

              {globalLocation.status === 'granted' && globalLocation.isGamingAllowed ? (
                <button className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold py-3 px-4 rounded-lg transition-all hover:scale-105 text-sm">
                  👑 FIND MATCH - $25
                </button>
              ) : globalLocation.status === 'restricted' ? (
                <div className="w-full py-3 px-4 rounded-lg bg-red-700 border border-red-600 text-center">
                  <div className="text-red-300 text-xs">
                    <ShieldCheckIcon className="h-4 w-4 inline mr-1" />
                    Not Available in Your State
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => globalLocation.requestLocation()}
                  className="w-full py-3 px-4 rounded-lg bg-gray-700 border border-gray-600 text-center hover:bg-gray-600 transition-all"
                >
                  <div className="text-gray-300 text-xs mb-1">
                    <ShieldCheckIcon className="h-4 w-4 inline mr-1" />
                    Location Required
                  </div>
                  <div className="text-red-400 text-xs font-medium">Enable Location</div>
                </button>
              )}
            </div>
          </div>

          <div className="mt-6 bg-yellow-500/20 border border-yellow-500 rounded-xl p-4">
            <p className="text-yellow-300 text-center text-sm">
              🚧 <strong>1v1 Matchmaking Coming Soon!</strong> ELO-based skill matching system in development.
            </p>
          </div>
        </div>

        {/* Info Section */}
        <div className="bg-gradient-to-r from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30 border-2 border-red-300 dark:border-red-600 rounded-2xl p-6 mb-8">
          <div className="text-center">
            <h3 className="text-lg font-bold text-red-900 dark:text-red-100 mb-4">💰 Tournament Rules</h3>
            <div className="text-red-800 dark:text-red-200 text-center mb-4">
              <p className="mb-2"><strong>💵 1 Token = $1 USD:</strong> Tokens held in escrow until winner determined.</p>
              <p className="mb-2"><strong>Entry Fees:</strong> Pay with tokens - money transferred to Stripe escrow.</p>
              <p className="mb-2"><strong>15% Platform Fee:</strong> DropDollar takes 15% of prize pool. Winners get 85%.</p>
              <p className="mb-2"><strong>Fair Play:</strong> All players use same RNG seed for equal challenge.</p>
              <p><strong>Winner Takes All:</strong> Highest score wins the entire prize pot when listing closes.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
