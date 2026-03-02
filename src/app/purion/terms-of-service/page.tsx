'use client';

import React from 'react';
import Link from 'next/link';
import CleanNavigation from '@/components/navigation/CleanNavigation';
import { FileText, ArrowLeft, AlertTriangle } from 'lucide-react';

export default function PurionTermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-blue-50">
      <CleanNavigation variant="gradient" currentPage="/purion" />
      
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-center mb-8">
            <FileText className="w-12 h-12 text-blue-600 mr-4" />
            <h1 className="text-5xl sm:text-6xl font-black text-center text-blue-900">
              Terms of Service
            </h1>
          </div>

          <p className="text-xl text-slate-600 text-center mb-4">
            <strong>Last Updated: January 2026</strong>
          </p>

          {/* Agreement Notice */}
          <div className="bg-blue-50 p-6 rounded-2xl border-2 border-blue-200 mb-8">
            <p className="text-slate-700 text-lg font-semibold">
              <strong className="text-blue-900">Agreement:</strong> By downloading, installing, or using Purion (&quot;the App&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the App.
            </p>
          </div>

          {/* Terms Content */}
          <div className="bg-white p-10 rounded-3xl shadow-lg border border-blue-100 space-y-8 text-slate-700">
            
            <section>
              <h2 className="text-3xl font-bold text-blue-900 mb-4">1. Acceptance of Terms</h2>
              <p className="text-lg leading-relaxed mb-4">
                These Terms of Service (&quot;Terms&quot;) govern your use of Purion, a bioprocess training and execution companion application. By accessing or using the App, you agree to:
              </p>
              <ul className="space-y-2 text-slate-600 list-disc list-inside text-lg">
                <li>Comply with these Terms and all applicable laws</li>
                <li>Be at least 18 years of age or the age of majority in your jurisdiction</li>
                <li>Accept our Privacy Policy (incorporated by reference)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-3xl font-bold text-blue-900 mb-4">2. Description of Service</h2>
              <p className="text-lg leading-relaxed mb-4"><strong>Purion provides:</strong></p>
              <ul className="space-y-2 text-slate-600 list-disc list-inside text-lg">
                <li><strong>Simulations:</strong> Bioreactor, chromatography, and UF/DF process simulations</li>
                <li><strong>Setup Games:</strong> Guided, scored equipment setup practice</li>
                <li><strong>Tools:</strong> Scale-up calculators, formula tabs, and troubleshooting guides</li>
                <li><strong>Smart OCR:</strong> Photo capture and auto-fill for BDR fields</li>
                <li><strong>Learning Paths:</strong> Badges, KPI dashboards, and readiness tracking</li>
                <li><strong>Compliance:</strong> Checklists, audit trails, and review flows</li>
              </ul>
            </section>

            <section>
              <h2 className="text-3xl font-bold text-blue-900 mb-4">3. User Responsibilities</h2>
              <p className="text-lg leading-relaxed mb-4"><strong>You agree to:</strong></p>
              <ul className="space-y-2 text-slate-600 list-disc list-inside text-lg">
                <li>Use the App for training and professional development purposes</li>
                <li>Provide accurate information when required</li>
                <li>Not reverse engineer, decompile, or modify the App</li>
                <li>Not use the App for any illegal or unauthorized purpose</li>
                <li>Comply with your organization&apos;s policies when using the App</li>
              </ul>
            </section>

            <section>
              <h2 className="text-3xl font-bold text-blue-900 mb-4">4. Disclaimer</h2>
              <div className="bg-red-900/30 p-6 rounded-xl border-2 border-red-400/50 mb-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
                  <p className="text-teal-100">
                    <strong className="text-red-300">IMPORTANT:</strong> Purion is a training and learning tool. It is not a substitute for formal GMP training, SOPs, or qualified personnel. Always follow your organization&apos;s approved procedures and regulatory requirements when performing actual bioprocess operations.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-3xl font-bold text-blue-900 mb-4">5. Intellectual Property</h2>
              <p className="text-lg leading-relaxed mb-4"><strong>App Ownership:</strong></p>
              <ul className="space-y-2 text-slate-600 list-disc list-inside text-lg">
                <li>Purion, including all code, design, and content, is owned by Ryan Joshua Fermoselle</li>
                <li>The App is licensed to you, not sold</li>
                <li>You may not copy, modify, distribute, or reverse engineer the App</li>
              </ul>
            </section>

            <section>
              <h2 className="text-3xl font-bold text-blue-900 mb-4">6. Limitation of Liability</h2>
              <p className="text-lg leading-relaxed mb-4"><strong>TO THE FULLEST EXTENT PERMITTED BY LAW:</strong></p>
              <ul className="space-y-2 text-slate-600 list-disc list-inside text-lg">
                <li>The App is provided &quot;AS IS&quot; without warranties of any kind</li>
                <li>We are not liable for any damages arising from use of the App</li>
                <li>We do not guarantee uninterrupted or error-free operation</li>
              </ul>
            </section>

            <section>
              <h2 className="text-3xl font-bold text-blue-900 mb-4">7. Privacy and Data Use</h2>
              <p className="text-lg leading-relaxed mb-4">Your use of the App is subject to our Privacy Policy. Read our full Privacy Policy at: <Link href="/purion/privacy-policy" className="text-blue-600 hover:underline">Privacy Policy</Link></p>
            </section>

            <section>
              <h2 className="text-3xl font-bold text-blue-900 mb-4">8. Contact Information</h2>
              <p className="text-lg leading-relaxed mb-4">For questions, concerns, or support regarding these Terms:</p>
              <ul className="space-y-2 text-slate-600 list-disc list-inside text-lg">
                <li><strong>Email:</strong> <a href="mailto:ryanfermoselle@outlook.com" className="text-blue-600 hover:underline">ryanfermoselle@outlook.com</a></li>
                <li><strong>Developer:</strong> Ryan Joshua Fermoselle</li>
                <li><strong>Response Time:</strong> Within 14 business days</li>
              </ul>
            </section>

            {/* Final Agreement Notice */}
            <div className="bg-blue-50 p-6 rounded-xl border-2 border-blue-200 mt-8">
              <p className="text-slate-700 text-lg font-semibold text-center">
                <strong className="text-blue-900">By using Purion, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.</strong>
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center py-8 border-t border-blue-200 mt-8">
            <p className="text-blue-900 text-xl font-bold mb-2">Purion - Terms of Service</p>
            <p className="text-slate-600 mb-4">© 2026 Ryan Joshua Fermoselle. All rights reserved.</p>
            <div className="flex flex-wrap items-center justify-center gap-4 text-lg mb-4">
              <Link href="/purion/privacy-policy" className="text-blue-600 hover:text-blue-800 font-semibold underline transition-colors">
                Privacy Policy
              </Link>
              <span className="text-slate-400">|</span>
              <Link href="/purion/support" className="text-blue-600 hover:text-blue-800 font-semibold underline transition-colors">
                Support
              </Link>
              <span className="text-slate-400">|</span>
              <a href="mailto:ryanfermoselle@outlook.com" className="text-blue-600 hover:text-blue-800 font-semibold underline transition-colors">
                Contact Support
              </a>
            </div>
          </div>

          {/* Back to Purion */}
          <div className="text-center mt-8">
            <Link
              href="/purion"
              className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Purion
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
