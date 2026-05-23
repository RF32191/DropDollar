'use client';

import React from 'react';
import Link from 'next/link';
import CleanNavigation from '@/components/navigation/CleanNavigation';
import { OPEN_DESIGN_HUB_URL } from '@/lib/opendesign-public-urls';
import { ArrowLeft } from 'lucide-react';

/** Contact for legal notices (§18). */
const CONTACT_EMAIL = 'ryanfermoselle@outlook.com';

/** U.S. state for governing law (§16). Update if a different state applies. */
const GOVERNING_STATE = 'California';

export default function OpenDesignTermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-cyan-950">
      <CleanNavigation variant="gradient" currentPage="/opendesign" />

      <div className="max-w-4xl mx-auto px-6 py-20 relative z-10">
        <div
          className="fixed top-24 right-0 w-[min(50vw,400px)] h-[min(40vh,320px)] pointer-events-none opacity-[0.07]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(34,211,238,1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(34,211,238,1) 1px, transparent 1px)
            `,
            backgroundSize: '24px 24px',
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
            border: 2px solid rgba(99, 102, 241, 0.4);
            box-shadow:
              0 8px 32px rgba(0, 0, 0, 0.45),
              inset 0 1px 0 rgba(255, 255, 255, 0.06);
          }
          .terms-content h1 {
            color: #e2e8f0;
            border-bottom: 3px solid rgba(139, 92, 246, 0.6);
            padding-bottom: 12px;
            font-size: 2.5rem;
            margin-bottom: 8px;
            text-shadow: 0 2px 20px rgba(139, 92, 246, 0.2);
          }
          .terms-content h2 {
            color: #a5b4fc;
            margin-top: 36px;
            border-bottom: 1px solid rgba(99, 102, 241, 0.3);
            padding-bottom: 8px;
            padding-top: 16px;
            font-size: 1.65rem;
            font-weight: 700;
          }
          .terms-content h3 {
            color: #67e8f9;
            margin-top: 20px;
            font-weight: 600;
            font-size: 1.1rem;
          }
          .terms-content ul,
          .terms-content ol {
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
            color: #67e8f9;
            text-decoration: underline;
            transition: color 0.2s;
          }
          .terms-content a:hover {
            color: #a5f3fc;
          }
          .terms-content .section-divider {
            border-top: 1px solid rgba(99, 102, 241, 0.35);
            margin: 28px 0;
          }
          .terms-content .footer {
            margin-top: 36px;
            padding-top: 20px;
            border-top: 1px solid rgba(139, 92, 246, 0.35);
            font-size: 0.92em;
            color: #94a3b8;
          }
        `}</style>

        <div className="terms-content">
          <h1>Terms of Service</h1>
          <p className="text-violet-300/90 font-medium">OpenDesign</p>
          <p>
            <strong>Last updated: May 22, 2026</strong>
          </p>

          <p>
            These Terms of Service (&quot;Terms&quot;) govern your use of the OpenDesign mobile application (&quot;App&quot;)
            provided by Ryan Joshua Fermoselle (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;).
          </p>
          <p>By downloading or using OpenDesign, you agree to these Terms. If you do not agree, do not use the App.</p>

          <p className="text-slate-400 text-sm">
            Our{' '}
            <Link href="/opendesign/privacy-policy">Privacy Policy</Link> describes how we handle information and is
            incorporated by reference where applicable.
          </p>

          <div className="section-divider" />

          <h2>1. Eligibility</h2>
          <p>
            You must be at least 13 years old to use the App. If you are under 18, you may use the App only with permission
            from a parent or legal guardian who accepts these Terms on your behalf.
          </p>

          <div className="section-divider" />

          <h2>2. License</h2>
          <p>
            We grant you a personal, limited, non-exclusive, non-transferable, revocable license to install and use the App on
            Apple devices you own or control, subject to these Terms and Apple&apos;s App Store rules.
          </p>
          <p>
            <strong>You may not:</strong>
          </p>
          <ul>
            <li>Copy, modify, reverse engineer, or redistribute the App except as allowed by law</li>
            <li>Use the App for unlawful purposes</li>
            <li>Interfere with the App&apos;s security or operation</li>
            <li>Remove copyright or proprietary notices</li>
          </ul>

          <div className="section-divider" />

          <h2>3. Your Content</h2>
          <p>
            You retain ownership of content you create, import, scan, record, or export in the App (&quot;User Content&quot;).
          </p>
          <p>
            You are solely responsible for User Content and for ensuring you have the rights to use, share, export, stream, or
            publish it. Do not upload or share content that infringes others&apos; rights or violates law.
          </p>
          <p>
            You grant us only the limited rights needed to operate the App on your device and to process actions you request
            (such as exporting a file or connecting to a printer you choose).
          </p>

          <div className="section-divider" />

          <h2>4. OpenDesign Pro Subscriptions</h2>
          <p>Some features require an active OpenDesign Pro subscription.</p>
          <ul>
            <li>Payment is charged to your Apple ID account</li>
            <li>Subscriptions automatically renew unless canceled at least 24 hours before the end of the current period</li>
            <li>Your account will be charged for renewal within 24 hours prior to the end of the current period</li>
            <li>You can manage or cancel subscriptions in Settings → Apple ID → Subscriptions</li>
            <li>Any free trial, if offered, converts to a paid subscription unless canceled before the trial ends</li>
            <li>Prices may change with notice as allowed by Apple and applicable law</li>
          </ul>
          <p>Refunds are handled by Apple under Apple Media Services Terms and Conditions.</p>

          <div className="section-divider" />

          <h2>5. Free Tier</h2>
          <p>
            Without a Pro subscription, certain features and project limits may apply. We may change free-tier limits or
            features with reasonable notice where required.
          </p>

          <div className="section-divider" />

          <h2>6. Third-Party Services</h2>
          <p>The App may interact with third-party services, including:</p>
          <ul>
            <li>Apple services (App Store, iCloud, ReplayKit, ARKit)</li>
            <li>3D printers and local network tools</li>
            <li>Streaming platforms and RTMP services</li>
            <li>TikTok and other share destinations</li>
            <li>YouTube, when upload is enabled</li>
          </ul>
          <p>
            Your use of third-party services is governed by their own terms and privacy policies. We are not responsible for
            third-party services.
          </p>

          <div className="section-divider" />

          <h2>7. Educational and Professional Disclaimer</h2>
          <p>
            OpenDesign includes tools for design, engineering, architecture, chemistry, electronics, and related fields.
            Outputs are for creative, educational, and prototyping purposes unless you independently verify them.
          </p>
          <p>
            <strong>We do not guarantee that:</strong>
          </p>
          <ul>
            <li>
              3D prints, circuits, floor plans, structural models, chemical simulations, or other outputs are safe,
              code-compliant, manufacturable, or fit for any particular use
            </li>
            <li>
              Measurements, BOMs, Gerber files, G-code, building-code checks, or simulations are accurate or complete
            </li>
          </ul>
          <p>
            You are solely responsible for professional review, testing, compliance, and safety before real-world use.
          </p>

          <div className="section-divider" />

          <h2>8. AR, Camera, LiDAR, and Biometric-Like Features</h2>
          <p>
            Some features use the camera, LiDAR, or ARKit face and body tracking for scanning, animation, and avatar control.
            These features process data on your device in real time. You are responsible for obtaining consent from people who
            appear in scans, recordings, streams, or avatars.
          </p>

          <div className="section-divider" />

          <h2>9. Local Network, Streaming, and Multiplayer</h2>
          <p>
            Features that connect to local printers, stream video/audio, or join nearby multiplayer sessions operate on your
            network or with nearby devices. You are responsible for securing your network credentials, stream keys, and shared
            sessions.
          </p>

          <div className="section-divider" />

          <h2>10. Acceptable Use</h2>
          <p>
            <strong>You agree not to:</strong>
          </p>
          <ul>
            <li>Harass, abuse, or harm others</li>
            <li>Distribute malware or attempt unauthorized access</li>
            <li>Use the App to create illegal content</li>
            <li>Misrepresent your identity or affiliation</li>
            <li>Circumvent subscription or security controls except as allowed by law</li>
          </ul>
          <p>We may suspend or terminate access for violations.</p>

          <div className="section-divider" />

          <h2>11. Intellectual Property</h2>
          <p>
            The App, branding, UI, and underlying software are owned by us or our licensors and are protected by intellectual
            property laws. These Terms do not grant you ownership of the App.
          </p>

          <div className="section-divider" />

          <h2>12. Disclaimer of Warranties</h2>
          <p className="caps-disclaimer">
            THE APP IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE.&quot; TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE
            DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
            NON-INFRINGEMENT.
          </p>
          <p>We do not warrant that the App will be uninterrupted, error-free, or secure.</p>

          <div className="section-divider" />

          <h2>13. Limitation of Liability</h2>
          <p className="caps-disclaimer">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
            CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, GOODWILL, OR OTHER INTANGIBLE LOSSES, ARISING
            FROM YOUR USE OF THE APP.
          </p>
          <p className="caps-disclaimer">
            OUR TOTAL LIABILITY FOR ANY CLAIM RELATING TO THE APP WILL NOT EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID US
            FOR THE APP OR SUBSCRIPTIONS IN THE 12 MONTHS BEFORE THE CLAIM OR (B) USD $50.
          </p>
          <p>Some jurisdictions do not allow certain limitations, so some of the above may not apply to you.</p>

          <div className="section-divider" />

          <h2>14. Indemnity</h2>
          <p>
            You agree to defend, indemnify, and hold us harmless from claims arising out of your User Content, your use of the
            App, or your violation of these Terms or applicable law.
          </p>

          <div className="section-divider" />

          <h2>15. Termination</h2>
          <p>
            You may stop using the App at any time by deleting it. We may terminate or suspend your access if you violate
            these Terms or if required for legal or security reasons.
          </p>
          <p>
            Sections that by nature should survive termination will survive, including ownership, disclaimers, limitations of
            liability, and indemnity.
          </p>

          <div className="section-divider" />

          <h2>16. Governing Law</h2>
          <p>
            These Terms are governed by the laws of the State of {GOVERNING_STATE}, United States, without regard to
            conflict-of-law rules, except where mandatory consumer protection laws in your country require otherwise.
          </p>

          <div className="section-divider" />

          <h2>17. Changes</h2>
          <p>
            We may update these Terms from time to time. Continued use after the updated Terms are posted constitutes
            acceptance.
          </p>

          <div className="section-divider" />

          <h2>18. Contact</h2>
          <p>
            <strong>Ryan Joshua Fermoselle</strong>
          </p>
          <ul>
            <li>
              Email: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            </li>
            <li>
              Website:{' '}
              <a href={OPEN_DESIGN_HUB_URL} target="_blank" rel="noopener noreferrer">
                {OPEN_DESIGN_HUB_URL}
              </a>
            </li>
          </ul>

          <div className="footer">
            <p>© {new Date().getFullYear()} Ryan Joshua Fermoselle. OpenDesign Terms of Service.</p>
          </div>
        </div>

        <div className="text-center mt-12 space-y-4">
          <Link
            href="/opendesign"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-bold rounded-full transition-all duration-300 shadow-lg"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to OpenDesign
          </Link>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm">
            <Link href="/opendesign/privacy-policy" className="text-slate-400 hover:text-cyan-300 underline">
              Privacy Policy
            </Link>
            <span className="text-slate-600 hidden sm:inline">·</span>
            <Link href="/opendesign/support" className="text-slate-400 hover:text-white underline">
              Support
            </Link>
            <span className="text-slate-600 hidden sm:inline">·</span>
            <Link href="/" className="text-slate-400 hover:text-cyan-300 underline">
              Drop Dollar home
            </Link>
          </div>
        </div>
      </div>

      <footer className="relative py-10 px-4 border-t border-violet-500/20 bg-slate-950/80">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-slate-500 text-sm mb-2">OpenDesign is part of the Drop Dollar family of applications</p>
          <a
            href="https://www.drop-dollar.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-500 hover:text-cyan-400 font-semibold"
          >
            Visit Drop Dollar →
          </a>
        </div>
      </footer>
    </div>
  );
}
