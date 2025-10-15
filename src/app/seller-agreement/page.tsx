'use client';

import React from 'react';
import { motion } from 'framer-motion';

const SellerAgreement = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-800 text-white">
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
            Seller Agreement
          </motion.h1>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="prose prose-invert max-w-none"
          >
            <p className="text-gray-300 mb-6">
              <strong>Last Updated:</strong> {new Date().toLocaleDateString()}
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-blue-400 mb-4">1. Seller Account Agreement</h2>
              <p className="text-gray-300 leading-relaxed">
                This Seller Agreement ("Agreement") governs your use of DropDollar's marketplace platform as a seller. By creating a seller account, you agree to be bound by these terms in addition to our Terms of Service and Privacy Policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-blue-400 mb-4">2. Seller Eligibility</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                To become a seller on DropDollar, you must:
              </p>
              <ul className="list-disc list-inside text-gray-300 mb-6 space-y-2">
                <li>Be at least 18 years old and legally capable of entering contracts</li>
                <li>Reside in a jurisdiction where online selling is permitted</li>
                <li>Provide accurate business information and tax identification</li>
                <li>Have a valid bank account for receiving payments</li>
                <li>Comply with all applicable laws and regulations</li>
                <li>Pass our seller verification process</li>
              </ul>
              
              <h3 className="text-xl font-semibold text-blue-300 mb-3">2.1 Geographic Restrictions</h3>
              <p className="text-gray-300 leading-relaxed mb-4">
                Seller accounts are not available in the following states due to legal restrictions:
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
                  Sellers attempting to operate from prohibited states will be automatically blocked by our location verification system. 
                  We reserve the right to suspend or terminate seller accounts found to be using VPNs or other methods to circumvent geographic restrictions.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-blue-400 mb-4">3. Marketplace Categories</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                DropDollar supports selling in the following categories:
              </p>
              <ul className="list-disc list-inside text-gray-300 mb-6 space-y-2">
                <li><strong>Electronics:</strong> Consumer electronics, gadgets, accessories</li>
                <li><strong>Books & Media:</strong> Books, movies, music, educational materials</li>
                <li><strong>Music & Instruments:</strong> Musical instruments, equipment, accessories</li>
                <li><strong>Art & Crafts:</strong> Artwork, handmade items, craft supplies</li>
                <li><strong>Photography:</strong> Cameras, lenses, photography equipment</li>
                <li><strong>Tools & Equipment:</strong> Professional and DIY tools, equipment</li>
                <li><strong>Hot Sell:</strong> Featured listings with premium placement</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-blue-400 mb-4">4. Listing Requirements</h2>
              
              <h3 className="text-xl font-semibold text-blue-300 mb-3">4.1 Product Information</h3>
              <p className="text-gray-300 leading-relaxed mb-4">
                All listings must include:
              </p>
              <ul className="list-disc list-inside text-gray-300 mb-6 space-y-2">
                <li>Accurate and detailed product descriptions</li>
                <li>High-quality photos (minimum 3 images)</li>
                <li>Correct pricing in USD</li>
                <li>Shipping information and delivery times</li>
                <li>Return and refund policies</li>
                <li>Condition of the item (new, used, refurbished)</li>
              </ul>

              <h3 className="text-xl font-semibold text-blue-300 mb-3">4.2 Prohibited Items</h3>
              <p className="text-gray-300 leading-relaxed mb-4">
                The following items are prohibited:
              </p>
              <ul className="list-disc list-inside text-gray-300 mb-6 space-y-2">
                <li>Illegal or restricted items</li>
                <li>Counterfeit or replica products</li>
                <li>Dangerous or hazardous materials</li>
                <li>Adult content or inappropriate materials</li>
                <li>Items that violate intellectual property rights</li>
                <li>Services that compete with DropDollar's core gaming platform</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-blue-400 mb-4">5. Pricing and Fees</h2>
              
              <h3 className="text-xl font-semibold text-blue-300 mb-3">5.1 DropAFund Fee Structure</h3>
              <p className="text-gray-300 leading-relaxed mb-4">
                DropDollar charges the following fees:
              </p>
              <ul className="list-disc list-inside text-gray-300 mb-6 space-y-2">
                <li><strong>Standard Listings:</strong> 6% of sale price</li>
                <li><strong>Hot Sell Listings:</strong> 8% of sale price (includes premium placement)</li>
                <li><strong>Payment Processing:</strong> 3% Stripe fee (separate from DropAFund)</li>
                <li><strong>Withdrawal Fee:</strong> 3% for seller payouts</li>
              </ul>

              <h3 className="text-xl font-semibold text-blue-300 mb-3">5.2 Payment Schedule</h3>
              <p className="text-gray-300 leading-relaxed mb-4">
                Seller payments are processed:
              </p>
              <ul className="list-disc list-inside text-gray-300 mb-6 space-y-2">
                <li>After successful delivery confirmation</li>
                <li>Within 1-3 business days</li>
                <li>Minus applicable fees and charges</li>
                <li>Via Stripe Connect to your bank account</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-blue-400 mb-4">6. Order Management</h2>
              
              <h3 className="text-xl font-semibold text-blue-300 mb-3">6.1 Order Processing</h3>
              <p className="text-gray-300 leading-relaxed mb-4">
                Sellers must:
              </p>
              <ul className="list-disc list-inside text-gray-300 mb-6 space-y-2">
                <li>Process orders within 24 hours of receipt</li>
                <li>Provide accurate shipping information</li>
                <li>Update order status promptly</li>
                <li>Communicate with buyers about delays</li>
                <li>Maintain inventory accuracy</li>
              </ul>

              <h3 className="text-xl font-semibold text-blue-300 mb-3">6.2 Shipping Requirements</h3>
              <p className="text-gray-300 leading-relaxed mb-4">
                All shipments must:
              </p>
              <ul className="list-disc list-inside text-gray-300 mb-6 space-y-2">
                <li>Include tracking information</li>
                <li>Be packaged securely and professionally</li>
                <li>Meet delivery time commitments</li>
                <li>Include appropriate insurance for valuable items</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-blue-400 mb-4">7. Customer Service</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                Sellers are responsible for:
              </p>
              <ul className="list-disc list-inside text-gray-300 mb-6 space-y-2">
                <li>Responding to customer inquiries within 24 hours</li>
                <li>Resolving disputes professionally</li>
                <li>Providing accurate product information</li>
                <li>Honoring return and refund policies</li>
                <li>Maintaining high customer satisfaction ratings</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-blue-400 mb-4">8. Returns and Refunds</h2>
              
              <h3 className="text-xl font-semibold text-blue-300 mb-3">8.1 Return Policy Requirements</h3>
              <p className="text-gray-300 leading-relaxed mb-4">
                Sellers must provide:
              </p>
              <ul className="list-disc list-inside text-gray-300 mb-6 space-y-2">
                <li>Minimum 14-day return window</li>
                <li>Clear return conditions and procedures</li>
                <li>Responsibility for return shipping costs</li>
                <li>Refund processing within 5 business days</li>
              </ul>

              <h3 className="text-xl font-semibold text-blue-300 mb-3">8.2 DropDollar's Role</h3>
              <p className="text-gray-300 leading-relaxed">
                DropDollar may intervene in disputes and has final authority over refund decisions to protect buyer interests.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-blue-400 mb-4">9. Seller Performance Standards</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                Sellers must maintain:
              </p>
              <ul className="list-disc list-inside text-gray-300 mb-6 space-y-2">
                <li>Minimum 4.5-star average rating</li>
                <li>Less than 5% order cancellation rate</li>
                <li>On-time shipping rate above 95%</li>
                <li>Response time under 24 hours</li>
                <li>Compliance with all platform policies</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-blue-400 mb-4">10. Intellectual Property</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                Sellers must:
              </p>
              <ul className="list-disc list-inside text-gray-300 mb-6 space-y-2">
                <li>Own or have rights to sell all listed items</li>
                <li>Not infringe on third-party intellectual property</li>
                <li>Provide original product photos when possible</li>
                <li>Respect trademark and copyright laws</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-blue-400 mb-4">11. Tax Compliance</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                Sellers are responsible for:
              </p>
              <ul className="list-disc list-inside text-gray-300 mb-6 space-y-2">
                <li>Collecting and remitting applicable sales taxes</li>
                <li>Reporting income for tax purposes</li>
                <li>Maintaining accurate sales records</li>
                <li>Providing tax documentation when required</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-blue-400 mb-4">12. Account Suspension and Termination</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                DropDollar may suspend or terminate seller accounts for:
              </p>
              <ul className="list-disc list-inside text-gray-300 mb-6 space-y-2">
                <li>Violation of this agreement or platform policies</li>
                <li>Poor performance metrics</li>
                <li>Fraudulent or deceptive practices</li>
                <li>Failure to meet customer service standards</li>
                <li>Legal or regulatory violations</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-blue-400 mb-4">13. Dispute Resolution</h2>
              <p className="text-gray-300 leading-relaxed">
                Any disputes arising from this agreement will be resolved through binding arbitration in accordance with the rules of the American Arbitration Association. The arbitration will be conducted in English and governed by the laws of the State of California, with arbitration proceedings to be conducted in Riverside County, California.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-blue-400 mb-4">14. Modifications to Agreement</h2>
              <p className="text-gray-300 leading-relaxed">
                DropDollar reserves the right to modify this agreement at any time. Changes will be posted on this page with an updated "Last Modified" date. Continued use of the seller platform constitutes acceptance of the modified terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-blue-400 mb-4">15. Contact Information</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                For questions about this Seller Agreement, please contact us:
              </p>
              <div className="mt-4 p-4 bg-gray-700/50 rounded-lg">
                <p className="text-gray-300">
                  <strong>Seller Support:</strong> sellers@drop-dollar.com<br/>
                  <strong>General Support:</strong> support@drop-dollar.com<br/>
                  <strong>Legal Questions:</strong> legal@drop-dollar.com<br/>
                  <strong>Website:</strong> https://www.drop-dollar.com
                </p>
              </div>
            </section>

            <div className="mt-12 p-6 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-lg border border-blue-500/30">
              <p className="text-center text-gray-300">
                By creating a seller account on DropDollar, you acknowledge that you have read, understood, and agree to be bound by this Seller Agreement.
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default SellerAgreement;
