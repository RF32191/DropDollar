'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { WalletService, WalletTransaction } from '@/lib/walletService';
import TokenManagementService from '@/lib/tokenManagement';
import { dropCoinContract } from '@/lib/dropCoinContract';
import { dropCoinWalletIntegration } from '@/lib/dropCoinWalletIntegration';

export default function WalletPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [masked, setMasked] = useState('');
  const [dropBalance, setDropBalance] = useState(0);
  const [websiteDropBalance, setWebsiteDropBalance] = useState(0);
  const [blockchainDropBalance, setBlockchainDropBalance] = useState(0);
  const [usdBalance, setUsdBalance] = useState(0);
  const [usdValueOfDrop, setUsdValueOfDrop] = useState(0);
  const [tokenPrice, setTokenPrice] = useState(1.0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [metaMaskConnected, setMetaMaskConnected] = useState(false);
  const [metaMaskAddress, setMetaMaskAddress] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    
    // Don't redirect - just set loading to false for unauthenticated users
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setUserName(`${user.firstName} ${user.lastName}`);

      // Get token price with robust error handling
      let price = 2.45; // Default fallback price
      try {
        if (typeof TokenManagementService !== 'undefined' && TokenManagementService.getTokenStats) {
          const tokenStats = TokenManagementService.getTokenStats();
          price = tokenStats.currentPrice || 2.45;
        }
      } catch (tokenError) {
        console.warn('TokenManagementService not available, using fallback price:', tokenError);
      }
      setTokenPrice(price);

      if (user.wallet) {
        setWalletAddress(user.wallet.address);
        setMasked(`${user.wallet.address.slice(0, 6)}...${user.wallet.address.slice(-4)}`);
        
        // Load comprehensive DROP balance (website + blockchain)
        loadDropBalances(user.id, user.wallet.address);
        
        setUsdBalance(user.wallet.balances.USD || 0);
        
        // Set 2FA status (check if user has 2FA enabled)
        setTwoFAEnabled(user.twoFactorEnabled || false);
        
        // Check MetaMask connection
        checkMetaMaskConnection();
        
        // Load transactions with robust error handling
        try {
          if (typeof WalletService !== 'undefined' && WalletService.getTransactions) {
            const userTransactions = WalletService.getTransactions(user.id);
            setTransactions(userTransactions.slice().reverse());
          } else {
            // Fallback to empty transactions
            setTransactions([]);
          }
        } catch (transactionError) {
          console.warn('WalletService not available, using empty transactions:', transactionError);
          setTransactions([]);
        }
      } else {
        setError('No wallet found for this account');
      }
    } catch (error) {
      console.error('Error loading wallet data:', error);
      setError('Failed to load wallet information');
    }

    setLoading(false);
  }, [user, authLoading, router]);

  // Load DROP balances from both website and blockchain
  const loadDropBalances = async (userId: string, walletAddress: string) => {
    try {
      const balances = await dropCoinWalletIntegration.getUserDropBalance(userId, walletAddress);
      setWebsiteDropBalance(balances.websiteBalance);
      setBlockchainDropBalance(balances.blockchainBalance);
      setDropBalance(balances.totalBalance);
      setUsdValueOfDrop(balances.totalBalance * tokenPrice);
    } catch (error) {
      console.error('Error loading DROP balances:', error);
      // Fallback to existing balance
      setDropBalance(user?.wallet?.balances?.DROP || 0);
      setUsdValueOfDrop((user?.wallet?.balances?.DROP || 0) * tokenPrice);
    }
  };

  // Check MetaMask connection
  const checkMetaMaskConnection = async () => {
    try {
      const connection = await dropCoinContract.checkMetaMaskConnection();
      setMetaMaskConnected(connection.connected);
      if (connection.address) {
        setMetaMaskAddress(connection.address);
      }
    } catch (error) {
      console.error('Error checking MetaMask connection:', error);
    }
  };

  // Connect to MetaMask
  const connectMetaMask = async () => {
    try {
      const connection = await dropCoinContract.connectMetaMask();
      if (connection.success && connection.address) {
        setMetaMaskConnected(true);
        setMetaMaskAddress(connection.address);
        
        // Reload blockchain balance
        if (user) {
          loadDropBalances(user.id, user.wallet.address);
        }
      } else {
        alert(connection.error || 'Failed to connect MetaMask');
      }
    } catch (error) {
      console.error('Error connecting MetaMask:', error);
      alert('Failed to connect MetaMask');
    }
  };

  // Transfer tokens to MetaMask
  const transferToMetaMask = async () => {
    if (!transferAmount || parseFloat(transferAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    const amount = parseFloat(transferAmount);
    if (amount > websiteDropBalance) {
      alert('Insufficient balance in website wallet');
      return;
    }

    if (!metaMaskConnected) {
      alert('Please connect MetaMask first');
      return;
    }

    setTransferLoading(true);
    try {
      // For now, we'll simulate the transfer since we need to implement the backend
      // In production, this would call the actual transfer function
      alert(`Transfer of ${amount} DROP tokens to MetaMask initiated!\n\nNote: This is a demo. In production, tokens would be transferred to your MetaMask wallet.`);
      
      setTransferAmount('');
      setShowTransferModal(false);
      
      // Reload balances
      if (user) {
        loadDropBalances(user.id, user.wallet.address);
      }
    } catch (error) {
      console.error('Transfer error:', error);
      alert('Transfer failed. Please try again.');
    } finally {
      setTransferLoading(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'purchase': return '💳';
      case 'transfer': return '🔁';
      case 'credit': return '➕';
      case 'debit': return '➖';
      default: return '💰';
    }
  };

  const getTransactionColor = (type: string, amount: number) => {
    if (type === 'credit' || amount > 0) return 'text-green-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center transition-colors">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300 transition-colors">Loading your wallet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center overflow-hidden">
                <img
                  src="/DropCoin.png"
                  alt="Dollar Drop Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white transition-colors">Dollar Drop</span>
            </Link>
            <nav className="flex items-center space-x-6">
              <Link href="/listings" className="text-gray-700 dark:text-green-400 hover:text-green-600 dark:hover:text-green-300 font-medium transition-colors">Browse</Link>
              <Link href="/categories" className="text-gray-700 dark:text-green-400 hover:text-green-600 dark:hover:text-green-300 font-medium transition-colors">Categories</Link>
              <Link href="/games" className="text-purple-600 dark:text-green-400 hover:text-purple-700 dark:hover:text-green-300 font-bold transition-colors">🎮 Games</Link>
              <Link href="/hot-sell" className="text-red-600 dark:text-green-400 hover:text-red-700 dark:hover:text-green-300 font-bold transition-colors">🔥 Hot Sell</Link>
              <Link href="/how-it-works" className="text-gray-700 dark:text-green-400 hover:text-green-600 dark:hover:text-green-300 font-medium transition-colors">How It Works</Link>
              <Link href="/buy-tokens" className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-bold transition-colors">💰 Buy Tokens</Link>
              <div className="flex items-center space-x-3 ml-4 pl-4 border-l border-gray-200 dark:border-gray-700 transition-colors">
                <Link href="/wallet" className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-bold transition-colors">👛 Wallet</Link>
                <Link href="/settings" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-bold transition-colors">⚙️ Settings</Link>
                <span className="text-gray-700 dark:text-gray-300 font-medium transition-colors">{userName}</span>
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 transition-colors">My Wallet</h1>
          <p className="text-gray-600 dark:text-gray-300 transition-colors">Manage your DROP tokens and view transaction history</p>
        </div>

        {/* Unauthenticated User Message */}
        {!user && !authLoading && (
          <div className="max-w-md mx-auto text-center py-16">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Create Your Wallet
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-8">
                Sign up or login to create a wallet and start managing your DROP tokens.
              </p>
              <div className="space-y-3">
                <Link 
                  href="/auth/register"
                  className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors inline-flex items-center justify-center"
                >
                  Sign Up
                </Link>
                <Link 
                  href="/auth/login"
                  className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white px-6 py-3 rounded-lg font-semibold transition-colors inline-flex items-center justify-center"
                >
                  Login
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && user && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                  Wallet Error
                </h3>
                <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Authenticated User Wallet Content */}
        {user && (
          <div className="grid lg:grid-cols-3 gap-8">
          {/* Balance Card */}
          <div className="lg:col-span-1">
            <div className="bg-gradient-to-br from-green-500 to-blue-600 dark:from-green-600 dark:to-blue-700 rounded-2xl p-6 text-white mb-6 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Balances</h2>
                <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <span className="text-lg">💎</span>
                </div>
              </div>
              <div className="mb-2">
                <div className="text-3xl font-bold">{dropBalance.toFixed(6)}</div>
                <div className="text-green-100">Total DROP Tokens</div>
              </div>
              <div className="text-sm text-green-100 space-y-1">
                <div>Website Wallet: {websiteDropBalance.toFixed(6)} DROP</div>
                <div>Blockchain Wallet: {blockchainDropBalance.toFixed(6)} DROP</div>
                <div className="border-t border-white border-opacity-20 pt-1">
                  ≈ ${usdValueOfDrop.toFixed(2)} USD (Total)
                </div>
                <div>USD Balance: ${usdBalance.toFixed(2)}</div>
              </div>
              <div className="mt-4 pt-4 border-t border-white border-opacity-20">
                <div className="text-xs text-green-100">Current Price</div>
                <div className="text-sm font-semibold">${tokenPrice.toFixed(2)} per DROP</div>
              </div>
            </div>

            {/* Wallet Info */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 mb-6 transition-colors">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 transition-colors">Wallet Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400 transition-colors">Wallet Address</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <code className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1 rounded font-mono transition-colors">{masked}</code>
                    <button
                      onClick={() => navigator.clipboard.writeText(walletAddress)}
                      className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 text-xs transition-colors"
                    >Copy</button>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400 transition-colors">Security</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-sm text-gray-900 dark:text-white transition-colors">2FA {twoFAEnabled ? 'Enabled' : 'Disabled'}</span>
                    {twoFAEnabled ? <span className="text-green-600 dark:text-green-400">✓</span> : <span className="text-gray-400">✕</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* MetaMask Connection */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 mb-6 transition-colors">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 transition-colors">🦊 MetaMask Connection</h3>
              {metaMaskConnected ? (
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="text-green-600 dark:text-green-400">✅</span>
                    <span className="text-sm text-gray-900 dark:text-white transition-colors">Connected</span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-4 transition-colors">
                    {metaMaskAddress.slice(0, 6)}...{metaMaskAddress.slice(-4)}
                  </div>
                  <button
                    onClick={() => setShowTransferModal(true)}
                    disabled={websiteDropBalance <= 0}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    <span className="mr-2">🔄</span>
                    Transfer to MetaMask
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 transition-colors">
                    Connect MetaMask to transfer tokens to your external wallet
                  </p>
                  <button
                    onClick={connectMetaMask}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    <span className="mr-2">🦊</span>
                    Connect MetaMask
                  </button>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 transition-colors">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 transition-colors">Quick Actions</h3>
              <div className="space-y-3">
                <Link 
                  href="/buy-tokens"
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
                >
                  <span className="mr-2">💳</span>
                  Buy More Tokens
                </Link>
                <button 
                  onClick={() => {
                    // Mock backup phrase generation
                    alert(`Backup phrase (demo):\nword1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12`);
                  }}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
                >
                  <span className="mr-2">🔒</span>
                  Show Backup Phrase (demo)
                </button>
              </div>
            </div>
          </div>

          {/* Transaction History */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Transaction History</h3>
                <p className="text-sm text-gray-500 mt-1">Your recent wallet activity</p>
              </div>
              <div className="divide-y divide-gray-200">
                {transactions.length === 0 && (
                  <div className="p-6 text-sm text-gray-500">No transactions yet.</div>
                )}
                {transactions.map((transaction) => (
                  <div key={transaction.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                          <span className="text-lg">{getTransactionIcon(transaction.type)}</span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{transaction.description || transaction.type}</div>
                          <div className="text-sm text-gray-500">
                            {new Date(transaction.timestamp).toLocaleDateString()} at {new Date(transaction.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-semibold ${getTransactionColor(transaction.type, transaction.amount)}`}>
                          {transaction.asset === 'DROP' ? `${transaction.amount > 0 ? '+' : ''}${(transaction.amount || 0).toFixed(6)} DROP` : `${transaction.amount > 0 ? '+' : ''}$${(transaction.amount || 0).toFixed(2)} ${transaction.asset}`}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-6 border-t border-gray-200 text-center">
                <button className="text-green-600 hover:text-green-700 font-medium">
                  View All Transactions
                </button>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                  <img src="/DropCoin.png" alt="Logo" className="w-full h-full object-contain" />
                </div>
                <span className="text-lg font-bold">Dollar Drop</span>
              </div>
              <p className="text-gray-400 text-sm">Secure wallet for your DROP tokens.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Wallet</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/buy-tokens" className="hover:text-white">Buy Tokens</Link></li>
                <li><Link href="/wallet" className="hover:text-white">My Wallet</Link></li>
                <li><a href="#" className="hover:text-white">Security</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Platform</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/games" className="hover:text-white">Games</Link></li>
                <li><Link href="/listings" className="hover:text-white">Browse Listings</Link></li>
                <li><Link href="/hot-sell" className="hover:text-white">Hot Sell</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/how-it-works" className="hover:text-white">How It Works</Link></li>
                <li><a href="#" className="hover:text-white">Contact Us</a></li>
                <li><a href="#" className="hover:text-white">FAQ</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>&copy; 2024 Dollar Drop. All rights reserved. Your tokens are secure.</p>
          </div>
        </div>
      </footer>

      {/* Transfer to MetaMask Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white transition-colors">
                🔄 Transfer to MetaMask
              </h3>
              <button
                onClick={() => setShowTransferModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 transition-colors">
                Transfer DROP tokens from your website wallet to MetaMask
              </p>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 transition-colors">
                <div className="text-xs text-gray-500 dark:text-gray-400 transition-colors">Available in Website Wallet:</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white transition-colors">
                  {websiteDropBalance.toFixed(6)} DROP
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">
                Amount to Transfer
              </label>
              <input
                type="number"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                placeholder="0.000000"
                max={websiteDropBalance}
                step="0.000001"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
              />
              <div className="flex justify-between mt-2">
                <button
                  onClick={() => setTransferAmount((websiteDropBalance * 0.25).toString())}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                >
                  25%
                </button>
                <button
                  onClick={() => setTransferAmount((websiteDropBalance * 0.5).toString())}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                >
                  50%
                </button>
                <button
                  onClick={() => setTransferAmount((websiteDropBalance * 0.75).toString())}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                >
                  75%
                </button>
                <button
                  onClick={() => setTransferAmount(websiteDropBalance.toString())}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                >
                  Max
                </button>
              </div>
            </div>

            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg transition-colors">
              <div className="text-xs text-blue-800 dark:text-blue-200 transition-colors">
                <strong>Transfer Details:</strong><br/>
                • From: Website Wallet<br/>
                • To: {metaMaskAddress.slice(0, 6)}...{metaMaskAddress.slice(-4)}<br/>
                • Network: Sepolia Testnet<br/>
                • Gas fees: ~$2-5 (paid separately)
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowTransferModal(false)}
                className="flex-1 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={transferToMetaMask}
                disabled={transferLoading || !transferAmount || parseFloat(transferAmount) <= 0}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                {transferLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Transferring...
                  </div>
                ) : (
                  'Transfer'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}