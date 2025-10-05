'use client';

import { useState, useEffect } from 'react';
import {
  BanknotesIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  ArrowTrendingUpIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';
import { calculatePlatformRevenue, formatCurrency, PLATFORM_CONFIG } from '@/utils/financial';
import type { Transaction, ListingFee, PlatformRevenue } from '@/types';

// Mock data - replace with real API calls
const mockTransactions: Transaction[] = [
  {
    id: '1',
    listingId: '1',
    buyerId: 'buyer1',
    sellerId: 'seller1',
    amount: 450,
    platformFee: 29.25, // 6.5% of 450
    sellerPayout: 420.75,
    status: 'completed',
    createdAt: new Date('2024-01-15'),
    escrowReleaseDate: new Date('2024-01-29'),
    completedAt: new Date('2024-01-20'),
    paidOutAt: new Date('2024-01-30')
  },
  {
    id: '2',
    listingId: '2',
    buyerId: 'buyer2',
    sellerId: 'seller2',
    amount: 720,
    platformFee: 46.80, // 6.5% of 720
    sellerPayout: 673.20,
    status: 'completed',
    createdAt: new Date('2024-01-18'),
    escrowReleaseDate: new Date('2024-02-01'),
    completedAt: new Date('2024-01-25'),
    paidOutAt: new Date('2024-02-05')
  }
];

const mockListingFees: ListingFee[] = [
  {
    id: '1',
    listingId: '1',
    sellerId: 'seller1',
    amount: 0.20,
    dueDate: new Date('2024-01-01'),
    paidAt: new Date('2024-01-01'),
    status: 'paid',
    period: 'Q1 2024'
  },
  {
    id: '2',
    listingId: '2',
    sellerId: 'seller2',
    amount: 0.20,
    dueDate: new Date('2024-01-15'),
    paidAt: new Date('2024-01-15'),
    status: 'paid',
    period: 'Q1 2024'
  }
];

export default function AdminRevenuePage() {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [revenueData, setRevenueData] = useState({
    transactionRevenue: 0,
    listingRevenue: 0,
    totalRevenue: 0,
    transactionCount: 0,
    listingFeeCount: 0
  });

  useEffect(() => {
    // Calculate revenue for selected period
    const now = new Date();
    let startDate: Date;
    
    switch (selectedPeriod) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const revenue = calculatePlatformRevenue(mockTransactions, mockListingFees, startDate, now);
    setRevenueData(revenue);
  }, [selectedPeriod]);

  const stats = [
    {
      name: 'Transaction Fees (6.5%)',
      value: formatCurrency(revenueData.transactionRevenue, 'usd'),
      icon: CurrencyDollarIcon,
      change: '+12%',
      changeType: 'positive' as const,
    },
    {
      name: 'Listing Fees ($0.20)',
      value: formatCurrency(revenueData.listingRevenue, 'usd'),
      icon: DocumentTextIcon,
      change: '+8%',
      changeType: 'positive' as const,
    },
    {
      name: 'Total Platform Revenue',
      value: formatCurrency(revenueData.totalRevenue, 'usd'),
      icon: BanknotesIcon,
      change: '+15%',
      changeType: 'positive' as const,
    },
    {
      name: 'Active Transactions',
      value: revenueData.transactionCount.toString(),
      icon: ChartBarIcon,
      change: '+23%',
      changeType: 'positive' as const,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Revenue Dashboard</h1>
              <p className="mt-2 text-gray-600">
                Track your platform earnings from DropDollar marketplace
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="week">Last 7 Days</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Platform Configuration */}
        <div className="mb-8 bg-money-50 border border-money-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-money-800 mb-4">Platform Configuration</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-money-600">Transaction Fee:</span>
              <span className="ml-2 font-semibold text-money-800">
                {(PLATFORM_CONFIG.TRANSACTION_FEE_RATE * 100).toFixed(1)}%
              </span>
            </div>
            <div>
              <span className="text-money-600">Listing Fee:</span>
              <span className="ml-2 font-semibold text-money-800">
                ${PLATFORM_CONFIG.LISTING_FEE_AMOUNT}
              </span>
            </div>
            <div>
              <span className="text-money-600">Escrow Period:</span>
              <span className="ml-2 font-semibold text-money-800">
                {PLATFORM_CONFIG.ESCROW_PERIOD_DAYS} days
              </span>
            </div>
            <div>
              <span className="text-money-600">Reserve Pool:</span>
              <span className="ml-2 font-semibold text-money-800">
                {PLATFORM_CONFIG.RESERVE_POOL.toLocaleString()} tokens
              </span>
            </div>
          </div>
        </div>

        {/* Revenue Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((item) => (
            <div key={item.name} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <item.icon className="h-6 w-6 text-primary-600" aria-hidden="true" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">{item.name}</dt>
                      <dd>
                        <div className="flex items-baseline">
                          <div className="text-2xl font-semibold text-gray-900">{item.value}</div>
                          <div className="ml-2 flex items-baseline text-sm font-semibold text-primary-600">
                            <ArrowTrendingUpIcon className="h-4 w-4 flex-shrink-0 self-center" />
                            <span className="sr-only">
                              {item.changeType === 'positive' ? 'Increased' : 'Decreased'} by
                            </span>
                            {item.change}
                          </div>
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Revenue Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Transactions */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Recent Transactions</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {mockTransactions.map((transaction) => (
                <div key={transaction.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Transaction #{transaction.id}
                      </p>
                      <p className="text-sm text-gray-500">
                        {transaction.completedAt?.toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-primary-600">
                        +{formatCurrency(transaction.platformFee, 'usd')}
                      </p>
                      <p className="text-xs text-gray-500">
                        from {formatCurrency(transaction.amount, 'usd')} sale
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Listing Fees */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Listing Fees</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {mockListingFees.map((fee) => (
                <div key={fee.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Listing #{fee.listingId}
                      </p>
                      <p className="text-sm text-gray-500">
                        {fee.period} - {fee.paidAt?.toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-primary-600">
                        +{formatCurrency(fee.amount, 'usd')}
                      </p>
                      <p className="text-xs text-gray-500">Quarterly fee</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Revenue Formula Explanation */}
        <div className="mt-8 bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            How Your Revenue is Calculated
          </h3>
          <div className="space-y-4 text-sm text-gray-600">
            <div className="flex items-start space-x-3">
              <CurrencyDollarIcon className="h-5 w-5 text-primary-500 mt-0.5" />
              <div>
                <strong className="text-gray-900">Transaction Fees (6.5%):</strong>
                <p>Every completed purchase generates a 6.5% platform fee. If someone wins an item for $450, you earn $29.25.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <DocumentTextIcon className="h-5 w-5 text-primary-500 mt-0.5" />
              <div>
                <strong className="text-gray-900">Listing Fees ($0.20):</strong>
                <p>Every listing costs sellers $0.20 every 4 months to remain active on the platform.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <ArrowTrendingUpIcon className="h-5 w-5 text-primary-500 mt-0.5" />
              <div>
                <strong className="text-gray-900">Timer Bid Bonuses:</strong>
                <p>Additional bids during the timer period increase the final sale price and your fee percentage.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CalendarDaysIcon className="h-5 w-5 text-primary-500 mt-0.5" />
              <div>
                <strong className="text-gray-900">2-Week Escrow Protection:</strong>
                <p>Payments are held in escrow for 14 days to ensure buyer satisfaction before seller payout.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
