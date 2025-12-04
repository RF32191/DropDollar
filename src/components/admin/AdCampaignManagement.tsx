'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  PauseIcon, 
  PlayIcon,
  TrashIcon,
  EyeIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

interface AdCampaign {
  id: string;
  seller_id: string;
  seller_username: string;
  campaign_name: string;
  headline: string;
  description: string;
  destination_url: string;
  target_pages: string[];
  token_budget: number;
  tokens_spent: number;
  cost_per_impression: number;
  cost_per_click: number;
  total_impressions: number;
  total_clicks: number;
  click_through_rate: number;
  campaign_status: string;
  admin_approved: boolean;
  admin_notes: string | null;
  created_at: string;
  start_date: string;
  end_date: string | null;
}

export default function AdCampaignManagement() {
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'paused' | 'completed'>('all');
  const [selectedCampaign, setSelectedCampaign] = useState<AdCampaign | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    loadCampaigns();
    
    // Auto-refresh every 10 seconds to show updated stats
    const interval = setInterval(() => {
      loadCampaigns();
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const loadCampaigns = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('ad_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
      setLastUpdated(new Date());
      console.log('📊 [AdCampaignManagement] Loaded campaigns:', data?.length, 'at', new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Error loading campaigns:', error);
      alert('Failed to load campaigns');
    } finally {
      setIsLoading(false);
    }
  };

  const approveCampaign = async (campaignId: string) => {
    try {
      const { error } = await supabase
        .from('ad_campaigns')
        .update({ 
          admin_approved: true,
          campaign_status: 'active'
        })
        .eq('id', campaignId);

      if (error) throw error;
      alert('✅ Campaign approved and activated!');
      loadCampaigns();
    } catch (error) {
      console.error('Error approving campaign:', error);
      alert('Failed to approve campaign');
    }
  };

  const rejectCampaign = async (campaignId: string) => {
    const notes = prompt('Enter rejection reason (will be sent to seller):');
    if (!notes) return;

    try {
      const { error } = await supabase
        .from('ad_campaigns')
        .update({ 
          admin_approved: false,
          campaign_status: 'rejected',
          admin_notes: notes
        })
        .eq('id', campaignId);

      if (error) throw error;
      alert('Campaign rejected');
      loadCampaigns();
    } catch (error) {
      console.error('Error rejecting campaign:', error);
      alert('Failed to reject campaign');
    }
  };

  const pauseCampaign = async (campaignId: string) => {
    try {
      const { error } = await supabase
        .from('ad_campaigns')
        .update({ campaign_status: 'paused' })
        .eq('id', campaignId);

      if (error) throw error;
      alert('Campaign paused');
      loadCampaigns();
    } catch (error) {
      console.error('Error pausing campaign:', error);
      alert('Failed to pause campaign');
    }
  };

  const resumeCampaign = async (campaignId: string) => {
    try {
      const { error } = await supabase
        .from('ad_campaigns')
        .update({ campaign_status: 'active' })
        .eq('id', campaignId);

      if (error) throw error;
      alert('Campaign resumed');
      loadCampaigns();
    } catch (error) {
      console.error('Error resuming campaign:', error);
      alert('Failed to resume campaign');
    }
  };

  const deleteCampaign = async (campaignId: string, tokenBudget: number, tokensSpent: number) => {
    if (!confirm('Delete this campaign? This will refund unspent tokens to the seller.')) return;

    const tokensToRefund = tokenBudget - tokensSpent;

    try {
      // Get seller ID
      const campaign = campaigns.find(c => c.id === campaignId);
      if (!campaign) return;

      // Refund unspent tokens
      if (tokensToRefund > 0) {
        const { error: refundError } = await supabase
          .from('users')
          .update({ 
            purchased_tokens: supabase.rpc('increment', { x: tokensToRefund })
          })
          .eq('id', campaign.seller_id);

        if (refundError) console.warn('Refund error:', refundError);
      }

      // Delete campaign
      const { error } = await supabase
        .from('ad_campaigns')
        .delete()
        .eq('id', campaignId);

      if (error) throw error;
      alert(`Campaign deleted${tokensToRefund > 0 ? ` and ${tokensToRefund} tokens refunded` : ''}`);
      loadCampaigns();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      alert('Failed to delete campaign');
    }
  };

  const filteredCampaigns = campaigns.filter(c => {
    if (filter === 'all') return true;
    if (filter === 'pending') return !c.admin_approved && c.campaign_status === 'pending';
    return c.campaign_status === filter;
  });

  const stats = {
    total: campaigns.length,
    pending: campaigns.filter(c => !c.admin_approved && c.campaign_status === 'pending').length,
    active: campaigns.filter(c => c.campaign_status === 'active').length,
    paused: campaigns.filter(c => c.campaign_status === 'paused').length,
    totalImpressions: campaigns.reduce((sum, c) => sum + c.total_impressions, 0),
    totalClicks: campaigns.reduce((sum, c) => sum + c.total_clicks, 0),
    totalSpent: campaigns.reduce((sum, c) => sum + c.tokens_spent, 0)
  };

  if (isLoading) {
    return <div className="text-white text-center py-8">Loading campaigns...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-900/30 rounded-xl p-4 border border-blue-500/30">
          <div className="text-3xl font-black text-blue-400">{stats.total}</div>
          <div className="text-sm text-gray-400">Total Campaigns</div>
        </div>
        <div className="bg-yellow-900/30 rounded-xl p-4 border border-yellow-500/30">
          <div className="text-3xl font-black text-yellow-400">{stats.pending}</div>
          <div className="text-sm text-gray-400">Pending Approval</div>
        </div>
        <div className="bg-green-900/30 rounded-xl p-4 border border-green-500/30">
          <div className="text-3xl font-black text-green-400">{stats.active}</div>
          <div className="text-sm text-gray-400">Active</div>
        </div>
        <div className="bg-purple-900/30 rounded-xl p-4 border border-purple-500/30">
          <div className="text-3xl font-black text-purple-400">{stats.totalSpent}</div>
          <div className="text-sm text-gray-400">Tokens Spent</div>
        </div>
      </div>

      {/* Filters & Refresh */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex gap-2 flex-wrap">
          {(['all', 'pending', 'active', 'paused', 'completed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                filter === f
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-3">
          <div className="text-xs text-gray-400">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
          <button
            onClick={loadCampaigns}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
          >
            <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Campaigns List */}
      <div className="space-y-4">
        {filteredCampaigns.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            No campaigns found
          </div>
        ) : (
          filteredCampaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10 hover:border-purple-500/50 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-white">{campaign.campaign_name}</h3>
                    {(campaign.seller_username === 'DropDollar' || campaign.token_budget >= 999999999) && (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-500/30 to-purple-500/30 text-blue-300 border border-blue-400/30">
                        🆓 PLATFORM AD
                      </span>
                    )}
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      campaign.campaign_status === 'active' ? 'bg-green-500/20 text-green-400' :
                      campaign.campaign_status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                      campaign.campaign_status === 'paused' ? 'bg-gray-500/20 text-gray-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {campaign.campaign_status.toUpperCase()}
                    </span>
                    {campaign.admin_approved && (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400">
                        ✓ APPROVED
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm mb-1">by {campaign.seller_username}</p>
                  <p className="text-white font-semibold mb-1">{campaign.headline}</p>
                  <p className="text-gray-300 text-sm mb-3">{campaign.description}</p>
                  <div className="flex gap-4 text-sm mb-3">
                    <span className="text-gray-400">
                      📍 Pages: <span className="text-purple-400">{campaign.target_pages.join(', ')}</span>
                    </span>
                  </div>
                  
                  {/* Token Budget Progress Bar */}
                  <div className="bg-black/20 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2 text-sm">
                      <span className="text-gray-400">💎 Token Usage</span>
                      <span className="text-white font-bold">
                        {campaign.tokens_spent.toFixed(2)} / {campaign.token_budget.toFixed(0)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2 mb-1">
                      <div 
                        className={`h-2 rounded-full transition-all ${
                          (campaign.tokens_spent / campaign.token_budget) >= 0.9 ? 'bg-red-500' :
                          (campaign.tokens_spent / campaign.token_budget) >= 0.7 ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${Math.min((campaign.tokens_spent / campaign.token_budget) * 100, 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">
                        {((campaign.tokens_spent / campaign.token_budget) * 100).toFixed(1)}% used
                      </span>
                      <span className={`font-semibold ${
                        (campaign.token_budget - campaign.tokens_spent) < 10 ? 'text-red-400' :
                        (campaign.token_budget - campaign.tokens_spent) < 50 ? 'text-yellow-400' :
                        'text-green-400'
                      }`}>
                        {(campaign.token_budget - campaign.tokens_spent).toFixed(2)} left
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-4 mb-4 p-4 bg-black/30 rounded-xl">
                <div>
                  <div className="text-2xl font-bold text-blue-400">{campaign.total_impressions.toLocaleString()}</div>
                  <div className="text-xs text-gray-400">Impressions</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-400">{campaign.total_clicks.toLocaleString()}</div>
                  <div className="text-xs text-gray-400">Clicks</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-400">{campaign.click_through_rate.toFixed(2)}%</div>
                  <div className="text-xs text-gray-400">CTR</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-400">
                    {((campaign.tokens_spent / campaign.token_budget) * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs text-gray-400">Budget Used</div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {!campaign.admin_approved && campaign.campaign_status === 'pending' && (
                  <>
                    <button
                      onClick={() => approveCampaign(campaign.id)}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
                    >
                      <CheckCircleIcon className="w-5 h-5" />
                      Approve & Activate
                    </button>
                    <button
                      onClick={() => rejectCampaign(campaign.id)}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
                    >
                      <XCircleIcon className="w-5 h-5" />
                      Reject
                    </button>
                  </>
                )}
                
                {campaign.campaign_status === 'active' && (
                  <button
                    onClick={() => pauseCampaign(campaign.id)}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
                  >
                    <PauseIcon className="w-5 h-5" />
                    Pause
                  </button>
                )}
                
                {campaign.campaign_status === 'paused' && (
                  <button
                    onClick={() => resumeCampaign(campaign.id)}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
                  >
                    <PlayIcon className="w-5 h-5" />
                    Resume
                  </button>
                )}
                
                <button
                  onClick={() => window.open(campaign.destination_url, '_blank')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
                >
                  <EyeIcon className="w-5 h-5" />
                  View
                </button>
                
                <button
                  onClick={() => deleteCampaign(campaign.id, campaign.token_budget, campaign.tokens_spent)}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
                >
                  <TrashIcon className="w-5 h-5" />
                  Delete
                </button>
              </div>

              {campaign.admin_notes && (
                <div className="mt-4 p-3 bg-red-900/30 border border-red-500/30 rounded-lg">
                  <p className="text-sm text-red-300">
                    <strong>Admin Notes:</strong> {campaign.admin_notes}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

