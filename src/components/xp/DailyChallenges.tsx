'use client';

import React, { useState, useEffect } from 'react';
import { XPService, DailyChallenge, WeeklyChallenge } from '@/lib/supabase/xpService';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircleIcon, ClockIcon, FireIcon, TrophyIcon, CalendarIcon, SparklesIcon } from '@heroicons/react/24/solid';
import { SparklesIcon as SparklesOutline } from '@heroicons/react/24/outline';

export default function DailyChallenges() {
  const { user } = useAuth();
  const [dailyChallenges, setDailyChallenges] = useState<DailyChallenge[]>([]);
  const [weeklyChallenges, setWeeklyChallenges] = useState<WeeklyChallenge[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadChallenges();
    }
  }, [user]);

  const loadChallenges = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const [daily, weekly] = await Promise.all([
        XPService.getDailyChallenges(user.id),
        XPService.getWeeklyChallenges(user.id)
      ]);
      setDailyChallenges(daily);
      setWeeklyChallenges(weekly);
    } catch (error) {
      console.error('Error loading challenges:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getChallengeIcon = (type: string) => {
    switch (type) {
      case 'play_practice':
        return <ClockIcon className="w-6 h-6 text-blue-400" />;
      case 'play_competition':
        return <TrophyIcon className="w-6 h-6 text-yellow-400" />;
      case 'score_threshold':
        return <FireIcon className="w-6 h-6 text-orange-400" />;
      case 'games_count':
        return <SparklesIcon className="w-6 h-6 text-purple-400" />;
      case 'total_xp':
        return <SparklesOutline className="w-6 h-6 text-green-400" />;
      case 'level_up':
        return <TrophyIcon className="w-6 h-6 text-pink-400" />;
      default:
        return <TrophyIcon className="w-6 h-6 text-gray-400" />;
    }
  };

  const getChallengeColor = (type: string) => {
    switch (type) {
      case 'play_practice':
        return 'from-blue-500/20 to-blue-600/20 border-blue-500/30';
      case 'play_competition':
        return 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/30';
      case 'score_threshold':
        return 'from-orange-500/20 to-orange-600/20 border-orange-500/30';
      case 'games_count':
        return 'from-purple-500/20 to-purple-600/20 border-purple-500/30';
      case 'total_xp':
        return 'from-green-500/20 to-green-600/20 border-green-500/30';
      case 'level_up':
        return 'from-pink-500/20 to-pink-600/20 border-pink-500/30';
      default:
        return 'from-gray-500/20 to-gray-600/20 border-gray-500/30';
    }
  };

  const renderChallenge = (challenge: DailyChallenge | WeeklyChallenge, isWeekly: boolean = false) => {
    const progressPercent = (challenge.progress / challenge.target_value) * 100;
    const isCompleted = challenge.is_completed;
    
    return (
      <div
        key={challenge.challenge_id}
        className={`bg-gradient-to-r ${getChallengeColor(challenge.challenge_type)} rounded-lg p-4 border transition-all ${
          isCompleted ? 'opacity-75' : ''
        }`}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-start gap-3 flex-1">
            <div className="mt-1">
              {getChallengeIcon(challenge.challenge_type)}
            </div>
            <div className="flex-1">
              <h4 className={`font-bold text-white mb-1 ${isCompleted ? 'line-through' : ''}`}>
                {challenge.challenge_name}
              </h4>
              <p className="text-sm text-gray-300">
                {challenge.challenge_description}
              </p>
            </div>
          </div>
          {isCompleted && (
            <CheckCircleIcon className="w-6 h-6 text-green-400 flex-shrink-0" />
          )}
        </div>

        {/* Progress Bar */}
        <div className="mb-2">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-400">
              {challenge.progress} / {challenge.target_value}
            </span>
            {!isCompleted && (
              <span className="text-xs text-yellow-400 font-semibold">
                +{challenge.xp_reward} XP • {challenge.reward_points} RP
              </span>
            )}
            {isCompleted && (
              <span className="text-xs text-green-400 font-semibold">
                Completed!
              </span>
            )}
          </div>
          <div className="bg-gray-800/50 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                isCompleted ? 'bg-green-500' : isWeekly ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-gradient-to-r from-blue-500 to-purple-500'
              }`}
              style={{ width: `${Math.min(100, progressPercent)}%` }}
            />
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 rounded-xl p-6 border border-gray-700/50">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-700/50 rounded w-1/3"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-700/30 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Daily Challenges */}
      <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 rounded-xl p-6 border border-gray-700/50">
        <h3 className="text-xl font-black text-white mb-4 flex items-center gap-2">
          <ClockIcon className="w-6 h-6 text-blue-400" />
          Daily Challenges
          <span className="text-sm font-normal text-gray-400 ml-2">(Resets Daily)</span>
        </h3>
        
        {dailyChallenges.length === 0 ? (
          <p className="text-gray-400">No daily challenges available. They will be generated automatically!</p>
        ) : (
          <div className="space-y-3">
            {dailyChallenges.map((challenge) => renderChallenge(challenge, false))}
          </div>
        )}
      </div>

      {/* Weekly Challenges */}
      <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 rounded-xl p-6 border border-gray-700/50">
        <h3 className="text-xl font-black text-white mb-4 flex items-center gap-2">
          <CalendarIcon className="w-6 h-6 text-purple-400" />
          Weekly Challenges
          <span className="text-sm font-normal text-gray-400 ml-2">(Resets Weekly)</span>
        </h3>
        
        {weeklyChallenges.length === 0 ? (
          <p className="text-gray-400">No weekly challenges available. They will be generated automatically!</p>
        ) : (
          <div className="space-y-3">
            {weeklyChallenges.map((challenge) => renderChallenge(challenge, true))}
          </div>
        )}
      </div>
    </div>
  );
}
