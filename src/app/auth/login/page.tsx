'use client';

import { useState } from 'react';
import Link from 'next/link'; location checks ti
import { EyeIcon, EyeSlashIcon, ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

export default function SimpleLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);

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

    // Simple login simulation
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Set user data in localStorage for the username dropdown
      const userData = {
        username: email.split('@')[0], // Use email prefix as username
        firstName: email.split('@')[0],
        lastName: '',
        email: email
      };
      
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('isLoggedIn', 'true');
      
      // For now, just redirect to dashboard
      window.location.href = '/dashboard';
    } catch (error) {
      setError('Login failed. Please try again.');
    }
    
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
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