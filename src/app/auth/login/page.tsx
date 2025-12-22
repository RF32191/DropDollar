'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { EyeIcon, EyeSlashIcon, ExclamationTriangleIcon, ArrowPathIcon, EnvelopeIcon, PhoneIcon, UserIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';

type LoginMethod = 'email' | 'username' | 'phone';

export default function SimpleLoginPage() {
  const { login } = useAuth();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('email');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(true);
  
  // Get redirect URL from query params
  const redirectUrl = searchParams?.get('redirect') || '/dashboard';
  
  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Format phone number as user types
  const formatPhoneInput = (value: string) => {
    const digits = (value || '').replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneInput(e.target.value);
    setPhone(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (loginMethod === 'email') {
        // Email login
        const trimmedEmail = (email || '').trim();
        if (!trimmedEmail || !password) {
          setError('Please enter both email and password.');
          setIsSubmitting(false);
          return;
        }

        if (!trimmedEmail.includes('@')) {
          setError('Please enter a valid email address.');
          setIsSubmitting(false);
          return;
        }

        console.log('🔐 Attempting email login...');
        await login(trimmedEmail, password, rememberMe);
        console.log('✅ Login successful!');
        window.location.href = redirectUrl;

      } else if (loginMethod === 'username') {
        // Username login - find email by username, then login
        const trimmedUsername = (username || '').trim();
        if (!trimmedUsername || !password) {
          setError('Please enter both username and password.');
          setIsSubmitting(false);
          return;
        }

        if (trimmedUsername.length < 3) {
          setError('Please enter a valid username.');
          setIsSubmitting(false);
          return;
        }

        console.log('🔐 Attempting username login...');
        
        // Find email by username
        const response = await fetch('/api/auth/find-email-by-username', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: trimmedUsername }),
        });

        const data = await response.json();

        if (!data.success || !data.email) {
          setError(data.error || 'No account found with this username.');
          setIsSubmitting(false);
          return;
        }

        // Login with found email
        await login(data.email, password, rememberMe);
        console.log('✅ Username login successful!');
        window.location.href = redirectUrl;

      } else {
        // Phone login - find email by phone, then login
        const digits = (phone || '').replace(/\D/g, '');
        if (digits.length < 10) {
          setError('Please enter a valid 10-digit phone number.');
          setIsSubmitting(false);
          return;
        }

        if (!password) {
          setError('Please enter your password.');
          setIsSubmitting(false);
          return;
        }

        console.log('🔐 Attempting phone login...');
        
        // Find email by phone
        const response = await fetch('/api/auth/find-email-by-phone', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: digits }),
        });

        const data = await response.json();

        if (!data.success || !data.email) {
          setError(data.error || 'No account found with this phone number.');
          setIsSubmitting(false);
          return;
        }

        // Login with found email - go straight to dashboard (no email verification needed)
        await login(data.email, password, rememberMe);
        console.log('✅ Phone login successful!');
        window.location.href = redirectUrl;
      }
    } catch (err: unknown) {
      console.error('❌ Login failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Login failed. Please check your credentials.';
      setError(errorMessage);
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

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
              Games
            </Link>
            <Link href="/tournaments" className="text-yellow-300 hover:text-yellow-200 font-medium transition-colors">
              Tournaments
            </Link>
            <Link href="/hot-sell" className="text-red-300 hover:text-red-200 font-medium transition-colors">
              Hot Sell
            </Link>
            <Link href="/buy-tokens" className="text-green-300 hover:text-green-200 font-medium transition-colors">
              Buy Tokens
            </Link>
          </div>
          
          {/* Mobile Navigation */}
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

          {/* Login Method Toggle - 3 options */}
          <div className="flex mb-6 bg-gray-700 rounded-lg p-1 gap-1">
            <button
              type="button"
              onClick={() => { setLoginMethod('email'); setError(null); }}
              className={`flex-1 flex items-center justify-center py-2 px-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
                loginMethod === 'email'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              <EnvelopeIcon className="w-4 h-4 mr-1" />
              Email
            </button>
            <button
              type="button"
              onClick={() => { setLoginMethod('username'); setError(null); }}
              className={`flex-1 flex items-center justify-center py-2 px-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
                loginMethod === 'username'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              <UserIcon className="w-4 h-4 mr-1" />
              Username
            </button>
            <button
              type="button"
              onClick={() => { setLoginMethod('phone'); setError(null); }}
              className={`flex-1 flex items-center justify-center py-2 px-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
                loginMethod === 'phone'
                  ? 'bg-green-600 text-white shadow'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              <PhoneIcon className="w-4 h-4 mr-1" />
              Phone
            </button>
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

            {/* Dynamic input based on login method */}
            {loginMethod === 'email' && (
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                  Email address
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full pl-10 px-3 py-2 border border-gray-600 rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-gray-700 text-white"
                    placeholder="you@example.com"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            )}

            {loginMethod === 'username' && (
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-300">
                  Username
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="appearance-none block w-full pl-10 px-3 py-2 border border-gray-600 rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm bg-gray-700 text-white"
                    placeholder="your_username"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            )}

            {loginMethod === 'phone' && (
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-300">
                  Phone number
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <PhoneIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={handlePhoneChange}
                    className="appearance-none block w-full pl-10 px-3 py-2 border border-gray-600 rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm bg-gray-700 text-white"
                    placeholder="(555) 555-5555"
                    maxLength={14}
                    disabled={isSubmitting}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  Use the phone number you registered with
                </p>
              </div>
            )}

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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`appearance-none block w-full px-3 py-2 pr-10 border border-gray-600 rounded-md shadow-sm placeholder-gray-500 focus:outline-none sm:text-sm bg-gray-700 text-white ${
                    loginMethod === 'email' ? 'focus:ring-blue-500 focus:border-blue-500' :
                    loginMethod === 'username' ? 'focus:ring-purple-500 focus:border-purple-500' :
                    'focus:ring-green-500 focus:border-green-500'
                  }`}
                  placeholder="Enter your password"
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
                  Forgot password?
                </Link>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${
                  loginMethod === 'email'
                    ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                    : loginMethod === 'username'
                    ? 'bg-purple-600 hover:bg-purple-700 focus:ring-purple-500'
                    : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <ArrowPathIcon className="h-5 w-5 animate-spin mr-2" />
                    Signing in...
                  </>
                ) : (
                  `Sign in with ${loginMethod === 'email' ? 'Email' : loginMethod === 'username' ? 'Username' : 'Phone'}`
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
