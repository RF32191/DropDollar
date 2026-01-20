'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import StripeSyncButton from './StripeSyncButton';

interface PurchaseRecord {
  id: string;
  transaction_type: string;
  amount: number;
  tokens_received: number;
  description: string;
  status: string;
  created_at: string;
  payment_method: string | null;
  stripe_payment_intent_id: string | null;
}

interface TokenTransaction {
  id: string;
  amount: number;
  type: string;
  description: string;
  competition_type?: string;
  competition_id?: string;
  game_type?: string;
  tokens_won?: number;
  tokens_purchased?: number;
  metadata?: any;
  created_at: string;
}

export function PurchaseHistory() {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [transactions, setTransactions] = useState<TokenTransaction[]>([]);
  const [activeTab, setActiveTab] = useState<'purchases' | 'transactions'>('purchases');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Initial load
  useEffect(() => {
    if (user?.id) {
      loadPurchaseHistory();
      
      // Auto-sync from Stripe after initial load (with delay to not block UI)
      setTimeout(() => {
        autoSyncFromStripe();
      }, 2000);
    }
  }, [user?.id]);

  // Auto-sync purchases from Stripe if none found in database
  const autoSyncFromStripe = async () => {
    if (!user?.id || !user?.email) return;
    
    try {
      console.log('🔄 [PurchaseHistory] Auto-checking Stripe for missing purchases...');
      
      // Check if we need to sync
      const checkResponse = await fetch(`/api/stripe/sync-purchases?userId=${user.id}`);
      const checkData = await checkResponse.json();
      
      if (checkData.needsSync && checkData.missingInDatabase > 0) {
        console.log(`⚠️ [PurchaseHistory] Found ${checkData.missingInDatabase} missing purchases, auto-syncing...`);
        
        // Auto-sync missing purchases
        const syncResponse = await fetch('/api/stripe/sync-purchases', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
            userEmail: user.email
          })
        });
        
        const syncData = await syncResponse.json();
        
        if (syncData.success && syncData.stats.newlySynced > 0) {
          console.log(`✅ [PurchaseHistory] Auto-synced ${syncData.stats.newlySynced} purchases from Stripe!`);
          
          // Reload purchase history to show new data
          setTimeout(() => {
            loadPurchaseHistory();
          }, 1000);
        }
      } else {
        console.log('✅ [PurchaseHistory] All Stripe purchases are already synced');
      }
    } catch (error) {
      console.error('❌ [PurchaseHistory] Auto-sync failed:', error);
      // Don't block the UI if auto-sync fails
    }
  };

  // Auto-refresh every 5 seconds for recent purchases
  useEffect(() => {
    if (!user?.id) return;

    console.log('✅ [PurchaseHistory] Auto-refresh enabled - will update every 5 seconds');
    
    const intervalId = setInterval(() => {
      console.log('🔄 [PurchaseHistory] Auto-refreshing transaction history...');
      loadPurchaseHistory();
    }, 5000); // 5 seconds

    return () => clearInterval(intervalId);
  }, [user?.id]);

  const loadPurchaseHistory = async (isManualRefresh = false) => {
    if (!user?.id) return;

    // Only show main loading spinner on initial load, not on refresh
    if (!isManualRefresh && (purchases.length === 0 && transactions.length === 0)) {
      setLoading(true);
    }
    if (isManualRefresh) {
      setIsRefreshing(true);
    }
    setError(null);

    try {
      const supabase = createClient();

      console.log('🔄 [PurchaseHistory] Loading transaction history for user:', user.id);

      // Load purchase history
      const { data: purchaseData, error: purchaseError } = await supabase
        .rpc('get_user_purchase_history', { user_id_param: user.id });

      if (purchaseError) {
        console.error('❌ [PurchaseHistory] Error loading purchase history:', purchaseError);
        setError('Failed to load purchase history');
      } else {
        console.log(`✅ [PurchaseHistory] Loaded ${purchaseData?.length || 0} purchases`);
        setPurchases(purchaseData || []);
      }

      // Load token transaction history - USE NEW COMPREHENSIVE FUNCTION
      const { data: transactionData, error: transactionError } = await supabase
        .rpc('get_user_all_transactions', { user_id_param: user.id });

      if (transactionError) {
        console.error('❌ [PurchaseHistory] Error loading transaction history:', transactionError);
        console.error('❌ [PurchaseHistory] Error details:', transactionError.message, transactionError.hint);
      } else {
        console.log(`✅ [PurchaseHistory] Loaded ${transactionData?.length || 0} transactions`);
        setTransactions(transactionData || []);
      }
    } catch (err: any) {
      console.error('❌ [PurchaseHistory] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Manual refresh handler
  const handleRefresh = () => {
    console.log('🔄 [PurchaseHistory] Manual refresh triggered');
    loadPurchaseHistory(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'purchase':
      case 'token_purchase':
        return 'text-green-400';
      case 'game_win':
      case 'earning':
        return 'text-yellow-400';
      case 'entry_fee':
        return 'text-red-400';
      case 'refund':
        return 'text-blue-400';
      default:
        return 'text-gray-400';
    }
  };

  const getTransactionTypeIcon = (type: string) => {
    switch (type) {
      case 'purchase':
      case 'token_purchase':
        return '💳';
      case 'game_win':
      case 'earning':
        return '🏆';
      case 'entry_fee':
        return '🎮';
      case 'refund':
        return '↩️';
      default:
        return '💰';
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          <span className="ml-3 text-gray-400">Loading purchase history...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 p-6 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="text-3xl">💰</span>
              Purchase & Transaction History
            </h2>
            <p className="text-gray-400 mt-1">View all your purchases and token movements</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-white font-semibold transition-colors"
          >
            <span className={isRefreshing ? 'animate-spin' : ''}>🔄</span>
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => setActiveTab('purchases')}
          className={`flex-1 py-4 px-6 font-semibold transition-all ${
            activeTab === 'purchases'
              ? 'bg-purple-600/20 text-purple-400 border-b-2 border-purple-500'
              : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/30'
          }`}
        >
          💳 Purchases ({purchases.length})
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex-1 py-4 px-6 font-semibold transition-all ${
            activeTab === 'transactions'
              ? 'bg-purple-600/20 text-purple-400 border-b-2 border-purple-500'
              : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/30'
          }`}
        >
          📊 All Transactions ({transactions.length})
        </button>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Manual Refresh Button (Auto-sync happens in background) */}
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => {
              console.log('🔄 [PurchaseHistory] Manual refresh triggered');
              loadPurchaseHistory();
              autoSyncFromStripe();
            }}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh History
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {activeTab === 'purchases' && (
          <div className="space-y-3">
            {purchases.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 text-lg">No purchases yet</p>
                <p className="text-gray-500 text-sm mt-2">Your purchase history will appear here</p>
              </div>
            ) : (
              purchases.map((purchase) => (
                <div
                  key={purchase.id}
                  className="bg-gray-700/30 rounded-lg p-4 border border-gray-600/50 hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">💳</span>
                        <div>
                          <h3 className="text-white font-semibold">{purchase.description}</h3>
                          <p className="text-gray-400 text-sm mt-1">
                            {formatDate(purchase.created_at)}
                          </p>
                        </div>
                      </div>
                      {purchase.payment_method && (
                        <p className="text-gray-500 text-xs mt-2 ml-11">
                          Payment method: {purchase.payment_method}
                        </p>
                      )}
                      {purchase.stripe_payment_intent_id && (
                        <p className="text-gray-600 text-xs mt-1 ml-11 font-mono">
                          ID: {purchase.stripe_payment_intent_id.substring(0, 20)}...
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-green-400 font-bold text-lg">
                        +{purchase.tokens_received.toFixed(2)} tokens
                      </p>
                      <p className="text-gray-400 text-sm">
                        ${purchase.amount.toFixed(2)}
                      </p>
                      <span
                        className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${
                          purchase.status === 'completed'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}
                      >
                        {purchase.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="space-y-3">
            {transactions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 text-lg">No transactions yet</p>
                <p className="text-gray-500 text-sm mt-2">Your transaction history will appear here</p>
              </div>
            ) : (
              transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="bg-gray-700/30 rounded-lg p-4 border border-gray-600/50 hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getTransactionTypeIcon(transaction.type)}</span>
                        <div>
                          <h3 className="text-white font-semibold">{transaction.description}</h3>
                          <p className="text-gray-400 text-sm mt-1">
                            {formatDate(transaction.created_at)}
                          </p>
                          {/* Show game/competition details for entry fees and victories */}
                          {(transaction.type === 'entry_fee' || transaction.type === 'game_win') && transaction.game_type && (
                            <p className="text-gray-500 text-xs mt-1">
                              {transaction.game_type} • {transaction.competition_type || 'Competition'}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold text-lg ${getTransactionTypeColor(transaction.type)}`}>
                        {transaction.amount > 0 ? '+' : ''}{transaction.amount.toFixed(2)} tokens
                      </p>
                      <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${
                        transaction.type === 'purchase' || transaction.type === 'token_purchase' ? 'bg-green-500/20 text-green-400' :
                        transaction.type === 'game_win' || transaction.type === 'earning' ? 'bg-yellow-500/20 text-yellow-400' :
                        transaction.type === 'entry_fee' ? 'bg-red-500/20 text-red-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {transaction.type === 'token_purchase' ? 'purchase' : transaction.type}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

