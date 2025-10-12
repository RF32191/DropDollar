'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useGlobalLocation } from '@/hooks/useGlobalLocation';
import { useInactivityTimeout } from '@/hooks/useInactivityTimeout';
import { ShieldCheckIcon, FireIcon, TrophyIcon } from '@heroicons/react/24/outline';
import CleanNavigation from '@/components/navigation/CleanNavigation';
import CompetitionService from '@/lib/supabase/competitionService';
import LiveTournamentEntry from '@/components/LiveTournamentEntry';

export default function HotSellPage() {
  const { user } = useAuth();
  const globalLocation = useGlobalLocation();
  
  // Live competition data
  const [liveCompetitions, setLiveCompetitions] = useState<any[]>([]);
  const [isLoadingCompetitions, setIsLoadingCompetitions] = useState(true);
  const [selectedCompetition, setSelectedCompetition] = useState<any | null>(null);
  
  // 10-minute inactivity timeout
  useInactivityTimeout({
    timeout: 10 * 60 * 1000,
    onTimeout: () => {
      console.log('🕐 Hot-sell page timeout - reloading');
      window.location.reload();
    },
    enabled: true
  });

  // Load live competitions from database
  useEffect(() => {
    loadLiveCompetitions();
    const interval = setInterval(loadLiveCompetitions, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadLiveCompetitions = async () => {
    try {
      // For now, we'll show an empty state until competitions are created
      // This can be populated by admin or auto-generated
      console.log('🔥 [HotSell] Loading competitions...');
      setLiveCompetitions([]);
    } catch (error) {
      console.error('❌ [HotSell] Load error:', error);
    } finally {
      setIsLoadingCompetitions(false);
    }
  };

  const handleCompetitionEntry = (competition: any) => {
    if (!user) {
      alert('Please sign in to enter Hot Sell competitions');
      window.location.href = '/auth/login';
      return;
    }
    setSelectedCompetition(competition);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900">
      <CleanNavigation variant="gradient" currentPage="/hot-sell" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* HOT SELL Banner */}
        <div className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-6xl font-extrabold mb-6">
              <span className="bg-gradient-to-r from-red-400 via-orange-500 to-yellow-500 bg-clip-text text-transparent animate-pulse">
                🔥 HOT SELL CASH PRIZES
              </span>
            </h2>
            <div className="w-32 h-1 bg-gradient-to-r from-red-400 to-yellow-500 mx-auto rounded-full animate-pulse mb-6"></div>
            <p className="text-xl text-transparent bg-gradient-to-r from-red-300 to-orange-300 bg-clip-text animate-pulse">
              {isLoadingCompetitions ? 'Loading competitions...' : `${liveCompetitions.length} Live Cash Prize Competitions!`}
            </p>
          </div>
          
          {isLoadingCompetitions ? (
            <div className="text-center py-20">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-orange-400 mx-auto mb-4"></div>
              <p className="text-white text-xl">Loading competitions...</p>
            </div>
          ) : liveCompetitions.length === 0 ? (
            <div className="text-center py-20 bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl border-2 border-orange-700">
              <FireIcon className="h-24 w-24 text-orange-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">No Active Hot Sell Competitions</h3>
              <p className="text-gray-400 mb-4">Check back soon for exciting cash prize competitions!</p>
              <p className="text-sm text-gray-500">Administrators can create Hot Sell competitions in the admin panel</p>
              <div className="mt-8 bg-orange-900/30 border border-orange-600 rounded-2xl p-6 max-w-2xl mx-auto">
                <h4 className="text-lg font-bold text-orange-400 mb-3">🎮 What are Hot Sell Competitions?</h4>
                <ul className="text-left text-gray-300 space-y-2">
                  <li>• <strong>Instant Play:</strong> Enter anytime, no waiting for players</li>
                  <li>• <strong>Multiple Attempts:</strong> Pay $1-$3 for 1-3 game attempts</li>
                  <li>• <strong>Hidden Scores:</strong> Scores revealed only after all attempts</li>
                  <li>• <strong>Fair RNG:</strong> Each competition uses unique random seeds</li>
                  <li>• <strong>Real Cash:</strong> Winners withdraw directly to bank accounts</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
              {liveCompetitions.map((competition) => {
                const progress = (competition.entries / competition.max_entries) * 100;
                const winnerPrize = competition.prize_amount * 0.85; // 85% after platform fee
                
                return (
                  <div key={competition.id} className="relative bg-gradient-to-br from-gray-900 via-black to-gray-800 rounded-3xl p-8 shadow-2xl border-2 border-orange-500/30 hover:scale-105 transition-all duration-300 group overflow-hidden">
                    <div className="absolute inset-0 opacity-20">
                      <div className="absolute top-4 right-4 w-24 h-24 bg-orange-500/20 rounded-full blur-xl animate-pulse"></div>
                      <div className="absolute bottom-4 left-4 w-32 h-32 bg-orange-500/10 rounded-full blur-xl animate-pulse delay-1000"></div>
                      <div className="absolute inset-0 bg-gradient-to-t from-orange-900/20 to-transparent"></div>
                    </div>
                    
                    <div className="relative z-10 text-center mb-6">
                      <div className="text-6xl mb-4">💰</div>
                      <h3 className="text-2xl font-black text-white mb-2">${competition.prize_amount.toLocaleString()} Cash Prize</h3>
                      <div className="text-3xl font-black text-orange-400 mb-2">Winner Gets: ${winnerPrize.toFixed(2)}</div>
                      <p className="text-xl font-bold text-white/90 mb-1">{competition.name}</p>
                      <p className="text-orange-300">{competition.game_type}</p>
                      <div className="text-sm text-gray-400 mt-2">(-15% platform fee)</div>
                    </div>
                    
                    <div className="relative z-10 space-y-4 mb-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-orange-500/20">
                          <div className="text-2xl font-bold text-white">{competition.entries}/{competition.max_entries}</div>
                          <div className="text-xs text-gray-300">Entries</div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-orange-500/20">
                          <div className="text-2xl font-bold text-white">$1-$3</div>
                          <div className="text-xs text-gray-300">Per Entry</div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-300 font-medium">Competition Progress</span>
                          <span className="text-gray-400">{Math.round(progress)}%</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-3">
                          <div className="bg-gradient-to-r from-orange-500 to-red-600 h-3 rounded-full transition-all duration-500" style={{width: `${progress}%`}}></div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="relative z-10">
                      {globalLocation.status === 'granted' && globalLocation.isGamingAllowed ? (
                        <button 
                          onClick={() => handleCompetitionEntry(competition)}
                          className="w-full bg-gradient-to-r from-orange-600 to-red-700 hover:from-orange-500 hover:to-red-600 text-white font-black py-4 px-6 rounded-xl transition-all hover:scale-105 shadow-lg border border-orange-500/50"
                        >
                          🔥 ENTER NOW - $1 TO $3
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
                            className="text-orange-400 hover:text-orange-300 font-medium text-sm"
                          >
                            Enable Location to Enter
                          </button>
                        </div>
                      )}
                    </div>
                    
                    <div className="absolute top-4 left-4 bg-red-600/80 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-bold text-white">
                      🔥 HOT
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Competition Entry Modal */}
          {selectedCompetition && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 max-w-md w-full border-2 border-orange-500/30 shadow-2xl">
                <div className="text-center mb-6">
                  <h3 className="text-3xl font-black text-white mb-2">{selectedCompetition.name}</h3>
                  <p className="text-gray-400">{selectedCompetition.game_type}</p>
                </div>
                
                <LiveTournamentEntry 
                  tournament={selectedCompetition}
                  onEntryComplete={() => {
                    setSelectedCompetition(null);
                    loadLiveCompetitions();
                  }}
                />
                
                <button
                  onClick={() => setSelectedCompetition(null)}
                  className="mt-4 w-full py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30 border-2 border-orange-300 dark:border-orange-600 rounded-2xl p-6 mb-8">
          <div className="text-center">
            <h3 className="text-lg font-bold text-orange-900 dark:text-orange-100 mb-4">🔥 Hot Sell Rules</h3>
            <div className="text-orange-800 dark:text-orange-200 text-center mb-4">
              <p className="mb-2"><strong>Entry Options:</strong> Pay $1, $2, or $3 for 1-3 attempts per competition.</p>
              <p className="mb-2"><strong>15% Platform Fee:</strong> DropDollar takes 15% of the prize. Winners get 85%.</p>
              <p className="mb-2"><strong>Fair Play:</strong> Each competition has 20 unique RNG seeds.</p>
              <p><strong>Score Privacy:</strong> Your score is hidden until all your attempts are complete.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
