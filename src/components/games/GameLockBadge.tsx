'use client';

import React from 'react';
import { LockClosedIcon, TrophyIcon, ClockIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';

interface GameLockBadgeProps {
  isLocked: boolean;
  gameType: string;
  wonOn?: string;
  daysUntilUnlock?: number;
  competitionType?: string;
  compact?: boolean;
}

export function GameLockBadge({
  isLocked,
  gameType,
  wonOn,
  daysUntilUnlock,
  competitionType,
  compact = false
}: GameLockBadgeProps) {
  if (!isLocked) return null;

  if (compact) {
    return (
      <div className="absolute top-2 right-2 z-10">
        <div className="bg-yellow-500/90 backdrop-blur-sm text-black px-2 py-1 rounded-lg flex items-center gap-1 text-xs font-bold shadow-lg">
          <LockClosedIcon className="w-3 h-3" />
          <span>WON</span>
        </div>
      </div>
    );
  }

  const formattedDate = wonOn 
    ? new Date(wonOn).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;

  return (
    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl">
      <div className="text-center p-4">
        <div className="w-16 h-16 mx-auto mb-3 bg-yellow-500/20 rounded-full flex items-center justify-center">
          <TrophyIcon className="w-8 h-8 text-yellow-400" />
        </div>
        
        <div className="text-yellow-400 font-bold text-lg mb-1">
          🏆 Already Won!
        </div>
        
        <p className="text-gray-400 text-sm mb-3">
          You won this game type{formattedDate ? ` on ${formattedDate}` : ''}.
        </p>
        
        <div className="flex items-center justify-center gap-2 text-gray-300 text-sm mb-4">
          <ClockIcon className="w-4 h-4 text-cyan-400" />
          <span>
            Unlocks in <strong className="text-cyan-400">{daysUntilUnlock}</strong> day{daysUntilUnlock !== 1 ? 's' : ''}
          </span>
        </div>
        
        <div className="flex flex-col gap-2">
          <Link
            href="/games"
            className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white rounded-lg font-medium text-sm transition-all"
          >
            Practice This Game
          </Link>
          
          <Link
            href="/responsible-gaming"
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Learn about win limits
          </Link>
        </div>
      </div>
    </div>
  );
}

// Component to show locked games overview in dashboard
export function LockedGamesOverview({
  lockedGames,
  daysUntilReset
}: {
  lockedGames: { game_type: string; won_on: string; competition_type: string }[];
  daysUntilReset: number;
}) {
  if (lockedGames.length === 0) {
    return (
      <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-500/20 rounded-lg">
            <TrophyIcon className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <div className="font-bold text-green-400">All Games Available</div>
            <div className="text-sm text-gray-400">
              You haven't won any competitive games this month yet.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-yellow-500/20 rounded-lg">
            <LockClosedIcon className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <div className="font-bold text-yellow-400">Monthly Win Limits</div>
            <div className="text-sm text-gray-400">
              {lockedGames.length} game type{lockedGames.length !== 1 ? 's' : ''} locked
            </div>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-xs text-gray-500">Resets in</div>
          <div className="text-cyan-400 font-bold">{daysUntilReset} days</div>
        </div>
      </div>
      
      <div className="space-y-2">
        {lockedGames.map((game) => (
          <div 
            key={game.game_type}
            className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2"
          >
            <div className="flex items-center gap-2">
              <TrophyIcon className="w-4 h-4 text-yellow-400" />
              <span className="text-white font-medium capitalize">
                {game.game_type.replace(/-/g, ' ')}
              </span>
            </div>
            <div className="text-xs text-gray-500">
              Won {new Date(game.won_on).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-3 text-xs text-gray-500 text-center">
        <Link href="/responsible-gaming" className="text-cyan-400 hover:underline">
          Learn about win limits
        </Link>
        {' '}• 1v1 mode is always available
      </div>
    </div>
  );
}

export default GameLockBadge;

