'use client';

import React from 'react';
import Link from 'next/link';
import CleanNavigation from '@/components/navigation/CleanNavigation';
import { LIFE_INC_PRIVACY_URL, LIFE_INC_TERMS_URL } from '@/lib/lifeinc-public-urls';
import { ArrowLeft } from 'lucide-react';

const CONTACT_EMAIL = 'ryanfermoselle@outlook.com';
const PRIVACY_EMAIL = 'privacy@lifeinc.app';

export default function LifeIncPrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950 to-teal-950">
      <CleanNavigation variant="gradient" currentPage="/lifeinc" />

      <div className="max-w-4xl mx-auto px-6 py-20 relative z-10">
        <div
          className="fixed top-24 right-0 w-[min(50vw,400px)] h-[min(40vh,320px)] pointer-events-none opacity-[0.07]"
          style={{
            backgroundImage: `
              radial-gradient(circle, rgba(52,211,153,0.8) 1px, transparent 1px)
            `,
            backgroundSize: '32px 32px',
          }}
        />

        <style jsx>{`
          .privacy-content {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.65;
            color: #cbd5e1;
            background: rgba(15, 23, 42, 0.75);
            backdrop-filter: blur(20px);
            padding: 40px;
            border-radius: 24px;
            border: 2px solid rgba(52, 211, 153, 0.35);
            box-shadow:
              0 8px 32px rgba(0, 0, 0, 0.45),
              inset 0 1px 0 rgba(255, 255, 255, 0.06);
          }
          .privacy-content h1 {
            color: #e2e8f0;
            border-bottom: 3px solid rgba(52, 211, 153, 0.6);
            padding-bottom: 12px;
            font-size: 2.5rem;
            margin-bottom: 8px;
          }
          .privacy-content h2 {
            color: #6ee7b7;
            margin-top: 36px;
            border-bottom: 1px solid rgba(52, 211, 153, 0.25);
            padding-bottom: 8px;
            padding-top: 16px;
            font-size: 1.65rem;
            font-weight: 700;
          }
          .privacy-content ul {
            padding-left: 22px;
            margin: 12px 0;
          }
          .privacy-content li {
            margin: 10px 0;
          }
          .privacy-content p {
            margin-bottom: 14px;
          }
          .privacy-content strong {
            color: #f8fafc;
            font-weight: 600;
          }
          .privacy-content a {
            color: #6ee7b7;
            text-decoration: underline;
          }
          .privacy-content .section-divider {
            border-top: 1px solid rgba(45, 212, 191, 0.35);
            margin: 28px 0;
          }
          .privacy-content .footer {
            margin-top: 36px;
            padding-top: 20px;
            border-top: 1px solid rgba(52, 211, 153, 0.3);
            font-size: 0.92em;
            color: #94a3b8;
          }
          .privacy-content table {
            width: 100%;
            border-collapse: collapse;
            margin: 16px 0;
            font-size: 0.9rem;
          }
          .privacy-content th,
          .privacy-content td {
            border: 1px solid rgba(52, 211, 153, 0.25);
            padding: 10px 12px;
            text-align: left;
            vertical-align: top;
          }
          .privacy-content th {
            background: rgba(52, 211, 153, 0.1);
            color: #e2e8f0;
            font-weight: 600;
          }
          .privacy-content .table-wrap {
            overflow-x: auto;
            margin: 16px 0;
          }
        `}</style>

        <div className="privacy-content">
          <h1>Privacy Policy — Life Inc.</h1>
          <p>
            <strong>Effective date: June 12, 2026</strong> · <strong>Last updated: June 12, 2026</strong>
          </p>

          <div className="section-divider" />

          <h2>1. Introduction</h2>
          <p>
            This Privacy Policy explains how Life Inc. (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) handles information in
            connection with the Life Inc. mobile application and related services (the &quot;App&quot;). We designed the App to be
            privacy-friendly: most of your gameplay data stays on your device. By using the App, you acknowledge this Policy.
          </p>

          <h2>2. Information We Collect</h2>
          <p>We collect only what we need to provide the App:</p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Examples</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Account information (if you sign in)</td>
                  <td>Email address you provide to sign in or subscribe</td>
                  <td>You</td>
                </tr>
                <tr>
                  <td>On-device game data</td>
                  <td>Game progress, settings, saved runs, unlocked content, in-app purchase/entitlement status</td>
                  <td>Stored locally on your device</td>
                </tr>
                <tr>
                  <td>Purchase information</td>
                  <td>Confirmation that a subscription or purchase occurred and its status</td>
                  <td>Your app marketplace (Apple/Google)</td>
                </tr>
                <tr>
                  <td>Support communications</td>
                  <td>Messages and contact details when you email us</td>
                  <td>You</td>
                </tr>
                <tr>
                  <td>Basic device/technical data</td>
                  <td>Device type and operating system version, where required for compatibility or troubleshooting</td>
                  <td>Your device / marketplace</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            We do not sell your personal information, and we do not knowingly collect more than is described here. If you do not
            sign in, we generally do not collect personal information that identifies you.
          </p>

          <h2>3. How We Use Information</h2>
          <ul>
            <li>provide, maintain, and improve the App and its features;</li>
            <li>save and sync your progress, settings, and entitlements;</li>
            <li>process and verify subscriptions and in-app purchases through the marketplace;</li>
            <li>respond to your support requests;</li>
            <li>protect against fraud, abuse, cheating, and security threats; and</li>
            <li>comply with legal obligations and enforce our Terms &amp; Conditions.</li>
          </ul>

          <h2>4. Legal Bases for Processing (EEA/UK)</h2>
          <p>If you are in the European Economic Area or the United Kingdom, we process personal data on these bases:</p>
          <ul>
            <li>
              <strong>Contract</strong> — to provide the App and process purchases you request;
            </li>
            <li>
              <strong>Legitimate interests</strong> — to secure, maintain, and improve the App (balanced against your rights);
            </li>
            <li>
              <strong>Consent</strong> — where required (you can withdraw consent at any time); and
            </li>
            <li>
              <strong>Legal obligation</strong> — to comply with applicable law.
            </li>
          </ul>

          <h2>5. How We Share Information</h2>
          <p>We share information only as needed:</p>
          <ul>
            <li>
              <strong>App marketplaces</strong> (Apple App Store, Google Play) to process and validate purchases and
              subscriptions;
            </li>
            <li>
              <strong>Service providers</strong> who help us operate the App (e.g., hosting or support tooling), under
              confidentiality obligations and only for our instructions;
            </li>
            <li>
              <strong>Legal &amp; safety</strong> — when required by law, legal process, or to protect rights, safety, and the
              integrity of the App; and
            </li>
            <li>
              <strong>Business transfers</strong> — in connection with a merger, acquisition, or sale of assets, subject to
              this Policy.
            </li>
          </ul>
          <p>
            We do not sell or rent your personal information, and we do not share it for cross-context behavioral advertising.
          </p>

          <h2>6. Payments &amp; Subscriptions</h2>
          <p>
            All payments are processed by the app marketplace where you obtained the App. We do not receive or store your full
            payment card details. The marketplace&apos;s own privacy policy governs how it handles your payment information. We
            receive only the purchase/entitlement status needed to unlock features you bought.
          </p>

          <h2>7. Data Storage &amp; Retention</h2>
          <p>
            Game progress and settings are stored locally on your device and are removed if you delete the App or clear its
            data. If you provide an email to sign in, we retain it for as long as your account is active or as needed to provide
            the App, resolve disputes, and comply with legal obligations, after which we delete or anonymize it.
          </p>

          <h2>8. Security</h2>
          <p>
            We use reasonable technical and organizational measures to protect information. However, no method of transmission
            or storage is 100% secure, and we cannot guarantee absolute security. You are responsible for keeping your account
            credentials confidential.
          </p>

          <h2>9. Children&apos;s Privacy</h2>
          <p>
            The App is not directed to children under 13 (or the minimum age of digital consent in your jurisdiction), and we do
            not knowingly collect personal information from them. If you believe a child has provided us personal information,
            contact us at{' '}
            <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a> and we will take appropriate steps to delete it.
          </p>

          <h2>10. Your Privacy Rights</h2>
          <p>
            Depending on where you live, you may have rights to access, correct, delete, or restrict processing of your personal
            information, to data portability, and to object to certain processing. To exercise these rights, email us at{' '}
            <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>. We will respond as required by applicable law. You also
            have the right to lodge a complaint with your local data protection authority. Because most data is stored on your
            device, you can also delete it by uninstalling the App or clearing its data.
          </p>

          <h2>11. U.S. State Privacy Rights (California &amp; Others)</h2>
          <p>
            If you are a resident of California or another U.S. state with privacy laws, you may have the right to know what
            personal information we collect, to request deletion or correction, and to opt out of &quot;sale&quot; or
            &quot;sharing&quot; of personal information. We do not sell or share your personal information as those terms are
            defined under these laws. We will not discriminate against you for exercising your rights. To make a request,
            contact <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>.
          </p>

          <h2>12. International Data Transfers</h2>
          <p>
            We are based in the United States, and information may be processed in the U.S. or other countries that may have
            different data-protection laws than your own. Where required, we use appropriate safeguards (such as Standard
            Contractual Clauses) for international transfers.
          </p>

          <h2>13. Do Not Track</h2>
          <p>
            The App does not use third-party tracking for advertising and does not respond to browser &quot;Do Not Track&quot;
            signals, because it does not track you across third-party services.
          </p>

          <h2>14. Third-Party Links &amp; Stores</h2>
          <p>
            The App and this website may link to third-party services (such as app marketplaces). Their privacy practices are
            governed by their own policies, and we are not responsible for them. Please review the privacy policies of any third
            party you interact with.
          </p>

          <h2>15. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will revise the &quot;Last updated&quot; date above and,
            where appropriate, provide additional notice. Your continued use of the App after changes take effect constitutes
            acceptance of the updated Policy.
          </p>

          <h2>16. Contact Us</h2>
          <p>
            Questions or requests about your privacy? Contact us at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </p>

          <div className="footer">
            <p>© {new Date().getFullYear()} Life Inc. All rights reserved.</p>
            <p>Last updated: June 12, 2026.</p>
          </div>
        </div>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <Link
            href="/lifeinc"
            className="inline-flex items-center gap-2 text-emerald-300 hover:text-white font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Life Inc.
          </Link>
          <div>
            <Link href="/lifeinc/terms-and-conditions" className="text-teal-400 hover:text-teal-300 text-sm underline mr-4">
              Terms &amp; Conditions
            </Link>
            <a href={LIFE_INC_PRIVACY_URL} className="text-slate-500 hover:text-slate-300 text-sm">
              {LIFE_INC_PRIVACY_URL.replace('https://', '')}
            </a>
          </div>
        </div>

        <footer className="mt-16 text-center border-t border-emerald-500/20 pt-8">
          <p className="text-slate-500 text-sm mb-2">Life Inc. is part of the Drop Dollar family of applications</p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link href="/lifeinc/terms-and-conditions" className="text-teal-400 hover:text-teal-300 font-semibold">
              Terms &amp; Conditions
            </Link>
            <span className="text-slate-600">•</span>
            <Link href="/" className="text-slate-400 hover:text-white font-semibold">
              Drop Dollar Home
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
