'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  EnvelopeIcon, 
  LockClosedIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  EyeIcon,
  EyeSlashIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import PasswordStrengthIndicator from '@/components/auth/PasswordStrengthIndicator';
import { validatePasswordStrength } from '@/lib/passwordUtils';

type Step = 'loading' | 'verified' | 'success' | 'error' | 'enterCode';

interface UserData {
  id: string;
  email: string | null;
  username: string | null;
}

function ManageAccountContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [step, setStep] = useState<Step>('loading');
  const [user, setUser] = useState<UserData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Form states
  const [changePassword, setChangePassword] = useState(false);
  const [changeEmail, setChangeEmail] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [updates, setUpdates] = useState<string[]>([]);
  
  // Code verification (when using Twilio Verify)
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');

  // Verify token on mount
  useEffect(() => {
    if (!token) {
      setError('No token provided. Please use the link sent to your phone.');
      setStep('error');
      return;
    }

    verifyToken();
  }, [token]);

  const verifyToken = async (verificationCode?: string) => {
    try {
      const response = await fetch('/api/auth/verify-account-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token,
          code: verificationCode,
          phone: phone
        }),
      });

      const data = await response.json();

      if (data.success) {
        setUser(data.user);
        setStep('verified');
      } else {
        setError(data.error || 'Invalid or expired link');
        setStep('error');
      }
    } catch {
      setError('Failed to verify link. Please try again.');
      setStep('error');
    }
  };

  const handleVerifyCode = async () => {
    if (code.length < 4) {
      setError('Please enter the verification code');
      return;
    }
    setIsLoading(true);
    setError(null);
    await verifyToken(code);
    setIsLoading(false);
  };

  const handleUpdate = async () => {
    setError(null);

    // Validation
    if (!changePassword && !changeEmail) {
      setError('Please select at least one option to update');
      return;
    }

    if (changePassword) {
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
        email: user?.email || '',
        firstName: '',
        lastName: '',
        username: user?.username || ''
      });
      if (!passwordStrength.isValid) {
        setError('Password does not meet security requirements');
        return;
      }
    }

    if (changeEmail) {
      if (!newEmail) {
        setError('Please enter a new email address');
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
      if (user?.email && newEmail.toLowerCase() === user.email.toLowerCase()) {
        setError('New email must be different from your current email');
        return;
      }
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/update-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          newPassword: changePassword ? newPassword : undefined,
          newEmail: changeEmail ? newEmail : undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setUpdates(data.updates || []);
        setStep('success');
      } else {
        setError(data.error || 'Failed to update account');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Verifying your link...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (step === 'error') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full text-center">
          <div className="mx-auto h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Link Invalid or Expired</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <div className="space-y-3">
            <Link
              href="/auth/forgot-password"
              className="w-full flex justify-center py-3 px-4 rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              Request New Link
            </Link>
            <Link
              href="/auth/login"
              className="w-full flex justify-center py-3 px-4 rounded-lg text-gray-300 border border-gray-600 hover:bg-gray-800 transition-colors"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Code entry (for Twilio Verify flow)
  if (step === 'enterCode') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <ShieldCheckIcon className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Enter Verification Code</h2>
            <p className="text-gray-300">We sent a code to your phone</p>
          </div>

          <div className="space-y-6">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full text-center text-2xl tracking-widest py-4 border border-gray-600 bg-gray-800 text-white rounded-lg focus:ring-2 focus:ring-green-500"
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
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full text-center">
          <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircleIcon className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Account Updated!</h2>
          <p className="text-gray-300 mb-6">
            Successfully updated your {updates.join(' and ')}.
          </p>
          
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-6 text-left">
            <h3 className="text-blue-400 font-semibold mb-2">What to do next:</h3>
            <ul className="text-blue-300 text-sm space-y-1">
              {updates.includes('password') && (
                <li>Use your new password to sign in</li>
              )}
              {updates.includes('email') && (
                <>
                  <li>Use your new email address to sign in</li>
                  <li>Update any saved passwords or password managers</li>
                </>
              )}
            </ul>
          </div>

          <Link
            href="/auth/login"
            className="w-full flex justify-center py-3 px-4 rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            Sign In Now
          </Link>
        </div>
      </div>
    );
  }

  // Main form (verified state)
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-4">
            <ShieldCheckIcon className="h-8 w-8 text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Manage Your Account</h2>
          <p className="text-gray-300">
            Welcome back, <span className="text-blue-400">{user?.username || user?.email}</span>
          </p>
          <p className="text-gray-400 text-sm mt-1">
            Current email: {user?.email}
          </p>
        </div>

        <div className="space-y-6">
          {/* Options */}
          <div className="space-y-3">
            <label className="flex items-center p-4 bg-gray-800 border border-gray-700 rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
              <input
                type="checkbox"
                checked={changePassword}
                onChange={(e) => setChangePassword(e.target.checked)}
                className="w-5 h-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
              />
              <div className="ml-3 flex items-center">
                <LockClosedIcon className="w-5 h-5 text-gray-400 mr-2" />
                <span className="text-white">Change Password</span>
              </div>
            </label>

            <label className="flex items-center p-4 bg-gray-800 border border-gray-700 rounded-lg cursor-pointer hover:border-green-500 transition-colors">
              <input
                type="checkbox"
                checked={changeEmail}
                onChange={(e) => setChangeEmail(e.target.checked)}
                className="w-5 h-5 text-green-600 bg-gray-700 border-gray-600 rounded focus:ring-green-500"
              />
              <div className="ml-3 flex items-center">
                <EnvelopeIcon className="w-5 h-5 text-gray-400 mr-2" />
                <span className="text-white">Change Email</span>
              </div>
            </label>
          </div>

          {/* Password fields */}
          {changePassword && (
            <div className="space-y-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
              <h3 className="text-white font-medium flex items-center">
                <LockClosedIcon className="w-4 h-4 mr-2 text-blue-400" />
                New Password
              </h3>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pr-10 py-3 px-4 border border-gray-600 bg-gray-800 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
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
                <PasswordStrengthIndicator 
                  password={newPassword}
                  email={user?.email || ''}
                  firstName=""
                  lastName=""
                  username={user?.username || ''}
                />
              )}
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full py-3 px-4 border border-gray-600 bg-gray-800 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Confirm new password"
              />
            </div>
          )}

          {/* Email fields */}
          {changeEmail && (
            <div className="space-y-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
              <h3 className="text-white font-medium flex items-center">
                <EnvelopeIcon className="w-4 h-4 mr-2 text-green-400" />
                New Email
              </h3>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full py-3 px-4 border border-gray-600 bg-gray-800 text-white rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="Enter new email address"
              />
              <input
                type="email"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                className="w-full py-3 px-4 border border-gray-600 bg-gray-800 text-white rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="Confirm new email"
              />
            </div>
          )}

          {error && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={handleUpdate}
            disabled={isLoading || (!changePassword && !changeEmail)}
            className="w-full py-3 px-4 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Updating...
              </div>
            ) : (
              'Update Account'
            )}
          </button>

          <div className="text-center">
            <Link href="/auth/login" className="text-gray-400 hover:text-white text-sm">
              Cancel and return to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ManageAccountPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    }>
      <ManageAccountContent />
    </Suspense>
  );
}

