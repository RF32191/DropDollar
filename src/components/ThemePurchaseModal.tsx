'use client';

import { useState } from 'react';
import { XMarkIcon, LockClosedIcon, CheckCircleIcon, SparklesIcon } from '@heroicons/react/24/outline';

interface Theme {
  id: string;
  name: string;
  price: number;
  icon: string;
  owned: boolean;
  canAfford: boolean;
  description?: string;
}

interface ThemePurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: Theme;
  userRP: number;
  onPurchase: () => Promise<{ success: boolean; error?: string }>;
  isPurchasing: boolean;
  type: 'game' | 'site';
  gameName?: string;
}

export default function ThemePurchaseModal({
  isOpen,
  onClose,
  theme,
  userRP,
  onPurchase,
  isPurchasing,
  type,
  gameName
}: ThemePurchaseModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handlePurchase = async () => {
    setError(null);
    const result = await onPurchase();
    
    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 1500);
    } else {
      setError(result.error || 'Purchase failed');
    }
  };

  const themeColors = {
    halloween: {
      bg: 'from-orange-900/90 via-purple-900/90 to-black/90',
      border: 'border-orange-500',
      accent: 'text-orange-400',
      button: 'from-orange-600 to-purple-600 hover:from-orange-500 hover:to-purple-500'
    },
    christmas: {
      bg: 'from-red-900/90 via-green-900/90 to-red-900/90',
      border: 'border-red-500',
      accent: 'text-red-400',
      button: 'from-red-600 to-green-600 hover:from-red-500 hover:to-green-500'
    },
    default: {
      bg: 'from-purple-900/90 via-blue-900/90 to-purple-900/90',
      border: 'border-purple-500',
      accent: 'text-purple-400',
      button: 'from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500'
    }
  };

  const colors = themeColors[theme.id as keyof typeof themeColors] || themeColors.default;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className={`relative w-full max-w-md bg-gradient-to-br ${colors.bg} rounded-2xl border-2 ${colors.border} shadow-2xl overflow-hidden`}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>

        {/* Header */}
        <div className="p-6 text-center border-b border-white/10">
          <div className="text-6xl mb-4">{theme.icon}</div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {theme.name} Theme
          </h2>
          {gameName && (
            <p className="text-gray-300 text-sm">for {gameName}</p>
          )}
          {type === 'site' && (
            <p className="text-gray-300 text-sm">Site-wide theme for all pages</p>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {success ? (
            <div className="text-center py-8">
              <CheckCircleIcon className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <p className="text-xl font-bold text-green-400">Purchase Successful!</p>
              <p className="text-gray-300 mt-2">Theme unlocked! Enjoy! 🎉</p>
            </div>
          ) : (
            <>
              {/* Price */}
              <div className="bg-black/30 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-300">Price:</span>
                  <span className={`text-xl font-bold ${colors.accent}`}>
                    {theme.price.toLocaleString()} RP
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Your Balance:</span>
                  <span className={`text-xl font-bold ${userRP >= theme.price ? 'text-green-400' : 'text-red-400'}`}>
                    {userRP.toLocaleString()} RP
                  </span>
                </div>
                {userRP < theme.price && (
                  <div className="mt-3 text-center">
                    <span className="text-red-400 text-sm">
                      Need {(theme.price - userRP).toLocaleString()} more RP
                    </span>
                  </div>
                )}
              </div>

              {/* Features */}
              <div className="mb-6">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <SparklesIcon className="w-5 h-5" />
                  What you get:
                </h3>
                <ul className="space-y-2 text-gray-300 text-sm">
                  {theme.id === 'halloween' && (
                    <>
                      <li>🎃 Spooky Halloween visuals</li>
                      <li>👻 Haunted animations & effects</li>
                      <li>🦇 Themed enemies & projectiles</li>
                      <li>🎵 Halloween music & sounds</li>
                    </>
                  )}
                  {theme.id === 'christmas' && (
                    <>
                      <li>🎄 Festive Christmas decorations</li>
                      <li>❄️ Snow effects & winter vibes</li>
                      <li>🎁 Holiday-themed characters</li>
                      <li>🎵 Christmas music & jingles</li>
                    </>
                  )}
                </ul>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-4 text-center">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Purchase Button */}
              <button
                onClick={handlePurchase}
                disabled={isPurchasing || userRP < theme.price}
                className={`w-full py-4 rounded-xl font-bold text-white transition-all duration-300 flex items-center justify-center gap-2 ${
                  userRP >= theme.price
                    ? `bg-gradient-to-r ${colors.button} hover:scale-105 shadow-lg`
                    : 'bg-gray-600 cursor-not-allowed opacity-50'
                }`}
              >
                {isPurchasing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Purchasing...
                  </>
                ) : userRP >= theme.price ? (
                  <>
                    <LockClosedIcon className="w-5 h-5" />
                    Unlock for {theme.price.toLocaleString()} RP
                  </>
                ) : (
                  <>
                    <LockClosedIcon className="w-5 h-5" />
                    Insufficient RP
                  </>
                )}
              </button>

              {/* Get more RP link */}
              {userRP < theme.price && (
                <a
                  href="/rewards"
                  className="block text-center mt-4 text-purple-400 hover:text-purple-300 text-sm underline"
                >
                  Earn more RP →
                </a>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

