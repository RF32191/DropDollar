'use client';

import { useState, useEffect } from 'react';

// Force dynamic rendering to prevent build timeouts
export const dynamic = 'force-dynamic';
import Link from 'next/link';
import PageLayout from '@/components/layout/PageLayout';
import GameCard from '@/components/ui/GameCard';
import DropAFundService, { DropAFundCampaign } from '@/lib/supabase/dropafundService';
import { useAuth } from '@/contexts/AuthContext';
import { 
  TrophyIcon, 
  UserGroupIcon, 
  CurrencyDollarIcon,
  ClockIcon,
  FireIcon,
  StarIcon,
  PuzzlePieceIcon,
  CursorArrowRaysIcon,
  DevicePhoneMobileIcon,
  ChartBarIcon,
  GiftIcon,
  PlayIcon,
  EyeIcon,
  CalendarIcon,
  HeartIcon,
  SparklesIcon,
  BoltIcon,
  VideoCameraIcon
} from '@heroicons/react/24/outline';

const gameIcons = {
  'multi-target': CursorArrowRaysIcon,
  'falling-objects': DevicePhoneMobileIcon,
  'color-sequence': PuzzlePieceIcon
};

const gameNames = {
  'multi-target': 'Multi-Target Reaction',
  'falling-objects': 'Falling Object Catch',
  'color-sequence': 'Color Sequence Memory'
};

export default function DropAFundCategoryPage() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<DropAFundCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'ending_soon' | 'high_reward'>('all');

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const data = await DropAFundService.getActiveCampaigns();
      setCampaigns(data);
    } catch (error) {
      console.error('Error loading DropAFund campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeRemaining = (deadline: string) => {
    const now = new Date();
    const end = new Date(deadline);
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return 'Ended';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  };

  const getProgressPercentage = (current: number, goal: number) => {
    return Math.min((current / goal) * 100, 100);
  };

  const getFilteredCampaigns = () => {
    switch (selectedFilter) {
      case 'active':
        return campaigns.filter(c => c.status === 'active');
      case 'ending_soon':
        return campaigns.filter(c => {
          if (!c.deadline) return false;
          const timeLeft = new Date(c.deadline).getTime() - new Date().getTime();
          return timeLeft > 0 && timeLeft < 24 * 60 * 60 * 1000; // Less than 24 hours
        });
      case 'high_reward':
        return campaigns.filter(c => c.total_reward_pool >= 100).sort((a, b) => b.total_reward_pool - a.total_reward_pool);
      default:
        return campaigns;
    }
  };

  const filteredCampaigns = getFilteredCampaigns();

  return (
    <PageLayout
      title="💧 DROPAFUND CATEGORY"
      subtitle="Community-funded competitions where multiple winners share rewards. Support causes while competing in skill-based games!"
      icon="💧"
      gradient="cyan"
    >
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Breadcrumb */}
        <nav className="flex mb-8" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              <Link href="/" className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-cyan-600 dark:text-gray-400 dark:hover:text-cyan-500">
                🏠 Home
              </Link>
            </li>
            <li>
              <div className="flex items-center">
                <span className="mx-2 text-gray-400">/</span>
                <Link href="/categories" className="text-sm font-medium text-gray-700 hover:text-cyan-600 dark:text-gray-400 dark:hover:text-cyan-500">
                  Categories
                </Link>
              </div>
            </li>
            <li aria-current="page">
              <div className="flex items-center">
                <span className="mx-2 text-gray-400">/</span>
                <span className="text-sm font-medium text-cyan-600 dark:text-cyan-500">💧 DropAFund</span>
              </div>
            </li>
          </ol>
        </nav>

        {/* Category Hero */}
        <GameCard gradient="cyan" className="mb-8">
          <div className="text-center">
            <div className="text-8xl mb-6">💧</div>
            <h1 className="text-4xl font-bold text-white mb-4">
              DropAFund Category
            </h1>
            <p className="text-xl text-cyan-100 mb-8 max-w-3xl mx-auto">
              Join community-funded competitions where everyone can win! Support meaningful causes while competing 
              in skill-based games with flexible winner structures and shared rewards.
            </p>
            
            {/* Category Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                <div className="text-3xl font-bold text-white">{campaigns.length}</div>
                <div className="text-cyan-200 text-sm">Active Campaigns</div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                <div className="text-3xl font-bold text-white">
                  {campaigns.reduce((sum, c) => sum + c.total_participants, 0)}
                </div>
                <div className="text-cyan-200 text-sm">Total Participants</div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                <div className="text-3xl font-bold text-white">
                  {campaigns.reduce((sum, c) => sum + c.max_winners, 0)}
                </div>
                <div className="text-cyan-200 text-sm">Winner Spots</div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                <div className="text-3xl font-bold text-white">
                  ${campaigns.reduce((sum, c) => sum + c.current_funding, 0).toLocaleString()}
                </div>
                <div className="text-cyan-200 text-sm">Total Raised</div>
              </div>
            </div>
          </div>
        </GameCard>

        {/* What Makes DropAFund Special */}
        <GameCard className="mb-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              ✨ What Makes DropAFund Special?
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Unlike traditional competitions with single winners, DropAFund campaigns support multiple winners and meaningful causes. 
              Platform fee: Only 6% (vs 15% for regular tournaments).
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-cyan-900/30 dark:to-blue-900/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserGroupIcon className="h-10 w-10 text-cyan-600 dark:text-cyan-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Multiple Winners</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Every campaign can have 1-100+ winners, giving more people a chance to earn rewards for their skills.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-gradient-to-br from-red-100 to-pink-100 dark:from-red-900/30 dark:to-pink-900/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <VideoCameraIcon className="h-10 w-10 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Video Business Plans</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Campaign creators can share YouTube videos explaining their business plans, goals, and how funds will be used.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <SparklesIcon className="h-10 w-10 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Flexible Rewards</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Campaigns feature equal splits, tiered rewards, or percentage-based distributions tailored to each cause.
              </p>
            </div>
          </div>
        </GameCard>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {[
            { key: 'all', label: 'All Campaigns', icon: EyeIcon },
            { key: 'active', label: 'Active Now', icon: BoltIcon },
            { key: 'ending_soon', label: 'Ending Soon', icon: ClockIcon },
            { key: 'high_reward', label: 'High Rewards', icon: GiftIcon }
          ].map(filter => (
            <button
              key={filter.key}
              onClick={() => setSelectedFilter(filter.key as any)}
              className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedFilter === filter.key
                  ? 'bg-cyan-500 text-white shadow-lg'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-cyan-50 dark:hover:bg-cyan-900/20'
              }`}
            >
              <filter.icon className="h-4 w-4 mr-2" />
              {filter.label}
            </button>
          ))}
        </div>

        {/* Campaigns Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-300 mt-4">Loading DropAFund campaigns...</p>
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <GameCard className="text-center py-12">
            <div className="text-6xl mb-4">💧</div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {selectedFilter === 'all' ? 'No Campaigns Available' : `No ${selectedFilter.replace('_', ' ')} Campaigns`}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {selectedFilter === 'all' 
                ? 'No DropAFund campaigns are currently available. Be the first to create one!'
                : `No campaigns match the ${selectedFilter.replace('_', ' ')} filter. Try a different filter.`
              }
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/seller/apply" 
                className="inline-flex items-center px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-bold rounded-xl transition-colors"
              >
                🚀 Create Campaign
              </Link>
              {selectedFilter !== 'all' && (
                <button
                  onClick={() => setSelectedFilter('all')}
                  className="inline-flex items-center px-6 py-3 border-2 border-cyan-500 text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 font-bold rounded-xl transition-colors"
                >
                  View All Campaigns
                </button>
              )}
            </div>
          </GameCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCampaigns.map((campaign) => {
              const GameIcon = gameIcons[campaign.game_type];
              const progress = getProgressPercentage(campaign.current_funding, campaign.funding_goal);
              const isEndingSoon = campaign.deadline && 
                new Date(campaign.deadline).getTime() - new Date().getTime() < 24 * 60 * 60 * 1000;
              
              return (
                <GameCard key={campaign.id} className="hover:shadow-xl transition-all duration-300 group relative">
                  <Link href={`/dropafund/${campaign.id}`}>
                    {/* Campaign Image */}
                    <div className="relative h-48 bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-cyan-900/30 dark:to-blue-900/30 rounded-xl mb-4 overflow-hidden">
                      {campaign.image_urls && campaign.image_urls.length > 0 ? (
                        <img 
                          src={campaign.image_urls[0]} 
                          alt={campaign.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <div className="text-4xl mb-2">💧</div>
                            <div className="text-lg font-bold text-cyan-600 dark:text-cyan-400">DropAFund</div>
                            <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                              {gameNames[campaign.game_type]}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Status Badges */}
                      <div className="absolute top-3 left-3 flex flex-col gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          campaign.status === 'active' ? 'bg-green-500 text-white' :
                          campaign.status === 'funded' ? 'bg-blue-500 text-white' :
                          campaign.status === 'completed' ? 'bg-purple-500 text-white' :
                          'bg-gray-500 text-white'
                        }`}>
                          {campaign.status.toUpperCase()}
                        </span>
                        
                        {isEndingSoon && (
                          <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-500 text-white animate-pulse">
                            🔥 ENDING SOON
                          </span>
                        )}
                      </div>
                      
                      {/* Game Type Badge */}
                      <div className="absolute top-3 right-3">
                        <div className="bg-white/90 dark:bg-gray-800/90 px-2 py-1 rounded-full flex items-center">
                          <GameIcon className="h-4 w-4 text-cyan-600 dark:text-cyan-400 mr-1" />
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            {gameNames[campaign.game_type]}
                          </span>
                        </div>
                      </div>

                      {/* Winner Count Badge */}
                      <div className="absolute bottom-3 left-3">
                        <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                          🏆 {campaign.max_winners} Winners
                        </div>
                      </div>

                      {/* YouTube Link Badge */}
                      {campaign.youtube_url && (
                        <div className="absolute bottom-3 right-3">
                          <a 
                            href={campaign.youtube_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <VideoCameraIcon className="h-3 w-3 mr-1" />
                            VIDEO
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Campaign Info */}
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors line-clamp-2">
                          {campaign.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                          {campaign.description}
                        </p>
                        
                        {/* YouTube Link */}
                        {campaign.youtube_url && (
                          <div className="mt-2">
                            <a 
                              href={campaign.youtube_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <VideoCameraIcon className="h-4 w-4 mr-1" />
                              Watch Business Plan Video
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Funding Progress */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            ${campaign.current_funding.toLocaleString()} raised
                          </span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {progress.toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Goal: ${campaign.funding_goal.toLocaleString()}
                        </div>
                      </div>

                      {/* Campaign Stats */}
                      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="text-center">
                          <div className="text-lg font-bold text-gray-900 dark:text-white">
                            {campaign.total_participants}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Players</div>
                        </div>
                        
                        <div className="text-center">
                          <div className="text-lg font-bold text-gray-900 dark:text-white">
                            ${campaign.entry_cost}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Entry</div>
                        </div>
                        
                        <div className="text-center">
                          <div className="text-lg font-bold text-gray-900 dark:text-white">
                            ${campaign.total_reward_pool.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Rewards</div>
                        </div>
                      </div>

                      {/* Time Remaining & CTA */}
                      <div className="flex items-center justify-between pt-2">
                        {campaign.deadline ? (
                          <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                            <ClockIcon className="h-4 w-4 mr-1" />
                            {formatTimeRemaining(campaign.deadline)}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            No deadline
                          </div>
                        )}
                        
                        <div className="text-sm font-medium text-cyan-600 dark:text-cyan-400 group-hover:text-cyan-700 dark:group-hover:text-cyan-300 transition-colors">
                          Join Campaign →
                        </div>
                      </div>
                    </div>
                  </Link>
                </GameCard>
              );
            })}
          </div>
        )}

        {/* Create Campaign CTA */}
        <GameCard gradient="cyan" className="mt-12 text-center">
          <div className="max-w-4xl mx-auto">
            <div className="text-6xl mb-6">🚀</div>
            <h2 className="text-3xl font-bold text-white mb-4">
              Launch Your DropAFund Campaign
            </h2>
            <p className="text-xl text-cyan-100 mb-8">
              Create a community-funded competition that supports your cause while engaging participants 
              in skill-based games. Set flexible winner structures and reward distributions!
            </p>
            
            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6">
                <div className="text-3xl mb-3">🎯</div>
                <h3 className="text-lg font-bold text-white mb-2">Flexible Winners</h3>
                <p className="text-cyan-200 text-sm">Set 1-100+ winners per campaign</p>
              </div>
              
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6">
                <div className="text-3xl mb-3">💰</div>
                <h3 className="text-lg font-bold text-white mb-2">Custom Rewards</h3>
                <p className="text-cyan-200 text-sm">Equal, tiered, or percentage-based</p>
              </div>
              
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6">
                <div className="text-3xl mb-3">🎮</div>
                <h3 className="text-lg font-bold text-white mb-2">Skill Games</h3>
                <p className="text-cyan-200 text-sm">Choose from 3 engaging game types</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/seller/apply" 
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-bold py-4 px-8 rounded-xl transition-all hover:scale-105 shadow-lg"
              >
                🎯 Create Campaign
              </Link>
              <Link 
                href="/how-it-works" 
                className="border-2 border-white/30 hover:border-white/50 text-white font-bold py-4 px-8 rounded-xl transition-all hover:bg-white/10"
              >
                📖 Learn More
              </Link>
            </div>
          </div>
        </GameCard>
      </div>
    </PageLayout>
  );
}
