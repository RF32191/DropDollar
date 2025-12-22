'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { EnvelopeIcon, PhoneIcon, CheckCircleIcon, LockClosedIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

type ResetMethod = 'email' | 'phone';
type Step = 'choose' | 'enterContact' | 'enterCode' | 'newPassword' | 'success';

export default function ForgotPasswordPage() {
  const [mounted, setMounted] = useState(false);
  const [method, setMethod] = useState<ResetMethod>('email');
  const [step, setStep] = useState<Step>('choose');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetToken, setResetToken] = useState('');
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

  const handleVerifyCode = async () => {
    const trimmedCode = (code || '').trim();
    if (trimmedCode.length < 4) {
      setError('Please enter the verification code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const digits = (phone || '').replace(/\D/g, '');
      const response = await fetch('/api/auth/phone-reset/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: digits, code: trimmedCode }),
      });

      const data = await response.json();

      if (data.success && data.resetToken) {
        setResetToken(data.resetToken);
        setStep('newPassword');
      } else {
        setError(data.error || 'Invalid verification code');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    const trimmedPassword = (newPassword || '').trim();
    const trimmedConfirm = (confirmPassword || '').trim();
    
    if (!trimmedPassword) {
      setError('Please enter a new password');
      return;
    }

    if (trimmedPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (trimmedPassword !== trimmedConfirm) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/phone-reset/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToken, newPassword: trimmedPassword }),
      });

      const data = await response.json();

      if (data.success) {
        setStep('success');
      } else {
        setError(data.error || 'Failed to update password');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
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
                <p className="text-gray-400 text-sm">Get a code via SMS</p>
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
              {method === 'email' ? 'We will send a reset link' : 'We will send a verification code'}
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
              } disabled:opacity-50 transition-colors`}
            >
              {isLoading ? 'Sending...' : method === 'email' ? 'Send Reset Link' : 'Send Code'}
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

  // Step 3: Enter code (phone only)
  if (step === 'enterCode') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white mb-2">Enter Code</h2>
            <p className="text-gray-300">
              Code sent to <span className="text-green-400">{maskedContact}</span>
            </p>
          </div>

          <div className="space-y-6">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode((e.target.value || '').replace(/\D/g, '').slice(0, 6))}
              className="w-full text-center text-2xl tracking-widest py-4 border border-gray-600 bg-gray-800 text-white rounded-lg"
              placeholder="------"
              maxLength={6}
            />

            {error && (
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={handleVerifyCode}
              disabled={isLoading || code.length < 4}
              className="w-full py-3 px-4 rounded-lg font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {isLoading ? 'Verifying...' : 'Verify Code'}
            </button>

            <button
              onClick={handlePhoneSendCode}
              disabled={isLoading}
              className="w-full text-green-400 hover:text-green-300 text-sm transition-colors"
            >
              Resend code
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 4: New password
  if (step === 'newPassword') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-4">
              <LockClosedIcon className="h-8 w-8 text-blue-400" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Create New Password</h2>
            <p className="text-gray-400">Enter your new password below</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">New Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pr-10 py-3 px-4 border border-gray-600 bg-gray-800 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter new password (min 8 characters)"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">Minimum 8 characters</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full py-3 px-4 border border-gray-600 bg-gray-800 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Confirm new password"
              />
            </div>

            {error && (
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={handleUpdatePassword}
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isLoading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Success
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto h-16 w-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
          <CheckCircleIcon className="h-8 w-8 text-green-400" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">
          {method === 'email' ? 'Check Your Email' : 'Password Updated!'}
        </h2>
        <p className="text-gray-300 mb-6">
          {method === 'email' 
            ? `We sent reset instructions to ${maskedContact}`
            : 'You can now sign in with your new password.'
          }
        </p>
        
        <Link
          href="/auth/login"
          className="inline-flex justify-center w-full py-3 px-4 rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
        >
          Sign In
        </Link>
      </div>
    </div>
  );
}
