'use client';

import React from 'react';
import { motion } from 'framer-motion';

const PrivacyPolicy = () => {
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
            Privacy Policy
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
              <h2 className="text-2xl font-semibold text-blue-400 mb-4">1. Introduction</h2>
              <p className="text-gray-300 leading-relaxed">
                DropDollar ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our skill-based gaming platform.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-blue-400 mb-4">2. Information We Collect</h2>
              
              <h3 className="text-xl font-semibold text-blue-300 mb-3">2.1 Personal Information</h3>
              <p className="text-gray-300 leading-relaxed mb-4">
                We collect information you provide directly to us, including:
              </p>
              <ul className="list-disc list-inside text-gray-300 mb-6 space-y-2">
                <li>Name, email address, and username</li>
                <li>Date of birth and age verification</li>
                <li>Payment information (processed securely through Stripe)</li>
                <li>Bank account details for withdrawals (via Stripe Connect)</li>
                <li>Location information for legal compliance</li>
                <li>Government-issued ID for identity verification</li>
              </ul>

              <h3 className="text-xl font-semibold text-blue-300 mb-3">2.2 Gameplay Information</h3>
              <p className="text-gray-300 leading-relaxed mb-4">
                We collect data related to your gaming activity:
              </p>
              <ul className="list-disc list-inside text-gray-300 mb-6 space-y-2">
                <li>Game scores and performance metrics</li>
                <li>Tournament participation and results</li>
                <li>Token transactions and balance history</li>
                <li>Withdrawal and deposit records</li>
                <li>Device information and IP addresses</li>
                <li>Browser type and operating system</li>
              </ul>

              <h3 className="text-xl font-semibold text-blue-300 mb-3">2.3 Technical Information</h3>
              <p className="text-gray-300 leading-relaxed mb-4">
                We automatically collect certain technical information:
              </p>
              <ul className="list-disc list-inside text-gray-300 mb-6 space-y-2">
                <li>Log files and usage analytics</li>
                <li>Cookies and similar tracking technologies</li>
                <li>Device identifiers and hardware information</li>
                <li>Network information and connection details</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-blue-400 mb-4">3. How We Use Your Information</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                We use your information for the following purposes:
              </p>
              <ul className="list-disc list-inside text-gray-300 mb-6 space-y-2">
                <li>Provide and maintain our gaming platform</li>
                <li>Process payments and manage your account</li>
                <li>Verify your identity and age</li>
                <li>Ensure compliance with legal requirements</li>
                <li>Prevent fraud and ensure platform security</li>
                <li>Improve our games and user experience</li>
                <li>Communicate with you about your account</li>
                <li>Provide customer support</li>
                <li>Conduct analytics and research</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-blue-400 mb-4">4. Information Sharing and Disclosure</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                We may share your information in the following circumstances:
              </p>
              
              <h3 className="text-xl font-semibold text-blue-300 mb-3">4.1 Service Providers</h3>
              <p className="text-gray-300 leading-relaxed mb-4">
                We share information with trusted third-party service providers:
              </p>
              <ul className="list-disc list-inside text-gray-300 mb-6 space-y-2">
                <li>Stripe for payment processing</li>
                <li>Supabase for data storage and management</li>
                <li>Vercel for hosting and deployment</li>
                <li>Analytics providers for platform insights</li>
              </ul>

              <h3 className="text-xl font-semibold text-blue-300 mb-3">4.2 Legal Requirements</h3>
              <p className="text-gray-300 leading-relaxed mb-4">
                We may disclose information when required by law or to:
              </p>
              <ul className="list-disc list-inside text-gray-300 mb-6 space-y-2">
                <li>Comply with legal processes or government requests</li>
                <li>Protect our rights and property</li>
                <li>Prevent fraud or illegal activities</li>
                <li>Protect user safety and platform integrity</li>
              </ul>

              <h3 className="text-xl font-semibold text-blue-300 mb-3">4.3 Business Transfers</h3>
              <p className="text-gray-300 leading-relaxed mb-4">
                In the event of a merger, acquisition, or sale of assets, user information may be transferred as part of the transaction.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-blue-400 mb-4">5. Data Security</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                We implement appropriate security measures to protect your information:
              </p>
              <ul className="list-disc list-inside text-gray-300 mb-6 space-y-2">
                <li>Encryption of sensitive data in transit and at rest</li>
                <li>Secure payment processing through Stripe</li>
                <li>Regular security audits and updates</li>
                <li>Access controls and authentication systems</li>
                <li>Monitoring for suspicious activities</li>
                <li>Employee training on data protection</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-blue-400 mb-4">6. Data Retention</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                We retain your information for as long as necessary to:
              </p>
              <ul className="list-disc list-inside text-gray-300 mb-6 space-y-2">
                <li>Provide our services to you</li>
                <li>Comply with legal and regulatory requirements</li>
                <li>Resolve disputes and enforce agreements</li>
                <li>Prevent fraud and ensure platform security</li>
              </ul>
              <p className="text-gray-300 leading-relaxed">
                Account information is typically retained for 7 years after account closure for regulatory compliance.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-blue-400 mb-4">7. Your Rights and Choices</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                You have certain rights regarding your personal information:
              </p>
              <ul className="list-disc list-inside text-gray-300 mb-6 space-y-2">
                <li><strong>Access:</strong> Request a copy of your personal information</li>
                <li><strong>Correction:</strong> Update or correct inaccurate information</li>
                <li><strong>Deletion:</strong> Request deletion of your personal information</li>
                <li><strong>Portability:</strong> Receive your data in a portable format</li>
                <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
                <li><strong>Restriction:</strong> Limit how we process your information</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-blue-400 mb-4">8. Cookies and Tracking Technologies</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                We use cookies and similar technologies to:
              </p>
              <ul className="list-disc list-inside text-gray-300 mb-6 space-y-2">
                <li>Remember your preferences and settings</li>
                <li>Analyze platform usage and performance</li>
                <li>Provide personalized experiences</li>
                <li>Ensure platform security and prevent fraud</li>
              </ul>
              <p className="text-gray-300 leading-relaxed">
                You can control cookie settings through your browser preferences.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-blue-400 mb-4">9. International Data Transfers</h2>
              <p className="text-gray-300 leading-relaxed">
                Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place to protect your information in accordance with applicable data protection laws.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-blue-400 mb-4">10. Children's Privacy</h2>
              <p className="text-gray-300 leading-relaxed">
                DropDollar is not intended for users under 18 years of age. We do not knowingly collect personal information from children under 18. If we become aware that we have collected information from a child under 18, we will take steps to delete such information.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-blue-400 mb-4">11. Changes to This Privacy Policy</h2>
              <p className="text-gray-300 leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. We encourage you to review this Privacy Policy periodically.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-blue-400 mb-4">12. Contact Us</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                If you have any questions about this Privacy Policy or our data practices, please contact us:
              </p>
              <div className="mt-4 p-4 bg-gray-700/50 rounded-lg">
                <p className="text-gray-300">
                  <strong>Email:</strong> privacy@drop-dollar.com<br/>
                  <strong>Support:</strong> support@drop-dollar.com<br/>
                  <strong>Website:</strong> https://www.drop-dollar.com<br/>
                  <strong>Data Protection Officer:</strong> dpo@drop-dollar.com
                </p>
              </div>
            </section>

            <div className="mt-12 p-6 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-lg border border-blue-500/30">
              <p className="text-center text-gray-300">
                This Privacy Policy is effective as of the date listed above and applies to all information collected by DropDollar.
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;