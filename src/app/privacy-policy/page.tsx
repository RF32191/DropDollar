'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { 
  ShieldCheckIcon,
  EyeIcon,
  UserIcon,
  CogIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  CurrencyDollarIcon,
  DevicePhoneMobileIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';

export default function PrivacyPolicy() {
  const { user } = useAuth();
  const [agreedToDataCollection, setAgreedToDataCollection] = useState(false);
  const [agreedToMarketing, setAgreedToMarketing] = useState(false);
  const [agreedToAnalytics, setAgreedToAnalytics] = useState(false);

  const handlePrivacySubmit = () => {
    if (agreedToDataCollection && agreedToAnalytics) {
      localStorage.setItem('privacyAgreed', 'true');
      localStorage.setItem('privacyAgreedDate', new Date().toISOString());
      localStorage.setItem('marketingConsent', agreedToMarketing.toString());
      alert('Thank you for reviewing our privacy policy. Your preferences have been saved.');
    } else {
      alert('Please agree to essential data collection and analytics to continue.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            <ShieldCheckIcon className="h-10 w-10 inline-block mr-3 text-green-400" />
            Privacy Policy
          </h1>
          <p className="text-gray-300 text-lg">
            DropDollar Gaming Marketplace - Your Privacy Matters
          </p>
          <p className="text-sm text-gray-400 mt-2">
            Last Updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        {/* Privacy Consent */}
        <div className="bg-gray-800/50 rounded-xl p-6 mb-8 border border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
            <CheckCircleIcon className="h-6 w-6 mr-3 text-green-400" />
            Privacy Preferences
          </h2>
          
          <div className="space-y-4">
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedToDataCollection}
                onChange={(e) => setAgreedToDataCollection(e.target.checked)}
                className="mt-1 h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-gray-300">
                <strong className="text-white">Essential Data Collection:</strong> I consent to the collection of account information, 
                game performance data, and transaction records necessary for service operation.
              </span>
            </label>

            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedToAnalytics}
                onChange={(e) => setAgreedToAnalytics(e.target.checked)}
                className="mt-1 h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-gray-300">
                <strong className="text-white">Analytics & Performance:</strong> I consent to the use of analytics data to improve 
                game performance, detect cheating, and enhance user experience.
              </span>
            </label>

            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedToMarketing}
                onChange={(e) => setAgreedToMarketing(e.target.checked)}
                className="mt-1 h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-gray-300">
                <strong className="text-white">Marketing Communications:</strong> I consent to receive promotional emails about 
                new games, tournaments, and special offers (optional).
              </span>
            </label>
          </div>

          <button
            onClick={handlePrivacySubmit}
            disabled={!agreedToDataCollection || !agreedToAnalytics}
            className="mt-6 w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 disabled:cursor-not-allowed"
          >
            {agreedToDataCollection && agreedToAnalytics ? 'Save Privacy Preferences' : 'Please Check Essential Options Above'}
          </button>
        </div>

        {/* Privacy Content */}
        <div className="space-y-8">
          {/* 1. Information We Collect */}
          <section className="bg-gray-800/30 rounded-xl p-6 border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
              <EyeIcon className="h-6 w-6 mr-3 text-blue-400" />
              1. Information We Collect
            </h2>
            <div className="text-gray-300 space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Personal Information</h3>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Name, email address, and username</li>
                  <li>Date of birth (for age verification)</li>
                  <li>Payment information (processed securely by Stripe)</li>
                  <li>Bank account details (for withdrawals, encrypted)</li>
                  <li>Government-issued ID (for account verification)</li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Game Performance Data</h3>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Scores, accuracy rates, and reaction times</li>
                  <li>Game completion times and patterns</li>
                  <li>Competition results and rankings</li>
                  <li>Device and browser information</li>
                  <li>IP address and location data (for compliance)</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Financial Information</h3>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Token purchases and transaction history</li>
                  <li>Entry fees and winnings</li>
                  <li>Withdrawal requests and bank transfers</li>
                  <li>Tax reporting information (if applicable)</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 2. How We Use Information */}
          <section className="bg-gray-800/30 rounded-xl p-6 border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
              <CogIcon className="h-6 w-6 mr-3 text-purple-400" />
              2. How We Use Your Information
            </h2>
            <div className="text-gray-300 space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Service Operation</h3>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Create and manage your account</li>
                  <li>Process payments and withdrawals</li>
                  <li>Facilitate competitions and tournaments</li>
                  <li>Calculate and distribute prizes</li>
                  <li>Provide customer support</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Security & Fair Play</h3>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Detect and prevent cheating or fraud</li>
                  <li>Verify user identity and age</li>
                  <li>Monitor for suspicious activity</li>
                  <li>Enforce terms of service</li>
                  <li>Comply with legal requirements</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Improvement & Analytics</h3>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Analyze game performance and user behavior</li>
                  <li>Improve game mechanics and fairness</li>
                  <li>Develop new features and competitions</li>
                  <li>Optimize matchmaking algorithms</li>
                  <li>Conduct research and analytics</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 3. Information Sharing */}
          <section className="bg-gray-800/30 rounded-xl p-6 border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
              <UserIcon className="h-6 w-6 mr-3 text-green-400" />
              3. Information Sharing & Disclosure
            </h2>
            <div className="text-gray-300 space-y-4">
              <p>
                <strong className="text-white">We do not sell your personal information.</strong> We may share your information only in the following circumstances:
              </p>
              
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Service Providers</h3>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li><strong>Stripe:</strong> Payment processing and fraud prevention</li>
                  <li><strong>Supabase:</strong> Database hosting and security</li>
                  <li><strong>Vercel:</strong> Website hosting and performance</li>
                  <li><strong>Email Services:</strong> Communication and notifications</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Legal Requirements</h3>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Compliance with court orders or legal processes</li>
                  <li>Cooperation with law enforcement investigations</li>
                  <li>Protection of our rights and property</li>
                  <li>Prevention of fraud or illegal activities</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Business Transfers</h3>
                <p>
                  In the event of a merger, acquisition, or sale of assets, your information may be transferred 
                  as part of the transaction, with the same privacy protections.
                </p>
              </div>
            </div>
          </section>

          {/* 4. Data Security */}
          <section className="bg-gray-800/30 rounded-xl p-6 border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
              <ShieldCheckIcon className="h-6 w-6 mr-3 text-yellow-400" />
              4. Data Security & Protection
            </h2>
            <div className="text-gray-300 space-y-4">
              <p>
                We implement industry-standard security measures to protect your information:
              </p>
              
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Technical Safeguards</h3>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>End-to-end encryption for sensitive data</li>
                  <li>Secure socket layer (SSL) for all communications</li>
                  <li>Regular security audits and penetration testing</li>
                  <li>Multi-factor authentication for admin access</li>
                  <li>Automated backup and disaster recovery systems</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Access Controls</h3>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Role-based access to personal information</li>
                  <li>Regular access reviews and audits</li>
                  <li>Employee training on data protection</li>
                  <li>Incident response procedures</li>
                </ul>
              </div>

              <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
                <p className="text-yellow-200">
                  <strong>Important:</strong> While we implement strong security measures, no system is 100% secure. 
                  We cannot guarantee absolute security and recommend using strong, unique passwords.
                </p>
              </div>
            </div>
          </section>

          {/* 5. Your Rights */}
          <section className="bg-gray-800/30 rounded-xl p-6 border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
              <InformationCircleIcon className="h-6 w-6 mr-3 text-blue-400" />
              5. Your Privacy Rights
            </h2>
            <div className="text-gray-300 space-y-4">
              <p>You have the following rights regarding your personal information:</p>
              
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Access & Portability</h3>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Request a copy of your personal data</li>
                  <li>Export your game history and transaction records</li>
                  <li>Access your account information at any time</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Correction & Updates</h3>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Update your profile information</li>
                  <li>Correct inaccurate data</li>
                  <li>Change your communication preferences</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Deletion & Restriction</h3>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Request deletion of your account and data</li>
                  <li>Restrict processing of certain information</li>
                  <li>Object to automated decision-making</li>
                </ul>
              </div>

              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                <p className="text-blue-200">
                  <strong>Note:</strong> Some data may be retained for legal compliance, fraud prevention, 
                  or legitimate business purposes even after account deletion.
                </p>
              </div>
            </div>
          </section>

          {/* 6. Cookies & Tracking */}
          <section className="bg-gray-800/30 rounded-xl p-6 border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
              <GlobeAltIcon className="h-6 w-6 mr-3 text-orange-400" />
              6. Cookies & Tracking Technologies
            </h2>
            <div className="text-gray-300 space-y-4">
              <p>We use cookies and similar technologies to enhance your experience:</p>
              
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Essential Cookies</h3>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Authentication and login status</li>
                  <li>Security and fraud prevention</li>
                  <li>Game state and progress</li>
                  <li>Location verification (for compliance)</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Analytics Cookies</h3>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Game performance analysis</li>
                  <li>User behavior patterns</li>
                  <li>Website performance metrics</li>
                  <li>Error tracking and debugging</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Marketing Cookies</h3>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Personalized advertisements</li>
                  <li>Promotional content</li>
                  <li>Social media integration</li>
                </ul>
              </div>

              <p>
                You can control cookie preferences through your browser settings, 
                but disabling essential cookies may affect service functionality.
              </p>
            </div>
          </section>

          {/* 7. Children's Privacy */}
          <section className="bg-gray-800/30 rounded-xl p-6 border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
              <ExclamationTriangleIcon className="h-6 w-6 mr-3 text-red-400" />
              7. Children's Privacy
            </h2>
            <div className="text-gray-300 space-y-3">
              <p>
                <strong className="text-white">Age Requirement:</strong> DropDollar is not intended for users under 18 years of age. 
                We do not knowingly collect personal information from children under 18.
              </p>
              <p>
                If we discover that we have collected information from a child under 18, 
                we will immediately delete such information and terminate the account.
              </p>
              <p>
                Parents who believe their child has provided information to us should contact us immediately 
                at privacy@drop-dollar.com.
              </p>
            </div>
          </section>

          {/* 8. International Transfers */}
          <section className="bg-gray-800/30 rounded-xl p-6 border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
              <GlobeAltIcon className="h-6 w-6 mr-3 text-purple-400" />
              8. International Data Transfers
            </h2>
            <div className="text-gray-300 space-y-3">
              <p>
                Your information may be transferred to and processed in countries other than your own. 
                We ensure appropriate safeguards are in place for such transfers, including:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Standard contractual clauses approved by relevant authorities</li>
                <li>Adequacy decisions by data protection authorities</li>
                <li>Certification schemes and codes of conduct</li>
                <li>Binding corporate rules for intra-group transfers</li>
              </ul>
            </div>
          </section>

          {/* 9. Changes to Privacy Policy */}
          <section className="bg-gray-800/30 rounded-xl p-6 border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
              <CogIcon className="h-6 w-6 mr-3 text-gray-400" />
              9. Changes to This Privacy Policy
            </h2>
            <div className="text-gray-300 space-y-3">
              <p>
                We may update this Privacy Policy from time to time. We will notify you of material changes by:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Email notification to your registered address</li>
                <li>In-app notifications and banners</li>
                <li>Website announcements</li>
                <li>Updated "Last Modified" date</li>
              </ul>
              <p>
                We encourage you to review this Privacy Policy periodically to stay informed about 
                how we protect your information.
              </p>
            </div>
          </section>

          {/* Contact Information */}
          <section className="bg-gradient-to-r from-green-900/50 to-blue-900/50 rounded-xl p-6 border border-green-500/30">
            <h2 className="text-2xl font-bold text-white mb-4">
              Contact Us About Privacy
            </h2>
            <div className="text-gray-300 space-y-2">
              <p>
                <strong className="text-white">Privacy Officer:</strong> privacy@drop-dollar.com
              </p>
              <p>
                <strong className="text-white">Data Protection Inquiries:</strong> dpo@drop-dollar.com
              </p>
              <p>
                <strong className="text-white">General Support:</strong> support@drop-dollar.com
              </p>
              <p>
                <strong className="text-white">Response Time:</strong> We respond to privacy inquiries within 30 days
              </p>
            </div>
          </section>
        </div>

        {/* Navigation */}
        <div className="mt-8 text-center">
          <Link 
            href="/terms-and-conditions"
            className="text-blue-400 hover:text-blue-300 underline mr-6"
          >
            Terms & Conditions
          </Link>
          <Link 
            href="/"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
