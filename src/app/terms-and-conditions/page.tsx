'use client';

import Link from 'next/link';
import CleanNavigation from '@/components/navigation/CleanNavigation';

export default function TermsAndConditionsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900">
      <CleanNavigation />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-8">
          <h1 className="text-4xl font-bold text-white mb-8 text-center">Terms & Conditions</h1>
          
          <div className="prose prose-invert max-w-none">
            <p className="text-gray-300 text-lg mb-6">
              Welcome to DropDollar! These terms and conditions outline the rules and regulations for the use of our gaming platform.
            </p>

            <h2 className="text-2xl font-bold text-white mt-8 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-300 mb-4">
              By accessing and using DropDollar, you accept and agree to be bound by the terms and provision of this agreement.
            </p>

            <h2 className="text-2xl font-bold text-white mt-8 mb-4">2. Gaming Platform</h2>
            <p className="text-gray-300 mb-4">
              DropDollar is a skill-based gaming platform where users can participate in various games and competitions for prizes. All games are based on skill, not chance.
            </p>

            <h2 className="text-2xl font-bold text-white mt-8 mb-4">3. User Accounts</h2>
            <p className="text-gray-300 mb-4">
              Users must create an account to participate in games. You are responsible for maintaining the confidentiality of your account information.
            </p>

            <h2 className="text-2xl font-bold text-white mt-8 mb-4">4. Token System</h2>
            <p className="text-gray-300 mb-4">
              DropDollar uses a token-based system for game entry fees and prizes. Tokens can be purchased and used to enter competitions.
            </p>

            <h2 className="text-2xl font-bold text-white mt-8 mb-4">5. Prizes and Payouts</h2>
            <p className="text-gray-300 mb-4">
              Prizes are awarded based on game performance and competition results. All payouts are processed through our secure payment system.
            </p>

            <h2 className="text-2xl font-bold text-white mt-8 mb-4">6. Prohibited Activities</h2>
            <p className="text-gray-300 mb-4">
              Users may not cheat, use automated systems, or engage in any fraudulent activities. Violations may result in account termination.
            </p>

            <h2 className="text-2xl font-bold text-white mt-8 mb-4">7. Location Verification</h2>
            <p className="text-gray-300 mb-4">
              For legal compliance, users must verify their location before participating in games. This helps ensure compliance with local gaming regulations.
            </p>

            <h2 className="text-2xl font-bold text-white mt-8 mb-4">8. Privacy Policy</h2>
            <p className="text-gray-300 mb-4">
              Your privacy is important to us. Please review our Privacy Policy to understand how we collect, use, and protect your information.
            </p>

            <h2 className="text-2xl font-bold text-white mt-8 mb-4">9. Limitation of Liability</h2>
            <p className="text-gray-300 mb-4">
              DropDollar shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the platform.
            </p>

            <h2 className="text-2xl font-bold text-white mt-8 mb-4">10. Changes to Terms</h2>
            <p className="text-gray-300 mb-4">
              We reserve the right to modify these terms at any time. Users will be notified of significant changes.
            </p>

            <h2 className="text-2xl font-bold text-white mt-8 mb-4">11. Contact Information</h2>
            <p className="text-gray-300 mb-4">
              If you have any questions about these Terms & Conditions, please contact us at support@drop-dollar.com
            </p>

            <div className="mt-8 pt-8 border-t border-white/20">
              <p className="text-gray-400 text-sm">
                Last updated: December 2024
              </p>
              <div className="mt-4">
                <Link 
                  href="/dashboard" 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  Back to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
