'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { paymentManager, PAYMENT_METHODS, type PaymentMethod, type PaymentResult } from '@/lib/payments';
import { dropCoinContract, type DropCoinStats } from '@/lib/dropCoinContract';

export default function BuyTokensPage() {
  const [tokenAmount, setTokenAmount] = useState(10);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(PAYMENT_METHODS[0]);
  const [currentPrice, setCurrentPrice] = useState(1.00);
  const [loading, setLoading] = useState(false);
  const [priceHistory, setPriceHistory] = useState<Array<{timestamp: Date, price: number}>>([]);
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  
  // Real Drop Coin contract state
  const [dropCoinStats, setDropCoinStats] = useState<DropCoinStats | null>(null);
  const [metaMaskConnected, setMetaMaskConnected] = useState(false);
  const [userAddress, setUserAddress] = useState<string>('');
  const [userBalance, setUserBalance] = useState(0);
  const [realTimeCost, setRealTimeCost] = useState<{eth: number, usd: number} | null>(null);

  // Load real Drop Coin contract data
  useEffect(() => {
    const loadContractData = async () => {
      try {
        // Load contract statistics
        const stats = await dropCoinContract.getContractStats();
        setDropCoinStats(stats);
        setCurrentPrice(stats.currentPriceUSD);

        // Check MetaMask connection
        const connection = await dropCoinContract.checkMetaMaskConnection();
        setMetaMaskConnected(connection.connected);
        if (connection.address) {
          setUserAddress(connection.address);
          const balance = await dropCoinContract.getUserBalance(connection.address);
          setUserBalance(balance);
        }

        // Calculate real-time cost for current token amount
        const cost = await dropCoinContract.calculatePurchaseCost(tokenAmount);
        setRealTimeCost(cost);
      } catch (error) {
        console.error('Error loading contract data:', error);
        // Fallback to mock data
        const newPrice = paymentManager.getCurrentTokenPrice();
        setCurrentPrice(newPrice);
        const history = paymentManager.getPriceHistory(7);
        setPriceHistory(history);
      }
    };

    loadContractData();

    // Update data every 30 seconds
    const interval = setInterval(loadContractData, 30000);
    
    return () => clearInterval(interval);
  }, [tokenAmount]);

  // Update cost when token amount changes
  useEffect(() => {
    const updateCost = async () => {
      if (dropCoinStats) {
        try {
          const cost = await dropCoinContract.calculatePurchaseCost(tokenAmount);
          setRealTimeCost(cost);
        } catch (error) {
          console.error('Error calculating cost:', error);
        }
      }
    };

    updateCost();
  }, [tokenAmount, dropCoinStats]);

  const handlePurchase = async () => {
    setLoading(true);
    
    try {
      // Handle direct ETH payment with real contract
      if (selectedMethod.id === 'crypto-eth') {
        if (!metaMaskConnected) {
          const connection = await dropCoinContract.connectMetaMask();
          if (!connection.success) {
            alert(connection.error || 'Failed to connect MetaMask');
            setLoading(false);
            return;
          }
          setMetaMaskConnected(true);
          setUserAddress(connection.address!);
        }

        const result = await dropCoinContract.purchaseTokensWithETH(tokenAmount, userAddress);
        
        if (result.success) {
          alert(`🎉 Successfully purchased ${tokenAmount} DROP tokens!\n\nTransaction: ${result.transactionHash}\n\nView on Etherscan: ${dropCoinContract.getTransactionUrl(result.transactionHash!)}`);
          
          // Refresh user balance and contract stats
          const newBalance = await dropCoinContract.getUserBalance(userAddress);
          setUserBalance(newBalance);
          const newStats = await dropCoinContract.getContractStats();
          setDropCoinStats(newStats);
          setCurrentPrice(newStats.currentPriceUSD);
        } else {
          alert(`❌ Purchase failed: ${result.error}`);
        }
      } else {
        // Handle traditional payment methods (cards, PayPal, etc.)
        const paymentRequest = {
          amount: totalCost,
          tokenAmount,
          method: selectedMethod,
          userId: 'current_user', // In production, get from auth context
          email: 'user@example.com' // In production, get from auth context
        };

        const result = await paymentManager.processPayment(paymentRequest);
        
        if (result.success) {
          setPaymentResult(result);
          setShowReceipt(true);
          alert(`Successfully purchased ${tokenAmount} DROP tokens! (Note: This is a demo payment)`);
        } else {
          alert(`Payment failed: ${result.error}`);
        }
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('Payment processing failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectMetaMask = async () => {
    const connection = await dropCoinContract.connectMetaMask();
    if (connection.success) {
      setMetaMaskConnected(true);
      setUserAddress(connection.address!);
      const balance = await dropCoinContract.getUserBalance(connection.address!);
      setUserBalance(balance);
      
      // Add DROP token to MetaMask
      await dropCoinContract.addTokenToMetaMask();
    } else {
      alert(connection.error || 'Failed to connect MetaMask');
    }
  };

  const costBreakdown = paymentManager.calculateTotal(tokenAmount);
  const totalCost = costBreakdown.total;

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
              <div className="flex items-center space-x-3 ml-4 pl-4 border-l border-gray-200 dark:border-gray-700">
                <Link href="/wallet" className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-bold transition-colors">👛 Wallet</Link>
                <Link href="/settings" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-bold transition-colors">⚙️ Settings</Link>
                <Link href="/auth/login" className="text-gray-700 hover:text-green-600 font-medium">Sign In</Link>
                <Link href="/auth/register" className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">Sign Up</Link>
                <Link href="/seller/apply" className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">Sell</Link>
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="w-24 h-24 bg-gradient-to-r from-green-400 to-blue-500 rounded-full mx-auto mb-6 flex items-center justify-center">
            <span className="text-3xl font-bold text-white">💎</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Buy DROP Tokens</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Purchase DROP tokens to participate in gaming competitions and win amazing prizes. 
            Built on Ethereum blockchain for security and transparency.
          </p>
        </div>

        {/* Real Contract Stats */}
        {dropCoinStats && (
          <div className="bg-blue-50 rounded-xl p-6 mb-8">
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">🔗 Live Blockchain Data</h3>
              <p className="text-sm text-gray-600">Connected to your deployed Drop Coin contract</p>
              <a 
                href={dropCoinContract.getExplorerUrl()} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                View Contract on Etherscan →
              </a>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">{dropCoinStats.holderCount}</div>
                <div className="text-sm text-gray-600">Holders</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{dropCoinStats.tokensAvailableForSale.toLocaleString()}</div>
                <div className="text-sm text-gray-600">Available for Sale</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">{dropCoinStats.totalTransactions}</div>
                <div className="text-sm text-gray-600">Transactions</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">${dropCoinStats.marketCap.toLocaleString()}</div>
                <div className="text-sm text-gray-600">Market Cap</div>
              </div>
            </div>
          </div>
        )}

        {/* MetaMask Connection */}
        <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">🦊 MetaMask Wallet</h3>
              {metaMaskConnected ? (
                <div>
                  <p className="text-sm text-green-600 font-medium">✅ Connected: {userAddress.slice(0, 6)}...{userAddress.slice(-4)}</p>
                  <p className="text-sm text-gray-600">Balance: {userBalance.toLocaleString()} DROP tokens</p>
                </div>
              ) : (
                <p className="text-sm text-gray-600">Connect your MetaMask to buy tokens directly with ETH</p>
              )}
            </div>
            {!metaMaskConnected && (
              <button
                onClick={handleConnectMetaMask}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Connect MetaMask
              </button>
            )}
          </div>
        </div>

        {/* Token Info Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">💰</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Current Price</h3>
              <p className="text-3xl font-bold text-green-600">${currentPrice.toFixed(3)}</p>
              <p className="text-sm text-gray-500">per DROP token</p>
              {realTimeCost && (
                <p className="text-xs text-gray-400 mt-1">{realTimeCost.eth.toFixed(6)} ETH</p>
              )}
              <div className="mt-2">
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                  {dropCoinStats ? 'Live Blockchain' : 'Demo Pricing'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">📈</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">7-Day Trend</h3>
              {priceHistory.length > 0 && (
                <>
                  <p className="text-2xl font-bold text-blue-600">
                    {priceHistory[0]?.price > priceHistory[priceHistory.length - 1]?.price ? '📈' : '📉'}
                  </p>
                  <p className="text-sm text-gray-600">
                    ${priceHistory[0]?.price.toFixed(3)} → ${priceHistory[priceHistory.length - 1]?.price.toFixed(3)}
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
            <div className="text-center">
              <div className="w-12 h-12 bg-orange-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">⚡</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Dynamic Pricing</h3>
              <p className="text-sm text-gray-600">Price adjusts based on platform activity, time of day, and demand</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">🔒</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Secure Wallet</h3>
              <p className="text-sm text-gray-600">Built-in wallet with 2FA protection for your tokens</p>
            </div>
          </div>
        </div>

        {/* Purchase Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-blue-600 px-8 py-6">
            <h2 className="text-2xl font-bold text-white">Purchase DROP Tokens</h2>
            <p className="text-green-100 mt-2">Choose your token amount and payment method</p>
          </div>

          <div className="p-8">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Left Column - Token Selection */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Token Amount</h3>
                
                {/* Quick Select Buttons */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {[10, 25, 50, 100, 250, 500].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setTokenAmount(amount)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        tokenAmount === amount
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-200 hover:border-green-300'
                      }`}
                    >
                      <div className="font-semibold">{amount}</div>
                      <div className="text-sm text-gray-500">${(amount * currentPrice).toFixed(0)}</div>
                    </button>
                  ))}
                </div>

                {/* Custom Amount Input */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Amount
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={tokenAmount}
                    onChange={(e) => setTokenAmount(parseInt(e.target.value) || 1)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Enter token amount"
                  />
                </div>

                {/* Cost Breakdown Display */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="space-y-2">
                    {selectedMethod.id === 'crypto-eth' && realTimeCost ? (
                      // Real blockchain cost for ETH payments
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">{tokenAmount} DROP tokens:</span>
                          <span className="font-semibold">${realTimeCost.usd.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">ETH Amount:</span>
                          <span className="font-semibold">{realTimeCost.eth.toFixed(6)} ETH</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Gas fees:</span>
                          <span className="font-semibold text-green-600">~$2-5 (paid separately)</span>
                        </div>
                        <div className="border-t border-gray-200 pt-2">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-900 font-bold">Total Cost:</span>
                            <span className="text-2xl font-bold text-gray-900">${realTimeCost.usd.toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="text-center">
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            🔗 Direct Blockchain Purchase
                          </span>
                        </div>
                      </>
                    ) : (
                      // Traditional payment cost breakdown
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">{tokenAmount} DROP tokens:</span>
                          <span className="font-semibold">${costBreakdown.tokenCost.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Processing fee:</span>
                          <span className="font-semibold">${costBreakdown.processingFee.toFixed(2)}</span>
                        </div>
                        <div className="border-t border-gray-200 pt-2">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-900 font-bold">Total Cost:</span>
                            <span className="text-2xl font-bold text-gray-900">${totalCost.toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="text-center">
                          <span className="text-sm text-gray-500">@ ${currentPrice.toFixed(3)} per token</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column - Payment Method */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Method</h3>

                <div className="space-y-3 mb-6">
                  {PAYMENT_METHODS.filter(method => method.enabled).map((method) => (
                    <label 
                      key={method.id}
                      className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50 ${
                        selectedMethod.id === method.id ? 'border-green-500 bg-green-50' : 'border-gray-200'
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value={method.id}
                        checked={selectedMethod.id === method.id}
                        onChange={() => setSelectedMethod(method)}
                        className="w-4 h-4 text-green-600"
                      />
                      <div className="ml-3 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900">{method.name}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-xl">{method.icon}</span>
                            <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                              {method.processingFee}% fee
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-500">
                          {method.type === 'card' && 'Secure payment via Stripe'}
                          {method.type === 'apple-pay' && 'Quick and secure payment'}
                          {method.type === 'paypal' && 'Pay with your PayPal account'}
                          {method.type === 'crypto' && 'Cryptocurrency payment with low fees'}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>

                {/* Purchase Button */}
                <button
                  onClick={handlePurchase}
                  disabled={loading || (selectedMethod.id === 'crypto-eth' && !metaMaskConnected)}
                  className="w-full bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white font-bold py-4 px-6 rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      {selectedMethod.id === 'crypto-eth' ? 'Confirming Transaction...' : 'Processing Payment...'}
                    </div>
                  ) : selectedMethod.id === 'crypto-eth' ? (
                    metaMaskConnected ? (
                      realTimeCost ? 
                        `🔗 Buy ${tokenAmount} DROP - ${realTimeCost.eth.toFixed(6)} ETH` :
                        `🔗 Buy ${tokenAmount} DROP Tokens`
                    ) : (
                      '🦊 Connect MetaMask First'
                    )
                  ) : (
                    `💳 Purchase ${tokenAmount} DROP - $${totalCost.toFixed(2)} (Demo)`
                  )}
                </button>

                {selectedMethod.id === 'crypto-eth' && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-800 text-center">
                      🔗 <strong>Real Blockchain Transaction</strong><br/>
                      Tokens will be sent directly to your MetaMask wallet.<br/>
                      This uses your actual deployed Drop Coin contract!
                    </p>
                  </div>
                )}

                <p className="text-xs text-gray-500 mt-3 text-center">
                  By purchasing, you agree to our Terms of Service and Privacy Policy. 
                  Tokens will be added to your secure wallet immediately after payment.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Token Usage Info */}
        <div className="mt-12 bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">How to Use Your DROP Tokens</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">🎮</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Gaming Competitions</h4>
              <p className="text-sm text-gray-600">Use 1 token to enter any gaming competition and compete for prizes</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">🏆</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Win Big Prizes</h4>
              <p className="text-sm text-gray-600">Winners pay only their entry fee while getting full-value prizes</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">📈</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Token Appreciation</h4>
              <p className="text-sm text-gray-600">Token value increases as platform usage grows</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                  <img src="/DropCoin.png" alt="Logo" className="w-full h-full object-contain" />
                </div>
                <span className="text-lg font-bold">Dollar Drop</span>
              </div>
              <p className="text-gray-400 text-sm">The future of skill-based gaming and token economics.</p>
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
              <h4 className="font-semibold mb-4">Account</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/auth/register" className="hover:text-white">Sign Up</Link></li>
                <li><Link href="/auth/login" className="hover:text-white">Sign In</Link></li>
                <li><Link href="/seller/apply" className="hover:text-white">Become a Seller</Link></li>
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
            <p>&copy; 2024 Dollar Drop. All rights reserved. Built on Ethereum blockchain.</p>
          </div>
        </div>
      </footer>

      {/* Payment Receipt Modal */}
      {showReceipt && paymentResult?.receipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-3xl">✅</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h3>
              <p className="text-gray-600">Your DROP tokens have been added to your wallet</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-gray-900 mb-3">Transaction Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Transaction ID:</span>
                  <span className="font-mono text-xs">{paymentResult.receipt.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tokens Purchased:</span>
                  <span className="font-bold">{paymentResult.receipt.tokenAmount} DROP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Method:</span>
                  <span>{paymentResult.receipt.method}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Paid:</span>
                  <span className="font-bold">${(paymentResult.receipt.amount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Processing Fee:</span>
                  <span>${(paymentResult.receipt.fees?.processing || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date:</span>
                  <span>{paymentResult.receipt.timestamp.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => setShowReceipt(false)}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              >
                Continue to Wallet
              </button>
              <button
                onClick={() => {
                  // In production, generate and download PDF receipt
                  alert('Receipt download feature coming soon!');
                }}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Download Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
