'use client';

import React from 'react';
import Link from 'next/link';
import CleanNavigation from '@/components/navigation/CleanNavigation';
import { ArrowLeft } from 'lucide-react';

const CONTACT_EMAIL = 'ryanfermoselle@outlook.com';

export default function MogMePrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-yellow-900">
      <CleanNavigation variant="gradient" currentPage="/mog-me" />

      <div className="max-w-4xl mx-auto px-6 py-20 relative z-10">
        <style jsx>{`
          .privacy-content {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.65;
            color: #d4f1d4;
            background: rgba(22, 101, 52, 0.4);
            backdrop-filter: blur(24px);
            padding: 40px;
            border-radius: 24px;
            border: 2px solid rgba(250, 204, 21, 0.4);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          }
          .privacy-content h1 {
            color: #fbbf24;
            border-bottom: 3px solid #facc15;
            padding-bottom: 10px;
            font-size: 2.5rem;
            margin-bottom: 10px;
          }
          .privacy-content h2 {
            color: #fde047;
            margin-top: 36px;
            border-bottom: 2px solid rgba(250, 204, 21, 0.3);
            padding-bottom: 8px;
            padding-top: 16px;
            font-size: 1.65rem;
            font-weight: 700;
          }
          .privacy-content h3 {
            color: #bef264;
            margin-top: 22px;
            font-weight: 600;
            font-size: 1.15rem;
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
            color: #fde047;
            font-weight: 600;
          }
          .privacy-content a {
            color: #fbbf24;
            text-decoration: underline;
          }
          .privacy-content .section-divider {
            border-top: 2px solid rgba(250, 204, 21, 0.3);
            margin: 28px 0;
          }
          .privacy-content .footer {
            margin-top: 36px;
            padding-top: 20px;
            border-top: 2px solid rgba(250, 204, 21, 0.3);
            font-size: 0.92em;
            color: #bef264;
          }
          .privacy-content .highlight {
            background: rgba(250, 204, 21, 0.12);
            padding: 16px 20px;
            border-left: 4px solid #fbbf24;
            border-radius: 8px;
            margin: 16px 0;
          }
        `}</style>

        <div className="privacy-content">
          <h1>MogME AI - Privacy Policy</h1>
          <p>
            <strong>Last Updated: June 15, 2026</strong>
          </p>

          <div className="section-divider" />

          <h2>1. Introduction</h2>
          <p>
            Welcome to MogME AI (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). We are committed to protecting your
            privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our
            mobile application, Apple Watch companion app, and related online services (collectively, the &quot;Service&quot;).
          </p>
          <p>
            Most of MogME AI works entirely on your device. A limited set of optional, opt-in features (global leaderboards, the
            AI Companion / AI Rizz chat, and the Mog-Off competitive mode) send a small amount of data to our servers so those
            features can work. This policy explains exactly what those are.
          </p>
          <p>
            By using MogME AI, you agree to the collection and use of information in accordance with this policy. If you do not
            agree, please do not use the Service.
          </p>

          <h2>2. Information We Collect</h2>

          <h3>2.1 Information You Provide</h3>
          <ul>
            <li>
              <strong>Account / Subscription:</strong> Subscription status from Apple StoreKit (we never see your payment
              details).
            </li>
            <li>
              <strong>Username / Handle:</strong> A display name you choose for leaderboards and Mog-Off. It may be a pseudonym
              and is shown publicly to other users.
            </li>
            <li>
              <strong>User Preferences:</strong> Gender selection, goals, diet/nutrition targets, app settings.
            </li>
            <li>
              <strong>Manual Entries:</strong> Meals/food logs, body measurements, and other data you log.
            </li>
          </ul>

          <h3>2.2 Automatically Collected Information</h3>
          <ul>
            <li>
              <strong>Device Information:</strong> Device type, OS version, device identifiers.
            </li>
            <li>
              <strong>Usage Data:</strong> Features used, time in app, interactions.
            </li>
            <li>
              <strong>App Performance:</strong> Anonymized crash reports and error logs.
            </li>
          </ul>

          <h3>2.3 Facial &amp; Body Analysis Data (On-Device)</h3>
          <ul>
            <li>
              Facial landmark coordinates (76+ points): eye position/canthal tilt, nose, jawline, symmetry, proportions, skin
              and hair quality metrics.
            </li>
            <li>
              Body pose landmark coordinates (17+ points) and derived measurements (shoulder/waist/hip ratios, posture,
              estimated body composition).
            </li>
            <li>
              Processing is 100% on-device via Apple&apos;s Vision Framework. Your raw photo is discarded after analysis unless
              you choose to save it to history (stored locally, max 50 most recent, deletable anytime). The only exception is the
              optional Mog-Off mode (Section 7), which uploads a deliberately distorted, watermarked outline image and a numeric
              score — never your true photo.
            </li>
            <li>We do NOT collect biometric templates, faceprints, or facial-recognition data.</li>
          </ul>

          <h3>2.4 HealthKit Data (iPhone + Apple Watch)</h3>
          <ul>
            <li>
              <strong>We read:</strong> heart rate (current/avg/resting/max), steps, distance, active energy.
            </li>
            <li>
              <strong>We write:</strong> workout sessions, active energy, and heart rate during workouts.
            </li>
            <li>
              HealthKit data is stored in Apple&apos;s Health app, processed locally, never sent to our servers, and never shared
              with third parties. Revoke anytime in iOS Settings → Privacy &amp; Security → Health.
            </li>
          </ul>

          <h3>2.5 Location &amp; Workout Tracking Data (On-Device)</h3>
          <p>
            When you start a GPS-based workout (e.g., Japanese Walking, interval cardio, runs/walks), the app uses your
            device&apos;s location while the workout is active to measure:
          </p>
          <ul>
            <li>Precise location, speed/pace, distance, route, and elevation gain</li>
            <li>GPS signal quality and accuracy indicators</li>
          </ul>
          <p>
            <strong>How it is handled:</strong>
          </p>
          <ul>
            <li>
              Location is used only during an active workout and to display/save your workout summary. It is processed on-device.
            </li>
            <li>
              We do NOT continuously track your location in the background for advertising or profiling, and we do NOT sell or
              share location data.
            </li>
            <li>
              Your route/location data is stored locally with your workout history and is not uploaded to our servers. You can
              deny or revoke location access anytime in iOS Settings → Privacy &amp; Security → Location Services.
            </li>
          </ul>

          <h3>2.6 Online Features Data (Sent to Our Servers — Opt-In)</h3>
          <p>The following features transmit limited data off your device:</p>
          <ul>
            <li>
              <strong>Global Leaderboards:</strong> your chosen public handle and the relevant scores/metrics (e.g., cognition
              scores, facial score, AI Rizz fastest time) so you can be ranked against other players. These are stored on our
              server and shown publicly. (See Section 5.)
            </li>
            <li>
              <strong>AI Companion / Meet-Cute &amp; AI Rizz Chat:</strong> the text messages you type are sent to our server and
              to a third-party AI model provider to generate replies. (See Section 6.)
            </li>
            <li>
              <strong>Apple Watch AI Check-In:</strong> a short check-in request relayed from your Watch through your iPhone to
              the AI service, and the reply relayed back.
            </li>
            <li>
              <strong>Mog-Off Competitive Mode:</strong> described in detail in Section 7.
            </li>
          </ul>

          <h2>3. How We Use Your Information</h2>
          <ul>
            <li>
              Provide app functionality: facial/body analysis, fitness and GPS workout tracking, nutrition/diet tracking and
              recommendations, cognitive and physical games, leaderboards, AI chat features, and the optional Mog-Off mode.
            </li>
            <li>Personalize recommendations and diet/calorie/macro targets based on your inputs and metrics.</li>
            <li>Maintain leaderboards and competitive matchmaking.</li>
            <li>Improve the app via anonymized crash and usage analytics.</li>
            <li>Respond to support requests.</li>
          </ul>
          <p>
            We do NOT use your information for third-party advertising, and we do NOT sell your personal information.
          </p>

          <h2>4. Data Sharing and Third Parties</h2>
          <p>
            We do NOT sell your data and do NOT share it with advertising networks, data brokers, or marketing companies. We do
            not track you across other apps or websites, and we do not use advertising identifiers (IDFA).
          </p>
          <p>
            <strong>Limited disclosures that DO occur:</strong>
          </p>
          <ul>
            <li>
              <strong>Apple Services:</strong> StoreKit (subscription status only), optional iCloud backup, and Apple&apos;s
              anonymized analytics.
            </li>
            <li>
              <strong>Leaderboard / Match Server:</strong> your public handle and competition scores are stored on our server and
              shown publicly to other users (opt-in features only).
            </li>
            <li>
              <strong>AI Model Provider:</strong> AI Companion / AI Rizz chat messages are processed by a third-party AI
              provider to generate replies. Do not share sensitive personal information in these chats.
            </li>
            <li>
              <strong>Social Sharing (You Initiate):</strong> when you tap &quot;Share,&quot; the app builds a branded image
              card of your result on your device and hands it to the iOS share sheet. You choose the destination (Messages,
              social media, etc.). We do not post on your behalf or send shared content to our servers.
            </li>
          </ul>
          <div className="highlight">
            <p>
              Your face photo, body photos, HealthKit data, and workout location/route are NEVER sent to our servers. The only
              image ever transmitted is the distorted, watermarked Mog-Off outline (Section 7).
            </p>
          </div>

          <h2>5. Leaderboards &amp; Public Username</h2>
          <ul>
            <li>
              Leaderboards are optional. If you participate, you choose a public handle (which may be a pseudonym) and your
              relevant scores are uploaded and displayed publicly alongside that handle.
            </li>
            <li>
              Handles are intended to be globally unique. Do not include personal information you do not want shown publicly.
            </li>
            <li>We do not publish your real name, email, photos, or location on leaderboards.</li>
            <li>
              You can change your handle or stop participating. Contact us to request removal of your leaderboard entry.
            </li>
          </ul>

          <h2>6. AI Companion &amp; AI Chat Features</h2>
          <ul>
            <li>
              The AI Companion (including &quot;Meet-Cute&quot; mode) and the AI Rizz round generate responses using a
              third-party AI model provider.
            </li>
            <li>
              The messages you type are transmitted to our server and the provider solely to produce replies. They are not used
              to build advertising profiles.
            </li>
            <li>
              These are entertainment features and not professional, medical, legal, or relationship advice. Do not share
              sensitive personal information in the chat.
            </li>
          </ul>

          <h2>7. Mog-Off Competitive Mode (Optional, 18+)</h2>
          <p>
            Mog-Off is an optional, opt-in head-to-head game (Face, Cognition, AI Rizz rounds) played against another player
            over our match server, after you provide explicit consent and confirm you are 18 or older.
          </p>
          <p>
            <strong>What is uploaded when you play Mog-Off:</strong>
          </p>
          <ul>
            <li>Your chosen handle and a match/account identifier.</li>
            <li>
              Face round: ONLY your numeric PSL score (0–10) computed on-device, PLUS a deliberately distorted, edge-outline,
              watermarked version of your photo (the distortion is generated on your device before anything is sent).
            </li>
            <li>Cognition round: your answers and timing.</li>
            <li>AI Rizz round: the chat messages you type.</li>
          </ul>
          <p>
            <strong>What is NEVER uploaded:</strong>
          </p>
          <ul>
            <li>Your true, un-distorted photo. Only the distorted, watermarked outline is sent.</li>
            <li>Your HealthKit data, body analysis, or workout location/route data.</li>
          </ul>
          <p>
            <strong>How the distorted image is handled and retained:</strong>
          </p>
          <ul>
            <li>It is screened by automated content moderation.</li>
            <li>It is relayed to your opponent so they see only an outline (not your real face).</li>
            <li>
              It is deleted from the server as soon as the face round resolves, when the match ends, or if a player disconnects
              mid-match — not retained long-term.
            </li>
          </ul>
          <p>
            <strong>Consent and controls:</strong> You must accept an image-sharing consent and confirm you are 18+ before the
            face round. If you never play Mog-Off, none of this data is collected.
          </p>

          <h2>8. Data Security</h2>
          <ul>
            <li>On-device data is encrypted by iOS and runs in the app&apos;s secure sandbox.</li>
            <li>
              Network connections to our servers and the AI provider use industry-standard transport encryption (TLS).
            </li>
            <li>Sensitive data (true photos, HealthKit, workout location) stays on your device.</li>
            <li>
              No method of storage or transmission is 100% secure; we cannot guarantee absolute security, but off-device data is
              deliberately minimized.
            </li>
          </ul>

          <h2>9. Your Privacy Rights &amp; Controls</h2>
          <ul>
            <li>View/delete saved analysis history in the app at any time.</li>
            <li>Revoke Camera, Photos, Location, or HealthKit access in iOS Settings.</li>
            <li>Manage or cancel your subscription in iOS Settings → Subscriptions.</li>
            <li>Request removal of your leaderboard entry or handle by contacting us.</li>
            <li>
              Uninstalling the app permanently removes locally stored data (no cloud backup by default; deleted local data cannot
              be recovered).
            </li>
          </ul>

          <h2>10. Children&apos;s Privacy</h2>
          <p>
            MogME AI is intended for users 18 years of age and older. We do not knowingly collect information from anyone under
            18. If you believe a minor has provided information, contact us at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and we will delete it.
          </p>

          <h2>11. International Data Transfers</h2>
          <p>
            On-device processing (facial/body analysis, HealthKit, workout location) stays on your device. Data used by online
            features (leaderboards, AI chat, Mog-Off) is processed on our servers and by our AI provider, which may be located
            in the United States or other countries. By using those optional features, you consent to that processing.
          </p>

          <h2>12. Medical Disclaimer</h2>
          <p>
            MogME AI provides aesthetic, fitness, and nutrition information for entertainment and general informational purposes
            only. It is not a medical device and not medical advice. Consult qualified professionals before changing your diet or
            fitness routine.
          </p>

          <h2>13. Changes to This Policy</h2>
          <p>
            We may update this policy and will revise the &quot;Last Updated&quot; date, with in-app notice for significant
            changes.
          </p>

          <h2>14. Contact Us</h2>
          <p>
            Email: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          </p>

          <div className="footer">
            <p>© {new Date().getFullYear()} Ryan Joshua Fermoselle. All rights reserved.</p>
            <p>Last Updated: June 15, 2026.</p>
          </div>
        </div>

        <div className="text-center mt-12">
          <Link
            href="/mog-me"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-green-600 to-yellow-500 text-white font-bold rounded-full hover:from-green-500 hover:to-yellow-400 transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Mog Me
          </Link>
        </div>
      </div>

      <footer className="relative py-12 px-4 sm:px-6 lg:px-8 border-t-2 border-yellow-400/30 bg-green-900/50">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-green-200 mb-4">Mog Me is part of the Drop Dollar family of applications</p>
          <div className="flex flex-wrap justify-center gap-4 text-sm mb-4">
            <Link href="/mog-me/terms-of-service" className="text-yellow-400 hover:text-yellow-300 font-semibold">
              Terms of Service
            </Link>
            <span className="text-green-400">•</span>
            <Link href="/mog-me/support" className="text-yellow-400 hover:text-yellow-300 font-semibold">
              Support
            </Link>
          </div>
          <a
            href="https://www.drop-dollar.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-yellow-400 hover:text-yellow-300 font-semibold transition-colors hover:underline"
          >
            Visit Drop Dollar
          </a>
        </div>
      </footer>
    </div>
  );
}
