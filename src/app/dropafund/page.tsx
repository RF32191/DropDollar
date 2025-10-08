'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PageLayout from '@/components/layout/PageLayout';
import GameCard from '@/components/ui/GameCard';
import DropAFundService, { DropAFundCampaign } from '@/lib/supabase/dropafundService';
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
  GiftIcon
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

export default function DropAFundPage() {
  const [campaigns, setCampaigns] = useState<DropAFundCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'funded' | 'completed'>('all');

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

  const filteredCampaigns = campaigns.filter(campaign => {
    if (selectedFilter === 'all') return true;
    return campaign.status === selectedFilter;
  });

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

  return (
    <PageLayout
      title="💧 DROPAFUND"
      subtitle="Community-funded competitions with multiple winners and flexible rewards. Support causes while competing for prizes!"
      icon="💧"
      gradient="cyan"
    >
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Hero Stats */}
        <GameCard gradient="cyan" className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="bg-cyan-100 dark:bg-cyan-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 transition-colors">
                <TrophyIcon className="h-8 w-8 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white transition-colors">{campaigns.length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300 transition-colors">Active Campaigns</div>
            </div>
            
            <div>
              <div className="bg-green-100 dark:bg-green-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 transition-colors">
                <UserGroupIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white transition-colors">
                {campaigns.reduce((sum, c) => sum + c.total_participants, 0).toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300 transition-colors">Total Participants</div>
            </div>
            
            <div>
              <div className="bg-purple-100 dark:bg-purple-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 transition-colors">
                <CurrencyDollarIcon className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white transition-colors">
                ${campaigns.reduce((sum, c) => sum + c.current_funding, 0).toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300 transition-colors">Total Raised</div>
            </div>
            
            <div>
              <div className="bg-orange-100 dark:bg-orange-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 transition-colors">
                <GiftIcon className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white transition-colors">
                {campaigns.reduce((sum, c) => sum + c.max_winners, 0).toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300 transition-colors">Total Winner Spots</div>
            </div>
          </div>
        </GameCard>

        {/* How DropAFund Works */}
        <GameCard className="mb-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 transition-colors">
              💧 How DropAFund Works
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto transition-colors">
              DropAFund combines crowdfunding with skill-based gaming. Support causes, compete in games, and win rewards!
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 dark:bg-blue-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors">
                <span className="text-2xl">🎯</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 transition-colors">1. Choose Campaign</h3>
              <p className="text-gray-600 dark:text-gray-300 transition-colors">
                Browse active DropAFund campaigns. Each supports a cause while offering skill-based competition.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-green-100 dark:bg-green-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors">
                <span className="text-2xl">🎮</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 transition-colors">2. Play & Support</h3>
              <p className="text-gray-600 dark:text-gray-300 transition-colors">
                Pay the entry fee to play the assigned game. Your payment supports the campaign and enters you to win.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-purple-100 dark:bg-purple-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors">
                <span className="text-2xl">🏆</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 transition-colors">3. Win Rewards</h3>
              <p className="text-gray-600 dark:text-gray-300 transition-colors">
                Multiple winners per campaign! Top performers share rewards based on the campaign's structure.
              </p>
            </div>
          </div>
        </GameCard>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { key: 'all', label: 'All Campaigns', count: campaigns.length },
            { key: 'active', label: 'Active', count: campaigns.filter(c => c.status === 'active').length },
            { key: 'funded', label: 'Funded', count: campaigns.filter(c => c.status === 'funded').length },
            { key: 'completed', label: 'Completed', count: campaigns.filter(c => c.status === 'completed').length }
          ].map(filter => (
            <button
              key={filter.key}
              onClick={() => setSelectedFilter(filter.key as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedFilter === filter.key
                  ? 'bg-cyan-500 text-white shadow-lg'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-cyan-50 dark:hover:bg-cyan-900/20'
              }`}
            >
              {filter.label} ({filter.count})
            </button>
          ))}
        </div>

        {/* Campaigns Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-300 mt-4">Loading campaigns...</p>
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <GameCard className="text-center py-12">
            <div className="text-6xl mb-4">💧</div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Campaigns Found</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {selectedFilter === 'all' 
                ? 'No DropAFund campaigns are currently available.'
                : `No ${selectedFilter} campaigns found.`
              }
            </p>
            <Link 
              href="/seller/apply" 
              className="inline-flex items-center px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-bold rounded-xl transition-colors"
            >
              Create Campaign
            </Link>
          </GameCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCampaigns.map((campaign) => {
              const GameIcon = gameIcons[campaign.game_type];
              const progress = getProgressPercentage(campaign.current_funding, campaign.funding_goal);
              
              return (
                <GameCard key={campaign.id} className="hover:shadow-xl transition-all duration-300 group">
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
                          </div>
                        </div>
                      )}
                      
                      {/* Status Badge */}
                      <div className="absolute top-3 left-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          campaign.status === 'active' ? 'bg-green-500 text-white' :
                          campaign.status === 'funded' ? 'bg-blue-500 text-white' :
                          campaign.status === 'completed' ? 'bg-purple-500 text-white' :
                          'bg-gray-500 text-white'
                        }`}>
                          {campaign.status.toUpperCase()}
                        </span>
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
                          <div className="text-xs text-gray-500 dark:text-gray-400">Participants</div>
                        </div>
                        
                        <div className="text-center">
                          <div className="text-lg font-bold text-gray-900 dark:text-white">
                            {campaign.max_winners}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Max Winners</div>
                        </div>
                        
                        <div className="text-center">
                          <div className="text-lg font-bold text-gray-900 dark:text-white">
                            ${campaign.entry_cost}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Entry Fee</div>
                        </div>
                      </div>

                      {/* Time Remaining */}
                      {campaign.deadline && (
                        <div className="flex items-center justify-between pt-2">
                          <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                            <ClockIcon className="h-4 w-4 mr-1" />
                            {formatTimeRemaining(campaign.deadline)}
                          </div>
                          <div className="text-sm font-medium text-cyan-600 dark:text-cyan-400">
                            Enter Now →
                          </div>
                        </div>
                      )}
                    </div>
                  </Link>
                </GameCard>
              );
            })}
          </div>
        )}

        {/* Create Campaign CTA */}
        <GameCard gradient="cyan" className="mt-12 text-center">
          <div className="max-w-3xl mx-auto">
            <div className="text-6xl mb-6">🚀</div>
            <h2 className="text-3xl font-bold text-white mb-4">
              Launch Your DropAFund Campaign
            </h2>
            <p className="text-xl text-cyan-100 mb-8">
              Create a community-funded competition with flexible winner structures. 
              Support your cause while engaging participants in skill-based games!
            </p>
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
