'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { EnvelopeIcon, PhoneIcon, CheckCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

type ResetMethod = 'email' | 'phone';
type Step = 'choose' | 'enterContact' | 'enterCode' | 'loggingIn' | 'success';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [method, setMethod] = useState<ResetMethod>('email');
  const [step, setStep] = useState<Step>('choose');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [maskedContact, setMaskedContact] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  const formatPhoneInput = (value: string) => {
    const digits = (value || '').replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhoneInput(e.target.value));
  };

  const handleEmailReset = async () => {
    const trimmedEmail = (email || '').trim();
    if (!trimmedEmail) {
      setError('Please enter your email address');
      return;
    }

    if (!trimmedEmail.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      
      if (resetError) {
        setError(resetError.message);
      } else {
        setMaskedContact(trimmedEmail);
        setStep('success');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneSendCode = async () => {
    const digits = (phone || '').replace(/\D/g, '');
    if (digits.length < 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/phone-reset/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: digits }),
      });

      const data = await response.json();

      if (data.success) {
        setMaskedContact(data.phone || phone);
        setStep('enterCode');
      } else {
        setError(data.error || 'Failed to send reset code');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCodeAndLogin = async () => {
    const trimmedCode = (code || '').trim();
    if (trimmedCode.length < 4) {
      setError('Please enter the verification code');
      return;
    }

    setIsLoading(true);
    setError('');
    setStep('loggingIn');

    try {
      const digits = (phone || '').replace(/\D/g, '');
      
      // Verify the code and get login credentials
      const response = await fetch('/api/auth/phone-reset/verify-and-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: digits, code: trimmedCode }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || 'Invalid verification code');
        setStep('enterCode');
        setIsLoading(false);
        return;
      }

      // We have email and temp password - log them in!
      if (data.email && data.tempPassword) {
        console.log('🔐 Logging in with temp password...');
        
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.tempPassword,
        });

        if (loginError) {
          console.error('❌ Login failed:', loginError);
          setError('Login failed. Please try again.');
          setStep('enterCode');
          setIsLoading(false);
          return;
        }

        console.log('✅ Login successful! Redirecting to settings...');
        
        // Set flag for settings page to show password change notice
        localStorage.setItem('showPasswordChangeNotice', 'true');
        
        // Redirect to dashboard settings
        window.location.href = '/dashboard/settings?notice=password';
        return;
      }

      // Fallback - shouldn't happen
      setError('Something went wrong. Please try again.');
      setStep('enterCode');
      
    } catch (err) {
      console.error('❌ Error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setStep('enterCode');
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  // Logging in state
  if (step === 'loggingIn') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center py-12 px-4">
        <div className="text-center">
          <div className="relative mx-auto w-20 h-20 mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-green-500/20"></div>
            <div className="absolute inset-0 rounded-full border-4 border-green-500 border-t-transparent animate-spin"></div>
            <div className="absolute inset-4 bg-green-500/20 rounded-full flex items-center justify-center">
              <CheckCircleIcon className="w-8 h-8 text-green-400" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Code Verified!</h2>
          <p className="text-gray-400 mb-4">Logging you in...</p>
          <p className="text-green-400 text-sm">Redirecting to settings to change your password</p>
        </div>
      </div>
    );
  }

  // Step 1: Choose method
  if (step === 'choose') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <Link href="/" className="inline-block mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-xl mx-auto">
                <img src="/DropCoin.png" alt="DropDollar" className="w-full h-full object-contain" />
              </div>
            </Link>
            <h2 className="text-3xl font-bold text-white mb-2">Reset Your Password</h2>
            <p className="text-gray-300">Choose how to reset your password</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => { setMethod('email'); setStep('enterContact'); setError(''); }}
              className="w-full flex items-center p-4 bg-gray-800 border border-gray-700 rounded-lg hover:border-blue-500 transition-all"
            >
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mr-4">
                <EnvelopeIcon className="w-6 h-6 text-blue-400" />
              </div>
              <div className="text-left">
                <h3 className="text-white font-medium">Reset via Email</h3>
                <p className="text-gray-400 text-sm">Get a reset link in your email</p>
              </div>
            </button>

            <button
              onClick={() => { setMethod('phone'); setStep('enterContact'); setError(''); }}
              className="w-full flex items-center p-4 bg-gray-800 border border-gray-700 rounded-lg hover:border-green-500 transition-all"
            >
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mr-4">
                <PhoneIcon className="w-6 h-6 text-green-400" />
              </div>
              <div className="text-left">
                <h3 className="text-white font-medium">Reset via Phone</h3>
                <p className="text-gray-400 text-sm">Get a code &amp; login instantly</p>
              </div>
            </button>
          </div>

          <div className="text-center pt-4">
            <Link href="/auth/login" className="text-blue-400 hover:text-blue-300 text-sm">
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Enter contact
  if (step === 'enterContact') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white mb-2">
              {method === 'email' ? 'Enter Your Email' : 'Enter Your Phone'}
            </h2>
            <p className="text-gray-300">
              {method === 'email' 
                ? 'We will send a reset link' 
                : 'We\'ll verify & log you in to change your password'}
            </p>
          </div>

          <div className="space-y-6">
            {method === 'email' ? (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full py-3 px-4 border border-gray-600 bg-gray-800 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="you@example.com"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  className="w-full py-3 px-4 border border-gray-600 bg-gray-800 text-white rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="(555) 555-5555"
                  maxLength={14}
                />
                <p className="mt-2 text-xs text-green-400">
                  ✓ After verifying, you&apos;ll be logged in automatically
                </p>
              </div>
            )}

            {error && (
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={method === 'email' ? handleEmailReset : handlePhoneSendCode}
              disabled={isLoading}
              className={`w-full py-3 px-4 rounded-lg font-medium text-white ${
                method === 'email' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'
              } disabled:opacity-50 transition-colors flex items-center justify-center`}
            >
              {isLoading ? (
                <>
                  <ArrowPathIcon className="w-5 h-5 mr-2 animate-spin" />
                  Sending...
                </>
              ) : method === 'email' ? 'Send Reset Link' : 'Send Verification Code'}
            </button>

            <div className="flex justify-between text-sm">
              <button onClick={() => { setStep('choose'); setError(''); }} className="text-gray-400 hover:text-white transition-colors">
                Back
              </button>
              <Link href="/auth/login" className="text-blue-400 hover:text-blue-300">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Enter code (phone only) - then auto-login
  if (step === 'enterCode') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <PhoneIcon className="w-8 h-8 text-green-400" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Enter Code</h2>
            <p className="text-gray-300">
              Code sent to <span className="text-green-400">{maskedContact}</span>
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode((e.target.value || '').replace(/\D/g, '').slice(0, 6))}
                className="w-full text-center text-3xl tracking-[0.5em] py-4 border border-gray-600 bg-gray-800 text-white rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="••••••"
                maxLength={6}
                autoComplete="one-time-code"
                autoFocus
              />
              <p className="mt-3 text-center text-sm text-green-400">
                ✓ You&apos;ll be logged in after verification
              </p>
            </div>

            {error && (
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={handleVerifyCodeAndLogin}
              disabled={isLoading || code.length < 4}
              className="w-full py-4 px-4 rounded-lg font-bold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center text-lg"
            >
              {isLoading ? (
                <>
                  <ArrowPathIcon className="w-5 h-5 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-5 h-5 mr-2" />
                  Verify &amp; Login
                </>
              )}
            </button>

            <div className="text-center">
              <button
                onClick={handlePhoneSendCode}
                disabled={isLoading}
                className="text-green-400 hover:text-green-300 text-sm transition-colors"
              >
                Didn&apos;t receive code? Resend
              </button>
            </div>

            <div className="flex justify-between text-sm pt-4 border-t border-gray-700">
              <button onClick={() => { setStep('enterContact'); setError(''); setCode(''); }} className="text-gray-400 hover:text-white transition-colors">
                Change Number
              </button>
              <Link href="/auth/login" className="text-blue-400 hover:text-blue-300">
                Cancel
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success (email only - phone goes directly to dashboard)
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto h-16 w-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
          <CheckCircleIcon className="h-8 w-8 text-green-400" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">Check Your Email</h2>
        <p className="text-gray-300 mb-6">
          We sent reset instructions to <span className="text-blue-400">{maskedContact}</span>
        </p>
        <p className="text-gray-400 text-sm mb-6">
          Click the link in the email to reset your password
        </p>
        
        <Link
          href="/auth/login"
          className="inline-flex justify-center w-full py-3 px-4 rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
        >
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}
