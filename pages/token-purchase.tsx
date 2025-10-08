'use client';

import React, { useState, useEffect } from 'react';
import WebLayout from '@/components/layout/WebLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Droplets, 
  CreditCard, 
  Smartphone, 
  Bitcoin, 
  Zap,
  TrendingUp,
  Users,
  Activity,
  AlertCircle,
  CheckCircle,
  Copy,
  ExternalLink,
  Shield,
  Clock
} from 'lucide-react';

interface TokenStats {
  holderCount: number;
  currentPriceUSD: number;
  currentPriceETH: number;
  totalTransactions: number;
  availableForSale: number;
  marketCap: number;
  priceChange24h: number;
  volume24h: number;
}

interface PaymentMethod {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  enabled: boolean;
}

export default function TokenPurchasePage() {
  const [stats, setStats] = useState<TokenStats | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [tokenAmount, setTokenAmount] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [customerAddress, setCustomerAddress] = useState<string>('');
  const [purchaseCost, setPurchaseCost] = useState<{ eth: number; usd: number; btc: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [activeTab, setActiveTab] = useState('buy');

  const paymentMethods: PaymentMethod[] = [
    {
      id: 'card',
      name: 'Credit/Debit Card',
      icon: <CreditCard className="h-5 w-5" />,
      description: 'Visa, Mastercard, American Express',
      enabled: true
    },
    {
      id: 'apple_pay',
      name: 'Apple Pay',
      icon: <Smartphone className="h-5 w-5" />,
      description: 'One-tap payment with Touch/Face ID',
      enabled: true
    },
    {
      id: 'eth',
      name: 'Ethereum (ETH)',
      icon: <Zap className="h-5 w-5" />,
      description: 'Direct blockchain payment',
      enabled: true
    },
    {
      id: 'bitcoin',
      name: 'Bitcoin (BTC)',
      icon: <Bitcoin className="h-5 w-5" />,
      description: 'Global cryptocurrency payment',
      enabled: true
    }
  ];

  // Mock stats for demo
  useEffect(() => {
    const mockStats: TokenStats = {
      holderCount: 156,
      currentPriceUSD: 1.23,
      currentPriceETH: 0.000274,
      totalTransactions: 1247,
      availableForSale: 98750000,
      marketCap: 135300000,
      priceChange24h: 5.2,
      volume24h: 2500000
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
    
    // Mock conversions
    const ethPrice = 4500;
    const btcPrice = 65000;
    const totalETH = totalUSD / ethPrice;
    const totalBTC = totalUSD / btcPrice;

    setPurchaseCost({
      usd: totalUSD,
      eth: totalETH,
      btc: totalBTC
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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Payment request failed');
      }

      const result = await response.json();

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(`Payment initiated! Payment ID: ${result.payment_id}`);
        
        if (selectedPaymentMethod === 'card' || selectedPaymentMethod === 'apple_pay') {
          setSuccess('Redirecting to secure payment...');
        } else if (selectedPaymentMethod === 'eth') {
          setSuccess(`Send ${result.amount_eth?.toFixed(6)} ETH to contract: ${result.contract_address}`);
        } else if (selectedPaymentMethod === 'bitcoin') {
          setSuccess(`Send ${result.amount_btc?.toFixed(8)} BTC to: ${result.btc_address}`);
        }
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError(err instanceof Error ? err.message : 'Payment failed. Please try again.');
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <WebLayout currentPage="token-purchase">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-3xl md:text-5xl font-bold mb-4">
                💧 Drop Coin Purchase
              </h1>
              <p className="text-xl md:text-2xl text-blue-100 mb-8">
                Buy Drop Coin tokens and join the community
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="buy" className="flex items-center gap-2">
                <Droplets className="h-4 w-4" />
                <span className="hidden sm:inline">Buy Tokens</span>
                <span className="sm:hidden">Buy</span>
              </TabsTrigger>
              <TabsTrigger value="info" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Token Info</span>
                <span className="sm:hidden">Info</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="buy" className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Purchase Form */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Purchase Drop Coins
                    </CardTitle>
                    <CardDescription>
                      Choose your payment method and buy DROP tokens
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Payment Method Selection */}
                    <div className="space-y-3">
                      <Label htmlFor="payment-method">Payment Method</Label>
                      <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment method..." />
                        </SelectTrigger>
                        <SelectContent>
                          {paymentMethods.map((method) => (
                            <SelectItem key={method.id} value={method.id} disabled={!method.enabled}>
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
                        className="text-lg"
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
                        <h4 className="font-semibold text-blue-900 mb-3">Purchase Summary</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Tokens:</span>
                            <span className="font-medium">{formatNumber(parseInt(tokenAmount))} DROP</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Total Cost:</span>
                            <span className="font-bold text-lg">{formatCurrency(purchaseCost.usd)}</span>
                          </div>
                          <div className="flex justify-between text-gray-600">
                            <span>≈ ETH:</span>
                            <span>{purchaseCost.eth.toFixed(6)} ETH</span>
                          </div>
                          <div className="flex justify-between text-gray-600">
                            <span>≈ BTC:</span>
                            <span>{purchaseCost.btc.toFixed(8)} BTC</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Error/Success Messages */}
                    {error && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        {error}
                      </div>
                    )}

                    {success && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        {success}
                      </div>
                    )}

                    {/* Purchase Button */}
                    <Button 
                      onClick={handlePurchase}
                      disabled={!selectedPaymentMethod || !tokenAmount || !customerEmail || isLoading}
                      className="w-full h-12 text-lg"
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-2">
                          <Clock className="h-5 w-5 animate-spin" />
                          Processing...
                        </div>
                      ) : (
                        'Purchase Tokens'
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* Token Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Token Information
                    </CardTitle>
                    <CardDescription>
                      Learn about Drop Coin tokenomics
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Current Stats */}
                    {stats && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">{formatCurrency(stats.currentPriceUSD)}</div>
                            <div className="text-sm text-gray-600">Current Price</div>
                            <Badge className={`mt-1 ${stats.priceChange24h >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {stats.priceChange24h >= 0 ? '+' : ''}{stats.priceChange24h}%
                            </Badge>
                          </div>
                          <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <div className="text-2xl font-bold text-purple-600">{formatNumber(stats.holderCount)}</div>
                            <div className="text-sm text-gray-600">Holders</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <div className="text-lg font-bold text-green-600">{formatCurrency(stats.marketCap)}</div>
                            <div className="text-sm text-gray-600">Market Cap</div>
                          </div>
                          <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <div className="text-lg font-bold text-orange-600">{formatNumber(stats.totalTransactions)}</div>
                            <div className="text-sm text-gray-600">Transactions</div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
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

                    <div className="space-y-4">
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
            </TabsContent>

            <TabsContent value="info" className="space-y-8">
              {/* Token Stats Grid */}
              {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

              {/* Token Details */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card>
                  <CardHeader>
                    <CardTitle>Token Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
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
                    <div className="flex justify-between">
                      <span className="font-medium">Contract Address:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6</span>
                        <Button size="sm" variant="ghost" onClick={() => copyToClipboard('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6')}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>How to Buy</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">1</div>
                        <div>
                          <p className="font-medium">Choose Payment Method</p>
                          <p className="text-sm text-gray-600">Select from card, Apple Pay, ETH, or Bitcoin</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">2</div>
                        <div>
                          <p className="font-medium">Enter Amount</p>
                          <p className="text-sm text-gray-600">Specify how many DROP tokens you want</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">3</div>
                        <div>
                          <p className="font-medium">Complete Payment</p>
                          <p className="text-sm text-gray-600">Follow the payment process for your chosen method</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">4</div>
                        <div>
                          <p className="font-medium">Receive Tokens</p>
                          <p className="text-sm text-gray-600">Tokens will be sent to your wallet address</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </WebLayout>
  );
}
