'use client';

import React from 'react';
import Link from 'next/link';
import { 
  CurrencyDollarIcon,
  TrophyIcon,
  ShoppingBagIcon,
  InformationCircleIcon,
  CalculatorIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

export default function FeeSchedulePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-3">
              <img src="/DropCoin.png" alt="DropDollar" className="h-8 w-8" />
              <span className="text-xl font-bold text-gray-900">DropDollar</span>
            </Link>
            <nav className="flex space-x-6">
              <Link href="/seller/apply" className="text-blue-600 hover:text-blue-700 font-medium">← Back to Application</Link>
              <Link href="/" className="text-gray-700 hover:text-green-600 font-medium">Home</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <CurrencyDollarIcon className="h-12 w-12 text-green-600" />
            <h1 className="text-4xl font-bold text-gray-900">Fee Schedule</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Transparent pricing structure for all DropDollar sellers and tournament participants
          </p>
        </div>

        {/* Fee Structure Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Regular Item Sales */}
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
            <div className="flex items-center space-x-3 mb-6">
              <ShoppingBagIcon className="h-8 w-8 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900">Regular Item Sales</h2>
            </div>
            
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">12%</div>
                  <div className="text-lg font-semibold text-blue-800">DropDollar Platform Fee</div>
                  <div className="text-sm text-blue-700 mt-1">Deducted from final sale price</div>
                </div>
              </div>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600 mb-2">$0.20</div>
                  <div className="text-lg font-semibold text-gray-800">Listing Fee</div>
                  <div className="text-sm text-gray-700 mt-1">Per item listed</div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-bold text-green-800 mb-2">Example Calculation:</h3>
                <div className="text-sm text-green-700 space-y-1">
                  <div className="flex justify-between">
                    <span>Item sells for:</span>
                    <span className="font-bold">$1,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span>DropDollar fee (12%):</span>
                    <span className="font-bold text-red-600">-$120</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Listing fee:</span>
                    <span className="font-bold text-red-600">-$0.20</span>
                  </div>
                  <div className="border-t border-green-300 pt-1 flex justify-between">
                    <span className="font-bold">You receive (CASH):</span>
                    <span className="font-bold text-green-800">$879.80</span>
                  </div>
                  <div className="text-xs text-green-600 mt-2 font-medium">
                    💰 Paid directly to your bank account after 14-day escrow period
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cash Tournament Prizes */}
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
            <div className="flex items-center space-x-3 mb-6">
              <TrophyIcon className="h-8 w-8 text-purple-600" />
              <h2 className="text-2xl font-bold text-gray-900">Cash Tournament Prizes</h2>
            </div>
            
            <div className="space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600 mb-2">15%</div>
                  <div className="text-lg font-semibold text-purple-800">DropDollar Platform Fee</div>
                  <div className="text-sm text-purple-700 mt-1">Deducted from prize pool</div>
                </div>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 mb-2">100%</div>
                  <div className="text-lg font-semibold text-green-800">Entry Fees to DropDollar</div>
                  <div className="text-sm text-green-700 mt-1">All participant entry fees</div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <h3 className="font-bold text-orange-800 mb-2">Example Calculation:</h3>
                <div className="text-sm text-orange-700 space-y-1">
                  <div className="flex justify-between">
                    <span>$100 Tournament Pool:</span>
                    <span className="font-bold">$100</span>
                  </div>
                  <div className="flex justify-between">
                    <span>DropDollar fee (15%):</span>
                    <span className="font-bold text-red-600">-$15</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Entry fees collected:</span>
                    <span className="font-bold text-green-600">+$100</span>
                  </div>
                  <div className="border-t border-orange-300 pt-1 flex justify-between">
                    <span className="font-bold">Winner receives:</span>
                    <span className="font-bold text-orange-800">$85</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold">DropDollar revenue:</span>
                    <span className="font-bold text-green-800">$115</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tournament Prize Tiers */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            💰 Tournament Prize Tiers & Revenue
          </h2>
          
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-4 px-4 font-bold text-gray-900">Tournament</th>
                    <th className="text-left py-4 px-4 font-bold text-gray-900">Prize Pool</th>
                    <th className="text-left py-4 px-4 font-bold text-gray-900">Platform Fee (15%)</th>
                    <th className="text-left py-4 px-4 font-bold text-gray-900">Winner Receives</th>
                    <th className="text-left py-4 px-4 font-bold text-gray-900">Daily Winners</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="py-4 px-4 font-medium text-green-600">Starter Tournament</td>
                    <td className="py-4 px-4 font-bold">$100</td>
                    <td className="py-4 px-4 text-red-600 font-bold">$15</td>
                    <td className="py-4 px-4 text-green-600 font-bold">$85</td>
                    <td className="py-4 px-4 text-blue-600 font-bold">10</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-4 px-4 font-medium text-blue-600">Intermediate Tournament</td>
                    <td className="py-4 px-4 font-bold">$500</td>
                    <td className="py-4 px-4 text-red-600 font-bold">$75</td>
                    <td className="py-4 px-4 text-green-600 font-bold">$425</td>
                    <td className="py-4 px-4 text-blue-600 font-bold">5</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-4 px-4 font-medium text-purple-600">Advanced Tournament</td>
                    <td className="py-4 px-4 font-bold">$2,500</td>
                    <td className="py-4 px-4 text-red-600 font-bold">$375</td>
                    <td className="py-4 px-4 text-green-600 font-bold">$2,125</td>
                    <td className="py-4 px-4 text-blue-600 font-bold">5</td>
                  </tr>
                  <tr>
                    <td className="py-4 px-4 font-medium text-red-600">Elite Championship</td>
                    <td className="py-4 px-4 font-bold">$25,000</td>
                    <td className="py-4 px-4 text-red-600 font-bold">$3,750</td>
                    <td className="py-4 px-4 text-green-600 font-bold">$21,250</td>
                    <td className="py-4 px-4 text-blue-600 font-bold">2</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Revenue Projections */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            📊 Daily Revenue Projections
          </h2>
          
          <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl p-8 shadow-lg border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Tournament Revenue (Daily)</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span>Platform Fees (15%):</span>
                    <span className="font-bold text-red-600">$4,215</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Entry Fees (100%):</span>
                    <span className="font-bold text-green-600">$28,100+</span>
                  </div>
                  <div className="border-t border-gray-300 pt-2 flex justify-between">
                    <span className="font-bold">Total Tournament Revenue:</span>
                    <span className="font-bold text-blue-600">$32,315+</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Regular Sales Revenue</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span>Platform Fees (12%):</span>
                    <span className="font-bold text-red-600">Variable</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Listing Fees ($0.20):</span>
                    <span className="font-bold text-green-600">Variable</span>
                  </div>
                  <div className="border-t border-gray-300 pt-2 flex justify-between">
                    <span className="font-bold">Based on Sales Volume:</span>
                    <span className="font-bold text-blue-600">$10,000+</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-8 p-4 bg-white rounded-lg border border-blue-200">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 mb-2">$42,315+</div>
                <div className="text-lg font-semibold text-blue-800">Estimated Daily Revenue</div>
                <div className="text-sm text-blue-700 mt-1">Conservative projection with growth potential</div>
              </div>
            </div>
          </div>
        </section>

        {/* Cash Payout System */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            💰 Seller Cash Payout System
          </h2>
          
          <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl p-8 shadow-lg border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <CurrencyDollarIcon className="h-6 w-6 text-green-600 mr-2" />
                  How You Get Paid
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start">
                    <div className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">1</div>
                    <div>
                      <strong>Item Sells:</strong> Buyer pays the full item price
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">2</div>
                    <div>
                      <strong>Escrow Period:</strong> Payment held for 14 days for buyer protection
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">3</div>
                    <div>
                      <strong>Cash Payout:</strong> You receive 88% of sale price directly to your bank account
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Payment Methods</h3>
                <div className="space-y-3 text-sm">
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <strong className="text-green-600">✓ Direct Bank Transfer</strong>
                    <div className="text-gray-600">ACH transfer to your bank account</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <strong className="text-green-600">✓ PayPal Payout</strong>
                    <div className="text-gray-600">Direct to your PayPal account</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <strong className="text-green-600">✓ Weekly Schedule</strong>
                    <div className="text-gray-600">Payouts processed every Friday</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Important Notes */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-yellow-800 mb-2">⚠️ Important Fee Information</h3>
              <ul className="text-yellow-700 space-y-1 text-sm">
                <li>• <strong>Regular Item Sales:</strong> 12% DropDollar platform fee + $0.20 listing fee</li>
                <li>• <strong>Cash Tournaments:</strong> 15% DropDollar platform fee from prize pools</li>
                <li>• <strong>Entry Fees:</strong> 100% of tournament entry fees go to DropDollar</li>
                <li>• <strong>Seller Payouts:</strong> CASH payments only - no tokens to sellers</li>
                <li>• <strong>Escrow Protection:</strong> 14-day buyer protection period before seller payout</li>
                <li>• <strong>Payment Processing:</strong> Additional payment processing fees may apply</li>
                <li>• <strong>Fee Changes:</strong> DropDollar reserves the right to modify fees with 30 days notice</li>
                <li>• <strong>Transparency:</strong> All fees are clearly disclosed before transactions</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="mt-8 text-center">
          <p className="text-gray-600 mb-4">
            Questions about our fee structure? Contact our seller support team.
          </p>
          <div className="space-x-4">
            <Link
              href="/contact"
              className="inline-block bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
            >
              Contact Support
            </Link>
            <Link
              href="/seller/apply"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
            >
              Continue Application
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">© 2024 DropDollar - Transparent Fee Structure</p>
          <div className="mt-4 flex justify-center space-x-6">
            <Link href="/terms" className="text-gray-400 hover:text-white">Terms & Conditions</Link>
            <Link href="/privacy" className="text-gray-400 hover:text-white">Privacy Policy</Link>
            <Link href="/how-it-works" className="text-gray-400 hover:text-white">How It Works</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
