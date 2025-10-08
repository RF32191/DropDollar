'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ClockIcon, 
  CurrencyDollarIcon, 
  FireIcon, 
  EyeSlashIcon,
  StarIcon,
  ShieldCheckIcon,
  InformationCircleIcon,
  DevicePhoneMobileIcon,
  PuzzlePieceIcon,
  CursorArrowRaysIcon,
  MusicalNoteIcon
} from '@heroicons/react/24/outline';
import { FireIcon as FireIconSolid } from '@heroicons/react/24/solid';
import type { Listing } from '@/types';
import { calculateTimeRemaining } from '@/data/sampleListings';
import { getAverageRating, getTotalReviews } from '@/data/sampleReviews';
import ReviewSummary from '@/components/reviews/ReviewSummary';
import ListingManagementService from '@/lib/listingManagement';

interface ListingCardProps {
  listing: Listing;
  showCategory?: boolean;
}

const GAME_TYPES = [
  { name: 'Multi-Target Reaction', icon: CursorArrowRaysIcon, color: 'green', difficulty: 'Medium' },
  { name: 'Falling Object Catch', icon: DevicePhoneMobileIcon, color: 'red', difficulty: 'Medium' },
  { name: 'Color Sequence Memory', icon: PuzzlePieceIcon, color: 'purple', difficulty: 'Hard' }
];

export default function ListingCard({ listing, showCategory = true }: ListingCardProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isHot, setIsHot] = useState(false);
  const [listingStatus, setListingStatus] = useState<any>(null);
  
  // Simulate random game assignment (in reality this would be server-side and hidden)
  const [assignedGame] = useState(() => GAME_TYPES[Math.floor(Math.random() * GAME_TYPES.length)]);

  useEffect(() => {
    // Get listing status from ListingManagementService
    const status = ListingManagementService.getListingStatus(listing.id);
    setListingStatus(status);

    if (listing.status === 'timer_active' || status.status === 'timer_active') {
      const updateTimer = () => {
        const updatedStatus = ListingManagementService.getListingStatus(listing.id);
        setListingStatus(updatedStatus);
        
        const remaining = updatedStatus.timeRemaining || calculateTimeRemaining(listing);
        setTimeRemaining(remaining);
        
        // Mark as "hot" if less than 2 hours remaining
        setIsHot(remaining <= 120 && remaining > 0);
      };

      updateTimer();
      const interval = setInterval(updateTimer, 60000); // Update every minute

      return () => clearInterval(interval);
    }
  }, [listing]);

  const formatTimeRemaining = (minutes: number): string => {
    if (minutes <= 0) return 'Ended';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours < 24) return `${hours}h ${remainingMinutes}m`;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  };

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-500 text-white',
      green: 'bg-green-500 text-white',
      purple: 'bg-purple-500 text-white',
      yellow: 'bg-yellow-500 text-white',
      red: 'bg-red-500 text-white'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="listing-card group relative bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-200">
      {/* Hot listing indicator */}
      {isHot && (
        <div className="absolute top-3 left-3 z-10 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center shadow-lg animate-pulse">
          <FireIconSolid className="h-3 w-3 mr-1" />
          🔥 HOT
        </div>
      )}

      {/* Timer status indicator */}
      {listing.status === 'timer_active' && (
        <div className="absolute top-3 right-3 z-10 bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse">
          ⏰ LIVE
        </div>
      )}

      {/* Game Type Badge */}
      <div className="absolute bottom-3 right-3 z-10 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center shadow-lg">
        <PuzzlePieceIcon className="h-3 w-3 mr-1" />
        {listing.gameType?.toUpperCase() || 'SKILL GAME'}
      </div>

      <Link href={`/listings/${listing.id}`} className="block">
        {/* Image */}
        <div className="relative h-48 bg-gray-200 rounded-t-2xl overflow-hidden">
          {listing.images && listing.images.length > 0 ? (
            <div className="relative h-full w-full bg-gray-100 flex items-center justify-center">
              <span className="text-gray-400 text-sm">📱 {listing.title}</span>
            </div>
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-blue-100 to-purple-200 flex items-center justify-center">
              <span className="text-blue-600 text-lg font-bold">🎮 {listing.title}</span>
            </div>
          )}

          {/* Category badge */}
          {showCategory && (
            <div className="absolute top-2 left-2 bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium">
              {listing.category.name}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Title */}
          <h3 className="text-lg font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors line-clamp-2">
            {listing.title}
          </h3>

          {/* Seller info */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="text-sm text-gray-600">
                by <span className="font-medium">{listing.seller.username}</span>
              </div>
              <div className="flex items-center ml-2">
                <StarIcon className="h-3 w-3 text-yellow-400 fill-current" />
                <span className="text-xs text-gray-500 ml-1">{listing.seller.rating}</span>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              {listing.condition}
            </div>
          </div>

          {/* Product Reviews */}
          <div className="mb-4">
            <ReviewSummary 
              averageRating={getAverageRating(listing.id)}
              totalReviews={getTotalReviews(listing.id)}
              compact={true}
            />
          </div>

          {/* Base Price & Progress */}
          <div className="bg-blue-50 rounded-xl p-4 mb-4 border border-blue-200">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <CurrencyDollarIcon className="h-5 w-5 text-blue-600 mr-2" />
                <span className="text-sm font-medium text-blue-800">Base Price Threshold</span>
              </div>
              <div className="text-3xl font-bold text-blue-900">
                ${listing.basePrice.toLocaleString()}
              </div>
              <div className="text-xs text-blue-700 mt-1">
                {listingStatus?.basePriceMet ? 'Threshold met - Timer active!' : 'Minimum needed to start timer'}
              </div>
              
              {/* Progress Bar */}
              {listingStatus && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-blue-600">Progress</span>
                    <span className="text-blue-900 font-medium">
                      ${listingStatus.totalCoinsCollected || 0} / ${listing.basePrice}
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        listingStatus.basePriceMet ? 'bg-green-500' : 'bg-blue-500'
                      }`}
                      style={{ 
                        width: `${Math.min(100, listingStatus.progressPercentage || 0)}%` 
                      }}
                    ></div>
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    {listingStatus.basePriceMet ? '✅ Ready for competition!' : `${Math.round(listingStatus.progressPercentage || 0)}% to timer start`}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Game Entry Cost */}
          <div className="bg-green-50 rounded-xl p-4 mb-4 border border-green-200">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <DevicePhoneMobileIcon className="h-5 w-5 text-green-600 mr-2" />
                <span className="text-sm font-medium text-green-800">Game Entry</span>
              </div>
              <div className="text-2xl font-bold text-green-900">
                $1-$3
              </div>
              <div className="text-xs text-green-700 mt-1">
                Up to 3 entries per person
              </div>
            </div>
          </div>

          {/* Gaming Rules */}
          <div className="bg-yellow-50 rounded-xl p-3 mb-4 border border-yellow-200">
            <div className="flex items-center justify-center mb-2">
              <InformationCircleIcon className="h-4 w-4 text-yellow-600 mr-2" />
              <span className="text-xs font-medium text-yellow-800">Daily Gaming Rules</span>
            </div>
            <div className="space-y-1 text-xs text-yellow-700">
              <div className="flex justify-between">
                <span>Max entries per listing:</span>
                <span className="font-bold">3 ($1 each)</span>
              </div>
              <div className="flex justify-between">
                <span>Max wins per day:</span>
                <span className="font-bold">3 total</span>
              </div>
              <div className="flex justify-between">
                <span>Max listings per day:</span>
                <span className="font-bold">10 total</span>
              </div>
              <div className="text-center mt-2 pt-2 border-t border-yellow-200">
                <span className="font-medium">Your best score across all attempts wins!</span>
              </div>
            </div>
          </div>

          {/* Skill Game System Notice */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 mb-4 border border-purple-200">
            <div className="flex items-center justify-center mb-2">
              <PuzzlePieceIcon className="h-4 w-4 text-purple-600 mr-2" />
              <span className="text-sm font-medium text-purple-800">Skill Gaming System</span>
            </div>
            <div className="text-center">
              <div className="grid grid-cols-2 gap-3 text-xs text-purple-700">
                <div className="flex items-center">
                  <span className="text-red-500 mr-1">❓</span>
                  <span>Game type hidden</span>
                </div>
                <div className="flex items-center">
                  <span className="text-red-500 mr-1">❓</span>
                  <span>Player count hidden</span>
                </div>
                <div className="flex items-center">
                  <span className="text-red-500 mr-1">❓</span>
                  <span>Scores hidden</span>
                </div>
                <div className="flex items-center">
                  <span className="text-red-500 mr-1">❓</span>
                  <span>Competition hidden</span>
                </div>
              </div>
            </div>
          </div>

          {/* Timer Status */}
          {listing.status === 'timer_active' ? (
            <div className="bg-red-50 rounded-xl p-4 mb-4 border border-red-200">
              <div className="flex items-center justify-center mb-2">
                <ClockIcon className="h-5 w-5 text-red-600 mr-2 animate-pulse" />
                <span className="font-bold text-red-800">🎮 GAME STARTING SOON</span>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600 countdown-timer">
                  {formatTimeRemaining(timeRemaining)}
                </div>
                <div className="text-sm text-red-700">until games begin</div>
              </div>
              <div className="mt-2 text-center">
                <Link 
                  href="/hot-sell" 
                  className="inline-flex items-center text-xs text-red-600 hover:text-red-800 font-medium"
                >
                  🔥 View Live Competitions
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-green-50 rounded-xl p-4 mb-4 border border-green-200">
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <ClockIcon className="h-4 w-4 text-green-600 mr-2" />
                  <span className="text-sm text-green-800 font-medium">Game Duration</span>
                </div>
                <div className="text-lg font-bold text-green-600">
                  {listing.timerDuration >= 60 
                    ? `${Math.floor(listing.timerDuration / 60)} hours`
                    : `${listing.timerDuration} minutes`
                  }
                </div>
                <div className="text-xs text-green-700">when base price is reached</div>
              </div>
            </div>
          )}

          {/* Entry Limit Notice */}
          <div className="bg-yellow-50 rounded-xl p-3 mb-4 border border-yellow-200">
            <div className="flex items-center justify-center">
              <InformationCircleIcon className="h-4 w-4 text-yellow-600 mr-2" />
              <span className="text-sm text-yellow-800">
                <strong>One entry per person</strong> • Skill determines winner
              </span>
            </div>
          </div>

          {/* Action button */}
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-3">
              🎮 Enter to compete in skill-based game!
            </div>
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-3 rounded-xl font-bold text-sm group-hover:from-purple-700 group-hover:to-pink-700 transition-all shadow-lg">
              🎯 Enter Game Competition ($1)
            </div>
          </div>

          {/* Fair play guarantee */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-center">
              <ShieldCheckIcon className="h-4 w-4 text-green-500 mr-2" />
              <span className="text-xs text-gray-600">
                Skill-based • Bot-proof • Fair competition
              </span>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}