'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { 
  UserIcon,
  ShoppingBagIcon,
  TrophyIcon,
  CogIcon,
  BellIcon,
  HeartIcon,
  EyeIcon,
  StarIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  ArrowRightOnRectangleIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  HomeIcon,
  GiftIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { UserDatabaseService, UserAccount } from '@/lib/userDatabase';
import { TwoFactorAuthService } from '@/lib/twoFactorAuth';
import { WalletService } from '@/lib/walletService';

export default function BuyerDashboardPage() {
  const router = useRouter();
  const { user: authUser, logout, isLoading: authLoading } = useAuth();
  const [user, setUser] = useState<UserAccount | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'profile' | 'preferences' | 'security' | 'wallet'>('overview');
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [walletSummary, setWalletSummary] = useState<{ address: string; masked: string; usd: number; dropUsd: number; totalUsd: number } | null>(null);
  const [tokenPrice, setTokenPrice] = useState<number>(1.0);

  useEffect(() => {
    const currentUser = UserDatabaseService.getCurrentUser();
    if (!currentUser) {
      router.push('/auth/login?message=Please log in to access your dashboard');
      return;
    }
    
    setUser(currentUser);
    setIs2FAEnabled(TwoFactorAuthService.is2FAEnabled(currentUser.id));
    try {
      // Derive token price from existing platform logic (falls back to 1.0)
      const price = (window as any).__DD_TOKEN_PRICE__ ?? 1.0;
      setTokenPrice(Number(price) || 1.0);
      const wallet = WalletService.getOrCreateWallet(currentUser.id);
      const fiat = WalletService.getFiatBalance(currentUser.id, Number(price) || 1.0);
      setWalletSummary({ address: wallet.address, masked: WalletService.getMaskedAddress(wallet.address), usd: fiat.usd, dropUsd: fiat.dropUsd, totalUsd: fiat.totalUsd });
    } catch (e) {
      // Ignore wallet init errors
    }
    setIsLoading(false);
  }, [router]);

  const handleLogout = async () => {
    await UserDatabaseService.logoutUser();
    router.push('/auth/login?message=You have been logged out successfully');
  };

  const handleMarketingPreferenceChange = async (preference: string, value: boolean) => {
    if (!user) return;
    
    const result = await UserDatabaseService.updateMarketingPreferences(user.id, {
      [preference]: value
    } as any);
    
    if (result.success) {
      // Update local state
      setUser(prev => prev ? {
        ...prev,
        marketingPreferences: {
          ...prev.marketingPreferences,
          [preference]: value
        }
      } : null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Welcome back, {user.personalInfo.firstName}! 👋
            </h2>
            <p className="text-gray-600 mt-1">
              Ready to compete in some skill-based games?
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Member since</div>
            <div className="font-semibold text-gray-900">
              {new Date(user.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <ShoppingBagIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Total Purchases</p>
              <p className="text-2xl font-bold text-gray-900">{user.buyerStats?.totalPurchases || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <CurrencyDollarIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Total Spent</p>
              <p className="text-2xl font-bold text-gray-900">${user.buyerStats?.totalSpent || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <StarIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Loyalty Points</p>
              <p className="text-2xl font-bold text-gray-900">{user.buyerStats?.loyaltyPoints || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <TrophyIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Membership</p>
              <p className="text-2xl font-bold text-gray-900 capitalize">{user.buyerStats?.membershipTier || 'Bronze'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/listings"
            className="flex flex-col items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
          >
            <ShoppingBagIcon className="h-8 w-8 text-green-600 mb-2" />
            <span className="text-sm font-medium text-green-800">Browse Items</span>
          </Link>
          
          <Link
            href="/hot-sell"
            className="flex flex-col items-center p-4 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
          >
            <TrophyIcon className="h-8 w-8 text-red-600 mb-2" />
            <span className="text-sm font-medium text-red-800">Tournaments</span>
          </Link>
          
          <Link
            href="/games"
            className="flex flex-col items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <StarIcon className="h-8 w-8 text-purple-600 mb-2" />
            <span className="text-sm font-medium text-purple-800">Practice Games</span>
          </Link>
          
          <Link
            href="/buy-tokens"
            className="flex flex-col items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <CurrencyDollarIcon className="h-8 w-8 text-blue-600 mb-2" />
            <span className="text-sm font-medium text-blue-800">Buy Tokens</span>
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-3">
          <div className="flex items-center p-3 bg-gray-50 rounded-lg">
            <GiftIcon className="h-5 w-5 text-green-600 mr-3" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Welcome bonus received</p>
              <p className="text-xs text-gray-600">100 loyalty points added to your account</p>
            </div>
            <span className="text-xs text-gray-500">Just now</span>
          </div>
          
          <div className="text-center py-8 text-gray-500">
            <p>No recent activity. Start competing to see your activity here!</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
            <input
              type="text"
              value={user.personalInfo.firstName}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
              readOnly
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
            <input
              type="text"
              value={user.personalInfo.lastName}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
              readOnly
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <div className="flex items-center">
              <input
                type="email"
                value={user.email}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
                readOnly
              />
              {user.emailVerified ? (
                <span className="ml-2 text-green-600 text-sm">✓ Verified</span>
              ) : (
                <span className="ml-2 text-red-600 text-sm">Not verified</span>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
            <div className="flex items-center">
              <input
                type="tel"
                value={user.personalInfo.phone || ''}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
                readOnly
              />
              {user.phoneVerified ? (
                <span className="ml-2 text-green-600 text-sm">✓ Verified</span>
              ) : (
                <span className="ml-2 text-red-600 text-sm">Not verified</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Address Information */}
      {user.addresses.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Address Information</h3>
          {user.addresses.map((address, index) => (
            <div key={address.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900 capitalize">{address.type} Address</span>
                {address.isDefault && (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Default</span>
                )}
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <p>{address.street}</p>
                <p>{address.city}, {address.state} {address.zipCode}</p>
                <p>{address.country}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderPreferences = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Marketing Preferences</h3>
        <p className="text-gray-600 mb-6">Choose how you'd like to hear from us about deals, updates, and new features.</p>
        
        <div className="space-y-4">
          <label className="flex items-start">
            <input
              type="checkbox"
              checked={user.marketingPreferences.emailMarketing}
              onChange={(e) => handleMarketingPreferenceChange('emailMarketing', e.target.checked)}
              className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
            <div className="ml-3">
              <div className="flex items-center">
                <EnvelopeIcon className="h-4 w-4 text-gray-600 mr-2" />
                <span className="text-sm font-medium text-gray-700">Email Marketing</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Receive promotional emails and special offers</p>
            </div>
          </label>

          <label className="flex items-start">
            <input
              type="checkbox"
              checked={user.marketingPreferences.smsMarketing}
              onChange={(e) => handleMarketingPreferenceChange('smsMarketing', e.target.checked)}
              className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
            <div className="ml-3">
              <div className="flex items-center">
                <DevicePhoneMobileIcon className="h-4 w-4 text-gray-600 mr-2" />
                <span className="text-sm font-medium text-gray-700">SMS Marketing</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Receive text messages about deals and updates</p>
            </div>
          </label>

          <label className="flex items-start">
            <input
              type="checkbox"
              checked={user.marketingPreferences.hotDealsAlerts}
              onChange={(e) => handleMarketingPreferenceChange('hotDealsAlerts', e.target.checked)}
              className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
            <div className="ml-3">
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-700">🔥 Hot Deals Alerts</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Get notified when hot competitions are about to start</p>
            </div>
          </label>

          <label className="flex items-start">
            <input
              type="checkbox"
              checked={user.marketingPreferences.newProductAlerts}
              onChange={(e) => handleMarketingPreferenceChange('newProductAlerts', e.target.checked)}
              className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
            <div className="ml-3">
              <span className="text-sm font-medium text-gray-700">New Product Alerts</span>
              <p className="text-xs text-gray-500 mt-1">Be the first to know about new competitions</p>
            </div>
          </label>

          <label className="flex items-start">
            <input
              type="checkbox"
              checked={user.marketingPreferences.tournamentAlerts}
              onChange={(e) => handleMarketingPreferenceChange('tournamentAlerts', e.target.checked)}
              className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
            <div className="ml-3">
              <span className="text-sm font-medium text-gray-700">🏆 Tournament Alerts</span>
              <p className="text-xs text-gray-500 mt-1">Get notified about cash prize tournaments</p>
            </div>
          </label>

          <label className="flex items-start">
            <input
              type="checkbox"
              checked={user.marketingPreferences.weeklyNewsletter}
              onChange={(e) => handleMarketingPreferenceChange('weeklyNewsletter', e.target.checked)}
              className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
            <div className="ml-3">
              <span className="text-sm font-medium text-gray-700">Weekly Newsletter</span>
              <p className="text-xs text-gray-500 mt-1">Weekly roundup of competitions and platform updates</p>
            </div>
          </label>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
            <select className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50" disabled>
              <option value="USD">USD - US Dollar</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
            <select className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50" disabled>
              <option value="America/New_York">Eastern Time (ET)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSecurity = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Two-Factor Authentication</h3>
        <p className="text-gray-600 mb-6">
          Add an extra layer of security to your account by requiring a verification code sent to your phone.
        </p>
        
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center">
            <DevicePhoneMobileIcon className="h-6 w-6 text-gray-600 mr-3" />
            <div>
              <p className="font-medium text-gray-900">SMS Authentication</p>
              <p className="text-sm text-gray-600">
                {is2FAEnabled 
                  ? `Enabled for ${TwoFactorAuthService.maskPhoneNumber(user?.personalInfo.phone || '')}`
                  : 'Receive codes via text message'
                }
              </p>
            </div>
          </div>
          <button
            onClick={async () => {
              if (is2FAEnabled) {
                const result = await TwoFactorAuthService.disable2FA(user!.id);
                if (result.success) {
                  setIs2FAEnabled(false);
                  alert(result.message);
                }
              } else {
                if (user?.personalInfo.phone) {
                  const result = await TwoFactorAuthService.enable2FA(user.id, user.personalInfo.phone);
                  if (result.success) {
                    setIs2FAEnabled(true);
                    alert(`2FA enabled! Backup codes: ${result.backupCodes?.join(', ')}`);
                  }
                } else {
                  alert('Please add a phone number to your profile first.');
                }
              }
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              is2FAEnabled
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {is2FAEnabled ? 'Disable' : 'Enable'}
          </button>
        </div>

        {is2FAEnabled && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center text-blue-800 mb-2">
              <CheckCircleIcon className="h-5 w-5 mr-2" />
              <span className="font-medium">2FA is Active</span>
            </div>
            <p className="text-blue-700 text-sm">
              You'll receive a verification code via SMS when logging in. 
              Keep your backup codes safe in case you lose access to your phone.
            </p>
            <div className="mt-3 space-x-3">
              <button
                onClick={async () => {
                  const result = await TwoFactorAuthService.regenerateBackupCodes(user!.id);
                  if (result.success && result.backupCodes) {
                    alert(`New backup codes: ${result.backupCodes.join(', ')}`);
                  }
                }}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Regenerate Backup Codes
              </button>
              <span className="text-blue-600">•</span>
              <span className="text-blue-700 text-sm">
                {TwoFactorAuthService.getBackupCodesCount(user!.id)} backup codes remaining
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Login Security</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-700">Login Notifications</span>
            <span className="text-green-600 text-sm">✓ Enabled</span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-700">Phone Verification Required</span>
            <span className="text-green-600 text-sm">✓ Enabled</span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-700">Session Timeout</span>
            <span className="text-gray-600 text-sm">30 days</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderWallet = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Wallet</h3>
        <p className="text-sm text-gray-600 mb-4">Your internal wallet for DROP tokens and USD balance.</p>
        {walletSummary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-xs text-gray-600">Address</div>
              <div className="font-mono text-sm text-gray-900">{walletSummary.masked}</div>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-xs text-gray-600">USD Balance</div>
              <div className="text-gray-900 font-semibold">${walletSummary.usd.toFixed(2)}</div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="text-xs text-gray-600">DROP (USD value)</div>
              <div className="text-gray-900 font-semibold">${walletSummary.dropUsd.toFixed(2)}</div>
            </div>
          </div>
        )}
        <div className="mt-4 text-sm text-gray-600">Token price: ${tokenPrice.toFixed(2)} per DROP</div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={() => {
              if (!user) return;
              // Demo: credit $10 to USD
              const w = WalletService.credit(user.id, 'USD', 10, 'USD top-up');
              const fiat = WalletService.getFiatBalance(user.id, tokenPrice);
              setWalletSummary({ address: w.address, masked: WalletService.getMaskedAddress(w.address), usd: fiat.usd, dropUsd: fiat.dropUsd, totalUsd: fiat.totalUsd });
            }}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
          >
            Add $10 USD (demo)
          </button>
          <button
            onClick={() => {
              if (!user) return;
              WalletService.buyDrop(user.id, 5, tokenPrice);
              const fiat = WalletService.getFiatBalance(user.id, tokenPrice);
              const w = WalletService.getOrCreateWallet(user.id);
              setWalletSummary({ address: w.address, masked: WalletService.getMaskedAddress(w.address), usd: fiat.usd, dropUsd: fiat.dropUsd, totalUsd: fiat.totalUsd });
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Convert $5 → DROP (demo)
          </button>
          <button
            onClick={() => {
              if (!user) return;
              const res = WalletService.generateBackupMnemonic(user.id);
              if (res.success && res.mnemonic) alert(`Backup phrase (demo):\n${res.mnemonic}`);
            }}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white rounded-lg"
          >
            Show Backup Phrase (demo)
          </button>
          <button
            onClick={() => {
              if (!user) return;
              const exp = WalletService.exportWallet(user.id);
              if (exp.success && exp.data) {
                const blob = new Blob([exp.data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `wallet_${user.id}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
          >
            Export Wallet (JSON)
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-3">
              <img src="/DropCoin.png" alt="Dollar Drop" className="h-8 w-8" />
              <span className="text-xl font-bold text-gray-900 dark:text-white transition-colors">Dollar Drop</span>
            </Link>
            
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {user.personalInfo.firstName}</span>
              <button
                onClick={handleLogout}
                className="flex items-center text-gray-700 hover:text-red-600 transition-colors"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5 mr-1" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <UserIcon className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-3">
                  <p className="font-semibold text-gray-900">{user.personalInfo.firstName} {user.personalInfo.lastName}</p>
                  <p className="text-sm text-gray-600 capitalize">{user.buyerStats?.membershipTier || 'Bronze'} Member</p>
                </div>
              </div>
              
              <nav className="space-y-2">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`w-full flex items-center px-3 py-2 rounded-lg text-left transition-colors ${
                    activeTab === 'overview' ? 'bg-green-50 text-green-700' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <ChartBarIcon className="h-5 w-5 mr-3" />
                  Overview
                </button>
                
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`w-full flex items-center px-3 py-2 rounded-lg text-left transition-colors ${
                    activeTab === 'profile' ? 'bg-green-50 text-green-700' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <UserIcon className="h-5 w-5 mr-3" />
                  Profile
                </button>
                
                <button
                  onClick={() => setActiveTab('preferences')}
                  className={`w-full flex items-center px-3 py-2 rounded-lg text-left transition-colors ${
                    activeTab === 'preferences' ? 'bg-green-50 text-green-700' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <CogIcon className="h-5 w-5 mr-3" />
                  Preferences
                </button>
                
                <button
                  onClick={() => setActiveTab('security')}
                  className={`w-full flex items-center px-3 py-2 rounded-lg text-left transition-colors ${
                    activeTab === 'security' ? 'bg-green-50 text-green-700' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <DevicePhoneMobileIcon className="h-5 w-5 mr-3" />
                  Security
                </button>
                <button
                  onClick={() => setActiveTab('wallet')}
                  className={`w-full flex items-center px-3 py-2 rounded-lg text-left transition-colors ${
                    activeTab === 'wallet' ? 'bg-green-50 text-green-700' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <CurrencyDollarIcon className="h-5 w-5 mr-3" />
                  Wallet
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'profile' && renderProfile()}
            {activeTab === 'preferences' && renderPreferences()}
            {activeTab === 'security' && renderSecurity()}
            {activeTab === 'wallet' && renderWallet()}
          </div>
        </div>
      </div>
    </div>
  );
}