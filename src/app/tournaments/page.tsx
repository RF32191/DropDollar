'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  TrophyIcon,
  ClockIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  FireIcon,
  CalendarIcon,
  StarIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface Tournament {
  id: string;
  name: string;
  description: string;
  game: string;
  entryFee: number;
  prizePool: number; // Total collected amount
  platformFee: number; // 15% platform fee
  finalPrizePool: number; // After 15% deduction
  maxParticipants: number;
  currentParticipants: number;
  startTime: string;
  duration: string;
  status: 'upcoming' | 'active' | 'completed';
  difficulty: 'Beginner' | 'Intermediate' | 'Expert';
  type: 'Daily' | 'Weekly' | 'Monthly' | 'Special';
}

const MOCK_TOURNAMENTS: Tournament[] = [
  {
    id: 'daily-simon-1',
    name: 'Daily Simon Says Sprint',
    description: 'Fast-paced Simon Says competition with rapid-fire commands',
    game: 'Simon Says Reflex',
    entryFee: 5,
    prizePool: 500,
    platformFee: 75, // 15% of 500
    finalPrizePool: 425, // 500 - 75
    maxParticipants: 100,
    currentParticipants: 87,
    startTime: '2024-01-15T18:00:00Z',
    duration: '2 hours',
    status: 'upcoming',
    difficulty: 'Intermediate',
    type: 'Daily'
  },
  {
    id: 'elite-championship-1',
    name: 'Elite Championship - $25,000 Prize',
    description: 'Ultimate skill-based gaming championship with massive prize pool',
    game: 'Mystery Game Assignment',
    entryFee: 3,
    prizePool: 25000,
    platformFee: 3750, // 15% of 25000
    finalPrizePool: 21250, // 25000 - 3750
    maxParticipants: 2,
    currentParticipants: 0,
    startTime: '2024-01-15T20:00:00Z',
    duration: '24 hours',
    status: 'upcoming',
    difficulty: 'Expert',
    type: 'Daily'
  },
  {
    id: 'weekly-memory-1',
    name: 'Memory Masters Championship',
    description: 'Ultimate pattern memory challenge for the most skilled players',
    game: 'Pattern Memory Challenge',
    entryFee: 10,
    prizePool: 2000,
    platformFee: 300, // 15% of 2000
    finalPrizePool: 1700, // 2000 - 300
    maxParticipants: 200,
    currentParticipants: 156,
    startTime: '2024-01-20T20:00:00Z',
    duration: '4 hours',
    status: 'active',
    difficulty: 'Expert',
    type: 'Weekly'
  },
  {
    id: 'monthly-grand-1',
    name: 'Grand Multi-Game Championship',
    description: 'Play all 9 games in sequence - only the most versatile win!',
    game: 'All Games',
    entryFee: 25,
    prizePool: 10000,
    platformFee: 1500, // 15% of 10000
    finalPrizePool: 8500, // 10000 - 1500
    maxParticipants: 500,
    currentParticipants: 342,
    startTime: '2024-02-01T19:00:00Z',
    duration: '1 week',
    status: 'upcoming',
    difficulty: 'Expert',
    type: 'Monthly'
  },
  {
    id: 'beginner-multi-1',
    name: 'Newcomer Friendly Tournament',
    description: 'Perfect for new players - easier games and lower stakes',
    game: 'Multi-Target Reaction',
    entryFee: 2,
    prizePool: 200,
    platformFee: 30, // 15% of 200
    finalPrizePool: 170, // 200 - 30
    maxParticipants: 50,
    currentParticipants: 23,
    startTime: '2024-01-16T16:00:00Z',
    duration: '1 hour',
    status: 'upcoming',
    difficulty: 'Beginner',
    type: 'Daily'
  },
  {
    id: 'special-color-1',
    name: 'Rainbow Rush Special Event',
    description: 'Limited-time Color Sequence Memory tournament with bonus prizes',
    game: 'Color Sequence Memory',
    entryFee: 15,
    prizePool: 3000,
    platformFee: 450, // 15% of 3000
    finalPrizePool: 2550, // 3000 - 450
    maxParticipants: 150,
    currentParticipants: 89,
    startTime: '2024-01-18T21:00:00Z',
    duration: '3 hours',
    status: 'upcoming',
    difficulty: 'Intermediate',
    type: 'Special'
  }
];

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>(MOCK_TOURNAMENTS);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'upcoming' | 'active' | 'completed'>('all');
  const [selectedType, setSelectedType] = useState<'all' | 'Daily' | 'Weekly' | 'Monthly' | 'Special'>('all');

  const filteredTournaments = tournaments.filter(tournament => {
    const statusMatch = selectedFilter === 'all' || tournament.status === selectedFilter;
    const typeMatch = selectedType === 'all' || tournament.type === selectedType;
    return statusMatch && typeMatch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'text-blue-600 bg-blue-100';
      case 'active': return 'text-green-600 bg-green-100';
      case 'completed': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return 'text-green-600 bg-green-100';
      case 'Intermediate': return 'text-yellow-600 bg-yellow-100';
      case 'Expert': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Daily': return '📅';
      case 'Weekly': return '🗓️';
      case 'Monthly': return '📆';
      case 'Special': return '⭐';
      default: return '🏆';
    }
  };

  const formatTimeUntil = (startTime: string) => {
    const now = new Date();
    const start = new Date(startTime);
    const diff = start.getTime() - now.getTime();
    
    if (diff < 0) return 'Started';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <div className="w-10 h-10 mr-3">
                <img
                  src="/DropCoin.png"
                  alt="Dollar Drop Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white transition-colors">Dollar Drop</span>
            </Link>
            <nav className="flex items-center space-x-6">
              <Link href="/listings" className="text-gray-700 dark:text-green-400 hover:text-green-600 dark:hover:text-green-300 font-medium transition-colors">Browse</Link>
              <Link href="/categories" className="text-gray-700 dark:text-green-400 hover:text-green-600 dark:hover:text-green-300 font-medium transition-colors">Categories</Link>
              <Link href="/games" className="text-gray-700 dark:text-green-400 hover:text-green-600 dark:hover:text-green-300 font-medium transition-colors">🎮 Games</Link>
              <Link href="/tournaments" className="text-purple-600 dark:text-green-400 hover:text-purple-700 dark:hover:text-green-300 font-bold transition-colors">🏆 Tournaments</Link>
              <Link href="/hot-sell" className="text-red-600 dark:text-green-400 hover:text-red-700 dark:hover:text-green-300 font-bold transition-colors">🔥 Hot Sell</Link>
              <Link href="/how-it-works" className="text-gray-700 dark:text-green-400 hover:text-green-600 dark:hover:text-green-300 font-medium transition-colors">How It Works</Link>
              <Link href="/buy-tokens" className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-bold transition-colors">💰 Buy Tokens</Link>
              <div className="flex items-center space-x-3 ml-4 pl-4 border-l border-gray-200 dark:border-gray-700 transition-colors">
                <Link href="/wallet" className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-bold transition-colors">👛 Wallet</Link>
                <Link href="/settings" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-bold transition-colors">⚙️ Settings</Link>
                <Link href="/auth/login" className="text-gray-700 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 font-medium transition-colors">Sign In</Link>
                <Link href="/auth/register" className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">Sign Up</Link>
                <Link href="/seller/apply" className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">Sell</Link>
              </div>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            🏆 Tournament Arena
          </h1>
          <p className="text-xl text-gray-600 max-w-4xl mx-auto mb-8">
            Compete in scheduled tournaments for massive prize pools! Test your skills against the best players 
            in daily, weekly, and monthly competitions.
          </p>
          
          {/* Platform Fee Notice */}
          <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-2xl p-6 max-w-5xl mx-auto mb-8">
            <div className="flex items-center justify-center mb-4">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mr-2" />
              <h3 className="text-lg font-bold text-red-900">💰 Tournament Fee Structure</h3>
            </div>
            <p className="text-red-800 text-center mb-4">
              <strong>15% Platform Fee:</strong> DropDollar takes a 15% cut from all tournament prize pools. 
              Winners receive 85% of the total collected amount. Additionally, tournament winners cannot participate 
              in the same tournament category for <strong>6 months</strong>.
            </p>
            <div className="bg-white rounded-lg p-4 max-w-3xl mx-auto">
              <h4 className="font-bold text-gray-900 mb-3 text-center">Fee Breakdown Examples</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-lg font-bold text-blue-600">$500</div>
                  <div className="text-gray-600 mb-1">Total Collected</div>
                  <div className="text-sm text-red-600">-$75 (15%)</div>
                  <div className="text-lg font-bold text-green-600">$425</div>
                  <div className="text-gray-600">Final Prize</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-lg font-bold text-purple-600">$2,000</div>
                  <div className="text-gray-600 mb-1">Total Collected</div>
                  <div className="text-sm text-red-600">-$300 (15%)</div>
                  <div className="text-lg font-bold text-green-600">$1,700</div>
                  <div className="text-gray-600">Final Prize</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <div className="text-lg font-bold text-yellow-600">$25,000</div>
                  <div className="text-gray-600 mb-1">Total Collected</div>
                  <div className="text-sm text-red-600">-$3,750 (15%)</div>
                  <div className="text-lg font-bold text-green-600">$21,250</div>
                  <div className="text-gray-600">Final Prize</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="text-2xl font-bold text-green-600">$15,700</div>
              <div className="text-sm text-gray-600">Total Prize Pool</div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="text-2xl font-bold text-blue-600">697</div>
              <div className="text-sm text-gray-600">Active Players</div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="text-2xl font-bold text-purple-600">5</div>
              <div className="text-sm text-gray-600">Live Tournaments</div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="text-2xl font-bold text-orange-600">2h 15m</div>
              <div className="text-sm text-gray-600">Next Tournament</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-6 shadow-lg mb-8">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="font-semibold text-gray-900">Filter by Status:</span>
              <div className="flex space-x-2">
                {(['all', 'upcoming', 'active', 'completed'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setSelectedFilter(status)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedFilter === status
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="font-semibold text-gray-900">Tournament Type:</span>
              <div className="flex space-x-2">
                {(['all', 'Daily', 'Weekly', 'Monthly', 'Special'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedType === type
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {type === 'all' ? 'All' : `${getTypeIcon(type)} ${type}`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Tournament Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {filteredTournaments.map((tournament) => (
            <div key={tournament.id} className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all border border-gray-200">
              {/* Tournament Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <span className="text-2xl mr-2">{getTypeIcon(tournament.type)}</span>
                    <h3 className="text-xl font-bold text-gray-900">{tournament.name}</h3>
                  </div>
                  <p className="text-gray-600 text-sm mb-3">{tournament.description}</p>
                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(tournament.status)}`}>
                      {tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1)}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getDifficultyColor(tournament.difficulty)}`}>
                      {tournament.difficulty}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">${tournament.finalPrizePool.toLocaleString()}</div>
                  <div className="text-sm text-gray-500">Final Prize Pool</div>
                  <div className="text-xs text-red-500">
                    (${tournament.prizePool.toLocaleString()} - ${tournament.platformFee.toLocaleString()} fee)
                  </div>
                </div>
              </div>

              {/* Prize Pool Breakdown */}
              <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg p-4 mb-6">
                <h4 className="font-bold text-red-900 mb-3 text-center">💰 Prize Pool Breakdown</h4>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600">${tournament.prizePool.toLocaleString()}</div>
                    <div className="text-gray-600">Total Collected</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-red-600">-${tournament.platformFee.toLocaleString()}</div>
                    <div className="text-gray-600">Platform Fee (15%)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">${tournament.finalPrizePool.toLocaleString()}</div>
                    <div className="text-gray-600">Final Prize Pool</div>
                  </div>
                </div>
              </div>

              {/* Tournament Details */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <CurrencyDollarIcon className="h-5 w-5 text-green-600 mr-2" />
                    <span className="text-sm font-medium text-gray-700">Entry Fee</span>
                  </div>
                  <div className="text-lg font-bold text-gray-900">${tournament.entryFee}</div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <UserGroupIcon className="h-5 w-5 text-blue-600 mr-2" />
                    <span className="text-sm font-medium text-gray-700">Participants</span>
                  </div>
                  <div className="text-lg font-bold text-gray-900">
                    {tournament.currentParticipants}/{tournament.maxParticipants}
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(tournament.currentParticipants / tournament.maxParticipants) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Game & Timing Info */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center mb-2">
                      <TrophyIcon className="h-5 w-5 text-purple-600 mr-2" />
                      <span className="text-sm font-medium text-gray-700">Game</span>
                    </div>
                    <div className="font-bold text-gray-900">{tournament.game}</div>
                  </div>
                  
                  <div>
                    <div className="flex items-center mb-2">
                      <ClockIcon className="h-5 w-5 text-orange-600 mr-2" />
                      <span className="text-sm font-medium text-gray-700">
                        {tournament.status === 'upcoming' ? 'Starts In' : 
                         tournament.status === 'active' ? 'Duration' : 'Completed'}
                      </span>
                    </div>
                    <div className="font-bold text-gray-900">
                      {tournament.status === 'upcoming' ? formatTimeUntil(tournament.startTime) : tournament.duration}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                disabled={tournament.status === 'completed' || tournament.currentParticipants >= tournament.maxParticipants}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {tournament.status === 'completed' ? (
                  <>
                    <TrophyIcon className="h-5 w-5 mr-2" />
                    View Results
                  </>
                ) : tournament.currentParticipants >= tournament.maxParticipants ? (
                  <>
                    <UserGroupIcon className="h-5 w-5 mr-2" />
                    Tournament Full
                  </>
                ) : tournament.status === 'active' ? (
                  <>
                    <FireIcon className="h-5 w-5 mr-2" />
                    Join Live Tournament
                  </>
                ) : (
                  <>
                    <CalendarIcon className="h-5 w-5 mr-2" />
                    Register Now
                  </>
                )}
                <ChevronRightIcon className="h-5 w-5 ml-2" />
              </button>
            </div>
          ))}
        </div>

        {/* Tournament Info */}
        <div className="mt-12 bg-white rounded-2xl p-8 shadow-lg">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            🏆 How Tournaments Work
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <CalendarIcon className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">1. Register</h3>
              <p className="text-gray-600 text-sm">
                Pay the entry fee and secure your spot. Registration closes when the tournament starts or fills up.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <FireIcon className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">2. Compete</h3>
              <p className="text-gray-600 text-sm">
                Play the designated game during the tournament window. Your best score counts!
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrophyIcon className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">3. Win Prizes</h3>
              <p className="text-gray-600 text-sm">
                Top performers share the prize pool. Winners are announced when the tournament ends.
              </p>
            </div>
          </div>
          
          <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <StarIcon className="h-5 w-5 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">💡 Tournament Tips & Rules</p>
                <ul className="space-y-1 text-xs">
                  <li>• Practice the game beforehand in the Games section</li>
                  <li>• Higher difficulty tournaments have bigger prize pools</li>
                  <li>• Special events often feature unique prizes and bonuses</li>
                  <li>• <strong>6-Month Winner Cooldown:</strong> Winners cannot enter the same tournament category for 6 months</li>
                  <li>• <strong>15% Platform Fee:</strong> All prize pools are reduced by 15% before distribution</li>
                  <li>• Tournament results are final and cannot be disputed</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
