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
          .privacy-content .highlight {
            background: rgba(34, 211, 238, 0.08);
            padding: 20px;
            border-left: 4px solid rgba(34, 211, 238, 0.6);
            border-radius: 8px;
            margin: 20px 0;
          }
        `}</style>

        <div className="privacy-content">
          <h1>OpenDesignAI Privacy Policy</h1>
          <p>
            <strong>Effective date: May 29, 2026</strong>
          </p>
          <ul className="!mt-4 !mb-6">
            <li>
              <strong>App:</strong> OpenDesignAI (OpenDesign)
            </li>
            <li>
              <strong>Developer:</strong> Ryan Fermoselle
            </li>
            <li>
              <strong>Contact:</strong>{' '}
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            </li>
          </ul>

          <p>
            This Privacy Policy describes how OpenDesignAI (&quot;OpenDesign,&quot; &quot;we,&quot; &quot;us,&quot; or
            &quot;the app&quot;) handles information when you use our iOS and iPadOS application. OpenDesign is a creative
            design app for 3D modeling, architecture, animation, avatar creation, audio/video studio, and related tools. Most
            processing happens on your device. We do not operate a backend that collects the content you create unless you
            explicitly choose to share or upload it through a third-party service (for example, YouTube).
          </p>

          <div className="section-divider" />

          <h2>1. Summary</h2>
          <ul>
            <li>We do not sell your personal information.</li>
            <li>We do not use face data for identity recognition, advertising, or tracking.</li>
            <li>
              Face and camera data used for avatar and animation features are processed on-device during active sessions.
            </li>
            <li>
              Project files you save stay on your device and/or in your iCloud / Files storage when you enable those services.
            </li>
            <li>Subscriptions are processed by Apple; we do not receive your full payment card details.</li>
          </ul>

          <div className="section-divider" />

          <h2>2. Information We Process</h2>

          <h3>2.1 Information You Provide</h3>
          <ul>
            <li>
              <strong>Projects and creative content:</strong> 3D models, sketches, circuits, house plans, audio/video edits,
              avatar designs, and exports you create and save.
            </li>
            <li>
              <strong>Account / access:</strong> If you subscribe to OpenDesign Pro, Apple processes payment; we receive
              subscription status through StoreKit (entitlement), not your full payment credentials.
            </li>
            <li>
              <strong>Optional credentials for third-party sharing:</strong> If you connect YouTube or similar services to
              upload content, you provide credentials or authorization through that service&apos;s flow; we do not store your
              YouTube password.
            </li>
          </ul>

          <h3>2.2 Information from device sensors and permissions</h3>
          <p>
            OpenDesign may request access to device features only when you use related tools. You can deny permission; those
            features will not work.
          </p>
          <ul>
            <li>
              <strong>Camera</strong> — 3D scanning, photogrammetry, AR features, and (on supported devices) TrueDepth face
              tracking for avatars and animation
            </li>
            <li>
              <strong>Microphone</strong> — Audio Studio, voice-over, in-app recording, and microphone-driven lip-sync for
              avatars
            </li>
            <li>
              <strong>Photo Library</strong> — Importing media for editing; saving exports, mixes, and recordings you choose
              to save
            </li>
            <li>
              <strong>Apple Music / Media Library</strong> — Attaching downloaded/local songs to timelines in Audio or Video
              Studio
            </li>
            <li>
              <strong>Local Network</strong> — Discovering 3D printers on your Wi-Fi and streaming avatar preview to devices
              on your local network (e.g. OBS, browsers)
            </li>
            <li>
              <strong>LiDAR / World Sensing</strong> — Room and object 3D scanning on supported hardware
            </li>
            <li>
              <strong>Screen Recording (ReplayKit)</strong> — Capturing in-app or device screen content when you start a
              recording
            </li>
          </ul>
          <p>We do not access these sensors in the background for unrelated purposes.</p>

          <h3>2.3 Face Data and TrueDepth Camera</h3>
          <p>This section explains how OpenDesign uses Apple&apos;s TrueDepth camera and ARKit face tracking.</p>

          <p>
            <strong>What information is collected using the TrueDepth API?</strong>
          </p>
          <p>
            On iPhone and iPad models with a TrueDepth front camera, OpenDesign uses Apple&apos;s ARKit{' '}
            <code className="text-cyan-200">ARFaceTrackingConfiguration</code> when you open Avatar Creator, face motion
            capture, or related animation features. During an active session, the app may process:
          </p>
          <ul>
            <li>
              Facial blendshape coefficients (approximately 52 animation weights describing mouth, jaw, brows, eyes, and
              similar expressions)
            </li>
            <li>Head pose (pitch, yaw, roll) and small head translation for preview alignment</li>
            <li>Face anchor transform data used to position the avatar relative to your face in real time</li>
          </ul>
          <p>
            On devices without TrueDepth, the app may use Apple Vision 2D face landmarks as a fallback. That fallback does not
            use a depth map.
          </p>
          <p>
            <strong>We do not upload raw face meshes, depth maps, or live camera frames of your face to our servers.</strong>
          </p>

          <p>
            <strong>For what purposes is this information collected?</strong>
          </p>
          <p>Face data is used only for creative features you initiate:</p>
          <ul>
            <li>
              <strong>Avatar Creator</strong> — animate 2D/3D avatars (mouth, expressions, head movement) in real time
            </li>
            <li>
              <strong>Animation / motion capture</strong> — record performance keyframes you choose to save in a project
            </li>
            <li>
              <strong>Live avatar preview / streaming</strong> — drive lip-sync and expressions during local preview or streams
              you start (e.g. on your local network)
            </li>
          </ul>
          <p>
            Face data is not used for user identification or authentication, advertising or marketing profiles, analytics
            or tracking, sale to data brokers, or any purpose unrelated to avatar and animation tooling.
          </p>

          <p>
            <strong>Will the data be shared with third parties? Where will this information be stored?</strong>
          </p>
          <ul>
            <li>
              <strong>Third parties:</strong> We do not share TrueDepth or face tracking data with third parties. If you export
              a video, project file, or recording that includes your likeness, you control where that file is sent (AirDrop,
              Files, Photos, YouTube, etc.).
            </li>
            <li>
              <strong>Storage:</strong> Live face tracking exists in app memory only while the feature is active. If you save
              a project, mocap recording, or exported video, that file is stored locally on your device and/or in your iCloud
              Drive / Cloud Documents container if you use those Apple services—under your Apple ID, not on OpenDesign-operated
              servers.
            </li>
            <li>
              <strong>Retention:</strong> We do not retain face tracking data on our servers. Saved project data remains until
              you delete it from your device or cloud storage.
            </li>
          </ul>

          <div className="highlight">
            <p className="!mb-0">
              <strong>Face Data and TrueDepth Camera (summary):</strong> OpenDesign uses the TrueDepth camera and ARKit face
              tracking only when you open Avatar Creator, face motion capture, or related animation features. We process
              facial geometry and expression parameters (blendshapes and head pose) solely to animate avatars and record
              performances you choose to save. Processing occurs on your device. We do not upload face scans to our servers,
              do not use face data for identity recognition, and do not sell or share face data with third parties. Saved
              projects and exports you create remain under your control on your device or in your personal cloud storage.
            </p>
          </div>

          <h3>2.4 Subscriptions and Payments</h3>
          <p>
            OpenDesign Pro is offered as auto-renewable subscriptions through the Apple App Store (product IDs:{' '}
            <code className="text-cyan-200">OpenDesign.Month</code> and <code className="text-cyan-200">OpenDesign.Annual</code>
            ). Apple collects and processes payment information. We receive only subscription entitlement status from Apple to
            unlock Pro features. We do not receive or store your credit card number. You can manage or cancel subscriptions in
            Settings → Apple ID → Subscriptions on your device.
          </p>

          <div className="section-divider" />

          <h2>3. How We Use Information</h2>
          <p>We use information to:</p>
          <ul>
            <li>Provide app functionality (editing, saving, exporting, printing prep, games, etc.)</li>
            <li>Validate OpenDesign Pro subscription status via Apple StoreKit</li>
            <li>
              Improve stability (e.g. on-device error logs via Apple&apos;s unified logging; not linked to face data)
            </li>
          </ul>
          <p>We do not use your content or face data for targeted advertising.</p>

          <div className="section-divider" />

          <h2>4. Data Storage and Security</h2>
          <ul>
            <li>
              <strong>On-device:</strong> Projects and exports are stored in the app&apos;s sandbox and locations you select in
              Files.
            </li>
            <li>
              <strong>iCloud / Cloud Documents:</strong> If enabled, Apple syncs your documents per your iCloud settings.
            </li>
            <li>
              <strong>No OpenDesign cloud:</strong> We do not maintain a central server that stores your 3D models, face
              scans, or recordings by default.
            </li>
            <li>You are responsible for securing your device and Apple ID.</li>
          </ul>

          <div className="section-divider" />

          <h2>5. Third-Party Services</h2>
          <p>When you choose to use these, their policies apply:</p>
          <ul>
            <li>
              Apple (App Store, StoreKit, iCloud):{' '}
              <a href="https://www.apple.com/legal/privacy/" target="_blank" rel="noopener noreferrer">
                https://www.apple.com/legal/privacy/
              </a>
            </li>
            <li>
              YouTube (optional upload):{' '}
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
                https://policies.google.com/privacy
              </a>
            </li>
            <li>TikTok share (optional, if installed): TikTok&apos;s privacy policy</li>
          </ul>
          <p>We do not control third-party services.</p>

          <div className="section-divider" />

          <h2>6. Children&apos;s Privacy</h2>
          <p>
            OpenDesign is not directed at children under 13. We do not knowingly collect personal information from children.
            If you believe a child has provided information, contact us and we will assist with deletion of locally stored
            content on your device.
          </p>

          <div className="section-divider" />

          <h2>7. Your Choices and Rights</h2>
          <ul>
            <li>
              <strong>Permissions:</strong> Revoke Camera, Microphone, Photos, etc. in Settings → OpenDesignAI.
            </li>
            <li>
              <strong>Subscriptions:</strong> Manage or cancel in Settings → Apple ID → Subscriptions.
            </li>
            <li>
              <strong>Delete data:</strong> Delete projects in the app or remove the app from your device; remove iCloud
              copies via Files or iCloud settings.
            </li>
          </ul>
          <p>
            Depending on your region, you may have additional privacy rights. Contact us to request information about data we
            process (primarily subscription entitlement via Apple).
          </p>

          <div className="section-divider" />

          <h2>8. International Users</h2>
          <p>
            If you use the app outside the United States, your information may be processed on your device and through
            Apple&apos;s infrastructure in accordance with Apple&apos;s policies.
          </p>

          <div className="section-divider" />

          <h2>9. Changes to This Policy</h2>
          <p>
            We may update this policy. We will post the revised version with a new effective date on this page. Continued use
            of the app after changes constitutes acceptance of the updated policy.
          </p>

          <div className="section-divider" />

          <h2>10. Contact Us</h2>
          <p>
            <strong>Ryan Fermoselle</strong>
          </p>
          <ul>
            <li>
              Email: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            </li>
            <li>App: OpenDesignAI on the App Store</li>
          </ul>
          <p>For App Store subscription or refund questions, contact Apple Support.</p>

          <div className="footer">
            <p>© {new Date().getFullYear()} Ryan Fermoselle. OpenDesignAI Privacy Policy.</p>
            <p>Effective date: May 29, 2026.</p>
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
            <span className="text-slate-600">•</span>
            <Link href="/opendesign/support" className="text-slate-400 hover:text-white font-semibold">
              Support
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
