'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserService } from '@/lib/supabase/userService';
import TournamentService from '@/lib/supabase/tournamentService';
import { useRouter } from 'next/navigation';
import { TrophyIcon, BoltIcon, UsersIcon } from '@heroicons/react/24/outline';

interface LiveTournamentEntryProps {
  tournament: {
    id: string;
    name: string;
    prize_pool: number;
    entry_fee: number;
    game_type: string;
    max_players: number;
    current_players: number;
    status: 'open' | 'in_progress' | 'completed';
  };
  onEntryComplete?: () => void;
}

export default function LiveTournamentEntry({ tournament, onEntryComplete }: LiveTournamentEntryProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [isEntering, setIsEntering] = useState(false);
  const [userTokens, setUserTokens] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadUserTokens();
  }, [user]);

  const loadUserTokens = async () => {
    if (!user?.id) return;
    
    try {
      const profile = await UserService.getUserProfile(user.id);
      setUserTokens(profile?.tokens || 0);
    } catch (err) {
      console.error('Error loading tokens:', err);
    }
  };

  const handleEntry = async () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    if (userTokens < tournament.entry_fee) {
      setError(`Insufficient tokens! You need ${tournament.entry_fee} tokens but only have ${userTokens}.`);
      setTimeout(() => router.push('/buy-tokens'), 2000);
      return;
    }

    setIsEntering(true);
    setError(null);

    try {
      console.log('🎮 [LiveEntry] Entering tournament:', tournament.id);

      // Deduct tokens
      const newBalance = userTokens - tournament.entry_fee;
      await UserService.updateUserTokens(user.id, newBalance);

      // Record transaction
      await UserService.addTokenTransaction({
        user_id: user.id,
        amount: -tournament.entry_fee,
        type: 'tournament_entry',
        description: `Entered ${tournament.name}`,
        balance_before: userTokens,
        balance_after: newBalance,
        metadata: {
          tournament_id: tournament.id,
          tournament_name: tournament.name,
          entry_fee: tournament.entry_fee
        }
      });

      // Create tournament entry
      const entry = await TournamentService.enterTournament(
        tournament.id,
        user.id,
        user.username || user.email || 'Anonymous',
        tournament.entry_fee
      );

      if (entry) {
        console.log('✅ [LiveEntry] Entry successful:', entry.id);
        setSuccess(true);
        setUserTokens(newBalance);

        // Navigate to game with entry info
        setTimeout(() => {
          router.push(`/play/${tournament.game_type}?tournamentId=${tournament.id}&entryId=${entry.id}`);
        }, 1500);

        if (onEntryComplete) {
          onEntryComplete();
        }
      } else {
        throw new Error('Failed to create tournament entry');
      }
    } catch (err: any) {
      console.error('❌ [LiveEntry] Entry failed:', err);
      setError(err.message || 'Failed to enter tournament. Please try again.');
    } finally {
      setIsEntering(false);
    }
  };

  const canAffordEntry = userTokens >= tournament.entry_fee;
  const isFull = tournament.current_players >= tournament.max_players;
  const isClosed = tournament.status !== 'open';

  return (
    <div className="space-y-4">
      {/* Token Balance */}
      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-300">Your Tokens:</span>
          <span className="text-lg font-bold text-yellow-400">{userTokens}</span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-sm text-gray-300">Entry Fee:</span>
          <span className="text-lg font-bold text-white">{tournament.entry_fee}</span>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="bg-red-500/20 border border-red-500 rounded-lg p-3">
          <p className="text-red-200 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-500/20 border border-green-500 rounded-lg p-3">
          <p className="text-green-200 text-sm">✅ Entry successful! Launching game...</p>
        </div>
      )}

      {/* Entry Button */}
      {!success && (
        <button
          onClick={handleEntry}
          disabled={isEntering || !canAffordEntry || isFull || isClosed}
          className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 ${
            isClosed
              ? 'bg-gray-600 cursor-not-allowed text-gray-400'
              : isFull
              ? 'bg-orange-600 cursor-not-allowed text-orange-200'
              : !canAffordEntry
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : isEntering
              ? 'bg-blue-500 cursor-wait text-white'
              : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white shadow-lg hover:scale-105'
          }`}
        >
          {isClosed ? (
            '🔒 Tournament Closed'
          ) : isFull ? (
            '👥 Tournament Full'
          ) : !canAffordEntry ? (
            `💰 Need ${tournament.entry_fee - userTokens} More Tokens`
          ) : isEntering ? (
            '⏳ Entering...'
          ) : (
            `🎮 Enter Tournament - ${tournament.entry_fee} Tokens`
          )}
        </button>
      )}

      {/* Quick Actions */}
      {!canAffordEntry && !success && (
        <button
          onClick={() => router.push('/buy-tokens')}
          className="w-full py-2 px-4 rounded-lg bg-yellow-600 hover:bg-yellow-700 text-white font-medium text-sm transition-all"
        >
          💳 Buy More Tokens
        </button>
      )}
    </div>
  );
}

