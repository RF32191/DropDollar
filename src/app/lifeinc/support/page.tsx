'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import CleanNavigation from '@/components/navigation/CleanNavigation';
import {
  Mail,
  HelpCircle,
  Shield,
  FileText,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ListChecks,
} from 'lucide-react';
import {
  LIFE_INC_HUB_URL,
  LIFE_INC_PRIVACY_URL,
  LIFE_INC_TERMS_URL,
  LIFE_INC_SUPPORT_URL,
} from '@/lib/lifeinc-public-urls';

const CONTACT_EMAIL = 'ryanfermoselle@outlook.com';
const APPLE_SUBSCRIPTIONS_URL = 'https://apps.apple.com/account/subscriptions';

interface FAQEntry {
  q: string;
  a: React.ReactNode;
}

const faqs: FAQEntry[] = [
  {
    q: 'How do I restore my subscription or purchases?',
    a: (
      <>
        Open the App → <strong>Settings</strong> or the premium screen → <strong>Restore Purchases</strong>. Make sure you are
        signed in with the same Apple ID or Google account used to subscribe.
      </>
    ),
  },
  {
    q: 'How do I cancel my subscription?',
    a: (
      <>
        <p className="mb-3">
          <strong>iPhone / iPad:</strong> Settings → Apple ID → Subscriptions → Life Inc. → Cancel Subscription.
        </p>
        <p>
          <strong>Android:</strong> Google Play → Profile → Payments &amp; subscriptions → Subscriptions → Life Inc. → Cancel.
        </p>
        <p className="mt-3">
          You can also manage Apple subscriptions at{' '}
          <a href={APPLE_SUBSCRIPTIONS_URL} target="_blank" rel="noopener noreferrer" className="text-emerald-300 underline">
            apps.apple.com/account/subscriptions
          </a>
          .
        </p>
      </>
    ),
  },
  {
    q: 'Where is my game progress saved?',
    a: (
      <>
        Most progress, settings, and unlocked content are stored <strong>locally on your device</strong>. If you delete the App
        or clear its data, local saves may be lost unless you have a backup. If you sign in with an account, some entitlements
        may sync through your app marketplace.
      </>
    ),
  },
  {
    q: 'What do Premium / subscription features include?',
    a: (
      <>
        Subscriptions unlock additional worlds, modes, and premium content. Billing is handled by the Apple App Store or Google
        Play — we do not receive your full payment card details. See our{' '}
        <Link href="/lifeinc/terms-and-conditions" className="text-emerald-300 underline">
          Terms &amp; Conditions
        </Link>{' '}
        for billing, auto-renewal, and refund details.
      </>
    ),
  },
  {
    q: 'How does terraforming and evolution work?',
    a: (
      <>
        Adapt your species to survive hostile biomes, unlock traits through evolution, and spread life to terraform dead
        planets. Each world has different challenges — experiment with mutations and strategies to green the galaxy.
      </>
    ),
  },
  {
    q: 'I lost progress or Virtual Items after reinstalling',
    a: (
      <>
        Virtual Items and local saves may not transfer if they were only stored on your device. Try{' '}
        <strong>Restore Purchases</strong> to recover subscription entitlements. We cannot guarantee recovery of all local
        progress — see our Terms regarding Virtual Items and saved data.
      </>
    ),
  },
  {
    q: 'How do I request a refund?',
    a: (
      <>
        Refunds are handled by the app marketplace where you purchased (Apple or Google), not directly by us. Visit your
        marketplace purchase history and request a refund according to their policies. For Apple, use{' '}
        <a
          href="https://reportaproblem.apple.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-300 underline"
        >
          reportaproblem.apple.com
        </a>
        .
      </>
    ),
  },
  {
    q: 'Does Life Inc. sell my personal information?',
    a: (
      <>
        No. We do not sell your personal information or use cross-app ad tracking. Most gameplay data stays on your device.
        Read our{' '}
        <Link href="/lifeinc/privacy-policy" className="text-emerald-300 underline">
          Privacy Policy
        </Link>{' '}
        for full details.
      </>
    ),
  },
  {
    q: 'The App crashes or freezes',
    a: (
      <>
        Try force-quitting and reopening the App. Restart your device and make sure you are on the latest version from the App
        Store or Google Play. If the problem continues, email us with your device model, OS version, and what you were doing
        when it happened.
      </>
    ),
  },
];

export default function LifeIncSupportPage() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-[#030806] text-slate-100 relative overflow-x-hidden">
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.18]"
        style={{
          backgroundImage: `
            radial-gradient(circle at 25% 35%, rgba(52,211,153,0.35) 1px, transparent 1px),
            radial-gradient(circle at 75% 65%, rgba(74,222,128,0.25) 1px, transparent 1px)
          `,
          backgroundSize: '64px 64px, 96px 96px',
        }}
      />

      <CleanNavigation variant="gradient" currentPage="/lifeinc" />

      <main className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-24">
        <header className="text-center mb-14">
          <p className="text-emerald-400/90 text-xs font-semibold tracking-[0.2em] uppercase mb-3">Help</p>
          <h1 className="text-4xl sm:text-5xl font-black bg-gradient-to-r from-emerald-200 via-lime-200 to-teal-200 bg-clip-text text-transparent mb-4">
            Life Inc. Support
          </h1>
          <p className="text-lg text-slate-300">Need help evolving, terraforming, or managing your subscription? We&apos;re here.</p>
        </header>

        {/* Contact */}
        <section className="rounded-2xl border border-emerald-500/35 bg-slate-900/70 backdrop-blur-md p-8 mb-10 shadow-xl shadow-emerald-950/50">
          <div className="flex items-center gap-3 mb-4">
            <Mail className="w-8 h-8 text-emerald-400" />
            <h2 className="text-2xl font-bold text-white">Contact</h2>
          </div>
          <p className="text-slate-300 mb-2">
            <span className="text-slate-400">Email: </span>
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-emerald-300 hover:text-emerald-200 font-semibold underline">
              {CONTACT_EMAIL}
            </a>
          </p>
          <p className="text-slate-500 text-sm">We usually respond within 2–3 business days.</p>
        </section>

        {/* Before you write */}
        <section className="rounded-2xl border border-teal-500/30 bg-gradient-to-br from-slate-900/80 to-emerald-950/60 p-8 mb-10">
          <div className="flex items-center gap-3 mb-5">
            <ListChecks className="w-7 h-7 text-teal-300" />
            <h2 className="text-xl font-bold text-white">Before You Write</h2>
          </div>
          <p className="text-slate-400 text-sm mb-4">Please include:</p>
          <ul className="space-y-3 text-slate-300">
            <li className="flex gap-2">
              <span className="text-emerald-400 font-bold shrink-0">•</span>
              Device model (e.g. iPhone 16, Pixel 9, iPad)
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-400 font-bold shrink-0">•</span>
              iOS or Android version
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-400 font-bold shrink-0">•</span>
              Life Inc. app version
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-400 font-bold shrink-0">•</span>
              What you were trying to do (world, mode, purchase, etc.)
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-400 font-bold shrink-0">•</span>
              Screenshots or screen recordings if possible
            </li>
          </ul>
        </section>

        {/* FAQ */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <HelpCircle className="w-8 h-8 text-teal-400" />
            <h2 className="text-2xl font-bold text-white">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((item, i) => {
              const open = openIdx === i;
              return (
                <div
                  key={item.q}
                  className="rounded-xl border border-slate-700/80 bg-slate-900/50 overflow-hidden transition-colors hover:border-emerald-500/30"
                >
                  <button
                    type="button"
                    onClick={() => setOpenIdx(open ? null : i)}
                    className="w-full flex items-center justify-between gap-4 text-left px-5 py-4 text-white font-semibold"
                  >
                    <span>{item.q}</span>
                    {open ? (
                      <ChevronUp className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-500 shrink-0" />
                    )}
                  </button>
                  {open && (
                    <div className="px-5 pb-5 pt-0 text-slate-300 text-sm leading-relaxed border-t border-slate-800/80">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Privacy & Terms */}
        <section className="rounded-2xl border border-emerald-500/25 bg-slate-900/60 p-8 mb-12">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-7 h-7 text-emerald-400" />
            <h2 className="text-xl font-bold text-white">Privacy and Terms</h2>
          </div>

          <p className="text-slate-500 text-xs uppercase tracking-wide mb-3">Drop Dollar hub</p>
          <div className="flex flex-wrap gap-4 mb-8">
            <Link
              href="/lifeinc/privacy-policy"
              className="inline-flex items-center gap-2 text-emerald-300 hover:text-emerald-100 font-semibold underline-offset-4 hover:underline"
            >
              <Shield className="w-4 h-4" />
              Privacy Policy
            </Link>
            <Link
              href="/lifeinc/terms-and-conditions"
              className="inline-flex items-center gap-2 text-teal-300 hover:text-teal-100 font-semibold underline-offset-4 hover:underline"
            >
              <FileText className="w-4 h-4" />
              Terms &amp; Conditions
            </Link>
          </div>

          <p className="text-slate-500 text-xs uppercase tracking-wide mb-3">Public links (share &amp; App Store metadata)</p>
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-x-8 gap-y-3 text-sm">
            <a
              href={LIFE_INC_HUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-white inline-flex items-center gap-1"
            >
              {LIFE_INC_HUB_URL.replace(/^https:\/\//, '')}
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href={LIFE_INC_SUPPORT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-lime-300 inline-flex items-center gap-1"
            >
              Support (full URL)
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href={LIFE_INC_PRIVACY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-emerald-300 inline-flex items-center gap-1"
            >
              Privacy (full URL)
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href={LIFE_INC_TERMS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-teal-300 inline-flex items-center gap-1"
            >
              Terms (full URL)
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </section>

        <div className="text-center space-y-4">
          <Link
            href="/lifeinc"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white transition-all shadow-lg"
          >
            ← Back to Life Inc.
          </Link>
          <div>
            <Link href="/" className="text-slate-500 hover:text-slate-300 text-sm">
              Drop Dollar home
            </Link>
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-slate-800 bg-slate-950 py-8 px-4 text-center text-slate-500 text-sm">
        Life Inc. • © {new Date().getFullYear()} Life Inc.
      </footer>
    </div>
  );
}
