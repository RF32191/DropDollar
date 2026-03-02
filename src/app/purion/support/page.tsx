'use client';

import React from 'react';
import Link from 'next/link';
import CleanNavigation from '@/components/navigation/CleanNavigation';
import { Mail, HelpCircle, Shield } from 'lucide-react';

export default function PurionSupportPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-blue-50">
      <CleanNavigation variant="gradient" currentPage="/purion" />
      
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl sm:text-6xl font-black mb-4 text-blue-900">
              Purion Support
            </h1>
            <p className="text-xl text-slate-600">
              Get help with bioprocess training and execution
            </p>
          </div>

          {/* Contact Box */}
          <div className="bg-blue-50 p-8 rounded-3xl border-2 border-blue-200 mb-12">
            <div className="flex items-center gap-4 mb-4">
              <Mail className="w-8 h-8 text-blue-600" />
              <h2 className="text-3xl font-bold text-blue-900">Contact Us</h2>
            </div>
            <p className="text-slate-700 text-lg mb-2">
              <strong>Email:</strong>{' '}
              <a 
                href="mailto:ryanfermoselle@outlook.com" 
                className="text-blue-600 hover:text-blue-800 font-semibold underline"
              >
                ryanfermoselle@outlook.com
              </a>
            </p>
            <p className="text-slate-600">
              We typically respond within 24-48 hours.
            </p>
          </div>

          {/* Support Topics */}
          <div className="bg-white p-10 rounded-3xl shadow-lg border border-blue-100 mb-12">
            <div className="flex items-center gap-3 mb-8">
              <HelpCircle className="w-8 h-8 text-blue-600" />
              <h2 className="text-3xl font-bold text-blue-900">How We Can Help</h2>
            </div>

            <div className="space-y-8">
              <div className="border-b border-blue-100 pb-6">
                <h3 className="text-2xl font-bold text-blue-900 mb-4">General Inquiries</h3>
                <p className="text-slate-600 text-lg">
                  Questions about Purion features, simulations, or training capabilities? Reach out and we&apos;ll get back to you.
                </p>
              </div>

              <div className="border-b border-blue-100 pb-6">
                <h3 className="text-2xl font-bold text-blue-900 mb-4">Technical Support</h3>
                <p className="text-slate-600 text-lg">
                  Experiencing issues with the app, simulations, or OCR features? We&apos;re here to help troubleshoot.
                </p>
              </div>

              <div className="border-b border-blue-100 pb-6">
                <h3 className="text-2xl font-bold text-blue-900 mb-4">Enterprise & Partnerships</h3>
                <p className="text-slate-600 text-lg">
                  Interested in Purion for your organization? Contact us to discuss enterprise licensing and custom solutions.
                </p>
              </div>

              <div className="pb-6">
                <h3 className="text-2xl font-bold text-blue-900 mb-4">Feedback & Suggestions</h3>
                <p className="text-slate-600 text-lg">
                  We value your input. Share ideas for new simulations, features, or improvements.
                </p>
              </div>
            </div>
          </div>

          {/* Privacy & Legal */}
          <div className="bg-white p-8 rounded-3xl shadow-lg border border-blue-100 mb-12">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-8 h-8 text-blue-600" />
              <h2 className="text-3xl font-bold text-blue-900">Privacy & Legal</h2>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 text-lg">
              <Link
                href="/purion/privacy-policy"
                className="text-blue-600 hover:text-blue-800 font-semibold underline transition-colors"
              >
                Privacy Policy
              </Link>
              <span className="text-slate-400">|</span>
              <Link
                href="/purion/terms-of-service"
                className="text-blue-600 hover:text-blue-800 font-semibold underline transition-colors"
              >
                Terms of Service
              </Link>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center py-8 border-t border-blue-200">
            <p className="text-blue-900 text-xl font-bold mb-2">Purion - Bioprocess Training Companion</p>
            <p className="text-slate-600">© 2026 Ryan Joshua Fermoselle. All rights reserved.</p>
          </div>

          {/* Back to Purion */}
          <div className="text-center mt-8">
            <Link
              href="/purion"
              className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              ← Back to Purion
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
