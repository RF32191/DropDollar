'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ShoppingCartIcon, TrophyIcon, BanknotesIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

export default function PageWalletDisplay() {
  const { user, isLoading } = useAuth();

  // Debug logging
  console.log('💳 [PageWalletDisplay] Render:', {
    hasUser: !!user,
    isLoading,
    purchased: user?.purchased_tokens,
    won: user?.won_tokens
  });

  // Show skeleton during initial load (very brief)
  if (isLoading && !user) {
    console.log('💳 [PageWalletDisplay] Showing skeleton (loading...)');
    return (
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
        <div className="bg-gray-800/50 rounded-2xl p-6 h-32"></div>
        <div className="bg-gray-800/50 rounded-2xl p-6 h-32"></div>
        <div className="bg-gray-800/50 rounded-2xl p-6 h-32"></div>
      </div>
    );
  }

  if (!user) {
    console.log('💳 [PageWalletDisplay] No user, hiding wallet');
    return null;
  }

  const purchasedTokens = user.purchased_tokens || 0;
  const wonTokens = user.won_tokens || 0;
  const totalTokens = purchasedTokens + wonTokens;

  console.log('💳 [PageWalletDisplay] Displaying wallet:', { purchasedTokens, wonTokens, totalTokens });

  return (
    <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Total Balance */}
      <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 backdrop-blur-xl rounded-2xl p-6 border border-blue-500/30 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BanknotesIcon className="w-6 h-6 text-blue-400" />
            <span className="text-sm font-semibold text-blue-300 uppercase tracking-wide">Total Balance</span>
          </div>
        </div>
        <div className="text-4xl font-bold text-white mb-1">{totalTokens.toFixed(2)}</div>
        <div className="text-sm text-blue-300">Tokens Available</div>
      </div>

      {/* Purchased Tokens Wallet */}
      <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/40 backdrop-blur-xl rounded-2xl p-6 border border-blue-500/30 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShoppingCartIcon className="w-6 h-6 text-blue-400" />
            <span className="text-sm font-semibold text-blue-300 uppercase tracking-wide">Purchased Tokens</span>
          </div>
        </div>
        <div className="text-4xl font-bold text-blue-200 mb-1">{purchasedTokens.toFixed(2)}</div>
        <div className="text-xs text-blue-400 font-semibold bg-blue-900/40 rounded-lg px-2 py-1 inline-block">
          ❌ Non-Cashable • Game Use Only
        </div>
      </div>

      {/* Winnings Wallet - PROMINENT */}
      <div className="bg-gradient-to-br from-green-600/40 to-emerald-600/40 backdrop-blur-xl rounded-2xl p-6 border-2 border-green-400/50 shadow-xl hover:shadow-2xl transition-all duration-300 relative overflow-hidden group">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-400/10 to-emerald-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrophyIcon className="w-6 h-6 text-green-400 animate-pulse" />
              <span className="text-sm font-semibold text-green-300 uppercase tracking-wide">💰 Winnings Wallet</span>
            </div>
          </div>
          <div className="text-4xl font-bold text-green-100 mb-2">{wonTokens.toFixed(2)}</div>
          <div className="flex items-center justify-between">
            <div className="text-xs text-green-300 font-bold bg-green-900/40 rounded-lg px-2 py-1">
              ✅ CASHABLE
            </div>
            <Link 
              href="/cashout"
              className="text-xs text-green-200 hover:text-green-100 font-bold underline hover:scale-105 transition-transform"
            >
              Withdraw to Bank →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

