'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { TournamentService, Tournament, TournamentParticipant } from '@/lib/supabase/tournamentService';
import { UserService } from '@/lib/supabase/userService';
import CleanNavigation from '@/components/navigation/CleanNavigation';
import { 
  TrophyIcon, 
  UsersIcon,
  BanknotesIcon,
  StarIcon,
  ClockIcon,
  FireIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

export default function OneVOneTournamentsPage() {
  const { user, isAuthenticated } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [participants, setParticipants] = useState<{ [tournamentId: string]: TournamentParticipant[] }>({});
  const [userTokens, setUserTokens] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [joiningTournament, setJoiningTournament] = useState<string | null>(null);
  const [creatingTournament, setCreatingTournament] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [newTournamentName, setNewTournamentName] = useState('');
  const [newTournamentGameType, setNewTournamentGameType] = useState('sword-parry');
  const [newTournamentEntryFee, setNewTournamentEntryFee] = useState(1);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadTournamentData();
    }
  }, [isAuthenticated, user]);

  const loadTournamentData = async () => {
    try {
      setIsLoading(true);
      
      // Load 1v1 tournaments
      const tournamentList = await TournamentService.getActive1v1Tournaments();
      setTournaments(tournamentList);
      
      // Load participants for each tournament
      const participantsData: { [tournamentId: string]: TournamentParticipant[] } = {};
      for (const tournament of tournamentList) {
        const tournamentParticipants = await TournamentService.getTournamentParticipants(tournament.id);
        participantsData[tournament.id] = tournamentParticipants;
      }
      setParticipants(participantsData);
      
      // Load user tokens
      if (user) {
        const profile = await UserService.getUserProfile(user.id);
        setUserTokens(profile?.tokens || 0);
      }
      
    } catch (error) {
      console.error('❌ [1v1Tournaments] Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createTournament = async () => {
    if (!user || !isAuthenticated) {
      setMessage({ type: 'error', text: 'Please log in to create tournaments' });
      return;
    }

    if (!newTournamentName.trim()) {
      setMessage({ type: 'error', text: 'Please enter a tournament name' });
      return;
    }

    try {
      setCreatingTournament(true);
      
      const tournament = await TournamentService.create1v1Tournament(
        newTournamentName,
        newTournamentGameType,
        newTournamentEntryFee
      );

      if (tournament) {
        setMessage({ type: 'success', text: `Tournament "${newTournamentName}" created successfully!` });
        setNewTournamentName('');
        setNewTournamentGameType('sword-parry');
        setNewTournamentEntryFee(1);
        loadTournamentData(); // Refresh the list
      } else {
        setMessage({ type: 'error', text: 'Failed to create tournament. Please try again.' });
      }
      
    } catch (error) {
      console.error('❌ [1v1Tournaments] Error creating tournament:', error);
      setMessage({ type: 'error', text: 'An error occurred. Please try again.' });
    } finally {
      setCreatingTournament(false);
    }
  };

  const joinTournament = async (tournament: Tournament) => {
    if (!user || !isAuthenticated) {
      setMessage({ type: 'error', text: 'Please log in to join tournaments' });
      return;
    }

    if (userTokens < tournament.entry_fee) {
      setMessage({ type: 'error', text: `You need ${tournament.entry_fee} tokens to join this tournament` });
      return;
    }

    const tournamentParticipants = participants[tournament.id] || [];
    if (tournamentParticipants.length >= tournament.max_participants) {
      setMessage({ type: 'error', text: 'This tournament is full' });
      return;
    }

    try {
      setJoiningTournament(tournament.id);
      
      // Deduct tokens from user
      const newTokenBalance = userTokens - tournament.entry_fee;
      const tokenUpdateSuccess = await UserService.updateUserTokens(user.id, newTokenBalance);
      
      if (!tokenUpdateSuccess) {
        setMessage({ type: 'error', text: 'Failed to deduct tokens. Please try again.' });
        return;
      }

      // Join the tournament
      const participant = await TournamentService.join1v1Tournament(
        tournament.id,
        user.id,
        tournament.entry_fee
      );

      if (participant) {
        setUserTokens(newTokenBalance);
        setMessage({ type: 'success', text: `Successfully joined ${tournament.name}!` });
        
        // Refresh participants
        const updatedParticipants = await TournamentService.getTournamentParticipants(tournament.id);
        setParticipants(prev => ({
          ...prev,
          [tournament.id]: updatedParticipants
        }));
      } else {
        // Refund tokens if join failed
        await UserService.updateUserTokens(user.id, userTokens);
        setMessage({ type: 'error', text: 'Failed to join tournament. Tokens refunded.' });
      }
      
    } catch (error) {
      console.error('❌ [1v1Tournaments] Error joining tournament:', error);
      setMessage({ type: 'error', text: 'An error occurred. Please try again.' });
    } finally {
      setJoiningTournament(null);
    }
  };

  const formatGameType = (gameType: string) => {
    const gameNames: Record<string, string> = {
      'sword-parry': 'Sword Parry',
      'quick-click': 'Quick Click',
      'memory-color': 'Memory Color',
      'number-tap': 'Multi-Target Reaction',
      'shape-tap': 'Shape Tap',
      'reaction-test': 'Reaction Test'
    };
    return gameNames[gameType] || gameType;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 text-white">
        <CleanNavigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <span className="ml-4 text-lg">Loading 1v1 tournaments...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 text-white relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-pink-500/5 rounded-full blur-2xl animate-pulse delay-500"></div>
      </div>
      
      <CleanNavigation />
      
      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <TrophyIcon className="w-12 h-12 text-yellow-500 mr-4 animate-pulse" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              1v1 TOURNAMENTS
            </h1>
          </div>
          <p className="text-xl text-gray-300 mb-2">Head-to-Head Skill Battles</p>
          <p className="text-lg text-gray-400">Challenge other players in intense 1v1 matches</p>
          
          {/* User Token Balance */}
          {isAuthenticated && (
            <div className="mt-6 inline-flex items-center bg-white/10 backdrop-blur-xl rounded-2xl px-6 py-3 border border-white/20">
              <BanknotesIcon className="w-6 h-6 text-yellow-400 mr-3" />
              <span className="text-lg font-semibold">Your Tokens: {userTokens}</span>
            </div>
          )}
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

        {/* Create Tournament Section */}
        {isAuthenticated && (
          <div className="mb-8 bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <PlusIcon className="w-6 h-6 mr-2 text-green-400" />
              Create New Tournament
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Tournament Name</label>
                <input
                  type="text"
                  value={newTournamentName}
                  onChange={(e) => setNewTournamentName(e.target.value)}
                  placeholder="Enter tournament name"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Game Type</label>
                <select
                  value={newTournamentGameType}
                  onChange={(e) => setNewTournamentGameType(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="sword-parry">Sword Parry</option>
                  <option value="quick-click">Quick Click</option>
                  <option value="memory-color">Memory Color</option>
                  <option value="number-tap">Multi-Target Reaction</option>
                  <option value="shape-tap">Shape Tap</option>
                  <option value="reaction-test">Reaction Test</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Entry Fee (Tokens)</label>
                <input
                  type="number"
                  min="1"
                  value={newTournamentEntryFee}
                  onChange={(e) => setNewTournamentEntryFee(parseInt(e.target.value) || 1)}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            
            <button
              onClick={createTournament}
              disabled={creatingTournament || !newTournamentName.trim()}
              className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-500 hover:to-blue-500 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creatingTournament ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Creating...
                </div>
              ) : (
                <div className="flex items-center">
                  <PlusIcon className="w-5 h-5 mr-2" />
                  Create Tournament
                </div>
              )}
            </button>
          </div>
        )}

        {/* Active Tournaments */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {tournaments.map((tournament) => {
            const tournamentParticipants = participants[tournament.id] || [];
            const isJoined = tournamentParticipants.some(p => p.user_id === user?.id);
            const canJoin = userTokens >= tournament.entry_fee && !isJoined && tournamentParticipants.length < tournament.max_participants;
            const isReady = tournamentParticipants.length === tournament.max_participants;
            
            return (
              <div key={tournament.id} className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-2xl">
                {/* Tournament Header */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-white">{tournament.name}</h2>
                    <div className={`flex items-center rounded-full px-4 py-2 ${
                      isReady ? 'bg-green-500/20' : 'bg-blue-500/20'
                    }`}>
                      <div className={`w-3 h-3 rounded-full mr-2 ${
                        isReady ? 'bg-green-400 animate-pulse' : 'bg-blue-400'
                      }`}></div>
                      <span className={`font-semibold ${
                        isReady ? 'text-green-300' : 'text-blue-300'
                      }`}>
                        {isReady ? 'READY' : 'WAITING'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Prize Pool */}
                  <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl p-6 mb-6">
                    <div className="text-center">
                      <p className="text-yellow-100 text-sm font-medium mb-2">PRIZE POOL</p>
                      <p className="text-3xl font-bold text-white">{tournament.prize_pool} Tokens</p>
                      <p className="text-yellow-100 text-sm mt-2">Winner takes all!</p>
                    </div>
                  </div>
                </div>

                {/* Tournament Info */}
                <div className="mb-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <BanknotesIcon className="w-5 h-5 text-green-400 mr-2" />
                      <span className="text-gray-300">Entry Fee</span>
                    </div>
                    <span className="text-white font-semibold">{tournament.entry_fee} tokens</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <UsersIcon className="w-5 h-5 text-blue-400 mr-2" />
                      <span className="text-gray-300">Participants</span>
                    </div>
                    <span className="text-white font-semibold">{tournamentParticipants.length}/{tournament.max_participants}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <StarIcon className="w-5 h-5 text-purple-400 mr-2" />
                      <span className="text-gray-300">Game Type</span>
                    </div>
                    <span className="text-white font-semibold">{formatGameType(tournament.game_type)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <ClockIcon className="w-5 h-5 text-orange-400 mr-2" />
                      <span className="text-gray-300">Created</span>
                    </div>
                    <span className="text-white font-semibold">
                      {new Date(tournament.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Participants List */}
                {tournamentParticipants.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                      <UsersIcon className="w-5 h-5 mr-2 text-blue-400" />
                      Participants
                    </h3>
                    <div className="space-y-2">
                      {tournamentParticipants.map((participant, index) => (
                        <div key={participant.id} className="flex items-center justify-between bg-white/5 rounded-xl p-3">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                              <span className="text-white font-bold text-sm">{index + 1}</span>
                            </div>
                            <span className="text-white font-medium">Player {participant.user_id.slice(0, 8)}...</span>
                          </div>
                          <div className="text-right">
                            <span className="text-gray-300 text-sm">Rating: {participant.skill_rating}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Join Button */}
                <div className="text-center">
                  {!isAuthenticated ? (
                    <div className="bg-gray-600 rounded-xl p-4">
                      <p className="text-gray-300 mb-2">Please log in to join tournaments</p>
                    </div>
                  ) : isJoined ? (
                    <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-4">
                      <div className="flex items-center justify-center">
                        <CheckCircleIcon className="w-5 h-5 text-green-400 mr-2" />
                        <span className="text-green-300 font-semibold">You're in this tournament!</span>
                      </div>
                    </div>
                  ) : !canJoin ? (
                    <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4">
                      <p className="text-red-300">
                        {userTokens < tournament.entry_fee 
                          ? `You need ${tournament.entry_fee} tokens to join`
                          : 'Tournament is full'
                        }
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={() => joinTournament(tournament)}
                      disabled={joiningTournament === tournament.id}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {joiningTournament === tournament.id ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Joining...
                        </div>
                      ) : (
                        <div className="flex items-center justify-center">
                          <TrophyIcon className="w-5 h-5 mr-2" />
                          JOIN TOURNAMENT - {tournament.entry_fee} TOKENS
                        </div>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* No Tournaments Message */}
        {tournaments.length === 0 && (
          <div className="text-center py-12">
            <TrophyIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No Active Tournaments</h3>
            <p className="text-gray-400 mb-6">Be the first to create a 1v1 tournament!</p>
            {isAuthenticated && (
              <button
                onClick={() => setCreatingTournament(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                <div className="flex items-center">
                  <PlusIcon className="w-5 h-5 mr-2" />
                  Create First Tournament
                </div>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
