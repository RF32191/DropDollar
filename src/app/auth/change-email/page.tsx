'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { EnvelopeIcon, PhoneIcon, CheckCircleIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

type Step = 'enterPhone' | 'enterCode' | 'enterEmail' | 'success';

export default function ChangeEmailPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<Step>('enterPhone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [maskedPhone, setMaskedPhone] = useState('');
  const [currentEmail, setCurrentEmail] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !authLoading && !isAuthenticated) {
      router.push('/auth/login?redirect=/auth/change-email');
    }
    if (user?.email) {
      setCurrentEmail(user.email);
    }
  }, [mounted, authLoading, isAuthenticated, router, user]);

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

  // Send verification code
  const handleSendCode = async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/change-email/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phone: digits,
          userId: user?.id 
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMaskedPhone(data.phone || phone);
        setStep('enterCode');
      } else {
        setError(data.error || 'Failed to send verification code');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Verify code and proceed to email entry
  const handleVerifyCode = async () => {
    if (code.length < 4) {
      setError('Please enter the verification code');
      return;
    }

    // For this flow, we just verify the code is correct format
    // The actual verification happens when updating email
    setStep('enterEmail');
    setError(null);
  };

  // Update email
  const handleUpdateEmail = async () => {
    if (!newEmail) {
      setError('Please enter your new email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    if (newEmail !== confirmEmail) {
      setError('Email addresses do not match');
      return;
    }

    if (newEmail.toLowerCase() === currentEmail?.toLowerCase()) {
      setError('New email must be different from your current email');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const digits = phone.replace(/\D/g, '');
      const response = await fetch('/api/auth/change-email/verify-and-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phone: digits, 
          code, 
          newEmail,
          userId: user?.id 
        }),
      });

      const data = await response.json();

      if (data.success) {
        setStep('success');
      } else {
        setError(data.error || 'Failed to update email');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (!mounted || authLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return null; // Will redirect
  }

  // Step 1: Enter phone number
  if (step === 'enterPhone') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-4">
              <ShieldCheckIcon className="h-8 w-8 text-blue-400" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Change Your Email</h2>
            <p className="text-gray-300">
              Verify your identity using your registered phone number
            </p>
            {currentEmail && (
              <p className="text-gray-400 text-sm mt-2">
                Current email: <span className="text-white">{currentEmail}</span>
              </p>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Your Registered Phone Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <PhoneIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  className="w-full pl-10 pr-3 py-3 border border-gray-600 bg-gray-800 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="(555) 555-5555"
                  maxLength={14}
                />
              </div>
              <p className="mt-2 text-xs text-gray-400">
                Enter the phone number you used when creating your account
              </p>
            </div>

            {error && (
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={handleSendCode}
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sending Code...
                </div>
              ) : (
                'Send Verification Code'
              )}
            </button>

            <div className="text-center">
              <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm">
                Cancel and return to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Enter verification code
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
              We sent a code to <strong className="text-green-400">{maskedPhone}</strong>
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
              Continue
            </button>

            <div className="text-center">
              <button
                onClick={handleSendCode}
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

  // Step 3: Enter new email
  if (step === 'enterEmail') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <EnvelopeIcon className="h-8 w-8 text-blue-600" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Enter New Email</h2>
            <p className="text-gray-300">This will be your new login email</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">New Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 border border-gray-600 bg-gray-800 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="your.new.email@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Confirm New Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 border border-gray-600 bg-gray-800 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Confirm your new email"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={handleUpdateEmail}
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Updating Email...
                </div>
              ) : (
                'Update Email'
              )}
            </button>

            <div className="text-center">
              <button 
                onClick={() => { setStep('enterPhone'); setError(null); }}
                className="text-gray-400 hover:text-white text-sm"
              >
                Start over
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step 4: Success
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircleIcon className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Email Updated!</h2>
          <p className="text-gray-300 mb-6">
            Your email has been successfully changed to <strong className="text-green-400">{newEmail}</strong>
          </p>
          
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-6 text-left">
            <h3 className="text-blue-400 font-semibold mb-2">Important</h3>
            <ul className="text-blue-300 text-sm space-y-1">
              <li>Use your new email to sign in</li>
              <li>Update any saved passwords or password managers</li>
              <li>Check your new email for any account notifications</li>
            </ul>
          </div>

          <div className="space-y-3">
            <Link
              href="/dashboard"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              Go to Dashboard
            </Link>
            
            <Link
              href="/auth/login"
              className="w-full flex justify-center py-3 px-4 border border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-300 hover:bg-gray-800 transition-colors"
            >
              Sign In with New Email
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

