'use client';

import React from 'react';
import Link from 'next/link';
import SellerListingDashboard from '@/components/seller/SellerListingDashboard';

export default function SellerDemoPage() {
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
                  alt="Dollar Drop Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-xl font-bold text-gray-900">Dollar Drop</span>
            </Link>
            <nav className="flex items-center space-x-6">
              <Link href="/listings" className="text-gray-700 hover:text-green-600 font-medium">Browse</Link>
              <Link href="/hot-sell" className="text-red-600 hover:text-red-700 font-bold">🔥 Hot Sell</Link>
              <Link href="/shipping-demo" className="text-blue-600 hover:text-blue-700 font-bold">📦 Shipping</Link>
              <Link href="/how-it-works" className="text-gray-700 hover:text-green-600 font-medium">How It Works</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Demo Banner */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="font-medium">
            🎯 <strong>Seller Dashboard Demo</strong> - Experience the complete Etsy-like listing creation and management system
          </p>
        </div>
      </div>

      {/* Seller Dashboard */}
      <SellerListingDashboard 
        sellerId="seller_001" 
        sellerName="TechGear Pro" 
      />
    </div>
  );
}
