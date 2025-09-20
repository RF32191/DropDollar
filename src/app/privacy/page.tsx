'use client';

import React from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { 
  ShieldCheckIcon,
  EyeIcon,
  LockClosedIcon,
  UserGroupIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  GlobeAltIcon,
  EnvelopeIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <ShieldCheckIcon className="h-12 w-12 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Privacy Policy</h1>
          </div>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Your privacy is important to us. This policy explains how Dollar Drop collects, uses, and protects your personal information.
          </p>
          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            <strong>Last Updated:</strong> {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        {/* Privacy Overview */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
          <div className="flex items-start">
            <EyeIcon className="h-6 w-6 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-blue-800 mb-2">🛡️ Privacy at a Glance</h3>
              <ul className="text-blue-700 space-y-1 text-sm">
                <li>• <strong>We don't sell your data</strong> - Your information stays with us</li>
                <li>• <strong>Secure gaming platform</strong> - Industry-standard encryption and protection</li>
                <li>• <strong>Fair play enforcement</strong> - We collect gameplay data to prevent cheating</li>
                <li>• <strong>Your rights matter</strong> - Access, delete, or update your data anytime</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Section 1: Information We Collect */}
        <section className="mb-12">
          <div className="flex items-center space-x-3 mb-6">
            <DocumentTextIcon className="h-8 w-8 text-gray-700" />
            <h2 className="text-3xl font-bold text-gray-900">1. Information We Collect</h2>
          </div>

          {/* Subsection A */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">a. Information You Provide</h3>
            <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start">
                  <span className="font-medium text-blue-600 mr-2">👤</span>
                  <div>
                    <strong>Account information:</strong> name, email address, username, password.
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="font-medium text-green-600 mr-2">💳</span>
                  <div>
                    <strong>Payment information:</strong> billing details (processed securely by third-party payment providers).
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="font-medium text-purple-600 mr-2">🎮</span>
                  <div>
                    <strong>Gameplay data:</strong> scores, entries, number of plays, wins/losses.
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="font-medium text-orange-600 mr-2">💬</span>
                  <div>
                    <strong>Communications:</strong> messages or inquiries sent to us.
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* Subsection B */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">b. Information We Collect Automatically</h3>
            <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start">
                  <span className="font-medium text-blue-600 mr-2">📱</span>
                  <div>
                    <strong>Device and usage information:</strong> IP address, browser type, device ID, operating system, and access times.
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="font-medium text-yellow-600 mr-2">🍪</span>
                  <div>
                    <strong>Cookies and tracking:</strong> used to improve functionality, measure performance, and detect fraud.
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="font-medium text-red-600 mr-2">⚡</span>
                  <div>
                    <strong>Game interaction data:</strong> gameplay actions, reaction times, and attempts (to enforce fair play and anti-bot rules).
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* Subsection C */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">c. Information From Third Parties</h3>
            <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
              <p className="text-gray-700">
                If you sign up or log in with third-party accounts (e.g., Google, Apple), we may receive certain profile information as permitted by those services.
              </p>
            </div>
          </div>
        </section>

        {/* Section 2: How We Use Your Information */}
        <section className="mb-12">
          <div className="flex items-center space-x-3 mb-6">
            <LockClosedIcon className="h-8 w-8 text-gray-700" />
            <h2 className="text-3xl font-bold text-gray-900">2. How We Use Your Information</h2>
          </div>

          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <p className="text-gray-700 mb-4">We use your information to:</p>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <span className="text-green-600 mr-2">✓</span>
                Provide, operate, and improve the Services.
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-2">✓</span>
                Process payments and manage your account.
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-2">✓</span>
                Determine eligibility and enforce daily play/win limits.
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-2">✓</span>
                Detect and prevent fraud, cheating, or bot activity.
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-2">✓</span>
                Communicate with you about contests, prizes, updates, and support.
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-2">✓</span>
                Comply with legal obligations (e.g., tax reporting for prize winners).
              </li>
            </ul>
          </div>
        </section>

        {/* Section 3: How We Share Your Information */}
        <section className="mb-12">
          <div className="flex items-center space-x-3 mb-6">
            <UserGroupIcon className="h-8 w-8 text-gray-700" />
            <h2 className="text-3xl font-bold text-gray-900">3. How We Share Your Information</h2>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-4">
            <div className="flex items-center">
              <ShieldCheckIcon className="h-6 w-6 text-green-600 mr-3" />
              <p className="font-bold text-green-800">We do not sell your personal data.</p>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <p className="text-gray-700 mb-4">We may share it only with:</p>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">🔧</span>
                <strong>Service providers</strong> (payment processors, hosting providers, analytics tools).
              </li>
              <li className="flex items-start">
                <span className="text-red-600 mr-2">⚖️</span>
                <strong>Legal authorities</strong> if required by law or to enforce our Terms.
              </li>
              <li className="flex items-start">
                <span className="text-purple-600 mr-2">🏢</span>
                <strong>Business transfers</strong> in the event of a merger, acquisition, or sale of assets.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 4: Your Choices */}
        <section className="mb-12">
          <div className="flex items-center space-x-3 mb-6">
            <ExclamationTriangleIcon className="h-8 w-8 text-gray-700" />
            <h2 className="text-3xl font-bold text-gray-900">4. Your Choices</h2>
          </div>

          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <ul className="space-y-4 text-gray-700">
              <li>
                <strong className="text-blue-600">Account information:</strong> You can update your profile in account settings.
              </li>
              <li>
                <strong className="text-yellow-600">Cookies:</strong> You may disable cookies in your browser, but some features may not function properly.
              </li>
              <li>
                <strong className="text-green-600">Marketing emails:</strong> You may opt out at any time via unsubscribe links.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 5: Data Retention */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">5. Data Retention</h2>
          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <p className="text-gray-700">
              We retain information for as long as needed to operate the Services, comply with legal obligations, resolve disputes, and enforce our agreements.
            </p>
          </div>
        </section>

        {/* Section 6: Security */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">6. Security</h2>
          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <p className="text-gray-700">
              We use industry-standard measures (encryption, secure storage, limited access) to protect your information. However, no system is 100% secure.
            </p>
          </div>
        </section>

        {/* Section 7: Children's Privacy */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">7. Children's Privacy</h2>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-start">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
              <p className="text-red-800">
                <strong>18+ Only:</strong> The Services are not directed to children under 18, and we do not knowingly collect personal data from minors. If we learn a minor has provided information, we will delete it promptly.
              </p>
            </div>
          </div>
        </section>

        {/* Section 8: Your Privacy Rights */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">8. Your Privacy Rights</h2>
          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <p className="text-gray-700 mb-4">
              Depending on your state of residence (e.g., California, Virginia, Colorado), you may have rights to:
            </p>
            <ul className="space-y-2 text-gray-700 mb-4">
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">📋</span>
                Access or request a copy of your data.
              </li>
              <li className="flex items-start">
                <span className="text-red-600 mr-2">🗑️</span>
                Request deletion of your data.
              </li>
              <li className="flex items-start">
                <span className="text-purple-600 mr-2">🚫</span>
                Opt out of certain data uses.
              </li>
            </ul>
            <p className="text-gray-700">
              To exercise these rights, contact us at <strong>support@dollardrop.com</strong>.
            </p>
          </div>
        </section>

        {/* Section 9: International Users */}
        <section className="mb-12">
          <div className="flex items-center space-x-3 mb-6">
            <GlobeAltIcon className="h-8 w-8 text-gray-700" />
            <h2 className="text-3xl font-bold text-gray-900">9. International Users</h2>
          </div>
          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <p className="text-gray-700">
              Our Services are intended for U.S. residents. If you use the Services from outside the U.S., your data will be processed and stored in the United States.
            </p>
          </div>
        </section>

        {/* Section 10: Changes to This Policy */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">10. Changes to This Policy</h2>
          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <p className="text-gray-700">
              We may update this Privacy Policy from time to time. The "Last Updated" date will always reflect the latest version.
            </p>
          </div>
        </section>

        {/* Section 11: Contact Us */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">11. Contact Us</h2>
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-8 border border-blue-200">
            <p className="text-gray-700 mb-6">
              For questions about this Privacy Policy or your data rights, contact us at:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 p-3 rounded-full">
                  <EnvelopeIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <div className="font-bold text-gray-900">Email Support</div>
                  <div className="text-blue-600 font-medium">support@dollardrop.com</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="bg-purple-100 p-3 rounded-full">
                  <BuildingOfficeIcon className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <div className="font-bold text-gray-900">Company Address</div>
                  <div className="text-gray-600">
                    Dollar Drop LLC<br />
                    123 Gaming Street<br />
                    Tech City, CA 90210
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom Navigation */}
        <div className="bg-gray-100 rounded-lg p-6 text-center">
          <h3 className="font-bold text-gray-900 mb-4">📚 Legal Documents</h3>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/terms" className="text-blue-600 hover:text-blue-700 font-medium">Terms of Service</Link>
            <Link href="/privacy" className="text-purple-600 hover:text-purple-700 font-bold">Privacy Policy</Link>
            <Link href="/how-it-works" className="text-green-600 hover:text-green-700 font-medium">How It Works</Link>
            <Link href="/contact" className="text-orange-600 hover:text-orange-700 font-medium">Contact Us</Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
