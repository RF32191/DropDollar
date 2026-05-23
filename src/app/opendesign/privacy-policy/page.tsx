'use client';

import React from 'react';
import Link from 'next/link';
import CleanNavigation from '@/components/navigation/CleanNavigation';
import { ArrowLeft } from 'lucide-react';

const CONTACT_EMAIL = 'ryanfermoselle@outlook.com';

export default function OpenDesignPrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-cyan-950">
      <CleanNavigation variant="gradient" currentPage="/opendesign" />

      <div className="max-w-4xl mx-auto px-6 py-20 relative z-10">
        {/* Subtle blueprint corner */}
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
          .privacy-content {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.65;
            color: #cbd5e1;
            background: rgba(15, 23, 42, 0.75);
            backdrop-filter: blur(20px);
            padding: 40px;
            border-radius: 24px;
            border: 2px solid rgba(34, 211, 238, 0.35);
            box-shadow:
              0 8px 32px rgba(0, 0, 0, 0.45),
              inset 0 1px 0 rgba(255, 255, 255, 0.06);
          }
          .privacy-content h1 {
            color: #e2e8f0;
            border-bottom: 3px solid rgba(34, 211, 238, 0.6);
            padding-bottom: 12px;
            font-size: 2.5rem;
            margin-bottom: 8px;
            text-shadow: 0 2px 20px rgba(34, 211, 238, 0.2);
          }
          .privacy-content h2 {
            color: #22d3ee;
            margin-top: 36px;
            border-bottom: 1px solid rgba(34, 211, 238, 0.25);
            padding-bottom: 8px;
            padding-top: 16px;
            font-size: 1.65rem;
            font-weight: 700;
          }
          .privacy-content h3 {
            color: #a5b4fc;
            margin-top: 22px;
            font-weight: 600;
            font-size: 1.15rem;
          }
          .privacy-content ul,
          .privacy-content ol {
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
            color: #67e8f9;
            text-decoration: underline;
            transition: color 0.2s;
          }
          .privacy-content a:hover {
            color: #a5f3fc;
          }
          .privacy-content .section-divider {
            border-top: 1px solid rgba(99, 102, 241, 0.35);
            margin: 28px 0;
          }
          .privacy-content .footer {
            margin-top: 36px;
            padding-top: 20px;
            border-top: 1px solid rgba(34, 211, 238, 0.3);
            font-size: 0.92em;
            color: #94a3b8;
          }
        `}</style>

        <div className="privacy-content">
          <h1>OpenDesign</h1>
          <p>
            <strong>Last updated: May 22, 2026</strong>
          </p>

          <p>
            Ryan Joshua Fermoselle (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates the OpenDesign mobile application
            (the &quot;App&quot;). This Privacy Policy explains how we handle information when you use OpenDesign on iPhone
            and iPad.
          </p>
          <p>
            By using the App, you agree to this Privacy Policy. If you do not agree, please do not use the App.
          </p>

          <div className="section-divider" />

          <h2>1. Summary</h2>
          <p>
            OpenDesign is designed to keep your creative work on your device. Most project files, scans, recordings, and
            exports are stored locally on your iPhone or iPad. We do not sell your personal information.
          </p>
          <p>
            We may process certain data only when you use specific features — for example, when you grant camera access for
            LiDAR scanning, microphone access for audio recording, or local network access to connect to a 3D printer or
            stream an avatar to OBS on your Wi-Fi network.
          </p>

          <div className="section-divider" />

          <h2>2. Information We Collect</h2>

          <h3>A. Information you provide</h3>
          <ul>
            <li>
              Project names, folders, and creative content you create inside the App (3D models, sketches, circuits, floor
              plans, audio, video, chemistry data, game assets, avatars, and related files)
            </li>
            <li>Optional text you enter in export, sharing, or upload forms (such as video titles or descriptions)</li>
            <li>Support messages you send us by email</li>
          </ul>

          <h3>B. Information collected automatically on your device</h3>
          <ul>
            <li>App settings and preferences stored on your device</li>
            <li>Subscription status related to OpenDesign Pro (processed by Apple through In-App Purchase)</li>
            <li>
              Diagnostic logs generated on your device for debugging (we do not operate third-party analytics or advertising
              trackers in the App)
            </li>
          </ul>

          <h3>C. Information from device permissions (only if you grant access)</h3>
          <ul>
            <li>Camera: photogrammetry, object capture, AR features, avatar face tracking, and related scanning</li>
            <li>
              Microphone: Audio Studio, voice-over, screen recording with audio, and avatar lip-sync during streaming
            </li>
            <li>Photo Library (read): importing photos and videos for editing or 3D workflows</li>
            <li>Photo Library (add): saving exports, recordings, mixes, and rendered videos to your library</li>
            <li>
              Apple Music / Media Library: attaching downloaded or local music to audio or video timelines (not Apple Music
              streaming-only tracks)
            </li>
            <li>World Sensing / LiDAR / AR: room and object scanning, spatial tracking, and AR design tools on supported devices</li>
            <li>
              Local Network: discovering 3D printers on your Wi-Fi and broadcasting avatar or screen streams to apps such as
              OBS, Streamlabs, or browsers on the same network
            </li>
            <li>Screen Recording / Broadcast Extension: capturing in-app or system screen content when you start a recording or broadcast</li>
          </ul>

          <h3>D. Information sent to third parties only when you choose to use those features</h3>
          <ul>
            <li>Apple (App Store, In-App Purchases, iCloud if you enable iCloud sync, and system services)</li>
            <li>TikTok, when you use share actions that open the TikTok app</li>
            <li>
              Streaming platforms (Twitch, YouTube Live, TikTok Live, or custom RTMP destinations) when you enter stream
              credentials and start a live broadcast — stream keys and URLs are used to connect and are not sold by us
            </li>
            <li>
              Google / YouTube, if and when YouTube upload is enabled with your own OAuth credentials — authentication tokens may
              be stored in the iOS Keychain on your device
            </li>
            <li>
              Local or network 3D printers (OctoPrint, Moonraker, Klipper, IPP, and similar) when you connect to a printer on
              your network
            </li>
            <li>
              Other devices nearby, when you use local multiplayer features built on Apple&apos;s MultipeerConnectivity framework
              on the same Wi-Fi or Bluetooth range
            </li>
          </ul>

          <p>
            <strong>We do not require you to create an OpenDesign account to use the App.</strong>
          </p>

          <div className="section-divider" />

          <h2>3. How We Use Information</h2>
          <p>We use information to:</p>
          <ul>
            <li>Provide App features you request</li>
            <li>Save, open, export, and sync your projects</li>
            <li>Process subscriptions through Apple</li>
            <li>Improve stability and fix bugs</li>
            <li>Respond to support requests</li>
            <li>Comply with law</li>
          </ul>
          <p>
            <strong>We do not use your content to train AI models.</strong> Face and body data used for avatar animation and AR
            features are processed on your device for real-time rendering unless you explicitly export or share that content.
          </p>

          <div className="section-divider" />

          <h2>4. Where Data Is Stored</h2>
          <ul>
            <li>On your device: project files, scans, media, and most App data</li>
            <li>iOS Keychain: optional third-party auth tokens (such as YouTube, when configured)</li>
            <li>
              App Group container: shared data between the main App and the Screen Broadcast extension for recording workflows
            </li>
            <li>iCloud Drive (optional): if you enable iCloud Documents sync, project copies may be stored in your personal iCloud account under Apple&apos;s terms</li>
            <li>Your chosen third-party services: when you stream, share, or upload</li>
          </ul>

          <div className="section-divider" />

          <h2>5. Data Retention</h2>
          <p>
            We retain support emails as long as needed to respond and maintain records. Content on your device remains until you
            delete it or uninstall the App. iCloud copies remain until you remove them from iCloud. Subscription records are
            retained by Apple.
          </p>

          <div className="section-divider" />

          <h2>6. Sharing of Information</h2>
          <p>
            <strong>We do not sell personal information.</strong>
          </p>
          <p>We may share information:</p>
          <ul>
            <li>With Apple for payments, subscriptions, and platform services</li>
            <li>With service providers you direct the App to use (printers, streaming platforms, social apps)</li>
            <li>If required by law, court order, or to protect rights, safety, and security</li>
            <li>In connection with a merger, acquisition, or sale of assets, with notice where required</li>
          </ul>

          <div className="section-divider" />

          <h2>7. Children&apos;s Privacy</h2>
          <p>
            OpenDesign is not directed to children under 13. We do not knowingly collect personal information from children
            under 13. If you believe a child has provided us information, contact us and we will delete it.
          </p>

          <div className="section-divider" />

          <h2>8. Your Choices and Rights</h2>
          <p>You can:</p>
          <ul>
            <li>Deny or revoke permissions in iOS Settings → Privacy &amp; Security</li>
            <li>Delete projects inside the App</li>
            <li>Delete the App to remove local data</li>
            <li>Manage subscriptions in Settings → Apple ID → Subscriptions</li>
            <li>Request access, correction, or deletion of support-related data by emailing us</li>
          </ul>
          <p>
            Depending on where you live, you may have additional rights under laws such as GDPR, UK GDPR, or CCPA/CPRA. We will
            honor valid requests as required by law.
          </p>

          <div className="section-divider" />

          <h2>9. Security</h2>
          <p>
            We use reasonable technical and organizational measures appropriate to a local-first creative app. No method of
            storage or transmission is 100% secure.
          </p>

          <div className="section-divider" />

          <h2>10. International Users</h2>
          <p>
            If you use the App outside the United States, your information may be processed in the United States and other
            countries where our service providers operate.
          </p>

          <div className="section-divider" />

          <h2>11. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will post the updated version at the same URL and change
            the &quot;Last updated&quot; date. Continued use after changes means you accept the updated policy.
          </p>

          <div className="section-divider" />

          <h2>12. Contact Us</h2>
          <p>
            <strong>Ryan Joshua Fermoselle</strong>
          </p>
          <ul>
            <li>
              Email:{' '}
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            </li>
            <li>
              Website:{' '}
              <a href="https://opendesign.app" target="_blank" rel="noopener noreferrer">
                https://opendesign.app
              </a>
            </li>
          </ul>

          <div className="footer">
            <p>© {new Date().getFullYear()} Ryan Joshua Fermoselle. OpenDesign Privacy Policy.</p>
          </div>
        </div>

        <div className="text-center mt-12 space-y-4">
          <Link
            href="/opendesign"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold rounded-full transition-all duration-300 shadow-lg hover:shadow-cyan-500/25"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to OpenDesign
          </Link>
          <div>
            <Link href="/" className="text-slate-400 hover:text-cyan-300 text-sm underline">
              Drop Dollar home
            </Link>
          </div>
        </div>
      </div>

      <footer className="relative py-10 px-4 border-t border-cyan-500/20 bg-slate-950/80">
        <div className="max-w-4xl mx-auto text-center space-y-3">
          <p className="text-slate-500 text-sm mb-2">OpenDesign is part of the Drop Dollar family of applications</p>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm">
            <Link href="/opendesign/terms-of-service" className="text-violet-400 hover:text-violet-300 font-semibold">
              Terms of Service
            </Link>
            <span className="text-slate-600">•</span>
            <Link href="/opendesign/privacy-policy" className="text-cyan-400 hover:text-cyan-300 font-semibold">
              Privacy Policy
            </Link>
          </div>
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
