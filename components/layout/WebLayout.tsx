'use client';

import React from 'react';
import ResponsiveNavigation, { MultiRowNavigation } from '@/components/ui/ResponsiveNavigation';
import { TrendingUp, Gamepad2, CrystalBall, Droplets, Trophy, User, ShoppingCart, Globe, HelpCircle } from 'lucide-react';

interface WebLayoutProps {
  children: React.ReactNode;
  currentPage?: string;
}

export default function WebLayout({ children, currentPage }: WebLayoutProps) {
  // Navigation items for Drop Dollar website
  const navigationItems = [
    {
      id: 'analysis',
      label: 'Crypto Analysis',
      shortLabel: 'Analysis',
      href: '/analysis',
      icon: <TrendingUp className="h-4 w-4" />
    },
    {
      id: 'trading-game',
      label: 'Trading Game',
      shortLabel: 'Trading',
      href: '/trading-game',
      icon: <Gamepad2 className="h-4 w-4" />
    },
    {
      id: 'prediction-game',
      label: 'Prediction Game',
      shortLabel: 'Predict',
      href: '/prediction-game',
      icon: <CrystalBall className="h-4 w-4" />
    },
    {
      id: 'drop-coin',
      label: 'Drop Coin',
      shortLabel: 'Drop',
      href: '/drop-coin',
      icon: <Droplets className="h-4 w-4" />
    },
    {
      id: 'token-purchase',
      label: 'Buy Tokens',
      shortLabel: 'Buy',
      href: '/token-purchase',
      icon: <ShoppingCart className="h-4 w-4" />
    },
    {
      id: 'tournaments',
      label: 'Tournaments',
      shortLabel: 'Events',
      href: '/tournaments',
      icon: <Trophy className="h-4 w-4" />
    },
    {
      id: 'leaderboard',
      label: 'Leaderboard',
      shortLabel: 'Board',
      href: '/leaderboard',
      icon: <Trophy className="h-4 w-4" />
    },
    {
      id: 'signin',
      label: 'Sign In',
      shortLabel: 'Sign In',
      href: '/signin',
      icon: <User className="h-4 w-4" />
    },
    {
      id: 'signup',
      label: 'Sign Up',
      shortLabel: 'Sign Up',
      href: '/signup',
      icon: <User className="h-4 w-4" />
    },
    {
      id: 'navigation',
      label: 'All Pages',
      shortLabel: 'Pages',
      href: '/navigation',
      icon: <Globe className="h-4 w-4" />
    },
    {
      id: 'faq',
      label: 'FAQ',
      shortLabel: 'FAQ',
      href: '/faq',
      icon: <HelpCircle className="h-4 w-4" />
    }
  ];

  const logo = (
    <div className="flex items-center space-x-2">
      <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
        <span className="text-white font-bold text-sm">DD</span>
      </div>
      <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
        Drop Dollar
      </span>
    </div>
  );

  const userMenu = (
    <div className="flex items-center space-x-2">
      <button className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600">
        Sign In
      </button>
      <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
        Get Started
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <ResponsiveNavigation
        items={navigationItems}
        logo={logo}
        userMenu={userMenu}
        className="sticky top-0 z-50"
      />
      
      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>
      
      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">DD</span>
                </div>
                <span className="text-xl font-bold">Drop Dollar</span>
              </div>
              <p className="text-gray-400 mb-4">
                The ultimate crypto market analysis and trading platform. 
                Compete globally, learn continuously, and grow your portfolio.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-white">Twitter</a>
                <a href="#" className="text-gray-400 hover:text-white">Discord</a>
                <a href="#" className="text-gray-400 hover:text-white">Telegram</a>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Platform</h3>
              <ul className="space-y-2">
                <li><a href="/analysis" className="text-gray-400 hover:text-white">Crypto Analysis</a></li>
                <li><a href="/trading-game" className="text-gray-400 hover:text-white">Trading Game</a></li>
                <li><a href="/prediction-game" className="text-gray-400 hover:text-white">Prediction Game</a></li>
                <li><a href="/drop-coin" className="text-gray-400 hover:text-white">Drop Coin</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Support</h3>
              <ul className="space-y-2">
                <li><a href="/help" className="text-gray-400 hover:text-white">Help Center</a></li>
                <li><a href="/contact" className="text-gray-400 hover:text-white">Contact Us</a></li>
                <li><a href="/privacy" className="text-gray-400 hover:text-white">Privacy Policy</a></li>
                <li><a href="/terms" className="text-gray-400 hover:text-white">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Drop Dollar. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Alternative layout with multi-row navigation for many items
export function WebLayoutWithMultiRow({ children, currentPage }: WebLayoutProps) {
  const navigationItems = [
    {
      id: 'analysis',
      label: 'Crypto Analysis',
      shortLabel: 'Analysis',
      href: '/analysis',
      icon: <TrendingUp className="h-4 w-4" />
    },
    {
      id: 'trading-game',
      label: 'Trading Game',
      shortLabel: 'Trading',
      href: '/trading-game',
      icon: <Gamepad2 className="h-4 w-4" />
    },
    {
      id: 'prediction-game',
      label: 'Prediction Game',
      shortLabel: 'Predict',
      href: '/prediction-game',
      icon: <CrystalBall className="h-4 w-4" />
    },
    {
      id: 'drop-coin',
      label: 'Drop Coin',
      shortLabel: 'Drop',
      href: '/drop-coin',
      icon: <Droplets className="h-4 w-4" />
    },
    {
      id: 'leaderboard',
      label: 'Leaderboard',
      shortLabel: 'Board',
      href: '/leaderboard',
      icon: <Trophy className="h-4 w-4" />
    },
    {
      id: 'profile',
      label: 'Profile',
      shortLabel: 'Profile',
      href: '/profile',
      icon: <User className="h-4 w-4" />
    },
    {
      id: 'tournaments',
      label: 'Tournaments',
      shortLabel: 'Events',
      href: '/tournaments',
      icon: <Trophy className="h-4 w-4" />
    },
    {
      id: 'marketplace',
      label: 'Marketplace',
      shortLabel: 'Shop',
      href: '/marketplace',
      icon: <TrendingUp className="h-4 w-4" />
    },
    {
      id: 'news',
      label: 'Crypto News',
      shortLabel: 'News',
      href: '/news',
      icon: <TrendingUp className="h-4 w-4" />
    },
    {
      id: 'education',
      label: 'Education',
      shortLabel: 'Learn',
      href: '/education',
      icon: <TrendingUp className="h-4 w-4" />
    },
    {
      id: 'api',
      label: 'API Documentation',
      shortLabel: 'API',
      href: '/api-docs',
      icon: <TrendingUp className="h-4 w-4" />
    },
    {
      id: 'community',
      label: 'Community',
      shortLabel: 'Community',
      href: '/community',
      icon: <TrendingUp className="h-4 w-4" />
    }
  ];

  const logo = (
    <div className="flex items-center space-x-2">
      <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
        <span className="text-white font-bold text-sm">DD</span>
      </div>
      <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
        Drop Dollar
      </span>
    </div>
  );

  const userMenu = (
    <div className="flex items-center space-x-2">
      <button className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600">
        Sign In
      </button>
      <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
        Get Started
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Multi-row Navigation */}
      <MultiRowNavigation
        items={navigationItems}
        logo={logo}
        userMenu={userMenu}
        className="sticky top-0 z-50"
        maxItemsPerRow={6}
      />
      
      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>
      
      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">DD</span>
                </div>
                <span className="text-xl font-bold">Drop Dollar</span>
              </div>
              <p className="text-gray-400 mb-4">
                The ultimate crypto market analysis and trading platform. 
                Compete globally, learn continuously, and grow your portfolio.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-white">Twitter</a>
                <a href="#" className="text-gray-400 hover:text-white">Discord</a>
                <a href="#" className="text-gray-400 hover:text-white">Telegram</a>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Platform</h3>
              <ul className="space-y-2">
                <li><a href="/analysis" className="text-gray-400 hover:text-white">Crypto Analysis</a></li>
                <li><a href="/trading-game" className="text-gray-400 hover:text-white">Trading Game</a></li>
                <li><a href="/prediction-game" className="text-gray-400 hover:text-white">Prediction Game</a></li>
                <li><a href="/drop-coin" className="text-gray-400 hover:text-white">Drop Coin</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Support</h3>
              <ul className="space-y-2">
                <li><a href="/help" className="text-gray-400 hover:text-white">Help Center</a></li>
                <li><a href="/contact" className="text-gray-400 hover:text-white">Contact Us</a></li>
                <li><a href="/privacy" className="text-gray-400 hover:text-white">Privacy Policy</a></li>
                <li><a href="/terms" className="text-gray-400 hover:text-white">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Drop Dollar. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
