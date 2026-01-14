'use client';

import React from 'react';
import Link from 'next/link';
import CleanNavigation from '@/components/navigation/CleanNavigation';
import { FileText, ArrowLeft, AlertTriangle, Shield } from 'lucide-react';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-yellow-900">
      <CleanNavigation variant="gradient" currentPage="/mog-me" />
      
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-center mb-8">
            <FileText className="w-12 h-12 text-yellow-400 mr-4" />
            <h1 className="text-5xl sm:text-6xl font-black text-center">
              <span className="bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500 bg-clip-text text-transparent">
                Terms of Service
              </span>
            </h1>
          </div>

          <p className="text-xl text-green-200 text-center mb-4">
            <strong>Last Updated: January 13, 2026</strong>
          </p>

          {/* Agreement Notice */}
          <div className="bg-yellow-400/20 backdrop-blur-xl p-6 rounded-2xl border-2 border-yellow-400/50 mb-8">
            <p className="text-green-100 text-lg font-semibold">
              <strong className="text-yellow-300">Agreement:</strong> By downloading, installing, or using MogME AI ("the App"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the App.
            </p>
          </div>

          {/* Terms Content */}
          <div className="bg-green-800/40 backdrop-blur-xl p-10 rounded-3xl border-2 border-yellow-400/40 space-y-8 text-green-100">
            
            {/* Section 1 */}
            <section>
              <h2 className="text-3xl font-bold text-yellow-300 mb-4">1. Acceptance of Terms</h2>
              <p className="text-lg leading-relaxed mb-4">
                These Terms of Service ("Terms") govern your use of MogME AI, a personal aesthetics and fitness analysis application. By accessing or using the App, you agree to:
              </p>
              <ul className="space-y-2 text-green-100 list-disc list-inside text-lg">
                <li>Comply with these Terms and all applicable laws</li>
                <li>Be at least 18 years of age or the age of majority in your jurisdiction</li>
                <li>Accept our Privacy Policy (incorporated by reference)</li>
              </ul>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-3xl font-bold text-yellow-300 mb-4">2. Description of Service</h2>
              <p className="text-lg leading-relaxed mb-4"><strong>MogME AI provides:</strong></p>
              <ul className="space-y-2 text-green-100 list-disc list-inside text-lg">
                <li><strong>Facial Analysis:</strong> On-device AI analysis of facial features and aesthetics (PSL scoring system)</li>
                <li><strong>Fitness Tracking:</strong> Workout planning, exercise guides, and activity tracking</li>
                <li><strong>Mental Training:</strong> Cognitive games and training exercises</li>
                <li><strong>Physical Games:</strong> AR-based physical training and testing</li>
                <li><strong>Premium Features:</strong> Advanced analysis, unlimited scans, detailed reports</li>
              </ul>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-3xl font-bold text-yellow-300 mb-4">3. Free vs. Premium Features</h2>
              
              <div className="bg-green-900/40 p-6 rounded-xl border border-yellow-400/20 mb-4">
                <h3 className="text-xl font-bold text-yellow-300 mb-3">Free Features:</h3>
                <ul className="space-y-2 text-green-100 list-disc list-inside">
                  <li>Basic PSL score calculation</li>
                  <li>Overview tab with key metrics</li>
                  <li>Camera and photo capture</li>
                  <li>Limited analysis history</li>
                  <li>Basic fitness tracking</li>
                </ul>
              </div>

              <div className="bg-green-900/40 p-6 rounded-xl border border-yellow-400/20">
                <h3 className="text-xl font-bold text-yellow-300 mb-3">Premium Features (Subscription Required):</h3>
                <ul className="space-y-2 text-green-100 list-disc list-inside">
                  <li>Detailed facial analysis (eyes, proportions, jaw)</li>
                  <li>Unlimited scans and analysis</li>
                  <li>Advanced fitness programs</li>
                  <li>Physical games and AR training</li>
                  <li>Export and sharing capabilities</li>
                  <li>Comprehensive analytics</li>
                </ul>
              </div>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-3xl font-bold text-yellow-300 mb-4">4. Subscription Terms</h2>
              
              <div className="bg-green-900/40 p-6 rounded-xl border border-yellow-400/20 mb-4">
                <h3 className="text-xl font-bold text-yellow-300 mb-3">Subscription Options:</h3>
                <ul className="space-y-2 text-green-100 list-disc list-inside">
                  <li><strong>Monthly Premium:</strong> $4.99 per month</li>
                  <li><strong>Yearly Premium:</strong> $29.99 per year (save 50%)</li>
                  <li><strong>Lifetime Premium:</strong> $49.99 one-time payment (permanent access)</li>
                </ul>
              </div>

              <div className="bg-red-900/30 p-6 rounded-xl border-2 border-red-400/50 mb-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-xl font-bold text-red-300 mb-2">Auto-Renewal:</h3>
                    <p className="text-green-100 mb-3">
                      <strong>IMPORTANT:</strong> Monthly and yearly subscriptions automatically renew unless cancelled at least 24 hours before the end of the current period.
                    </p>
                    <ul className="space-y-2 text-green-100 list-disc list-inside">
                      <li>Your Apple ID account will be charged for renewal within 24 hours prior to the end of the current period</li>
                      <li>You can turn off auto-renewal at any time in your Apple ID Account Settings</li>
                      <li>Go to Settings → [Your Name] → Subscriptions → MogME AI → Cancel Subscription</li>
                      <li>If you cancel, your subscription will remain active until the end of the current billing period</li>
                      <li>No refunds will be provided for the unused portion of the current subscription period</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-green-900/40 p-6 rounded-xl border border-yellow-400/20 mb-4">
                <h3 className="text-xl font-bold text-yellow-300 mb-3">Managing Subscriptions:</h3>
                <ul className="space-y-2 text-green-100 list-disc list-inside">
                  <li>Manage via iOS Settings → [Your Name] → Subscriptions</li>
                  <li>Cancel anytime without penalty</li>
                  <li>Cancellation takes effect at the end of the current billing period</li>
                  <li>No refunds for partial periods</li>
                </ul>
              </div>

              <div className="bg-green-900/40 p-6 rounded-xl border border-yellow-400/20">
                <h3 className="text-xl font-bold text-yellow-300 mb-3">Free Trial (If Offered):</h3>
                <ul className="space-y-2 text-green-100 list-disc list-inside">
                  <li>Free trial periods (if offered) provide full access to premium features</li>
                  <li>After trial ends, subscription begins automatically unless cancelled</li>
                  <li>Cancel during trial period to avoid charges</li>
                  <li>One free trial per user</li>
                </ul>
              </div>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-3xl font-bold text-yellow-300 mb-4">5. Payment and Billing</h2>
              <ul className="space-y-2 text-green-100 list-disc list-inside text-lg">
                <li>All payments are processed through Apple's App Store (StoreKit)</li>
                <li>Prices are in USD and may vary by region</li>
                <li>Apple handles all payment processing and billing</li>
                <li>We do not store or process credit card information</li>
                <li>Taxes may apply based on your location</li>
                <li>By purchasing, you agree to Apple's Payment Terms and Conditions</li>
                <li>Your purchase is subject to Apple's App Store Terms of Service</li>
              </ul>
            </section>

            {/* Section 6 */}
            <section>
              <h2 className="text-3xl font-bold text-yellow-300 mb-4">6. Refund Policy</h2>
              <p className="text-lg leading-relaxed mb-4">Refunds are handled by Apple according to their standard refund policies:</p>
              <ul className="space-y-2 text-green-100 list-disc list-inside text-lg">
                <li>Request refunds through the App Store</li>
                <li>Go to <a href="https://reportaproblem.apple.com" target="_blank" rel="noopener noreferrer" className="text-yellow-400 hover:underline">reportaproblem.apple.com</a></li>
                <li>Refunds are subject to Apple's discretion</li>
                <li>We cannot process refunds directly</li>
              </ul>
              <div className="bg-red-900/30 p-4 rounded-lg border border-red-400/50 mt-4">
                <p className="text-green-100">
                  <strong className="text-red-300">Note:</strong> Subscriptions cannot be cancelled mid-cycle for a pro-rated refund. Cancellation prevents future charges but does not refund the current period.
                </p>
              </div>
            </section>

            {/* Section 7 */}
            <section>
              <h2 className="text-3xl font-bold text-yellow-300 mb-4">7. User Responsibilities</h2>
              <p className="text-lg leading-relaxed mb-4"><strong>You agree to:</strong></p>
              <ul className="space-y-2 text-green-100 list-disc list-inside text-lg">
                <li>Use the App for personal, non-commercial purposes only</li>
                <li>Provide accurate information when required</li>
                <li>Not reverse engineer, decompile, or modify the App</li>
                <li>Not use the App for any illegal or unauthorized purpose</li>
                <li>Not share your subscription with others</li>
                <li>Not attempt to access premium features without payment</li>
              </ul>
            </section>

            {/* Section 8 */}
            <section>
              <h2 className="text-3xl font-bold text-yellow-300 mb-4">8. Disclaimer of Results</h2>
              <div className="bg-red-900/30 p-6 rounded-xl border-2 border-red-400/50 mb-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
                  <p className="text-green-100">
                    <strong className="text-red-300">IMPORTANT DISCLAIMER:</strong> MogME AI provides aesthetic analysis and fitness guidance for entertainment and informational purposes only. Results are not medical advice or professional consultation.
                  </p>
                </div>
              </div>
              
              <p className="text-lg leading-relaxed mb-4"><strong>We do not guarantee:</strong></p>
              <ul className="space-y-2 text-green-100 list-disc list-inside text-lg mb-4">
                <li>Accuracy of PSL scores or aesthetic assessments</li>
                <li>Fitness results or health improvements</li>
                <li>Specific outcomes from following recommendations</li>
                <li>That analysis reflects professional medical opinion</li>
              </ul>

              <p className="text-lg leading-relaxed mb-4"><strong>You acknowledge that:</strong></p>
              <ul className="space-y-2 text-green-100 list-disc list-inside text-lg">
                <li>PSL scores are algorithmic estimates, not objective truth</li>
                <li>Aesthetic standards are subjective and culturally variable</li>
                <li>Fitness advice should be supplemented with professional guidance</li>
                <li>You should consult healthcare professionals before starting new fitness routines</li>
              </ul>
            </section>

            {/* Section 9 */}
            <section>
              <h2 className="text-3xl font-bold text-yellow-300 mb-4">9. Medical Disclaimer</h2>
              <div className="bg-red-900/30 p-6 rounded-xl border-2 border-red-400/50 mb-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
                  <p className="text-green-100">
                    <strong className="text-red-300">NOT MEDICAL ADVICE:</strong> MogME AI is NOT a medical device. Do not use the App to diagnose, treat, or prevent any medical condition.
                  </p>
                </div>
              </div>
              
              <ul className="space-y-2 text-green-100 list-disc list-inside text-lg">
                <li>Consult a doctor before starting any fitness program</li>
                <li>The App cannot detect health conditions</li>
                <li>Fitness tracking is for informational purposes only</li>
                <li>Stop exercise immediately if you experience pain or discomfort</li>
                <li>HealthKit integration does not constitute medical monitoring</li>
              </ul>
            </section>

            {/* Section 10 */}
            <section>
              <h2 className="text-3xl font-bold text-yellow-300 mb-4">10. Intellectual Property</h2>
              <p className="text-lg leading-relaxed mb-4"><strong>App Ownership:</strong></p>
              <ul className="space-y-2 text-green-100 list-disc list-inside text-lg mb-4">
                <li>MogME AI, including all code, design, and content, is owned by Ryan Joshua Fermoselle</li>
                <li>The App is licensed to you, not sold</li>
                <li>You may not copy, modify, distribute, or reverse engineer the App</li>
                <li>App name, logo, and branding are protected trademarks</li>
              </ul>

              <p className="text-lg leading-relaxed mb-4"><strong>Your Content:</strong></p>
              <ul className="space-y-2 text-green-100 list-disc list-inside text-lg">
                <li>You retain all rights to photos you upload or capture</li>
                <li>Since analysis is on-device, we do not access or claim rights to your photos</li>
                <li>You are responsible for the content you process through the App</li>
              </ul>
            </section>

            {/* Section 11 */}
            <section>
              <h2 className="text-3xl font-bold text-yellow-300 mb-4">11. Acceptable Use Policy</h2>
              <p className="text-lg leading-relaxed mb-4"><strong>You may NOT use the App to:</strong></p>
              <ul className="space-y-2 text-green-100 list-disc list-inside text-lg">
                <li>Analyze photos of other people without their consent</li>
                <li>Harass, bully, or discriminate against others</li>
                <li>Share analysis results to shame or harm others</li>
                <li>Violate anyone's privacy or intellectual property rights</li>
                <li>Engage in any illegal activity</li>
                <li>Attempt to hack, exploit, or disrupt the App</li>
              </ul>
            </section>

            {/* Section 12 */}
            <section>
              <h2 className="text-3xl font-bold text-yellow-300 mb-4">12. Limitation of Liability</h2>
              <p className="text-lg leading-relaxed mb-4"><strong>TO THE FULLEST EXTENT PERMITTED BY LAW:</strong></p>
              <ul className="space-y-2 text-green-100 list-disc list-inside text-lg">
                <li>The App is provided "AS IS" without warranties of any kind</li>
                <li>We are not liable for any damages arising from use of the App</li>
                <li>We do not guarantee uninterrupted or error-free operation</li>
                <li>Maximum liability is limited to the amount you paid for subscription</li>
                <li>We are not responsible for third-party content or services</li>
              </ul>
            </section>

            {/* Section 13 */}
            <section>
              <h2 className="text-3xl font-bold text-yellow-300 mb-4">13. Indemnification</h2>
              <p className="text-lg leading-relaxed mb-4">You agree to indemnify and hold harmless Ryan Joshua Fermoselle and MogME AI from any claims, damages, or expenses arising from:</p>
              <ul className="space-y-2 text-green-100 list-disc list-inside text-lg">
                <li>Your use of the App</li>
                <li>Your violation of these Terms</li>
                <li>Your violation of any rights of another party</li>
                <li>Any content you process or share through the App</li>
              </ul>
            </section>

            {/* Section 14 */}
            <section>
              <h2 className="text-3xl font-bold text-yellow-300 mb-4">14. App Updates and Changes</h2>
              <ul className="space-y-2 text-green-100 list-disc list-inside text-lg">
                <li>We may update the App to add features, fix bugs, or improve performance</li>
                <li>Updates may be required for continued use</li>
                <li>We may discontinue features or the entire App at any time</li>
                <li>Active subscriptions will receive appropriate refunds if App is discontinued</li>
              </ul>
            </section>

            {/* Section 15 */}
            <section>
              <h2 className="text-3xl font-bold text-yellow-300 mb-4">15. Account Termination</h2>
              <p className="text-lg leading-relaxed mb-4"><strong>We may terminate your access if you:</strong></p>
              <ul className="space-y-2 text-green-100 list-disc list-inside text-lg mb-4">
                <li>Violate these Terms</li>
                <li>Engage in fraudulent activity</li>
                <li>Abuse or exploit the App</li>
                <li>Use the App for illegal purposes</li>
              </ul>
              <p className="text-lg leading-relaxed">Termination does not entitle you to a refund for current subscription period.</p>
            </section>

            {/* Section 16 */}
            <section>
              <h2 className="text-3xl font-bold text-yellow-300 mb-4">16. Privacy and Data Use</h2>
              <p className="text-lg leading-relaxed mb-4">Your use of the App is subject to our Privacy Policy, which explains:</p>
              <ul className="space-y-2 text-green-100 list-disc list-inside text-lg mb-4">
                <li>What data we access (only on-device)</li>
                <li>How we protect your privacy</li>
                <li>Your rights regarding your data</li>
              </ul>
              <p className="text-lg leading-relaxed">
                Read our full Privacy Policy at: <Link href="/mog-me/privacy-policy" className="text-yellow-400 hover:underline">Privacy Policy</Link>
              </p>
            </section>

            {/* Section 17 */}
            <section>
              <h2 className="text-3xl font-bold text-yellow-300 mb-4">17. Governing Law</h2>
              <ul className="space-y-2 text-green-100 list-disc list-inside text-lg">
                <li>These Terms are governed by the laws of the State of California, United States of America</li>
                <li>Any disputes will be resolved in the courts of California, United States</li>
                <li>If any provision is found invalid, the remaining provisions remain in effect</li>
                <li>For users outside the United States, these Terms are governed by California law, but local consumer protection laws may apply</li>
              </ul>
            </section>

            {/* Section 18 */}
            <section>
              <h2 className="text-3xl font-bold text-yellow-300 mb-4">18. Changes to Terms</h2>
              <p className="text-lg leading-relaxed mb-4">We may update these Terms from time to time. Changes will be effective:</p>
              <ul className="space-y-2 text-green-100 list-disc list-inside text-lg">
                <li>Upon posting the updated Terms in the App</li>
                <li>With an updated "Last Updated" date</li>
                <li>Continued use constitutes acceptance of new Terms</li>
                <li>Material changes may be communicated via in-app notification</li>
              </ul>
            </section>

            {/* Section 19 */}
            <section>
              <h2 className="text-3xl font-bold text-yellow-300 mb-4">19. Contact Information</h2>
              <p className="text-lg leading-relaxed mb-4">For questions, concerns, or support regarding these Terms:</p>
              <ul className="space-y-2 text-green-100 list-disc list-inside text-lg">
                <li><strong>Email:</strong> <a href="mailto:ryanfermoselle@outlook.com" className="text-yellow-400 hover:underline">ryanfermoselle@outlook.com</a></li>
                <li><strong>Developer:</strong> Ryan Joshua Fermoselle</li>
                <li><strong>Response Time:</strong> Within 14 business days</li>
              </ul>
            </section>

            {/* Section 20 */}
            <section>
              <h2 className="text-3xl font-bold text-yellow-300 mb-4">20. Apple App Store Terms</h2>
              <p className="text-lg leading-relaxed mb-4">As a user of the App Store, you also agree to:</p>
              <ul className="space-y-2 text-green-100 list-disc list-inside text-lg">
                <li>Apple's App Store Terms of Service</li>
                <li>Apple's Media Services Terms and Conditions</li>
                <li>Apple's Privacy Policy</li>
              </ul>
              <p className="text-lg leading-relaxed mt-4">
                If there is a conflict between these Terms and Apple's terms, Apple's terms will govern with respect to App Store-related matters.
              </p>
            </section>

            {/* Section 21 */}
            <section>
              <h2 className="text-3xl font-bold text-yellow-300 mb-4">21. Entire Agreement</h2>
              <p className="text-lg leading-relaxed">
                These Terms, together with our Privacy Policy, constitute the entire agreement between you and MogME AI regarding use of the App, superseding any prior agreements.
              </p>
            </section>

            {/* Final Agreement Notice */}
            <div className="bg-yellow-400/20 p-6 rounded-xl border-2 border-yellow-400/50 mt-8">
              <p className="text-green-100 text-lg font-semibold text-center">
                <strong className="text-yellow-300">By using MogME AI, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.</strong>
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center py-8 border-t border-yellow-400/30 mt-8">
            <p className="text-green-200 text-xl font-bold mb-2">MogME AI - Terms of Service</p>
            <p className="text-green-300 mb-4">© 2026 Ryan Joshua Fermoselle. All rights reserved.</p>
            <p className="text-green-300 mb-4">These Terms are effective as of January 13, 2026.</p>
            <div className="flex flex-wrap items-center justify-center gap-4 text-lg mb-4">
              <Link href="/mog-me/privacy-policy" className="text-yellow-400 hover:text-yellow-300 font-semibold underline transition-colors">
                Privacy Policy
              </Link>
              <span className="text-green-300">|</span>
              <Link href="/mog-me/support" className="text-yellow-400 hover:text-yellow-300 font-semibold underline transition-colors">
                Support
              </Link>
              <span className="text-green-300">|</span>
              <a href="mailto:ryanfermoselle@outlook.com" className="text-yellow-400 hover:text-yellow-300 font-semibold underline transition-colors">
                Contact Support
              </a>
            </div>
            <p className="text-green-400 text-sm mt-4">
              MogME AI is an independent application. Apple Inc. is not a party to these Terms and is not responsible for the App or its content.
            </p>
          </div>

          {/* Back to Mog Me */}
          <div className="text-center mt-8">
            <Link
              href="/mog-me"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-green-600 to-yellow-500 text-white font-bold rounded-full hover:from-green-500 hover:to-yellow-400 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Mog Me
            </Link>
          </div>
        </div>
      </section>

      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-yellow-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 right-1/4 w-80 h-80 bg-green-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-1/4 left-1/2 w-72 h-72 bg-yellow-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>
    </div>
  );
}

