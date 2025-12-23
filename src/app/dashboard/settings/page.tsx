'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { 
  EnvelopeIcon, 
  LockClosedIcon, 
  CheckCircleIcon, 
  EyeIcon, 
  EyeSlashIcon,
  ArrowLeftIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  PhoneIcon,
  UserIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

interface UserData {
  id: string;
  email: string;
  username: string;
  phone: string;
}

export default function AccountSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  
  // Notice state (from phone verification)
  const [showPasswordNotice, setShowPasswordNotice] = useState(false);
  
  // Email change state
  const [newEmail, setNewEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState(false);
  
  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    // Check for password change notice
    const notice = searchParams?.get('notice');
    const savedNotice = localStorage.getItem('showPasswordChangeNotice');
    
    if (notice === 'password' || savedNotice === 'true') {
      setShowPasswordNotice(true);
      localStorage.removeItem('showPasswordChangeNotice');
    }
    
    const fetchUserData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          // Check if we have verified phone info in localStorage
          const verifiedEmail = localStorage.getItem('verifiedEmail');
          if (verifiedEmail) {
            // Try to sign in with the verified info
            localStorage.removeItem('verifiedEmail');
            localStorage.removeItem('verifiedPhone');
          }
          router.push('/auth/login?redirect=/dashboard/settings');
          return;
        }

        const userId = session.user.id;
        const email = session.user.email || '';
        
        // Get user profile from users table
        const { data: userProfile, error: profileError } = await supabase
          .from('users')
          .select('id, username, email')
          .eq('id', userId)
          .single();

        if (profileError) {
          console.error('Error fetching user profile:', profileError);
        }

        // Get phone from user_phones table
        let phone = '';
        try {
          const { data: phoneData } = await supabase
            .from('user_phones')
            .select('phone_number')
            .eq('user_id', userId)
            .single();
          
          if (phoneData?.phone_number) {
            phone = phoneData.phone_number;
          }
        } catch {
          // Phone not found
        }

        setUserData({
          id: userId,
          email: userProfile?.email || email,
          username: userProfile?.username || '',
          phone: phone
        });
        
        setLoading(false);
      } catch (err) {
        console.error('Auth check error:', err);
        router.push('/auth/login?redirect=/dashboard/settings');
      }
    };
    
    fetchUserData();
  }, [mounted, router, searchParams]);

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    setEmailSuccess(false);

    const trimmedEmail = (newEmail || '').trim().toLowerCase();
    const trimmedConfirm = (confirmEmail || '').trim().toLowerCase();

    if (!trimmedEmail) {
      setEmailError('Please enter a new email address');
      return;
    }

    if (!trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      setEmailError('Please enter a valid email address');
      return;
    }

    if (trimmedEmail !== trimmedConfirm) {
      setEmailError('Email addresses do not match');
      return;
    }

    const currentEmail = (userData?.email || '').trim().toLowerCase();
    if (trimmedEmail === currentEmail) {
      setEmailError('New email must be different from current email');
      return;
    }

    setEmailLoading(true);

    try {
      // 1. Update Supabase Auth email
      const { error: authError } = await supabase.auth.updateUser({
        email: trimmedEmail
      });

      if (authError) {
        setEmailError(authError.message);
        setEmailLoading(false);
        return;
      }

      // 2. Update users table email
      if (userData?.id) {
        const { error: updateError } = await supabase
          .from('users')
          .update({ 
            email: trimmedEmail,
            updated_at: new Date().toISOString()
          })
          .eq('id', userData.id);

        if (updateError) {
          console.error('Error updating users table:', updateError);
        }
      }

      setEmailSuccess(true);
      setNewEmail('');
      setConfirmEmail('');
      
      if (userData) {
        setUserData({ ...userData, email: trimmedEmail });
      }
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : 'Failed to update email');
    } finally {
      setEmailLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (!newPassword) {
      setPasswordError('Please enter a new password');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setPasswordLoading(true);

    try {
      // Update password directly (user is already logged in via phone verification)
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        setPasswordError(error.message);
      } else {
        setPasswordSuccess(true);
        setNewPassword('');
        setConfirmPassword('');
        setShowPasswordNotice(false);
      }
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Format phone for display
  const formatPhoneDisplay = (phone: string) => {
    if (!phone) return 'Not set';
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('1')) {
      return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    }
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return phone;
  };

  // Loading state
  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!userData) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <p className="text-white mb-4">Please sign in to access settings</p>
          <Link href="/auth/login" className="text-blue-400 hover:text-blue-300">
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/dashboard" 
            className="inline-flex items-center text-gray-400 hover:text-white mb-4 transition-colors"
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

        {/* Password Change Notice Banner */}
        {showPasswordNotice && (
          <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <ExclamationCircleIcon className="w-6 h-6 text-yellow-400 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-yellow-400 font-semibold">Phone Verification Successful!</h3>
                <p className="text-yellow-200/80 text-sm mt-1">
                  Please set a new password below. You can also update your email if needed.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Current Account Info */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Current Account</h2>
          <div className="space-y-3">
            <div className="flex items-center">
              <EnvelopeIcon className="w-5 h-5 text-gray-500 mr-3" />
              <div>
                <span className="text-gray-500 text-sm">Email</span>
                <p className="text-white">{userData.email || 'Not set'}</p>
              </div>
            </div>
            {userData.username && (
              <div className="flex items-center">
                <UserIcon className="w-5 h-5 text-gray-500 mr-3" />
                <div>
                  <span className="text-gray-500 text-sm">Username</span>
                  <p className="text-white">{userData.username}</p>
                </div>
              </div>
            )}
            <div className="flex items-center">
              <PhoneIcon className="w-5 h-5 text-gray-500 mr-3" />
              <div>
                <span className="text-gray-500 text-sm">Phone</span>
                <p className="text-white">{formatPhoneDisplay(userData.phone)}</p>
              </div>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-700">
            <p className="text-xs text-gray-500">
              You can sign in with your email, username, or phone number
            </p>
          </div>
        </div>

        {/* Change Password Section - Highlighted if from phone verification */}
        <div className={`bg-gray-800 rounded-lg p-6 mb-6 border ${showPasswordNotice ? 'border-yellow-500/50 ring-2 ring-yellow-500/20' : 'border-gray-700'}`}>
          <div className="flex items-center mb-4">
            <LockClosedIcon className="w-5 h-5 text-green-400 mr-2" />
            <h2 className="text-lg font-semibold text-white">
              {showPasswordNotice ? '🔐 Set New Password' : 'Change Password'}
            </h2>
            {showPasswordNotice && (
              <span className="ml-2 px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">Required</span>
            )}
          </div>

          {passwordSuccess && (
            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 mb-4 flex items-center">
              <CheckCircleIcon className="w-5 h-5 text-green-400 mr-2 flex-shrink-0" />
              <p className="text-green-400 text-sm">Password updated successfully! You can now use this password to sign in.</p>
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">New Password</label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pr-10 py-3 px-4 border border-gray-600 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">Minimum 8 characters</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full py-3 px-4 border border-gray-600 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
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
              className="w-full py-3 px-4 rounded-lg font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {passwordLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Updating...
                </>
              ) : showPasswordNotice ? 'Set New Password' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* Change Email Section */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
          <div className="flex items-center mb-4">
            <EnvelopeIcon className="w-5 h-5 text-blue-400 mr-2" />
            <h2 className="text-lg font-semibold text-white">Change Email (Optional)</h2>
          </div>

          {emailSuccess && (
            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 mb-4 flex items-start">
              <CheckCircleIcon className="w-5 h-5 text-green-400 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-green-400 text-sm font-medium">Email update initiated!</p>
                <p className="text-green-400/80 text-xs mt-1">
                  Check both your old and new email for confirmation links.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleEmailChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">New Email Address</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full py-3 px-4 border border-gray-600 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="new.email@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Confirm New Email</label>
              <input
                type="email"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                className="w-full py-3 px-4 border border-gray-600 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
              className="w-full py-3 px-4 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {emailLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Updating...
                </>
              ) : 'Update Email'}
            </button>
          </form>
        </div>

        {/* Done button */}
        <div className="mt-6 text-center">
          <Link 
            href="/dashboard"
            className="inline-flex items-center px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            {passwordSuccess ? '✓ Done - Go to Dashboard' : 'Go to Dashboard'}
          </Link>
        </div>
      </div>
    </div>
  );
}
