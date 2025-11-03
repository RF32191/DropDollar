'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { BanknotesIcon, ShoppingCartIcon, TrophyIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

export default function ProminentDualWallet() {
  const { user } = useAuth();

  if (!user) return null;

  const purchasedTokens = user.purchased_tokens || 0;
  const wonTokens = user.won_tokens || 0;
  const totalTokens = purchasedTokens + wonTokens;

  return (
    <div className="flex items-center gap-3">
      {/* Total Balance - Large Display */}
      <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 backdrop-blur-md border border-blue-500/30 rounded-xl px-4 py-2 shadow-lg">
        <div className="flex items-center gap-2">
          <BanknotesIcon className="w-5 h-5 text-blue-400" />
          <div>
            <div className="text-xs text-blue-300 font-semibold uppercase tracking-wide">Total</div>
            <div className="text-xl font-bold text-white">{totalTokens.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Purchased Tokens */}
      <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/40 backdrop-blur-md border border-blue-500/30 rounded-xl px-3 py-2 shadow-lg">
        <div className="flex items-center gap-2">
          <ShoppingCartIcon className="w-4 h-4 text-blue-400" />
          <div>
            <div className="text-[10px] text-blue-300 font-semibold uppercase">Purchased</div>
            <div className="text-sm font-bold text-blue-200">{purchasedTokens.toFixed(2)}</div>
            <div className="text-[9px] text-blue-400">Non-cashable</div>
          </div>
        </div>
      </div>

      {/* Won Tokens - PROMINENT */}
      <Link 
        href="/cashout"
        className="bg-gradient-to-br from-green-600/40 to-emerald-600/40 backdrop-blur-md border-2 border-green-400/50 rounded-xl px-3 py-2 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer group"
      >
        <div className="flex items-center gap-2">
          <TrophyIcon className="w-4 h-4 text-green-400 group-hover:animate-bounce" />
          <div>
            <div className="text-[10px] text-green-300 font-semibold uppercase">💰 Winnings</div>
            <div className="text-sm font-bold text-green-100">{wonTokens.toFixed(2)}</div>
            <div className="text-[9px] text-green-300 font-semibold">✅ Cashable → Bank</div>
          </div>
        </div>
      </Link>
    </div>
  );
}

// Compact version for smaller screens
export function CompactDualWallet() {
  const { user } = useAuth();

  if (!user) return null;

  const purchasedTokens = user.purchased_tokens || 0;
  const wonTokens = user.won_tokens || 0;
  const totalTokens = purchasedTokens + wonTokens;

  return (
    <div className="flex items-center gap-2">
      {/* Total */}
      <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg px-2 py-1">
        <div className="text-[10px] text-blue-300">Total</div>
        <div className="text-sm font-bold text-white">{totalTokens.toFixed(2)}</div>
      </div>

      {/* Purchased */}
      <div className="bg-blue-900/40 border border-blue-500/30 rounded-lg px-2 py-1">
        <div className="text-[9px] text-blue-400">🛒 Buy</div>
        <div className="text-xs font-bold text-blue-200">{purchasedTokens.toFixed(2)}</div>
      </div>

      {/* Won */}
      <Link 
        href="/cashout"
        className="bg-green-600/40 border-2 border-green-400/50 rounded-lg px-2 py-1 hover:scale-105 transition-all"
      >
        <div className="text-[9px] text-green-300 font-semibold">🏆 Win</div>
        <div className="text-xs font-bold text-green-100">{wonTokens.toFixed(2)}</div>
      </Link>
    </div>
  );
}

