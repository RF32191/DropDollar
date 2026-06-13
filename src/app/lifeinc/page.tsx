'use client';

import React from 'react';
import Link from 'next/link';
import CleanNavigation from '@/components/navigation/CleanNavigation';
import { LIFE_INC_HUB_URL } from '@/lib/lifeinc-public-urls';
import { Dna, Globe2, Sparkles, Shield, ExternalLink, FileText, Leaf, HelpCircle } from 'lucide-react';

export default function LifeIncPage() {
  return (
    <div className="min-h-screen bg-[#030806] text-slate-100 relative overflow-x-hidden">
      {/* Nebula + organic glow backdrop */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 70% 55% at 20% 10%, rgba(16,185,129,0.18), transparent 55%),
            radial-gradient(ellipse 55% 45% at 85% 30%, rgba(45,212,191,0.12), transparent 50%),
            radial-gradient(ellipse 40% 35% at 50% 90%, rgba(132,204,22,0.08), transparent 45%),
            linear-gradient(180deg, #030806 0%, #061510 40%, #040a08 100%)
          `,
        }}
      />
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.15]"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 30%, rgba(52,211,153,0.4) 1px, transparent 1px),
            radial-gradient(circle at 70% 60%, rgba(74,222,128,0.25) 1px, transparent 1px),
            radial-gradient(circle at 45% 80%, rgba(45,212,191,0.3) 1px, transparent 1px)
          `,
          backgroundSize: '120px 120px, 180px 180px, 240px 240px',
        }}
      />

      <CleanNavigation variant="gradient" currentPage="/lifeinc" />

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20">
        {/* Hero */}
        <section className="text-center mb-20 lg:mb-28">
          <div className="flex justify-center mb-10">
            <div className="relative w-44 h-44 sm:w-52 sm:h-52 flex items-center justify-center">
              <div
                className="absolute inset-0 rounded-full border-2 border-emerald-400/40 animate-pulse"
                style={{ boxShadow: '0 0 60px rgba(52,211,153,0.25), inset 0 0 40px rgba(16,185,129,0.08)' }}
              />
              <div className="absolute inset-4 rounded-full border border-teal-400/30 bg-emerald-950/40 backdrop-blur-sm" />
              <div className="absolute inset-8 rounded-full bg-gradient-to-br from-emerald-500/30 via-teal-600/20 to-lime-500/10 flex items-center justify-center">
                <Globe2 className="w-16 h-16 sm:w-20 sm:h-20 text-emerald-300" strokeWidth={1.25} />
              </div>
              <Leaf className="absolute -top-2 -right-2 w-8 h-8 text-lime-400 rotate-12 opacity-80" />
              <Dna className="absolute -bottom-1 -left-3 w-9 h-9 text-teal-400 -rotate-12 opacity-70" />
            </div>
          </div>

          <p className="text-emerald-400/90 text-sm font-semibold tracking-[0.25em] uppercase mb-4">
            Evolve · Spread · Terraform
          </p>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black mb-6 leading-tight">
            <span className="bg-gradient-to-r from-emerald-300 via-lime-200 to-teal-300 bg-clip-text text-transparent">
              Life Inc.
            </span>
          </h1>
          <p className="text-xl sm:text-2xl text-slate-300 max-w-3xl mx-auto mb-4 font-medium">
            The opposite of extinction — engineer species, survive harsh worlds, and green the galaxy one planet at a time.
          </p>
          <p className="text-slate-400 max-w-2xl mx-auto mb-12">
            A plague-style strategy game flipped on its head: nurture evolution, adapt to alien biomes, and terraform dead worlds
            into thriving ecosystems. Most progress stays on your device — no ads, no data brokers.
          </p>

          <div className="flex flex-col sm:flex-row flex-wrap gap-4 justify-center items-center">
            <a
              href={LIFE_INC_HUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-10 py-4 rounded-xl font-bold text-slate-900 bg-gradient-to-r from-emerald-400 to-lime-400 hover:from-emerald-300 hover:to-lime-300 transition-all shadow-[0_0_40px_rgba(52,211,153,0.35)] hover:shadow-[0_0_52px_rgba(52,211,153,0.5)] hover:scale-[1.03]"
            >
              Life Inc. on Drop Dollar
              <ExternalLink className="w-5 h-5" />
            </a>
            <Link
              href="/lifeinc/privacy-policy"
              className="inline-flex items-center gap-2 px-10 py-4 rounded-xl font-semibold border-2 border-emerald-500/50 text-emerald-200 hover:bg-emerald-500/10 hover:border-emerald-400 transition-all"
            >
              <Shield className="w-5 h-5" />
              Privacy Policy
            </Link>
            <Link
              href="/lifeinc/terms-and-conditions"
              className="inline-flex items-center gap-2 px-10 py-4 rounded-xl font-semibold border-2 border-teal-500/50 text-teal-200 hover:bg-teal-500/10 hover:border-teal-400 transition-all"
            >
              <FileText className="w-5 h-5" />
              Terms &amp; Conditions
            </Link>
            <Link
              href="/lifeinc/support"
              className="inline-flex items-center gap-2 px-10 py-4 rounded-xl font-semibold border-2 border-slate-500/50 text-slate-200 hover:bg-slate-500/15 hover:border-slate-400 transition-all"
            >
              <HelpCircle className="w-5 h-5" />
              Support
            </Link>
          </div>
        </section>

        {/* Feature pillars */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-24">
          {[
            {
              icon: Dna,
              title: 'Evolve your species',
              body: 'Mutate traits, unlock adaptations, and outlast hostile atmospheres — survival through science, not destruction.',
              accent: 'from-emerald-500/20 to-transparent',
            },
            {
              icon: Globe2,
              title: 'Terraform worlds',
              body: 'Transform barren planets into habitable biomes. Spread life where none existed and watch ecosystems bloom.',
              accent: 'from-teal-500/20 to-transparent',
            },
            {
              icon: Sparkles,
              title: 'Premium worlds & modes',
              body: 'Optional subscriptions unlock extra worlds, modes, and content — billed through Apple or Google, on your terms.',
              accent: 'from-lime-500/15 to-transparent',
            },
            {
              icon: Leaf,
              title: 'Privacy-friendly by design',
              body: 'Game progress and settings live on your device. We do not sell personal information or run cross-app ad tracking.',
              accent: 'from-cyan-500/12 to-transparent',
            },
          ].map((item) => (
            <div
              key={item.title}
              className="relative p-8 rounded-2xl border border-emerald-500/20 bg-slate-900/50 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_20px_50px_rgba(0,0,0,0.4)] transition-transform duration-300 hover:border-emerald-400/40 hover:-translate-y-1"
            >
              <div className={`absolute top-0 right-0 w-32 h-32 rounded-bl-full opacity-70 bg-gradient-to-bl ${item.accent}`} />
              <item.icon className="w-10 h-10 text-emerald-400 mb-4 relative z-10" strokeWidth={1.5} />
              <h2 className="text-xl font-bold text-white mb-2 relative z-10">{item.title}</h2>
              <p className="text-slate-400 leading-relaxed relative z-10">{item.body}</p>
            </div>
          ))}
        </section>

        {/* Local-first callout */}
        <section className="rounded-3xl border border-teal-500/25 bg-gradient-to-br from-slate-900/90 to-emerald-950/70 p-10 sm:p-14 mb-20 text-center sm:text-left">
          <div className="flex flex-col lg:flex-row gap-10 items-center">
            <div className="flex-1 space-y-4">
              <h2 className="text-3xl sm:text-4xl font-bold text-white">Life finds a way — on your device</h2>
              <p className="text-slate-300 text-lg leading-relaxed">
                Runs, unlocks, and settings are stored locally unless you choose to sign in. Subscriptions are validated through
                your app marketplace — we never see your full payment card.
              </p>
              <Link
                href="/lifeinc/privacy-policy"
                className="inline-flex items-center gap-2 mt-4 text-emerald-300 hover:text-white font-semibold underline-offset-4 hover:underline"
              >
                Read the Privacy Policy
                <ExternalLink className="w-4 h-4" />
              </Link>
            </div>
            <div
              className="w-full max-w-xs aspect-square rounded-full border-2 border-dashed border-emerald-400/35 flex items-center justify-center bg-slate-950/70"
              style={{ boxShadow: '0 0 80px rgba(52,211,153,0.12), inset 0 0 40px rgba(16,185,129,0.06)' }}
            >
              <span className="text-slate-500 text-sm tracking-widest uppercase text-center px-6">
                Your evolution story stays here
              </span>
            </div>
          </div>
        </section>

        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-bold bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-600 hover:to-teal-600 text-white transition-all shadow-lg"
          >
            ← Back to Drop Dollar
          </Link>
        </div>
      </main>

      <footer className="relative z-10 border-t border-emerald-500/20 bg-slate-950/90 py-10 px-4">
        <div className="max-w-6xl mx-auto text-center space-y-4">
          <p className="text-slate-500 text-sm">Life Inc. is part of the Drop Dollar family of applications</p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link href="/lifeinc/privacy-policy" className="text-emerald-400 hover:text-emerald-300 font-semibold">
              Privacy Policy
            </Link>
            <span className="text-slate-600">•</span>
            <Link href="/lifeinc/terms-and-conditions" className="text-teal-400 hover:text-teal-300 font-semibold">
              Terms &amp; Conditions
            </Link>
            <span className="text-slate-600">•</span>
            <Link href="/lifeinc/support" className="text-slate-300 hover:text-white font-semibold">
              Support
            </Link>
            <span className="text-slate-600">•</span>
            <a
              href={LIFE_INC_HUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-lime-400 hover:text-lime-300 font-semibold inline-flex items-center gap-1"
            >
              drop-dollar.com/lifeinc
              <ExternalLink className="w-3 h-3" />
            </a>
            <span className="text-slate-600">•</span>
            <a
              href="https://www.drop-dollar.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-white font-semibold"
            >
              Drop Dollar
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
