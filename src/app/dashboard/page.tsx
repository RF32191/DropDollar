'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import PaymentModal from '@/components/payments/PaymentModal';
import TestimonialSubmissionForm from '@/components/dashboard/TestimonialSubmissionForm';

interface UserBalance {
  tokens: number;
  cash_balance: number;
  pending_earnings: number;
  total_spent: number;
  total_earned: number;
}

interface UserLevel {
  current_level: number;
  total_points: number;
  games_played: number;
  daily_games_played: number;
  best_score: number;
}

interface GameScore {
  id: string;
  game_type: string;
  score: number;
  listing_id?: string;
  tournament_id?: string;
  created_at: string;
}

interface Transaction {
  id: string;
  type: 'purchase' | 'earning' | 'withdrawal' | 'entry_fee';
  amount: number;
  description: string;
  status: 'completed' | 'pending' | 'failed';
  created_at: string;
}

interface BankAccount {
  id: string;
  account_type: 'checking' | 'savings';
  bank_name: string;
  last_four: string;
  is_verified: boolean;
  is_default: boolean;
}

export default function MoneyDashboard() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<UserBalance>({
    tokens: 0,
    cash_balance: 0,
    pending_earnings: 0,
    total_spent: 0,
    total_earned: 0
  });
  const [userLevel, setUserLevel] = useState<UserLevel>({
    current_level: 1,
    total_points: 0,
    games_played: 0,
    daily_games_played: 0,
    best_score: 0
  });
  const [gameScores, setGameScores] = useState<GameScore[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showAddTokensModal, setShowAddTokensModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState(0);
  const [tokenAmount, setTokenAmount] = useState(10);

  const [connectStatus, setConnectStatus] = useState<{
    hasAccount: boolean;
    isVerified: boolean;
    canReceivePayouts: boolean;
    onboardingUrl?: string;
  }>({
    hasAccount: false,
    isVerified: false,
    canReceivePayouts: false
  });

  useEffect(() => {
    if (user) {
      loadDashboardData();
      loadConnectStatus();
    }
  }, [user]);

  const loadConnectStatus = async () => {
    try {
      const response = await fetch(`/api/payments/connect?userId=${user?.id}`);
      const data = await response.json();
      
      if (data.success) {
        setConnectStatus({
          hasAccount: data.hasAccount,
          isVerified: data.isVerified,
          canReceivePayouts: data.canReceivePayouts,
          onboardingUrl: data.onboardingUrl
        });
      }
    } catch (error) {
      console.error('Error loading Connect status:', error);
    }
  };

  const handleLinkBankAccount = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/payments/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          email: user?.email,
          businessType: 'individual'
        })
      });

      const data = await response.json();
      
      if (data.success && data.onboardingUrl) {
        // Redirect to Stripe Connect onboarding
        window.location.href = data.onboardingUrl;
      } else {
        console.error('Failed to create Connect account:', data.error);
        alert(`Failed to link bank account: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error linking bank account:', error);
      alert('Failed to link bank account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load user balance
      const { data: balanceData, error: balanceError } = await supabase
        .from('user_balances')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (balanceData) {
        setBalance(balanceData);
      }

      // Load user level and DropPoints
      const { data: levelData, error: levelError } = await supabase
        .from('user_levels')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (levelData) {
        setUserLevel(levelData);
      }

      // Load recent game scores
      const { data: scoresData, error: scoresError } = await supabase
        .from('game_scores')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (scoresData) {
        setGameScores(scoresData);
      }

      // Load recent transactions
      const { data: transactionData, error: transactionError } = await supabase
        .from('user_transactions')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (transactionData) {
        setTransactions(transactionData);
      }

      // Load bank accounts
      const { data: bankData, error: bankError } = await supabase
        .from('user_bank_accounts')
        .select('*')
        .eq('user_id', user?.id);

      if (bankData) {
        setBankAccounts(bankData);
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!user || withdrawAmount <= 0 || withdrawAmount > balance.cash_balance) {
      alert('Invalid withdrawal amount');
      return;
    }

    if (bankAccounts.length === 0) {
      alert('Please add a bank account first');
      return;
    }

    try {
      // Create withdrawal request
      const { data, error } = await supabase
        .from('withdrawal_requests')
        .insert({
          user_id: user.id,
          amount: withdrawAmount,
          bank_account_id: bankAccounts.find(acc => acc.is_default)?.id || bankAccounts[0].id,
          status: 'pending'
        });

      if (error) throw error;

      alert(`Withdrawal request for $${withdrawAmount.toFixed(2)} submitted successfully! Processing time: 1-3 business days.`);
      setShowWithdrawModal(false);
      setWithdrawAmount(0);
      loadDashboardData(); // Refresh data

    } catch (error: any) {
      alert(`Withdrawal failed: ${error.message}`);
    }
  };

  const handleAddBankAccount = () => {
    // In production, this would integrate with Stripe Connect or Plaid
    const bankName = prompt('Enter your bank name:');
    const accountNumber = prompt('Enter your account number (last 4 digits will be stored):');
    
    if (bankName && accountNumber) {
      const mockAccount: BankAccount = {
        id: Date.now().toString(),
        account_type: 'checking',
        bank_name: bankName,
        last_four: accountNumber.slice(-4),
        is_verified: false,
        is_default: bankAccounts.length === 0
      };
      
      setBankAccounts([...bankAccounts, mockAccount]);
      alert('Bank account added! In production, this would require verification.');
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'purchase': return '🛒';
      case 'earning': return '💰';
      case 'withdrawal': return '🏦';
      case 'entry_fee': return '🎮';
      default: return '💳';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'pending': return 'text-yellow-600';
      case 'failed': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Sign In Required</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Please sign in to view your money dashboard</p>
          <Link href="/auth/login" className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center overflow-hidden">
                <img src="/DropCoin.png" alt="DropDollar Logo" className="w-full h-full object-contain" />
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">DropDollar</span>
            </Link>
            <nav className="flex items-center space-x-6">
              <Link href="/listings" className="text-gray-700 dark:text-gray-300 hover:text-green-600 font-medium">Browse</Link>
              <Link href="/games" className="text-gray-700 dark:text-gray-300 hover:text-green-600 font-medium">Games</Link>
              <Link href="/tournaments" className="text-gray-700 dark:text-gray-300 hover:text-green-600 font-medium">Tournaments</Link>
              <Link href="/dashboard" className="text-green-600 dark:text-green-400 font-bold">💰 Dashboard</Link>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Money Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Manage your tokens, earnings, and withdrawals</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-400">Loading dashboard...</span>
          </div>
        ) : (
          <>
            {/* Balance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Token Balance */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                    <span className="text-2xl">💎</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">DROP Tokens</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{balance.tokens.toLocaleString()}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddTokensModal(true)}
                  className="mt-4 w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg text-sm font-medium"
                >
                  Buy More Tokens
                </button>
              </div>

              {/* Cash Balance */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                    <span className="text-2xl">💰</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Cash Balance</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">${balance.cash_balance.toFixed(2)}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowWithdrawModal(true)}
                  disabled={balance.cash_balance <= 0}
                  className="mt-4 w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg text-sm font-medium"
                >
                  Withdraw Cash
                </button>
              </div>

              {/* DropPoints Level */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/50 rounded-lg">
                    <span className="text-2xl">🏆</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">DropPoints Level</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">Level {userLevel.current_level}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                    <span>{userLevel.total_points.toLocaleString()} points</span>
                    <span>{userLevel.games_played} games</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-orange-600 h-2 rounded-full" 
                      style={{ width: `${Math.min((userLevel.total_points % 1000) / 10, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Best Score */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                    <span className="text-2xl">⭐</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Best Score</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{userLevel.best_score.toFixed(2)}</p>
                  </div>
                </div>
                <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                  Daily games: {userLevel.daily_games_played}
                </p>
              </div>
            </div>

            {/* Game Scores & Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              {/* Recent Game Scores */}
              <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Game Scores</h3>
                </div>
                <div className="p-6">
                  {gameScores.length === 0 ? (
                    <div className="text-center py-8">
                      <span className="text-4xl mb-4 block">🎮</span>
                      <p className="text-gray-600 dark:text-gray-400">No game scores yet</p>
                      <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                        Play some games to see your scores here!
                      </p>
                      <Link href="/games" className="mt-4 inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
                        Play Games
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {gameScores.map((score) => (
                        <div key={score.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="flex items-center">
                            <span className="text-2xl mr-3">
                              {score.game_type === 'multi_target' ? '🎯' : 
                               score.game_type === 'falling_object' ? '💰' : 
                               score.game_type === 'color_sequence' ? '🌈' : '🎮'}
                            </span>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {score.game_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {new Date(score.created_at).toLocaleDateString()} at{' '}
                                {new Date(score.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg text-blue-600 dark:text-blue-400">
                              {score.score.toFixed(2)}
                            </p>
                            {score.listing_id && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">Listing</p>
                            )}
                            {score.tournament_id && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">Tournament</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Level Progress */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Level Progress</h3>
                </div>
                <div className="p-6">
                  <div className="text-center mb-6">
                    <div className="w-20 h-20 mx-auto bg-gradient-to-br from-orange-400 to-red-600 rounded-full flex items-center justify-center mb-4">
                      <span className="text-2xl font-bold text-white">{userLevel.current_level}</span>
                    </div>
                    <h4 className="text-xl font-bold text-gray-900 dark:text-white">Level {userLevel.current_level}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">DropPoints Player</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Points</span>
                        <span className="text-sm font-bold text-orange-600">{userLevel.total_points.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                        <div 
                          className="bg-orange-600 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${Math.min((userLevel.total_points % 1000) / 10, 100)}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {1000 - (userLevel.total_points % 1000)} points to next level
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{userLevel.games_played}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Total Games</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{userLevel.daily_games_played}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Today</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bank Accounts & Transactions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Bank Accounts */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Bank Account</h3>
                    {!connectStatus.hasAccount && (
                      <button
                        onClick={handleLinkBankAccount}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                      >
                        Link Bank Account
                      </button>
                    )}
                  </div>
                </div>
                <div className="p-6">
                  {!connectStatus.hasAccount ? (
                    <div className="text-center py-8">
                      <span className="text-4xl mb-4 block">🏦</span>
                      <p className="text-gray-600 dark:text-gray-400">No bank account linked</p>
                      <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                        Link your bank account to receive payouts from sales and tournament winnings
                      </p>
                      <button
                        onClick={handleLinkBankAccount}
                        className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium"
                      >
                        Get Started with Stripe Connect
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-center">
                          <span className="text-2xl mr-3">💳</span>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">Stripe Connect Account</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Professional payment processing
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {connectStatus.isVerified ? (
                            <span className="text-green-600 text-sm font-medium">✅ Verified & Active</span>
                          ) : (
                            <div className="text-right">
                              <span className="text-yellow-600 text-sm font-medium">⏳ Setup Required</span>
                              {connectStatus.onboardingUrl && (
                                <div className="mt-2">
                                  <a
                                    href={connectStatus.onboardingUrl}
                                    className="text-blue-600 hover:text-blue-700 text-sm underline"
                                  >
                                    Complete Setup
                                  </a>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {connectStatus.isVerified && connectStatus.canReceivePayouts && (
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                          <div className="flex items-center">
                            <span className="text-green-600 text-lg mr-2">🎉</span>
                            <div>
                              <p className="text-green-800 dark:text-green-200 font-medium">Ready for Payouts!</p>
                              <p className="text-green-700 dark:text-green-300 text-sm">
                                You can now receive payments from sales and tournament winnings directly to your bank account.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {!connectStatus.isVerified && (
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                          <div className="flex items-center">
                            <span className="text-yellow-600 text-lg mr-2">⚠️</span>
                            <div>
                              <p className="text-yellow-800 dark:text-yellow-200 font-medium">Verification Required</p>
                              <p className="text-yellow-700 dark:text-yellow-300 text-sm">
                                Complete your Stripe Connect setup to start receiving payouts. This includes identity verification and bank account details.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
            </div>

            {/* Testimonial Submission Form */}
            <div className="mb-8">
              <TestimonialSubmissionForm />
            </div>

            {/* Recent Transactions */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Transactions</h3>
                </div>
                <div className="p-6">
                  {transactions.length === 0 ? (
                    <div className="text-center py-8">
                      <span className="text-4xl mb-4 block">📊</span>
                      <p className="text-gray-600 dark:text-gray-400">No transactions yet</p>
                      <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                        Your transaction history will appear here
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {transactions.map((transaction) => (
                        <div key={transaction.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="flex items-center">
                            <span className="text-2xl mr-3">{getTransactionIcon(transaction.type)}</span>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{transaction.description}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {new Date(transaction.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold ${transaction.type === 'earning' ? 'text-green-600' : 'text-gray-900 dark:text-white'}`}>
                              {transaction.type === 'earning' ? '+' : '-'}${Math.abs(transaction.amount).toFixed(2)}
                            </p>
                            <p className={`text-sm ${getStatusColor(transaction.status)}`}>
                              {transaction.status}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Withdraw Cash</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Withdrawal Amount
              </label>
              <input
                type="number"
                min="1"
                max={balance.cash_balance}
                step="0.01"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Enter amount"
              />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Available: ${balance.cash_balance.toFixed(2)}
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 py-2 px-4 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleWithdraw}
                disabled={withdrawAmount <= 0 || withdrawAmount > balance.cash_balance}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg font-medium"
              >
                Withdraw
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Tokens Modal */}
      <PaymentModal
        isOpen={showAddTokensModal}
        onClose={() => setShowAddTokensModal(false)}
        amount={tokenAmount * 100} // Convert to cents
        title="Purchase DROP Tokens"
        description={`Add ${tokenAmount} DROP tokens to your account`}
        type="listing"
        metadata={{
          listingId: 'token-purchase',
          gameType: 'token-purchase',
          entryNumber: tokenAmount
        }}
        onSuccess={(paymentIntent) => {
          alert(`Successfully purchased ${tokenAmount} DROP tokens!`);
          setShowAddTokensModal(false);
          loadDashboardData();
        }}
        onError={(error) => {
          alert(`Token purchase failed: ${error}`);
        }}
      />
    </div>
  );
}