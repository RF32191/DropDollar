'use client';

import { useState } from 'react';
import Link from 'next/link';
import UserMenu from './UserMenu';
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

  // Styles based on variant and current page
  const getHeaderStyles = () => {
    // Page-specific navigation colors
    if (currentPage) {
      switch (currentPage) {
        case 'hot-sell':
          return 'bg-gradient-to-r from-orange-800 via-red-800 to-orange-900 shadow-lg';
        case 'winner-takes-all':
          return 'bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-700 shadow-lg';
        case 'games':
          return 'bg-gradient-to-r from-blue-800 via-indigo-800 to-purple-800 shadow-lg';
        case 'buy-tokens':
          return 'bg-gradient-to-r from-green-700 via-emerald-700 to-green-800 shadow-lg';
        case 'tournaments':
          return 'bg-gradient-to-r from-purple-700 via-violet-700 to-purple-800 shadow-lg';
        case 'categories':
          return 'bg-gradient-to-r from-teal-700 via-cyan-700 to-teal-800 shadow-lg';
        default:
          return 'bg-gradient-to-r from-slate-800 via-gray-800 to-slate-900 shadow-lg';
      }
    }
    
    // Fallback to variant-based styling
    switch (variant) {
      case 'light':
        return 'bg-white border-b border-gray-200 shadow-sm';
      case 'dark':
        return 'bg-gray-900 border-b border-gray-800';
      case 'gradient':
      default:
        return 'bg-gradient-to-r from-slate-800 via-gray-800 to-slate-900 shadow-lg';
    }
  };

  const getLinkStyles = (isActive: boolean) => {
    const baseStyles = 'font-semibold transition-all duration-300 hover:scale-110 px-4 py-2 rounded-xl relative z-10 cursor-pointer group overflow-hidden';
    
    switch (variant) {
      case 'light':
        return `${baseStyles} ${isActive ? 'text-blue-600 font-bold bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg' : 'text-gray-700 hover:text-blue-600 hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 hover:shadow-md'}`;
      case 'dark':
        return `${baseStyles} ${isActive ? 'text-blue-400 font-bold bg-gradient-to-r from-white/15 to-blue-500/20 shadow-lg' : 'text-gray-300 hover:text-white hover:bg-gradient-to-r hover:from-white/10 hover:to-white/5 hover:shadow-md'}`;
      case 'gradient':
      default:
        return `${baseStyles} ${isActive ? 'text-yellow-300 font-bold bg-gradient-to-r from-white/20 to-yellow-500/20 shadow-lg' : 'text-white hover:text-yellow-200 hover:bg-gradient-to-r hover:from-white/10 hover:to-white/5 hover:shadow-md'}`;
    }
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 flex-shrink-0 group">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-full flex items-center justify-center shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-110 hover:rotate-12 group-hover:animate-pulse">
              <img 
                src="/DropCoin.png" 
                alt="DropDollar"
                className="w-8 h-8 object-contain transition-transform duration-300 group-hover:scale-110"
              />
            </div>
            <span className={`text-xl sm:text-2xl font-black bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 bg-clip-text text-transparent animate-gradient ${getLogoTextStyles()} hidden sm:block`}>
              DropDollar
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-3">
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

          {/* Desktop User Menu */}
          <div className="hidden lg:flex items-center space-x-4">
            <UserMenu variant={variant === 'light' ? 'light' : 'dark'} />
          </div>

          {/* Mobile menu button */}
          <div className="flex lg:hidden items-center space-x-4">
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

