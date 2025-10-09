'use client';

import React from 'react';
import Link from 'next/link';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';

interface NavigationProps {
  variant?: 'default' | 'dark' | 'light';
  showSettings?: boolean;
  showSellButton?: boolean;
  className?: string;
}

export default function Navigation({ 
  variant = 'default', 
  showSettings = true, 
  showSellButton = true,
  className = ''
}: NavigationProps) {
  const deviceInfo = useDeviceDetection();

  const getVariantStyles = () => {
    switch (variant) {
      case 'dark':
        return {
          container: 'bg-gray-900 text-white',
          navLink: 'text-gray-300 hover:text-white',
          navLinkBold: 'text-purple-400 hover:text-purple-300',
          border: 'border-gray-700',
          userText: 'text-gray-300'
        };
      case 'light':
        return {
          container: 'bg-white text-gray-900',
          navLink: 'text-gray-700 hover:text-green-600',
          navLinkBold: 'text-purple-600 hover:text-purple-700',
          border: 'border-gray-200',
          userText: 'text-gray-700'
        };
      default:
        return {
          container: 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600',
          navLink: 'text-gray-200 hover:text-white',
          navLinkBold: 'text-yellow-300 hover:text-yellow-200',
          border: 'border-gray-300',
          userText: 'text-gray-200'
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className={`flex items-center space-x-1 sm:space-x-3 ${className}`}>
      {/* Primary Navigation */}
      <div className="flex items-center space-x-1 sm:space-x-3">
        <Link 
          href="/listings" 
          className={`px-2 py-1 ${styles.navLink} font-medium transition-all duration-300 text-sm hover:scale-105`}
        >
          Browse
        </Link>
        <Link 
          href="/games" 
          className={`px-2 py-1 ${styles.navLinkBold} font-bold transition-all duration-300 text-sm hover:scale-105`}
        >
          🎮 Games
        </Link>
        <Link 
          href="/tournaments" 
          className={`px-2 py-1 ${styles.navLinkBold} font-bold transition-all duration-300 text-sm hover:scale-105`}
        >
          🏆 Tournaments
        </Link>
        <Link 
          href="/hot-sell" 
          className={`px-2 py-1 ${styles.navLinkBold} font-bold transition-all duration-300 text-sm hover:scale-105`}
        >
          🔥 Hot Sell
        </Link>
      </div>

      {/* Secondary Navigation */}
      <div className="flex items-center space-x-2">
        <Link 
          href="/buy-tokens" 
          className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-bold px-3 py-1.5 rounded-lg transition-all duration-300 text-sm shadow-lg hover:shadow-xl hover:scale-105"
        >
          💰 Tokens
        </Link>
      </div>
    </div>
  );
}