'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import CleanNavigation from '@/components/navigation/CleanNavigation';
import Link from 'next/link';
import { 
  ChartBarIcon, 
  CurrencyDollarIcon, 
  EyeIcon, 
  CursorArrowRaysIcon,
  PlusIcon,
  ClockIcon,
  CheckCircleIcon,
  PauseCircleIcon
} from '@heroicons/react/24/outline';

interface Campaign {
  id: string;
  campaign_name: string;
  headline: string;
  description: string;
  campaign_status: string;
  admin_approved: boolean;
  token_budget: number;
  tokens_spent: number;
  total_impressions: number;
  total_clicks: number;
  click_through_rate: number;
  target_pages: string[];
  created_at: string;
  start_date: string;
  end_date: string | null;
}

export default function MyCampaignsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalTokensSpent, setTotalTokensSpent] = useState(0);
  const [totalImpressions, setTotalImpressions] = useState(0);
  const [totalClicks, setTotalClicks] = useState(0);

  useEffect(() => {
    if (user) {
      loadMyCampaigns();
    }
  }, [user]);

  const loadMyCampaigns = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('ad_campaigns')
        .select('*')
        .eq('seller_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setCampaigns(data || []);

      // Calculate totals
      const totals = (data || []).reduce((acc, campaign) => ({
        spent: acc.spent + (campaign.tokens_spent || 0),
        impressions: acc.impressions + (campaign.total_impressions || 0),
        clicks: acc.clicks + (campaign.total_clicks || 0)
      }), { spent: 0, impressions: 0, clicks: 0 });

      setTotalTokensSpent(totals.spent);
      setTotalImpressions(totals.impressions);
      setTotalClicks(totals.clicks);

    } catch (error) {
      console.error('Error loading campaigns:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900">
        <CleanNavigation />
        <div className="flex items-center justify-center h-screen">
          <div className="text-white text-2xl">Loading your campaigns...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900">
        <CleanNavigation />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white mb-4">Please Log In</h1>
            <p className="text-gray-300">You need to be logged in to view your campaigns.</p>
          </div>
        </div>
      </div>
    );
  }

  const activeCampaigns = campaigns.filter(c => c.campaign_status === 'active').length;
  const pendingCampaigns = campaigns.filter(c => c.campaign_status === 'pending').length;
  const totalBudget = campaigns.reduce((sum, c) => sum + c.token_budget, 0);
  const totalRemaining = campaigns.reduce((sum, c) => sum + (c.token_budget - c.tokens_spent), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900">
      <CleanNavigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-black text-white mb-2">My Ad Campaigns</h1>
          <p className="text-gray-300">Track your advertising performance and token usage</p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-2">
              <ChartBarIcon className="w-8 h-8 text-blue-400" />
              <span className="text-xs text-gray-400 uppercase">Total Campaigns</span>
            </div>
            <div className="text-3xl font-black text-white">{campaigns.length}</div>
            <div className="text-sm text-gray-400 mt-1">
              {activeCampaigns} active • {pendingCampaigns} pending
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-2">
              <CurrencyDollarIcon className="w-8 h-8 text-green-400" />
              <span className="text-xs text-gray-400 uppercase">Token Budget</span>
            </div>
            <div className="text-3xl font-black text-white">{totalBudget.toFixed(0)}</div>
            <div className="text-sm text-gray-400 mt-1">
              {totalRemaining.toFixed(0)} remaining
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-2">
              <EyeIcon className="w-8 h-8 text-purple-400" />
              <span className="text-xs text-gray-400 uppercase">Total Views</span>
            </div>
            <div className="text-3xl font-black text-white">{totalImpressions.toLocaleString()}</div>
            <div className="text-sm text-gray-400 mt-1">
              impressions
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-2">
              <CursorArrowRaysIcon className="w-8 h-8 text-yellow-400" />
              <span className="text-xs text-gray-400 uppercase">Total Clicks</span>
            </div>
            <div className="text-3xl font-black text-white">{totalClicks.toLocaleString()}</div>
            <div className="text-sm text-gray-400 mt-1">
              {totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : 0}% CTR
            </div>
          </div>
        </div>

        {/* Create New Campaign Button */}
        <div className="mb-6">
          <Link
            href="/advertising/register"
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Create New Campaign
          </Link>
        </div>

        {/* Campaigns List */}
        {campaigns.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-12 border border-white/10 text-center">
            <div className="text-6xl mb-4">📢</div>
            <h3 className="text-2xl font-bold text-white mb-2">No campaigns yet</h3>
            <p className="text-gray-300 mb-6">
              Create your first ad campaign to reach thousands of gamers!
            </p>
            <Link
              href="/advertising/register"
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-xl transition-all duration-300 shadow-lg"
            >
              <PlusIcon className="w-6 h-6 mr-2" />
              Create Your First Campaign
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {campaigns.map((campaign) => {
              const tokensRemaining = campaign.token_budget - campaign.tokens_spent;
              const budgetPercentUsed = (campaign.tokens_spent / campaign.token_budget) * 100;
              
              return (
                <div
                  key={campaign.id}
                  className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10 hover:border-purple-500/50 transition-all"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                    {/* Campaign Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-2xl font-bold text-white">{campaign.campaign_name}</h3>
                        
                        {campaign.campaign_status === 'active' && campaign.admin_approved && (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-400 flex items-center gap-1">
                            <CheckCircleIcon className="w-4 h-4" />
                            LIVE
                          </span>
                        )}
                        
                        {campaign.campaign_status === 'pending' && (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-500/20 text-yellow-400 flex items-center gap-1">
                            <ClockIcon className="w-4 h-4" />
                            PENDING APPROVAL
                          </span>
                        )}
                        
                        {campaign.campaign_status === 'paused' && (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-500/20 text-gray-400 flex items-center gap-1">
                            <PauseCircleIcon className="w-4 h-4" />
                            PAUSED
                          </span>
                        )}
                      </div>
                      
                      <p className="text-white font-semibold mb-2">{campaign.headline}</p>
                      <p className="text-gray-300 text-sm mb-4">{campaign.description}</p>
                      
                      <div className="flex flex-wrap gap-2 text-sm">
                        <span className="text-gray-400">
                          📍 Pages: <span className="text-purple-400">{campaign.target_pages.join(', ')}</span>
                        </span>
                      </div>
                    </div>

                    {/* Token Usage & Stats */}
                    <div className="lg:w-80">
                      {/* Budget Progress */}
                      <div className="bg-black/30 rounded-xl p-4 mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-400">Token Budget</span>
                          <span className="text-sm font-bold text-white">
                            {campaign.tokens_spent.toFixed(2)} / {campaign.token_budget.toFixed(0)}
                          </span>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="w-full bg-gray-700 rounded-full h-3 mb-2">
                          <div 
                            className={`h-3 rounded-full transition-all duration-300 ${
                              budgetPercentUsed >= 90 ? 'bg-red-500' :
                              budgetPercentUsed >= 70 ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(budgetPercentUsed, 100)}%` }}
                          ></div>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs">
                          <span className={`font-semibold ${
                            budgetPercentUsed >= 90 ? 'text-red-400' :
                            budgetPercentUsed >= 70 ? 'text-yellow-400' :
                            'text-green-400'
                          }`}>
                            {budgetPercentUsed.toFixed(1)}% used
                          </span>
                          <span className="text-gray-400">
                            💎 {tokensRemaining.toFixed(2)} tokens left
                          </span>
                        </div>
                      </div>

                      {/* Performance Stats */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-black/30 rounded-lg p-3 text-center">
                          <div className="text-lg font-bold text-blue-400">
                            {(campaign.total_impressions || 0).toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-400">Views</div>
                        </div>
                        
                        <div className="bg-black/30 rounded-lg p-3 text-center">
                          <div className="text-lg font-bold text-green-400">
                            {(campaign.total_clicks || 0).toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-400">Clicks</div>
                        </div>
                        
                        <div className="bg-black/30 rounded-lg p-3 text-center">
                          <div className="text-lg font-bold text-purple-400">
                            {(campaign.click_through_rate || 0).toFixed(2)}%
                          </div>
                          <div className="text-xs text-gray-400">CTR</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

