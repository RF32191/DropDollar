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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900">
        <CleanNavigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-white">
            <h1 className="text-3xl font-bold mb-4">Please Sign In</h1>
            <p className="text-gray-300 mb-6">You need to be signed in to view your rewards.</p>
            <Link href="/auth/login" className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg inline-block">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900">
      <CleanNavigation />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard" className="inline-flex items-center text-purple-300 hover:text-white mb-4">
            ← Back to Dashboard
          </Link>
          <h1 className="text-4xl font-black text-white mb-2 flex items-center gap-3">
            <GiftIcon className="w-10 h-10 text-yellow-400" />
            Rewards & Claim Center
          </h1>
          <p className="text-gray-300">View your Reward Points wallet and claim your rewards</p>
        </div>

        {isLoading ? (
          <div className="text-center text-white py-12">Loading rewards...</div>
        ) : (
          <div className="space-y-6">
            {/* RP Wallet Card */}
            <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 backdrop-blur-xl rounded-xl p-8 border-2 border-purple-500/50">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-black text-white mb-2 flex items-center gap-2">
                    <SparklesIcon className="w-8 h-8 text-yellow-400" />
                    Reward Points Wallet
                  </h2>
                  <p className="text-gray-300">Your current RP balance</p>
                </div>
                <div className="text-right">
                  <div className="text-5xl font-black text-yellow-400 mb-1">
                    {userXP?.reward_points?.toLocaleString() || 0}
                  </div>
                  <div className="text-purple-200 font-bold">RP</div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <Link
                  href="/rp-shop"
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg p-4 flex items-center justify-between text-white font-bold transition-all"
                >
                  <div className="flex items-center gap-3">
                    <ShoppingBagIcon className="w-6 h-6" />
                    <span>Visit RP Shop</span>
                  </div>
                  <ArrowRightIcon className="w-5 h-5" />
                </Link>
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="text-sm text-gray-300 mb-1">Earned This Week</div>
                  <div className="text-2xl font-bold text-green-400">
                    +{transactions
                      .filter(t => t.transaction_type === 'earned' && 
                        new Date(t.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
                      .reduce((sum, t) => sum + t.points_amount, 0)}
                  </div>
                </div>
              </div>
            </div>

            {/* Level Display */}
            {userXP && (
              <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <TrophyIcon className="w-6 h-6 text-yellow-400" />
                  Your Level & Rank
                </h3>
                <LevelDisplay xpData={userXP} showFullDetails={true} />
              </div>
            )}

            {/* Transaction History */}
            <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20">
              <h3 className="text-xl font-bold text-white mb-4">Recent RP Transactions</h3>
              {transactions.length === 0 ? (
                <div className="text-center text-gray-300 py-8">
                  <p>No transactions yet</p>
                  <p className="text-sm mt-2">Complete challenges to earn Reward Points!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="bg-black/20 rounded-lg p-4 flex items-center justify-between"
                    >
                      <div>
                        <div className="text-white font-bold">{transaction.description || 'Transaction'}</div>
                        <div className="text-sm text-gray-400">
                          {new Date(transaction.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div
                        className={`text-lg font-bold ${
                          transaction.points_amount > 0 ? 'text-green-400' : 'text-red-400'
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

