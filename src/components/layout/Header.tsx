'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { 
  ShoppingBagIcon, 
  UserIcon, 
  Bars3Icon, 
  XMarkIcon,
  CurrencyDollarIcon,
  BellIcon,
  CogIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';

export default function Header() {
  const { user, logout, isLoading } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-gray-800 shadow-sm border-b border-gray-700 sticky top-0 z-50 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center mr-3 overflow-hidden">
                <img
                  src="/DropCoin.png"
                  alt="DropDollar Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white transition-colors">DropDollar</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8 ml-12">
            <Link href="/buy-tokens" className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold px-4 py-2 rounded-lg transition-all hover:scale-105 shadow-lg">
              💰 Buy Tokens
            </Link>
            <Link href="/listings" className="text-gray-700 dark:text-green-400 hover:text-green-600 dark:hover:text-green-300 font-medium transition-colors">
              Browse
            </Link>
            <Link href="/categories" className="text-gray-700 dark:text-green-400 hover:text-green-600 dark:hover:text-green-300 font-medium transition-colors">
              Categories
            </Link>
            <Link href="/games" className="text-purple-600 dark:text-green-400 hover:text-purple-700 dark:hover:text-green-300 font-bold transition-colors">
              🎮 Games
            </Link>
            <Link href="/hot-sell" className="text-red-600 dark:text-green-400 hover:text-red-700 dark:hover:text-green-300 font-bold transition-colors">
              🔥 Hot Sell
            </Link>
            <Link href="/tournaments" className="text-yellow-600 dark:text-green-400 hover:text-yellow-700 dark:hover:text-green-300 font-bold transition-colors">
              🏆 Tournaments
            </Link>
            <Link href="/advertising/register" className="text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 font-bold transition-colors">
              📺 Advertise
            </Link>
          </nav>

          {/* User Actions */}
          <div className="hidden lg:flex items-center space-x-4">
            {!isLoading && user ? (
              <div className="flex items-center space-x-3 pl-4 border-l border-gray-200 dark:border-gray-700">
                <Link href="/dashboard" className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium transition-colors">
                  💰 Dashboard
                </Link>
                {user.role === 'seller' || user.role === 'admin' ? (
                  <Link href="/seller/dashboard" className="text-blue-600 dark:text-green-400 hover:text-blue-700 dark:hover:text-green-300 font-medium transition-colors">
                    🏪 Seller Dashboard
                  </Link>
                ) : (
                  <Link href="/seller/apply" className="text-blue-600 dark:text-green-400 hover:text-blue-700 dark:hover:text-green-300 font-medium transition-colors">
                    🏪 Become a Seller
                  </Link>
                )}
                <Link href="/settings" className="text-gray-600 dark:text-green-400 hover:text-gray-800 dark:hover:text-green-300 transition-colors">
                  ⚙️ Settings
                </Link>
                {/* Username as Dashboard Link */}
                <Link 
                  href="/dashboard" 
                  className="flex items-center space-x-2 hover:opacity-80 transition-opacity bg-green-50 dark:bg-green-900/30 px-3 py-2 rounded-lg border border-green-200 dark:border-green-700"
                  title="View Dashboard"
                >
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center">
                    <span className="text-green-600 dark:text-green-400 font-bold text-sm">
                      {user.firstName?.charAt(0) || 'U'}{user.lastName?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <span className="text-gray-900 dark:text-green-300 font-semibold text-sm">
                    @{user.username || `${user.firstName} ${user.lastName}`}
                  </span>
                </Link>
                <button
                  onClick={logout}
                  className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium transition-colors p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                  title="Logout"
                >
                  🚪
                </button>
              </div>
            ) : !isLoading ? (
              <div className="flex items-center space-x-3 pl-4 border-l border-gray-200 dark:border-gray-700">
                <Link href="/settings" className="text-gray-600 dark:text-green-400 hover:text-gray-800 dark:hover:text-green-300 transition-colors">
                  ⚙️ Settings
                </Link>
                <Link href="/seller/apply" className="text-blue-600 dark:text-green-400 hover:text-blue-700 dark:hover:text-green-300 font-medium transition-colors">
                  🏪 Become a Seller
                </Link>
                <Link href="/auth/login" className="text-gray-700 dark:text-green-400 hover:text-green-600 dark:hover:text-green-300 font-medium transition-colors">
                  Sign In
                </Link>
                <Link href="/auth/register" className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                  Sign Up
                </Link>
              </div>
            ) : (
              <div className="flex items-center space-x-4 pl-4 border-l border-gray-200 dark:border-gray-700">
                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                <div className="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-700 hover:text-green-600"
            >
              {isMenuOpen ? (
                <XMarkIcon className="h-6 w-6" />
              ) : (
                <Bars3Icon className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <div className="flex flex-col space-y-4">
              <Link href="/listings" className="text-gray-700 hover:text-green-600 font-medium">
                Browse
              </Link>
              <Link href="/dropafund" className="text-cyan-600 hover:text-cyan-700 font-bold">
                💧 DropAFund
              </Link>
              <Link href="/games" className="text-purple-600 hover:text-purple-700 font-bold">
                🎮 Games
              </Link>
              <Link href="/levels" className="text-indigo-600 hover:text-indigo-700 font-bold">
                ⭐ Levels
              </Link>
              <Link href="/hot-sell" className="text-red-600 hover:text-red-700 font-bold">
                🔥 Hot Sell
              </Link>
              <Link href="/tournaments" className="text-yellow-600 hover:text-yellow-700 font-bold">
                🏆 Tournaments
              </Link>
              <Link href="/advertising/register" className="text-orange-600 hover:text-orange-700 font-bold">
                📺 Advertise
              </Link>
              <Link href="/how-it-works" className="text-gray-700 hover:text-green-600 font-medium">
                How It Works
              </Link>
              <Link href="/categories" className="text-gray-700 dark:text-green-400 hover:text-green-600 dark:hover:text-green-300 font-medium">
                Categories
              </Link>
              <Link href="/buy-tokens" className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-bold">
                💰 Buy Tokens
              </Link>
              
              {!isLoading && user ? (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
                  {/* Username as Dashboard Link - Mobile */}
                  <Link 
                    href="/dashboard" 
                    className="bg-green-50 dark:bg-green-900/30 p-3 rounded-lg border border-green-200 dark:border-green-700 mb-4 block hover:opacity-80 transition-opacity"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center">
                        <span className="text-green-600 dark:text-green-400 font-bold">
                          {user.firstName?.charAt(0) || 'U'}{user.lastName?.charAt(0) || 'U'}
                        </span>
                      </div>
                      <div>
                        <div className="text-gray-900 dark:text-green-300 font-semibold">
                          @{user.username || `${user.firstName} ${user.lastName}`}
                        </div>
                        <div className="text-green-600 dark:text-green-400 text-sm">
                          View Dashboard
                        </div>
                      </div>
                    </div>
                  </Link>
                  
                  <Link href="/dashboard" className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium block">
                    💰 Dashboard
                  </Link>
                  {user.role === 'seller' || user.role === 'admin' ? (
                    <Link href="/seller/dashboard" className="text-blue-600 dark:text-green-400 hover:text-blue-700 dark:hover:text-green-300 font-medium block">
                      🏪 Seller Dashboard
                    </Link>
                  ) : (
                    <Link href="/seller/apply" className="text-blue-600 dark:text-green-400 hover:text-blue-700 dark:hover:text-green-300 font-medium block">
                      🏪 Become a Seller
                    </Link>
                  )}
                  <Link href="/settings" className="text-gray-600 dark:text-green-400 hover:text-gray-800 dark:hover:text-green-300 block">
                    ⚙️ Settings
                  </Link>
                  <button
                    onClick={logout}
                    className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium w-full text-left"
                  >
                    🚪 Logout
                  </button>
                </div>
              ) : !isLoading ? (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
                  <Link href="/settings" className="text-gray-600 dark:text-green-400 hover:text-gray-800 dark:hover:text-green-300 block">
                    ⚙️ Settings
                  </Link>
                  <Link href="/auth/register" className="text-blue-600 dark:text-green-400 hover:text-blue-700 dark:hover:text-green-300 font-medium block">
                    🏪 Become a Seller
                  </Link>
                  <Link href="/auth/login" className="text-gray-700 dark:text-green-400 hover:text-green-600 dark:hover:text-green-300 font-medium block">
                    Sign In
                  </Link>
                  <Link href="/auth/register" className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-center block">
                    Sign Up
                  </Link>
                </div>
              ) : (
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}