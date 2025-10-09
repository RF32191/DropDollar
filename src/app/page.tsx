'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import UserMenu from '@/components/navigation/UserMenu';

export default function HomePage() {
  const { user, isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Professional Header */}
      <header className="bg-gray-800 shadow-lg border-b border-green-500/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-4 group">
              <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center overflow-hidden">
                <img 
                  src="/DropCoin.png" 
                  alt="DropDollar Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold text-white">DropDollar</span>
                <span className="text-xs text-gray-400 font-medium tracking-wide">
                  PROFESSIONAL GAMING MARKETPLACE
                </span>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="flex items-center space-x-6">
              <Link href="/listings" className="text-gray-300 hover:text-green-400 font-medium">Browse</Link>
              <Link href="/games" className="text-purple-400 hover:text-purple-300 font-bold">🎮 Games</Link>
              <Link href="/tournaments" className="text-yellow-400 hover:text-yellow-300 font-bold">🏆 Tournaments</Link>
              <Link href="/hot-sell" className="text-red-400 hover:text-red-300 font-bold">🔥 Hot Sell</Link>
              <div className="ml-4 pl-4 border-l border-gray-600">
                <UserMenu variant="dark" />
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-white mb-6">
            Welcome to DropDollar
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Professional gaming marketplace with Amazon-level security, session management, 
            and comprehensive user profiles backed by Supabase.
          </p>
          
          {/* Professional Features Banner */}
          <div className="mb-8 p-6 bg-blue-900 border border-blue-500 rounded-lg max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-blue-200 mb-4">🚀 Professional Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
              <div className="bg-blue-800 p-4 rounded-lg">
                <h3 className="font-bold text-blue-100 mb-2">🔐 Secure Authentication</h3>
                <p className="text-blue-300 text-sm">Amazon-level login system with auto-logout, session management, and 2FA support</p>
              </div>
              <div className="bg-blue-800 p-4 rounded-lg">
                <h3 className="font-bold text-blue-100 mb-2">👤 User Profiles</h3>
                <p className="text-blue-300 text-sm">Comprehensive profiles with preferences, activity tracking, and security events</p>
              </div>
              <div className="bg-blue-800 p-4 rounded-lg">
                <h3 className="font-bold text-blue-100 mb-2">⚡ Real-time Updates</h3>
                <p className="text-blue-300 text-sm">Live session monitoring, activity logs, and instant notifications</p>
              </div>
            </div>
          </div>

          {/* Authentication Status */}
          {isAuthenticated && user ? (
            <div className="mb-8 p-6 bg-green-900 border border-green-500 rounded-lg max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold text-green-200 mb-2">✅ Successfully Authenticated!</h2>
              <p className="text-green-300 mb-4">
                Welcome back, {user.firstName}! Your session is active and secure.
              </p>
              <div className="flex justify-center space-x-4">
                <Link 
                  href="/dashboard" 
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Go to Dashboard
                </Link>
                <Link 
                  href="/profile" 
                  className="bg-green-700 text-white px-6 py-3 rounded-lg hover:bg-green-800 transition-colors font-medium"
                >
                  View Profile
                </Link>
              </div>
            </div>
          ) : (
            <div className="mb-8 p-6 bg-yellow-900 border border-yellow-500 rounded-lg max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold text-yellow-200 mb-2">🔑 Professional Login Required</h2>
              <p className="text-yellow-300 mb-4">
                Experience our Amazon-level authentication system with secure session management.
              </p>
              <div className="flex justify-center space-x-4">
                <Link 
                  href="/auth/login" 
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Sign In
                </Link>
                <Link 
                  href="/auth/register" 
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Create Account
                </Link>
              </div>
            </div>
          )}

          {/* Feature Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            <div className="bg-gray-800 p-8 rounded-lg border border-gray-700 hover:border-purple-500 transition-colors">
              <h3 className="text-2xl font-bold text-white mb-4">🎮 Play Games</h3>
              <p className="text-gray-300 mb-6">Compete in tournaments and win prizes with our secure gaming platform</p>
              <Link href="/games" className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors font-medium">
                Start Playing
              </Link>
            </div>

            <div className="bg-gray-800 p-8 rounded-lg border border-gray-700 hover:border-green-500 transition-colors">
              <h3 className="text-2xl font-bold text-white mb-4">💰 Buy Tokens</h3>
              <p className="text-gray-300 mb-6">Purchase tokens securely with our professional payment system</p>
              <Link href="/buy-tokens" className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium">
                Buy Now
              </Link>
            </div>

            <div className="bg-gray-800 p-8 rounded-lg border border-gray-700 hover:border-yellow-500 transition-colors">
              <h3 className="text-2xl font-bold text-white mb-4">🏆 Tournaments</h3>
              <p className="text-gray-300 mb-6">Join competitive tournaments with real-time leaderboards</p>
              <Link href="/tournaments" className="bg-yellow-600 text-white px-6 py-3 rounded-lg hover:bg-yellow-700 transition-colors font-medium">
                View Tournaments
              </Link>
            </div>
          </div>

          {/* Technical Details */}
          <div className="mt-16 p-8 bg-gray-800 border border-gray-600 rounded-lg max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-6">🛠️ Technical Implementation</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
              <div>
                <h3 className="text-lg font-bold text-green-400 mb-3">Authentication Features</h3>
                <ul className="text-gray-300 space-y-2">
                  <li>• 30-minute session timeout with auto-logout</li>
                  <li>• 5-minute warning before session expires</li>
                  <li>• Automatic session refresh every 5 minutes</li>
                  <li>• Google & GitHub OAuth integration</li>
                  <li>• Password strength validation</li>
                  <li>• Two-factor authentication support</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-bold text-blue-400 mb-3">Database Features</h3>
                <ul className="text-gray-300 space-y-2">
                  <li>• Supabase PostgreSQL backend</li>
                  <li>• Row Level Security (RLS) policies</li>
                  <li>• User activity logging</li>
                  <li>• Security event tracking</li>
                  <li>• Session management</li>
                  <li>• Real-time updates</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}