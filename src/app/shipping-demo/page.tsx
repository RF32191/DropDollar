'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  TruckIcon, 
  TrophyIcon,
  CurrencyDollarIcon,
  UserIcon,
  BuildingStorefrontIcon
} from '@heroicons/react/24/outline';
import WinnerDashboard from '@/components/shipping/WinnerDashboard';
import SellerFulfillmentDashboard from '@/components/shipping/SellerFulfillmentDashboard';

export default function ShippingDemoPage() {
  const [activeView, setActiveView] = useState<'overview' | 'winner' | 'seller'>('overview');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <div className="w-10 h-10 mr-3">
                <img
                  src="/DropCoin.png"
                  alt="DropDollar Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-xl font-bold text-gray-900">DropDollar</span>
            </Link>
            <nav className="flex items-center space-x-6">
              <Link href="/listings" className="text-gray-700 hover:text-green-600 font-medium">Browse</Link>
              <Link href="/hot-sell" className="text-red-600 hover:text-red-700 font-bold">🔥 Hot Sell</Link>
              <Link href="/how-it-works" className="text-gray-700 hover:text-green-600 font-medium">How It Works</Link>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {activeView === 'overview' && (
          <>
            {/* Demo Overview */}
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                📦 Shipping & Fulfillment System Demo
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Complete Etsy-like shipping system with winner address collection, seller verification, 
                and automated label generation with UPS/FedEx integration.
              </p>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                <TrophyIcon className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-4">Winner Experience</h3>
                <ul className="text-gray-600 text-sm space-y-2 mb-6">
                  <li>• Automatic address collection</li>
                  <li>• Cash prizes to wallet (15% fee)</li>
                  <li>• Real-time shipping tracking</li>
                  <li>• Prize history dashboard</li>
                </ul>
                <button
                  onClick={() => setActiveView('winner')}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                >
                  View Winner Dashboard
                </button>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                <BuildingStorefrontIcon className="h-16 w-16 text-blue-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-4">Seller Experience</h3>
                <ul className="text-gray-600 text-sm space-y-2 mb-6">
                  <li>• Winner verification system</li>
                  <li>• Automated label generation</li>
                  <li>• UPS/FedEx rate calculation</li>
                  <li>• 3% platform shipping fee</li>
                </ul>
                <button
                  onClick={() => setActiveView('seller')}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                >
                  View Seller Dashboard
                </button>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                <TruckIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-4">Platform Features</h3>
                <ul className="text-gray-600 text-sm space-y-2 mb-6">
                  <li>• Etsy-like label generation</li>
                  <li>• UPS & FedEx integration</li>
                  <li>• Automatic tracking updates</li>
                  <li>• Revenue from shipping fees</li>
                </ul>
                <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg text-sm font-medium">
                  3% Platform Fee on All Shipping
                </div>
              </div>
            </div>

            {/* System Flow */}
            <div className="bg-white rounded-2xl shadow-lg p-8 mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">🔄 Complete Fulfillment Flow</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold mx-auto mb-3">1</div>
                  <h4 className="font-bold text-gray-900 mb-2">User Wins</h4>
                  <p className="text-gray-600 text-sm">Winner determined by highest game score</p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold mx-auto mb-3">2</div>
                  <h4 className="font-bold text-gray-900 mb-2">Address Collection</h4>
                  <p className="text-gray-600 text-sm">Winner submits shipping address</p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold mx-auto mb-3">3</div>
                  <h4 className="font-bold text-gray-900 mb-2">Seller Verification</h4>
                  <p className="text-gray-600 text-sm">Seller verifies winner and address</p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-bold mx-auto mb-3">4</div>
                  <h4 className="font-bold text-gray-900 mb-2">Label Generation</h4>
                  <p className="text-gray-600 text-sm">Automated UPS/FedEx label creation</p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center text-white font-bold mx-auto mb-3">5</div>
                  <h4 className="font-bold text-gray-900 mb-2">Shipping & Tracking</h4>
                  <p className="text-gray-600 text-sm">Package shipped with tracking</p>
                </div>
              </div>
            </div>

            {/* Revenue Model */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl p-8 border-2 border-green-200">
              <div className="text-center mb-6">
                <CurrencyDollarIcon className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-4">💰 Revenue Model</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-6 bg-white rounded-xl">
                  <div className="text-3xl font-bold text-green-600 mb-2">3%</div>
                  <div className="font-bold text-gray-900 mb-2">Shipping Fee</div>
                  <div className="text-gray-600 text-sm">Platform fee on all shipping costs</div>
                </div>
                
                <div className="text-center p-6 bg-white rounded-xl">
                  <div className="text-3xl font-bold text-blue-600 mb-2">15%</div>
                  <div className="font-bold text-gray-900 mb-2">Cash Prize Fee</div>
                  <div className="text-gray-600 text-sm">Deducted from tournament winnings</div>
                </div>
                
                <div className="text-center p-6 bg-white rounded-xl">
                  <div className="text-3xl font-bold text-purple-600 mb-2">12%</div>
                  <div className="font-bold text-gray-900 mb-2">Item Sale Fee</div>
                  <div className="text-gray-600 text-sm">Commission on physical item sales</div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeView === 'winner' && (
          <div>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Winner Dashboard Demo</h1>
                <p className="text-gray-600">Experience the winner's journey from prize to delivery</p>
              </div>
              <button
                onClick={() => setActiveView('overview')}
                className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              >
                ← Back to Overview
              </button>
            </div>
            <WinnerDashboard winnerId="winner_001" winnerUsername="GameMaster2024" />
          </div>
        )}

        {activeView === 'seller' && (
          <div>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Seller Dashboard Demo</h1>
                <p className="text-gray-600">Manage fulfillment like Etsy with automated shipping labels</p>
              </div>
              <button
                onClick={() => setActiveView('overview')}
                className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              >
                ← Back to Overview
              </button>
            </div>
            <SellerFulfillmentDashboard sellerId="seller_001" sellerName="TechGear Pro" />
          </div>
        )}
      </div>
    </div>
  );
}
