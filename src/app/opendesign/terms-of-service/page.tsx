'use client';

import React from 'react';
import Link from 'next/link';
import CleanNavigation from '@/components/navigation/CleanNavigation';
import { OPEN_DESIGN_PRIVACY_URL, OPEN_DESIGN_TERMS_URL } from '@/lib/opendesign-public-urls';
import { ArrowLeft } from 'lucide-react';

const CONTACT_EMAIL = 'ryanfermoselle@outlook.com';
const APPLE_EULA_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
const APPLE_SUBSCRIPTIONS_URL = 'https://apps.apple.com/account/subscriptions';

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
            color: #67e8f9;
            text-decoration: underline;
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
          <h1>OpenDesignAI Terms of Use (EULA)</h1>
          <p>
            <strong>Effective date: January 6, 2026</strong>
          </p>
          <ul className="!mt-4 !mb-6">
            <li>
              <strong>App:</strong> OpenDesignAI (OpenDesign)
            </li>
            <li>
              <strong>Developer:</strong> Ryan Joshua Fermoselle
            </li>
            <li>
              <strong>Contact:</strong>{' '}
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            </li>
          </ul>

          <div className="section-divider" />

          <h2>1. Agreement</h2>
          <p>
            By downloading or using OpenDesignAI, you agree to these Terms of Use and to Apple&apos;s Licensed Application End
            User License Agreement (Standard EULA) where applicable:{' '}
            <a href={APPLE_EULA_URL} target="_blank" rel="noopener noreferrer">
              {APPLE_EULA_URL}
            </a>
          </p>

          <div className="section-divider" />

          <h2>2. License</h2>
          <p>
            We grant you a personal, non-exclusive, non-transferable license to use the app on Apple-branded devices you own or
            control, as permitted by the App Store Terms of Service.
          </p>

          <div className="section-divider" />

          <h2>3. OpenDesign Pro Subscriptions</h2>
          <p>
            OpenDesign Pro is an auto-renewable subscription that unlocks premium features, including but not limited to:
          </p>
          <ul>
            <li>All export formats (STL, OBJ, USDZ, GLTF, and more)</li>
            <li>Unlimited projects (no per-category free limits)</li>
            <li>3D printing, slicing, and animation workspace tools</li>
            <li>3D model import</li>
            <li>Game customization and premium game modes</li>
            <li>Architecture 3D view and exploration modes</li>
            <li>Cloud AI 3D (subject to monthly usage limits below)</li>
          </ul>
          <p>
            <strong>Available plans (App Store product IDs):</strong>
          </p>
          <ul>
            <li>
              <strong>OpenDesign Pro Monthly</strong> — <code className="text-cyan-200">Monthly.OpenDesign</code> — billed every
              1 month
            </li>
            <li>
              <strong>OpenDesign Pro Annual</strong> — <code className="text-cyan-200">Annual.OpenDesign</code> — billed every
              1 year
            </li>
          </ul>
          <p>
            Payment is charged to your Apple ID account at confirmation of purchase. Subscriptions automatically renew unless
            canceled at least 24 hours before the end of the current period. Your account may be charged for renewal within 24
            hours prior to the end of the current period.
          </p>
          <p>
            <strong>Manage or cancel:</strong> Settings → Apple ID → Subscriptions, or{' '}
            <a href={APPLE_SUBSCRIPTIONS_URL} target="_blank" rel="noopener noreferrer">
              {APPLE_SUBSCRIPTIONS_URL}
            </a>
          </p>
          <p>
            Any free trial, if offered in App Store Connect, converts to a paid subscription unless canceled before the trial
            ends.
          </p>
          <p>
            <strong>Restore Purchases:</strong> If you reinstall the app or change devices, use Restore Purchases on the paywall
            while signed in with the same Apple ID used to subscribe.
          </p>

          <div className="section-divider" />

          <h2>4. Cloud AI 3D (Pro feature)</h2>
          <p>Cloud AI 3D is included with OpenDesign Pro but subject to fair-use limits:</p>
          <ul>
            <li>25 photo → 3D generations per calendar month (UTC)</li>
            <li>6 text prompt → 3D generations per calendar month (UTC)</li>
          </ul>
          <p>
            Credits reset on the 1st of each month (UTC). Usage is tracked on our server using your Apple subscription account
            identifier from StoreKit.
          </p>
          <p>By using Cloud AI 3D you agree that:</p>
          <ul>
            <li>
              Photos and prompts you submit will be transmitted to our server and processed by third-party AI providers
              (including Replicate).
            </li>
            <li>Results are provided &quot;as is&quot;; meshes may require cleanup before printing or production use.</li>
            <li>You will not submit unlawful, infringing, or explicit content.</li>
            <li>Service may be unavailable during outages, maintenance, or provider rate limits.</li>
          </ul>
          <p>
            On-device Photo3D and LiDAR tools may remain available without Cloud AI depending on your device and settings.
          </p>

          <div className="section-divider" />

          <h2>5. LiDAR and device requirements</h2>
          <p>
            LiDAR scanning, room mesh reconstruction, and related AR features require compatible Apple hardware (LiDAR Scanner
            and ARKit scene reconstruction support). If your device is not supported, the app will show a notice instead of
            starting the scanner. Scan quality and availability depend on your device, lighting, and environment.
          </p>

          <div className="section-divider" />

          <h2>6. Local multiplayer and collaboration</h2>
          <p>
            Local multiplayer, collaborative sketch rooms, and similar features connect devices peer-to-peer on your Wi-Fi or
            Bluetooth. We do not guarantee session stability, latency, or compatibility with all networks. You are responsible
            for who you invite to local sessions and for content shared in those sessions.
          </p>

          <div className="section-divider" />

          <h2>7. User content</h2>
          <p>
            You retain ownership of projects and exports you create. You are responsible for the content you create, export,
            share, or upload (including to YouTube or other services). You represent that you have the rights to any photos,
            prompts, or media you submit to Cloud AI 3D or share from the app.
          </p>

          <h3>7.1 Document Suite (Open Doc, Open Spreadsheet, Open PDF Editor)</h3>
          <p>OpenDesign includes on-device document editing tools. By using them you agree that:</p>
          <ul>
            <li>
              You are solely responsible for the accuracy, legality, and completeness of documents you create, import, edit,
              sign, or distribute.
            </li>
            <li>
              OpenDesign is a general-purpose creative and productivity tool, not legal counsel, not a certified electronic
              signature platform, and not a substitute for professional document review, notarization, or compliance programs
              required in your jurisdiction.
            </li>
            <li>
              Signatures, checkboxes, form fields, stamps, and redactions applied in Open PDF Editor are convenience features.
              Whether an edited or signed PDF is legally binding, admissible, or acceptable for a given contract, government
              filing, medical form, or financial record depends on applicable law and the policies of the receiving party — not
              on OpenDesign.
            </li>
            <li>
              You must obtain consent and rights before placing another person&apos;s signature, likeness, or confidential
              information in a document.
            </li>
            <li>
              Redaction and whiteout tools may not remove all hidden or recoverable data from an imported PDF. For highly
              sensitive material, verify redaction with appropriate professional tools before distribution.
            </li>
            <li>Document scanning uses your device camera; do not scan others&apos; private documents without permission.</li>
            <li>
              Exports may flatten annotations and images into page content for printing and sharing; keep original project files
              if you need to edit placements later.
            </li>
          </ul>

          <div className="section-divider" />

          <h2>8. Acceptable use</h2>
          <p>You may not:</p>
          <ul>
            <li>Reverse engineer or redistribute the app except as allowed by law</li>
            <li>Circumvent subscription or Cloud AI credit limits</li>
            <li>Use the app for unlawful purposes or to generate illegal content</li>
            <li>Abuse our API or third-party AI providers</li>
          </ul>

          <div className="section-divider" />

          <h2>9. Disclaimer</h2>
          <p className="caps-disclaimer">
            THE APP IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND. Design, engineering, architectural, game, and
            export outputs are for creative and educational use. They are not professional engineering, architectural, legal,
            medical, or safety certification. 3D prints, structures, and games you build with OpenDesign are your responsibility.
          </p>

          <div className="section-divider" />

          <h2>10. Limitation of liability</h2>
          <p>
            To the maximum extent permitted by law, Ryan Joshua Fermoselle is not liable for indirect, incidental, special, or
            consequential damages arising from use of the app, Cloud AI results, local multiplayer, or third-party services.
          </p>

          <div className="section-divider" />

          <h2>11. Privacy</h2>
          <p>
            Our Privacy Policy explains how we handle information, including TrueDepth face data, Cloud AI uploads, and
            subscription identifiers:{' '}
            <a href={OPEN_DESIGN_PRIVACY_URL}>{OPEN_DESIGN_PRIVACY_URL}</a>
          </p>

          <div className="section-divider" />

          <h2>12. Changes</h2>
          <p>
            We may update these Terms. We will post the revised version with a new effective date at{' '}
            <a href={OPEN_DESIGN_TERMS_URL}>{OPEN_DESIGN_TERMS_URL}</a> (or the URL listed on the App Store). Continued use after
            changes constitutes acceptance.
          </p>

          <div className="section-divider" />

          <h2>13. Contact</h2>
          <p>
            <strong>Ryan Joshua Fermoselle</strong>
          </p>
          <ul>
            <li>
              Email: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            </li>
          </ul>
          <p>
            Apple Standard EULA:{' '}
            <a href={APPLE_EULA_URL} target="_blank" rel="noopener noreferrer">
              {APPLE_EULA_URL}
            </a>
          </p>

          <div className="footer">
            <p>© {new Date().getFullYear()} Ryan Joshua Fermoselle. OpenDesignAI Terms of Use.</p>
            <p>Last updated: January 6, 2026.</p>
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
