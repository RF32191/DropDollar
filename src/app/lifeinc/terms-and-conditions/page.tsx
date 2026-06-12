'use client';

import React from 'react';
import Link from 'next/link';
import CleanNavigation from '@/components/navigation/CleanNavigation';
import { LIFE_INC_PRIVACY_URL, LIFE_INC_TERMS_URL } from '@/lib/lifeinc-public-urls';
import { ArrowLeft } from 'lucide-react';

const CONTACT_EMAIL = 'ryanfermoselle@outlook.com';
const SUPPORT_EMAIL = 'support@lifeinc.app';
const APPLE_EULA_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

export default function LifeIncTermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-teal-950 to-emerald-950">
      <CleanNavigation variant="gradient" currentPage="/lifeinc" />

      <div className="max-w-4xl mx-auto px-6 py-20 relative z-10">
        <div
          className="fixed top-24 right-0 w-[min(50vw,400px)] h-[min(40vh,320px)] pointer-events-none opacity-[0.07]"
          style={{
            backgroundImage: `
              radial-gradient(circle, rgba(45,212,191,0.8) 1px, transparent 1px)
            `,
            backgroundSize: '32px 32px',
          }}
        />

        <style jsx>{`
          .terms-content {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.65;
            color: #cbd5e1;
            background: rgba(15, 23, 42, 0.75);
            backdrop-filter: blur(20px);
            padding: 40px;
            border-radius: 24px;
            border: 2px solid rgba(45, 212, 191, 0.4);
            box-shadow:
              0 8px 32px rgba(0, 0, 0, 0.45),
              inset 0 1px 0 rgba(255, 255, 255, 0.06);
          }
          .terms-content h1 {
            color: #e2e8f0;
            border-bottom: 3px solid rgba(45, 212, 191, 0.6);
            padding-bottom: 12px;
            font-size: 2.5rem;
            margin-bottom: 8px;
          }
          .terms-content h2 {
            color: #5eead4;
            margin-top: 36px;
            border-bottom: 1px solid rgba(45, 212, 191, 0.3);
            padding-bottom: 8px;
            padding-top: 16px;
            font-size: 1.65rem;
            font-weight: 700;
          }
          .terms-content h3 {
            color: #6ee7b7;
            margin-top: 20px;
            font-weight: 600;
            font-size: 1.1rem;
          }
          .terms-content ul {
            padding-left: 22px;
            margin: 12px 0;
          }
          .terms-content li {
            margin: 10px 0;
          }
          .terms-content p {
            margin-bottom: 14px;
          }
          .terms-content strong {
            color: #f8fafc;
            font-weight: 600;
          }
          .terms-content .caps-disclaimer {
            font-size: 0.95rem;
            letter-spacing: 0.02em;
            color: #e2e8f0;
          }
          .terms-content a {
            color: #6ee7b7;
            text-decoration: underline;
          }
          .terms-content .section-divider {
            border-top: 1px solid rgba(45, 212, 191, 0.35);
            margin: 28px 0;
          }
          .terms-content .footer {
            margin-top: 36px;
            padding-top: 20px;
            border-top: 1px solid rgba(45, 212, 191, 0.35);
            font-size: 0.92em;
            color: #94a3b8;
          }
        `}</style>

        <div className="terms-content">
          <h1>Terms &amp; Conditions — Life Inc.</h1>
          <p>
            <strong>Effective date: June 12, 2026</strong> · <strong>Last updated: June 12, 2026</strong>
          </p>

          <div className="section-divider" />

          <p>
            These Terms &amp; Conditions (&quot;Terms&quot;) form a binding agreement that governs your access to and use of the
            Life Inc. mobile application, related software, websites, and services (collectively, the &quot;App&quot;), operated
            by Life Inc. (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). By downloading, installing, accessing, or using
            the App, you agree to these Terms. If you do not agree, do not use the App.
          </p>

          <h2>1. Acceptance of Terms</h2>
          <p>
            By using the App you confirm that you have read, understood, and agree to these Terms and to our{' '}
            <Link href="/lifeinc/privacy-policy">Privacy Policy</Link>, which is incorporated by reference. If you are using the
            App on behalf of another person or entity, you represent that you have authority to bind them to these Terms.
          </p>

          <h2>2. Eligibility</h2>
          <p>
            You must be at least 13 years old (or the minimum age of digital consent in your jurisdiction) to use the App. If
            you are a minor where you live, you must have permission from a parent or legal guardian who agrees to these Terms
            on your behalf. The App is not directed to children under 13, and we do not knowingly collect personal information
            from them.
          </p>

          <h2>3. License to Use the App</h2>
          <p>
            Subject to your compliance with these Terms, we grant you a limited, personal, non-exclusive, non-transferable,
            non-sublicensable, revocable license to download and use the App for your own personal, non-commercial
            entertainment. You may not:
          </p>
          <ul>
            <li>copy, modify, adapt, translate, distribute, sell, rent, or lease any part of the App;</li>
            <li>
              reverse engineer, decompile, or disassemble the App, or attempt to derive its source code, except to the extent
              applicable law expressly permits;
            </li>
            <li>use the App in any way that violates applicable laws or these Terms; or</li>
            <li>remove, obscure, or alter any proprietary notices in the App.</li>
          </ul>

          <h2>4. Accounts &amp; Security</h2>
          <p>
            Some features require you to create or sign in to an account. You agree to provide accurate information and to keep
            your credentials confidential. You are responsible for all activity that occurs under your account. Notify us
            immediately at <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> of any unauthorized use. We may suspend or
            terminate accounts that violate these Terms.
          </p>

          <h2>5. Subscriptions &amp; In-App Purchases</h2>
          <p>
            The App may offer optional paid subscriptions and one-time purchases that unlock additional features, worlds, modes,
            or content (&quot;Premium Features&quot;).
          </p>
          <ul>
            <li>
              <strong>Billing.</strong> Purchases and subscriptions are processed by the applicable app marketplace (e.g., the
              Apple App Store or Google Play). Charges are made to the payment method on your marketplace account, and the
              marketplace—not us—manages your payment information.
            </li>
            <li>
              <strong>Auto-renewal.</strong> Subscriptions automatically renew for the same period at the then-current price
              unless you cancel at least 24 hours before the end of the current period. Manage or cancel subscriptions in your
              marketplace account settings.
            </li>
            <li>
              <strong>Price changes.</strong> We may change prices; changes apply to future billing periods and, where required
              by law or marketplace rules, will be communicated in advance and may require your consent.
            </li>
            <li>
              <strong>Refunds.</strong> Except where required by law, payments are non-refundable and are handled under the
              policies of the marketplace through which you purchased. We do not control marketplace refund decisions.
            </li>
            <li>
              <strong>Free trials &amp; promotions.</strong> If offered, trials convert to paid subscriptions unless canceled
              before the trial ends. Promotional access may be modified or withdrawn at any time.
            </li>
            <li>
              <strong>Statutory withdrawal rights.</strong> If you reside in a jurisdiction that grants a cooling-off or
              withdrawal period for digital purchases, those rights apply as required by law.
            </li>
          </ul>

          <h2>6. Virtual Goods &amp; Game Content</h2>
          <p>
            The App may include virtual items, progression, unlockable content, and in-game currency (&quot;Virtual Items&quot;).
            Virtual Items have no monetary value, cannot be redeemed for cash or transferred outside the App, and are
            licensed—not sold—to you. We may manage, regulate, modify, or remove Virtual Items at any time. We are not liable
            for the loss of Virtual Items, progress, or saved data, including data stored locally on your device.
          </p>

          <h2>7. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>cheat, exploit bugs, or use unauthorized third-party software, bots, or modifications;</li>
            <li>
              circumvent, disable, or interfere with security, licensing, or payment features, including any attempt to unlock
              Premium Features without paying;
            </li>
            <li>disrupt, overload, or attempt to gain unauthorized access to the App or its infrastructure;</li>
            <li>harass, abuse, threaten, or harm other users; or</li>
            <li>use the App for any unlawful, infringing, or unauthorized purpose.</li>
          </ul>

          <h2>8. User-Generated Content</h2>
          <p>
            If the App allows you to create, upload, or share content (such as custom species, profiles, or scenarios)
            (&quot;User Content&quot;), you retain ownership of your User Content but grant us a worldwide, non-exclusive,
            royalty-free, sublicensable, transferable license to host, store, reproduce, modify (for formatting/display),
            publish, and display it to operate, promote, and improve the App. You represent that you own or have the rights to
            your User Content and that it does not infringe any third-party rights or violate any law. We may remove User
            Content at our discretion.
          </p>

          <h2>9. Intellectual Property</h2>
          <p>
            The App—including its design, graphics, code, audio, characters, names, logos, and all related content—is owned by
            us or our licensors and is protected by intellectual property and other laws. Except for the limited license granted
            above, no rights are transferred to you. &quot;Life Inc.&quot; and associated marks are trademarks of Life Inc. All
            rights not expressly granted are reserved.
          </p>

          <h2>10. Privacy</h2>
          <p>
            Your use of the App is also governed by our{' '}
            <a href={LIFE_INC_PRIVACY_URL}>Privacy Policy</a>, which explains how we collect, use, and protect information. By
            using the App, you acknowledge the practices described there.
          </p>

          <h2>11. Third-Party Services &amp; App Stores</h2>
          <p>
            The App may rely on third-party services and is distributed through app marketplaces. Your use is subject to the
            applicable marketplace terms. These Terms are between you and us, not the marketplace, and the marketplace is not
            responsible for the App or its support, maintenance, warranties, or claims. Where you obtained the App from the
            Apple App Store, you also agree that Apple and its subsidiaries are third-party beneficiaries of these Terms and
            may enforce them against you, and that the{' '}
            <a href={APPLE_EULA_URL}>Apple Licensed Application End User License Agreement</a> applies to the extent it conflicts
            with these Terms in Apple&apos;s favor.
          </p>

          <h2>12. Availability &amp; Changes</h2>
          <p>
            We may modify, update, suspend, or discontinue the App or any feature at any time, with or without notice. We do not
            guarantee uninterrupted or error-free operation. We are not liable for any modification, suspension, or
            discontinuation of the App or any feature.
          </p>

          <h2>13. Disclaimers</h2>
          <p className="caps-disclaimer">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE APP IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT
            WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY,
            FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE APP WILL BE SECURE,
            ACCURATE, RELIABLE, OR FREE OF ERRORS, VIRUSES, OR INTERRUPTIONS. SOME JURISDICTIONS DO NOT ALLOW THE EXCLUSION OF
            CERTAIN WARRANTIES, SO SOME OF THE ABOVE EXCLUSIONS MAY NOT APPLY TO YOU, AND YOU MAY HAVE ADDITIONAL RIGHTS THAT
            VARY BY JURISDICTION.
          </p>

          <h2>14. Limitation of Liability</h2>
          <p className="caps-disclaimer">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT WILL WE OR OUR AFFILIATES, OFFICERS, EMPLOYEES, OR LICENSORS BE
            LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR FOR ANY LOSS OF
            PROFITS, DATA, GOODWILL, OR GAME PROGRESS, ARISING OUT OF OR RELATED TO YOUR USE OF (OR INABILITY TO USE) THE APP,
            EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. OUR TOTAL CUMULATIVE LIABILITY FOR ANY CLAIM RELATING TO THE APP
            WILL NOT EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID US IN THE 12 MONTHS BEFORE THE EVENT GIVING RISE TO THE
            CLAIM, OR (B) US $100. NOTHING IN THESE TERMS LIMITS LIABILITY THAT CANNOT BE LIMITED UNDER APPLICABLE LAW (SUCH AS
            LIABILITY FOR DEATH OR PERSONAL INJURY CAUSED BY NEGLIGENCE, OR FRAUD).
          </p>

          <h2>15. Indemnification</h2>
          <p>
            To the extent permitted by law, you agree to indemnify and hold harmless Life Inc. and its officers, employees,
            agents, and licensors from any claims, damages, liabilities, and expenses (including reasonable legal fees) arising
            from your use of the App, your User Content, or your violation of these Terms or any law or third-party right.
          </p>

          <h2>16. Termination</h2>
          <p>
            We may suspend or terminate your access to the App at any time, with or without notice, if we reasonably believe you
            have violated these Terms or to protect the App or other users. You may stop using the App at any time. Upon
            termination, the licenses granted to you end and you must stop using the App. Sections that by their nature should
            survive termination (including intellectual property, disclaimers, limitation of liability, indemnification, dispute
            resolution, and governing law) will survive.
          </p>

          <h2>17. Dispute Resolution &amp; Arbitration</h2>
          <p>
            <strong>Please read this section carefully — it affects your legal rights.</strong>
          </p>
          <ul>
            <li>
              <strong>Informal resolution first.</strong> Before filing a claim, you agree to try to resolve the dispute
              informally by contacting us at <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> and allowing 30 days to
              reach a resolution.
            </li>
            <li>
              <strong>Binding arbitration.</strong> If we cannot resolve a dispute informally, you and we agree that any dispute
              arising out of or relating to these Terms or the App will be resolved by final and binding individual arbitration,
              rather than in court, except that either party may bring an individual claim in small-claims court. Arbitration
              will be administered under the rules of a recognized arbitration provider in the applicable jurisdiction.
            </li>
            <li>
              <strong>Class-action waiver.</strong> To the extent permitted by law, disputes will be conducted only on an
              individual basis and not as a class, consolidated, or representative action.
            </li>
            <li>
              <strong>Consumer rights &amp; opt-out.</strong> If you are a consumer in the EU, UK, or another region where
              mandatory laws give you the right to bring claims in your local courts or prohibit pre-dispute arbitration, those
              rights apply and this Section does not limit them. You may opt out of arbitration by emailing{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> within 30 days of first accepting these Terms.
            </li>
          </ul>

          <h2>18. Governing Law</h2>
          <p>
            These Terms are governed by the laws of the State of California, United States, without regard to conflict-of-law
            rules. Subject to the arbitration section above, the state and federal courts located in California, United States
            will have jurisdiction, and you consent to their venue—except where mandatory consumer-protection laws in your
            country of residence require otherwise, in which case those laws and courts apply.
          </p>

          <h2>19. General Terms</h2>
          <ul>
            <li>
              <strong>Entire agreement.</strong> These Terms and the Privacy Policy are the entire agreement between you and us
              regarding the App.
            </li>
            <li>
              <strong>Severability.</strong> If any provision is found unenforceable, the remaining provisions stay in effect.
            </li>
            <li>
              <strong>No waiver.</strong> Our failure to enforce any right is not a waiver of that right.
            </li>
            <li>
              <strong>Assignment.</strong> You may not assign these Terms; we may assign them in connection with a merger,
              acquisition, or sale of assets.
            </li>
            <li>
              <strong>Force majeure.</strong> We are not liable for delays or failures caused by events beyond our reasonable
              control.
            </li>
          </ul>

          <h2>20. Changes to These Terms</h2>
          <p>
            We may update these Terms from time to time. When we do, we will revise the &quot;Last updated&quot; date above and,
            where appropriate, provide additional notice. Material changes will take effect after reasonable notice. Your
            continued use of the App after changes take effect constitutes acceptance of the revised Terms.
          </p>

          <h2>21. Contact</h2>
          <p>
            Questions about these Terms? Contact us at{' '}
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
            className="inline-flex items-center gap-2 text-teal-300 hover:text-white font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Life Inc.
          </Link>
          <div>
            <Link href="/lifeinc/privacy-policy" className="text-emerald-400 hover:text-emerald-300 text-sm underline mr-4">
              Privacy Policy
            </Link>
            <a href={LIFE_INC_TERMS_URL} className="text-slate-500 hover:text-slate-300 text-sm">
              {LIFE_INC_TERMS_URL.replace('https://', '')}
            </a>
          </div>
        </div>

        <footer className="mt-16 text-center border-t border-teal-500/20 pt-8">
          <p className="text-slate-500 text-sm mb-2">Life Inc. is part of the Drop Dollar family of applications</p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link href="/lifeinc/privacy-policy" className="text-emerald-400 hover:text-emerald-300 font-semibold">
              Privacy Policy
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
