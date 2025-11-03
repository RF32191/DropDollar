'use client';

import React, { useState } from 'react';

interface DualWalletDisplayProps {
  purchasedTokens: number;
  wonTokens: number;
  showDetails?: boolean; // Show expanded view
  size?: 'sm' | 'md' | 'lg';
}

export default function DualWalletDisplay({ 
  purchasedTokens, 
  wonTokens, 
  showDetails = false,
  size = 'md'
}: DualWalletDisplayProps) {
  const [expanded, setExpanded] = useState(showDetails);
  const totalTokens = purchasedTokens + wonTokens;

  // Size classes
  const sizeClasses = {
    sm: {
      container: 'text-xs p-2',
      total: 'text-sm',
      breakdown: 'text-xs',
      icon: 'text-sm'
    },
    md: {
      container: 'text-sm p-3',
      total: 'text-lg',
      breakdown: 'text-xs',
      icon: 'text-base'
    },
    lg: {
      container: 'text-base p-4',
      total: 'text-2xl',
      breakdown: 'text-sm',
      icon: 'text-xl'
    }
  };

  const classes = sizeClasses[size];

  return (
    <div 
      className={`bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-md border border-slate-700 rounded-xl ${classes.container} cursor-pointer hover:border-slate-600 transition-all duration-300 shadow-lg`}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Total Balance - Always Visible */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`${classes.icon}`}>💎</span>
          <div>
            <div className={`font-bold text-white ${classes.total}`}>
              {totalTokens.toFixed(2)} Tokens
            </div>
            {!expanded && (
              <div className={`text-gray-400 ${classes.breakdown}`}>
                Click for details
              </div>
            )}
          </div>
        </div>
        <button className="text-gray-400 hover:text-white transition-colors">
          {expanded ? '▲' : '▼'}
        </button>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-slate-700 space-y-2">
          
          {/* Purchased Tokens */}
          <div className="flex items-center justify-between bg-blue-900/30 rounded-lg p-2 border border-blue-700/50">
            <div className="flex items-center gap-2">
              <span className="text-blue-400">🛒</span>
              <div>
                <div className={`text-blue-300 font-semibold ${classes.breakdown}`}>
                  Purchased
                </div>
                <div className="text-gray-400 text-xs">
                  Non-cashable
                </div>
              </div>
            </div>
            <div className={`text-white font-bold ${classes.breakdown}`}>
              {purchasedTokens.toFixed(2)}
            </div>
          </div>

          {/* Won Tokens */}
          <div className="flex items-center justify-between bg-green-900/30 rounded-lg p-2 border border-green-700/50">
            <div className="flex items-center gap-2">
              <span className="text-green-400">🏆</span>
              <div>
                <div className={`text-green-300 font-semibold ${classes.breakdown}`}>
                  Won
                </div>
                <div className="text-gray-400 text-xs">
                  Cashable
                </div>
              </div>
            </div>
            <div className={`text-white font-bold ${classes.breakdown}`}>
              {wonTokens.toFixed(2)}
            </div>
          </div>

          {/* Spending Order Info */}
          <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-2 mt-2">
            <div className="flex items-start gap-2 text-xs text-yellow-200">
              <span className="text-yellow-400">ℹ️</span>
              <div>
                <strong>Spending Order:</strong> Purchased tokens are used first, 
                then won tokens. This maximizes your cashable balance.
              </div>
            </div>
          </div>

          {/* Cash Out Button (only if has won tokens) */}
          {wonTokens > 0 && (
            <button 
              className="w-full mt-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl text-sm"
              onClick={(e) => {
                e.stopPropagation(); // Prevent collapsing
                // Add cash out functionality
                console.log('Cash out clicked');
              }}
            >
              💵 Cash Out Won Tokens
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Compact version for header/navbar
export function CompactWalletDisplay({ purchasedTokens, wonTokens }: { purchasedTokens: number; wonTokens: number }) {
  const totalTokens = purchasedTokens + wonTokens;
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div 
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="flex items-center gap-2 bg-slate-800/80 backdrop-blur-md border border-slate-700 rounded-lg px-3 py-1.5 cursor-pointer hover:border-slate-600 transition-all">
        <span className="text-sm">💎</span>
        <span className="text-white font-bold text-sm">
          {totalTokens.toFixed(2)}
        </span>
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute top-full mt-2 right-0 z-50 bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl min-w-[200px]">
          <div className="text-xs space-y-2">
            <div className="flex justify-between items-center text-blue-300">
              <span>🛒 Purchased:</span>
              <span className="font-bold">{purchasedTokens.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-green-300">
              <span>🏆 Won:</span>
              <span className="font-bold">{wonTokens.toFixed(2)}</span>
            </div>
            <div className="pt-2 border-t border-slate-700 text-gray-400 text-xs">
              {wonTokens > 0 && (
                <span className="text-green-400">✓ Can cash out won tokens</span>
              )}
              {wonTokens === 0 && (
                <span className="text-gray-500">Win games to earn cashable tokens!</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

