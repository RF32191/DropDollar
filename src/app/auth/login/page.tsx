'use client';

import { useState } from 'react';
import Link from 'next/link';
import { EyeIcon, EyeSlashIcon, ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import CleanNavigation from '@/components/navigation/CleanNavigation';
import { useAuth } from '@/contexts/AuthContext';

export default function SimpleLoginPage() {
  const { login } = useAuth(); // USE REAL AUTH!
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(true);
  
  // Detect Safari
  const isSafari = typeof navigator !== 'undefined' && 
                   /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Basic validation
    if (!email || !password) {
      setError('Please enter both email and password.');
      setIsSubmitting(false);
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
      setIsSubmitting(false);
      return;
    }

    // REAL AUTHENTICATION using AuthContext
    try {
      console.log('🔐 Attempting login with Supabase...');
      await login(email.trim(), password, rememberMe);
      
      console.log('✅ Login successful! Redirecting to dashboard...');
      
      // Redirect to dashboard
      window.location.href = '/dashboard';
    } catch (error: any) {
      console.error('❌ Login failed:', error);
      setError(error.message || 'Login failed. Please check your credentials.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex flex-col justify-center py-16 sm:py-12 px-4 sm:px-6 lg:px-8">
      {/* Navigation */}
      <nav className="absolute top-0 left-0 right-0 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2 sm:space-x-3 group">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
              <img
                src="/DropCoin.png"
                alt="DropDollar Logo"
                className="w-5 h-5 sm:w-6 sm:h-6 object-contain"
              />
            </div>
            <span className="text-lg sm:text-xl font-extrabold text-white group-hover:text-yellow-300 transition-colors drop-shadow-lg">DropDollar</span>
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            <Link href="/" className="text-white hover:text-yellow-300 font-medium transition-colors">
              Home
            </Link>
            <Link href="/games" className="text-purple-300 hover:text-purple-200 font-medium transition-colors">
              🎮 Games
            </Link>
            <Link href="/tournaments" className="text-yellow-300 hover:text-yellow-200 font-medium transition-colors">
              🏆 Tournaments
            </Link>
            <Link href="/hot-sell" className="text-red-300 hover:text-red-200 font-medium transition-colors">
              🔥 Hot Sell
            </Link>
            <Link href="/buy-tokens" className="text-green-300 hover:text-green-200 font-medium transition-colors">
              💰 Buy Tokens
            </Link>
          </div>
          
          {/* Mobile Navigation - Icons only */}
          <div className="flex md:hidden items-center space-x-3">
            <Link href="/" className="text-white hover:text-yellow-300 text-xl transition-colors">🏠</Link>
            <Link href="/games" className="text-purple-300 hover:text-purple-200 text-xl transition-colors">🎮</Link>
            <Link href="/hot-sell" className="text-red-300 hover:text-red-200 text-xl transition-colors">🔥</Link>
          </div>
        </div>
      </nav>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center group">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-full flex items-center justify-center mr-3 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
              <img
                src="/DropCoin.png"
                alt="DropDollar Logo"
                className="w-8 h-8 object-contain"
              />
            </div>
            <span className="text-3xl font-extrabold text-white group-hover:text-yellow-300 transition-colors drop-shadow-lg">DropDollar</span>
          </Link>
        </div>

        {/* Account Management Buttons */}
        <div className="bg-gray-800 py-8 px-4 shadow-2xl sm:rounded-lg sm:px-10 border border-gray-700">
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-white text-center">
              Sign in to your account
            </h2>
            <p className="mt-2 text-sm text-gray-400 text-center">
              Or{' '}
              <Link href="/auth/register" className="font-medium text-blue-400 hover:text-blue-300">
                create a new account
              </Link>
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Safari Warning */}
            {isSafari && (
              <div className="rounded-md bg-blue-900/50 border border-blue-500/30 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-200">Safari User Tips</h3>
                    <div className="mt-2 text-sm text-blue-300">
                      <p>If login is slow or fails:</p>
                      <ul className="list-disc ml-4 mt-1 space-y-1">
                        <li>Disable Private Browsing mode</li>
                        <li>Enable cookies: Settings → Safari → Privacy</li>
                        <li>Try Chrome or Firefox for best experience</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {error && (
              <div className="rounded-md bg-red-900 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-200">Login failed</h3>
                    <div className="mt-2 text-sm text-red-300">
                      <p>{error}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-gray-700 text-white"
                  placeholder="you@example.com"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 pr-10 border border-gray-600 rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-gray-700 text-white"
                  placeholder="••••••••"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-200"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isSubmitting}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-700"
                  disabled={isSubmitting}
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-300">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <Link href="/auth/forgot-password" className="font-medium text-blue-400 hover:text-blue-300">
                  Forgot your password?
                </Link>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                {isSubmitting ? (
                  <ArrowPathIcon className="h-5 w-5 animate-spin mr-2" />
                ) : null}
                Sign in
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}