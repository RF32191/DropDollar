'use client';

import React from 'react';
import Link from 'next/link';
import CleanNavigation from '@/components/navigation/CleanNavigation';
import { Shield, ArrowLeft } from 'lucide-react';

export default function PurionPrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-blue-50">
      <CleanNavigation variant="gradient" currentPage="/purion" />
      
      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-20">
        <style jsx>{`
          .privacy-content {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #475569;
            background: white;
            padding: 40px;
            border-radius: 24px;
            border: 2px solid #bfdbfe;
            box-shadow: 0 8px 32px rgba(59, 130, 246, 0.08);
          }
          .privacy-content h1 {
            color: #1e40af;
            border-bottom: 3px solid #3b82f6;
            padding-bottom: 10px;
            font-size: 2.5rem;
            margin-bottom: 10px;
          }
          .privacy-content h2 {
            color: #1e3a8a;
            margin-top: 40px;
            border-bottom: 2px solid #93c5fd;
            padding-bottom: 8px;
            padding-top: 20px;
            font-size: 1.75rem;
          }
          .privacy-content h3 {
            color: #2563eb;
            margin-top: 24px;
            font-weight: 600;
            font-size: 1.25rem;
          }
          .privacy-content .highlight {
            background: #eff6ff;
            padding: 20px;
            border-left: 4px solid #3b82f6;
            border-radius: 8px;
            margin: 20px 0;
          }
          .privacy-content ul {
            padding-left: 20px;
            color: #475569;
            margin: 12px 0;
          }
          .privacy-content ol {
            padding-left: 20px;
            color: #475569;
            margin: 12px 0;
          }
          .privacy-content li {
            margin: 8px 0;
          }
          .privacy-content p {
            color: #475569;
            margin-bottom: 12px;
          }
          .privacy-content strong {
            color: #1e40af;
            font-weight: 600;
          }
          .privacy-content a {
            color: #2563eb;
            text-decoration: underline;
            transition: color 0.2s;
          }
          .privacy-content a:hover {
            color: #1d4ed8;
          }
          .privacy-content .section-divider {
            border-top: 2px solid #bfdbfe;
            margin: 30px 0;
          }
          .privacy-content .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #bfdbfe;
            font-size: 0.9em;
            color: #1e40af;
          }
        `}</style>

        <div className="privacy-content">
          <h1>Purion - Privacy Policy</h1>
          <p><strong>Last Updated: January 2026</strong></p>

          <div className="section-divider"></div>

          <h2>1. INTRODUCTION</h2>
          <p>Welcome to Purion (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our bioprocess training and execution application (the &quot;Service&quot;).</p>
          <p><strong>Please read this Privacy Policy carefully.</strong> By using Purion, you agree to the collection and use of information in accordance with this policy.</p>

          <div className="section-divider"></div>

          <h2>2. INFORMATION WE COLLECT</h2>

          <h3>2.1 Information You Provide</h3>
          <ul>
            <li><strong>Account Information:</strong> Email address, name (for account creation)</li>
            <li><strong>Training Data:</strong> Progress, scores, and learning path completion</li>
            <li><strong>User Preferences:</strong> App settings and preferences</li>
          </ul>

          <h3>2.2 Automatically Collected Information</h3>
          <ul>
            <li><strong>Device Information:</strong> Device type, operating system version</li>
            <li><strong>Usage Data:</strong> App features accessed, time spent, interactions</li>
            <li><strong>App Performance:</strong> Crash reports, error logs (anonymized)</li>
          </ul>

          <h3>2.3 Photos and OCR Data</h3>
          <p>When you use the photo capture and OCR features for BDR field auto-fill:</p>
          <ul>
            <li>Photos are processed on-device for text extraction</li>
            <li>Extracted data is used only to populate form fields</li>
            <li>We do not store or transmit raw photos to external servers</li>
            <li>You control what data is saved within the app</li>
          </ul>

          <div className="section-divider"></div>

          <h2>3. HOW WE USE YOUR INFORMATION</h2>
          <p>We use the information we collect for:</p>
          <ul>
            <li><strong>Service Operation:</strong> Provide simulations, games, and training features</li>
            <li><strong>Progress Tracking:</strong> Learning paths, badges, and KPI dashboards</li>
            <li><strong>App Improvement:</strong> Fix bugs, improve performance, develop new features</li>
            <li><strong>Support:</strong> Respond to your questions and support requests</li>
          </ul>

          <div className="section-divider"></div>

          <h2>4. DATA SHARING</h2>
          <p><strong>We do not sell your personal information.</strong> We may share information only:</p>
          <ul>
            <li>With service providers necessary for app operation (e.g., hosting)</li>
            <li>When required by law or legal process</li>
            <li>To protect our rights and safety</li>
          </ul>

          <div className="section-divider"></div>

          <h2>5. DATA SECURITY</h2>
          <p>We implement appropriate security measures to protect your information. Data is stored securely and transmitted using encryption where applicable.</p>

          <div className="section-divider"></div>

          <h2>6. YOUR RIGHTS</h2>
          <p>You have the right to:</p>
          <ul>
            <li><strong>Access:</strong> Request a copy of your personal data</li>
            <li><strong>Correction:</strong> Update or correct inaccurate information</li>
            <li><strong>Deletion:</strong> Request deletion of your data</li>
            <li><strong>Export:</strong> Export your data where technically feasible</li>
          </ul>

          <div className="section-divider"></div>

          <h2>7. CHILDREN&apos;S PRIVACY</h2>
          <p><strong>Purion is intended for users 18 years of age and older.</strong> We do not knowingly collect information from children under 18. If you believe a child has provided information, please contact us at ryanfermoselle@outlook.com.</p>

          <div className="section-divider"></div>

          <h2>8. CHANGES TO THIS PRIVACY POLICY</h2>
          <p>We may update this Privacy Policy from time to time. We will notify you of changes by posting the new policy on this page and updating the &quot;Last Updated&quot; date.</p>

          <div className="section-divider"></div>

          <h2>9. CONTACT US</h2>
          <p>If you have any questions about this Privacy Policy or our data practices:</p>
          <ul>
            <li><strong>Email:</strong> ryanfermoselle@outlook.com</li>
            <li><strong>Developer:</strong> Ryan Joshua Fermoselle</li>
            <li><strong>Response Time:</strong> Within 14 business days</li>
          </ul>

          <div className="section-divider"></div>

          <div className="footer">
            <p><strong>Purion is committed to your privacy.</strong> We protect your data and never sell it to third parties.</p>
            <p><strong>Last Updated: January 2026</strong></p>
            <p>© 2026 Ryan Joshua Fermoselle. All rights reserved.</p>
          </div>
        </div>

        {/* Back to Purion */}
        <div className="text-center mt-12">
          <Link
            href="/purion"
            className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Purion
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative py-12 px-4 sm:px-6 lg:px-8 border-t border-blue-200 bg-blue-50/50">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-slate-600 mb-4">
            Purion is part of the Drop Dollar family of applications
          </p>
          <a
            href="https://www.drop-dollar.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-semibold text-lg transition-colors duration-300 hover:underline"
          >
            Visit Drop Dollar
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </footer>
    </div>
  );
}
