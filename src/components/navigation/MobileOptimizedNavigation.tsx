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
    const baseStyles = 'px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200';
    
    if (isActive) {
      return `${baseStyles} bg-white/20 text-white`;
    }
    
    return `${baseStyles} text-white/90 hover:text-white hover:bg-white/10`;
  };

  return (
    <header className={`${getHeaderStyles()} sticky top-0 z-50`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center">
              <span className="text-2xl font-bold text-white">DropDollar</span>
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-white hover:text-white/80 p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              {mobileMenuOpen ? (
                <XMarkIcon className="h-6 w-6" />
              ) : (
                <Bars3Icon className="h-6 w-6" />
              )}
            </button>
          </div>

          {/* Desktop navigation */}
          <nav className="hidden md:flex space-x-2">
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
                <span className="mr-1">{link.emoji}</span>
                {link.label}
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
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-white/10 backdrop-blur-xl rounded-lg mt-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`block px-3 py-2 rounded-lg text-base font-medium transition-colors ${getLinkStyles(link.href)}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="mr-2">{link.emoji}</span>
                  {link.label}
                </Link>
              ))}
              <div className="pt-2 border-t border-white/20">
                <UserMenu />
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
