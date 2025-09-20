'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, CreditCard, Smartphone, Bitcoin, Zap, TrendingUp, Users, Activity } from 'lucide-react';

interface DropCoinStats {
  holderCount: number;
  currentPriceUSD: number;
  currentPriceETH: number;
  totalTransactions: number;
  availableForSale: number;
  marketCap: number;
}

interface PaymentMethod {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
}

const paymentMethods: PaymentMethod[] = [
  {
    id: 'card',
    name: 'Credit/Debit Card',
    icon: <CreditCard className="h-5 w-5" />,
    description: 'Visa, Mastercard, American Express'
  },
  {
    id: 'apple_pay',
    name: 'Apple Pay',
    icon: <Smartphone className="h-5 w-5" />,
    description: 'One-tap payment with Touch/Face ID'
  },
  {
    id: 'eth',
    name: 'Ethereum (ETH)',
    icon: <Zap className="h-5 w-5" />,
    description: 'Direct blockchain payment'
  },
  {
    id: 'bitcoin',
    name: 'Bitcoin (BTC)',
    icon: <Bitcoin className="h-5 w-5" />,
    description: 'Global cryptocurrency payment'
  }
];

export default function DropCoinInterface() {
  const [stats, setStats] = useState<DropCoinStats | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [tokenAmount, setTokenAmount] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [customerAddress, setCustomerAddress] = useState<string>('');
  const [purchaseCost, setPurchaseCost] = useState<{ eth: number; usd: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Mock stats for demo (in production, fetch from your backend)
  useEffect(() => {
    const mockStats: DropCoinStats = {
      holderCount: 156,
      currentPriceUSD: 1.23,
      currentPriceETH: 0.000274,
      totalTransactions: 1247,
      availableForSale: 98750000,
      marketCap: 135300000
    };
    setStats(mockStats);
  }, []);

  const calculateCost = async () => {
    if (!tokenAmount || parseFloat(tokenAmount) <= 0) {
      setPurchaseCost(null);
      return;
    }

    const amount = parseFloat(tokenAmount);
    const pricePerToken = stats?.currentPriceUSD || 1.0;
    const totalUSD = amount * pricePerToken;
    
    // Mock ETH conversion (in production, use your price oracle)
    const ethPrice = 4500; // Current ETH price
    const totalETH = totalUSD / ethPrice;

    setPurchaseCost({
      usd: totalUSD,
      eth: totalETH
    });
  };

  useEffect(() => {
    calculateCost();
  }, [tokenAmount, stats]);

  const handlePurchase = async () => {
    if (!selectedPaymentMethod || !tokenAmount || !customerEmail) {
      setError('Please fill in all required fields');
      return;
    }

    if ((selectedPaymentMethod === 'eth' || selectedPaymentMethod === 'bitcoin') && !customerAddress) {
      setError('Wallet address is required for crypto payments');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      // In production, call your payment gateway API
      const response = await fetch('/api/create_payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_method: selectedPaymentMethod,
          token_amount: parseInt(tokenAmount),
          customer_email: customerEmail,
          customer_address: customerAddress
        })
      });

      const result = await response.json();

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(`Payment initiated! Payment ID: ${result.payment_id}`);
        // Handle different payment methods
        if (selectedPaymentMethod === 'card' || selectedPaymentMethod === 'apple_pay') {
          // Redirect to Stripe checkout
          setSuccess('Redirecting to secure payment...');
        } else if (selectedPaymentMethod === 'eth') {
          setSuccess(`Send ${result.amount_eth.toFixed(6)} ETH to contract: ${result.contract_address}`);
        } else if (selectedPaymentMethod === 'bitcoin') {
          setSuccess(`Send ${result.amount_btc.toFixed(8)} BTC to: ${result.btc_address}`);
        }
      }
    } catch (err) {
      setError('Payment failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(num);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          💧 Drop Coin
        </h1>
        <p className="text-xl text-gray-600">
          Dynamic Value Appreciation Token - Starting at $1.00 USD
        </p>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Price</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.currentPriceUSD)}</div>
              <p className="text-xs text-muted-foreground">
                {stats.currentPriceETH.toFixed(6)} ETH
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Token Holders</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(stats.holderCount)}</div>
              <p className="text-xs text-muted-foreground">
                +{Math.floor(Math.random() * 10) + 1} today
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transactions</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(stats.totalTransactions)}</div>
              <p className="text-xs text-muted-foreground">
                All-time total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(stats.availableForSale)}</div>
              <p className="text-xs text-muted-foreground">
                DROP tokens for sale
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Purchase Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Purchase Form */}
        <Card>
          <CardHeader>
            <CardTitle>💳 Purchase Drop Coins</CardTitle>
            <CardDescription>
              Choose your payment method and buy DROP tokens
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Payment Method Selection */}
            <div className="space-y-2">
              <Label htmlFor="payment-method">Payment Method</Label>
              <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method..." />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.id} value={method.id}>
                      <div className="flex items-center space-x-2">
                        {method.icon}
                        <span>{method.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Token Amount */}
            <div className="space-y-2">
              <Label htmlFor="token-amount">Number of DROP Tokens</Label>
              <Input
                id="token-amount"
                type="number"
                placeholder="Enter amount"
                value={tokenAmount}
                onChange={(e) => setTokenAmount(e.target.value)}
                min="1"
                step="1"
              />
            </div>

            {/* Customer Email */}
            <div className="space-y-2">
              <Label htmlFor="customer-email">Email Address</Label>
              <Input
                id="customer-email"
                type="email"
                placeholder="your@email.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
              />
            </div>

            {/* Wallet Address (for crypto payments) */}
            {(selectedPaymentMethod === 'eth' || selectedPaymentMethod === 'bitcoin') && (
              <div className="space-y-2">
                <Label htmlFor="customer-address">Wallet Address</Label>
                <Input
                  id="customer-address"
                  placeholder="0x... (for token delivery)"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                />
              </div>
            )}

            {/* Cost Display */}
            {purchaseCost && tokenAmount && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900">Purchase Summary</h4>
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Tokens:</span>
                    <span>{formatNumber(parseInt(tokenAmount))} DROP</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Cost:</span>
                    <span>{formatCurrency(purchaseCost.usd)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>≈ ETH:</span>
                    <span>{purchaseCost.eth.toFixed(6)} ETH</span>
                  </div>
                </div>
              </div>
            )}

            {/* Error/Success Messages */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                {success}
              </div>
            )}

            {/* Purchase Button */}
            <Button 
              onClick={handlePurchase}
              disabled={!selectedPaymentMethod || !tokenAmount || !customerEmail || isLoading}
              className="w-full"
            >
              {isLoading ? 'Processing...' : 'Purchase Tokens'}
            </Button>
          </CardContent>
        </Card>

        {/* Token Information */}
        <Card>
          <CardHeader>
            <CardTitle>📊 Token Information</CardTitle>
            <CardDescription>
              Learn about Drop Coin tokenomics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="font-medium">Total Supply:</span>
                <span>110,000,000 DROP</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Circulating Supply:</span>
                <span>100,000,000 DROP</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Owner Reserve:</span>
                <span>10,000,000 DROP</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Initial Price:</span>
                <span>$1.00 USD</span>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <h4 className="font-semibold">💡 Value Appreciation</h4>
              <div className="text-sm text-gray-600 space-y-2">
                <p>Drop Coin price increases automatically as:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>More people hold the token (+0.1% per holder)</li>
                  <li>More transactions occur (+0.01% per transaction)</li>
                  <li>Community grows and adopts the token</li>
                </ul>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <h4 className="font-semibold">🔒 Security Features</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p>• ERC-20 compliant smart contract</p>
                <p>• Deployed on Ethereum blockchain</p>
                <p>• Transparent and immutable</p>
                <p>• No hidden fees or surprises</p>
              </div>
            </div>

            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Early Adopter Advantage:</strong> The earlier you buy, the lower the price! 
                As more people join, the price increases automatically.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
