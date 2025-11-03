'use client';

import { useState } from 'react';
import Link from 'next/link';
import UserMenu from './UserMenu';
import ProminentDualWallet from '@/components/wallet/ProminentDualWallet';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { playNavigationClick, playButtonHover } from '@/lib/gameAudio';

interface CleanNavigationProps {
  variant?: 'light' | 'dark' | 'gradient';
  currentPage?: string;
}

export default function CleanNavigation({ variant = 'gradient', currentPage }: CleanNavigationProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/', label: 'Home', emoji: '🏠' },
    { href: '/games', label: 'Games', emoji: '🎮' },
    { href: '/tournaments', label: 'Tournaments', emoji: '🏆' },
    { href: '/hot-sell', label: 'Hot Sell', emoji: '🔥' },
    { href: '/winner-takes-all', label: 'Winner Takes It All', emoji: '👑' },
    { href: '/analytics', label: 'Analytics', emoji: '📊' },
    { href: '/categories', label: 'Categories', emoji: '📦' },
    { href: '/buy-tokens', label: 'Buy Tokens', emoji: '💰' },
  ];

  // Debug function to test navigation
  const handleNavClick = (href: string, label: string) => {
    console.log(`🖱️ Navigation clicked: ${label} -> ${href}`);
    console.log(`📍 Current page: ${currentPage}`);
    console.log(`🖥️ User agent: ${navigator.userAgent}`);
    console.log(`📱 Is mobile: ${/Mobi|Android/i.test(navigator.userAgent)}`);
    
    // Play navigation click sound
    playNavigationClick();
  };

  // Styles based on variant and current page - Animated metallic theme
  const getHeaderStyles = () => {
    // Page-specific navigation colors - Metallic theme with animations
    if (currentPage) {
      switch (currentPage) {
        case '/':
        case 'home':
          return 'bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 shadow-2xl animate-gradient-x'; // Purple-Pink animated
        case 'hot-sell':
          return 'bg-gradient-to-r from-red-600 via-yellow-500 to-red-600 shadow-2xl animate-gradient-x'; // Red and gold animated transition
        case 'winner-takes-all':
          return 'bg-gradient-to-r from-yellow-700 via-yellow-400 to-amber-700 shadow-2xl animate-gradient-x'; // Dark gold to light gold animated
        case 'games':
          return 'bg-gradient-to-r from-purple-700 via-blue-600 to-purple-700 shadow-2xl animate-gradient-x'; // Purple to blue animated
        case 'buy-tokens':
          return 'bg-gradient-to-r from-emerald-600 via-green-500 to-emerald-600 shadow-2xl animate-gradient-x'; // Green animated
        case 'tournaments':
          return 'bg-gradient-to-r from-indigo-600 via-purple-500 to-indigo-600 shadow-2xl animate-gradient-x'; // Indigo-purple animated
        case 'analytics':
          return 'bg-gradient-to-r from-slate-700 via-gray-500 to-slate-700 shadow-2xl animate-gradient-x'; // Silver animated
        case 'categories':
          return 'bg-gradient-to-r from-teal-600 via-cyan-500 to-teal-600 shadow-2xl animate-gradient-x'; // Teal animated
        default:
          return 'bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 shadow-2xl animate-gradient-x'; // Default to purple-pink animated
      }
    }
    
    // Fallback to purple-pink gradient animated
    return 'bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 shadow-2xl animate-gradient-x';
  };

  const getLinkStyles = (isActive: boolean) => {
    const baseStyles = 'font-semibold transition-all duration-300 hover:scale-105 px-3 py-2 rounded-xl relative z-10 cursor-pointer group overflow-hidden text-sm';
    
    // Metallic theme for all navigation
    return `${baseStyles} ${isActive ? 'text-yellow-200 font-bold bg-gradient-to-r from-white/25 to-yellow-400/25 shadow-lg border border-yellow-300/30' : 'text-white/90 hover:text-yellow-100 hover:bg-gradient-to-r hover:from-white/15 hover:to-white/10 hover:shadow-md'}`;
  };

  const getLogoTextStyles = () => {
    switch (variant) {
      case 'light':
        return 'text-gray-900';
      case 'dark':
        return 'text-white';
      case 'gradient':
      default:
        return 'text-white';
    }
  };

  return (
    <header className={`${getHeaderStyles()} relative z-50`}>
      <div className="w-full px-2">
        <div className="flex items-center justify-start h-16 gap-4">
          {/* Logo - Against left edge */}
          <Link href="/" className="flex items-center space-x-2 flex-shrink-0 group">
            <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-full flex items-center justify-center shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-110 hover:rotate-12 group-hover:animate-pulse">
              <img 
                src="/DropCoin.png" 
                alt="DropDollar"
                className="w-7 h-7 object-contain transition-transform duration-300 group-hover:scale-110"
              />
            </div>
            <span className="text-lg sm:text-xl font-black bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 bg-clip-text text-transparent animate-gradient whitespace-nowrap">
              DropDollar
            </span>
          </Link>

          {/* Desktop Navigation - Left aligned */}
          <nav className="hidden lg:flex items-center space-x-2 flex-1">
            {navLinks.map((link) => {
              const isActive = currentPage === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={getLinkStyles(isActive)}
                  onClick={(e) => {
                    // Ensure click is handled properly
                    e.stopPropagation();
                    handleNavClick(link.href, link.label);
                  }}
                >
                  <span className="relative z-10 flex items-center">
                    <span className="hidden xl:inline mr-2 text-lg transition-transform duration-300 group-hover:scale-125 group-hover:rotate-12">{link.emoji}</span>
                    <span className="font-semibold tracking-wide transition-all duration-300 group-hover:tracking-wider">{link.label}</span>
                  </span>
                  {/* Animated underline */}
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-yellow-400 to-orange-400 transition-all duration-300 group-hover:w-full"></span>
                  {/* Glow effect */}
                  <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                </Link>
              );
            })}
          </nav>

          {/* Desktop Wallet Display - Right side */}
          <div className="hidden xl:flex items-center gap-4 ml-auto pr-2">
            <ProminentDualWallet />
            <UserMenu variant={variant === 'light' ? 'light' : 'dark'} />
          </div>
          
          {/* Tablet - Only User Menu */}
          <div className="hidden lg:flex xl:hidden items-center ml-auto pr-2">
            <UserMenu variant={variant === 'light' ? 'light' : 'dark'} />
          </div>

          {/* Mobile menu button */}
          <div className="flex lg:hidden items-center space-x-2 ml-auto pr-2">
            <UserMenu variant={variant === 'light' ? 'light' : 'dark'} />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`p-3 rounded-xl transition-all duration-300 hover:scale-110 hover:rotate-12 group ${variant === 'light' ? 'text-gray-700 hover:bg-gradient-to-r hover:from-gray-100 hover:to-gray-200' : 'text-white hover:bg-gradient-to-r hover:from-white/10 hover:to-white/20'}`}
            >
              {mobileMenuOpen ? (
                <XMarkIcon className="h-6 w-6 transition-all duration-300 rotate-180 group-hover:scale-125" />
              ) : (
                <Bars3Icon className="h-6 w-6 transition-all duration-300 group-hover:scale-125" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className={`lg:hidden py-6 border-t ${variant === 'light' ? 'border-gray-200' : 'border-white/10'} animate-fade-in`}>
            <nav className="flex flex-col space-y-4">
              {navLinks.map((link) => {
                const isActive = currentPage === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`${getLinkStyles(isActive)} px-6 py-3 rounded-xl group relative overflow-hidden`}
                  >
                    <span className="relative z-10 flex items-center">
                      <span className="mr-3 text-xl transition-transform duration-300 group-hover:scale-125 group-hover:rotate-12">{link.emoji}</span>
                      <span className="font-semibold tracking-wide transition-all duration-300 group-hover:tracking-wider">{link.label}</span>
                    </span>
                    {/* Animated background */}
                    <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                    {/* Animated underline */}
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-yellow-400 to-orange-400 transition-all duration-300 group-hover:w-full"></span>
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}

