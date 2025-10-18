'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { BlindScoreboardService, BlindListing, BlindMatch, ScoreboardEntry } from '@/lib/supabase/blindScoreboardService';
import { 
  TrophyIcon, 
  ClockIcon, 
  UserIcon, 
  LockClosedIcon,
  EyeIcon,
  PlayIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface BlindScoreboardProps {
  listing: BlindListing;
  onGameStart?: (matchId: string) => void;
  onScoreSubmit?: (matchId: string, score: number) => void;
}

export default function BlindScoreboard({ listing, onGameStart, onScoreSubmit }: BlindScoreboardProps) {
  const { user, isAuthenticated } = useAuth();
  const [userBalance, setUserBalance] = useState<number>(0);
  const [userMatches, setUserMatches] = useState<BlindMatch[]>([]);
  const [activeMatch, setActiveMatch] = useState<BlindMatch | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [scoreboard, setScoreboard] = useState<ScoreboardEntry[]>([]);
  const [hasSubmittedScore, setHasSubmittedScore] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadUserData();
    }
  }, [isAuthenticated, user]);

  const loadUserData = async () => {
    try {
      setIsLoading(true);
      
      // Load user balance
      const balance = await BlindScoreboardService.getUserBalance(user!.id);
      setUserBalance(balance);
      
      // Load user's active matches for this listing
      const activeMatches = await BlindScoreboardService.getUserActiveMatches(user!.id);
      const listingMatches = activeMatches.filter(match => match.listing_id === listing.id);
      setUserMatches(listingMatches);
      
      if (listingMatches.length > 0) {
        const match = listingMatches[0];
        setActiveMatch(match);
        
        // Load participants
        const matchParticipants = await BlindScoreboardService.getMatchParticipants(match.id);
        setParticipants(matchParticipants);
        
        // Check if user has submitted score
        const submitted = await BlindScoreboardService.hasUserSubmittedScore(match.id, user!.id);
        setHasSubmittedScore(submitted);
        
        // If match is completed, load scoreboard
        if (match.state === 'COMPLETED' && match.scores_visible) {
          const scoreboardResult = await BlindScoreboardService.getScoreboard(match.id);
          if (scoreboardResult.scoreboard) {
            setScoreboard(scoreboardResult.scoreboard);
          }
        }
      }
      
    } catch (error) {
      console.error('❌ [BlindScoreboard] Error loading user data:', error);
      setMessage({ type: 'error', text: 'Failed to load match data' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinListing = async () => {
    if (!user || !isAuthenticated) {
      setMessage({ type: 'error', text: 'Please log in to join' });
      return;
    }

    if (userBalance < listing.entry_cost_tokens) {
      setMessage({ type: 'error', text: `You need ${listing.entry_cost_tokens} tokens to join` });
      return;
    }

    try {
      setIsLoading(true);
      
      const result = await BlindScoreboardService.joinListing(listing.id, user.id);
      
      if (result.error) {
        setMessage({ type: 'error', text: result.error });
        return;
      }
      
      if (result.status === 'FILLED' && result.matchId) {
        setMessage({ type: 'success', text: 'Match filled! Game starting...' });
        
        // Reload data to get the new match
        await loadUserData();
        
        // Notify parent component
        if (onGameStart) {
          onGameStart(result.matchId);
        }
      } else {
        setMessage({ type: 'info', text: `Joined! ${result.joinedCount}/${listing.required_players} players` });
        await loadUserData();
      }
      
    } catch (error) {
      console.error('❌ [BlindScoreboard] Error joining listing:', error);
      setMessage({ type: 'error', text: 'Failed to join listing' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitScore = async (score: number) => {
    if (!user || !activeMatch) return;

    try {
      setIsLoading(true);
      
      const result = await BlindScoreboardService.submitScore(activeMatch.id, user.id, score);
      
      if (result.error) {
        setMessage({ type: 'error', text: result.error });
        return;
      }
      
      setMessage({ type: 'success', text: 'Score submitted successfully!' });
      setHasSubmittedScore(true);
      
      // If ready to finalize, do it
      if (result.status === 'SUBMITTED_AND_READY_TO_FINALIZE') {
        const finalizeResult = await BlindScoreboardService.finalizeMatch(activeMatch.id);
        
        if (finalizeResult.status === 'COMPLETED') {
          setMessage({ type: 'success', text: `Match completed! Winners: ${finalizeResult.winners?.length || 0}` });
          
          // Reload data to get final results
          await loadUserData();
        }
      }
      
      // Notify parent component
      if (onScoreSubmit) {
        onScoreSubmit(activeMatch.id, score);
      }
      
    } catch (error) {
      console.error('❌ [BlindScoreboard] Error submitting score:', error);
      setMessage({ type: 'error', text: 'Failed to submit score' });
    } finally {
      setIsLoading(false);
    }
  };

  const getGameIcon = (gameKey: string) => {
    switch (gameKey) {
      case 'laser_dodge': return '🚀';
      case 'multi_target_reaction': return '🎯';
      case 'sword_parry': return '⚔️';
      case 'quick_click': return '⚡';
      case 'memory_color': return '🧠';
      default: return '🎮';
    }
  };

  const getStatusColor = (state: string) => {
    switch (state) {
      case 'OPEN': return 'text-green-400';
      case 'FILLED': return 'text-blue-400';
      case 'IN_PROGRESS': return 'text-yellow-400';
      case 'COMPLETED': return 'text-purple-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (state: string) => {
    switch (state) {
      case 'OPEN': return <ClockIcon className="w-4 h-4" />;
      case 'FILLED': return <UserIcon className="w-4 h-4" />;
      case 'IN_PROGRESS': return <PlayIcon className="w-4 h-4" />;
      case 'COMPLETED': return <CheckCircleIcon className="w-4 h-4" />;
      default: return <ExclamationTriangleIcon className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          <span className="ml-3 text-white">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <span className="text-2xl mr-3">{getGameIcon(listing.game_key)}</span>
          <div>
            <h3 className="text-lg font-bold text-white">{listing.title}</h3>
            <p className="text-sm text-gray-300">{listing.game_key.replace('_', ' ')}</p>
          </div>
        </div>
        <div className={`flex items-center ${getStatusColor(listing.state)}`}>
          {getStatusIcon(listing.state)}
          <span className="ml-2 text-sm font-medium">{listing.state}</span>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-4 p-3 rounded-lg ${
          message.type === 'success' ? 'bg-green-500/20 border border-green-500/50 text-green-300' :
          message.type === 'error' ? 'bg-red-500/20 border border-red-500/50 text-red-300' :
          'bg-blue-500/20 border border-blue-500/50 text-blue-300'
        }`}>
          {message.text}
        </div>
      )}

      {/* Entry Info */}
      <div className="mb-4 p-3 bg-white/5 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-gray-300">Entry Cost:</span>
          <span className="text-white font-semibold">{listing.entry_cost_tokens} tokens</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-300">Players Required:</span>
          <span className="text-white font-semibold">{listing.required_players}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-300">Your Balance:</span>
          <span className="text-white font-semibold">{userBalance} tokens</span>
        </div>
      </div>

      {/* Active Match */}
      {activeMatch && (
        <div className="mb-4 p-3 bg-white/5 rounded-lg">
          <h4 className="text-white font-semibold mb-2">Active Match</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-300">Status:</span>
              <span className={`font-semibold ${getStatusColor(activeMatch.state)}`}>
                {activeMatch.state}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Participants:</span>
              <span className="text-white font-semibold">{participants.length}/{activeMatch.required_players}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Score Submitted:</span>
              <span className={`font-semibold ${hasSubmittedScore ? 'text-green-400' : 'text-red-400'}`}>
                {hasSubmittedScore ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Scoreboard */}
      {scoreboard.length > 0 && (
        <div className="mb-4 p-3 bg-white/5 rounded-lg">
          <h4 className="text-white font-semibold mb-2 flex items-center">
            <TrophyIcon className="w-4 h-4 mr-2 text-yellow-400" />
            Final Results
          </h4>
          <div className="space-y-2">
            {scoreboard.map((entry, index) => (
              <div key={entry.user_id} className={`flex justify-between items-center p-2 rounded ${
                entry.is_winner ? 'bg-yellow-500/20 border border-yellow-500/50' : 'bg-white/5'
              }`}>
                <div className="flex items-center">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 ${
                    entry.is_winner ? 'bg-yellow-500' : 'bg-gray-500'
                  }`}>
                    <span className="text-white font-bold text-xs">{index + 1}</span>
                  </div>
                  <span className="text-white text-sm">
                    {entry.user_id === user?.id ? 'You' : `Player ${entry.user_id.slice(-4)}`}
                  </span>
                </div>
                <span className={`font-bold ${entry.is_winner ? 'text-yellow-400' : 'text-white'}`}>
                  {entry.score}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Blind Scoreboard Notice */}
      {activeMatch && activeMatch.state === 'IN_PROGRESS' && !activeMatch.scores_visible && (
        <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
          <div className="flex items-center">
            <LockClosedIcon className="w-4 h-4 mr-2 text-yellow-400" />
            <span className="text-yellow-300 text-sm font-medium">
              Blind Scoring: Scores are hidden until all players submit
            </span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2">
        {!activeMatch && listing.state === 'OPEN' && (
          <button
            onClick={handleJoinListing}
            disabled={isLoading || !isAuthenticated || userBalance < listing.entry_cost_tokens}
            className={`w-full py-2 px-4 rounded-lg font-semibold transition-all ${
              userBalance >= listing.entry_cost_tokens && isAuthenticated
                ? 'bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-500 hover:to-blue-500 text-white'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isLoading ? 'Joining...' : `Join for ${listing.entry_cost_tokens} tokens`}
          </button>
        )}

        {activeMatch && activeMatch.state === 'IN_PROGRESS' && !hasSubmittedScore && (
          <div className="text-center text-gray-300 text-sm">
            <EyeIcon className="w-4 h-4 mx-auto mb-2" />
            <p>Play the game to submit your score</p>
            <p className="text-xs mt-1">Score will be hidden until all players finish</p>
          </div>
        )}

        {hasSubmittedScore && activeMatch?.state === 'IN_PROGRESS' && (
          <div className="text-center text-green-300 text-sm">
            <CheckCircleIcon className="w-4 h-4 mx-auto mb-2" />
            <p>Score submitted! Waiting for other players...</p>
          </div>
        )}
      </div>
    </div>
  );
}
