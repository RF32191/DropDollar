'use client';

import React from 'react';
import Link from 'next/link';
import { useTheme } from '@/contexts/ThemeContext';
import { MoonIcon, SunIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';

export default function DarkModeTestPage() {
  const { theme, setTheme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Simple Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <div className="w-10 h-10 mr-3">
                <img
                  src="/DropCoin.png"
                  alt="DropDollar Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">DropDollar - Dark Mode Test</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            🌙 Dark Mode Test Page
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Testing the dark mode functionality with theme switching
          </p>
        </div>

        {/* Theme Controls */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 mb-8 transition-colors">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Theme Controls</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {/* Light Theme */}
            <button
              onClick={() => setTheme('light')}
              className={`p-4 rounded-xl border-2 transition-all ${
                theme === 'light'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
              }`}
            >
              <div className="flex flex-col items-center">
                <SunIcon className="h-8 w-8 text-yellow-500 mb-2" />
                <span className="font-medium text-gray-900 dark:text-white">Light</span>
              </div>
            </button>

            {/* Dark Theme */}
            <button
              onClick={() => setTheme('dark')}
              className={`p-4 rounded-xl border-2 transition-all ${
                theme === 'dark'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
              }`}
            >
              <div className="flex flex-col items-center">
                <MoonIcon className="h-8 w-8 text-blue-500 mb-2" />
                <span className="font-medium text-gray-900 dark:text-white">Dark</span>
              </div>
            </button>

            {/* System Theme */}
            <button
              onClick={() => {
                const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                setTheme(systemTheme);
              }}
              className="p-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-all"
            >
              <div className="flex flex-col items-center">
                <ComputerDesktopIcon className="h-8 w-8 text-gray-500 dark:text-gray-400 mb-2" />
                <span className="font-medium text-gray-900 dark:text-white">System</span>
              </div>
            </button>

            {/* Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-4 rounded-xl border-2 border-purple-200 dark:border-purple-600 hover:border-purple-300 dark:hover:border-purple-500 bg-purple-50 dark:bg-purple-900/20 transition-all"
            >
              <div className="flex flex-col items-center">
                <div className="h-8 w-8 mb-2 flex items-center justify-center">
                  {theme === 'light' ? '🌙' : '☀️'}
                </div>
                <span className="font-medium text-gray-900 dark:text-white">Toggle</span>
              </div>
            </button>
          </div>

          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400">
              Current theme: <span className="font-bold text-gray-900 dark:text-white">{theme}</span>
            </p>
          </div>
        </div>

        {/* Sample Components */}
        <div className="space-y-8">
          {/* Sample Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 transition-colors">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Sample Competition Card</h3>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-gray-900 dark:text-white">iPhone 15 Pro Max - 1TB Titanium</h4>
                <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-3 py-1 rounded-full text-sm">Active</span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">Premium smartphone with advanced features</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-500 dark:text-gray-400 text-sm">Base Price:</span>
                  <div className="font-bold text-gray-900 dark:text-white text-lg">$1,199</div>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400 text-sm">Participants:</span>
                  <div className="font-bold text-gray-900 dark:text-white text-lg">47</div>
                </div>
              </div>
            </div>
          </div>

          {/* Color Showcase */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 transition-colors">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Color Showcase</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-lg">
                <div className="text-red-800 dark:text-red-200 font-bold">Red</div>
                <div className="text-red-600 dark:text-red-400 text-sm">Danger/Alert</div>
              </div>
              <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-lg">
                <div className="text-green-800 dark:text-green-200 font-bold">Green</div>
                <div className="text-green-600 dark:text-green-400 text-sm">Success/Money</div>
              </div>
              <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-lg">
                <div className="text-blue-800 dark:text-blue-200 font-bold">Blue</div>
                <div className="text-blue-600 dark:text-blue-400 text-sm">Info/Links</div>
              </div>
              <div className="bg-purple-100 dark:bg-purple-900/30 p-4 rounded-lg">
                <div className="text-purple-800 dark:text-purple-200 font-bold">Purple</div>
                <div className="text-purple-600 dark:text-purple-400 text-sm">Games/Special</div>
              </div>
            </div>
          </div>

          {/* Button Showcase */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 transition-colors">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Button Showcase</h3>
            <div className="flex flex-wrap gap-4">
              <button className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                Primary Button
              </button>
              <button className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                Secondary Button
              </button>
              <button className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white px-6 py-3 rounded-lg font-medium transition-colors">
                Neutral Button
              </button>
              <button className="border-2 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-lg font-medium transition-colors">
                Outline Button
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="mt-12 text-center">
          <div className="space-x-4">
            <Link href="/" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium">
              ← Back to Home
            </Link>
            <Link href="/settings" className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium">
              Go to Settings →
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-gray-950 text-white py-8 mt-16 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">Dark Mode Test - DropDollar Platform</p>
        </div>
      </footer>
    </div>
  );
}
