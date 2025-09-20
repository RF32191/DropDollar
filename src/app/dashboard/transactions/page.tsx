'use client';

import { useState } from 'react';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { formatCurrency } from '@/utils/financial';
import type { Transaction, EscrowAccount } from '@/types';

// Mock transaction data
const mockTransactions: (Transaction & { itemTitle?: string })[] = [
  {
    id: 'tx_001',
    listingId: '1',
    buyerId: 'current_user',
    sellerId: 'seller_001',
    amount: 450,
    platformFee: 29.25,
    sellerPayout: 420.75,
    status: 'completed',
    createdAt: new Date('2024-01-20'),
    escrowReleaseDate: new Date('2024-02-03'),
    completedAt: new Date('2024-01-25'),
    paidOutAt: new Date('2024-02-05'),
    itemTitle: 'iPhone 15 Pro 256GB'
  },
  {
    id: 'tx_002',
    listingId: '2',
    buyerId: 'buyer_002',
    sellerId: 'current_user',
    amount: 720,
    platformFee: 46.80,
    sellerPayout: 673.20,
    status: 'escrowed',
    createdAt: new Date('2024-01-25'),
    escrowReleaseDate: new Date('2024-02-08'),
    itemTitle: 'Gaming Laptop ASUS ROG'
  },
  {
    id: 'tx_003',
    listingId: '3',
    buyerId: 'current_user',
    sellerId: 'seller_003',
    amount: 280,
    platformFee: 18.20,
    sellerPayout: 261.80,
    status: 'pending',
    createdAt: new Date('2024-01-28'),
    escrowReleaseDate: new Date('2024-02-11'),
    itemTitle: 'Wireless Headphones'
  }
];

export default function TransactionsPage() {
  const [filter, setFilter] = useState<'all' | 'purchases' | 'sales'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'escrowed' | 'completed'>('all');

  const currentUserId = 'current_user';
  
  const filteredTransactions = mockTransactions.filter(tx => {
    const matchesType = filter === 'all' || 
      (filter === 'purchases' && tx.buyerId === currentUserId) ||
      (filter === 'sales' && tx.sellerId === currentUserId);
    
    const matchesStatus = statusFilter === 'all' || tx.status === statusFilter;
    
    return matchesType && matchesStatus;
  });

  const getTransactionIcon = (transaction: Transaction) => {
    if (transaction.buyerId === currentUserId) {
      return <ArrowUpIcon className="h-5 w-5 text-red-600" />;
    } else {
      return <ArrowDownIcon className="h-5 w-5 text-green-600" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-4 w-4 text-green-600" />;
      case 'escrowed':
        return <ShieldCheckIcon className="h-4 w-4 text-blue-600" />;
      case 'pending':
        return <ClockIcon className="h-4 w-4 text-yellow-600" />;
      default:
        return <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'escrowed':
        return 'In Escrow';
      case 'pending':
        return 'Pending';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'escrowed':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-red-100 text-red-800';
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Transaction History</h1>
        <p className="mt-2 text-gray-600">
          Track your purchases, sales, and earnings on Dollar Drop
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Transaction Type
              </label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Transactions</option>
                <option value="purchases">My Purchases</option>
                <option value="sales">My Sales</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="escrowed">In Escrow</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div className="text-right">
            <p className="text-sm text-gray-600">
              {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Transaction List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12">
            <CurrencyDollarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
            <p className="text-gray-600">
              {filter === 'purchases' 
                ? "You haven't made any purchases yet." 
                : filter === 'sales'
                ? "You haven't made any sales yet."
                : "No transactions match your current filters."
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredTransactions.map((transaction) => {
              const isPurchase = transaction.buyerId === currentUserId;
              const amount = isPurchase ? transaction.amount : transaction.sellerPayout;
              
              return (
                <div key={transaction.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start space-x-4">
                      {/* Transaction Type Icon */}
                      <div className="bg-gray-100 rounded-full p-2">
                        {getTransactionIcon(transaction)}
                      </div>
                      
                      {/* Transaction Details */}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {transaction.itemTitle}
                          </h3>
                          <span className={`
                            inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                            ${getStatusColor(transaction.status)}
                          `}>
                            {getStatusIcon(transaction.status)}
                            <span className="ml-1">{getStatusText(transaction.status)}</span>
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-2">
                          {isPurchase ? 'Purchased from' : 'Sold to'} {' '}
                          <span className="font-medium">
                            {isPurchase ? `Seller ${transaction.sellerId}` : `Buyer ${transaction.buyerId}`}
                          </span>
                        </p>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>ID: {transaction.id}</span>
                          <span>•</span>
                          <span>{transaction.createdAt.toLocaleDateString()}</span>
                          {transaction.status === 'escrowed' && (
                            <>
                              <span>•</span>
                              <span>Releases: {transaction.escrowReleaseDate.toLocaleDateString()}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Amount */}
                    <div className="text-right">
                      <p className={`text-lg font-bold ${
                        isPurchase ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {isPurchase ? '-' : '+'}{formatCurrency(amount, 'usd')}
                      </p>
                      
                      {/* Fee Information */}
                      {isPurchase && (
                        <p className="text-xs text-gray-500">
                          Includes platform fee: {formatCurrency(transaction.platformFee, 'usd')}
                        </p>
                      )}
                      
                      {!isPurchase && transaction.status === 'escrowed' && (
                        <p className="text-xs text-blue-600">
                          In escrow protection
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Escrow Details for Sales */}
                  {!isPurchase && transaction.status === 'escrowed' && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <ShieldCheckIcon className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-800">
                          Payment in Escrow Protection
                        </span>
                      </div>
                      <p className="text-xs text-blue-700">
                        Your payment of {formatCurrency(transaction.sellerPayout, 'usd')} will be released on{' '}
                        {transaction.escrowReleaseDate.toLocaleDateString()} or when the buyer confirms receipt.
                      </p>
                    </div>
                  )}
                  
                  {/* Revenue Breakdown for Completed Sales */}
                  {!isPurchase && transaction.status === 'completed' && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Revenue Breakdown</h4>
                      <div className="space-y-1 text-xs text-gray-600">
                        <div className="flex justify-between">
                          <span>Total Sale Amount:</span>
                          <span>{formatCurrency(transaction.amount, 'usd')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Platform Fee (6.5%):</span>
                          <span>-{formatCurrency(transaction.platformFee, 'usd')}</span>
                        </div>
                        <div className="flex justify-between font-medium text-gray-900">
                          <span>Your Payout:</span>
                          <span>{formatCurrency(transaction.sellerPayout, 'usd')}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
