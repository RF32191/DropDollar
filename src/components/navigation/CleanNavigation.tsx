'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import UserMenu from './UserMenu';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';

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
    { href: '/scheduled-games', label: 'Scheduled Games', emoji: '📅' },
    { href: '/categories', label: 'Categories', emoji: '📦' },
    { href: '/buy-tokens', label: 'Buy Tokens', emoji: '💰' },
  ];

  // Styles based on variant
  const getHeaderStyles = () => {
    switch (variant) {
      case 'light':
        return 'bg-white border-b border-gray-200 shadow-sm';
      case 'dark':
        return 'bg-gray-900 border-b border-gray-800';
      case 'gradient':
      default:
        return 'bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 shadow-lg';
    }
  };

  const getLinkStyles = (isActive: boolean) => {
    const baseStyles = 'font-medium transition-all duration-200 hover:scale-105';
    
    switch (variant) {
      case 'light':
        return `${baseStyles} ${isActive ? 'text-blue-600 font-bold' : 'text-gray-700 hover:text-blue-600'}`;
      case 'dark':
        return `${baseStyles} ${isActive ? 'text-blue-400 font-bold' : 'text-gray-300 hover:text-white'}`;
      case 'gradient':
      default:
        return `${baseStyles} ${isActive ? 'text-yellow-300 font-bold' : 'text-white hover:text-yellow-200'}`;
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
    <header className={getHeaderStyles()}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 flex-shrink-0">
            <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow duration-300">
              <img 
                src="/DropCoin.png" 
                alt="DropDollar"
                className="w-7 h-7 object-contain"
              />
            </div>
            <span className={`text-xl sm:text-2xl font-bold ${getLogoTextStyles()} hidden sm:block`}>
              DropDollar
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-6">
            {navLinks.map((link) => {
              const isActive = currentPage === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={getLinkStyles(isActive)}
                >
                  <span className="hidden xl:inline">{link.emoji} </span>
                  {link.label}
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
              className={`p-2 rounded-lg ${variant === 'light' ? 'text-gray-700 hover:bg-gray-100' : 'text-white hover:bg-white/10'}`}
            >
              {mobileMenuOpen ? (
                <XMarkIcon className="h-6 w-6" />
              ) : (
                <Bars3Icon className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className={`lg:hidden py-4 border-t ${variant === 'light' ? 'border-gray-200' : 'border-white/10'}`}>
            <nav className="flex flex-col space-y-3">
              {navLinks.map((link) => {
                const isActive = currentPage === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`${getLinkStyles(isActive)} px-4 py-2 rounded-lg ${isActive ? (variant === 'light' ? 'bg-blue-50' : 'bg-white/10') : (variant === 'light' ? 'hover:bg-gray-50' : 'hover:bg-white/5')}`}
                  >
                    {link.emoji} {link.label}
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

