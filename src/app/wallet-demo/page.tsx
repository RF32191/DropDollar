'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { WalletService } from '@/lib/walletService';

export default function WalletDemoPage() {
  const { user } = useAuth();
  const [testWallets, setTestWallets] = useState<Array<{
    userId: string;
    address: string;
    privateKey: string;
    balances: any;
  }>>([]);

  const createTestWallet = () => {
    const testUserId = `test_user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const wallet = WalletService.createWalletForUser(testUserId, { initialUSD: Math.floor(Math.random() * 100) + 10 });
    
    setTestWallets(prev => [...prev, {
      userId: testUserId,
      address: wallet.address,
      privateKey: wallet.privateKey,
      balances: wallet.balances
    }]);
  };

  const clearTestWallets = () => {
    setTestWallets([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center mr-3">
                <span className="text-white font-bold text-lg">$</span>
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white transition-colors">DropDollar - Wallet Demo</span>
            </div>
            <nav className="flex items-center space-x-6">
              <a href="/" className="text-gray-700 dark:text-green-400 hover:text-green-600 dark:hover:text-green-300 font-medium transition-colors">← Back to Home</a>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Current User Wallet */}
        {user && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Your Account Wallet</h2>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Account Info</h3>
                  <p className="text-gray-600 dark:text-gray-300"><strong>User ID:</strong> {user.id}</p>
                  <p className="text-gray-600 dark:text-gray-300"><strong>Username:</strong> {user.username}</p>
                  <p className="text-gray-600 dark:text-gray-300"><strong>Email:</strong> {user.email}</p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Wallet Info</h3>
                  {user.wallet ? (
                    <>
                      <p className="text-gray-600 dark:text-gray-300"><strong>Address:</strong> <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm">{user.wallet.address}</code></p>
                      <p className="text-gray-600 dark:text-gray-300"><strong>Private Key:</strong> <code className="bg-red-100 dark:bg-red-900 px-2 py-1 rounded text-sm text-red-800 dark:text-red-200">{user.wallet.privateKey}</code></p>
                      <p className="text-gray-600 dark:text-gray-300"><strong>USD Balance:</strong> ${user.wallet.balances.USD}</p>
                      <p className="text-gray-600 dark:text-gray-300"><strong>DROP Balance:</strong> {user.wallet.balances.DROP}</p>
                    </>
                  ) : (
                    <p className="text-red-600 dark:text-red-400">No wallet found!</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Test Wallet Generation */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Test Unique Wallet Generation</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Click the button below to create test wallets and verify that each account gets a unique wallet address and private key.
          </p>
          
          <div className="flex space-x-4 mb-6">
            <button
              onClick={createTestWallet}
              className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Create Test Wallet
            </button>
            <button
              onClick={clearTestWallets}
              className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Clear Test Wallets
            </button>
          </div>

          {testWallets.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Generated Test Wallets ({testWallets.length})</h3>
              {testWallets.map((wallet, index) => (
                <div key={wallet.userId} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">Wallet #{index + 1}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300">User ID: <code className="text-xs">{wallet.userId}</code></p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        <strong>Address:</strong><br />
                        <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs break-all">{wallet.address}</code>
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        <strong>Private Key:</strong><br />
                        <code className="bg-red-100 dark:bg-red-900 px-2 py-1 rounded text-xs break-all text-red-800 dark:text-red-200">{wallet.privateKey}</code>
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                        <strong>Initial USD:</strong> ${wallet.balances.USD}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Security Notice */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">🔒 Security Notice</h3>
          <p className="text-yellow-700 dark:text-yellow-300">
            <strong>This is a demo implementation.</strong> In a production environment:
          </p>
          <ul className="list-disc list-inside text-yellow-700 dark:text-yellow-300 mt-2 space-y-1">
            <li>Private keys would never be displayed or stored in plain text</li>
            <li>Wallets would be generated using secure cryptographic methods</li>
            <li>Private keys would be encrypted and stored securely</li>
            <li>Users would have secure backup and recovery options</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
