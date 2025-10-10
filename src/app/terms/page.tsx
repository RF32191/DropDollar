'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  DocumentTextIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CurrencyDollarIcon,
  TrophyIcon,
  UserIcon,
  CogIcon
} from '@heroicons/react/24/outline';

export default function TermsAndConditionsPage() {
  const [activeSection, setActiveSection] = useState('overview');

  const sections = [
    { id: 'overview', title: 'Overview', icon: DocumentTextIcon },
    { id: 'platform', title: 'Platform Services', icon: CogIcon },
    { id: 'games', title: 'Gaming & Competitions', icon: TrophyIcon },
    { id: 'payments', title: 'Payments & Fees', icon: CurrencyDollarIcon },
    { id: 'user-accounts', title: 'User Accounts', icon: UserIcon },
    { id: 'privacy', title: 'Privacy & Data', icon: ShieldCheckIcon },
    { id: 'liability', title: 'Liability & Disclaimers', icon: ExclamationTriangleIcon },
    { id: 'governance', title: 'Terms Governance', icon: InformationCircleIcon }
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white mb-6">Terms of Service Overview</h2>
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <p className="text-gray-300 text-lg leading-relaxed mb-4">
                Welcome to DropDollar, the professional gaming marketplace where skill-based competitions meet real rewards. 
                These Terms of Service govern your use of our platform and services.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="text-xl font-bold text-white mb-2">🎮 Gaming Platform</h3>
                  <p className="text-gray-300 text-sm">Skill-based competitions with real money prizes and transparent gameplay.</p>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="text-xl font-bold text-white mb-2">💰 Token System</h3>
                  <p className="text-gray-300 text-sm">Secure token-based economy with multiple payment methods.</p>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="text-xl font-bold text-white mb-2">🏆 Tournaments</h3>
                  <p className="text-gray-300 text-sm">Regular tournaments with guaranteed prize pools and fair competition.</p>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="text-xl font-bold text-white mb-2">💧 DropAFund</h3>
                  <p className="text-gray-300 text-sm">Community-funded campaigns with only 6% platform fee.</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'platform':
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white mb-6">Platform Services</h2>
            
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-2xl font-bold text-white mb-4">Core Services</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-semibold text-blue-400 mb-2">Skill-Based Gaming</h4>
                  <p className="text-gray-300">Multi-Target Reaction, Falling Object Catch, Color Sequence Memory, Laser Dodge EXTREME, Quick Click, and Sword Parry games.</p>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-green-400 mb-2">Marketplace Listings</h4>
                  <p className="text-gray-300">Browse and participate in skill-based competitions across 12+ categories including Electronics, Fashion, Automotive, and more.</p>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-purple-400 mb-2">Tournament System</h4>
                  <p className="text-gray-300">Regular tournaments with guaranteed prize pools ranging from $1 to $25,000 with 15% platform fee.</p>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-red-400 mb-2">DropAFund Campaigns</h4>
                  <p className="text-gray-300">Community-funded competitions with multiple winners and only 6% platform fee.</p>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-yellow-400 mb-2">Hot Sell Auctions</h4>
                  <p className="text-gray-300">Time-limited auctions with dynamic pricing and skill-based participation.</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-2xl font-bold text-white mb-4">Location-Based Access</h3>
              <p className="text-gray-300 mb-4">
                DropDollar uses location verification to ensure compliance with local gaming regulations. 
                Users must enable location services to participate in skill-based competitions.
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2">
                <li>Location verification required for all gaming activities</li>
                <li>12-hour re-verification cycle for continued access</li>
                <li>State-specific gaming compliance checks</li>
                <li>Automatic access restriction for non-compliant regions</li>
              </ul>
            </div>
          </div>
        );

      case 'games':
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white mb-6">Gaming & Competitions</h2>
            
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-2xl font-bold text-white mb-4">Available Games</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-700 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-white mb-2">🎯 Multi-Target Reaction</h4>
                  <p className="text-gray-300 text-sm">Test reaction speed and accuracy by hitting multiple targets.</p>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-white mb-2">💰 Falling Object Catch</h4>
                  <p className="text-gray-300 text-sm">Catch falling objects while avoiding bombs.</p>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-white mb-2">🌈 Color Sequence Memory</h4>
                  <p className="text-gray-300 text-sm">Memorize and repeat increasingly complex color sequences.</p>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-white mb-2">🔥 Laser Dodge EXTREME</h4>
                  <p className="text-gray-300 text-sm">Dodge incoming lasers in fast-paced arena combat.</p>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-white mb-2">⚡ Quick Click</h4>
                  <p className="text-gray-300 text-sm">Click targets as many times as possible within time limit.</p>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-white mb-2">⚔️ Sword Parry</h4>
                  <p className="text-gray-300 text-sm">Parry incoming attacks with perfect timing.</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-2xl font-bold text-white mb-4">Competition Types</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-semibold text-green-400 mb-2">Practice Mode</h4>
                  <p className="text-gray-300">Free practice games with 10-second ads before gameplay. No entry fees or prizes.</p>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-blue-400 mb-2">Tournament Mode</h4>
                  <p className="text-gray-300">Paid competitions with guaranteed prize pools. Entry fees range from $1 to $25,000.</p>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-purple-400 mb-2">Listing Competitions</h4>
                  <p className="text-gray-300">Skill-based competitions for marketplace listings with variable entry costs.</p>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-red-400 mb-2">DropAFund Campaigns</h4>
                  <p className="text-gray-300">Community-funded competitions with multiple winners and flexible reward structures.</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-2xl font-bold text-white mb-4">Fair Play & Anti-Cheat</h3>
              <ul className="list-disc list-inside text-gray-300 space-y-2">
                <li>All games are skill-based with transparent scoring algorithms</li>
                <li>Real-time score validation and anti-cheat detection</li>
                <li>Session recording for dispute resolution</li>
                <li>Randomized game elements to prevent pattern exploitation</li>
                <li>Regular algorithm updates to maintain fairness</li>
              </ul>
            </div>
          </div>
        );

      case 'payments':
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white mb-6">Payments & Fees</h2>
            
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-2xl font-bold text-white mb-4">Platform Fees</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-700 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-red-400 mb-2">Regular Tournaments</h4>
                  <p className="text-2xl font-bold text-white mb-2">15% Platform Fee</p>
                  <p className="text-gray-300 text-sm">Applied to tournament entry fees. Winners receive 85% of prize pool.</p>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-green-400 mb-2">DropAFund Campaigns</h4>
                  <p className="text-2xl font-bold text-white mb-2">6% Platform Fee</p>
                  <p className="text-gray-300 text-sm">Reduced fee for community-funded competitions. Winners receive 94% of prize pool.</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-2xl font-bold text-white mb-4">Payment Methods</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-semibold text-blue-400 mb-2">Stripe Integration</h4>
                  <p className="text-gray-300">Secure credit/debit card processing with PCI compliance.</p>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-yellow-400 mb-2">Cryptocurrency</h4>
                  <p className="text-gray-300">Bitcoin and Ethereum payments through secure wallet integration.</p>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-green-400 mb-2">Token System</h4>
                  <p className="text-gray-300">Pre-purchased tokens for seamless competition entry.</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-2xl font-bold text-white mb-4">Payouts & Withdrawals</h3>
              <ul className="list-disc list-inside text-gray-300 space-y-2">
                <li>Automatic prize distribution to winners within 24 hours</li>
                <li>Minimum withdrawal amount: $10</li>
                <li>Withdrawal processing time: 1-3 business days</li>
                <li>All payouts subject to platform fees and processing costs</li>
                <li>Tax reporting provided for winnings over $600 annually</li>
              </ul>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-2xl font-bold text-white mb-4">Refund Policy</h3>
              <ul className="list-disc list-inside text-gray-300 space-y-2">
                <li>Entry fees are non-refundable once competition begins</li>
                <li>Technical issues resulting in unfair gameplay may qualify for refunds</li>
                <li>Refund requests must be submitted within 24 hours of competition end</li>
                <li>All refunds subject to platform investigation and approval</li>
              </ul>
            </div>
          </div>
        );

      case 'user-accounts':
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white mb-6">User Accounts</h2>
            
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-2xl font-bold text-white mb-4">Account Creation</h3>
              <ul className="list-disc list-inside text-gray-300 space-y-2">
                <li>Users must be 18+ years old to create an account</li>
                <li>Valid email address required for account verification</li>
                <li>Username must be unique and appropriate</li>
                <li>Strong password requirements enforced</li>
                <li>Account verification required before participating in paid competitions</li>
              </ul>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-2xl font-bold text-white mb-4">Account Responsibilities</h3>
              <ul className="list-disc list-inside text-gray-300 space-y-2">
                <li>Users are responsible for maintaining account security</li>
                <li>One account per person - multiple accounts prohibited</li>
                <li>Account sharing or transfer is not allowed</li>
                <li>Users must provide accurate personal information</li>
                <li>Immediate notification required for security breaches</li>
              </ul>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-2xl font-bold text-white mb-4">Account Suspension & Termination</h3>
              <p className="text-gray-300 mb-4">DropDollar reserves the right to suspend or terminate accounts for:</p>
              <ul className="list-disc list-inside text-gray-300 space-y-2">
                <li>Violation of Terms of Service</li>
                <li>Cheating or unfair gameplay practices</li>
                <li>Fraudulent payment activities</li>
                <li>Harassment or inappropriate behavior</li>
                <li>Technical manipulation or exploitation</li>
                <li>Multiple account creation</li>
              </ul>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-2xl font-bold text-white mb-4">User Profiles & Dashboard</h3>
              <p className="text-gray-300 mb-4">All users have access to:</p>
              <ul className="list-disc list-inside text-gray-300 space-y-2">
                <li>Personal gaming statistics and achievements</li>
                <li>Transaction history and payout records</li>
                <li>Victory story submission and testimonials</li>
                <li>Account settings and privacy controls</li>
                <li>Support ticket system</li>
              </ul>
            </div>
          </div>
        );

      case 'privacy':
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white mb-6">Privacy & Data Protection</h2>
            
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-2xl font-bold text-white mb-4">Data Collection</h3>
              <p className="text-gray-300 mb-4">DropDollar collects the following information:</p>
              <ul className="list-disc list-inside text-gray-300 space-y-2">
                <li>Account information (email, username, profile data)</li>
                <li>Gaming performance data and scores</li>
                <li>Transaction and payment information</li>
                <li>Location data for compliance verification</li>
                <li>Device information and browser data</li>
                <li>Communication records and support interactions</li>
              </ul>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-2xl font-bold text-white mb-4">Data Usage</h3>
              <p className="text-gray-300 mb-4">Collected data is used for:</p>
              <ul className="list-disc list-inside text-gray-300 space-y-2">
                <li>Platform operation and service delivery</li>
                <li>Competition scoring and fair play enforcement</li>
                <li>Payment processing and fraud prevention</li>
                <li>Legal compliance and regulatory requirements</li>
                <li>Customer support and service improvement</li>
                <li>Marketing communications (with consent)</li>
              </ul>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-2xl font-bold text-white mb-4">Data Security</h3>
              <ul className="list-disc list-inside text-gray-300 space-y-2">
                <li>All data encrypted in transit and at rest</li>
                <li>PCI DSS compliant payment processing</li>
                <li>Regular security audits and penetration testing</li>
                <li>Access controls and authentication protocols</li>
                <li>Data backup and disaster recovery procedures</li>
                <li>Incident response and breach notification protocols</li>
              </ul>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-2xl font-bold text-white mb-4">User Rights</h3>
              <ul className="list-disc list-inside text-gray-300 space-y-2">
                <li>Right to access personal data</li>
                <li>Right to correct inaccurate information</li>
                <li>Right to delete account and associated data</li>
                <li>Right to data portability</li>
                <li>Right to opt-out of marketing communications</li>
                <li>Right to file complaints with regulatory authorities</li>
              </ul>
            </div>
          </div>
        );

      case 'liability':
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white mb-6">Liability & Disclaimers</h2>
            
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-2xl font-bold text-white mb-4">Service Availability</h3>
              <ul className="list-disc list-inside text-gray-300 space-y-2">
                <li>DropDollar provides services "as is" without warranties</li>
                <li>Platform availability not guaranteed 100% uptime</li>
                <li>Maintenance windows may temporarily interrupt service</li>
                <li>Users responsible for backup of important data</li>
                <li>Technical issues may affect gameplay fairness</li>
              </ul>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-2xl font-bold text-white mb-4">Gaming Disclaimers</h3>
              <ul className="list-disc list-inside text-gray-300 space-y-2">
                <li>All games are skill-based competitions</li>
                <li>No gambling or chance-based elements</li>
                <li>Winners determined by objective performance metrics</li>
                <li>Users participate at their own risk</li>
                <li>Past performance does not guarantee future results</li>
              </ul>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-2xl font-bold text-white mb-4">Limitation of Liability</h3>
              <p className="text-gray-300 mb-4">DropDollar's liability is limited to:</p>
              <ul className="list-disc list-inside text-gray-300 space-y-2">
                <li>Direct damages not exceeding total fees paid by user</li>
                <li>Exclusion of indirect, consequential, or punitive damages</li>
                <li>No liability for third-party services or integrations</li>
                <li>Force majeure events beyond platform control</li>
                <li>User's sole remedy is refund of entry fees</li>
              </ul>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-2xl font-bold text-white mb-4">Indemnification</h3>
              <p className="text-gray-300 mb-4">Users agree to indemnify DropDollar against:</p>
              <ul className="list-disc list-inside text-gray-300 space-y-2">
                <li>Claims arising from user's violation of terms</li>
                <li>Claims related to user's gaming activities</li>
                <li>Claims from third parties due to user's actions</li>
                <li>Legal costs and attorney fees</li>
                <li>Damages resulting from user's misconduct</li>
              </ul>
            </div>
          </div>
        );

      case 'governance':
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white mb-6">Terms Governance</h2>
            
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-2xl font-bold text-white mb-4">Governing Law</h3>
              <ul className="list-disc list-inside text-gray-300 space-y-2">
                <li>Terms governed by laws of Delaware, United States</li>
                <li>Disputes resolved through binding arbitration</li>
                <li>Class action waivers apply to all users</li>
                <li>Jurisdiction in Delaware state courts</li>
                <li>International users subject to US law</li>
              </ul>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-2xl font-bold text-white mb-4">Dispute Resolution</h3>
              <ul className="list-disc list-inside text-gray-300 space-y-2">
                <li>Mandatory arbitration for all disputes</li>
                <li>Arbitration conducted by American Arbitration Association</li>
                <li>Individual claims only - no class actions</li>
                <li>Arbitration costs shared between parties</li>
                <li>Arbitration award binding and final</li>
              </ul>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-2xl font-bold text-white mb-4">Terms Updates</h3>
              <ul className="list-disc list-inside text-gray-300 space-y-2">
                <li>Terms may be updated at any time</li>
                <li>Users notified of material changes via email</li>
                <li>Continued use constitutes acceptance of new terms</li>
                <li>Previous versions archived for reference</li>
                <li>Users may terminate account if disagree with changes</li>
              </ul>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-2xl font-bold text-white mb-4">Contact Information</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-semibold text-blue-400 mb-2">Legal Inquiries</h4>
                  <p className="text-gray-300">legal@drop-dollar.com</p>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-green-400 mb-2">Support</h4>
                  <p className="text-gray-300">support@drop-dollar.com</p>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-purple-400 mb-2">Business</h4>
                  <p className="text-gray-300">business@drop-dollar.com</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-2xl font-bold text-white mb-4">Effective Date</h3>
              <p className="text-gray-300 text-lg">
                These Terms of Service are effective as of January 1, 2025, and apply to all users of the DropDollar platform.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 via-purple-500 to-indigo-500 shadow-2xl border-b-4 border-blue-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-4 group">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 via-purple-500 to-indigo-500 rounded-full flex items-center justify-center overflow-hidden shadow-lg group-hover:shadow-2xl transition-all duration-300 group-hover:scale-110">
                <img 
                  src="/DropCoin.png" 
                  alt="DropDollar Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-3xl font-extrabold text-white drop-shadow-lg">DropDollar</span>
                <span className="text-sm text-blue-200 font-bold tracking-wider animate-pulse">
                  ⚡ TERMS & CONDITIONS ⚡
                </span>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="flex items-center space-x-8">
              <Link href="/dashboard" className="text-white hover:text-blue-300 font-bold text-lg transition-all duration-300 hover:scale-105">📊 Dashboard</Link>
              <Link href="/games" className="text-white hover:text-blue-300 font-bold text-lg transition-all duration-300 hover:scale-105">🎮 Games</Link>
              <Link href="/tournaments" className="text-white hover:text-blue-300 font-bold text-lg transition-all duration-300 hover:scale-105">🏆 Tournaments</Link>
              <Link href="/hot-sell" className="text-white hover:text-blue-300 font-bold text-lg transition-all duration-300 hover:scale-105">🔥 Hot Sell</Link>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Page Title */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-extrabold mb-6">
            <span className="bg-gradient-to-r from-blue-400 via-purple-500 to-indigo-500 bg-clip-text text-transparent animate-pulse">
              📋 Terms & Conditions
            </span>
          </h1>
          <div className="w-32 h-1 bg-gradient-to-r from-blue-400 to-indigo-500 mx-auto rounded-full animate-pulse mb-6"></div>
          <p className="text-xl text-transparent bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text animate-pulse">
            Comprehensive terms covering all DropDollar platform services and user responsibilities
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 sticky top-8">
              <h3 className="text-xl font-bold text-white mb-6">Sections</h3>
              <nav className="space-y-2">
                {sections.map((section) => {
                  const IconComponent = section.icon;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 flex items-center space-x-3 ${
                        activeSection === section.id
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      }`}
                    >
                      <IconComponent className="h-5 w-5" />
                      <span className="font-medium">{section.title}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-gray-800 rounded-xl p-8 border border-gray-700 min-h-[600px]">
              {renderContent()}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center">
          <div className="bg-gray-800 rounded-xl p-8 border border-gray-700">
            <h3 className="text-2xl font-bold text-white mb-4">Questions About Our Terms?</h3>
            <p className="text-gray-300 mb-6">
              If you have any questions about these Terms of Service, please contact our legal team.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/contact"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300"
              >
                Contact Support
              </Link>
              <Link
                href="/faq"
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300"
              >
                View FAQ
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
