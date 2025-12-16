'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { XPService } from '@/lib/supabase/xpService';
import { supabase } from '@/lib/supabase/client';
import CleanNavigation from '@/components/navigation/CleanNavigation';
import Link from 'next/link';
import { SparklesIcon, GiftIcon, TrophyIcon, ArrowRightIcon, ShoppingBagIcon } from '@heroicons/react/24/outline';
import LevelDisplay from '@/components/xp/LevelDisplay';

interface RewardPointsTransaction {
  id: string;
  points_amount: number;
  transaction_type: string;
  description: string | null;
  created_at: string;
}

export default function RewardsPage() {
  const { user, isAuthenticated } = useAuth();
  const [userXP, setUserXP] = useState<any>(null);
  const [transactions, setTransactions] = useState<RewardPointsTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadRewardsData();
    }
  }, [isAuthenticated, user]);

  // Generate animated floating particles
  useEffect(() => {
    const particlesContainer = document.getElementById('rewards-particles');
    if (!particlesContainer) return;

    const particleCount = 50;
    const particles: HTMLDivElement[] = [];

    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'rewards-particle';
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.top = `${Math.random() * 100}%`;
      particle.style.animationDelay = `${Math.random() * 5}s`;
      particle.style.animationDuration = `${10 + Math.random() * 20}s`;
      particlesContainer.appendChild(particle);
      particles.push(particle);
    }

    return () => {
      particles.forEach(p => p.remove());
    };
  }, []);

  const loadRewardsData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const [xpData, transactionsData] = await Promise.all([
        XPService.getUserXP(user.id),
        supabase
          .from('reward_points_transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50)
      ]);

      if (xpData) {
        setUserXP(xpData);
      }

      if (transactionsData.data) {
        setTransactions(transactionsData.data);
      }
    } catch (error) {
      console.error('Error loading rewards data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 relative overflow-hidden">
        {/* Animated background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-1/2 right-1/4 w-80 h-80 bg-pink-500/25 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute bottom-1/4 left-1/2 w-72 h-72 bg-indigo-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>
        <CleanNavigation />
        <div className="container mx-auto px-4 py-8 relative z-10">
          <div className="text-center text-white">
            <h1 className="text-3xl font-bold mb-4">Please Sign In</h1>
            <p className="text-gray-300 mb-6">You need to be signed in to view your rewards.</p>
            <Link href="/auth/login" className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg inline-block transition-all hover:scale-105">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 via-pink-900 to-indigo-900 relative overflow-hidden">
      {/* Animated gradient background layers */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Base gradient layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/80 via-pink-900/60 to-indigo-900/80"></div>
        
        {/* Animated glowing orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-purple-500/40 to-pink-500/40 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 right-1/4 w-80 h-80 bg-gradient-to-r from-pink-500/35 to-yellow-500/35 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-1/4 left-1/2 w-72 h-72 bg-gradient-to-r from-indigo-500/40 to-purple-500/40 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/3 right-1/3 w-64 h-64 bg-gradient-to-r from-yellow-500/30 to-pink-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }}></div>
        <div className="absolute bottom-1/3 left-1/6 w-88 h-88 bg-gradient-to-r from-purple-500/35 to-indigo-500/35 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }}></div>
        
        {/* Floating particles */}
        <div id="rewards-particles" className="absolute inset-0"></div>
      </div>

      <CleanNavigation currentPage="/rewards" />
      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Header with animated glow */}
        <div className="mb-8 relative">
          <Link href="/dashboard" className="inline-flex items-center text-purple-300 hover:text-white mb-4 transition-all hover:scale-105">
            ← Back to Dashboard
          </Link>
          <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-400 to-purple-400 mb-2 flex items-center gap-3 animate-pulse">
            <GiftIcon className="w-12 h-12 text-yellow-400 animate-bounce" />
            Rewards & Claim Center
          </h1>
          <p className="text-purple-200 text-lg">View your Reward Points wallet and claim your rewards</p>
        </div>

        {isLoading ? (
          <div className="text-center text-white py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            <p className="mt-4 text-purple-200">Loading rewards...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* RP Wallet Card - Enhanced with animations */}
            <div className="bg-gradient-to-r from-purple-600/30 via-pink-600/30 to-indigo-600/30 backdrop-blur-xl rounded-2xl p-8 border-2 border-purple-400/50 shadow-2xl relative overflow-hidden group hover:scale-105 transition-all duration-300">
              {/* Animated border glow */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/50 via-pink-500/50 to-purple-500/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl"></div>
              
              {/* Sparkle effects */}
              <div className="absolute top-4 right-4 w-2 h-2 bg-yellow-400 rounded-full animate-ping"></div>
              <div className="absolute top-8 right-12 w-1.5 h-1.5 bg-pink-400 rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
              <div className="absolute bottom-4 left-4 w-2 h-2 bg-purple-400 rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
              
              <div className="flex items-center justify-between mb-6 relative z-10">
                <div>
                  <h2 className="text-3xl font-black text-white mb-2 flex items-center gap-2">
                    <SparklesIcon className="w-10 h-10 text-yellow-400 animate-spin-slow" />
                    Reward Points Wallet
                  </h2>
                  <p className="text-purple-200">Your current RP balance</p>
                </div>
                <div className="text-right">
                  <div className="text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-400 to-purple-400 mb-1 animate-pulse">
                    {userXP?.reward_points?.toLocaleString() || 0}
                  </div>
                  <div className="text-purple-200 font-bold text-xl">RP</div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-6 relative z-10">
                <Link
                  href="/rp-shop"
                  className="bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 hover:from-purple-700 hover:via-pink-700 hover:to-purple-700 rounded-xl p-5 flex items-center justify-between text-white font-bold transition-all hover:scale-105 shadow-lg hover:shadow-2xl relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                  <div className="flex items-center gap-3 relative z-10">
                    <ShoppingBagIcon className="w-7 h-7 animate-bounce" />
                    <span className="text-lg">Visit RP Shop</span>
                  </div>
                  <ArrowRightIcon className="w-6 h-6 relative z-10 group-hover:translate-x-2 transition-transform" />
                </Link>
                <div className="bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-xl rounded-xl p-5 border border-white/30 shadow-lg">
                  <div className="text-sm text-purple-200 mb-2">Earned This Week</div>
                  <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">
                    +{transactions
                      .filter(t => t.transaction_type === 'earned' && 
                        new Date(t.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
                      .reduce((sum, t) => sum + t.points_amount, 0)}
                  </div>
                </div>
              </div>
            </div>

            {/* Level Display - Enhanced */}
            {userXP && (
              <div className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-xl rounded-2xl p-6 border-2 border-purple-400/30 shadow-xl hover:scale-105 transition-all duration-300">
                <h3 className="text-2xl font-black text-white mb-4 flex items-center gap-2">
                  <TrophyIcon className="w-8 h-8 text-yellow-400 animate-pulse" />
                  Your Level & Rank
                </h3>
                <LevelDisplay xpData={userXP} showFullDetails={true} />
              </div>
            )}

            {/* Transaction History - Enhanced */}
            <div className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-xl rounded-2xl p-6 border-2 border-purple-400/30 shadow-xl">
              <h3 className="text-2xl font-black text-white mb-4 flex items-center gap-2">
                <SparklesIcon className="w-6 h-6 text-yellow-400" />
                Recent RP Transactions
              </h3>
              {transactions.length === 0 ? (
                <div className="text-center text-purple-200 py-12">
                  <GiftIcon className="w-16 h-16 mx-auto mb-4 text-purple-400 animate-bounce" />
                  <p className="text-xl font-bold mb-2">No transactions yet</p>
                  <p className="text-sm">Complete challenges to earn Reward Points!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((transaction, index) => (
                    <div
                      key={transaction.id}
                      className="bg-gradient-to-r from-black/30 to-black/10 backdrop-blur-xl rounded-xl p-5 flex items-center justify-between border border-white/10 hover:border-purple-400/50 transition-all hover:scale-105 shadow-lg"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div>
                        <div className="text-white font-bold text-lg">{transaction.description || 'Transaction'}</div>
                        <div className="text-sm text-purple-200">
                          {new Date(transaction.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div
                        className={`text-2xl font-black ${
                          transaction.points_amount > 0 
                            ? 'text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400' 
                            : 'text-red-400'
                        }`}
                      >
                        {transaction.points_amount > 0 ? '+' : ''}
                        {transaction.points_amount} RP
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
