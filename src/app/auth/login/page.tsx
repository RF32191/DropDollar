'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login, loginWithGoogle, loginWithGitHub } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    console.log('🔐 Starting login process...');
    console.log('📧 Email:', email);
    console.log('🔒 Password length:', password.length);

    try {
      const result = await login(email, password);
      console.log('✅ Login result:', result);
      
      if (result.success) {
        console.log('🎉 Login successful, redirecting to dashboard...');
        // Add a small delay to ensure auth state is updated
        setTimeout(() => {
          router.push('/dashboard');
          router.refresh(); // Force a refresh to update the UI
        }, 150);
      } else {
        console.error('❌ Login failed:', result.error);
        setError(result.error || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      console.error('💥 Login error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setIsSubmitting(true);
    
    try {
      const result = await loginWithGoogle();
      if (!result.success) {
        setError(result.error || 'Google login failed');
      }
      // Note: For OAuth, success means redirect initiated, not completion
    } catch (err) {
      console.error('Google login error:', err);
      setError('An error occurred during Google login');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGitHubLogin = async () => {
    setError('');
    setIsSubmitting(true);
    
    try {
      const result = await loginWithGitHub();
      if (!result.success) {
        setError(result.error || 'GitHub login failed');
      }
      // Note: For OAuth, success means redirect initiated, not completion
    } catch (err) {
      console.error('GitHub login error:', err);
      setError('An error occurred during GitHub login');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900 transition-colors">
      {/* ENHANCED SIGN IN Header */}
      <header className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-700 dark:via-indigo-700 dark:to-purple-700 shadow-2xl border-b-4 border-blue-600 dark:border-blue-500">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            {/* Logo Section */}
            <Link href="/" className="flex items-center group">
              <div className="bg-gradient-to-br from-blue-300 to-purple-500 dark:from-blue-400 dark:to-purple-600 p-3 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105 mr-4">
                <img
                  src="/DropCoin.png"
                  alt="DropDollar Logo"
                  className="w-8 h-8 object-contain"
                />
              </div>
              <div className="text-2xl font-bold bg-gradient-to-r from-white to-blue-100 dark:from-blue-100 dark:to-white bg-clip-text text-transparent group-hover:from-blue-100 group-hover:to-white transition-all duration-300">
                DropDollar
              </div>
            </Link>

            {/* ENHANCED Navigation */}
            <nav className="flex-1 mx-4">
              <div className="flex items-center justify-center space-x-4">
                <Link href="/listings" className="text-blue-100 dark:text-blue-200 hover:text-white dark:hover:text-blue-100 font-medium transition-colors text-sm px-3 py-2 rounded-lg hover:bg-blue-600/30">Browse</Link>
                <Link href="/categories" className="text-blue-100 dark:text-blue-200 hover:text-white dark:hover:text-blue-100 font-medium transition-colors text-sm px-3 py-2 rounded-lg hover:bg-blue-600/30">Categories</Link>
                <Link href="/games" className="text-blue-100 dark:text-blue-200 hover:text-white dark:hover:text-blue-100 font-medium transition-colors text-sm px-3 py-2 rounded-lg hover:bg-blue-600/30">🎮 Games</Link>
                <Link href="/tournaments" className="text-blue-100 dark:text-blue-200 hover:text-white dark:hover:text-blue-100 font-medium transition-colors text-sm px-3 py-2 rounded-lg hover:bg-blue-600/30">🏆 Tournaments</Link>
                <Link href="/hot-sell" className="text-blue-100 dark:text-blue-200 hover:text-white dark:hover:text-blue-100 font-medium transition-colors text-sm px-3 py-2 rounded-lg hover:bg-blue-600/30">🔥 Hot Sell</Link>
                <Link href="/how-it-works" className="text-blue-100 dark:text-blue-200 hover:text-white dark:hover:text-blue-100 font-medium transition-colors text-sm px-3 py-2 rounded-lg hover:bg-blue-600/30">How It Works</Link>
              </div>
            </nav>

            {/* User Actions */}
            <div className="flex items-center space-x-2">
              {/* Active Sign In Link */}
              <div className="bg-gradient-to-r from-blue-300 to-indigo-400 dark:from-blue-400 dark:to-indigo-500 px-4 py-2 rounded-xl shadow-lg">
                <Link href="/auth/login" className="text-blue-900 dark:text-blue-800 hover:text-blue-800 dark:hover:text-blue-700 font-bold transition-colors text-sm">🔐 Sign In</Link>
              </div>
              
              <Link href="/auth/register" className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border border-white/30">Sign Up</Link>
              <Link href="/seller/apply" className="bg-blue-300 hover:bg-blue-200 text-blue-900 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-lg">Sell</Link>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        {/* Enhanced Hero Section */}
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-8">
          <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-700 dark:via-indigo-700 dark:to-purple-700 rounded-3xl p-8 shadow-2xl border-4 border-blue-500 dark:border-blue-400 mb-8">
            <div className="bg-white/20 dark:bg-black/20 backdrop-blur-sm rounded-2xl p-6 border border-white/30">
              <h1 className="text-4xl font-bold text-white mb-4 drop-shadow-lg">
                🔐 Welcome Back! 🔐
              </h1>
              <p className="text-xl text-blue-100 dark:text-blue-200">
                Sign in to continue your DropDollar journey
              </p>
            </div>
          </div>
          
          <p className="text-lg text-gray-700 dark:text-gray-300 mb-2">
            Don't have an account?{' '}
            <Link href="/auth/register" className="font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline decoration-2 underline-offset-2">
              Create one now →
            </Link>
          </p>
        </div>

        {/* Enhanced Login Form */}
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-gray-900 py-8 px-8 shadow-2xl rounded-3xl border-2 border-blue-200 dark:border-blue-600 transition-colors">
            {/* Demo Credentials */}
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-700 rounded-2xl">
              <h3 className="text-sm font-bold text-blue-800 dark:text-blue-200 mb-3 flex items-center">
                🎮 Demo Credentials:
              </h3>
              <div className="space-y-2">
                <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center justify-between">
                  <span>Email:</span>
                  <code className="bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded-lg font-mono text-xs">test@example.com</code>
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center justify-between">
                  <span>Password:</span>
                  <code className="bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded-lg font-mono text-xs">password</code>
                </p>
              </div>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
                  <div className="text-sm text-red-700 dark:text-red-300">{error}</div>
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  📧 Email Address
                </label>
                <div className="relative">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full px-4 py-3 border-2 border-blue-200 dark:border-blue-600 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 text-sm transition-all shadow-lg hover:shadow-xl"
                    placeholder="Enter your email address"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  🔒 Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none block w-full px-4 py-3 pr-12 border-2 border-blue-200 dark:border-blue-600 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 text-sm transition-all shadow-lg hover:shadow-xl"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-4 flex items-center hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-r-xl transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between py-4">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-blue-300 dark:border-blue-600 rounded transition-colors"
                  />
                  <label htmlFor="remember-me" className="ml-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    💾 Remember me
                  </label>
                </div>

                <div className="text-sm">
                  <Link href="/auth/forgot-password" className="font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline decoration-2 underline-offset-2 transition-colors">
                    🔑 Forgot password?
                  </Link>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="group relative w-full flex justify-center py-4 px-6 border-2 border-transparent text-lg font-bold rounded-2xl text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl hover:shadow-2xl hover:scale-105 transform"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      🔄 Signing in...
                    </>
                  ) : (
                    <>
                      🚀 Sign In to DropDollar
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">Or continue with</span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isSubmitting}
                  className="w-full inline-flex justify-center py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google
                </button>

                <button
                  type="button"
                  onClick={handleGitHubLogin}
                  disabled={isSubmitting}
                  className="w-full inline-flex justify-center py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  GitHub
                </button>
              </div>
            </div>

            <div className="mt-6">
              <div className="text-center">
                <Link
                  href="/auth/register"
                  className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline decoration-2 underline-offset-2 transition-colors"
                >
                  Don't have an account? Create one now →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}