'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import UserMenu from './UserMenu';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { isMobile } from '@/lib/utils/mobileOptimization';

interface MobileOptimizedNavigationProps {
  variant?: 'light' | 'dark' | 'gradient';
  currentPage?: string;
}

export default function MobileOptimizedNavigation({ variant = 'gradient', currentPage }: MobileOptimizedNavigationProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/', label: 'Home', emoji: '🏠' },
    { href: '/games', label: 'Games', emoji: '🎮' },
    { href: '/hot-sell', label: 'Hot Sell', emoji: '🔥' },
    { href: '/buy-tokens', label: 'Tokens', emoji: '💰' },
  ];

  const getHeaderStyles = () => {
    switch (variant) {
      case 'light':
        return 'bg-white shadow-lg';
      case 'dark':
        return 'bg-gray-900 shadow-lg';
      default:
        return 'bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 shadow-lg';
    }
  };

  const getLinkStyles = (href: string) => {
    const isActive = currentPage === href || (href === '/' && currentPage === 'home');
    const baseStyles = 'px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 hover:scale-110 group relative overflow-hidden';
    
    if (isActive) {
      return `${baseStyles} bg-gradient-to-r from-white/20 to-white/30 text-white shadow-lg`;
    }
    
    return `${baseStyles} text-white/90 hover:text-white hover:bg-gradient-to-r hover:from-white/10 hover:to-white/20`;
  };

  return (
    <header className={`${getHeaderStyles()} sticky top-0 z-50`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center group">
              <span className="text-2xl font-black bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 bg-clip-text text-transparent animate-gradient group-hover:scale-110 transition-transform duration-300">DropDollar</span>
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-white hover:text-white/80 p-3 rounded-xl hover:bg-gradient-to-r hover:from-white/10 hover:to-white/20 transition-all duration-300 hover:scale-110 hover:rotate-12 group"
            >
              {mobileMenuOpen ? (
                <XMarkIcon className="h-6 w-6 transition-all duration-300 rotate-180 group-hover:scale-125" />
              ) : (
                <Bars3Icon className="h-6 w-6 transition-all duration-300 group-hover:scale-125" />
              )}
            </button>
          </div>

          {/* Desktop navigation */}
          <nav className="hidden md:flex space-x-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={getLinkStyles(link.href)}
                onClick={(e) => {
                  e.stopPropagation();
                  console.log(`🖱️ Navigation clicked: ${link.label} -> ${link.href}`);
                }}
              >
                <span className="relative z-10 flex items-center">
                  <span className="mr-2 text-lg transition-transform duration-300 group-hover:scale-125 group-hover:rotate-12">{link.emoji}</span>
                  <span className="font-semibold tracking-wide transition-all duration-300 group-hover:tracking-wider">{link.label}</span>
                </span>
                {/* Animated underline */}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-yellow-400 to-orange-400 transition-all duration-300 group-hover:w-full"></span>
                {/* Glow effect */}
                <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
              </Link>
            ))}
          </nav>

          {/* User menu */}
          <div className="hidden md:block">
            <UserMenu />
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden animate-fade-in">
            <div className="px-4 pt-4 pb-4 space-y-3 bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-xl rounded-2xl mt-3 shadow-2xl">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`block px-4 py-3 rounded-xl text-base font-semibold transition-all duration-300 group relative overflow-hidden ${getLinkStyles(link.href)}`}
                  onClick={() => setMobileMenuOpen(false)}
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
              ))}
              <div className="pt-3 border-t border-white/20">
                <UserMenu />
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
