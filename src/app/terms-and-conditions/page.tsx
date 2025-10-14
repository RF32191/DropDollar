'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { 
  ShieldCheckIcon,
  UserIcon,
  CurrencyDollarIcon,
  TrophyIcon,
  CogIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

export default function TermsAndConditions() {
  const { user } = useAuth();
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [agreedToAge, setAgreedToAge] = useState(false);

  const handleAgreementSubmit = () => {
    if (agreedToTerms && agreedToPrivacy && agreedToAge) {
      // Store agreement in localStorage
      localStorage.setItem('termsAgreed', 'true');
      localStorage.setItem('termsAgreedDate', new Date().toISOString());
      alert('Thank you for agreeing to our terms. You can now use all DropDollar features!');
    } else {
      alert('Please agree to all terms and conditions to continue.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            <ShieldCheckIcon className="h-10 w-10 inline-block mr-3 text-blue-400" />
            Terms & Conditions
          </h1>
          <p className="text-gray-300 text-lg">
            DropDollar Gaming Marketplace - Professional Terms of Service
          </p>
          <p className="text-sm text-gray-400 mt-2">
            Last Updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        {/* Agreement Checkboxes */}
        <div className="bg-gray-800/50 rounded-xl p-6 mb-8 border border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
            <CheckCircleIcon className="h-6 w-6 mr-3 text-green-400" />
            User Agreement
          </h2>
          
          <div className="space-y-4">
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-1 h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-gray-300">
                I agree to the <strong className="text-white">Terms and Conditions</strong> and understand my rights and responsibilities as a DropDollar user.
              </span>
            </label>

            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedToPrivacy}
                onChange={(e) => setAgreedToPrivacy(e.target.checked)}
                className="mt-1 h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-gray-300">
                I agree to the <strong className="text-white">Privacy Policy</strong> and consent to the collection and use of my data as described.
              </span>
            </label>

            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedToAge}
                onChange={(e) => setAgreedToAge(e.target.checked)}
                className="mt-1 h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-gray-300">
                I confirm that I am <strong className="text-white">18 years or older</strong> and legally eligible to participate in skill-based gaming competitions.
              </span>
            </label>
          </div>

          <button
            onClick={handleAgreementSubmit}
            disabled={!agreedToTerms || !agreedToPrivacy || !agreedToAge}
            className="mt-6 w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 disabled:cursor-not-allowed"
          >
            {agreedToTerms && agreedToPrivacy && agreedToAge ? 'Accept Terms & Continue' : 'Please Check All Boxes Above'}
          </button>
        </div>

        {/* Terms Content */}
        <div className="space-y-8">
          {/* 1. Acceptance of Terms */}
          <section className="bg-gray-800/30 rounded-xl p-6 border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
              <UserIcon className="h-6 w-6 mr-3 text-blue-400" />
              1. Acceptance of Terms
            </h2>
            <div className="text-gray-300 space-y-3">
              <p>
                By accessing or using DropDollar ("the Service"), you agree to be bound by these Terms and Conditions ("Terms"). 
                If you do not agree to these Terms, you may not access or use the Service.
              </p>
              <p>
                DropDollar is a skill-based gaming marketplace where users compete in various games for cash prizes. 
                All competitions are based on skill, not chance, and are legal in jurisdictions where skill-based gaming is permitted.
              </p>
            </div>
          </section>

          {/* 2. Service Description */}
          <section className="bg-gray-800/30 rounded-xl p-6 border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
              <TrophyIcon className="h-6 w-6 mr-3 text-yellow-400" />
              2. Service Description
            </h2>
            <div className="text-gray-300 space-y-3">
              <p>
                DropDollar provides a platform for skill-based gaming competitions including but not limited to:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>1v1 competitive matches with cash prizes</li>
                <li>Tournament-style competitions</li>
                <li>Hot sell competitions with real prizes</li>
                <li>Practice mode for skill development</li>
                <li>Token-based economy for entry fees and rewards</li>
              </ul>
              <p>
                All games are designed to test skill, reaction time, accuracy, and strategic thinking. 
                No element of chance determines the outcome of competitions.
              </p>
            </div>
          </section>

          {/* 3. User Accounts */}
          <section className="bg-gray-800/30 rounded-xl p-6 border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
              <UserIcon className="h-6 w-6 mr-3 text-green-400" />
              3. User Accounts
            </h2>
            <div className="text-gray-300 space-y-3">
              <p>
                To use DropDollar, you must create an account and provide accurate, complete information. 
                You are responsible for maintaining the security of your account and all activities that occur under it.
              </p>
              <p>
                <strong className="text-white">Age Requirement:</strong> You must be at least 18 years old to create an account and participate in competitions.
              </p>
              <p>
                <strong className="text-white">One Account Per Person:</strong> Each user may only maintain one account. 
                Multiple accounts or account sharing is prohibited and may result in account termination.
              </p>
            </div>
          </section>

          {/* 4. Token Economy */}
          <section className="bg-gray-800/30 rounded-xl p-6 border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
              <CurrencyDollarIcon className="h-6 w-6 mr-3 text-green-400" />
              4. Token Economy & Payments
            </h2>
            <div className="text-gray-300 space-y-3">
              <p>
                DropDollar uses a token-based system where:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>1 Token = $1 USD equivalent</li>
                <li>Tokens are purchased through Stripe payment processing</li>
                <li>Entry fees are deducted from your token balance</li>
                <li>Winnings are credited to your token balance</li>
                <li>Tokens can be withdrawn to your bank account (subject to verification)</li>
              </ul>
              <p>
                <strong className="text-white">Refund Policy:</strong> Entry fees are non-refundable once a competition begins. 
                Refunds may be provided at our discretion for technical issues or service interruptions.
              </p>
            </div>
          </section>

          {/* 5. Competition Rules */}
          <section className="bg-gray-800/30 rounded-xl p-6 border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
              <TrophyIcon className="h-6 w-6 mr-3 text-purple-400" />
              5. Competition Rules
            </h2>
            <div className="text-gray-300 space-y-3">
              <p>
                <strong className="text-white">Fair Play:</strong> All competitions must be played fairly without the use of:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Bots, scripts, or automated tools</li>
                <li>Third-party software or modifications</li>
                <li>Exploits or glitches</li>
                <li>Multiple accounts or account sharing</li>
                <li>Any form of cheating or manipulation</li>
              </ul>
              <p>
                <strong className="text-white">Location Verification:</strong> Some competitions require location verification 
                to ensure compliance with local gaming laws. Users must enable location services when prompted.
              </p>
            </div>
          </section>

          {/* 6. Prizes & Winnings */}
          <section className="bg-gray-800/30 rounded-xl p-6 border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
              <CurrencyDollarIcon className="h-6 w-6 mr-3 text-yellow-400" />
              6. Prizes & Winnings
            </h2>
            <div className="text-gray-300 space-y-3">
              <p>
                <strong className="text-white">Prize Distribution:</strong>
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>1v1 Matches: Winner receives 85% of total entry fees (both players' tokens)</li>
                <li>Tournaments: Prize pool distributed according to tournament rules</li>
                <li>Hot Sell: Winner receives the advertised prize amount</li>
                <li>Platform Fee: DropDollar retains 15% of entry fees for platform maintenance</li>
              </ul>
              <p>
                <strong className="text-white">Withdrawals:</strong> Winnings can be withdrawn to verified bank accounts. 
                Processing time is 3-5 business days. Minimum withdrawal amount is $10.
              </p>
            </div>
          </section>

          {/* 7. Prohibited Activities */}
          <section className="bg-gray-800/30 rounded-xl p-6 border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
              <ExclamationTriangleIcon className="h-6 w-6 mr-3 text-red-400" />
              7. Prohibited Activities
            </h2>
            <div className="text-gray-300 space-y-3">
              <p>You may not use DropDollar for:</p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Money laundering or illegal financial activities</li>
                <li>Creating multiple accounts or account sharing</li>
                <li>Using automated tools or bots</li>
                <li>Exploiting bugs or technical vulnerabilities</li>
                <li>Harassment, abuse, or inappropriate behavior</li>
                <li>Violating any applicable laws or regulations</li>
                <li>Circumventing security measures or access controls</li>
              </ul>
            </div>
          </section>

          {/* 8. Account Termination */}
          <section className="bg-gray-800/30 rounded-xl p-6 border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
              <ExclamationTriangleIcon className="h-6 w-6 mr-3 text-orange-400" />
              8. Account Termination
            </h2>
            <div className="text-gray-300 space-y-3">
              <p>
                We reserve the right to suspend or terminate your account at any time for:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Violation of these Terms and Conditions</li>
                <li>Suspected fraudulent activity</li>
                <li>Cheating or unfair play</li>
                <li>Abuse of other users or staff</li>
                <li>Technical violations or exploits</li>
              </ul>
              <p>
                Upon termination, any remaining token balance may be forfeited unless the account was terminated due to our error.
              </p>
            </div>
          </section>

          {/* 9. Disclaimers */}
          <section className="bg-gray-800/30 rounded-xl p-6 border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
              <InformationCircleIcon className="h-6 w-6 mr-3 text-blue-400" />
              9. Disclaimers & Limitation of Liability
            </h2>
            <div className="text-gray-300 space-y-3">
              <p>
                DropDollar is provided "as is" without warranties of any kind. We do not guarantee:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Uninterrupted or error-free service</li>
                <li>Compatibility with all devices or browsers</li>
                <li>Availability of specific competitions</li>
                <li>Specific prize amounts or availability</li>
              </ul>
              <p>
                Our liability is limited to the amount you have paid us in the 12 months preceding the claim, 
                and we are not liable for indirect, incidental, or consequential damages.
              </p>
            </div>
          </section>

          {/* 10. Changes to Terms */}
          <section className="bg-gray-800/30 rounded-xl p-6 border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
              <CogIcon className="h-6 w-6 mr-3 text-gray-400" />
              10. Changes to Terms
            </h2>
            <div className="text-gray-300 space-y-3">
              <p>
                We may update these Terms from time to time. Material changes will be communicated via:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Email notification to registered users</li>
                <li>In-app notifications</li>
                <li>Website banner announcements</li>
              </ul>
              <p>
                Continued use of the Service after changes constitutes acceptance of the new Terms. 
                If you do not agree to the changes, you must stop using the Service.
              </p>
            </div>
          </section>

          {/* Contact Information */}
          <section className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-xl p-6 border border-blue-500/30">
            <h2 className="text-2xl font-bold text-white mb-4">
              Contact Information
            </h2>
            <div className="text-gray-300 space-y-2">
              <p>
                <strong className="text-white">Support Email:</strong> support@drop-dollar.com
              </p>
              <p>
                <strong className="text-white">Legal Inquiries:</strong> legal@drop-dollar.com
              </p>
              <p>
                <strong className="text-white">Business Hours:</strong> Monday-Friday, 9 AM - 6 PM EST
              </p>
            </div>
          </section>
        </div>

        {/* Navigation */}
        <div className="mt-8 text-center">
          <Link 
            href="/privacy-policy"
            className="text-blue-400 hover:text-blue-300 underline mr-6"
          >
            Privacy Policy
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
