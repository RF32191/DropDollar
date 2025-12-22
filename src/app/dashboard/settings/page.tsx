'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { 
  EnvelopeIcon, 
  LockClosedIcon, 
  CheckCircleIcon, 
  EyeIcon, 
  EyeSlashIcon,
  ArrowLeftIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import PasswordStrengthIndicator from '@/components/auth/PasswordStrengthIndicator';
import { validatePasswordStrength } from '@/lib/passwordUtils';

export default function AccountSettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [mounted, setMounted] = useState(false);
  
  // Email change state
  const [newEmail, setNewEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState(false);
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !authLoading && !isAuthenticated) {
      router.push('/auth/login?redirect=/dashboard/settings');
    }
  }, [mounted, authLoading, isAuthenticated, router]);

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    setEmailSuccess(false);

    if (!newEmail) {
      setEmailError('Please enter a new email address');
      return;
    }

    if (!newEmail.includes('@')) {
      setEmailError('Please enter a valid email address');
      return;
    }

    if (newEmail !== confirmEmail) {
      setEmailError('Email addresses do not match');
      return;
    }

    if (newEmail.toLowerCase() === user?.email?.toLowerCase()) {
      setEmailError('New email must be different from current email');
      return;
    }

    setEmailLoading(true);

    try {
      // Update email in Supabase Auth
      const { error } = await supabase.auth.updateUser({
        email: newEmail.toLowerCase()
      });

      if (error) {
        setEmailError(error.message);
      } else {
        setEmailSuccess(true);
        setNewEmail('');
        setConfirmEmail('');
      }
    } catch (err: unknown) {
      setEmailError(err instanceof Error ? err.message : 'Failed to update email');
    } finally {
      setEmailLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (!currentPassword) {
      setPasswordError('Please enter your current password');
      return;
    }

    if (!newPassword) {
      setPasswordError('Please enter a new password');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
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
      setPasswordError('Password does not meet security requirements');
      return;
    }

    setPasswordLoading(true);

    try {
      // First verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword
      });

      if (signInError) {
        setPasswordError('Current password is incorrect');
        setPasswordLoading(false);
        return;
      }

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        setPasswordError(error.message);
      } else {
        setPasswordSuccess(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  if (!mounted || authLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/dashboard" 
            className="inline-flex items-center text-gray-400 hover:text-white mb-4"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mr-4">
              <ShieldCheckIcon className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Account Settings</h1>
              <p className="text-gray-400">Manage your email and password</p>
            </div>
          </div>
        </div>

        {/* Current Account Info */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Current Account</h2>
          <div className="space-y-2">
            <p className="text-gray-300">
              <span className="text-gray-500">Email:</span> {user?.email || 'Not set'}
            </p>
            <p className="text-gray-300">
              <span className="text-gray-500">Username:</span> {user?.username || 'Not set'}
            </p>
          </div>
        </div>

        {/* Change Email Section */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
          <div className="flex items-center mb-4">
            <EnvelopeIcon className="w-5 h-5 text-blue-400 mr-2" />
            <h2 className="text-lg font-semibold text-white">Change Email</h2>
          </div>

          {emailSuccess && (
            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 mb-4 flex items-center">
              <CheckCircleIcon className="w-5 h-5 text-green-400 mr-2" />
              <p className="text-green-400 text-sm">
                Confirmation email sent! Check your inbox to verify the new email.
              </p>
            </div>
          )}

          <form onSubmit={handleEmailChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">New Email</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full py-3 px-4 border border-gray-600 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="new.email@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Confirm New Email</label>
              <input
                type="email"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                className="w-full py-3 px-4 border border-gray-600 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Confirm new email"
              />
            </div>

            {emailError && (
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                <p className="text-red-400 text-sm">{emailError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={emailLoading}
              className="w-full py-3 px-4 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {emailLoading ? 'Updating...' : 'Update Email'}
            </button>
          </form>
        </div>

        {/* Change Password Section */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center mb-4">
            <LockClosedIcon className="w-5 h-5 text-green-400 mr-2" />
            <h2 className="text-lg font-semibold text-white">Change Password</h2>
          </div>

          {passwordSuccess && (
            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 mb-4 flex items-center">
              <CheckCircleIcon className="w-5 h-5 text-green-400 mr-2" />
              <p className="text-green-400 text-sm">Password updated successfully!</p>
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Current Password</label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full pr-10 py-3 px-4 border border-gray-600 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">New Password</label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pr-10 py-3 px-4 border border-gray-600 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
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
                    email={user?.email || ''}
                    firstName=""
                    lastName=""
                    username={user?.username || ''}
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full py-3 px-4 border border-gray-600 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Confirm new password"
              />
            </div>

            {passwordError && (
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                <p className="text-red-400 text-sm">{passwordError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={passwordLoading}
              className="w-full py-3 px-4 rounded-lg font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {passwordLoading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

