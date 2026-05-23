'use client';

import React from 'react';
import Link from 'next/link';
import CleanNavigation from '@/components/navigation/CleanNavigation';
import { Box, Layers, Cpu, Printer, Shield, ExternalLink, FileText } from 'lucide-react';

export default function OpenDesignPage() {
  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 relative overflow-x-hidden">
      {/* Perspective grid backdrop */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.35]"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% -10%, rgba(34,211,238,0.22), transparent 55%),
            radial-gradient(ellipse 60% 40% at 100% 50%, rgba(139,92,246,0.15), transparent 50%),
            linear-gradient(180deg, #070b14 0%, #0c1224 45%, #0a0f1a 100%)
          `,
        }}
      />
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.2]"
        style={{
          perspective: '800px',
          backgroundImage: `
            linear-gradient(rgba(34,211,238,0.12) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34,211,238,0.12) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
          transform: 'rotateX(56deg)',
          transformOrigin: 'center 40%',
          maskImage: 'linear-gradient(180deg, black 30%, transparent 85%)',
        }}
      />

      <CleanNavigation variant="gradient" currentPage="/opendesign" />

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20">
        {/* Hero */}
        <section className="text-center mb-20 lg:mb-28">
          <div className="flex justify-center mb-10 perspective-[1000px]">
            <div
              className="relative w-44 h-44 sm:w-52 sm:h-52 flex items-center justify-center"
              style={{
                transform: 'rotateX(12deg) rotateY(-18deg)',
                transformStyle: 'preserve-3d',
              }}
            >
              {/* Wireframe cube illusion */}
              <div
                className="absolute inset-2 border-2 border-cyan-400/70 rounded-xl"
                style={{ transform: 'translateZ(24px)', boxShadow: '0 0 30px rgba(34,211,238,0.35)' }}
              />
              <div
                className="absolute inset-2 border border-violet-400/40 rounded-xl"
                style={{ transform: 'translateZ(-20px) scale(1.06)' }}
              />
              <div className="absolute inset-4 border border-cyan-300/50 rounded-lg rotate-45" />
              <span className="relative z-10 text-7xl sm:text-8xl font-black bg-gradient-to-br from-cyan-300 via-white to-violet-300 bg-clip-text text-transparent select-none">
                3D
              </span>
            </div>
          </div>

          <p className="text-cyan-400/90 text-sm font-semibold tracking-[0.25em] uppercase mb-4">
            Model · Scan · Ship
          </p>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black mb-6 leading-tight">
            <span className="bg-gradient-to-r from-cyan-300 via-white to-violet-300 bg-clip-text text-transparent">
              OpenDesign
            </span>
          </h1>
          <p className="text-xl sm:text-2xl text-slate-300 max-w-3xl mx-auto mb-4 font-medium">
            A spatial creative studio on iPhone &amp; iPad — meshes, LiDAR, exports, and real-world tools without leaving your device.
          </p>
          <p className="text-slate-400 max-w-2xl mx-auto mb-12">
            Sculpt ideas in 3D, capture rooms and objects, wire circuits, animate avatars, and send work to printers or live streams — with a local-first posture that respects your files.
          </p>

          <div className="flex flex-col sm:flex-row flex-wrap gap-4 justify-center items-center">
            <a
              href="https://opendesign.app"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-10 py-4 rounded-xl font-bold text-slate-900 bg-gradient-to-r from-cyan-400 to-cyan-500 hover:from-cyan-300 hover:to-cyan-400 transition-all shadow-[0_0_40px_rgba(34,211,238,0.35)] hover:shadow-[0_0_52px_rgba(34,211,238,0.5)] hover:scale-[1.03]"
            >
              Visit opendesign.app
              <ExternalLink className="w-5 h-5" />
            </a>
            <Link
              href="/opendesign/privacy-policy"
              className="inline-flex items-center gap-2 px-10 py-4 rounded-xl font-semibold border-2 border-cyan-500/50 text-cyan-200 hover:bg-cyan-500/10 hover:border-cyan-400 transition-all"
            >
              <Shield className="w-5 h-5" />
              Privacy Policy
            </Link>
            <Link
              href="/opendesign/terms-of-service"
              className="inline-flex items-center gap-2 px-10 py-4 rounded-xl font-semibold border-2 border-violet-500/50 text-violet-200 hover:bg-violet-500/10 hover:border-violet-400 transition-all"
            >
              <FileText className="w-5 h-5" />
              Terms of Service
            </Link>
          </div>
        </section>

        {/* Feature pillars — faux-isometric cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-24 perspective-[1200px]">
          {[
            {
              icon: Box,
              title: 'Meshes & solids',
              body: 'Build and refine 3D models, sketches, floor plans, and game-ready assets with a viewport-first mindset.',
              accent: 'from-cyan-500/20 to-transparent',
              tilt: '-6deg',
            },
            {
              icon: Cpu,
              title: 'Sense & capture',
              body: 'LiDAR, photogrammetry, AR, and screen workflows when you grant camera or world-sensing permissions.',
              accent: 'from-violet-500/20 to-transparent',
              tilt: '4deg',
            },
            {
              icon: Printer,
              title: 'Fabricate & broadcast',
              body: 'Find printers on your network, push to OctoPrint-style hosts, or stream avatars toward OBS — all optional, all yours to toggle.',
              accent: 'from-fuchsia-500/15 to-transparent',
              tilt: '-3deg',
            },
            {
              icon: Layers,
              title: 'Stacks of creativity',
              body: 'Audio studios, timelines, circuits, chemistry data, avatars — one canvas for experimentation.',
              accent: 'from-emerald-500/15 to-transparent',
              tilt: '5deg',
            },
          ].map((item) => (
            <div
              key={item.title}
              className="relative p-8 rounded-2xl border border-cyan-500/20 bg-slate-900/60 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_20px_50px_rgba(0,0,0,0.45)] transition-transform duration-300 hover:border-cyan-400/45 hover:-translate-y-1"
              style={{
                transform: `perspective(900px) rotateX(4deg) rotateY(${item.tilt})`,
                transformStyle: 'preserve-3d',
              }}
            >
              <div className={`absolute top-0 right-0 w-32 h-32 rounded-bl-full opacity-70 bg-gradient-to-bl ${item.accent}`} />
              <item.icon className="w-10 h-10 text-cyan-400 mb-4 relative z-10" strokeWidth={1.5} />
              <h2 className="text-xl font-bold text-white mb-2 relative z-10">{item.title}</h2>
              <p className="text-slate-400 leading-relaxed relative z-10">{item.body}</p>
            </div>
          ))}
        </section>

        {/* Local-first callout */}
        <section className="rounded-3xl border border-violet-500/30 bg-gradient-to-br from-slate-900/90 to-indigo-950/80 p-10 sm:p-14 mb-20 text-center sm:text-left">
          <div className="flex flex-col lg:flex-row gap-10 items-center">
            <div className="flex-1 space-y-4">
              <h2 className="text-3xl sm:text-4xl font-bold text-white">
                Built for studios in your pocket
              </h2>
              <p className="text-slate-300 text-lg leading-relaxed">
                Project files stay on-device unless <em>you</em> sync, share, or stream. OpenDesign Pro subscriptions are handled by Apple; we skip third-party ads and analytics trackers in the app.
              </p>
              <p className="text-slate-500 text-sm">
                Read the full details in our policy — permissions, printers, OAuth to YouTube, and how support email is retained.
              </p>
              <Link
                href="/opendesign/privacy-policy"
                className="inline-flex items-center gap-2 mt-4 text-violet-300 hover:text-white font-semibold underline-offset-4 hover:underline"
              >
                Open the Privacy Policy
                <ExternalLink className="w-4 h-4" />
              </Link>
            </div>
            <div
              className="w-full max-w-xs aspect-square rounded-2xl border-2 border-dashed border-cyan-400/40 flex items-center justify-center bg-slate-950/80"
              style={{
                transform: 'perspective(600px) rotateY(-22deg)',
                boxShadow: '20px 20px 0 rgba(34,211,238,0.08), -12px -12px 0 rgba(139,92,246,0.06)',
              }}
            >
              <span className="text-slate-500 text-sm tracking-widest uppercase text-center px-4">
                Your mesh lives here — on your device
              </span>
            </div>
          </div>
        </section>

        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-bold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white transition-all shadow-lg"
          >
            ← Back to Drop Dollar
          </Link>
        </div>
      </main>

      <footer className="relative z-10 border-t border-cyan-500/20 bg-slate-950/90 py-10 px-4">
        <div className="max-w-6xl mx-auto text-center space-y-4">
          <p className="text-slate-500 text-sm">OpenDesign is part of the Drop Dollar family of applications</p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link href="/opendesign/privacy-policy" className="text-cyan-400 hover:text-cyan-300 font-semibold">
              Privacy Policy
            </Link>
            <span className="text-slate-600">•</span>
            <Link href="/opendesign/terms-of-service" className="text-violet-400 hover:text-violet-300 font-semibold">
              Terms of Service
            </Link>
            <span className="text-slate-600">•</span>
            <a
              href="https://opendesign.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-400 hover:text-violet-300 font-semibold inline-flex items-center gap-1"
            >
              opendesign.app
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
