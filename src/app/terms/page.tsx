'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Header from '@/components/layout/Header';

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-800 text-white">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 shadow-2xl"
        >
          <motion.h1 
            className="text-4xl font-bold text-center mb-8 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            Terms of Service
          </motion.h1>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="prose prose-invert max-w-none"
          >
            <p className="text-gray-300 mb-6">
              <strong>Last Updated:</strong> {new Date().toLocaleDateString()} - California Law Updated
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-blue-400 mb-4">1. Acceptance of Terms</h2>
              <p className="text-gray-300 leading-relaxed">
                By accessing and using DropDollar ("the Platform"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-blue-400 mb-4">2. Description of Service</h2>
              <p className="text-gray-300 leading-relaxed">
                DropDollar is a skill-based gaming platform that allows users to participate in tournaments, competitions, and skill-based games for real money prizes. Users can:
              </p>
              <ul className="list-disc list-inside text-gray-300 mt-4 space-y-2">
                <li>Purchase tokens to enter competitions</li>
                <li>Participate in skill-based games and tournaments</li>
                <li>Win real money prizes based on performance</li>
                <li>Withdraw winnings to their bank accounts</li>
                <li>Create and manage seller accounts for marketplace transactions</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-blue-400 mb-4">3. Eligibility Requirements</h2>
              <p className="text-gray-300 leading-relaxed">
                To use DropDollar, you must:
              </p>
              <ul className="list-disc list-inside text-gray-300 mt-4 space-y-2">
                <li>Be at least 18 years old (or the legal age of majority in your jurisdiction)</li>
                <li>Reside in a jurisdiction where skill-based gaming is legal</li>
                <li>Provide accurate and complete registration information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Comply with all applicable laws and regulations</li>
              </ul>
              
              <h3 className="text-xl font-semibold text-blue-300 mb-3 mt-6">3.1 Geographic Restrictions</h3>
              <p className="text-gray-300 leading-relaxed mb-4">
                DropDollar is not available in the following states due to legal restrictions on skill-based gaming:
              </p>
              <ul className="list-disc list-inside text-gray-300 mb-6 space-y-2">
                <li><strong>Alabama</strong> - Skill-based gaming prohibited</li>
                <li><strong>Alaska</strong> - Skill-based gaming prohibited</li>
                <li><strong>Arizona</strong> - Skill-based gaming prohibited</li>
                <li><strong>Arkansas</strong> - Skill-based gaming prohibited</li>
                <li><strong>Connecticut</strong> - Skill-based gaming prohibited</li>
                <li><strong>Delaware</strong> - Skill-based gaming prohibited</li>
                <li><strong>Hawaii</strong> - Skill-based gaming prohibited</li>
                <li><strong>Idaho</strong> - Skill-based gaming prohibited</li>
                <li><strong>Louisiana</strong> - Skill-based gaming prohibited</li>
                <li><strong>Montana</strong> - Skill-based gaming prohibited</li>
                <li><strong>Nevada</strong> - Skill-based gaming prohibited</li>
                <li><strong>South Carolina</strong> - Skill-based gaming prohibited</li>
                <li><strong>South Dakota</strong> - Skill-based gaming prohibited</li>
                <li><strong>Tennessee</strong> - Skill-based gaming prohibited</li>
                <li><strong>Utah</strong> - Skill-based gaming prohibited</li>
                <li><strong>Vermont</strong> - Skill-based gaming prohibited</li>
                <li><strong>Washington</strong> - Skill-based gaming prohibited</li>
                <li><strong>Wisconsin</strong> - Skill-based gaming prohibited</li>
              </ul>
              
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-6">
                <p className="text-red-300 font-semibold mb-2">⚠️ Important Notice:</p>
                <p className="text-red-200 text-sm">
                  Users attempting to access DropDollar from prohibited states will be automatically blocked by our location verification system. 
                  We reserve the right to suspend or terminate accounts found to be using VPNs or other methods to circumvent geographic restrictions.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-blue-400 mb-4">4. Account Registration and Security</h2>
              <p className="text-gray-300 leading-relaxed">
                You are responsible for:
              </p>
              <ul className="list-disc list-inside text-gray-300 mt-4 space-y-2">
                <li>Maintaining the confidentiality of your account information</li>
                <li>All activities that occur under your account</li>
                <li>Notifying us immediately of any unauthorized use</li>
                <li>Ensuring your account information remains accurate and current</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-blue-400 mb-4">5. Token System and Payments</h2>
              <p className="text-gray-300 leading-relaxed">
                DropDollar uses a token-based system where:
              </p>
              <ul className="list-disc list-inside text-gray-300 mt-4 space-y-2">
                <li>1 Token = $1 USD</li>
                <li>Tokens are purchased through Stripe payment processing</li>
                <li>Tokens are used to enter competitions and tournaments</li>
                <li>Winnings are paid in tokens that can be converted to cash</li>
                <li>All transactions are final and non-refundable</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-blue-400 mb-4">6. Skill-Based Gaming</h2>
              <p className="text-gray-300 leading-relaxed">
                DropDollar operates as a skill-based gaming platform where:
              </p>
              <ul className="list-disc list-inside text-gray-300 mt-4 space-y-2">
                <li>Games require skill, strategy, and quick reflexes</li>
                <li>Outcomes are determined by player performance, not chance</li>
                <li>All games use consistent RNG (Random Number Generation) for fairness</li>
                <li>Players compete against each other or achieve target scores</li>
                <li>Location verification is required for legal compliance</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-blue-400 mb-4">7. Prohibited Activities</h2>
              <p className="text-gray-300 leading-relaxed">
                You agree not to:
              </p>
              <ul className="list-disc list-inside text-gray-300 mt-4 space-y-2">
                <li>Use automated software, bots, or cheating devices</li>
                <li>Create multiple accounts to circumvent restrictions</li>
                <li>Engage in fraudulent or deceptive practices</li>
                <li>Attempt to hack, disrupt, or damage the platform</li>
                <li>Violate any applicable laws or regulations</li>
                <li>Share account credentials with others</li>
                <li>Use the platform for money laundering or illegal activities</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-blue-400 mb-4">8. Withdrawals and Payouts</h2>
              <p className="text-gray-300 leading-relaxed">
                Withdrawal terms:
              </p>
              <ul className="list-disc list-inside text-gray-300 mt-4 space-y-2">
                <li>Minimum withdrawal amount: $10</li>
                <li>Withdrawals processed through Stripe Connect</li>
                <li>Processing time: 1-3 business days</li>
                <li>3% transaction fee applies to all withdrawals</li>
                <li>Identity verification may be required for large withdrawals</li>
                <li>Withdrawals subject to anti-fraud and compliance checks</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-blue-400 mb-4">9. Intellectual Property</h2>
              <p className="text-gray-300 leading-relaxed">
                All content, games, software, and materials on DropDollar are protected by intellectual property laws. You may not:
              </p>
              <ul className="list-disc list-inside text-gray-300 mt-4 space-y-2">
                <li>Copy, modify, or distribute our content without permission</li>
                <li>Reverse engineer our software or games</li>
                <li>Use our trademarks or branding without authorization</li>
                <li>Create derivative works based on our platform</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-blue-400 mb-4">10. Disclaimers and Limitations</h2>
              <p className="text-gray-300 leading-relaxed">
                DropDollar is provided "as is" without warranties of any kind. We are not liable for:
              </p>
              <ul className="list-disc list-inside text-gray-300 mt-4 space-y-2">
                <li>Technical issues or platform downtime</li>
                <li>Loss of tokens or winnings due to technical problems</li>
                <li>Third-party payment processing issues</li>
                <li>User errors or misunderstandings</li>
                <li>Indirect, incidental, or consequential damages</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-blue-400 mb-4">11. Termination</h2>
              <p className="text-gray-300 leading-relaxed">
                We may terminate or suspend your account at any time for:
              </p>
              <ul className="list-disc list-inside text-gray-300 mt-4 space-y-2">
                <li>Violation of these terms</li>
                <li>Fraudulent or suspicious activity</li>
                <li>Legal or regulatory requirements</li>
                <li>Platform maintenance or updates</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-blue-400 mb-4">12. Governing Law</h2>
              <p className="text-gray-300 leading-relaxed">
                These terms are governed by the laws of the State of California, United States. Any disputes will be resolved through binding arbitration in accordance with the rules of the American Arbitration Association, with arbitration proceedings to be conducted in Riverside County, California.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-blue-400 mb-4">13. Changes to Terms</h2>
              <p className="text-gray-300 leading-relaxed">
                We reserve the right to modify these terms at any time. Changes will be posted on this page with an updated "Last Modified" date. Continued use of the platform constitutes acceptance of the modified terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-blue-400 mb-4">14. Contact Information</h2>
              <p className="text-gray-300 leading-relaxed">
                For questions about these Terms of Service, please contact us at:
              </p>
              <div className="mt-4 p-4 bg-gray-700/50 rounded-lg">
                <p className="text-gray-300">
                  <strong>Email:</strong> legal@drop-dollar.com<br/>
                  <strong>Support:</strong> support@drop-dollar.com<br/>
                  <strong>Website:</strong> https://www.drop-dollar.com
                </p>
              </div>
            </section>

            <div className="mt-12 p-6 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-lg border border-blue-500/30">
              <p className="text-center text-gray-300">
                By using DropDollar, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default TermsOfService;