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
      {/* SILVER SETTINGS Header */}
      <header className="bg-gradient-to-r from-gray-400 via-gray-500 to-slate-600 dark:from-gray-600 dark:via-gray-700 dark:to-slate-800 shadow-2xl border-b-4 border-gray-600 dark:border-gray-500">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            {/* Logo Section */}
            <Link href="/" className="flex items-center group">
              <div className="bg-gradient-to-br from-gray-300 to-slate-500 dark:from-gray-400 dark:to-slate-600 p-3 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105 mr-4">
                <img
                  src="/DropCoin.png"
                  alt="DropDollar Logo"
                  className="w-8 h-8 object-contain"
                />
              </div>
              <div className="text-2xl font-bold bg-gradient-to-r from-white to-gray-100 dark:from-gray-100 dark:to-white bg-clip-text text-transparent group-hover:from-gray-100 group-hover:to-white transition-all duration-300">
                DropDollar
              </div>
            </Link>

            {/* SILVER Navigation */}
            <nav className="flex-1 mx-4">
              <div className="flex items-center justify-center space-x-4">
                <Link href="/listings" className="text-gray-100 dark:text-gray-200 hover:text-white dark:hover:text-gray-100 font-medium transition-colors text-sm px-3 py-2 rounded-lg hover:bg-gray-600/30">Browse</Link>
                <Link href="/categories" className="text-gray-100 dark:text-gray-200 hover:text-white dark:hover:text-gray-100 font-medium transition-colors text-sm px-3 py-2 rounded-lg hover:bg-gray-600/30">Categories</Link>
                <Link href="/games" className="text-gray-100 dark:text-gray-200 hover:text-white dark:hover:text-gray-100 font-medium transition-colors text-sm px-3 py-2 rounded-lg hover:bg-gray-600/30">🎮 Games</Link>
                <Link href="/tournaments" className="text-gray-100 dark:text-gray-200 hover:text-white dark:hover:text-gray-100 font-medium transition-colors text-sm px-3 py-2 rounded-lg hover:bg-gray-600/30">🏆 Tournaments</Link>
                
                {/* Active Settings Link */}
                <div className="bg-gradient-to-r from-gray-300 to-slate-400 dark:from-gray-400 dark:to-slate-500 px-4 py-2 rounded-xl shadow-lg">
                  <Link href="/settings" className="text-gray-900 dark:text-gray-800 hover:text-gray-800 dark:hover:text-gray-700 font-bold transition-colors text-sm">⚙️ Settings</Link>
                </div>
                
                <Link href="/hot-sell" className="text-gray-100 dark:text-gray-200 hover:text-white dark:hover:text-gray-100 font-medium transition-colors text-sm px-3 py-2 rounded-lg hover:bg-gray-600/30">🔥 Hot Sell</Link>
                <Link href="/how-it-works" className="text-gray-100 dark:text-gray-200 hover:text-white dark:hover:text-gray-100 font-medium transition-colors text-sm px-3 py-2 rounded-lg hover:bg-gray-600/30">How It Works</Link>
              </div>
            </nav>

            {/* User Actions */}
            <div className="flex items-center space-x-2">
              <Link href="/auth/login" className="text-gray-100 dark:text-gray-200 hover:text-white dark:hover:text-gray-100 font-medium transition-colors text-sm px-3 py-2 rounded-lg hover:bg-gray-600/30">Sign In</Link>
              <Link href="/auth/register" className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border border-white/30">Sign Up</Link>
              <Link href="/seller/apply" className="bg-gray-300 hover:bg-gray-200 text-gray-900 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-lg">Sell</Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* SILVER Hero Section */}
        <div className="bg-gradient-to-br from-gray-400 via-slate-500 to-gray-600 dark:from-gray-600 dark:via-slate-700 dark:to-gray-800 rounded-3xl p-8 mb-8 shadow-2xl border-4 border-gray-500 dark:border-gray-400">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 drop-shadow-lg">
              ⚙️ Settings & Preferences ⚙️
            </h1>
            <p className="text-xl text-gray-100 dark:text-gray-200 max-w-4xl mx-auto mb-6">
              Customize your DropDollar experience with themes, notifications, and personal preferences
            </p>
            
            {/* Settings Quick Stats */}
            <div className="bg-white/20 dark:bg-black/20 backdrop-blur-sm rounded-2xl p-6 max-w-3xl mx-auto border border-white/30">
              <h2 className="text-2xl font-bold text-white mb-4">
                Personalize Your Experience
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-white">
                <div className="bg-white/10 rounded-xl p-4">
                  <div className="text-3xl font-bold">🎨</div>
                  <div className="text-sm">Theme Options</div>
                </div>
                <div className="bg-white/10 rounded-xl p-4">
                  <div className="text-3xl font-bold">🔔</div>
                  <div className="text-sm">Notifications</div>
                </div>
                <div className="bg-white/10 rounded-xl p-4">
                  <div className="text-3xl font-bold">🔒</div>
                  <div className="text-sm">Privacy & Security</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Appearance Settings */}
          <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-3xl shadow-2xl p-8 transition-colors border-2 border-gray-200 dark:border-gray-600 hover:shadow-3xl hover:scale-105 transition-all duration-300">
            <div className="flex items-center mb-6">
              <div className="bg-gradient-to-br from-gray-300 to-slate-500 dark:from-gray-400 dark:to-slate-600 p-3 rounded-2xl shadow-lg mr-4">
                <PaintBrushIcon className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Appearance & Theme</h2>
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
          <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-3xl shadow-2xl p-8 transition-colors border-2 border-gray-200 dark:border-gray-600 hover:shadow-3xl hover:scale-105 transition-all duration-300">
            <div className="flex items-center mb-6">
              <div className="bg-gradient-to-br from-gray-300 to-slate-500 dark:from-gray-400 dark:to-slate-600 p-3 rounded-2xl shadow-lg mr-4">
                <BellIcon className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Notification Preferences</h2>
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
          <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-3xl shadow-2xl p-8 transition-colors border-2 border-gray-200 dark:border-gray-600 hover:shadow-3xl hover:scale-105 transition-all duration-300">
            <div className="flex items-center mb-6">
              <div className="bg-gradient-to-br from-gray-300 to-slate-500 dark:from-gray-400 dark:to-slate-600 p-3 rounded-2xl shadow-lg mr-4">
                <UserIcon className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Account & Security</h2>
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

            </div>
          </div>

          {/* Gaming Preferences */}
          <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-3xl shadow-2xl p-8 transition-colors border-2 border-gray-200 dark:border-gray-600 hover:shadow-3xl hover:scale-105 transition-all duration-300">
            <div className="flex items-center mb-6">
              <div className="bg-gradient-to-br from-gray-300 to-slate-500 dark:from-gray-400 dark:to-slate-600 p-3 rounded-2xl shadow-lg mr-4">
                <DevicePhoneMobileIcon className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Gaming & Display Preferences</h2>
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
                <span className="font-medium">DropDollar Gaming Marketplace</span>
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
          <p className="text-gray-400">© 2024 DropDollar - Revolutionary Skill-Based Gaming Marketplace</p>
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
