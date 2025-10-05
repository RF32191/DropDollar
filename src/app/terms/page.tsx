'use client';

import React from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { 
  DocumentTextIcon,
  UserIcon,
  CurrencyDollarIcon,
  ClockIcon,
  PuzzlePieceIcon,
  TrophyIcon,
  GiftIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  ShieldCheckIcon,
  ScaleIcon,
  MapPinIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

export default function TermsConditionsPage() {
  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <DocumentTextIcon className="h-12 w-12 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Terms & Conditions</h1>
          </div>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Contest rules and participation terms for DropDollar Gaming platform competitions.
          </p>
          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            <strong>Last Updated:</strong> {currentDate}
          </div>
        </div>

        {/* Terms Overview */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
          <div className="flex items-start">
            <CheckCircleIcon className="h-6 w-6 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-blue-800 mb-2">📋 Terms at a Glance</h3>
              <ul className="text-blue-700 space-y-1 text-sm">
                <li>• <strong>18+ U.S. Residents Only</strong> - Must be legal adult in United States</li>
                <li>• <strong>$1-$3 Entry Fees</strong> - Non-refundable, fixed prize values</li>
                <li>• <strong>Skill-Based Games</strong> - Fair competition with anti-bot protection</li>
                <li>• <strong>Daily Limits</strong> - Max 3 wins, 10 contests, $30 spend per day</li>
                <li>• <strong>Tax Responsibility</strong> - Winners handle all tax obligations</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-8">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-yellow-800 mb-2">⚖️ Legal Agreement</h3>
              <p className="text-yellow-700 text-sm">
                These Terms & Conditions govern participation in contests hosted on the DropDollar Gaming platform. 
                <strong> By entering a contest, you agree to these Terms.</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Section 1: Eligibility */}
        <section className="mb-12">
          <div className="flex items-center space-x-3 mb-6">
            <UserIcon className="h-8 w-8 text-gray-700" />
            <h2 className="text-3xl font-bold text-gray-900">1. Eligibility</h2>
          </div>

          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start">
                <span className="text-green-600 mr-2">✓</span>
                <strong>Age & Residency:</strong> Open only to legal residents of the United States who are 18 years or older at the time of entry.
              </li>
              <li className="flex items-start">
                <span className="text-red-600 mr-2">✗</span>
                <strong>Legal Restrictions:</strong> Void where prohibited or restricted by law.
              </li>
              <li className="flex items-start">
                <span className="text-red-600 mr-2">✗</span>
                <strong>Employee Exclusion:</strong> Employees, contractors, officers, and immediate family members of DropDollar are not eligible to participate.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 2: Entry & Fees */}
        <section className="mb-12">
          <div className="flex items-center space-x-3 mb-6">
            <CurrencyDollarIcon className="h-8 w-8 text-gray-700" />
            <h2 className="text-3xl font-bold text-gray-900">2. Entry & Fees</h2>
          </div>

          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">💰</span>
                <strong>Entry Cost:</strong> Entry fee is $1 per play. Participants may purchase additional plays (e.g., 3 plays for $3).
              </li>
              <li className="flex items-start">
                <span className="text-purple-600 mr-2">🎯</span>
                <strong>Scoring:</strong> Each entry equals one game attempt. The highest score achieved across all attempts counts toward winning.
              </li>
              <li className="flex items-start">
                <span className="text-red-600 mr-2">⚠️</span>
                <strong>Non-Refundable:</strong> Entry fees are non-refundable.
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-2">🏦</span>
                <strong>Revenue Model:</strong> DropDollar retains all entry fees. Prize value is fixed and does not increase with the number of entries.
              </li>
            </ul>
          </div>
        </section>

        {/* Simplified remaining sections */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">3. Contest Period</h2>
          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <p className="text-gray-700">
              Each listing specifies the prize item and its retail value, the number of entries required to activate the contest, 
              and a countdown timer once the minimum threshold is reached. All contests close at the listed end time. Late entries are not accepted.
            </p>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">4. Game Rules</h2>
          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <p className="text-gray-700 mb-4">
              Each contest assigns one of several skill-based reflex games. The assigned game remains undisclosed until contest start. 
              All participants play under the same game rules and scoring system.
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 font-medium">
                <strong>Prohibited:</strong> Automated play, scripts, macros, bots, or other unfair methods of entry are strictly prohibited.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">5. Determination of Winner</h2>
          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <p className="text-gray-700">
              The participant with the highest score at the end of gameplay will be declared the winner. 
              In the event of a tie, the participant who achieved the score first will be declared the winner. 
              All scoring decisions recorded by DropDollar's systems are final.
            </p>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">6. Prize</h2>
          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <p className="text-gray-700 mb-4">
              The prize is the specific item or cash amount listed in the contest description. Only one prize will be awarded per contest unless explicitly stated otherwise. 
              Prizes are non-transferable, non-exchangeable, and may not be redeemed for cash unless the prize itself is cash.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800 font-medium">
                <strong>Tax Responsibility:</strong> Winners are solely responsible for all applicable federal, state, and local taxes.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">7. Daily Limits & Responsible Play</h2>
          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-bold text-gray-900 mb-3">📊 Daily Limits</h4>
                <ul className="space-y-2 text-gray-700 text-sm">
                  <li>• <strong>Per Contest:</strong> 3 plays max ($3 per listing)</li>
                  <li>• <strong>Per Day:</strong> 10 contest listings max</li>
                  <li>• <strong>Daily Spend:</strong> $30 maximum</li>
                  <li>• <strong>Daily Wins:</strong> 3 prizes maximum</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-bold text-gray-900 mb-3">🛡️ Protection Features</h4>
                <ul className="space-y-2 text-gray-700 text-sm">
                  <li>• <strong>Auto-Lockout:</strong> After 3 wins, locked until midnight</li>
                  <li>• <strong>Automatic:</strong> Limits enforced by platform</li>
                  <li>• <strong>Purpose:</strong> Encourage responsible participation</li>
                  <li>• <strong>Reset:</strong> Midnight local time daily</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">8. State Restrictions</h2>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h4 className="font-bold text-red-800 mb-3">🚫 Excluded States</h4>
              <p className="text-red-700 mb-3">
                <strong>Void Where Prohibited:</strong> Participation is void where restricted by law.
              </p>
              <p className="text-red-700">
                <strong>Excluded States:</strong> Contests are not open to residents of Arizona, Colorado, Tennessee, Maryland, or North Dakota due to restrictions on skill-based contests with entry fees.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h4 className="font-bold text-blue-800 mb-3">⚖️ Player Responsibility</h4>
              <p className="text-blue-700">
                By entering a contest, participants represent and warrant that participation is legal in their jurisdiction of residence. DropDollar is not responsible for entries made in violation of state or local laws.
              </p>
            </div>
          </div>
        </section>

        {/* Bottom Navigation */}
        <div className="bg-gray-100 rounded-lg p-6 text-center">
          <h3 className="font-bold text-gray-900 mb-4">📚 Legal Documents</h3>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/terms" className="text-blue-600 hover:text-blue-700 font-bold">Terms & Conditions</Link>
            <Link href="/privacy" className="text-purple-600 hover:text-purple-700 font-medium">Privacy Policy</Link>
            <Link href="/how-it-works" className="text-green-600 hover:text-green-700 font-medium">How It Works</Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}