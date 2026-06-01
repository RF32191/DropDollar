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
import { OPEN_DESIGN_HUB_URL, OPEN_DESIGN_PRIVACY_URL, OPEN_DESIGN_TERMS_URL } from '@/lib/opendesign-public-urls';

const CONTACT_EMAIL = 'support@drop-dollar.com';

interface FAQEntry {
  q: string;
  a: React.ReactNode;
}

const faqs: FAQEntry[] = [
  {
    q: 'How do I restore OpenDesign Pro?',
    a: (
      <>
        Open the App → <strong>OpenDesign Pro</strong> → <strong>Restore Purchases</strong>. Make sure you are signed in with
        the same Apple ID used to subscribe.
      </>
    ),
  },
  {
    q: 'How do I cancel my subscription?',
    a: (
      <>
        Go to <strong>Settings → Apple ID → Subscriptions → OpenDesign → Cancel Subscription</strong>.
      </>
    ),
  },
  {
    q: 'Where are my projects saved?',
    a: (
      <>
        Projects are saved on your device. If you enabled iCloud sync, copies may also be stored in your iCloud Drive.
      </>
    ),
  },
  {
    q: 'Why does OpenDesign ask for camera, microphone, or local network access?',
    a: (
      <>
        <ul className="list-disc pl-5 space-y-2 mb-4">
          <li>
            <strong>Camera / LiDAR:</strong> scanning, AR, and avatar face tracking
          </li>
          <li>
            <strong>Microphone:</strong> audio recording and streaming lip-sync
          </li>
          <li>
            <strong>Local network:</strong> 3D printer discovery and OBS/avatar streaming on your Wi‑Fi
          </li>
        </ul>
        <p>
          You can change permissions anytime in <strong>Settings → Privacy &amp; Security</strong>.
        </p>
      </>
    ),
  },
  {
    q: 'How do I export my work?',
    a: (
      <>
        Open your project and use the <strong>Export</strong> or <strong>Share</strong> options in the editor. Some export formats
        require OpenDesign Pro.
      </>
    ),
  },
  {
    q: 'The App crashes or won’t build a project',
    a: (
      <>
        Try force-quitting and reopening the App. If the problem continues, restart your device and make sure you are on the
        latest App version.
      </>
    ),
  },
];

export default function OpenDesignSupportPage() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 relative overflow-x-hidden">
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.2]"
        style={{
          perspective: '800px',
          backgroundImage: `
            linear-gradient(rgba(34,211,238,0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34,211,238,0.08) 1px, transparent 1px)
          `,
          backgroundSize: '36px 36px',
        }}
      />

      <CleanNavigation variant="gradient" currentPage="/opendesign" />

      <main className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-24">
        <header className="text-center mb-14">
          <p className="text-cyan-400/90 text-xs font-semibold tracking-[0.2em] uppercase mb-3">Help</p>
          <h1 className="text-4xl sm:text-5xl font-black bg-gradient-to-r from-cyan-200 via-white to-violet-200 bg-clip-text text-transparent mb-4">
            OpenDesign Support
          </h1>
          <p className="text-lg text-slate-300">
            Need help with OpenDesign? We&apos;re here for you.
          </p>
        </header>

        {/* Contact */}
        <section className="rounded-2xl border border-cyan-500/35 bg-slate-900/70 backdrop-blur-md p-8 mb-10 shadow-xl shadow-cyan-950/50">
          <div className="flex items-center gap-3 mb-4">
            <Mail className="w-8 h-8 text-cyan-400" />
            <h2 className="text-2xl font-bold text-white">Contact</h2>
          </div>
          <p className="text-slate-300 mb-2">
            <span className="text-slate-400">Email: </span>
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-cyan-300 hover:text-cyan-200 font-semibold underline">
              {CONTACT_EMAIL}
            </a>
          </p>
          <p className="text-slate-500 text-sm">We usually respond within 2–3 business days.</p>
        </section>

        {/* Before you write */}
        <section className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-slate-900/80 to-indigo-950/60 p-8 mb-10">
          <div className="flex items-center gap-3 mb-5">
            <ListChecks className="w-7 h-7 text-violet-300" />
            <h2 className="text-xl font-bold text-white">Before You Write</h2>
          </div>
          <p className="text-slate-400 text-sm mb-4">Please include:</p>
          <ul className="space-y-3 text-slate-300">
            <li className="flex gap-2">
              <span className="text-cyan-400 font-bold shrink-0">•</span>
              Device model (e.g. iPhone 15 Pro, iPad Pro)
            </li>
            <li className="flex gap-2">
              <span className="text-cyan-400 font-bold shrink-0">•</span>
              iOS version
            </li>
            <li className="flex gap-2">
              <span className="text-cyan-400 font-bold shrink-0">•</span>
              OpenDesign version
            </li>
            <li className="flex gap-2">
              <span className="text-cyan-400 font-bold shrink-0">•</span>
              What you were trying to do
            </li>
            <li className="flex gap-2">
              <span className="text-cyan-400 font-bold shrink-0">•</span>
              Screenshots or screen recordings if possible
            </li>
          </ul>
        </section>

        {/* FAQ */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <HelpCircle className="w-8 h-8 text-violet-400" />
            <h2 className="text-2xl font-bold text-white">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((item, i) => {
              const open = openIdx === i;
              return (
                <div
                  key={item.q}
                  className="rounded-xl border border-slate-700/80 bg-slate-900/50 overflow-hidden transition-colors hover:border-cyan-500/30"
                >
                  <button
                    type="button"
                    onClick={() => setOpenIdx(open ? null : i)}
                    className="w-full flex items-center justify-between gap-4 text-left px-5 py-4 text-white font-semibold"
                  >
                    <span>{item.q}</span>
                    {open ? <ChevronUp className="w-5 h-5 text-cyan-400 shrink-0" /> : <ChevronDown className="w-5 h-5 text-slate-500 shrink-0" />}
                  </button>
                  {open && <div className="px-5 pb-5 pt-0 text-slate-300 text-sm leading-relaxed border-t border-slate-800/80">{item.a}</div>}
                </div>
              );
            })}
          </div>
        </section>

        {/* Privacy & Terms */}
        <section className="rounded-2xl border border-cyan-500/25 bg-slate-900/60 p-8 mb-12">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-7 h-7 text-cyan-400" />
            <h2 className="text-xl font-bold text-white">Privacy and Terms</h2>
          </div>

          <p className="text-slate-500 text-xs uppercase tracking-wide mb-3">Drop Dollar hub</p>
          <div className="flex flex-wrap gap-4 mb-8">
            <Link
              href="/opendesign/privacy-policy"
              className="inline-flex items-center gap-2 text-cyan-300 hover:text-cyan-100 font-semibold underline-offset-4 hover:underline"
            >
              <Shield className="w-4 h-4" />
              Privacy Policy
            </Link>
            <Link
              href="/opendesign/terms-of-service"
              className="inline-flex items-center gap-2 text-violet-300 hover:text-violet-100 font-semibold underline-offset-4 hover:underline"
            >
              <FileText className="w-4 h-4" />
              Terms of Service
            </Link>
          </div>

          <p className="text-slate-500 text-xs uppercase tracking-wide mb-3">Public links (share & App Store metadata)</p>
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-x-8 gap-y-3 text-sm">
            <a
              href={OPEN_DESIGN_HUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-white inline-flex items-center gap-1"
            >
              {OPEN_DESIGN_HUB_URL.replace(/^https:\/\//, '')}
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href={OPEN_DESIGN_PRIVACY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-cyan-300 inline-flex items-center gap-1"
            >
              Privacy (full URL)
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href={OPEN_DESIGN_TERMS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-violet-300 inline-flex items-center gap-1"
            >
              Terms (full URL)
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </section>

        <div className="text-center space-y-4">
          <Link
            href="/opendesign"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-bold bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white transition-all shadow-lg"
          >
            ← Back to OpenDesign
          </Link>
          <div>
            <Link href="/" className="text-slate-500 hover:text-slate-300 text-sm">
              Drop Dollar home
            </Link>
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-slate-800 bg-slate-950 py-8 px-4 text-center text-slate-500 text-sm">
        OpenDesign • © {new Date().getFullYear()} Ryan Joshua Fermoselle
      </footer>
    </div>
  );
}
