'use client';

import React from 'react';
import { useRateLimits } from '@/hooks/useRateLimits';
import { 
  ShieldCheckIcon, 
  ClockIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon 
} from '@heroicons/react/24/outline';

interface RateLimitDisplayProps {
  className?: string;
}

export default function RateLimitDisplay({ className = '' }: RateLimitDisplayProps) {
  const rateLimits = useRateLimits();

  if (rateLimits.isLoading) {
    return (
      <div className={`bg-gray-800 border border-gray-700 rounded-lg p-4 ${className}`}>
        <div className="animate-pulse flex items-center space-x-3">
          <div className="h-4 w-4 bg-gray-700 rounded"></div>
          <div className="h-4 flex-1 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  const getStatusColor = () => {
    if (rateLimits.isBlocked) return 'from-red-600 to-red-700';
    if (rateLimits.gamesLastHour >= rateLimits.hourlyLimit * 0.8 || 
        rateLimits.gamesLastDay >= rateLimits.dailyLimit * 0.8) {
      return 'from-yellow-600 to-orange-600';
    }
    return 'from-green-600 to-emerald-600';
  };

  const getStatusIcon = () => {
    if (rateLimits.isBlocked) {
      return <ExclamationTriangleIcon className="h-5 w-5 text-white" />;
    }
    if (rateLimits.gamesLastHour >= rateLimits.hourlyLimit * 0.8 || 
        rateLimits.gamesLastDay >= rateLimits.dailyLimit * 0.8) {
      return <ClockIcon className="h-5 w-5 text-white" />;
    }
    return <CheckCircleIcon className="h-5 w-5 text-white" />;
  };

  const formatTimeUntilReset = (resetDate: Date | null) => {
    if (!resetDate) return 'N/A';
    
    const now = new Date();
    const diff = resetDate.getTime() - now.getTime();
    
    if (diff <= 0) return 'Now';
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className={`bg-gradient-to-r ${getStatusColor()} rounded-lg shadow-lg border-2 border-opacity-30 ${className}`}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              {getStatusIcon()}
            </div>
            <h3 className="text-white font-bold text-lg">Game Limits</h3>
          </div>
          <div className="flex items-center space-x-1">
            <ShieldCheckIcon className="h-4 w-4 text-white/80" />
            <span className="text-xs text-white/80 font-medium">Fair Play Protection</span>
          </div>
        </div>

        {/* Blocked Status */}
        {rateLimits.isBlocked && (
          <div className="bg-white/10 rounded-lg p-3 mb-3 border border-white/20">
            <p className="text-white font-semibold text-sm mb-1">
              🚫 Rate Limit Reached
            </p>
            <p className="text-white/90 text-xs">
              You've reached your gaming limit. Please wait for the reset timer below.
            </p>
          </div>
        )}

        {/* Hourly Limit */}
        <div className="bg-white/10 rounded-lg p-3 mb-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white text-sm font-medium">Hourly Limit</span>
            <span className={`text-sm font-bold ${
              rateLimits.isHourlyLimitReached ? 'text-red-200' : 
              rateLimits.gamesLastHour >= rateLimits.hourlyLimit * 0.8 ? 'text-yellow-200' : 
              'text-green-200'
            }`}>
              {rateLimits.gamesLastHour} / {rateLimits.hourlyLimit}
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-white/20 rounded-full h-2 mb-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                rateLimits.isHourlyLimitReached ? 'bg-red-400' :
                rateLimits.gamesLastHour >= rateLimits.hourlyLimit * 0.8 ? 'bg-yellow-400' :
                'bg-green-400'
              }`}
              style={{ width: `${Math.min((rateLimits.gamesLastHour / rateLimits.hourlyLimit) * 100, 100)}%` }}
            />
          </div>
          
          {rateLimits.isHourlyLimitReached && (
            <div className="flex items-center justify-between text-xs text-white/90">
              <span>⏰ Resets in:</span>
              <span className="font-bold">{formatTimeUntilReset(rateLimits.nextHourlyReset)}</span>
            </div>
          )}
        </div>

        {/* Daily Limit */}
        <div className="bg-white/10 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white text-sm font-medium">Daily Limit</span>
            <span className={`text-sm font-bold ${
              rateLimits.isDailyLimitReached ? 'text-red-200' : 
              rateLimits.gamesLastDay >= rateLimits.dailyLimit * 0.8 ? 'text-yellow-200' : 
              'text-green-200'
            }`}>
              {rateLimits.gamesLastDay} / {rateLimits.dailyLimit}
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-white/20 rounded-full h-2 mb-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                rateLimits.isDailyLimitReached ? 'bg-red-400' :
                rateLimits.gamesLastDay >= rateLimits.dailyLimit * 0.8 ? 'bg-yellow-400' :
                'bg-green-400'
              }`}
              style={{ width: `${Math.min((rateLimits.gamesLastDay / rateLimits.dailyLimit) * 100, 100)}%` }}
            />
          </div>
          
          {rateLimits.isDailyLimitReached && (
            <div className="flex items-center justify-between text-xs text-white/90">
              <span>⏰ Resets in:</span>
              <span className="font-bold">{formatTimeUntilReset(rateLimits.nextDailyReset)}</span>
            </div>
          )}
        </div>

        {/* Info Footer */}
        <div className="mt-3 pt-3 border-t border-white/20">
          <p className="text-xs text-white/80 text-center">
            🛡️ Rate limits prevent bot abuse and ensure fair play for all users
          </p>
        </div>
      </div>
    </div>
  );
}

