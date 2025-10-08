'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import PageLayout from '@/components/layout/PageLayout';
import GameCard from '@/components/ui/GameCard';
import DropAFundService, { DropAFundCampaign, DropAFundParticipant, ListingScoreboard } from '@/lib/supabase/dropafundService';
import { useAuth } from '@/contexts/AuthContext';
import MultiTargetGame from '@/components/games/MultiTargetGame';
import FallingObjectGame from '@/components/games/FallingObjectGame';
import ColorSequenceGame from '@/components/games/ColorSequenceGame';
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
  CalendarIcon
} from '@heroicons/react/24/outline';

const gameComponents = {
  'multi-target': MultiTargetGame,
  'falling-objects': FallingObjectGame,
  'color-sequence': ColorSequenceGame
};

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

export default function DropAFundCampaignPage() {
  const params = useParams();
  const { user } = useAuth();
  const campaignId = params.id as string;
  
  const [campaign, setCampaign] = useState<DropAFundCampaign | null>(null);
  const [participants, setParticipants] = useState<DropAFundParticipant[]>([]);
  const [scoreboard, setScoreboard] = useState<ListingScoreboard[]>([]);
  const [userParticipation, setUserParticipation] = useState<DropAFundParticipant | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'play' | 'scoreboard' | 'participants'>('overview');
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (campaignId) {
      loadCampaignData();
    }
  }, [campaignId]);

  const loadCampaignData = async () => {
    try {
      setLoading(true);
      
      const [campaignData, participantsData, scoreboardData] = await Promise.all([
        DropAFundService.getCampaign(campaignId),
        DropAFundService.getCampaignParticipants(campaignId, 100),
        DropAFundService.getListingScoreboard(campaignId, 'dropafund', 50)
      ]);
      
      setCampaign(campaignData);
      setParticipants(participantsData);
      setScoreboard(scoreboardData);
      
      // Load user participation if logged in
      if (user && campaignData) {
        const userParticipationData = await DropAFundService.getUserCampaignPerformance(campaignId, user.id);
        setUserParticipation(userParticipationData);
      }
    } catch (error) {
      console.error('Error loading campaign data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinCampaign = async () => {
    if (!user || !campaign) return;
    
    try {
      const participation = await DropAFundService.joinCampaign(campaignId, user.id, user.username);
      if (participation) {
        setUserParticipation(participation);
        await loadCampaignData(); // Refresh data
      }
    } catch (error) {
      console.error('Error joining campaign:', error);
    }
  };

  const handleGameEnd = async (score: number, gameData?: any) => {
    if (!user || !campaign || !userParticipation) return;
    
    try {
      await DropAFundService.recordGameSession({
        campaignId: campaignId,
        userId: user.id,
        gameType: campaign.game_type,
        score: score,
        contributionAmount: campaign.entry_cost,
        sessionData: gameData
      });
      
      // Refresh data to show updated scores
      await loadCampaignData();
      setIsPlaying(false);
    } catch (error) {
      console.error('Error recording game session:', error);
    }
  };

  const formatTimeRemaining = (deadline: string) => {
    const now = new Date();
    const end = new Date(deadline);
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return 'Campaign Ended';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getProgressPercentage = (current: number, goal: number) => {
    return Math.min((current / goal) * 100, 100);
  };

  if (loading) {
    return (
      <PageLayout title="Loading..." subtitle="Please wait..." icon="💧" gradient="cyan">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-300 mt-4">Loading campaign...</p>
        </div>
      </PageLayout>
    );
  }

  if (!campaign) {
    return (
      <PageLayout title="Campaign Not Found" subtitle="The requested campaign could not be found" icon="❌" gradient="red">
        <GameCard className="text-center py-12">
          <div className="text-6xl mb-4">😞</div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Campaign Not Found</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            The DropAFund campaign you're looking for doesn't exist or has been removed.
          </p>
          <Link 
            href="/dropafund" 
            className="inline-flex items-center px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-bold rounded-xl transition-colors"
          >
            Browse Campaigns
          </Link>
        </GameCard>
      </PageLayout>
    );
  }

  const GameComponent = gameComponents[campaign.game_type];
  const GameIcon = gameIcons[campaign.game_type];
  const progress = getProgressPercentage(campaign.current_funding, campaign.funding_goal);

  return (
    <PageLayout
      title={campaign.title}
      subtitle={campaign.description}
      icon="💧"
      gradient="cyan"
    >
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Campaign Header */}
        <GameCard className="mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Campaign Image */}
            <div className="relative h-64 lg:h-80 bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-cyan-900/30 dark:to-blue-900/30 rounded-xl overflow-hidden">
              {campaign.image_urls && campaign.image_urls.length > 0 ? (
                <img 
                  src={campaign.image_urls[0]} 
                  alt={campaign.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="text-6xl mb-4">💧</div>
                    <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">DropAFund</div>
                    <div className="text-lg text-gray-600 dark:text-gray-300 mt-2">
                      {gameNames[campaign.game_type]}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Status Badge */}
              <div className="absolute top-4 left-4">
                <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                  campaign.status === 'active' ? 'bg-green-500 text-white' :
                  campaign.status === 'funded' ? 'bg-blue-500 text-white' :
                  campaign.status === 'completed' ? 'bg-purple-500 text-white' :
                  'bg-gray-500 text-white'
                }`}>
                  {campaign.status.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Campaign Details */}
            <div className="space-y-6">
              {/* Funding Progress */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    ${campaign.current_funding.toLocaleString()} raised
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {progress.toFixed(1)}% of goal
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-cyan-500 to-blue-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  ></div>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Goal: ${campaign.funding_goal.toLocaleString()}
                </div>
              </div>

              {/* Campaign Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {campaign.total_participants}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Participants</div>
                </div>
                
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {campaign.max_winners}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Max Winners</div>
                </div>
                
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    ${campaign.entry_cost}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Entry Fee</div>
                </div>
                
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {campaign.highest_score.toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">High Score</div>
                </div>
              </div>

              {/* Game Info */}
              <div className="flex items-center p-4 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-lg">
                <GameIcon className="h-8 w-8 text-cyan-600 dark:text-cyan-400 mr-3" />
                <div>
                  <div className="font-bold text-gray-900 dark:text-white">
                    {gameNames[campaign.game_type]}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    Difficulty: {campaign.game_difficulty}
                  </div>
                </div>
              </div>

              {/* Time Remaining */}
              {campaign.deadline && (
                <div className="flex items-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <ClockIcon className="h-6 w-6 text-orange-600 dark:text-orange-400 mr-3" />
                  <div>
                    <div className="font-bold text-gray-900 dark:text-white">
                      {formatTimeRemaining(campaign.deadline)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      Until campaign ends
                    </div>
                  </div>
                </div>
              )}

              {/* Join/Play Button */}
              <div className="space-y-3">
                {!user ? (
                  <Link 
                    href="/auth/login"
                    className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold py-4 px-6 rounded-xl transition-all text-center block"
                  >
                    Sign In to Participate
                  </Link>
                ) : !userParticipation ? (
                  <button
                    onClick={handleJoinCampaign}
                    className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold py-4 px-6 rounded-xl transition-all"
                  >
                    Join Campaign - ${campaign.entry_cost}
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="text-sm text-green-600 dark:text-green-400 font-medium">
                      ✅ You're participating in this campaign!
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      Best Score: {userParticipation.best_score} | Rank: #{userParticipation.current_rank || 'Unranked'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </GameCard>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {[
            { key: 'overview', label: 'Overview', icon: EyeIcon },
            { key: 'play', label: 'Play Game', icon: PlayIcon },
            { key: 'scoreboard', label: 'Scoreboard', icon: ChartBarIcon },
            { key: 'participants', label: 'Participants', icon: UserGroupIcon }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-cyan-500 text-white shadow-lg'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-cyan-50 dark:hover:bg-cyan-900/20'
              }`}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <GameCard>
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Campaign Story</h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  {campaign.story || campaign.description}
                </p>
              </div>

              {/* Winner Structure */}
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Winner Structure</h3>
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-6 rounded-xl">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {campaign.min_winners} - {campaign.max_winners}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">Winner Range</div>
                    </div>
                    
                    <div>
                      <div className="text-2xl font-bold text-pink-600 dark:text-pink-400">
                        {campaign.winner_selection_type.replace('_', ' ')}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">Selection Method</div>
                    </div>
                    
                    <div>
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        ${campaign.total_reward_pool.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">Reward Pool</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </GameCard>
        )}

        {activeTab === 'play' && (
          <GameCard>
            {!user ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔒</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Sign In Required</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  You need to sign in and join the campaign to play the game.
                </p>
                <Link 
                  href="/auth/login"
                  className="inline-flex items-center px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-bold rounded-xl transition-colors"
                >
                  Sign In
                </Link>
              </div>
            ) : !userParticipation ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎯</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Join Campaign First</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  You need to join this campaign before you can play the game.
                </p>
                <button
                  onClick={handleJoinCampaign}
                  className="inline-flex items-center px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-bold rounded-xl transition-colors"
                >
                  Join Campaign - ${campaign.entry_cost}
                </button>
              </div>
            ) : (
              <div>
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {gameNames[campaign.game_type]}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Your best score: {userParticipation.best_score} | Current rank: #{userParticipation.current_rank || 'Unranked'}
                  </p>
                </div>
                
                <div className="max-w-4xl mx-auto">
                  <GameComponent 
                    onGameEnd={handleGameEnd}
                    isTestMode={true}
                  />
                </div>
              </div>
            )}
          </GameCard>
        )}

        {activeTab === 'scoreboard' && (
          <GameCard>
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  🏆 Campaign Scoreboard
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Top performers in {gameNames[campaign.game_type]}
                </p>
              </div>

              {scoreboard.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📊</div>
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No Scores Yet</h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    Be the first to play and set a score!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {scoreboard.map((entry, index) => (
                    <div 
                      key={entry.id}
                      className={`flex items-center justify-between p-4 rounded-lg ${
                        index < 3 
                          ? 'bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-2 border-yellow-200 dark:border-yellow-700'
                          : 'bg-gray-50 dark:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mr-4 ${
                          index === 0 ? 'bg-yellow-500 text-white' :
                          index === 1 ? 'bg-gray-400 text-white' :
                          index === 2 ? 'bg-amber-600 text-white' :
                          'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}>
                          {index + 1}
                        </div>
                        
                        <div>
                          <div className="font-bold text-gray-900 dark:text-white">
                            {entry.username}
                            {entry.user_id === user?.id && (
                              <span className="ml-2 text-xs bg-cyan-100 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-200 px-2 py-1 rounded-full">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {entry.total_attempts} attempts | Avg: {entry.average_score?.toFixed(1) || 'N/A'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {entry.best_score.toFixed(1)}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Best Score
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </GameCard>
        )}

        {activeTab === 'participants' && (
          <GameCard>
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  👥 Campaign Participants
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {participants.length} participants competing for {campaign.max_winners} winner spots
                </p>
              </div>

              {participants.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">👥</div>
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No Participants Yet</h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    Be the first to join this campaign!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {participants.map((participant, index) => (
                    <div 
                      key={participant.id}
                      className={`p-4 rounded-lg border-2 ${
                        participant.user_id === user?.id
                          ? 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-700'
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="font-bold text-gray-900 dark:text-white">
                          {participant.username}
                          {participant.user_id === user?.id && (
                            <span className="ml-2 text-xs bg-cyan-100 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-200 px-2 py-1 rounded-full">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Rank #{participant.current_rank || 'Unranked'}
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-300">Best Score:</span>
                          <span className="font-bold text-gray-900 dark:text-white">{participant.best_score.toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-300">Attempts:</span>
                          <span className="font-bold text-gray-900 dark:text-white">{participant.total_attempts}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-300">Contributed:</span>
                          <span className="font-bold text-gray-900 dark:text-white">${participant.total_contributed.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </GameCard>
        )}
      </div>
    </PageLayout>
  );
}
