'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { 
  CreditCardIcon,
  BanknotesIcon,
  ReceiptPercentIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface Invoice {
  id: string;
  campaign_id: string;
  campaign_name: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  due_date: string;
  paid_date?: string;
  created_at: string;
}

interface PaymentMethod {
  id: string;
  type: 'credit_card' | 'bank_account' | 'paypal';
  last_four: string;
  brand?: string;
  is_default: boolean;
  expires?: string;
}

interface BillingStats {
  total_spent: number;
  pending_amount: number;
  this_month_spend: number;
  active_campaigns: number;
  total_impressions: number;
  total_clicks: number;
  average_ctr: number;
}

export default function AdvertisingBillingPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'payment-methods' | 'billing-history'>('overview');
  const [loading, setLoading] = useState(true);
  const [billingStats, setBillingStats] = useState<BillingStats>({
    total_spent: 0,
    pending_amount: 0,
    this_month_spend: 0,
    active_campaigns: 0,
    total_impressions: 0,
    total_clicks: 0,
    average_ctr: 0
  });
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  useEffect(() => {
    if (user?.email) {
      fetchBillingData();
    }
  }, [user]);

  const fetchBillingData = async () => {
    try {
      // Simulate API calls - replace with actual API endpoints
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data
      setBillingStats({
        total_spent: 2847.50,
        pending_amount: 425.00,
        this_month_spend: 892.30,
        active_campaigns: 3,
        total_impressions: 45670,
        total_clicks: 1234,
        average_ctr: 2.7
      });

      setInvoices([
        {
          id: 'inv_001',
          campaign_id: 'camp_001',
          campaign_name: 'Summer Gaming Promotion',
          amount: 350.00,
          tax_amount: 35.00,
          total_amount: 385.00,
          status: 'pending',
          due_date: '2024-01-15',
          created_at: '2024-01-01'
        },
        {
          id: 'inv_002',
          campaign_id: 'camp_002',
          campaign_name: 'Mobile App Launch',
          amount: 750.00,
          tax_amount: 75.00,
          total_amount: 825.00,
          status: 'paid',
          due_date: '2023-12-15',
          paid_date: '2023-12-10',
          created_at: '2023-12-01'
        }
      ]);

      setPaymentMethods([
        {
          id: 'pm_001',
          type: 'credit_card',
          last_four: '4242',
          brand: 'Visa',
          is_default: true,
          expires: '12/27'
        },
        {
          id: 'pm_002',
          type: 'paypal',
          last_four: 'example@company.com',
          is_default: false
        }
      ]);

    } catch (error) {
      console.error('Error fetching billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePayInvoice = async (invoiceId: string) => {
    try {
      // Simulate payment processing
      console.log('Processing payment for invoice:', invoiceId);
      
      // In a real app, this would integrate with Stripe, PayPal, etc.
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update invoice status
      setInvoices(prev => prev.map(inv => 
        inv.id === invoiceId 
          ? { ...inv, status: 'paid' as const, paid_date: new Date().toISOString().split('T')[0] }
          : inv
      ));
      
      alert('Payment processed successfully!');
    } catch (error) {
      console.error('Payment error:', error);
      alert('Payment failed. Please try again.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-500/10 text-green-300 border-green-500/20';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20';
      case 'overdue':
        return 'bg-red-500/10 text-red-300 border-red-500/20';
      case 'cancelled':
        return 'bg-gray-500/10 text-gray-300 border-gray-500/20';
      default:
        return 'bg-gray-500/10 text-gray-300 border-gray-500/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircleIcon className="h-4 w-4" />;
      case 'pending':
        return <ClockIcon className="h-4 w-4" />;
      case 'overdue':
        return <ExclamationTriangleIcon className="h-4 w-4" />;
      default:
        return <InformationCircleIcon className="h-4 w-4" />;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Please Sign In</h1>
          <p className="text-blue-200 mb-6">You need to be signed in to view your billing information.</p>
          <Link href="/auth/login" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-800 via-purple-800 to-pink-800 shadow-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-2xl font-bold text-white">💧</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">DropDollar</h1>
                <p className="text-blue-200 text-sm">Billing & Payments</p>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link href="/advertising/dashboard" className="text-blue-200 hover:text-white transition-colors">
                Dashboard
              </Link>
              <Link href="/advertising/register" className="text-blue-200 hover:text-white transition-colors">
                Create Campaign
              </Link>
              <Link href="/advertising/analytics" className="text-blue-200 hover:text-white transition-colors">
                Analytics
              </Link>
              <Link href="/advertising/support" className="text-blue-200 hover:text-white transition-colors">
                Support
              </Link>
            </nav>

            {/* User Info */}
            <div className="text-white">
              <span className="text-sm">Welcome, {user.email}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Page Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-4 flex items-center">
            <CreditCardIcon className="h-10 w-10 mr-4" />
            Billing & Payments
          </h1>
          <p className="text-xl text-blue-200">Manage your advertising spend and payment methods</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-200 text-sm font-medium">Total Spent</p>
                <p className="text-3xl font-bold text-white">${billingStats.total_spent.toLocaleString()}</p>
              </div>
              <CurrencyDollarIcon className="h-12 w-12 text-green-400" />
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-200 text-sm font-medium">Pending Amount</p>
                <p className="text-3xl font-bold text-white">${billingStats.pending_amount.toLocaleString()}</p>
              </div>
              <ClockIcon className="h-12 w-12 text-yellow-400" />
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-200 text-sm font-medium">This Month</p>
                <p className="text-3xl font-bold text-white">${billingStats.this_month_spend.toLocaleString()}</p>
              </div>
              <CalendarDaysIcon className="h-12 w-12 text-blue-400" />
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-200 text-sm font-medium">Active Campaigns</p>
                <p className="text-3xl font-bold text-white">{billingStats.active_campaigns}</p>
              </div>
              <ChartBarIcon className="h-12 w-12 text-purple-400" />
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 overflow-hidden mb-8">
          <div className="flex border-b border-white/20">
            {[
              { id: 'overview', label: 'Overview', icon: ChartBarIcon },
              { id: 'invoices', label: 'Invoices', icon: DocumentTextIcon },
              { id: 'payment-methods', label: 'Payment Methods', icon: CreditCardIcon },
              { id: 'billing-history', label: 'Billing History', icon: ReceiptPercentIcon }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 px-6 py-4 text-sm font-medium transition-colors flex items-center justify-center space-x-2 ${
                  activeTab === tab.id
                    ? 'bg-blue-500/20 text-blue-300 border-b-2 border-blue-400'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <tab.icon className="h-5 w-5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="p-8">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
                <p className="text-blue-200">Loading billing information...</p>
              </div>
            ) : (
              <>
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Current Balance */}
                      <div className="bg-white/5 rounded-xl p-6">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                          <BanknotesIcon className="h-6 w-6 mr-2" />
                          Current Balance
                        </h3>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-blue-200">Account Balance:</span>
                            <span className="text-white font-semibold">$1,250.00</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-blue-200">Pending Charges:</span>
                            <span className="text-yellow-300 font-semibold">-$425.00</span>
                          </div>
                          <div className="flex justify-between border-t border-white/20 pt-3">
                            <span className="text-blue-200 font-medium">Available Balance:</span>
                            <span className="text-green-300 font-bold text-lg">$825.00</span>
                          </div>
                        </div>
                        <button className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                          Add Funds
                        </button>
                      </div>

                      {/* Performance Summary */}
                      <div className="bg-white/5 rounded-xl p-6">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                          <ChartBarIcon className="h-6 w-6 mr-2" />
                          Performance Summary
                        </h3>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-blue-200">Total Impressions:</span>
                            <span className="text-white font-semibold">{billingStats.total_impressions.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-blue-200">Total Clicks:</span>
                            <span className="text-white font-semibold">{billingStats.total_clicks.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-blue-200">Average CTR:</span>
                            <span className="text-white font-semibold">{billingStats.average_ctr}%</span>
                          </div>
                          <div className="flex justify-between border-t border-white/20 pt-3">
                            <span className="text-blue-200 font-medium">Cost per Click:</span>
                            <span className="text-blue-300 font-bold">$0.69</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-white/5 rounded-xl p-6">
                      <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Link 
                          href="/advertising/register"
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors text-center"
                        >
                          Create New Campaign
                        </Link>
                        <button className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition-colors">
                          Add Payment Method
                        </button>
                        <button className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg transition-colors">
                          Download Tax Documents
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Invoices Tab */}
                {activeTab === 'invoices' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-white">Recent Invoices</h3>
                      <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2">
                        <ArrowDownTrayIcon className="h-5 w-5" />
                        <span>Download All</span>
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-white/5">
                          <tr>
                            <th className="px-6 py-4 text-left text-sm font-medium text-blue-200 uppercase tracking-wider">Invoice</th>
                            <th className="px-6 py-4 text-left text-sm font-medium text-blue-200 uppercase tracking-wider">Campaign</th>
                            <th className="px-6 py-4 text-left text-sm font-medium text-blue-200 uppercase tracking-wider">Amount</th>
                            <th className="px-6 py-4 text-left text-sm font-medium text-blue-200 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-left text-sm font-medium text-blue-200 uppercase tracking-wider">Due Date</th>
                            <th className="px-6 py-4 text-left text-sm font-medium text-blue-200 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                          {invoices.map((invoice) => (
                            <tr key={invoice.id} className="hover:bg-white/5 transition-colors">
                              <td className="px-6 py-4">
                                <div className="text-sm font-medium text-white">#{invoice.id}</div>
                                <div className="text-sm text-blue-200">{new Date(invoice.created_at).toLocaleDateString()}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-white">{invoice.campaign_name}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-white">${invoice.total_amount.toFixed(2)}</div>
                                <div className="text-xs text-blue-200">+${invoice.tax_amount.toFixed(2)} tax</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(invoice.status)}`}>
                                  {getStatusIcon(invoice.status)}
                                  <span className="ml-2 capitalize">{invoice.status}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-white">{new Date(invoice.due_date).toLocaleDateString()}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center space-x-2">
                                  {invoice.status === 'pending' && (
                                    <button 
                                      onClick={() => handlePayInvoice(invoice.id)}
                                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors"
                                    >
                                      Pay Now
                                    </button>
                                  )}
                                  <button className="text-blue-400 hover:text-blue-300 transition-colors">
                                    <ArrowDownTrayIcon className="h-5 w-5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Payment Methods Tab */}
                {activeTab === 'payment-methods' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-white">Payment Methods</h3>
                      <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
                        Add Payment Method
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {paymentMethods.map((method) => (
                        <div key={method.id} className="bg-white/5 rounded-xl p-6 border border-white/20">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-3">
                              <CreditCardIcon className="h-8 w-8 text-blue-400" />
                              <div>
                                <div className="text-white font-medium">
                                  {method.type === 'credit_card' ? `${method.brand} •••• ${method.last_four}` : method.last_four}
                                </div>
                                {method.expires && (
                                  <div className="text-sm text-blue-200">Expires {method.expires}</div>
                                )}
                              </div>
                            </div>
                            {method.is_default && (
                              <span className="bg-green-500/10 text-green-300 px-2 py-1 rounded-full text-xs font-medium border border-green-500/20">
                                Default
                              </span>
                            )}
                          </div>
                          <div className="flex space-x-2">
                            <button className="flex-1 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg transition-colors text-sm">
                              Edit
                            </button>
                            <button className="flex-1 bg-red-600/20 hover:bg-red-600/30 text-red-300 px-3 py-2 rounded-lg transition-colors text-sm">
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Billing History Tab */}
                {activeTab === 'billing-history' && (
                  <div className="space-y-6">
                    <h3 className="text-xl font-bold text-white">Billing History</h3>
                    <div className="bg-white/5 rounded-xl p-8 text-center">
                      <ReceiptPercentIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h4 className="text-lg font-semibold text-white mb-2">Detailed History Coming Soon</h4>
                      <p className="text-blue-200">
                        We're building a comprehensive billing history view. For now, check your invoices tab for recent transactions.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Payment Security Notice */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6">
          <div className="flex items-start space-x-3">
            <InformationCircleIcon className="h-6 w-6 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-300 mb-1">Secure Payments</h4>
              <p className="text-blue-200 text-sm">
                All payments are processed securely through industry-standard encryption. 
                We never store your complete payment information on our servers. 
                Your billing information is protected by bank-level security.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
