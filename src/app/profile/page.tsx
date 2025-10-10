'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  UserIcon, 
  EnvelopeIcon, 
  CalendarIcon,
  TrophyIcon,
  CurrencyDollarIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

export default function ProfilePage() {
  const [user, setUser] = useState<{
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    createdAt?: string;
  } | null>(null);

  useEffect(() => {
    // Get user info from localStorage
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser({
          username: parsedUser.username || 'User',
          firstName: parsedUser.firstName || 'User',
          lastName: parsedUser.lastName || '',
          email: parsedUser.email || '',
          createdAt: parsedUser.createdAt || new Date().toISOString()
        });
      }
    } catch (error) {
      console.log('No user data found');
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 via-purple-500 to-indigo-500 shadow-2xl border-b-4 border-blue-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-4 group">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 via-purple-500 to-indigo-500 rounded-full flex items-center justify-center overflow-hidden shadow-lg group-hover:shadow-2xl transition-all duration-300 group-hover:scale-110">
                <img 
                  src="/DropCoin.png" 
                  alt="DropDollar Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-3xl font-extrabold text-white drop-shadow-lg">DropDollar</span>
                <span className="text-sm text-blue-200 font-bold tracking-wider animate-pulse">
                  ⚡ USER PROFILE ⚡
                </span>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="flex items-center space-x-8">
              <Link href="/dashboard" className="text-white hover:text-blue-300 font-bold text-lg transition-all duration-300 hover:scale-105">📊 Dashboard</Link>
              <Link href="/games" className="text-white hover:text-blue-300 font-bold text-lg transition-all duration-300 hover:scale-105">🎮 Games</Link>
              <Link href="/tournaments" className="text-white hover:text-blue-300 font-bold text-lg transition-all duration-300 hover:scale-105">🏆 Tournaments</Link>
              <Link href="/hot-sell" className="text-white hover:text-blue-300 font-bold text-lg transition-all duration-300 hover:scale-105">🔥 Hot Sell</Link>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Page Title */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-extrabold mb-6">
            <span className="bg-gradient-to-r from-blue-400 via-purple-500 to-indigo-500 bg-clip-text text-transparent animate-pulse">
              👤 User Profile
            </span>
          </h1>
          <div className="w-32 h-1 bg-gradient-to-r from-blue-400 to-indigo-500 mx-auto rounded-full animate-pulse mb-6"></div>
          <p className="text-xl text-transparent bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text animate-pulse">
            Manage your account and view your gaming statistics
          </p>
        </div>

        {/* Profile Card */}
        <div className="bg-gray-800 rounded-2xl p-8 shadow-2xl border border-gray-700 mb-8">
          <div className="flex items-center space-x-6 mb-8">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <UserIcon className="h-12 w-12 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white">
                {user?.firstName} {user?.lastName}
              </h2>
              <p className="text-xl text-gray-300">@{user?.username}</p>
              <p className="text-gray-400">DropDollar Player</p>
            </div>
          </div>

          {/* User Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-700 rounded-lg p-6">
              <div className="flex items-center space-x-3 mb-4">
                <EnvelopeIcon className="h-6 w-6 text-blue-400" />
                <h3 className="text-lg font-semibold text-white">Email</h3>
              </div>
              <p className="text-gray-300">{user?.email || 'Not provided'}</p>
            </div>

            <div className="bg-gray-700 rounded-lg p-6">
              <div className="flex items-center space-x-3 mb-4">
                <CalendarIcon className="h-6 w-6 text-green-400" />
                <h3 className="text-lg font-semibold text-white">Member Since</h3>
              </div>
              <p className="text-gray-300">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Recently'}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-green-800 to-emerald-800 p-6 rounded-xl border-2 border-green-400 hover:border-green-300 transition-all duration-300 hover:scale-105 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-white">Games Played</h3>
                <p className="text-green-200 text-lg">0</p>
              </div>
              <TrophyIcon className="h-12 w-12 text-green-400" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-800 to-orange-800 p-6 rounded-xl border-2 border-yellow-400 hover:border-yellow-300 transition-all duration-300 hover:scale-105 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-white">Victories</h3>
                <p className="text-yellow-200 text-lg">0</p>
              </div>
              <TrophyIcon className="h-12 w-12 text-yellow-400" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-800 to-purple-800 p-6 rounded-xl border-2 border-blue-400 hover:border-blue-300 transition-all duration-300 hover:scale-105 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-white">Tokens</h3>
                <p className="text-blue-200 text-lg">0</p>
              </div>
              <CurrencyDollarIcon className="h-12 w-12 text-blue-400" />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-transparent bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text mb-8">
            Quick Actions
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/games"
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300"
            >
              🎮 Play Games
            </Link>
            <Link
              href="/buy-tokens"
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300"
            >
              💰 Buy Tokens
            </Link>
            <Link
              href="/tournaments"
              className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300"
            >
              🏆 Tournaments
            </Link>
            <Link
              href="/hot-sell"
              className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300"
            >
              🔥 Hot Sell
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
