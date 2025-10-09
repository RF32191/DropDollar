'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function WalletTestPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center overflow-hidden">
                <img
                  src="/DropCoin.png"
                  alt="DropDollar Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">DropDollar</span>
            </Link>
            <nav className="flex items-center space-x-6">
              <Link href="/" className="text-gray-700 dark:text-green-400 hover:text-green-600 dark:hover:text-green-300 font-medium">Home</Link>
              <Link href="/wallet" className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-bold">💰 Wallet</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Wallet Test Page</h1>
          <p className="text-gray-600 dark:text-gray-300">Testing wallet functionality</p>
        </div>

        {!user ? (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Not Logged In</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">You need to log in to see your wallet.</p>
            <Link 
              href="/auth/login"
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold"
            >
              Login
            </Link>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">User Info</h2>
            <div className="space-y-2">
              <p className="text-gray-600 dark:text-gray-300">
                <strong>Name:</strong> {user.firstName} {user.lastName}
              </p>
              <p className="text-gray-600 dark:text-gray-300">
                <strong>Email:</strong> {user.email}
              </p>
              <p className="text-gray-600 dark:text-gray-300">
                <strong>User ID:</strong> {user.id}
              </p>
              {user.wallet ? (
                <div>
                  <p className="text-gray-600 dark:text-gray-300">
                    <strong>Wallet Address:</strong> {user.wallet.address}
                  </p>
                  <p className="text-gray-600 dark:text-gray-300">
                    <strong>USD Balance:</strong> ${user.wallet.balances.USD}
                  </p>
                  <p className="text-gray-600 dark:text-gray-300">
                    <strong>DROP Balance:</strong> {user.wallet.balances.DROP} DROP
                  </p>
                </div>
              ) : (
                <p className="text-red-600 dark:text-red-400">No wallet found</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
