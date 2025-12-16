'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ShoppingCartIcon, TrophyIcon, BanknotesIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

type WalletVariant = 'default' | 'hot-sell' | 'winner-takes-all' | '1v1' | 'coin-play';

interface PageWalletDisplayProps {
  variant?: WalletVariant;
}

export default function PageWalletDisplay({ variant = 'default' }: PageWalletDisplayProps) {
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

  // Define color schemes for each variant
  const colorSchemes = {
    'default': {
      total: { bg: 'from-blue-600/20 to-purple-600/20', border: 'border-blue-500/30', text: 'text-blue-300', icon: 'text-blue-400', value: 'text-white' },
      purchased: { bg: 'from-blue-900/40 to-blue-800/40', border: 'border-blue-500/30', text: 'text-blue-300', icon: 'text-blue-400', value: 'text-blue-200', badge: 'bg-blue-900/40 text-blue-400' },
      winnings: { bg: 'from-green-600/40 to-emerald-600/40', border: 'border-green-400/50', text: 'text-green-300', icon: 'text-green-400', value: 'text-green-100', badge: 'bg-green-900/40 text-green-300', glow: 'from-green-400/10 to-emerald-400/10' }
    },
    'hot-sell': {
      total: { bg: 'from-red-600/30 to-orange-600/30', border: 'border-red-500/40', text: 'text-red-300', icon: 'text-red-400', value: 'text-white' },
      purchased: { bg: 'from-orange-900/40 to-red-800/40', border: 'border-orange-500/40', text: 'text-orange-300', icon: 'text-orange-400', value: 'text-orange-200', badge: 'bg-orange-900/40 text-orange-400' },
      winnings: { bg: 'from-yellow-600/40 to-amber-600/40', border: 'border-yellow-400/50', text: 'text-yellow-300', icon: 'text-yellow-400', value: 'text-yellow-100', badge: 'bg-yellow-900/40 text-yellow-300', glow: 'from-yellow-400/10 to-amber-400/10' }
    },
    'winner-takes-all': {
      total: { bg: 'from-yellow-600/30 to-amber-600/30', border: 'border-yellow-500/40', text: 'text-yellow-300', icon: 'text-yellow-400', value: 'text-white' },
      purchased: { bg: 'from-amber-900/40 to-yellow-800/40', border: 'border-amber-500/40', text: 'text-amber-300', icon: 'text-amber-400', value: 'text-amber-200', badge: 'bg-amber-900/40 text-amber-400' },
      winnings: { bg: 'from-yellow-500/40 to-amber-600/40', border: 'border-yellow-400/50', text: 'text-yellow-300', icon: 'text-yellow-400', value: 'text-yellow-100', badge: 'bg-yellow-900/40 text-yellow-300', glow: 'from-yellow-400/10 to-amber-400/10' }
    },
    '1v1': {
      total: { bg: 'from-purple-600/30 to-indigo-600/30', border: 'border-purple-500/40', text: 'text-purple-300', icon: 'text-purple-400', value: 'text-white' },
      purchased: { bg: 'from-indigo-900/40 to-purple-800/40', border: 'border-indigo-500/40', text: 'text-indigo-300', icon: 'text-indigo-400', value: 'text-indigo-200', badge: 'bg-indigo-900/40 text-indigo-400' },
      winnings: { bg: 'from-cyan-600/40 to-blue-600/40', border: 'border-cyan-400/50', text: 'text-cyan-300', icon: 'text-cyan-400', value: 'text-cyan-100', badge: 'bg-cyan-900/40 text-cyan-300', glow: 'from-cyan-400/10 to-blue-400/10' }
    },
    'coin-play': {
      total: { bg: 'from-amber-600/40 to-orange-600/40', border: 'border-amber-500/50', text: 'text-amber-200', icon: 'text-amber-300', value: 'text-white' },
      purchased: { bg: 'from-orange-900/50 to-amber-800/50', border: 'border-orange-500/50', text: 'text-orange-200', icon: 'text-orange-300', value: 'text-orange-100', badge: 'bg-orange-900/50 text-orange-300' },
      winnings: { bg: 'from-yellow-500/50 to-amber-600/50', border: 'border-yellow-400/60', text: 'text-yellow-200', icon: 'text-yellow-300', value: 'text-yellow-50', badge: 'bg-yellow-900/50 text-yellow-200', glow: 'from-yellow-400/20 to-amber-400/20' }
    }
  };

  const colors = colorSchemes[variant];

  // Enhanced animations for coin-play variant
  const isCoinPlay = variant === 'coin-play';
  
  return (
    <div className={`mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 ${isCoinPlay ? 'animate-pulse-slow' : ''}`}>
      {/* Total Balance */}
      <div className={`bg-gradient-to-br ${colors.total.bg} backdrop-blur-xl rounded-2xl p-6 border ${colors.total.border} shadow-lg hover:scale-105 transition-all duration-300 relative overflow-hidden group ${isCoinPlay ? 'animate-pulse-slow' : ''}`}>
        {/* Animated border glow */}
        <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${colors.total.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl ${isCoinPlay ? 'animate-pulse' : ''}`}></div>
        
        {/* Coin-play shimmer effect */}
        {isCoinPlay && (
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-yellow-400/20 to-transparent animate-shimmer"></div>
        )}
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BanknotesIcon className={`w-6 h-6 ${colors.total.icon} ${isCoinPlay ? 'animate-spin-slow' : 'animate-bounce'}`} />
              <span className={`text-sm font-semibold ${colors.total.text} uppercase tracking-wide`}>Total Balance</span>
            </div>
          </div>
          <div className={`text-4xl font-bold ${colors.total.value} mb-1 ${isCoinPlay ? 'drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]' : ''}`}>{totalTokens.toFixed(2)}</div>
          <div className={`text-sm ${colors.total.text}`}>Tokens Available</div>
        </div>
      </div>

      {/* Purchased Tokens Wallet */}
      <div className={`bg-gradient-to-br ${colors.purchased.bg} backdrop-blur-xl rounded-2xl p-6 border ${colors.purchased.border} shadow-lg hover:scale-105 transition-all duration-300 relative overflow-hidden group ${isCoinPlay ? 'animate-pulse-slow' : ''}`}>
        {/* Animated border glow */}
        <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${colors.purchased.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl ${isCoinPlay ? 'animate-pulse' : ''}`}></div>
        
        {/* Coin-play shimmer effect */}
        {isCoinPlay && (
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-orange-400/15 to-transparent animate-shimmer" style={{ animationDelay: '0.3s' }}></div>
        )}
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ShoppingCartIcon className={`w-6 h-6 ${colors.purchased.icon} ${isCoinPlay ? 'animate-spin-slow' : 'animate-pulse'}`} />
              <span className={`text-sm font-semibold ${colors.purchased.text} uppercase tracking-wide`}>Purchased Tokens</span>
            </div>
          </div>
          <div className={`text-4xl font-bold ${colors.purchased.value} mb-1 ${isCoinPlay ? 'drop-shadow-[0_0_6px_rgba(251,146,60,0.7)]' : ''}`}>{purchasedTokens.toFixed(2)}</div>
          <div className={`text-xs ${colors.purchased.badge} font-semibold rounded-lg px-2 py-1 inline-block`}>
            ❌ Non-Cashable • Game Use Only
          </div>
        </div>
      </div>

      {/* Winnings Wallet - PROMINENT */}
      <div className={`bg-gradient-to-br ${colors.winnings.bg} backdrop-blur-xl rounded-2xl p-6 border-2 ${colors.winnings.border} shadow-xl hover:shadow-2xl transition-all duration-300 relative overflow-hidden group ${isCoinPlay ? 'animate-pulse-slow' : ''}`}>
        {/* Glow effect */}
        <div className={`absolute inset-0 bg-gradient-to-br ${colors.winnings.glow || 'from-green-400/10 to-emerald-400/10'} ${isCoinPlay ? 'opacity-50 animate-pulse' : 'opacity-0 group-hover:opacity-100'} transition-opacity duration-300`}></div>
        
        {/* Coin-play shimmer effect */}
        {isCoinPlay && (
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-yellow-400/20 to-transparent animate-shimmer" style={{ animationDelay: '0.6s' }}></div>
        )}
        
        {/* Sparkle effects */}
        <div className={`absolute top-4 right-4 w-2 h-2 ${colors.winnings.icon.replace('text-', 'bg-')} rounded-full animate-ping`}></div>
        <div className={`absolute top-8 right-12 w-1.5 h-1.5 ${colors.winnings.icon.replace('text-', 'bg-')} rounded-full animate-ping`} style={{ animationDelay: '0.5s' }}></div>
        <div className={`absolute bottom-4 left-4 w-2 h-2 ${colors.winnings.icon.replace('text-', 'bg-')} rounded-full animate-ping`} style={{ animationDelay: '1s' }}></div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrophyIcon className={`w-6 h-6 ${colors.winnings.icon} ${isCoinPlay ? 'animate-spin-slow' : 'animate-pulse'}`} />
              <span className={`text-sm font-semibold ${colors.winnings.text} uppercase tracking-wide`}>💰 Winnings Wallet</span>
            </div>
          </div>
          <div className={`text-4xl font-bold ${colors.winnings.value} mb-2 ${isCoinPlay ? 'drop-shadow-[0_0_10px_rgba(251,191,36,0.9)]' : ''}`}>{wonTokens.toFixed(2)}</div>
          <div className="flex items-center justify-between">
            <div className={`text-xs ${colors.winnings.badge} font-bold rounded-lg px-2 py-1`}>
              ✅ CASHABLE
            </div>
            <Link 
              href="/cashout"
              className={`text-xs ${colors.winnings.text} hover:opacity-80 font-bold underline hover:scale-105 transition-transform`}
            >
              Withdraw to Bank →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

