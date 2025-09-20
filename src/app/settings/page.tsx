'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useTheme } from '@/contexts/ThemeContext';
import { 
  MoonIcon, 
  SunIcon, 
  ComputerDesktopIcon,
  BellIcon,
  ShieldCheckIcon,
  UserIcon,
  CogIcon,
  PaintBrushIcon,
  EyeIcon,
  DevicePhoneMobileIcon
} from '@heroicons/react/24/outline';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    sms: true,
    marketing: false
  });

  const handleNotificationChange = (key: keyof typeof notifications) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <div className="w-10 h-10 mr-3">
                <img
                  src="/DropCoin.png"
                  alt="Dollar Drop Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">Dollar Drop</span>
            </Link>
            <nav className="flex items-center space-x-6">
              <Link href="/listings" className="text-gray-700 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 font-medium">Browse</Link>
              <Link href="/categories" className="text-gray-700 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 font-medium">Categories</Link>
              <Link href="/games" className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-bold">🎮 Games</Link>
              <Link href="/tournaments" className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-bold">🏆 Tournaments</Link>
              <Link href="/hot-sell" className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-bold">🔥 Hot Sell</Link>
              <Link href="/how-it-works" className="text-gray-700 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 font-medium">How It Works</Link>
              <Link href="/buy-tokens" className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-bold">💰 Buy Tokens</Link>
              <div className="flex items-center space-x-3 ml-4 pl-4 border-l border-gray-200 dark:border-gray-700">
                <Link href="/wallet" className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-bold">👛 Wallet</Link>
                <Link href="/settings" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-bold">⚙️ Settings</Link>
                <Link href="/auth/login" className="text-gray-700 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 font-medium">Sign In</Link>
                <Link href="/auth/register" className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">Sign Up</Link>
                <Link href="/seller/apply" className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">Sell</Link>
              </div>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            ⚙️ Settings
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Customize your Dollar Drop experience with themes, notifications, and preferences
          </p>
        </div>

        <div className="space-y-8">
          {/* Appearance Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 transition-colors">
            <div className="flex items-center mb-6">
              <PaintBrushIcon className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-3" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Appearance</h2>
            </div>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Theme</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                      <span className="text-sm text-gray-500 dark:text-gray-400">Bright and clean</span>
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
                      <span className="text-sm text-gray-500 dark:text-gray-400">Easy on the eyes</span>
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
                      <span className="text-sm text-gray-500 dark:text-gray-400">Match device</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Theme Preview */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Preview</h4>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="font-bold text-gray-900 dark:text-white">Sample Competition Card</h5>
                    <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded-full text-xs">Active</span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">iPhone 15 Pro Max - 1TB Titanium</p>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-gray-400 text-sm">Base Price:</span>
                    <span className="font-bold text-gray-900 dark:text-white">$1,199</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 transition-colors">
            <div className="flex items-center mb-6">
              <BellIcon className="h-6 w-6 text-green-600 dark:text-green-400 mr-3" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h2>
            </div>
            
            <div className="space-y-4">
              {[
                { key: 'email', label: 'Email Notifications', description: 'Competition updates and results' },
                { key: 'push', label: 'Push Notifications', description: 'Browser notifications for important events' },
                { key: 'sms', label: 'SMS Notifications', description: 'Text messages for urgent updates' },
                { key: 'marketing', label: 'Marketing Emails', description: 'Special offers and promotions' }
              ].map(({ key, label, description }) => (
                <div key={key} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">{label}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
                  </div>
                  <button
                    onClick={() => handleNotificationChange(key as keyof typeof notifications)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      notifications[key as keyof typeof notifications]
                        ? 'bg-green-600'
                        : 'bg-gray-200 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        notifications[key as keyof typeof notifications] ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Account Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 transition-colors">
            <div className="flex items-center mb-6">
              <UserIcon className="h-6 w-6 text-purple-600 dark:text-purple-400 mr-3" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Account</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link href="/wallet/setup-2fa" className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                <div className="flex items-center">
                  <ShieldCheckIcon className="h-6 w-6 text-green-600 dark:text-green-400 mr-3" />
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Two-Factor Authentication</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Secure your account</p>
                  </div>
                </div>
              </Link>

              <Link href="/wallet" className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                <div className="flex items-center">
                  <CogIcon className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-3" />
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Wallet Settings</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Manage your tokens</p>
                  </div>
                </div>
              </Link>
            </div>
          </div>

          {/* Gaming Preferences */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 transition-colors">
            <div className="flex items-center mb-6">
              <EyeIcon className="h-6 w-6 text-red-600 dark:text-red-400 mr-3" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Gaming Preferences</h2>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Display Settings</h4>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input type="checkbox" className="rounded border-gray-300 dark:border-gray-600 text-green-600 focus:ring-green-500" defaultChecked />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Show game animations</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="rounded border-gray-300 dark:border-gray-600 text-green-600 focus:ring-green-500" defaultChecked />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Play sound effects</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="rounded border-gray-300 dark:border-gray-600 text-green-600 focus:ring-green-500" />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Reduced motion (accessibility)</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* About Section */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 transition-colors">
            <div className="flex items-center mb-6">
              <DevicePhoneMobileIcon className="h-6 w-6 text-gray-600 dark:text-gray-400 mr-3" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">About</h2>
            </div>
            
            <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex justify-between">
                <span>Version:</span>
                <span className="font-medium">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span>Last Updated:</span>
                <span className="font-medium">December 2024</span>
              </div>
              <div className="flex justify-between">
                <span>Platform:</span>
                <span className="font-medium">Dollar Drop Gaming Marketplace</span>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="flex flex-wrap gap-4 text-sm">
                <Link href="/privacy" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">Privacy Policy</Link>
                <Link href="/terms" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">Terms of Service</Link>
                <Link href="/how-it-works" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">How It Works</Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-gray-950 text-white py-8 mt-16 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">© 2024 Dollar Drop - Revolutionary Skill-Based Gaming Marketplace</p>
          <div className="mt-4 flex justify-center space-x-6">
            <Link href="/how-it-works" className="text-gray-400 hover:text-white">How It Works</Link>
            <Link href="/games" className="text-gray-400 hover:text-white">Practice Games</Link>
            <Link href="/tournaments" className="text-gray-400 hover:text-white">Tournaments</Link>
            <Link href="/settings" className="text-gray-400 hover:text-white">Settings</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
