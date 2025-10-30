'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
  balance_before: number;
  balance_after: number;
  description: string;
  created_at: string;
}

export function PurchaseHistory() {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [transactions, setTransactions] = useState<TokenTransaction[]>([]);
  const [activeTab, setActiveTab] = useState<'purchases' | 'transactions'>('purchases');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadPurchaseHistory();
    }
  }, [user?.id]);

  const loadPurchaseHistory = async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // Load purchase history
      const { data: purchaseData, error: purchaseError } = await supabase
        .rpc('get_user_purchase_history', { user_id_param: user.id });

      if (purchaseError) {
        console.error('Error loading purchase history:', purchaseError);
        setError('Failed to load purchase history');
      } else {
        setPurchases(purchaseData || []);
      }

      // Load token transaction history
      const { data: transactionData, error: transactionError } = await supabase
        .rpc('get_user_token_history', { user_id_param: user.id });

      if (transactionError) {
        console.error('Error loading transaction history:', transactionError);
      } else {
        setTransactions(transactionData || []);
      }
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
        return 'text-green-400';
      case 'game_win':
        return 'text-yellow-400';
      case 'game_loss':
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
        return '💳';
      case 'game_win':
        return '🏆';
      case 'game_loss':
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
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <span className="text-3xl">💰</span>
          Purchase & Transaction History
        </h2>
        <p className="text-gray-400 mt-1">View all your purchases and token movements</p>
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
                        </div>
                      </div>
                      <div className="ml-11 mt-2 flex items-center gap-4 text-xs text-gray-500">
                        <span>Before: {transaction.balance_before.toFixed(2)}</span>
                        <span>→</span>
                        <span>After: {transaction.balance_after.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold text-lg ${getTransactionTypeColor(transaction.type)}`}>
                        {transaction.amount > 0 ? '+' : ''}{transaction.amount.toFixed(2)} tokens
                      </p>
                      <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${
                        transaction.type === 'purchase' ? 'bg-green-500/20 text-green-400' :
                        transaction.type === 'game_win' ? 'bg-yellow-500/20 text-yellow-400' :
                        transaction.type === 'game_loss' ? 'bg-red-500/20 text-red-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {transaction.type}
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

