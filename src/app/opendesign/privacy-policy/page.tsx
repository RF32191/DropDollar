'use client';

import React from 'react';
import Link from 'next/link';
import CleanNavigation from '@/components/navigation/CleanNavigation';
import { OPEN_DESIGN_PRIVACY_URL } from '@/lib/opendesign-public-urls';
import { ArrowLeft } from 'lucide-react';

const CONTACT_EMAIL = 'ryanfermoselle@outlook.com';

export default function OpenDesignPrivacyPolicyPage() {
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
          .privacy-content h4 {
            color: #94a3b8;
            margin-top: 18px;
            font-weight: 600;
            font-size: 1rem;
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
          .privacy-content table {
            width: 100%;
            border-collapse: collapse;
            margin: 16px 0;
            font-size: 0.9rem;
          }
          .privacy-content th,
          .privacy-content td {
            border: 1px solid rgba(34, 211, 238, 0.25);
            padding: 10px 12px;
            text-align: left;
            vertical-align: top;
          }
          .privacy-content th {
            background: rgba(34, 211, 238, 0.1);
            color: #e2e8f0;
            font-weight: 600;
          }
          .privacy-content .table-wrap {
            overflow-x: auto;
            margin: 16px 0;
          }
          .privacy-content .reference-box {
            background: rgba(99, 102, 241, 0.08);
            border: 1px solid rgba(99, 102, 241, 0.3);
            border-radius: 12px;
            padding: 20px;
            margin-top: 24px;
          }
        `}</style>

        <div className="privacy-content">
          <h1>OpenDesignAI Privacy Policy</h1>
          <p>
            <strong>Effective date: June 6, 2026</strong>
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

          <p>
            This Privacy Policy describes how OpenDesignAI (&quot;OpenDesign,&quot; &quot;we,&quot; &quot;us,&quot; or
            &quot;the app&quot;) handles information when you use our iOS and iPadOS application. OpenDesign is a creative
            design app (3D modeling, architecture, animation, avatar creation, LiDAR scanning, audio/video studio, games,
            document editing, and related tools). Most processing happens on your device. We only send data to our servers when you explicitly use
            optional Cloud AI 3D features while subscribed to OpenDesign Pro.
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
            <li>
              <strong>Cloud AI 3D (optional, Pro):</strong> photos or text prompts you submit are sent to our proxy server for
              3D generation and forwarded to Replicate; we store only subscription-linked credit usage, not your creative
              library.
            </li>
          </ul>

          <div className="section-divider" />

          <h2>2. Information We Process</h2>

          <h3>2.1 Information you provide</h3>
          <ul>
            <li>
              <strong>Projects and creative content:</strong> 3D models, sketches, circuits, house plans, audio/video edits,
              avatar designs, LiDAR scans, game content, word-processing documents (Open Doc), spreadsheets (Open Spreadsheet),
              PDF projects (Open PDF Editor), and exports you create and save.
            </li>
            <li>
              <strong>Account / access:</strong> If you subscribe to OpenDesign Pro, Apple processes payment; we receive
              subscription status through Apple StoreKit (entitlement), not your full payment credentials.
            </li>
            <li>
              <strong>Cloud AI 3D (Pro only, when you choose to use it):</strong> a photo you select and/or a text prompt you
              type, sent over HTTPS to generate a 3D mesh.
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
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Permission</th>
                  <th>Purpose</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Camera</td>
                  <td>
                    3D scanning, photogrammetry, AR features, Cloud AI photo input, document scanning to PDF, and (on supported
                    devices) TrueDepth face tracking for avatars and animation
                  </td>
                </tr>
                <tr>
                  <td>Microphone</td>
                  <td>Audio Studio, voice-over, in-app recording, and microphone-driven lip-sync for avatars</td>
                </tr>
                <tr>
                  <td>Photo Library</td>
                  <td>Importing media for editing; saving exports, mixes, and recordings you choose to save</td>
                </tr>
                <tr>
                  <td>Apple Music / Media Library</td>
                  <td>Attaching downloaded/local songs to timelines in Audio or Video Studio</td>
                </tr>
                <tr>
                  <td>Local Network</td>
                  <td>
                    Discovering 3D printers on your Wi-Fi; local multiplayer and collaborative sessions over peer-to-peer
                    Wi-Fi/Bluetooth; streaming avatar preview to devices on your LAN (e.g. OBS, browsers)
                  </td>
                </tr>
                <tr>
                  <td>LiDAR / World Sensing</td>
                  <td>
                    Room and object 3D scanning on supported hardware only (devices with a LiDAR Scanner and compatible ARKit
                    scene reconstruction)
                  </td>
                </tr>
                <tr>
                  <td>Bluetooth (when used)</td>
                  <td>Local multiplayer session discovery and connection alongside Wi-Fi</td>
                </tr>
                <tr>
                  <td>Screen Recording (ReplayKit)</td>
                  <td>Capturing in-app or device screen content when you start a recording</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>We do not access these sensors in the background for unrelated purposes.</p>

          <h3>2.3 Face Data and TrueDepth Camera (App Store Review — Section 2.1)</h3>
          <p>
            <strong>What information is collected using the TrueDepth API?</strong>
          </p>
          <p>
            On iPhone and iPad models with a TrueDepth front camera, OpenDesign uses Apple&apos;s ARKit{' '}
            <code className="text-cyan-200">ARFaceTrackingConfiguration</code> when you open Avatar Creator, face motion
            capture, or related animation features. During an active session, the app may process:
          </p>
          <ul>
            <li>Facial blendshape coefficients (approximately 52 animation weights)</li>
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
          <p>
            Face data is used only for creative features you initiate: Avatar Creator, animation/motion capture, and live
            preview or streams you start (e.g. on your local network). Face data is not used for identification, advertising,
            analytics tracking, or sale to data brokers.
          </p>
          <p>
            <strong>Will the data be shared with third parties? Where will this information be stored?</strong>
          </p>
          <ul>
            <li>
              <strong>Third parties:</strong> We do not share TrueDepth or face tracking data with third parties. If you export
              a video or project that includes your likeness, you control where that file is sent.
            </li>
            <li>
              <strong>Storage:</strong> Live face tracking exists in app memory while the feature is active. Saved projects
              remain on your device and/or in your iCloud / Cloud Documents container under your Apple ID.
            </li>
          </ul>

          <h3>2.4 Cloud AI 3D (OpenDesign Pro)</h3>
          <p>
            When you use Cloud AI 3D, the app sends data to our hosted API (currently operated on Railway infrastructure) so
            we can run third-party AI mesh generation on your behalf.
          </p>
          <p>
            <strong>What we send:</strong>
          </p>
          <ul>
            <li>Photo mode: a JPEG of the image you choose (resized/compressed for upload).</li>
            <li>Prompt mode: the text description you enter.</li>
            <li>
              Headers for authentication: an app gateway key (built into the app binary) and an anonymous subscription account
              identifier derived from Apple StoreKit (Apple&apos;s original transaction ID for your subscription, or a stable test
              identifier during Xcode StoreKit testing). We do not send your name, email, or Apple ID email in these requests.
            </li>
          </ul>
          <p>
            <strong>What we do not send by default:</strong>
          </p>
          <ul>
            <li>Your full project library, LiDAR scans, face data, or unrelated photos.</li>
          </ul>
          <p>
            <strong>How it is used:</strong>
          </p>
          <ul>
            <li>
              Our server forwards your photo or prompt to Replicate (and its model providers) to produce a 3D mesh (GLB), then
              returns the mesh to your device.
            </li>
            <li>
              We decrement monthly Pro credits (photo and prompt allowances) tied to your subscription account identifier.
              Credit balances are stored on our server to prevent abuse across reinstalls.
            </li>
          </ul>
          <p>
            <strong>Retention:</strong>
          </p>
          <ul>
            <li>Uploaded photos and prompts are processed in memory for the request and are not stored by us as a permanent user gallery.</li>
            <li>
              Credit usage records (subscriber identifier + monthly counts) are retained on our server until reset or deletion
              as part of normal service operation.
            </li>
            <li>Generated meshes are saved on your device if you keep them in the app; we do not host your mesh library.</li>
          </ul>

          <h3>2.5 Local multiplayer and collaboration</h3>
          <p>
            Some features let nearby devices connect over local Wi-Fi or Bluetooth (peer-to-peer). Session data is exchanged
            directly between devices on your network. We do not operate a central matchmaking server for these features. Other
            users on your network may see a display name or session title you choose when hosting.
          </p>

          <h3>2.6 Document Suite (Open Doc, Open Spreadsheet, Open PDF Editor)</h3>
          <p>When you use our document tools:</p>
          <ul>
            <li>
              <strong>Open Doc and Open Spreadsheet:</strong> Your text, formatting, tables, and embedded images are stored
              locally in your project bundle on your device (and in iCloud if you use Cloud Documents). We do not upload
              document contents to our servers.
            </li>
            <li>
              <strong>Open PDF Editor:</strong> PDFs you import, scans you capture, signatures you draw or type, form fields,
              text boxes, images, highlights, and other edits are processed and stored on your device. Document scanning uses
              the device camera only when you start a scan. We do not upload your PDFs or signatures to our servers unless you
              explicitly share or email an export through a system share sheet you initiate.
            </li>
            <li>
              <strong>Exports:</strong> When you export or share a PDF, Word-compatible file, spreadsheet, or plain text, the
              file is written locally and handed to iOS share/print services you choose (Mail, AirDrop, Files, etc.). We do not
              receive copies of those exports.
            </li>
          </ul>
          <p>
            You are responsible for the documents you create, edit, sign, or distribute. OpenDesign does not provide legal, tax,
            or records-management advice.
          </p>

          <div className="section-divider" />

          <h2>3. How We Use Information</h2>
          <p>We use information to:</p>
          <ul>
            <li>Provide app functionality (editing, saving, exporting, printing prep, games, LiDAR, etc.)</li>
            <li>Validate OpenDesign Pro subscription status via Apple StoreKit</li>
            <li>Enforce Cloud AI 3D monthly credits for Pro subscribers</li>
            <li>Improve stability (e.g. on-device error logs via Apple&apos;s unified logging; not linked to face data)</li>
          </ul>
          <p>We do not use your content or face data for targeted advertising.</p>

          <div className="section-divider" />

          <h2>4. Data Storage and Security</h2>
          <ul>
            <li>
              <strong>On-device:</strong> Projects, LiDAR scans, Cloud AI history, and exports are stored in the app sandbox and
              locations you select in Files.
            </li>
            <li>
              <strong>iCloud / Cloud Documents:</strong> If enabled, Apple syncs your documents per your iCloud settings.
            </li>
            <li>
              <strong>Cloud AI proxy:</strong> Transient processing of photos/prompts and persistent credit accounting only, as
              described in Section 2.4.
            </li>
          </ul>
          <p>You are responsible for securing your device and Apple ID. Cloud AI requests use HTTPS.</p>

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
              Replicate (Cloud AI 3D mesh generation):{' '}
              <a href="https://replicate.com/privacy" target="_blank" rel="noopener noreferrer">
                https://replicate.com/privacy
              </a>
            </li>
            <li>
              Railway (cloud hosting for our API):{' '}
              <a href="https://railway.com/legal/privacy" target="_blank" rel="noopener noreferrer">
                https://railway.com/legal/privacy
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
            content on your device and server-side credit records where applicable.
          </p>

          <div className="section-divider" />

          <h2>7. Your Choices and Rights</h2>
          <ul>
            <li>
              <strong>Permissions:</strong> Revoke Camera, Microphone, Photos, Local Network, Bluetooth, etc. in Settings →
              OpenDesign.
            </li>
            <li>
              <strong>Subscriptions:</strong> Manage or cancel in Settings → Apple ID → Subscriptions, or{' '}
              <a href="https://apps.apple.com/account/subscriptions" target="_blank" rel="noopener noreferrer">
                https://apps.apple.com/account/subscriptions
              </a>
            </li>
            <li>
              <strong>Cloud AI:</strong> Do not use Cloud AI 3D if you do not want photos or prompts sent to our server and
              Replicate.
            </li>
            <li>
              <strong>Delete data:</strong> Delete projects in the app or remove the app from your device; remove iCloud copies
              via Files or iCloud settings.
            </li>
          </ul>
          <p>
            Depending on your region, you may have additional privacy rights. Contact us to request information about data we
            process.
          </p>

          <div className="section-divider" />

          <h2>8. International Users</h2>
          <p>
            If you use the app outside the United States, your information may be processed on your device, through
            Apple&apos;s infrastructure, on our U.S.-hosted API, and through Replicate&apos;s infrastructure in accordance with
            their policies.
          </p>

          <div className="section-divider" />

          <h2>9. Changes to This Policy</h2>
          <p>
            We may update this policy. We will post the revised version with a new effective date at{' '}
            <a href={OPEN_DESIGN_PRIVACY_URL}>{OPEN_DESIGN_PRIVACY_URL}</a>. Continued use after changes constitutes acceptance.
          </p>

          <div className="section-divider" />

          <h2>10. Contact Us</h2>
          <p>
            <strong>Ryan Joshua Fermoselle</strong>
          </p>
          <ul>
            <li>
              Email: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            </li>
            <li>App: OpenDesignAI on the App Store</li>
          </ul>
          <p>For App Store subscription or refund questions, contact Apple Support.</p>

          <div className="reference-box">
            <h4>App Store Connect — Privacy Nutrition Label (reference)</h4>
            <p className="text-sm text-slate-400 mb-4">
              When completing Apple&apos;s privacy questionnaire, consider declaring (adjust to match your final App Store
              answers):
            </p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Data type</th>
                    <th>Collected</th>
                    <th>Linked to identity</th>
                    <th>Used for tracking</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Photos / Videos</td>
                    <td>Yes (user content)</td>
                    <td>No*</td>
                    <td>No</td>
                    <td>Import/export; Cloud AI photo upload when user initiates</td>
                  </tr>
                  <tr>
                    <td>Audio</td>
                    <td>Yes</td>
                    <td>No*</td>
                    <td>No</td>
                    <td>Microphone for studio features</td>
                  </tr>
                  <tr>
                    <td>Other User Content</td>
                    <td>Yes</td>
                    <td>No*</td>
                    <td>No</td>
                    <td>3D projects, prompts for Cloud AI</td>
                  </tr>
                  <tr>
                    <td>Purchases</td>
                    <td>Yes</td>
                    <td>Yes</td>
                    <td>No</td>
                    <td>Via Apple StoreKit</td>
                  </tr>
                  <tr>
                    <td>User ID (subscription)</td>
                    <td>Yes</td>
                    <td>Yes</td>
                    <td>No</td>
                    <td>Apple original transaction ID for credits</td>
                  </tr>
                  <tr>
                    <td>Other Diagnostic</td>
                    <td>Optional</td>
                    <td>No</td>
                    <td>No</td>
                    <td>If you enable crash analytics later</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-sm text-slate-400 mt-4">
              *Processed for service delivery; not sold; not used for cross-app tracking.
            </p>
            <p className="text-sm text-slate-400">
              Face-related data: Processed on-device for avatar/animation; not uploaded to developer servers.
            </p>
          </div>

          <div className="footer">
            <p>© {new Date().getFullYear()} Ryan Joshua Fermoselle. OpenDesignAI Privacy Policy.</p>
            <p>Last updated: June 6, 2026.</p>
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
            <Link href="/opendesign/terms-of-service" className="text-violet-400 hover:text-violet-300 text-sm underline mr-4">
              Terms of Use
            </Link>
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
              Terms of Use
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
