'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { EnvelopeIcon, PhoneIcon, ArrowLeftIcon, CheckCircleIcon, LockClosedIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import PasswordStrengthIndicator from '@/components/auth/PasswordStrengthIndicator';
import { validatePasswordStrength } from '@/lib/passwordUtils';

type ResetMethod = 'email' | 'phone';
type Step = 'choose' | 'enterContact' | 'enterCode' | 'newPassword' | 'success';

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  
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
  const [error, setError] = useState<string | null>(null);
  const [maskedContact, setMaskedContact] = useState('');

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Format phone number as user types
  const formatPhoneInput = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneInput(e.target.value);
    setPhone(formatted);
  };

  // Send reset via email
  const handleEmailReset = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await resetPassword(email);
      if (result.success) {
        setMaskedContact(email);
        setStep('success');
      } else {
        setError(result.error || 'Failed to send reset email');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Send reset code via phone
  const handlePhoneSendCode = async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setIsLoading(true);
    setError(null);

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
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Verify phone code
  const handleVerifyCode = async () => {
    if (code.length < 4) {
      setError('Please enter the verification code');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const digits = phone.replace(/\D/g, '');
      const response = await fetch('/api/auth/phone-reset/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: digits, code }),
      });

      const data = await response.json();

      if (data.success) {
        setResetToken(data.resetToken);
        setStep('newPassword');
      } else {
        setError(data.error || 'Invalid verification code');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Update password
  const handleUpdatePassword = async () => {
    if (!newPassword) {
      setError('Please enter a new password');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const passwordStrength = validatePasswordStrength({
      password: newPassword,
      email: '',
      firstName: '',
      lastName: '',
      username: ''
    });

    if (!passwordStrength.isValid) {
      setError('Password does not meet security requirements');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/phone-reset/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToken, newPassword }),
      });

      const data = await response.json();

      if (data.success) {
        setStep('success');
      } else {
        setError(data.error || 'Failed to update password');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state while hydrating
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  // Method selection screen
  if (step === 'choose') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <Link href="/" className="inline-block mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-xl mx-auto">
                <img src="/DropCoin.png" alt="DropDollar Logo" className="w-full h-full object-contain" />
              </div>
            </Link>
            <h2 className="text-3xl font-bold text-white mb-2">Reset Your Password</h2>
            <p className="text-gray-300">Choose how you would like to reset your password</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => { setMethod('email'); setStep('enterContact'); setError(null); }}
              className="w-full flex items-center justify-between p-4 bg-gray-800 border border-gray-700 rounded-lg hover:border-blue-500 hover:bg-gray-750 transition-all"
            >
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mr-4">
                  <EnvelopeIcon className="w-6 h-6 text-blue-400" />
                </div>
                <div className="text-left">
                  <h3 className="text-white font-medium">Reset via Email</h3>
                  <p className="text-gray-400 text-sm">We will send a reset link to your email</p>
                </div>
              </div>
              <ArrowLeftIcon className="w-5 h-5 text-gray-400 rotate-180" />
            </button>

            <button
              onClick={() => { setMethod('phone'); setStep('enterContact'); setError(null); }}
              className="w-full flex items-center justify-between p-4 bg-gray-800 border border-gray-700 rounded-lg hover:border-green-500 hover:bg-gray-750 transition-all"
            >
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mr-4">
                  <PhoneIcon className="w-6 h-6 text-green-400" />
                </div>
                <div className="text-left">
                  <h3 className="text-white font-medium">Reset via Phone</h3>
                  <p className="text-gray-400 text-sm">We will send a code to your phone</p>
                </div>
              </div>
              <ArrowLeftIcon className="w-5 h-5 text-gray-400 rotate-180" />
            </button>
          </div>

          <div className="text-center pt-4">
            <Link href="/auth/login" className="text-blue-400 hover:text-blue-300 text-sm font-medium">
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Enter contact info (email or phone)
  if (step === 'enterContact') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <Link href="/" className="inline-block mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-xl mx-auto">
                <img src="/DropCoin.png" alt="DropDollar Logo" className="w-full h-full object-contain" />
              </div>
            </Link>
            <h2 className="text-3xl font-bold text-white mb-2">
              {method === 'email' ? 'Enter Your Email' : 'Enter Your Phone'}
            </h2>
            <p className="text-gray-300">
              {method === 'email' 
                ? 'We will send you a link to reset your password'
                : 'We will send you a code to verify your identity'
              }
            </p>
          </div>

          <div className="space-y-6">
            {method === 'email' ? (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3 py-3 border border-gray-600 bg-gray-800 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your email"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <PhoneIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={handlePhoneChange}
                    className="w-full pl-10 pr-3 py-3 border border-gray-600 bg-gray-800 text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="(555) 555-5555"
                    maxLength={14}
                  />
                </div>
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
              className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors ${
                method === 'email' 
                  ? 'bg-blue-600 hover:bg-blue-700' 
                  : 'bg-green-600 hover:bg-green-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {method === 'email' ? 'Sending...' : 'Sending Code...'}
                </div>
              ) : (
                method === 'email' ? 'Send Reset Link' : 'Send Verification Code'
              )}
            </button>

            <div className="flex justify-between items-center text-sm">
              <button onClick={() => { setStep('choose'); setError(null); }} className="text-gray-400 hover:text-white">
                Choose different method
              </button>
              <Link href="/auth/login" className="text-blue-400 hover:text-blue-300">
                Back to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Enter verification code (phone only)
  if (step === 'enterCode') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <PhoneIcon className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Enter Verification Code</h2>
            <p className="text-gray-300">
              We sent a code to <strong className="text-green-400">{maskedContact}</strong>
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Verification Code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full text-center text-2xl tracking-widest py-4 border border-gray-600 bg-gray-800 text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="------"
                maxLength={6}
              />
            </div>

            {error && (
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={handleVerifyCode}
              disabled={isLoading || code.length < 4}
              className="w-full py-3 px-4 rounded-lg font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Verifying...
                </div>
              ) : (
                'Verify Code'
              )}
            </button>

            <div className="text-center">
              <button
                onClick={handlePhoneSendCode}
                disabled={isLoading}
                className="text-green-400 hover:text-green-300 text-sm"
              >
                Did not receive the code? Send again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // New password (phone reset only)
  if (step === 'newPassword') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <LockClosedIcon className="h-8 w-8 text-blue-600" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Create New Password</h2>
            <p className="text-gray-300">Enter a strong, secure password</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">New Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pr-10 py-3 px-4 border border-gray-600 bg-gray-800 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter new password"
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
              {newPassword && (
                <div className="mt-2">
                  <PasswordStrengthIndicator 
                    password={newPassword}
                    email=""
                    firstName=""
                    lastName=""
                    username=""
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full py-3 px-4 border border-gray-600 bg-gray-800 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              className="w-full py-3 px-4 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Updating Password...
                </div>
              ) : (
                'Update Password'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Success screen
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircleIcon className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">
            {method === 'email' ? 'Check Your Email' : 'Password Updated!'}
          </h2>
          <p className="text-gray-300 mb-6">
            {method === 'email' 
              ? `We have sent password reset instructions to ${maskedContact}`
              : 'Your password has been successfully updated. You can now sign in with your new password.'
            }
          </p>
          
          {method === 'email' && (
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-6 text-left">
              <h3 className="text-blue-400 font-semibold mb-2">What is Next?</h3>
              <ul className="text-blue-300 text-sm space-y-1">
                <li>Check your email inbox (and spam folder)</li>
                <li>Click the reset link in the email</li>
                <li>Create a new secure password</li>
              </ul>
            </div>
          )}

          <Link
            href="/auth/login"
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            {method === 'email' ? 'Back to Sign In' : 'Sign In Now'}
          </Link>
          
          {method === 'email' && (
            <button
              onClick={() => { setStep('enterContact'); setError(null); }}
              className="w-full mt-4 text-center text-gray-400 hover:text-white text-sm transition-colors"
            >
              Try a different email address
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
