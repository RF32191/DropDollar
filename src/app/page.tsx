'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import UserMenu from '@/components/navigation/UserMenu';
import CleanNavigation from '@/components/navigation/CleanNavigation';

export default function HomePage() {
  const { user, isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      {/* Clean Navigation */}
      <CleanNavigation variant="gradient" currentPage="/" />

      {/* Flashy Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          {/* Animated Welcome Title */}
          <div className="mb-12">
            <h1 className="text-7xl font-extrabold mb-6">
              <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent animate-pulse">
                Welcome to
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                DropDollar
              </span>
            </h1>
            <div className="w-32 h-1 bg-gradient-to-r from-yellow-400 to-red-500 mx-auto rounded-full animate-pulse"></div>
          </div>

          <p className="text-2xl text-white mb-12 max-w-4xl mx-auto font-medium leading-relaxed">
            🚀 The Ultimate Gaming Marketplace with 
            <span className="text-yellow-300 font-bold"> Amazon-Level Security</span>, 
            <span className="text-blue-300 font-bold"> Real-Time Gaming</span>, and 
            <span className="text-purple-300 font-bold"> Professional Features</span>
          </p>
          
          {/* Flashy Features Banner */}
          <div className="mb-12 p-8 bg-gradient-to-r from-blue-900 via-purple-900 to-indigo-900 border-2 border-blue-400 rounded-2xl max-w-6xl mx-auto shadow-2xl">
            <h2 className="text-4xl font-bold text-transparent bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text mb-8">
              ⚡ Professional Features ⚡
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              <div className="bg-gradient-to-br from-blue-800 to-purple-800 p-6 rounded-xl border border-blue-400 hover:border-blue-300 transition-all duration-300 hover:scale-105">
                <h3 className="font-bold text-blue-200 mb-3 text-xl">🔐 Secure Authentication</h3>
                <p className="text-blue-300">Amazon-level login system with auto-logout, session management, and 2FA support</p>
              </div>
              <div className="bg-gradient-to-br from-green-800 to-blue-800 p-6 rounded-xl border border-green-400 hover:border-green-300 transition-all duration-300 hover:scale-105">
                <h3 className="font-bold text-green-200 mb-3 text-xl">👤 User Profiles</h3>
                <p className="text-green-300">Comprehensive profiles with preferences, activity tracking, and security events</p>
              </div>
              <div className="bg-gradient-to-br from-purple-800 to-pink-800 p-6 rounded-xl border border-purple-400 hover:border-purple-300 transition-all duration-300 hover:scale-105">
                <h3 className="font-bold text-purple-200 mb-3 text-xl">⚡ Real-time Updates</h3>
                <p className="text-purple-300">Live session monitoring, activity logs, and instant notifications</p>
              </div>
            </div>
          </div>

          {/* Authentication Status */}
          {isAuthenticated && user ? (
            <div className="mb-12 p-8 bg-gradient-to-r from-green-900 to-emerald-900 border-2 border-green-400 rounded-2xl max-w-3xl mx-auto shadow-2xl">
              <h2 className="text-3xl font-bold text-green-200 mb-4">✅ Successfully Authenticated!</h2>
              <p className="text-green-300 mb-6 text-lg">
                Welcome back, {user.firstName}! Your session is active and secure.
              </p>
              <div className="flex justify-center space-x-6">
                <Link 
                  href="/dashboard" 
                  className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-4 rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-300 font-bold text-lg shadow-lg hover:shadow-2xl hover:scale-105"
                >
                  Go to Dashboard
                </Link>
                <Link 
                  href="/profile" 
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 font-bold text-lg shadow-lg hover:shadow-2xl hover:scale-105"
                >
                  View Profile
                </Link>
              </div>
            </div>
          ) : (
            <div className="mb-12 p-8 bg-gradient-to-r from-yellow-900 to-orange-900 border-2 border-yellow-400 rounded-2xl max-w-3xl mx-auto shadow-2xl">
              <h2 className="text-3xl font-bold text-yellow-200 mb-4">🔑 Professional Login Required</h2>
              <p className="text-yellow-300 mb-6 text-lg">
                Experience our Amazon-level authentication system with secure session management.
              </p>
              <div className="flex justify-center space-x-6">
                <Link 
                  href="/auth/login" 
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 font-bold text-lg shadow-lg hover:shadow-2xl hover:scale-105"
                >
                  Sign In
                </Link>
                <Link 
                  href="/auth/register" 
                  className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-4 rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-300 font-bold text-lg shadow-lg hover:shadow-2xl hover:scale-105"
                >
                  Create Account
                </Link>
              </div>
            </div>
          )}

          {/* Flashy Feature Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <div className="bg-gradient-to-br from-purple-800 to-pink-800 p-8 rounded-2xl border-2 border-purple-400 hover:border-purple-300 transition-all duration-300 hover:scale-105 shadow-2xl">
              <h3 className="text-3xl font-bold text-white mb-6">🎮 Play Games</h3>
              <p className="text-purple-200 mb-8 text-lg">Compete in tournaments and win prizes with our secure gaming platform</p>
              <Link href="/games" className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-300 font-bold text-lg shadow-lg hover:shadow-2xl hover:scale-105 inline-block">
                Start Playing
              </Link>
            </div>

            <div className="bg-gradient-to-br from-green-800 to-emerald-800 p-8 rounded-2xl border-2 border-green-400 hover:border-green-300 transition-all duration-300 hover:scale-105 shadow-2xl">
              <h3 className="text-3xl font-bold text-white mb-6">💰 Buy Tokens</h3>
              <p className="text-green-200 mb-8 text-lg">Purchase tokens securely with our professional payment system</p>
              <Link href="/buy-tokens" className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-4 rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-300 font-bold text-lg shadow-lg hover:shadow-2xl hover:scale-105 inline-block">
                Buy Now
              </Link>
            </div>

            <div className="bg-gradient-to-br from-yellow-800 to-orange-800 p-8 rounded-2xl border-2 border-yellow-400 hover:border-yellow-300 transition-all duration-300 hover:scale-105 shadow-2xl">
              <h3 className="text-3xl font-bold text-white mb-6">🏆 Tournaments</h3>
              <p className="text-yellow-200 mb-8 text-lg">Join competitive tournaments with real-time leaderboards</p>
              <Link href="/tournaments" className="bg-gradient-to-r from-yellow-600 to-orange-600 text-white px-8 py-4 rounded-xl hover:from-yellow-700 hover:to-orange-700 transition-all duration-300 font-bold text-lg shadow-lg hover:shadow-2xl hover:scale-105 inline-block">
                View Tournaments
              </Link>
            </div>
          </div>

          {/* Technical Details */}
          <div className="mt-20 p-10 bg-gradient-to-r from-slate-800 to-gray-800 border-2 border-slate-600 rounded-2xl max-w-6xl mx-auto shadow-2xl">
            <h2 className="text-4xl font-bold text-transparent bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text mb-8">
              🛠️ Technical Implementation
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
              <div>
                <h3 className="text-2xl font-bold text-green-400 mb-4">Authentication Features</h3>
                <ul className="text-gray-300 space-y-3 text-lg">
                  <li>• 30-minute session timeout with auto-logout</li>
                  <li>• 5-minute warning before session expires</li>
                  <li>• Automatic session refresh every 5 minutes</li>
                  <li>• Google & GitHub OAuth integration</li>
                  <li>• Password strength validation</li>
                  <li>• Two-factor authentication support</li>
                </ul>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-blue-400 mb-4">Database Features</h3>
                <ul className="text-gray-300 space-y-3 text-lg">
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