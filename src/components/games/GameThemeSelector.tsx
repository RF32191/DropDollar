'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { GameTheme, THEME_INFO, THEME_PRICES, getSavedTheme, saveTheme, getOwnedThemesForGame } from '@/lib/gameThemes';
import { supabase } from '@/lib/supabase/client';
import { LockClosedIcon, CheckCircleIcon, SparklesIcon } from '@heroicons/react/24/solid';

interface GameThemeSelectorProps {
  gameId: string;
  gameName: string;
  currentTheme: GameTheme;
  onThemeChange: (theme: GameTheme) => void;
  compact?: boolean;
}

export default function GameThemeSelector({ 
  gameId,
  gameName,
  currentTheme, 
  onThemeChange,
  compact = false 
}: GameThemeSelectorProps) {
  const [ownedThemes, setOwnedThemes] = useState<Set<GameTheme>>(new Set(['standard']));
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [userRP, setUserRP] = useState(0);
  const [purchaseTheme, setPurchaseTheme] = useState<GameTheme | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);

  // Load owned themes on mount
  const loadOwnedThemes = useCallback(async () => {
    setIsLoading(true);
    try {
      // Get user RP balance
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: xpData } = await supabase
          .from('user_xp')
          .select('reward_points')
          .eq('user_id', user.id)
          .single();
        
        if (xpData) {
          setUserRP(xpData.reward_points || 0);
        }
      }

      // Get owned themes
      const owned = await getOwnedThemesForGame(gameId);
      setOwnedThemes(owned);

      // Validate current theme is owned, otherwise reset to standard
      if (!owned.has(currentTheme)) {
        onThemeChange('standard');
      }
    } catch (e) {
      console.error('Error loading themes:', e);
    } finally {
      setIsLoading(false);
    }
  }, [gameId, currentTheme, onThemeChange]);

  useEffect(() => {
    loadOwnedThemes();
  }, [loadOwnedThemes]);

  const handleThemeClick = (theme: GameTheme) => {
    if (ownedThemes.has(theme)) {
      // Theme is owned, select it
      onThemeChange(theme);
      saveTheme(theme, ownedThemes);
    } else {
      // Theme is locked, open purchase dialog
      setPurchaseTheme(theme);
      setPurchaseError(null);
      setPurchaseSuccess(false);
    }
  };

  const handlePurchase = async () => {
    if (!purchaseTheme) return;

    setIsPurchasing(true);
    setPurchaseError(null);

    try {
      const price = THEME_PRICES[purchaseTheme];
      
      if (userRP < price) {
        setPurchaseError(`Need ${price - userRP} more RP`);
        setIsPurchasing(false);
        return;
      }

      const { data, error } = await supabase.rpc('purchase_game_theme', {
        p_game_id: gameId,
        p_theme_id: purchaseTheme,
        p_rp_cost: price
      });

      if (error) {
        setPurchaseError(error.message);
        setIsPurchasing(false);
        return;
      }

      if (data?.success) {
        // Update local state
        setOwnedThemes(prev => new Set([...prev, purchaseTheme]));
        setUserRP(prev => prev - price);
        setPurchaseSuccess(true);
        
        // Select the newly purchased theme
        setTimeout(() => {
          onThemeChange(purchaseTheme);
          saveTheme(purchaseTheme, new Set([...ownedThemes, purchaseTheme]));
          setPurchaseTheme(null);
          setPurchaseSuccess(false);
        }, 1500);
      } else {
        setPurchaseError(data?.error || 'Purchase failed');
      }
    } catch (e) {
      setPurchaseError('An error occurred');
    } finally {
      setIsPurchasing(false);
    }
  };

  // Compact version for game instructions
  if (compact) {
    return (
      <div className="flex flex-col items-center gap-2 w-full">
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
          <SparklesIcon className="w-4 h-4" />
          <span>Game Theme</span>
          <span className="text-yellow-400 text-xs">({userRP.toLocaleString()} RP)</span>
        </div>
        <div className="flex gap-2 flex-wrap justify-center">
          {(Object.keys(THEME_INFO) as GameTheme[]).map((theme) => {
            const isOwned = ownedThemes.has(theme);
            const isSelected = currentTheme === theme;
            const price = THEME_PRICES[theme];
            
            return (
              <button
                key={theme}
                onClick={() => handleThemeClick(theme)}
                disabled={isLoading}
                className={`relative px-3 py-2 rounded-lg font-bold text-sm transition-all ${
                  isSelected
                    ? theme === 'standard' 
                      ? 'bg-blue-500 text-white ring-2 ring-white'
                      : theme === 'halloween'
                      ? 'bg-gradient-to-r from-orange-600 to-purple-700 text-white ring-2 ring-orange-300'
                      : 'bg-gradient-to-r from-red-600 to-green-700 text-white ring-2 ring-green-300'
                    : isOwned
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-800 text-gray-500 hover:bg-gray-700 border border-yellow-500/50'
                }`}
              >
                {THEME_INFO[theme].emoji} {THEME_INFO[theme].name}
                {!isOwned && (
                  <span className="absolute -top-2 -right-2 bg-yellow-500 text-black text-xs px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                    <LockClosedIcon className="w-3 h-3" />
                    {price}
                  </span>
                )}
                {isSelected && isOwned && (
                  <CheckCircleIcon className="absolute -top-1 -right-1 w-4 h-4 text-green-400" />
                )}
              </button>
            );
          })}
        </div>

        {/* Purchase Modal */}
        {purchaseTheme && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
            <div className={`w-full max-w-sm rounded-2xl p-6 border-2 ${
              purchaseTheme === 'halloween' 
                ? 'bg-gradient-to-br from-orange-900 to-purple-900 border-orange-500'
                : 'bg-gradient-to-br from-red-900 to-green-900 border-red-500'
            }`}>
              {purchaseSuccess ? (
                <div className="text-center py-4">
                  <CheckCircleIcon className="w-16 h-16 text-green-400 mx-auto mb-4" />
                  <p className="text-xl font-bold text-white">Unlocked! 🎉</p>
                </div>
              ) : (
                <>
                  <div className="text-center mb-4">
                    <span className="text-5xl">{THEME_INFO[purchaseTheme].emoji}</span>
                    <h3 className="text-xl font-bold text-white mt-2">
                      Unlock {THEME_INFO[purchaseTheme].name} Theme
                    </h3>
                    <p className="text-gray-300 text-sm mt-1">for {gameName}</p>
                  </div>

                  <div className="bg-black/30 rounded-lg p-3 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Price:</span>
                      <span className="text-yellow-400 font-bold">{THEME_PRICES[purchaseTheme]} RP</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-400">Your Balance:</span>
                      <span className={`font-bold ${userRP >= THEME_PRICES[purchaseTheme] ? 'text-green-400' : 'text-red-400'}`}>
                        {userRP.toLocaleString()} RP
                      </span>
                    </div>
                  </div>

                  {purchaseError && (
                    <div className="bg-red-500/20 border border-red-500 rounded-lg p-2 mb-4 text-center text-red-400 text-sm">
                      {purchaseError}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => setPurchaseTheme(null)}
                      className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handlePurchase}
                      disabled={isPurchasing || userRP < THEME_PRICES[purchaseTheme]}
                      className={`flex-1 py-2 rounded-lg font-bold flex items-center justify-center gap-2 ${
                        userRP >= THEME_PRICES[purchaseTheme]
                          ? 'bg-yellow-500 hover:bg-yellow-400 text-black'
                          : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {isPurchasing ? (
                        <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      ) : (
                        <>
                          <LockClosedIcon className="w-4 h-4" />
                          Unlock
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full version
  return (
    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-600 w-full max-w-md">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <SparklesIcon className="w-5 h-5 text-purple-400" />
          Choose Your Theme
        </h3>
        <span className="bg-yellow-500/20 text-yellow-400 text-xs font-bold px-2 py-1 rounded-full">
          {userRP.toLocaleString()} RP
        </span>
      </div>
      <p className="text-xs text-gray-400 text-center mb-4">
        Standard is FREE • Premium themes cost RP
      </p>
      
      <div className="grid grid-cols-3 gap-2 mb-4">
        {(Object.keys(THEME_INFO) as GameTheme[]).map((theme) => {
          const isOwned = ownedThemes.has(theme);
          const isSelected = currentTheme === theme;
          const price = THEME_PRICES[theme];
          
          return (
            <button
              key={theme}
              onClick={() => handleThemeClick(theme)}
              disabled={isLoading}
              className={`relative p-3 rounded-lg transition-all flex flex-col items-center gap-1 ${
                isSelected
                  ? theme === 'standard' 
                    ? 'bg-gradient-to-br from-blue-500 to-cyan-500 ring-2 ring-white'
                    : theme === 'halloween'
                    ? 'bg-gradient-to-br from-orange-600 to-purple-800 ring-2 ring-orange-300'
                    : 'bg-gradient-to-br from-red-600 to-green-700 ring-2 ring-white'
                  : isOwned
                  ? 'bg-gray-700 hover:bg-gray-600'
                  : 'bg-gray-800 hover:bg-gray-700 border-2 border-dashed border-yellow-500/50'
              }`}
            >
              <span className={`text-2xl ${!isOwned ? 'opacity-60' : ''}`}>
                {THEME_INFO[theme].emoji}
              </span>
              <span className="text-xs font-bold text-white">{THEME_INFO[theme].name}</span>
              
              {!isOwned && (
                <div className="absolute -top-2 -right-2 bg-yellow-500 text-black text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <LockClosedIcon className="w-3 h-3" />
                  {price}
                </div>
              )}
              
              {isSelected && isOwned && (
                <CheckCircleIcon className="absolute -top-1 -right-1 w-5 h-5 text-green-400" />
              )}
            </button>
          );
        })}
      </div>
      
      <div className="text-center text-xs text-gray-500">
        {ownedThemes.size === 1 
          ? '🔒 Unlock premium themes with RP!' 
          : `✅ You own ${ownedThemes.size} theme${ownedThemes.size > 1 ? 's' : ''}`
        }
      </div>

      {/* Purchase Modal - Same as compact version */}
      {purchaseTheme && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className={`w-full max-w-sm rounded-2xl p-6 border-2 ${
            purchaseTheme === 'halloween' 
              ? 'bg-gradient-to-br from-orange-900 to-purple-900 border-orange-500'
              : 'bg-gradient-to-br from-red-900 to-green-900 border-red-500'
          }`}>
            {purchaseSuccess ? (
              <div className="text-center py-4">
                <CheckCircleIcon className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <p className="text-xl font-bold text-white">Unlocked! 🎉</p>
              </div>
            ) : (
              <>
                <div className="text-center mb-4">
                  <span className="text-5xl">{THEME_INFO[purchaseTheme].emoji}</span>
                  <h3 className="text-xl font-bold text-white mt-2">
                    Unlock {THEME_INFO[purchaseTheme].name} Theme
                  </h3>
                  <p className="text-gray-300 text-sm mt-1">for {gameName}</p>
                </div>

                <div className="bg-black/30 rounded-lg p-3 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Price:</span>
                    <span className="text-yellow-400 font-bold">{THEME_PRICES[purchaseTheme]} RP</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-400">Your Balance:</span>
                    <span className={`font-bold ${userRP >= THEME_PRICES[purchaseTheme] ? 'text-green-400' : 'text-red-400'}`}>
                      {userRP.toLocaleString()} RP
                    </span>
                  </div>
                </div>

                {purchaseError && (
                  <div className="bg-red-500/20 border border-red-500 rounded-lg p-2 mb-4 text-center text-red-400 text-sm">
                    {purchaseError}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => setPurchaseTheme(null)}
                    className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePurchase}
                    disabled={isPurchasing || userRP < THEME_PRICES[purchaseTheme]}
                    className={`flex-1 py-2 rounded-lg font-bold flex items-center justify-center gap-2 ${
                      userRP >= THEME_PRICES[purchaseTheme]
                        ? 'bg-yellow-500 hover:bg-yellow-400 text-black'
                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {isPurchasing ? (
                      <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    ) : (
                      <>
                        <LockClosedIcon className="w-4 h-4" />
                        Unlock
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
