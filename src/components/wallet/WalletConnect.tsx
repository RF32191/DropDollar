'use client';

import { useState, useEffect } from 'react';
import {
  WalletIcon,
  LinkIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import { formatCurrency } from '@/utils/financial';

interface WalletConnectProps {
  onConnect: (walletData: WalletData) => void;
  requiredAmount?: number;
}

interface WalletData {
  address: string;
  balance: number;
  isConnected: boolean;
  network: string;
}

export default function WalletConnect({ onConnect, requiredAmount = 0 }: WalletConnectProps) {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mock wallet connection - replace with actual Web3 integration
  const connectWallet = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      // Simulate wallet connection delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Mock wallet data - replace with actual Web3 wallet connection
      const mockWallet: WalletData = {
        address: '0x742d35Cc6436C0532925a3b8A4C3A8b4C8d4E5A6',
        balance: 1250.75, // Mock balance in tokens
        isConnected: true,
        network: 'Ethereum Mainnet'
      };

      setWallet(mockWallet);
      onConnect(mockWallet);
    } catch (err) {
      setError('Failed to connect wallet. Please try again.');
      console.error('Wallet connection error:', err);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setWallet(null);
    setError(null);
  };

  const hasEnoughBalance = wallet ? wallet.balance >= requiredAmount : false;

  if (wallet?.isConnected) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="bg-green-100 rounded-full p-2">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Wallet Connected</h3>
              <p className="text-sm text-gray-600">{wallet.network}</p>
            </div>
          </div>
          <button
            onClick={disconnectWallet}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Disconnect
          </button>
        </div>

        {/* Wallet Details */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm text-gray-600">Address</p>
              <p className="font-mono text-sm text-gray-900">
                {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
              </p>
            </div>
            <button className="text-primary-600 hover:text-primary-700 text-sm">
              Copy
            </button>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm text-gray-600">Balance</p>
              <p className="font-semibold text-lg text-gray-900">
                {formatCurrency(wallet.balance)} tokens
              </p>
            </div>
            <CurrencyDollarIcon className="h-6 w-6 text-money-600" />
          </div>

          {/* Balance Check */}
          {requiredAmount > 0 && (
            <div className={`
              p-3 rounded-lg border
              ${hasEnoughBalance 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
              }
            `}>
              <div className="flex items-center space-x-2">
                {hasEnoughBalance ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                ) : (
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                )}
                <div>
                  <p className={`text-sm font-medium ${
                    hasEnoughBalance ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {hasEnoughBalance ? 'Sufficient Balance' : 'Insufficient Balance'}
                  </p>
                  <p className={`text-xs ${
                    hasEnoughBalance ? 'text-green-700' : 'text-red-700'
                  }`}>
                    Required: {formatCurrency(requiredAmount)} tokens
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="text-center">
        <div className="bg-primary-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
          <WalletIcon className="h-8 w-8 text-primary-600" />
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Connect Your Wallet
        </h3>
        
        <p className="text-gray-600 mb-6">
          Connect your crypto wallet to make payments on DropDollar
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <div className="flex items-center space-x-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        <button
          onClick={connectWallet}
          disabled={isConnecting}
          className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isConnecting ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Connecting...
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <LinkIcon className="h-5 w-5 mr-2" />
              Connect Wallet
            </div>
          )}
        </button>

        <div className="mt-4 text-xs text-gray-500">
          <p>Supported wallets: MetaMask, WalletConnect, Coinbase Wallet</p>
        </div>
      </div>
    </div>
  );
}
