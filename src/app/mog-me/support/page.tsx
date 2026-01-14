'use client';

import React from 'react';
import Link from 'next/link';
import CleanNavigation from '@/components/navigation/CleanNavigation';
import { Mail, HelpCircle, Shield, Smartphone, CreditCard, Trash2, Camera } from 'lucide-react';

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-yellow-900">
      <CleanNavigation variant="gradient" currentPage="/mog-me" />
      
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl sm:text-6xl font-black mb-4">
              <span className="bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500 bg-clip-text text-transparent">
                MogME AI Support
              </span>
            </h1>
            <p className="text-xl text-green-100">
              Get help with your look improvement journey
            </p>
          </div>

          {/* Contact Box */}
          <div className="bg-yellow-400/20 backdrop-blur-xl p-8 rounded-3xl border-2 border-yellow-400/50 mb-12">
            <div className="flex items-center gap-4 mb-4">
              <Mail className="w-8 h-8 text-yellow-400" />
              <h2 className="text-3xl font-bold text-yellow-300">Contact Us</h2>
            </div>
            <p className="text-green-100 text-lg mb-2">
              <strong>Email:</strong>{' '}
              <a 
                href="mailto:ryanfermoselle@outlook.com" 
                className="text-yellow-400 hover:text-yellow-300 font-semibold underline"
              >
                ryanfermoselle@outlook.com
              </a>
            </p>
            <p className="text-green-200">
              We typically respond within 24-48 hours.
            </p>
          </div>

          {/* FAQ Section */}
          <div className="bg-green-800/40 backdrop-blur-xl p-10 rounded-3xl border-2 border-yellow-400/40 mb-12">
            <div className="flex items-center gap-3 mb-8">
              <HelpCircle className="w-8 h-8 text-yellow-400" />
              <h2 className="text-3xl font-bold text-yellow-300">Frequently Asked Questions</h2>
            </div>

            <div className="space-y-8">
              {/* FAQ 1: Cancel Subscription */}
              <div className="border-b border-yellow-400/20 pb-6">
                <h3 className="text-2xl font-bold text-yellow-300 mb-4 flex items-center gap-2">
                  <CreditCard className="w-6 h-6" />
                  How do I cancel my subscription?
                </h3>
                <p className="text-green-100 mb-3 text-lg">You can cancel your subscription at any time:</p>
                <ol className="list-decimal list-inside space-y-2 text-green-100 ml-4 text-lg">
                  <li>Open Settings on your iPhone</li>
                  <li>Tap [Your Name] → Subscriptions</li>
                  <li>Find "MogME AI"</li>
                  <li>Tap "Cancel Subscription"</li>
                </ol>
                <p className="text-green-200 mt-4 text-lg">
                  Your subscription will remain active until the end of the current billing period.
                </p>
              </div>

              {/* FAQ 2: Restore Purchases */}
              <div className="border-b border-yellow-400/20 pb-6">
                <h3 className="text-2xl font-bold text-yellow-300 mb-4 flex items-center gap-2">
                  <Smartphone className="w-6 h-6" />
                  How do I restore my purchases?
                </h3>
                <p className="text-green-100 mb-3 text-lg">If you've previously purchased MogME Premium:</p>
                <ol className="list-decimal list-inside space-y-2 text-green-100 ml-4 text-lg">
                  <li>Open the MogME AI app</li>
                  <li>Navigate to any premium feature</li>
                  <li>Tap "Restore Purchases" on the paywall screen</li>
                  <li>Sign in with the Apple ID you used for the purchase</li>
                </ol>
              </div>

              {/* FAQ 3: Device Support */}
              <div className="border-b border-yellow-400/20 pb-6">
                <h3 className="text-2xl font-bold text-yellow-300 mb-4 flex items-center gap-2">
                  <Smartphone className="w-6 h-6" />
                  What devices are supported?
                </h3>
                <p className="text-green-100 mb-2 text-lg">
                  <strong className="text-yellow-300">iPhone:</strong> iPhone X or newer required for AR features (Face Exercise, Posture Training). Older iPhones can use most other features.
                </p>
                <p className="text-green-100 mb-2 text-lg">
                  <strong className="text-yellow-300">iPad:</strong> Limited support. AR features require TrueDepth camera (not available on iPad).
                </p>
                <p className="text-green-100 text-lg">
                  <strong className="text-yellow-300">iOS Version:</strong> iOS 17.0 or later
                </p>
              </div>

              {/* FAQ 4: Premium Features */}
              <div className="border-b border-yellow-400/20 pb-6">
                <h3 className="text-2xl font-bold text-yellow-300 mb-4 flex items-center gap-2">
                  <span className="text-2xl">⭐</span>
                  What features require premium?
                </h3>
                <p className="text-green-100 mb-3 text-lg">Premium features include:</p>
                <ul className="list-disc list-inside space-y-2 text-green-100 ml-4 text-lg">
                  <li>Detailed facial analysis (eyes, proportions, jaw)</li>
                  <li>Unlimited scans</li>
                  <li>All premium games</li>
                  <li>Export & history</li>
                  <li>Progress tracking</li>
                  <li>AR training features</li>
                </ul>
              </div>

              {/* FAQ 5: Refunds */}
              <div className="border-b border-yellow-400/20 pb-6">
                <h3 className="text-2xl font-bold text-yellow-300 mb-4 flex items-center gap-2">
                  <CreditCard className="w-6 h-6" />
                  How do I request a refund?
                </h3>
                <p className="text-green-100 mb-3 text-lg">For subscription refunds, please contact Apple Support:</p>
                <ol className="list-decimal list-inside space-y-2 text-green-100 ml-4 text-lg">
                  <li>Visit <a href="https://reportaproblem.apple.com" target="_blank" rel="noopener noreferrer" className="text-yellow-400 hover:text-yellow-300 underline">reportaproblem.apple.com</a></li>
                  <li>Sign in with your Apple ID</li>
                  <li>Find your MogME AI purchase</li>
                  <li>Select "Report a Problem" and follow the prompts</li>
                </ol>
              </div>

              {/* FAQ 6: AR Troubleshooting */}
              <div className="border-b border-yellow-400/20 pb-6">
                <h3 className="text-2xl font-bold text-yellow-300 mb-4 flex items-center gap-2">
                  <Camera className="w-6 h-6" />
                  I'm having trouble with AR features
                </h3>
                <p className="text-green-100 mb-3 text-lg">AR features require:</p>
                <ul className="list-disc list-inside space-y-2 text-green-100 ml-4 text-lg">
                  <li>iPhone X or newer (TrueDepth camera)</li>
                  <li>Good lighting conditions</li>
                  <li>Camera permissions enabled</li>
                  <li>Face clearly visible to camera</li>
                </ul>
                <p className="text-green-200 mt-4 text-lg">
                  If issues persist, try restarting the app or your device.
                </p>
              </div>

              {/* FAQ 7: Delete Data */}
              <div className="pb-6">
                <h3 className="text-2xl font-bold text-yellow-300 mb-4 flex items-center gap-2">
                  <Trash2 className="w-6 h-6" />
                  How do I delete my data?
                </h3>
                <p className="text-green-100 mb-3 text-lg">To delete your account and data:</p>
                <ol className="list-decimal list-inside space-y-2 text-green-100 ml-4 text-lg">
                  <li>Email us at <a href="mailto:ryanfermoselle@outlook.com" className="text-yellow-400 hover:text-yellow-300 underline">ryanfermoselle@outlook.com</a></li>
                  <li>Request account deletion</li>
                  <li>We'll process your request within 7 business days</li>
                </ol>
                <p className="text-green-200 mt-4 text-lg">
                  Note: Some data may be retained as required by law or for legitimate business purposes.
                </p>
              </div>
            </div>
          </div>

          {/* Privacy & Legal */}
          <div className="bg-green-800/40 backdrop-blur-xl p-8 rounded-3xl border-2 border-yellow-400/40 mb-12">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-8 h-8 text-yellow-400" />
              <h2 className="text-3xl font-bold text-yellow-300">Privacy & Legal</h2>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 text-lg">
              <Link
                href="/mog-me/privacy-policy"
                className="text-yellow-400 hover:text-yellow-300 font-semibold underline transition-colors"
              >
                Privacy Policy
              </Link>
              <span className="text-green-300">|</span>
              <Link
                href="/mog-me/terms-of-service"
                className="text-yellow-400 hover:text-yellow-300 font-semibold underline transition-colors"
              >
                Terms of Service
              </Link>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center py-8 border-t border-yellow-400/30">
            <p className="text-green-200 text-xl font-bold mb-2">MogME AI - Your Luxury, Your Privacy</p>
            <p className="text-green-300">© 2026 MogME AI. All rights reserved.</p>
          </div>

          {/* Back to Mog Me */}
          <div className="text-center mt-8">
            <Link
              href="/mog-me"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-green-600 to-yellow-500 text-white font-bold rounded-full hover:from-green-500 hover:to-yellow-400 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              ← Back to Mog Me
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

