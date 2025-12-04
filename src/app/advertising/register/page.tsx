'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTokenSync } from '@/hooks/useTokenSync';
import { useRouter } from 'next/navigation';
import CleanNavigation from '@/components/navigation/CleanNavigation';
import CreateAdCampaign from '@/components/ads/CreateAdCampaign';
import AdBanner from '@/components/ads/AdBanner';
import PageWalletDisplay from '@/components/wallet/PageWalletDisplay';
import Link from 'next/link';
import {
  SparklesIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  ArrowRightIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

export default function AdvertisingRegisterPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { tokenBalance, purchasedTokens, wonTokens, isLoading: tokensLoading } = useTokenSync();
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900">
        <CleanNavigation />
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <SparklesIcon className="w-20 h-20 mx-auto text-purple-400 mb-6" />
          <h1 className="text-4xl font-black text-white mb-4">Login Required</h1>
          <p className="text-gray-300 mb-8">Please sign in to create ad campaigns</p>
          <Link
            href="/auth/login"
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold px-8 py-4 rounded-xl transition-all duration-300 inline-block"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900">
      <CleanNavigation />
      
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Wallet Display */}
        <div className="mb-6">
          <PageWalletDisplay />
        </div>

        {/* Token Balance & Quick Links */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          <div className="lg:col-span-2 bg-gradient-to-br from-green-900/40 to-emerald-900/40 backdrop-blur-lg rounded-2xl p-6 border border-green-500/30">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white mb-2">💰 Your Token Balance</h3>
                <p className="text-gray-300 text-sm mb-3">
                  Use tokens to create and run ad campaigns. Minimum 50 tokens required.
                </p>
                <div className="flex gap-6">
                  <div>
                    <div className="text-3xl font-black text-green-400">{tokenBalance}</div>
                    <div className="text-xs text-gray-400">Total Tokens</div>
                  </div>
                  <div className="border-l border-white/20 pl-6">
                    <div className="text-lg font-bold text-blue-300">{purchasedTokens}</div>
                    <div className="text-xs text-gray-400">Purchased</div>
                  </div>
                  <div className="border-l border-white/20 pl-6">
                    <div className="text-lg font-bold text-yellow-300">{wonTokens}</div>
                    <div className="text-xs text-gray-400">Won</div>
                  </div>
                </div>
              </div>
              {tokenBalance < 50 && (
                <Link
                  href="/buy-tokens"
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold px-6 py-3 rounded-xl transition-all duration-300 shadow-lg"
                >
                  Buy More Tokens
                </Link>
              )}
            </div>
          </div>
          
          <Link
            href="/my-campaigns"
            className="bg-gradient-to-br from-purple-900/40 to-blue-900/40 backdrop-blur-lg rounded-2xl p-6 border border-purple-500/30 hover:border-purple-400/50 transition-all duration-300 group"
          >
            <ChartBarIcon className="w-12 h-12 text-purple-400 mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="text-xl font-bold text-white mb-1">View My Campaigns</h3>
            <p className="text-gray-300 text-sm mb-3">
              Track performance, token usage, and stats
            </p>
            <div className="flex items-center text-purple-400 font-semibold group-hover:translate-x-2 transition-transform">
              View Dashboard <ArrowRightIcon className="w-4 h-4 ml-2" />
            </div>
          </Link>
        </div>
        
        {/* Ad Banner (Show ads from other sellers) */}
        <AdBanner pageLocation="dashboard" position="top" />

        {!showForm ? (
          <>
            {/* Hero Section */}
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-3 bg-purple-500/20 border border-purple-500/30 rounded-full px-6 py-3 mb-6">
                <SparklesIcon className="w-6 h-6 text-purple-400" />
                <span className="text-purple-300 font-semibold">Advertising Platform</span>
              </div>
              
              <h1 className="text-5xl md:text-6xl font-black text-white mb-6">
                Reach <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">Thousands</span> of Active Gamers
              </h1>
              
              <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
                Promote your products to our engaged gaming community with token-based advertising—just like Etsy's seller fees
              </p>
              
              <button
                onClick={() => setShowForm(true)}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold px-12 py-5 rounded-2xl transition-all duration-300 shadow-2xl hover:shadow-3xl transform hover:scale-105 text-lg"
              >
                Create Your First Campaign
                <ArrowRightIcon className="inline w-6 h-6 ml-2" />
              </button>
            </div>

            {/* Features */}
            <div className="grid md:grid-cols-3 gap-8 mb-16">
              <div className="bg-white/5 backdrop-blur-lg rounded-3xl p-8 border border-white/10 hover:border-purple-500/50 transition-all">
                <div className="bg-gradient-to-br from-purple-500 to-blue-500 p-4 rounded-2xl w-fit mb-4">
                  <UserGroupIcon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Engaged Audience</h3>
                <p className="text-gray-300">
                  Connect with thousands of daily active users who play our skill-based games
                </p>
              </div>

              <div className="bg-white/5 backdrop-blur-lg rounded-3xl p-8 border border-white/10 hover:border-purple-500/50 transition-all">
                <div className="bg-gradient-to-br from-green-500 to-emerald-500 p-4 rounded-2xl w-fit mb-4">
                  <CurrencyDollarIcon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Token Payments</h3>
                <p className="text-gray-300">
                  Pay only for results: 1 token per 1,000 impressions, 5 tokens per click
                </p>
              </div>

              <div className="bg-white/5 backdrop-blur-lg rounded-3xl p-8 border border-white/10 hover:border-purple-500/50 transition-all">
                <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-4 rounded-2xl w-fit mb-4">
                  <ChartBarIcon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Real-Time Analytics</h3>
                <p className="text-gray-300">
                  Track impressions, clicks, and conversions with detailed campaign analytics
                </p>
              </div>
            </div>

            {/* Pricing */}
            <div className="bg-gradient-to-br from-purple-900/40 to-blue-900/40 backdrop-blur-lg rounded-3xl p-12 border border-purple-500/30 mb-16">
              <div className="text-center mb-8">
                <h2 className="text-4xl font-black text-white mb-4">Simple, Performance-Based Pricing</h2>
                <p className="text-gray-300 text-lg">Pay only for what you get—just like Etsy</p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                <div className="bg-white/10 rounded-2xl p-6 border border-white/20">
                  <div className="text-5xl font-black text-purple-400 mb-2">1</div>
                  <div className="text-gray-400 text-sm mb-3">TOKEN PER</div>
                  <div className="text-2xl font-bold text-white mb-2">1,000 Impressions</div>
                  <p className="text-gray-300 text-sm">Your ad shown to 1,000 users</p>
                </div>

                <div className="bg-white/10 rounded-2xl p-6 border border-white/20">
                  <div className="text-5xl font-black text-blue-400 mb-2">5</div>
                  <div className="text-gray-400 text-sm mb-3">TOKENS PER</div>
                  <div className="text-2xl font-bold text-white mb-2">Click</div>
                  <p className="text-gray-300 text-sm">User clicks through to your product</p>
                </div>
              </div>
            </div>

            {/* How It Works */}
            <div className="max-w-4xl mx-auto mb-16">
              <h2 className="text-4xl font-black text-white text-center mb-12">How It Works</h2>
              
              <div className="space-y-6">
                {[
                  { step: 1, title: 'Create Your Campaign', desc: 'Add headline, description, images, and set your token budget' },
                  { step: 2, title: 'Choose Your Pages', desc: 'Select where to show your ads: Games, Dashboard, Tournaments, etc.' },
                  { step: 3, title: 'Launch & Track', desc: 'Your ad goes live after admin approval. Monitor performance in real-time' },
                  { step: 4, title: 'Pay for Results', desc: 'Tokens are automatically deducted based on impressions and clicks' }
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-6 bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
                    <div className="bg-gradient-to-br from-purple-500 to-blue-500 text-white font-black text-2xl w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0">
                      {item.step}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                      <p className="text-gray-300">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="text-center">
              <button
                onClick={() => setShowForm(true)}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold px-12 py-5 rounded-2xl transition-all duration-300 shadow-2xl hover:shadow-3xl transform hover:scale-105 text-lg"
              >
                Get Started Now
                <ArrowRightIcon className="inline w-6 h-6 ml-2" />
              </button>
              
              <p className="text-gray-400 text-sm mt-4">
                Minimum budget: 50 tokens • Ads require admin approval
              </p>
            </div>
          </>
        ) : (
          <>
            <button
              onClick={() => setShowForm(false)}
              className="mb-6 text-gray-400 hover:text-white transition-colors flex items-center gap-2"
            >
              ← Back to Overview
            </button>
            <CreateAdCampaign />
          </>
        )}
      </div>
    </div>
  );
}
