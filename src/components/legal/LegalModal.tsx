'use client';

import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import SellerAgreement from './SellerAgreement';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'terms' | 'privacy' | 'seller';
}

export default function LegalModal({ isOpen, onClose, type }: LegalModalProps) {
  if (!isOpen) return null;

  const getContent = () => {
    switch (type) {
      case 'seller':
        return <SellerAgreement />;
      case 'terms':
        return <TermsOfService />;
      case 'privacy':
        return <PrivacyPolicy />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/75 transition-opacity"
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className="relative w-full max-w-4xl max-h-[90vh] bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-6 flex items-center justify-between z-10">
            <h2 className="text-2xl font-bold text-white">
              {type === 'seller' && 'Seller Agreement'}
              {type === 'terms' && 'Terms of Service'}
              {type === 'privacy' && 'Privacy Policy'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          
          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-88px)]">
            {getContent()}
          </div>
          
          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-800 border-t border-gray-700 p-6">
            <button
              onClick={onClose}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TermsOfService() {
  return (
    <div className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold text-white mb-6">Terms of Service</h1>
      
      <p className="text-gray-300 mb-4">
        <strong>Last Updated:</strong> November 15, 2024
      </p>
      
      <section className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-3">1. Acceptance of Terms</h2>
        <p className="text-gray-300">
          By accessing or using DropDollar, you agree to be bound by these Terms of Service. 
          If you do not agree, please do not use our platform.
        </p>
      </section>
      
      <section className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-3">2. User Accounts</h2>
        <ul className="list-disc pl-6 text-gray-300 space-y-2">
          <li>You must be 18 years or older to create an account</li>
          <li>Provide accurate, current information</li>
          <li>Maintain security of your password</li>
          <li>You are responsible for all activities under your account</li>
        </ul>
      </section>
      
      <section className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-3">3. Platform Use</h2>
        <p className="text-gray-300 mb-3">You agree to:</p>
        <ul className="list-disc pl-6 text-gray-300 space-y-2">
          <li>Use the platform lawfully and ethically</li>
          <li>Not engage in fraudulent activities</li>
          <li>Not manipulate or cheat in games</li>
          <li>Not harass other users</li>
          <li>Not upload malicious content</li>
        </ul>
      </section>
      
      <section className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-3">4. Tokens and Transactions</h2>
        <ul className="list-disc pl-6 text-gray-300 space-y-2">
          <li>Tokens have no cash value outside the platform</li>
          <li>All transactions are final unless otherwise stated</li>
          <li>We reserve the right to investigate suspicious transactions</li>
          <li>Fraudulent activity may result in account termination</li>
        </ul>
      </section>
      
      <section className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-3">5. Marketplace</h2>
        <ul className="list-disc pl-6 text-gray-300 space-y-2">
          <li>DropDollar is a marketplace platform connecting buyers and sellers</li>
          <li>We are not party to transactions between users</li>
          <li>Disputes should be resolved between buyer and seller</li>
          <li>We may assist in dispute resolution at our discretion</li>
        </ul>
      </section>
      
      <section className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-3">6. Intellectual Property</h2>
        <p className="text-gray-300">
          All content, trademarks, and intellectual property on DropDollar belong to us or our licensors. 
          You may not use our intellectual property without permission.
        </p>
      </section>
      
      <section className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-3">7. Termination</h2>
        <p className="text-gray-300">
          We may suspend or terminate your account for violations of these Terms. 
          You may close your account at any time.
        </p>
      </section>
      
      <section className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-3">8. Disclaimer</h2>
        <p className="text-gray-300">
          THE PLATFORM IS PROVIDED "AS IS" WITHOUT WARRANTIES. WE DISCLAIM ALL WARRANTIES, 
          EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.
        </p>
      </section>
      
      <section className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-3">9. Limitation of Liability</h2>
        <p className="text-gray-300">
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, DROPDOLLAR SHALL NOT BE LIABLE FOR ANY 
          INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES.
        </p>
      </section>
      
      <section className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-3">10. Contact</h2>
        <p className="text-gray-300">
          Questions? Contact us at: <a href="mailto:legal@dropdollar.com" className="text-blue-400 hover:text-blue-300">legal@dropdollar.com</a>
        </p>
      </section>
    </div>
  );
}

function PrivacyPolicy() {
  return (
    <div className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold text-white mb-6">Privacy Policy</h1>
      
      <p className="text-gray-300 mb-4">
        <strong>Last Updated:</strong> November 15, 2024
      </p>
      
      <section className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-3">1. Information We Collect</h2>
        <ul className="list-disc pl-6 text-gray-300 space-y-2">
          <li><strong>Account Information:</strong> Email, username, password</li>
          <li><strong>Profile Information:</strong> Display name, avatar, preferences</li>
          <li><strong>Seller Information:</strong> Business details, tax ID, bank information</li>
          <li><strong>Transaction Data:</strong> Purchase history, game results, token balance</li>
          <li><strong>Location Data:</strong> IP address, geographic location for compliance</li>
          <li><strong>Usage Data:</strong> Pages visited, features used, session duration</li>
        </ul>
      </section>
      
      <section className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-3">2. How We Use Your Information</h2>
        <ul className="list-disc pl-6 text-gray-300 space-y-2">
          <li>Provide and improve our services</li>
          <li>Process transactions and payouts</li>
          <li>Verify compliance with gaming regulations</li>
          <li>Prevent fraud and abuse</li>
          <li>Communicate with you about your account</li>
          <li>Send promotional emails (opt-out available)</li>
        </ul>
      </section>
      
      <section className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-3">3. Information Sharing</h2>
        <p className="text-gray-300 mb-3">We may share your information with:</p>
        <ul className="list-disc pl-6 text-gray-300 space-y-2">
          <li><strong>Service Providers:</strong> Payment processors, hosting services</li>
          <li><strong>Legal Requirements:</strong> When required by law or to protect rights</li>
          <li><strong>Business Transfers:</strong> In case of merger or acquisition</li>
        </ul>
        <p className="text-gray-300 mt-3">
          We never sell your personal information to third parties.
        </p>
      </section>
      
      <section className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-3">4. Data Security</h2>
        <ul className="list-disc pl-6 text-gray-300 space-y-2">
          <li>Encryption of sensitive data (passwords, bank info)</li>
          <li>Secure HTTPS connections</li>
          <li>Regular security audits</li>
          <li>Limited employee access to personal data</li>
        </ul>
      </section>
      
      <section className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-3">5. Your Rights</h2>
        <ul className="list-disc pl-6 text-gray-300 space-y-2">
          <li><strong>Access:</strong> Request a copy of your data</li>
          <li><strong>Correction:</strong> Update incorrect information</li>
          <li><strong>Deletion:</strong> Request deletion of your account</li>
          <li><strong>Portability:</strong> Export your data</li>
          <li><strong>Opt-out:</strong> Unsubscribe from marketing emails</li>
        </ul>
      </section>
      
      <section className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-3">6. Cookies</h2>
        <p className="text-gray-300">
          We use cookies to enhance your experience, maintain sessions, and analyze usage. 
          You can control cookies through your browser settings.
        </p>
      </section>
      
      <section className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-3">7. Children's Privacy</h2>
        <p className="text-gray-300">
          Our platform is not intended for users under 18. We do not knowingly collect 
          information from children.
        </p>
      </section>
      
      <section className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-3">8. Changes to Policy</h2>
        <p className="text-gray-300">
          We may update this Privacy Policy. We will notify you of significant changes 
          via email or platform notification.
        </p>
      </section>
      
      <section className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-3">9. Contact</h2>
        <p className="text-gray-300">
          Privacy questions? Contact us at: <a href="mailto:privacy@dropdollar.com" className="text-blue-400 hover:text-blue-300">privacy@dropdollar.com</a>
        </p>
      </section>
    </div>
  );
}

