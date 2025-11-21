'use client';

import React, { useState } from 'react';
import { 
  ChevronDownIcon, 
  ChevronUpIcon,
  CheckCircleIcon,
  TruckIcon,
  CurrencyDollarIcon,
  BellIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

export default function SellerProcessGuide() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 rounded-xl border-2 border-blue-500/30 overflow-hidden">
      {/* Header - Always Visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-all"
      >
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <DocumentTextIcon className="w-6 h-6 text-white" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-bold text-white">
              📚 How Selling Works on DropDollar
            </h3>
            <p className="text-sm text-gray-400">
              Complete guide to selling items on our platform
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUpIcon className="w-6 h-6 text-gray-400" />
        ) : (
          <ChevronDownIcon className="w-6 h-6 text-gray-400" />
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-6 pt-0 space-y-6">
          {/* Overview */}
          <div className="bg-black/20 rounded-lg p-4 border border-blue-500/20">
            <h4 className="text-white font-semibold mb-2 flex items-center">
              <span className="text-2xl mr-2">🎯</span>
              Quick Overview
            </h4>
            <p className="text-gray-300 text-sm">
              Sell your items through skill-based gaming competitions. Users play games to win your item,
              and you receive 85% of the prize pool. We handle shipping labels, tracking, and payments automatically.
            </p>
          </div>

          {/* Step-by-Step Process */}
          <div className="space-y-4">
            <h4 className="text-white font-bold text-lg">📋 The Complete Process:</h4>

            {/* Step 1 */}
            <div className="bg-gray-800/50 rounded-lg p-4 border-l-4 border-green-500">
              <div className="flex items-start">
                <div className="bg-green-600 rounded-full p-2 mr-3 flex-shrink-0">
                  <span className="text-white font-bold text-sm">1</span>
                </div>
                <div className="flex-1">
                  <h5 className="text-white font-semibold mb-2">Create Your Listing</h5>
                  <ul className="text-gray-300 text-sm space-y-1 ml-4 list-disc">
                    <li>Upload photos and description of your item</li>
                    <li>Set the base price (minimum prize pool)</li>
                    <li>Choose a game for users to compete in</li>
                    <li>Set maximum participants (default: 100)</li>
                  </ul>
                  <div className="mt-2 p-2 bg-blue-900/30 rounded text-xs text-blue-200">
                    💡 <strong>Tip:</strong> Higher base prices attract more participants and increase your earnings!
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-gray-800/50 rounded-lg p-4 border-l-4 border-blue-500">
              <div className="flex items-start">
                <div className="bg-blue-600 rounded-full p-2 mr-3 flex-shrink-0">
                  <span className="text-white font-bold text-sm">2</span>
                </div>
                <div className="flex-1">
                  <h5 className="text-white font-semibold mb-2">Users Compete to Win</h5>
                  <ul className="text-gray-300 text-sm space-y-1 ml-4 list-disc">
                    <li>Users pay the entry fee (your base price)</li>
                    <li>They play the game you selected</li>
                    <li>Prize pool grows with each participant</li>
                    <li>Timer counts down (24-48 hours typical)</li>
                    <li>Highest score when timer ends wins</li>
                  </ul>
                  <div className="mt-2 p-2 bg-yellow-900/30 rounded text-xs text-yellow-200">
                    ⏰ <strong>Note:</strong> You'll receive notifications when users join and when a winner is determined!
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-gray-800/50 rounded-lg p-4 border-l-4 border-purple-500">
              <div className="flex items-start">
                <div className="bg-purple-600 rounded-full p-2 mr-3 flex-shrink-0">
                  <span className="text-white font-bold text-sm">3</span>
                </div>
                <div className="flex-1">
                  <h5 className="text-white font-semibold mb-2 flex items-center">
                    <BellIcon className="w-4 h-4 mr-2" />
                    Winner Determined - You Get Notified
                  </h5>
                  <div className="bg-gray-900/50 rounded p-3 mb-2">
                    <p className="text-sm text-gray-400 mb-1">You'll receive a message like:</p>
                    <div className="bg-black/30 rounded p-2 text-xs text-gray-300 font-mono">
                      💰 Winner Determined: Your Item Name<br/>
                      🏆 Winner: JohnDoe123<br/>
                      💵 Prize Pool: $150 (you receive 85% = $127.50)<br/>
                      ⏳ WAITING: Winner needs to claim prize and provide address
                    </div>
                  </div>
                  <p className="text-gray-300 text-sm">
                    At this point, your earnings are calculated but <strong>NOT yet in your wallet</strong>.
                    Wait for the winner to provide their shipping address.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="bg-gray-800/50 rounded-lg p-4 border-l-4 border-yellow-500">
              <div className="flex items-start">
                <div className="bg-yellow-600 rounded-full p-2 mr-3 flex-shrink-0">
                  <span className="text-white font-bold text-sm">4</span>
                </div>
                <div className="flex-1">
                  <h5 className="text-white font-semibold mb-2 flex items-center">
                    <CheckCircleIcon className="w-4 h-4 mr-2" />
                    Winner Claims Prize - Address Received
                  </h5>
                  <div className="bg-gray-900/50 rounded p-3 mb-2">
                    <p className="text-sm text-gray-400 mb-1">You'll receive a NEW message with:</p>
                    <div className="bg-black/30 rounded p-2 text-xs text-gray-300 font-mono">
                      📦 Ship Prize - Winner Address Received<br/>
                      <br/>
                      📮 SHIPPING ADDRESS:<br/>
                      John Doe<br/>
                      123 Main Street<br/>
                      New York, NY 10001<br/>
                      Phone: 555-1234<br/>
                      <br/>
                      💰 YOUR EARNINGS: $127.50<br/>
                      ⏳ Currently in PENDING WALLET<br/>
                      <br/>
                      [📝 Submit Tracking / Generate Label] ← BUTTON
                    </div>
                  </div>
                  <div className="mt-2 p-2 bg-orange-900/30 rounded text-xs text-orange-200">
                    💰 <strong>Important:</strong> Your $127.50 is now in your <strong>PENDING WALLET</strong>.
                    You can see it in your dashboard but can't withdraw it yet until you provide tracking!
                  </div>
                </div>
              </div>
            </div>

            {/* Step 5 */}
            <div className="bg-gray-800/50 rounded-lg p-4 border-l-4 border-cyan-500">
              <div className="flex items-start">
                <div className="bg-cyan-600 rounded-full p-2 mr-3 flex-shrink-0">
                  <span className="text-white font-bold text-sm">5</span>
                </div>
                <div className="flex-1">
                  <h5 className="text-white font-semibold mb-2 flex items-center">
                    <TruckIcon className="w-4 h-4 mr-2" />
                    Ship the Item (Two Options)
                  </h5>
                  
                  {/* Option A: Shippo */}
                  <div className="mb-3">
                    <div className="bg-green-900/30 rounded p-3 border border-green-500/30">
                      <p className="text-green-200 font-semibold text-sm mb-2">
                        ⚡ Option A: Generate Label Instantly (Recommended)
                      </p>
                      <ol className="text-gray-300 text-sm space-y-1 ml-4 list-decimal">
                        <li>Click the "Submit Tracking / Generate Label" button in your message</li>
                        <li>Select the "Generate Label" tab</li>
                        <li>Enter package dimensions (weight, length, width, height)</li>
                        <li>Click "Generate Shipping Label"</li>
                        <li>Label generates in ~5 seconds (PDF opens automatically)</li>
                        <li>Print the label and affix to your package</li>
                        <li>Drop off at USPS/UPS/FedEx within 24 hours</li>
                      </ol>
                      <div className="mt-2 p-2 bg-green-950/50 rounded text-xs text-green-200">
                        ✨ <strong>Benefits:</strong> Instant label, cheapest rate automatically selected,
                        tracking submitted automatically, funds released immediately!
                      </div>
                    </div>
                  </div>

                  {/* Option B: Manual */}
                  <div>
                    <div className="bg-gray-900/50 rounded p-3 border border-gray-600/30">
                      <p className="text-gray-200 font-semibold text-sm mb-2">
                        📝 Option B: Ship Manually
                      </p>
                      <ol className="text-gray-300 text-sm space-y-1 ml-4 list-decimal">
                        <li>Package your item securely</li>
                        <li>Take it to your preferred carrier (USPS, UPS, FedEx, etc.)</li>
                        <li>Get a tracking number from the carrier</li>
                        <li>Click "Submit Tracking / Generate Label" button</li>
                        <li>Select the "Manual Entry" tab</li>
                        <li>Enter your tracking number and carrier</li>
                        <li>Submit</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 6 */}
            <div className="bg-gray-800/50 rounded-lg p-4 border-l-4 border-green-500">
              <div className="flex items-start">
                <div className="bg-green-600 rounded-full p-2 mr-3 flex-shrink-0">
                  <span className="text-white font-bold text-sm">6</span>
                </div>
                <div className="flex-1">
                  <h5 className="text-white font-semibold mb-2 flex items-center">
                    <CurrencyDollarIcon className="w-4 h-4 mr-2" />
                    Funds Released - Instant Access!
                  </h5>
                  <div className="bg-green-900/30 rounded p-3 mb-2 border border-green-500/30">
                    <p className="text-green-200 font-semibold text-sm mb-2">
                      ✅ What Happens Automatically:
                    </p>
                    <ul className="text-gray-300 text-sm space-y-1 ml-4 list-disc">
                      <li>Your $127.50 moves from <strong>PENDING</strong> to <strong>RELEASED</strong> wallet</li>
                      <li>Winner receives tracking notification with tracking URL</li>
                      <li>Platform admin receives confirmation</li>
                      <li>You can now withdraw to your bank account via Stripe!</li>
                    </ul>
                  </div>
                  <div className="mt-2 p-2 bg-blue-900/30 rounded text-xs text-blue-200">
                    💸 <strong>Withdraw:</strong> Go to Dashboard → Seller → Withdraw Funds to transfer
                    money from your Released Wallet to your bank account!
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Wallet Breakdown */}
          <div className="bg-gradient-to-r from-yellow-900/20 to-green-900/20 rounded-lg p-4 border border-yellow-500/30">
            <h4 className="text-white font-bold mb-3 flex items-center">
              <CurrencyDollarIcon className="w-5 h-5 mr-2" />
              💼 Understanding Your Dual Wallet
            </h4>
            <div className="grid md:grid-cols-2 gap-4">
              {/* Pending Wallet */}
              <div className="bg-yellow-900/30 rounded-lg p-3 border border-yellow-600">
                <h5 className="text-yellow-200 font-semibold text-sm mb-2">
                  ⏳ PENDING WALLET
                </h5>
                <p className="text-gray-300 text-xs mb-2">
                  Money waiting for you to ship the item and provide tracking.
                </p>
                <ul className="text-gray-400 text-xs space-y-1 list-disc ml-4">
                  <li>Shown in dashboard</li>
                  <li>Can't withdraw yet</li>
                  <li>Awaiting tracking submission</li>
                  <li>Protected by our escrow system</li>
                </ul>
              </div>

              {/* Released Wallet */}
              <div className="bg-green-900/30 rounded-lg p-3 border border-green-600">
                <h5 className="text-green-200 font-semibold text-sm mb-2">
                  ✅ RELEASED WALLET
                </h5>
                <p className="text-gray-300 text-xs mb-2">
                  Money ready for withdrawal to your bank account!
                </p>
                <ul className="text-gray-400 text-xs space-y-1 list-disc ml-4">
                  <li>Available immediately after tracking</li>
                  <li>Can withdraw via Stripe</li>
                  <li>Transfers to bank in 1-2 business days</li>
                  <li>Track total earnings history</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Payment Breakdown */}
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h4 className="text-white font-bold mb-3">💰 Payment Breakdown Example</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center p-2 bg-blue-900/20 rounded">
                <span className="text-gray-300">Prize Pool (50 users × $3.00)</span>
                <span className="text-white font-mono">$150.00</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-red-900/20 rounded">
                <span className="text-gray-300">Platform Fee (15%)</span>
                <span className="text-red-300 font-mono">-$22.50</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-900/20 rounded">
                <span className="text-gray-300">Estimated Shipping</span>
                <span className="text-gray-400 font-mono">~$15.00</span>
              </div>
              <div className="h-px bg-gray-600 my-2"></div>
              <div className="flex justify-between items-center p-3 bg-green-900/30 rounded-lg border-2 border-green-500">
                <span className="text-white font-semibold">YOU RECEIVE (85%)</span>
                <span className="text-green-400 font-bold text-lg font-mono">$127.50</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              * If actual shipping cost differs from $15, you keep the difference or pay the difference
            </p>
          </div>

          {/* Important Notes */}
          <div className="bg-red-900/20 rounded-lg p-4 border border-red-500/30">
            <h4 className="text-red-200 font-bold mb-2 flex items-center">
              <span className="text-2xl mr-2">⚠️</span>
              Important Rules
            </h4>
            <ul className="text-gray-300 text-sm space-y-2 list-disc ml-6">
              <li>You MUST provide tracking within 72 hours of receiving the address</li>
              <li>Failure to ship may result in account suspension</li>
              <li>Package items securely - you're responsible for damage during shipping</li>
              <li>If using Shippo labels, drop off within 24 hours of generation</li>
              <li>Respond to winner messages promptly for good seller ratings</li>
              <li>Platform fee (15%) is non-negotiable and automatic</li>
            </ul>
          </div>

          {/* Quick Tips */}
          <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-500/30">
            <h4 className="text-blue-200 font-bold mb-2 flex items-center">
              <span className="text-2xl mr-2">💡</span>
              Pro Tips for Sellers
            </h4>
            <ul className="text-gray-300 text-sm space-y-2 list-disc ml-6">
              <li><strong>Use Shippo:</strong> Fastest way to ship - instant labels, automatic tracking</li>
              <li><strong>Set Realistic Prices:</strong> Higher prices = more participants = more earnings</li>
              <li><strong>Quality Photos:</strong> Better photos attract more participants</li>
              <li><strong>Ship Fast:</strong> Quick shipping leads to better ratings and repeat customers</li>
              <li><strong>Track Everything:</strong> Always use trackable shipping methods</li>
              <li><strong>Communicate:</strong> Respond to messages - it builds trust</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

