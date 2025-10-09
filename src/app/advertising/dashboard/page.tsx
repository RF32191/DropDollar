'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { 
  PlusIcon,
  EyeIcon,
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  PauseCircleIcon,
  PlayCircleIcon,
  CurrencyDollarIcon,
  CursorArrowRaysIcon,
  UsersIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';

interface AdCampaignSubmission {
  id: string;
  name: string;
  advertiser_name: string;
  contact_email: string;
  ad_type: 'practice_game' | 'banner' | 'both';
  status: 'pending_review' | 'approved' | 'rejected' | 'active' | 'paused' | 'completed';
  budget: number;
  cost_per_view: number;
  cost_per_click: number;
  max_daily_views: number;
  current_daily_views: number;
  total_views: number;
  total_clicks: number;
  start_date?: string;
  end_date?: string;
  created_at: string;
  admin_notes?: string;
}

export default function AdvertisingDashboard() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<AdCampaignSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.email) {
      fetchCampaigns();
    }
  }, [user]);

  const fetchCampaigns = async () => {
    try {
      const response = await fetch(`/api/advertising/campaigns?email=${encodeURIComponent(user?.email || '')}`);
      const result = await response.json();

      if (response.ok) {
        setCampaigns(result.data || []);
      } else {
        setError(result.error || 'Failed to fetch campaigns');
      }
    } catch (err) {
      console.error('Error fetching campaigns:', err);
      setError('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending_review':
        return <ClockIcon className="h-5 w-5 text-yellow-400" />;
      case 'approved':
      case 'active':
        return <CheckCircleIcon className="h-5 w-5 text-green-400" />;
      case 'rejected':
        return <XCircleIcon className="h-5 w-5 text-red-400" />;
      case 'paused':
        return <PauseCircleIcon className="h-5 w-5 text-gray-400" />;
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-blue-400" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_review':
        return 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20';
      case 'approved':
      case 'active':
        return 'bg-green-500/10 text-green-300 border-green-500/20';
      case 'rejected':
        return 'bg-red-500/10 text-red-300 border-red-500/20';
      case 'paused':
        return 'bg-gray-500/10 text-gray-300 border-gray-500/20';
      case 'completed':
        return 'bg-blue-500/10 text-blue-300 border-blue-500/20';
      default:
        return 'bg-gray-500/10 text-gray-300 border-gray-500/20';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const calculateCTR = (views: number, clicks: number) => {
    return views > 0 ? ((clicks / views) * 100).toFixed(2) : '0.00';
  };

  const totalBudget = campaigns.reduce((sum, campaign) => sum + campaign.budget, 0);
  const totalViews = campaigns.reduce((sum, campaign) => sum + campaign.total_views, 0);
  const totalClicks = campaigns.reduce((sum, campaign) => sum + campaign.total_clicks, 0);
  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Please Sign In</h1>
          <p className="text-blue-200 mb-6">You need to be signed in to view your advertising dashboard.</p>
          <Link href="/auth/login" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-800 via-purple-800 to-pink-800 shadow-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-2xl font-bold text-white">💧</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">DropDollar</h1>
                <p className="text-blue-200 text-sm">Advertising Dashboard</p>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link href="🥉
Bronze Match
Multi-Target Reaction

$5
🎯 CREATE MATCH
🥈
Silver Match
Falling Object Catch

$10
🎯 CREATE MATCH
🥇
Gold Match
Color Sequence Memory

$25
🎯 CREATE MATCH/advertising/register" className="text-blue-200 hover:text-white transition-colors">
                Create Campaign
              </Link>
              <Link href="/advertising/analytics" className="text-blue-200 hover:text-white transition-colors">
                Analytics
              </Link>
              <Link href="/advertising/billing" className="text-blue-200 hover:text-white transition-colors">
                Billing
              </Link>
              <Link href="/advertising/support" className="text-blue-200 hover:text-white transition-colors">
                Support
              </Link>
            </nav>

            {/* User Info */}
            <div className="text-white">
              <span className="text-sm">Welcome, {user.email}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Page Header */}
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-4xl font-bold text-white mb-4">Advertising Dashboard</h1>
            <p className="text-xl text-blue-200">Manage your ad campaigns and track performance</p>
          </div>
          <Link 
            href="/advertising/register"
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl font-bold transition-colors flex items-center space-x-2 shadow-lg"
          >
            <PlusIcon className="h-6 w-6" />
            <span>Create New Campaign</span>
          </Link>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-200 text-sm font-medium">Total Budget</p>
                <p className="text-3xl font-bold text-white">${totalBudget.toLocaleString()}</p>
              </div>
              <CurrencyDollarIcon className="h-12 w-12 text-green-400" />
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-200 text-sm font-medium">Total Views</p>
                <p className="text-3xl font-bold text-white">{totalViews.toLocaleString()}</p>
              </div>
              <EyeIcon className="h-12 w-12 text-blue-400" />
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-200 text-sm font-medium">Total Clicks</p>
                <p className="text-3xl font-bold text-white">{totalClicks.toLocaleString()}</p>
              </div>
              <CursorArrowRaysIcon className="h-12 w-12 text-purple-400" />
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-200 text-sm font-medium">Active Campaigns</p>
                <p className="text-3xl font-bold text-white">{activeCampaigns}</p>
              </div>
              <ChartBarIcon className="h-12 w-12 text-pink-400" />
            </div>
          </div>
        </div>

        {/* Campaigns List */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 overflow-hidden">
          <div className="px-8 py-6 border-b border-white/20">
            <h2 className="text-2xl font-bold text-white flex items-center">
              <ChartBarIcon className="h-8 w-8 mr-3" />
              Your Campaigns
            </h2>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
              <p className="text-blue-200">Loading campaigns...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <XCircleIcon className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <p className="text-red-300 mb-4">{error}</p>
              <button 
                onClick={fetchCampaigns}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Retry
              </button>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="p-12 text-center">
              <ChartBarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Campaigns Yet</h3>
              <p className="text-blue-200 mb-6">Create your first advertising campaign to get started.</p>
              <Link 
                href="/advertising/register"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-lg font-bold transition-colors inline-flex items-center space-x-2"
              >
                <PlusIcon className="h-5 w-5" />
                <span>Create Campaign</span>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-blue-200 uppercase tracking-wider">Campaign</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-blue-200 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-blue-200 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-blue-200 uppercase tracking-wider">Budget</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-blue-200 uppercase tracking-wider">Performance</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-blue-200 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-blue-200 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {campaigns.map((campaign) => (
                    <tr key={campaign.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-white">{campaign.name}</div>
                          <div className="text-sm text-blue-200">{campaign.advertiser_name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(campaign.status)}`}>
                          {getStatusIcon(campaign.status)}
                          <span className="ml-2 capitalize">{campaign.status.replace('_', ' ')}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-white capitalize">{campaign.ad_type.replace('_', ' ')}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-white">${campaign.budget.toLocaleString()}</div>
                        <div className="text-xs text-blue-200">${campaign.cost_per_view.toFixed(3)}/view</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-white">{campaign.total_views.toLocaleString()} views</div>
                        <div className="text-sm text-blue-200">{campaign.total_clicks} clicks ({calculateCTR(campaign.total_views, campaign.total_clicks)}% CTR)</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-white">{formatDate(campaign.created_at)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <button className="text-blue-400 hover:text-blue-300 transition-colors">
                            <EyeIcon className="h-5 w-5" />
                          </button>
                          <button className="text-purple-400 hover:text-purple-300 transition-colors">
                            <ChartBarIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Help Section */}
        {campaigns.length > 0 && (
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h3 className="text-lg font-bold text-white mb-4">📊 Performance Tips</h3>
              <ul className="space-y-2 text-sm text-blue-200">
                <li>• Target specific game types for better engagement</li>
                <li>• Use compelling call-to-action buttons</li>
                <li>• Monitor CTR and adjust targeting</li>
                <li>• Test different ad creatives</li>
              </ul>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h3 className="text-lg font-bold text-white mb-4">🎯 Optimization</h3>
              <ul className="space-y-2 text-sm text-blue-200">
                <li>• Review daily performance metrics</li>
                <li>• Adjust budgets based on ROI</li>
                <li>• Pause underperforming campaigns</li>
                <li>• Scale successful campaigns</li>
              </ul>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h3 className="text-lg font-bold text-white mb-4">💬 Support</h3>
              <ul className="space-y-2 text-sm text-blue-200">
                <li>• <Link href="/advertising/guide" className="hover:text-white">Campaign Setup Guide</Link></li>
                <li>• <Link href="/advertising/examples" className="hover:text-white">Creative Examples</Link></li>
                <li>• <Link href="/advertising/support" className="hover:text-white">Contact Support</Link></li>
                <li>• <Link href="/advertising/faq" className="hover:text-white">FAQ</Link></li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
