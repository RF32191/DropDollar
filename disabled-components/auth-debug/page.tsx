'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import UserMenu from '@/components/navigation/UserMenu';

export default function AuthDebugPage() {
  const { user, isLoading, disableAutoLoad, enableAutoLoad, forceLogout } = useAuth();
  const [autoLoadStatus, setAutoLoadStatus] = useState(
    typeof window !== 'undefined' ? localStorage.getItem('disable_auto_auth_load') === 'true' : false
  );

  const handleToggleAutoLoad = () => {
    if (autoLoadStatus) {
      enableAutoLoad();
      setAutoLoadStatus(false);
    } else {
      disableAutoLoad();
      setAutoLoadStatus(true);
    }
  };

  const handleForceLogout = async () => {
    await forceLogout();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
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
              <span className="text-xl font-bold text-gray-900">DropDollar</span>
            </Link>
            <div className="flex items-center space-x-4">
              <Link href="/games" className="text-purple-600 hover:text-purple-700 font-bold">
                🎮 Games
              </Link>
              <UserMenu variant="light" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            🔧 Authentication Debug Panel
          </h1>

          {/* Current Status */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Current Status</h2>
            <div className="bg-gray-100 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="font-medium">Loading:</span>
                  <span className={`ml-2 px-2 py-1 rounded text-sm ${isLoading ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                    {isLoading ? 'Yes' : 'No'}
                  </span>
                </div>
                <div>
                  <span className="font-medium">User Logged In:</span>
                  <span className={`ml-2 px-2 py-1 rounded text-sm ${user ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {user ? 'Yes' : 'No'}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Auto-Load Disabled:</span>
                  <span className={`ml-2 px-2 py-1 rounded text-sm ${autoLoadStatus ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                    {autoLoadStatus ? 'Yes' : 'No'}
                  </span>
                </div>
                <div>
                  <span className="font-medium">User Email:</span>
                  <span className="ml-2 text-gray-600">{user?.email || 'Not logged in'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Controls</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900">Auto-Load Authentication</h3>
                  <p className="text-sm text-gray-600">
                    {autoLoadStatus 
                      ? 'Disabled - Account will NOT auto-load on page refresh' 
                      : 'Enabled - Account will auto-load on page refresh'
                    }
                  </p>
                </div>
                <button
                  onClick={handleToggleAutoLoad}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    autoLoadStatus 
                      ? 'bg-green-600 hover:bg-green-700 text-white' 
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
                >
                  {autoLoadStatus ? 'Enable Auto-Load' : 'Disable Auto-Load'}
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                <div>
                  <h3 className="font-medium text-red-900">Force Logout</h3>
                  <p className="text-sm text-red-700">
                    Clears ALL data and forces logout - use if stuck in auth loop
                  </p>
                </div>
                <button
                  onClick={handleForceLogout}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                  🚨 Force Logout
                </button>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Instructions</h2>
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h3 className="font-medium text-blue-900 mb-2">If you're experiencing authentication issues:</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
                <li>First, try disabling auto-load to prevent account from loading on every page</li>
                <li>If that doesn't work, use Force Logout to clear everything</li>
                <li>Refresh the page and try logging in again</li>
                <li>Re-enable auto-load once everything is working</li>
              </ol>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-center space-x-4">
            <Link 
              href="/games" 
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
            >
              🎮 Go to Games
            </Link>
            <Link 
              href="/" 
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
            >
              🏠 Go Home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
