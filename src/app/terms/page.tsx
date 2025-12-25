'use client';

import React from 'react';
import CleanNavigation from '@/components/navigation/CleanNavigation';
import Link from 'next/link';

export default function TermsOfServicePage() {
  const lastUpdated = 'December 25, 2024';
  const effectiveDate = 'December 25, 2024';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/30 to-gray-900">
      <CleanNavigation />
      
      <div className="container mx-auto px-4 py-8 pt-24 max-w-4xl">
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10">
          <h1 className="text-4xl font-bold text-white mb-2">Terms of Service</h1>
          <p className="text-gray-400 mb-8">Last Updated: {lastUpdated} | Effective Date: {effectiveDate}</p>
          
          <div className="prose prose-invert max-w-none space-y-8 text-gray-300">
            
            {/* Agreement */}
            <section className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6">
              <h2 className="text-2xl font-semibold text-yellow-400">IMPORTANT: PLEASE READ CAREFULLY</h2>
              <p className="mt-4">
                These Terms of Service ("Terms") constitute a legally binding agreement between you and 
                Drop Dollar, LLC ("Drop Dollar," "Company," "we," "us," or "our"). By accessing or using 
                our platform, you agree to be bound by these Terms. If you do not agree to these Terms, 
                you may not use our services.
              </p>
              <p className="mt-2 font-semibold text-yellow-300">
                THIS AGREEMENT CONTAINS AN ARBITRATION CLAUSE AND CLASS ACTION WAIVER (Section 18).
              </p>
            </section>

            {/* Platform Description */}
            <section>
              <h2 className="text-2xl font-semibold text-white border-b border-white/20 pb-2">1. Platform Description</h2>
              <p>
                Drop Dollar is a <strong>skill-based gaming platform</strong> that allows users to compete in 
                various games of skill for prizes. Unlike gambling, the outcome of our games is determined 
                <strong> predominantly by the player's skill</strong>, not chance.
              </p>
              <h3 className="text-xl font-medium text-white mt-4">1.1 Nature of Games</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>All games require skill, practice, and strategy to win</li>
                <li>Random elements (RNG) are seeded identically for all players in a competition</li>
                <li>The player with the highest score wins the prize</li>
                <li>Scores are determined by measurable factors: reaction time, accuracy, and execution</li>
              </ul>
              <h3 className="text-xl font-medium text-white mt-4">1.2 Not Gambling</h3>
              <p>
                Drop Dollar is NOT a gambling platform. We do not offer games of chance, casino games, 
                sports betting, or lotteries. Our games are skill-based competitions similar to tournaments 
                in chess, esports, or other competitive gaming.
              </p>
            </section>

            {/* Eligibility */}
            <section>
              <h2 className="text-2xl font-semibold text-white border-b border-white/20 pb-2">2. Eligibility Requirements</h2>
              <p>To use Drop Dollar, you must:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Age:</strong> Be at least 18 years old</li>
                <li><strong>Location:</strong> Be a legal resident of an eligible U.S. state</li>
                <li><strong>Identity:</strong> Provide accurate registration information</li>
                <li><strong>Legal Capacity:</strong> Have the legal authority to enter binding agreements</li>
                <li><strong>Single Account:</strong> Maintain only ONE account per person</li>
              </ul>
              
              <h3 className="text-xl font-medium text-white mt-4">2.1 Geographic Restrictions</h3>
              <p>
                Skill-based gaming is <strong>NOT available</strong> in the following states due to legal restrictions:
              </p>
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mt-2">
                <p className="text-red-400 font-semibold">BLOCKED STATES:</p>
                <p className="text-sm mt-2">
                  Arizona, Arkansas, Connecticut, Hawaii, Idaho, Iowa, Louisiana, Montana, Nevada, 
                  South Carolina, Tennessee, Utah, Washington
                </p>
              </div>
              <p className="mt-4">
                You may not use VPNs, proxies, or other means to circumvent geographic restrictions. 
                Violation will result in account termination and forfeiture of all balances.
              </p>
            </section>

            {/* Token Economy - CRITICAL SECTION */}
            <section className="bg-green-500/10 border border-green-500/30 rounded-xl p-6">
              <h2 className="text-2xl font-semibold text-green-400 border-b border-green-500/30 pb-2">3. Token Economy & Virtual Currency</h2>
              
              <p className="mt-4 text-white font-semibold">
                Drop Dollar uses a dual-wallet system with two distinct types of virtual currency:
              </p>

              <h3 className="text-xl font-medium text-white mt-6">3.1 Purchased Tokens ("Game Credits")</h3>
              <div className="bg-white/5 rounded-lg p-4 mt-2">
                <p><strong>Definition:</strong> Virtual currency purchased with real money or received as promotional bonuses.</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>✅ <strong>CAN</strong> be used to enter skill-based competitions</li>
                  <li>✅ <strong>CAN</strong> be used to purchase items in the RP Shop</li>
                  <li>✅ <strong>CAN</strong> be held indefinitely with no expiration</li>
                  <li>❌ <strong>CANNOT</strong> be exchanged for cash or withdrawn</li>
                  <li>❌ <strong>CANNOT</strong> be refunded after purchase</li>
                  <li>❌ <strong>CANNOT</strong> be transferred to other users</li>
                </ul>
                <p className="mt-4 text-yellow-400 font-semibold">
                  ⚠️ ALL TOKEN PURCHASES ARE FINAL AND NON-REFUNDABLE
                </p>
              </div>

              <h3 className="text-xl font-medium text-white mt-6">3.2 Won Tokens ("Prize Winnings")</h3>
              <div className="bg-white/5 rounded-lg p-4 mt-2">
                <p><strong>Definition:</strong> Virtual currency awarded as prizes for winning skill-based competitions.</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>✅ <strong>CAN</strong> be withdrawn as real money to your bank account</li>
                  <li>✅ <strong>CAN</strong> be used to enter additional competitions</li>
                  <li>✅ <strong>CAN</strong> be held indefinitely with no expiration</li>
                </ul>
                <p className="mt-4 text-green-400 font-semibold">
                  ✓ Prize winnings are 100% withdrawable (subject to identity verification)
                </p>
              </div>

              <h3 className="text-xl font-medium text-white mt-6">3.3 Spending Order</h3>
              <p>When entering a competition, tokens are deducted in this order:</p>
              <ol className="list-decimal pl-6 mt-2 space-y-1">
                <li><strong>Purchased Tokens FIRST</strong> (non-cashable credits used first)</li>
                <li><strong>Won Tokens SECOND</strong> (cashable winnings preserved)</li>
              </ol>
              <p className="mt-2 text-sm text-gray-400">
                This order protects your withdrawable winnings by using non-cashable credits first.
              </p>

              <h3 className="text-xl font-medium text-white mt-6">3.4 Token Value</h3>
              <p>
                1 Token = $1.00 USD (for purchase and withdrawal purposes). Tokens have no value 
                outside the Drop Dollar platform and cannot be exchanged for goods, services, or 
                currency except as explicitly permitted.
              </p>
            </section>

            {/* Prize Structure */}
            <section>
              <h2 className="text-2xl font-semibold text-white border-b border-white/20 pb-2">4. Prize Structure & Payouts</h2>
              
              <h3 className="text-xl font-medium text-white mt-4">4.1 Competition Types</h3>
              <table className="w-full mt-4 border border-white/20 text-sm">
                <thead className="bg-white/5">
                  <tr>
                    <th className="p-2 text-left border-b border-white/20">Type</th>
                    <th className="p-2 text-left border-b border-white/20">Entry Fee</th>
                    <th className="p-2 text-left border-b border-white/20">Prize Pool</th>
                    <th className="p-2 text-left border-b border-white/20">Platform Fee</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-white/10">
                    <td className="p-2">1v1 Battle</td>
                    <td className="p-2">Variable (2-100 tokens)</td>
                    <td className="p-2">Both entries combined</td>
                    <td className="p-2">15%</td>
                  </tr>
                  <tr className="border-b border-white/10">
                    <td className="p-2">Winner Takes All</td>
                    <td className="p-2">Fixed per game</td>
                    <td className="p-2">All entries combined</td>
                    <td className="p-2">15%</td>
                  </tr>
                  <tr className="border-b border-white/10">
                    <td className="p-2">Hot Sell</td>
                    <td className="p-2">Variable</td>
                    <td className="p-2">Seller-sponsored</td>
                    <td className="p-2">15%</td>
                  </tr>
                  <tr className="border-b border-white/10">
                    <td className="p-2">Practice Mode</td>
                    <td className="p-2">FREE</td>
                    <td className="p-2">None (XP only)</td>
                    <td className="p-2">N/A</td>
                  </tr>
                </tbody>
              </table>

              <h3 className="text-xl font-medium text-white mt-6">4.2 Platform Fee</h3>
              <p>
                Drop Dollar charges a <strong>15% platform fee</strong> on all prize pools. This fee 
                covers operational costs, prize fulfillment, and platform maintenance.
              </p>
              <div className="bg-white/5 rounded-lg p-4 mt-2">
                <p><strong>Example:</strong></p>
                <p>Two players enter a 10-token 1v1 battle (20 tokens total pool)</p>
                <ul className="list-disc pl-6 mt-2">
                  <li>Platform Fee: 20 × 15% = 3 tokens</li>
                  <li>Winner Receives: 20 - 3 = 17 tokens (added to Won Tokens)</li>
                </ul>
              </div>

              <h3 className="text-xl font-medium text-white mt-6">4.3 Prize Fulfillment</h3>
              <p>
                Prizes are funded by entry fees collected from participants. Drop Dollar maintains 
                sufficient reserves to fulfill all prizes. All prize winnings are deposited into 
                your "Won Tokens" balance immediately upon competition conclusion.
              </p>
            </section>

            {/* Withdrawals */}
            <section>
              <h2 className="text-2xl font-semibold text-white border-b border-white/20 pb-2">5. Withdrawals</h2>
              
              <h3 className="text-xl font-medium text-white mt-4">5.1 Eligibility</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Only "Won Tokens" may be withdrawn</li>
                <li>Minimum withdrawal: 10 tokens ($10 USD)</li>
                <li>Identity verification required for withdrawals over $100</li>
                <li>Bank account or payment method must be verified</li>
              </ul>

              <h3 className="text-xl font-medium text-white mt-4">5.2 Processing Time</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Standard withdrawals: 3-5 business days</li>
                <li>First-time withdrawals may require additional verification</li>
                <li>Holidays and weekends may extend processing time</li>
              </ul>

              <h3 className="text-xl font-medium text-white mt-4">5.3 Verification Requirements</h3>
              <p>For withdrawals over $100, you must provide:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Government-issued photo ID</li>
                <li>Proof of address (utility bill or bank statement)</li>
                <li>Selfie verification</li>
              </ul>
            </section>

            {/* Fair Play */}
            <section>
              <h2 className="text-2xl font-semibold text-white border-b border-white/20 pb-2">6. Fair Play & Integrity</h2>
              
              <h3 className="text-xl font-medium text-white mt-4">6.1 RNG Seeding</h3>
              <p>
                All random elements in our games use <strong>deterministic seeding</strong>. This means 
                all players in the same competition face identical game conditions (enemy spawns, 
                obstacle patterns, etc.). Winners are determined purely by skill, not luck.
              </p>

              <h3 className="text-xl font-medium text-white mt-4">6.2 Prohibited Conduct</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Using bots, scripts, or automation software</li>
                <li>Exploiting bugs or glitches</li>
                <li>Collusion with other players</li>
                <li>Multiple accounts (one account per person)</li>
                <li>Using modified clients or game files</li>
                <li>VPN/proxy usage to circumvent restrictions</li>
                <li>Account sharing or selling</li>
              </ul>

              <h3 className="text-xl font-medium text-white mt-4">6.3 Consequences</h3>
              <p>Violations may result in:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Immediate account suspension</li>
                <li>Forfeiture of all tokens and winnings</li>
                <li>Permanent ban from the platform</li>
                <li>Legal action if appropriate</li>
              </ul>
            </section>

            {/* Account */}
            <section>
              <h2 className="text-2xl font-semibold text-white border-b border-white/20 pb-2">7. Account Terms</h2>
              
              <h3 className="text-xl font-medium text-white mt-4">7.1 Account Security</h3>
              <p>
                You are responsible for maintaining the confidentiality of your account credentials. 
                You agree to immediately notify us of any unauthorized access.
              </p>

              <h3 className="text-xl font-medium text-white mt-4">7.2 Account Termination</h3>
              <p>We may terminate or suspend your account for:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Violation of these Terms</li>
                <li>Suspected fraud or illegal activity</li>
                <li>Inactivity for 12+ months</li>
                <li>At our discretion with notice</li>
              </ul>

              <h3 className="text-xl font-medium text-white mt-4">7.3 Effect of Termination</h3>
              <p>Upon termination:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Access to the platform is revoked</li>
                <li>Purchased Tokens are forfeited (non-refundable)</li>
                <li>Won Tokens may be withdrawn (if account closed in good standing)</li>
                <li>For Terms violations: ALL balances are forfeited</li>
              </ul>
            </section>

            {/* Taxes */}
            <section>
              <h2 className="text-2xl font-semibold text-white border-b border-white/20 pb-2">8. Taxes</h2>
              <p>
                You are solely responsible for reporting and paying any taxes on your winnings. 
                For U.S. users, we will issue Form 1099-MISC for winnings of $600 or more in a 
                calendar year. You may be required to provide tax identification information (W-9).
              </p>
            </section>

            {/* Intellectual Property */}
            <section>
              <h2 className="text-2xl font-semibold text-white border-b border-white/20 pb-2">9. Intellectual Property</h2>
              <p>
                All content on Drop Dollar, including games, graphics, logos, and software, is owned 
                by Drop Dollar or its licensors. You may not copy, modify, distribute, or create 
                derivative works without our written permission.
              </p>
            </section>

            {/* Disclaimers */}
            <section>
              <h2 className="text-2xl font-semibold text-white border-b border-white/20 pb-2">10. Disclaimers</h2>
              <p>
                THE PLATFORM IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. 
                WE DO NOT GUARANTEE UNINTERRUPTED SERVICE, ERROR-FREE OPERATION, OR SPECIFIC RESULTS.
              </p>
              <p className="mt-4">
                DROP DOLLAR IS NOT RESPONSIBLE FOR:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Technical issues, server outages, or connectivity problems</li>
                <li>Unauthorized access to your account (if due to your negligence)</li>
                <li>Actions of other users</li>
                <li>Third-party services (Stripe, banks, etc.)</li>
              </ul>
            </section>

            {/* Limitation of Liability */}
            <section>
              <h2 className="text-2xl font-semibold text-white border-b border-white/20 pb-2">11. Limitation of Liability</h2>
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, DROP DOLLAR'S TOTAL LIABILITY FOR ANY CLAIM 
                ARISING FROM YOUR USE OF THE PLATFORM SHALL NOT EXCEED THE AMOUNT YOU PAID TO US IN 
                THE 12 MONTHS PRECEDING THE CLAIM.
              </p>
              <p className="mt-4">
                WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR 
                PUNITIVE DAMAGES.
              </p>
            </section>

            {/* Indemnification */}
            <section>
              <h2 className="text-2xl font-semibold text-white border-b border-white/20 pb-2">12. Indemnification</h2>
              <p>
                You agree to indemnify and hold harmless Drop Dollar, its officers, directors, employees, 
                and agents from any claims, damages, or expenses arising from your use of the platform, 
                violation of these Terms, or infringement of any third-party rights.
              </p>
            </section>

            {/* Dispute Resolution */}
            <section className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-6">
              <h2 className="text-2xl font-semibold text-purple-400 border-b border-purple-500/30 pb-2">13. Dispute Resolution & Arbitration</h2>
              
              <h3 className="text-xl font-medium text-white mt-4">13.1 Binding Arbitration</h3>
              <p>
                Any dispute arising from these Terms or your use of the platform shall be resolved 
                through <strong>binding arbitration</strong> administered by the American Arbitration 
                Association (AAA) under its Consumer Arbitration Rules.
              </p>

              <h3 className="text-xl font-medium text-white mt-4">13.2 Class Action Waiver</h3>
              <p className="text-yellow-400 font-semibold">
                YOU AGREE TO RESOLVE DISPUTES INDIVIDUALLY AND WAIVE ANY RIGHT TO PARTICIPATE IN 
                CLASS ACTION LAWSUITS OR CLASS-WIDE ARBITRATION.
              </p>

              <h3 className="text-xl font-medium text-white mt-4">13.3 Exceptions</h3>
              <p>Either party may seek injunctive relief in court for intellectual property violations.</p>

              <h3 className="text-xl font-medium text-white mt-4">13.4 Governing Law</h3>
              <p>These Terms are governed by the laws of the State of Delaware, without regard to conflict of law principles.</p>
            </section>

            {/* Modifications */}
            <section>
              <h2 className="text-2xl font-semibold text-white border-b border-white/20 pb-2">14. Modifications to Terms</h2>
              <p>
                We may modify these Terms at any time. Material changes will be notified via email or 
                platform notice at least 30 days before taking effect. Continued use after changes 
                constitutes acceptance.
              </p>
            </section>

            {/* Severability */}
            <section>
              <h2 className="text-2xl font-semibold text-white border-b border-white/20 pb-2">15. Severability</h2>
              <p>
                If any provision of these Terms is found unenforceable, the remaining provisions 
                shall remain in full force and effect.
              </p>
            </section>

            {/* Contact */}
            <section>
              <h2 className="text-2xl font-semibold text-white border-b border-white/20 pb-2">16. Contact Information</h2>
              <div className="bg-white/5 rounded-lg p-4 mt-4">
                <p><strong>Drop Dollar, LLC</strong></p>
                <p>Email: legal@drop-dollar.com</p>
                <p>Support: support@drop-dollar.com</p>
              </div>
            </section>

            {/* Acknowledgment */}
            <section className="bg-green-500/10 border border-green-500/30 rounded-xl p-6">
              <h2 className="text-2xl font-semibold text-green-400">Acknowledgment</h2>
              <p className="mt-4">
                By creating an account or using Drop Dollar, you acknowledge that you have read, 
                understood, and agree to be bound by these Terms of Service, our Privacy Policy, 
                and our Responsible Gaming Policy.
              </p>
            </section>

          </div>
        </div>

        {/* Related Links */}
        <div className="flex flex-wrap gap-4 mt-8 justify-center">
          <Link href="/privacy" className="text-purple-400 hover:text-purple-300 transition-colors">
            Privacy Policy →
          </Link>
          <Link href="/responsible-gaming" className="text-purple-400 hover:text-purple-300 transition-colors">
            Responsible Gaming →
          </Link>
          <Link href="/contact" className="text-purple-400 hover:text-purple-300 transition-colors">
            Contact Us →
          </Link>
        </div>
      </div>
    </div>
  );
}
