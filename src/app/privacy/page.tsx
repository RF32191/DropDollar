'use client';

import React from 'react';
import CleanNavigation from '@/components/navigation/CleanNavigation';
import Link from 'next/link';

export default function PrivacyPolicyPage() {
  const lastUpdated = 'December 25, 2024';
  const effectiveDate = 'December 25, 2024';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/30 to-gray-900">
      <CleanNavigation />
      
      <div className="container mx-auto px-4 py-8 pt-24 max-w-4xl">
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10">
          <h1 className="text-4xl font-bold text-white mb-2">Privacy Policy</h1>
          <p className="text-gray-400 mb-8">Last Updated: {lastUpdated} | Effective Date: {effectiveDate}</p>
          
          <div className="prose prose-invert max-w-none space-y-8 text-gray-300">
            
            {/* Introduction */}
            <section>
              <h2 className="text-2xl font-semibold text-white border-b border-white/20 pb-2">1. Introduction</h2>
              <p>
                Drop Dollar, LLC ("Drop Dollar," "we," "us," or "our") operates the website drop-dollar.com 
                and related mobile applications (collectively, the "Platform"). This Privacy Policy explains 
                how we collect, use, disclose, and safeguard your information when you visit our Platform 
                and use our skill-based gaming services.
              </p>
              <p>
                <strong>By using our Platform, you consent to the data practices described in this policy.</strong>
              </p>
            </section>

            {/* Information We Collect */}
            <section>
              <h2 className="text-2xl font-semibold text-white border-b border-white/20 pb-2">2. Information We Collect</h2>
              
              <h3 className="text-xl font-medium text-white mt-4">2.1 Personal Information You Provide</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Account Information:</strong> Email address, username, password, phone number</li>
                <li><strong>Identity Verification:</strong> Date of birth, government ID (for withdrawals over $100)</li>
                <li><strong>Payment Information:</strong> Billing address, payment card details (processed by Stripe)</li>
                <li><strong>Profile Information:</strong> Avatar, bio, display preferences</li>
                <li><strong>Communications:</strong> Messages sent to support or other users</li>
              </ul>

              <h3 className="text-xl font-medium text-white mt-4">2.2 Automatically Collected Information</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Device Information:</strong> IP address, browser type, operating system, device identifiers</li>
                <li><strong>Usage Data:</strong> Pages visited, features used, time spent, click patterns</li>
                <li><strong>Location Data:</strong> State/country for legal compliance (geo-blocking)</li>
                <li><strong>Game Data:</strong> Scores, reaction times, game history, session data</li>
                <li><strong>Cookies & Tracking:</strong> Session cookies, analytics cookies, preference cookies</li>
              </ul>

              <h3 className="text-xl font-medium text-white mt-4">2.3 Information from Third Parties</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Payment Processors:</strong> Transaction confirmation from Stripe</li>
                <li><strong>Verification Services:</strong> Identity verification results</li>
                <li><strong>Social Logins:</strong> Profile data if you use Google/Apple sign-in</li>
              </ul>
            </section>

            {/* How We Use Information */}
            <section>
              <h2 className="text-2xl font-semibold text-white border-b border-white/20 pb-2">3. How We Use Your Information</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Account Management:</strong> Create and maintain your account</li>
                <li><strong>Gaming Services:</strong> Operate skill-based competitions, track scores, award prizes</li>
                <li><strong>Legal Compliance:</strong> Verify age, location, and identity as required by law</li>
                <li><strong>Payment Processing:</strong> Process token purchases and withdrawals</li>
                <li><strong>Fraud Prevention:</strong> Detect and prevent cheating, fraud, or illegal activity</li>
                <li><strong>Communications:</strong> Send account updates, security alerts, marketing (with consent)</li>
                <li><strong>Platform Improvement:</strong> Analyze usage patterns to improve our services</li>
                <li><strong>Legal Obligations:</strong> Respond to legal requests, enforce our terms</li>
              </ul>
            </section>

            {/* Sharing Information */}
            <section>
              <h2 className="text-2xl font-semibold text-white border-b border-white/20 pb-2">4. How We Share Your Information</h2>
              
              <h3 className="text-xl font-medium text-white mt-4">4.1 Service Providers</h3>
              <p>We share data with trusted partners who help us operate:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Stripe:</strong> Payment processing</li>
                <li><strong>Twilio:</strong> Phone verification and SMS</li>
                <li><strong>Supabase:</strong> Database hosting and authentication</li>
                <li><strong>Vercel:</strong> Website hosting</li>
                <li><strong>Analytics providers:</strong> Usage analytics</li>
              </ul>

              <h3 className="text-xl font-medium text-white mt-4">4.2 Legal Requirements</h3>
              <p>We may disclose information when required by law, including:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Court orders and subpoenas</li>
                <li>Government requests</li>
                <li>Protection of our rights</li>
                <li>Emergency situations involving safety</li>
              </ul>

              <h3 className="text-xl font-medium text-white mt-4">4.3 Business Transfers</h3>
              <p>If we are acquired or merged, your data may be transferred to the new owner.</p>

              <h3 className="text-xl font-medium text-white mt-4">4.4 Public Information</h3>
              <p>Usernames, scores, and leaderboard rankings are publicly visible.</p>
            </section>

            {/* CCPA Section */}
            <section className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
              <h2 className="text-2xl font-semibold text-blue-400 border-b border-blue-500/30 pb-2">5. California Privacy Rights (CCPA)</h2>
              <p className="mt-4">
                If you are a California resident, you have specific rights under the California Consumer Privacy Act (CCPA):
              </p>
              
              <h3 className="text-xl font-medium text-white mt-4">5.1 Your Rights</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Right to Know:</strong> Request what personal information we collect, use, and share</li>
                <li><strong>Right to Delete:</strong> Request deletion of your personal information</li>
                <li><strong>Right to Opt-Out:</strong> Opt out of the sale of personal information (we do NOT sell your data)</li>
                <li><strong>Right to Non-Discrimination:</strong> We will not discriminate against you for exercising your rights</li>
              </ul>

              <h3 className="text-xl font-medium text-white mt-4">5.2 Categories of Information Collected</h3>
              <table className="w-full mt-4 border border-white/20 text-sm">
                <thead className="bg-white/5">
                  <tr>
                    <th className="p-2 text-left border-b border-white/20">Category</th>
                    <th className="p-2 text-left border-b border-white/20">Examples</th>
                    <th className="p-2 text-left border-b border-white/20">Sold?</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-white/10">
                    <td className="p-2">Identifiers</td>
                    <td className="p-2">Email, username, phone, IP address</td>
                    <td className="p-2 text-green-400">NO</td>
                  </tr>
                  <tr className="border-b border-white/10">
                    <td className="p-2">Financial Info</td>
                    <td className="p-2">Payment info, transaction history</td>
                    <td className="p-2 text-green-400">NO</td>
                  </tr>
                  <tr className="border-b border-white/10">
                    <td className="p-2">Geolocation</td>
                    <td className="p-2">State, country (for compliance)</td>
                    <td className="p-2 text-green-400">NO</td>
                  </tr>
                  <tr className="border-b border-white/10">
                    <td className="p-2">Internet Activity</td>
                    <td className="p-2">Game history, browsing data</td>
                    <td className="p-2 text-green-400">NO</td>
                  </tr>
                </tbody>
              </table>

              <h3 className="text-xl font-medium text-white mt-4">5.3 Exercising Your Rights</h3>
              <p>To exercise your CCPA rights, contact us at:</p>
              <ul className="list-disc pl-6">
                <li>Email: privacy@drop-dollar.com</li>
                <li>Request Form: Available in your account settings</li>
              </ul>
              <p className="mt-2">We will verify your identity and respond within 45 days.</p>
            </section>

            {/* GDPR Section */}
            <section className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-6">
              <h2 className="text-2xl font-semibold text-purple-400 border-b border-purple-500/30 pb-2">6. European Privacy Rights (GDPR)</h2>
              <p className="mt-4">
                <strong>Note:</strong> Drop Dollar currently only operates in the United States. However, if you are 
                accessing our site from the European Union, these rights apply:
              </p>
              
              <h3 className="text-xl font-medium text-white mt-4">6.1 Your Rights Under GDPR</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Access:</strong> Obtain a copy of your personal data</li>
                <li><strong>Rectification:</strong> Correct inaccurate data</li>
                <li><strong>Erasure:</strong> Request deletion ("right to be forgotten")</li>
                <li><strong>Restriction:</strong> Limit how we use your data</li>
                <li><strong>Portability:</strong> Receive your data in a portable format</li>
                <li><strong>Object:</strong> Object to certain processing</li>
                <li><strong>Automated Decisions:</strong> Not be subject to purely automated decisions</li>
              </ul>

              <h3 className="text-xl font-medium text-white mt-4">6.2 Legal Basis for Processing</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Contract:</strong> To provide our gaming services</li>
                <li><strong>Legal Obligation:</strong> Compliance with laws</li>
                <li><strong>Legitimate Interest:</strong> Fraud prevention, service improvement</li>
                <li><strong>Consent:</strong> Marketing communications</li>
              </ul>

              <h3 className="text-xl font-medium text-white mt-4">6.3 Data Transfers</h3>
              <p>
                Data is stored in the United States. We use standard contractual clauses 
                and other safeguards for international transfers.
              </p>
            </section>

            {/* Data Security */}
            <section>
              <h2 className="text-2xl font-semibold text-white border-b border-white/20 pb-2">7. Data Security</h2>
              <p>We implement industry-standard security measures:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>TLS/SSL encryption for all data transmission</li>
                <li>Encrypted database storage</li>
                <li>Regular security audits</li>
                <li>Access controls and authentication</li>
                <li>Fraud detection systems</li>
              </ul>
              <p className="mt-4">
                <strong>No system is 100% secure.</strong> We cannot guarantee absolute security 
                but will notify you of any breach as required by law.
              </p>
            </section>

            {/* Data Retention */}
            <section>
              <h2 className="text-2xl font-semibold text-white border-b border-white/20 pb-2">8. Data Retention</h2>
              <table className="w-full mt-4 border border-white/20 text-sm">
                <thead className="bg-white/5">
                  <tr>
                    <th className="p-2 text-left border-b border-white/20">Data Type</th>
                    <th className="p-2 text-left border-b border-white/20">Retention Period</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-white/10">
                    <td className="p-2">Account data</td>
                    <td className="p-2">Until account deletion + 30 days</td>
                  </tr>
                  <tr className="border-b border-white/10">
                    <td className="p-2">Transaction records</td>
                    <td className="p-2">7 years (tax/legal requirements)</td>
                  </tr>
                  <tr className="border-b border-white/10">
                    <td className="p-2">Game history</td>
                    <td className="p-2">5 years</td>
                  </tr>
                  <tr className="border-b border-white/10">
                    <td className="p-2">IP/Access logs</td>
                    <td className="p-2">90 days</td>
                  </tr>
                  <tr className="border-b border-white/10">
                    <td className="p-2">Communications</td>
                    <td className="p-2">2 years</td>
                  </tr>
                </tbody>
              </table>
            </section>

            {/* Cookies */}
            <section>
              <h2 className="text-2xl font-semibold text-white border-b border-white/20 pb-2">9. Cookies & Tracking</h2>
              
              <h3 className="text-xl font-medium text-white mt-4">9.1 Types of Cookies</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Essential:</strong> Required for authentication and security</li>
                <li><strong>Functional:</strong> Remember your preferences</li>
                <li><strong>Analytics:</strong> Understand how you use our platform</li>
                <li><strong>Performance:</strong> Optimize loading speeds</li>
              </ul>

              <h3 className="text-xl font-medium text-white mt-4">9.2 Managing Cookies</h3>
              <p>
                You can control cookies through your browser settings. Disabling essential 
                cookies may prevent the Platform from functioning correctly.
              </p>
            </section>

            {/* Children */}
            <section>
              <h2 className="text-2xl font-semibold text-white border-b border-white/20 pb-2">10. Children's Privacy</h2>
              <p>
                <strong>Drop Dollar is not intended for users under 18 years of age.</strong> We do not 
                knowingly collect data from minors. If we discover that a minor has created an account, 
                we will immediately deactivate it and delete associated data.
              </p>
              <p className="mt-2">
                If you believe a minor has registered, please contact us immediately at privacy@drop-dollar.com.
              </p>
            </section>

            {/* Your Choices */}
            <section>
              <h2 className="text-2xl font-semibold text-white border-b border-white/20 pb-2">11. Your Choices</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Account Settings:</strong> Update your profile, preferences, and privacy settings</li>
                <li><strong>Marketing:</strong> Opt out of promotional emails via unsubscribe links</li>
                <li><strong>Data Download:</strong> Request a copy of your data</li>
                <li><strong>Account Deletion:</strong> Request account deletion (subject to legal retention)</li>
                <li><strong>Location:</strong> Disable location access in your browser</li>
              </ul>
            </section>

            {/* Contact */}
            <section>
              <h2 className="text-2xl font-semibold text-white border-b border-white/20 pb-2">12. Contact Us</h2>
              <p>For privacy questions or to exercise your rights:</p>
              <div className="bg-white/5 rounded-lg p-4 mt-4">
                <p><strong>Drop Dollar, LLC</strong></p>
                <p>Email: privacy@drop-dollar.com</p>
                <p>Subject Line: "Privacy Request - [Your Request Type]"</p>
              </div>
              <p className="mt-4">
                We will respond to verified requests within 30 days (or 45 days for complex requests).
              </p>
            </section>

            {/* Changes */}
            <section>
              <h2 className="text-2xl font-semibold text-white border-b border-white/20 pb-2">13. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of material 
                changes by posting a notice on the Platform and/or sending an email. Your continued 
                use after changes constitutes acceptance.
              </p>
            </section>

          </div>
        </div>

        {/* Related Links */}
        <div className="flex flex-wrap gap-4 mt-8 justify-center">
          <Link href="/terms" className="text-purple-400 hover:text-purple-300 transition-colors">
            Terms of Service →
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
