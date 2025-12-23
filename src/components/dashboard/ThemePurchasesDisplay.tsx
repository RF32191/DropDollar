'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { SparklesIcon, CheckCircleIcon } from '@heroicons/react/24/solid';

interface Purchase {
  type: 'game' | 'site';
  game_id?: string;
  theme_id: string;
  rp_cost: number;
  purchased_at: string;
}

interface PurchasesData {
  success: boolean;
  game_themes: Purchase[];
  site_themes: Purchase[];
  total_game_purchases: number;
  total_site_purchases: number;
}

// Game names for display
const GAME_NAMES: { [key: string]: string } = {
  'laser-dodge': 'Laser Dodge',
  'blade-bounce': 'Blade Bounce',
  'dead-shot': 'Dead Shot',
  'lightning-maze': 'Lightning Maze',
  'flippy-coin': 'Flippy Coin',
  'parry-pro': 'Parry Pro',
  'click-draw': 'Click Draw',
  'cash-stack': 'Cash Stack',
  'penny-passer': 'Penny Passer',
  'neon-striker': 'Neon Striker',
  'falling-objects': 'Falling Objects',
  'quick-click': 'Quick Click',
  'color-sequence': 'Color Sequence',
};

// Theme display info
const THEME_INFO: { [key: string]: { name: string; icon: string; color: string } } = {
  halloween: { name: 'Halloween', icon: '🎃', color: 'from-orange-600 to-purple-600' },
  christmas: { name: 'Christmas', icon: '🎄', color: 'from-red-600 to-green-600' },
  standard: { name: 'Standard', icon: '🎮', color: 'from-purple-600 to-blue-600' },
};

export default function ThemePurchasesDisplay() {
  const [purchases, setPurchases] = useState<PurchasesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPurchases();
  }, []);

  const loadPurchases = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_all_user_purchases');

      if (rpcError) {
        console.error('Error loading purchases:', rpcError);
        setError('Failed to load purchases');
        return;
      }

      if (data?.success) {
        setPurchases(data);
      } else {
        setError(data?.error || 'Unknown error');
      }
    } catch (err) {
      console.error('Exception loading purchases:', err);
      setError('An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
        <div className="flex items-center gap-3 mb-4">
          <SparklesIcon className="w-6 h-6 text-purple-400 animate-pulse" />
          <span className="text-white">Loading purchases...</span>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-700/50 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  const totalPurchases = (purchases?.total_game_purchases || 0) + (purchases?.total_site_purchases || 0);

  if (totalPurchases === 0) {
    return (
      <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl">
            <SparklesIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">My Theme Purchases</h2>
            <p className="text-sm text-gray-400">Unlock premium themes with RP</p>
          </div>
        </div>
        <div className="text-center py-8 text-gray-400">
          <p className="mb-2">No premium themes purchased yet</p>
          <p className="text-sm">🎃 Halloween and 🎄 Christmas themes are available!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl">
          <SparklesIcon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">My Theme Purchases</h2>
          <p className="text-sm text-gray-400">
            {totalPurchases} theme{totalPurchases !== 1 ? 's' : ''} unlocked
          </p>
        </div>
      </div>

      {/* Site Themes */}
      {purchases?.site_themes && purchases.site_themes.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-3">Site-Wide Themes</h3>
          <div className="space-y-2">
            {purchases.site_themes.map((purchase, idx) => {
              const theme = THEME_INFO[purchase.theme_id] || THEME_INFO.standard;
              return (
                <div
                  key={`site-${idx}`}
                  className={`flex items-center justify-between p-3 rounded-lg bg-gradient-to-r ${theme.color} bg-opacity-20 border border-white/10`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{theme.icon}</span>
                    <div>
                      <p className="text-white font-semibold">{theme.name} Site Theme</p>
                      <p className="text-xs text-gray-300">All pages themed</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircleIcon className="w-5 h-5 text-green-400" />
                    <span className="text-xs text-gray-400">{formatDate(purchase.purchased_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Game Themes */}
      {purchases?.game_themes && purchases.game_themes.length > 0 && (
        <div>
          <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-3">Game Themes</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
            {purchases.game_themes.map((purchase, idx) => {
              const theme = THEME_INFO[purchase.theme_id] || THEME_INFO.standard;
              const gameName = GAME_NAMES[purchase.game_id || ''] || purchase.game_id;
              return (
                <div
                  key={`game-${idx}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 border border-white/5 hover:border-white/20 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{theme.icon}</span>
                    <div>
                      <p className="text-white font-medium">{gameName}</p>
                      <p className="text-xs text-gray-400">{theme.name} Theme</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-green-400" />
                    <span className="text-xs text-gray-500">{formatDate(purchase.purchased_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Total RP Spent */}
      <div className="mt-6 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Total RP Invested:</span>
          <span className="text-yellow-400 font-bold">
            {(
              (purchases?.game_themes?.reduce((sum, p) => sum + (p.rp_cost || 0), 0) || 0) +
              (purchases?.site_themes?.reduce((sum, p) => sum + (p.rp_cost || 0), 0) || 0)
            ).toLocaleString()} RP
          </span>
        </div>
      </div>
    </div>
  );
}

