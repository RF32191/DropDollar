'use client';

import React from 'react';
import Link from 'next/link';
import CleanNavigation from '@/components/navigation/CleanNavigation';
import { Mail, Beaker, FlaskConical, Calculator, Camera, Award, ClipboardCheck, HelpCircle } from 'lucide-react';

export default function PurionPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-blue-50">
      <CleanNavigation variant="gradient" currentPage="/purion" />
      
      {/* Hero Section - Clean Medical Blue */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Logo/Icon Section */}
          <div className="flex justify-center mb-12">
            <div className="relative">
              <div className="w-48 h-48 sm:w-64 sm:h-64 bg-white rounded-3xl shadow-xl flex items-center justify-center border-2 border-blue-200 ring-4 ring-blue-100 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-sky-50 opacity-80"></div>
                <div className="relative z-10">
                  <FlaskConical className="w-24 h-24 sm:w-32 sm:h-32 text-blue-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-5xl sm:text-7xl font-black text-center mb-6 text-blue-900">
            Purion
          </h1>

          {/* Subtitle */}
          <p className="text-2xl sm:text-3xl text-blue-700 text-center mb-4 font-semibold">
            Bioprocess Training & Execution Companion
          </p>
          
          <p className="text-lg sm:text-xl text-slate-600 text-center mb-16 max-w-3xl mx-auto leading-relaxed">
            Purion is a modern bioprocess training and execution companion built for upstream, downstream, MSAT, and analytical teams. 
            It turns complex workflows into interactive learning with simulations, setup games, and virtual labs—so users can practice confidently before they run real processes.
          </p>

          {/* Features Grid - Medical Card Style */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-blue-100 hover:border-blue-300 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex justify-center mb-4">
                <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Beaker className="w-7 h-7 text-blue-600" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-blue-900 mb-3 text-center">Realistic Simulations</h3>
              <p className="text-slate-600 text-center text-sm leading-relaxed">
                Run bioreactor, chromatography, and UF/DF simulations in a safe, virtual environment.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg border border-blue-100 hover:border-blue-300 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex justify-center mb-4">
                <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Calculator className="w-7 h-7 text-blue-600" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-blue-900 mb-3 text-center">Setup Games</h3>
              <p className="text-slate-600 text-center text-sm leading-relaxed">
                Practice equipment setup with guided, scored games that build muscle memory.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg border border-blue-100 hover:border-blue-300 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex justify-center mb-4">
                <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Camera className="w-7 h-7 text-blue-600" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-blue-900 mb-3 text-center">Smart OCR</h3>
              <p className="text-slate-600 text-center text-sm leading-relaxed">
                Capture photos and auto-fill key BDR fields with intelligent OCR technology.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg border border-blue-100 hover:border-blue-300 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex justify-center mb-4">
                <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Award className="w-7 h-7 text-blue-600" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-blue-900 mb-3 text-center">Learning Paths</h3>
              <p className="text-slate-600 text-center text-sm leading-relaxed">
                Track readiness with learning paths, badges, and KPI dashboards.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg border border-blue-100 hover:border-blue-300 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex justify-center mb-4">
                <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center">
                  <ClipboardCheck className="w-7 h-7 text-blue-600" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-blue-900 mb-3 text-center">Compliance</h3>
              <p className="text-slate-600 text-center text-sm leading-relaxed">
                Support compliance with checklists, audit trails, and review flows.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg border border-blue-100 hover:border-blue-300 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex justify-center mb-4">
                <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center">
                  <FlaskConical className="w-7 h-7 text-blue-600" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-blue-900 mb-3 text-center">Virtual Labs</h3>
              <p className="text-slate-600 text-center text-sm leading-relaxed">
                Practice in virtual labs before running real processes on the floor.
              </p>
            </div>
          </div>

          {/* Inside Purion Section */}
          <div className="bg-white p-10 rounded-3xl shadow-lg border border-blue-100 mb-16">
            <h2 className="text-3xl font-bold text-blue-900 mb-8 text-center">Inside Purion</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-slate-600">
              <ul className="space-y-3 text-lg">
                <li className="flex items-start gap-3">
                  <span className="text-blue-600 font-bold">•</span>
                  Run realistic bioreactor, chromatography, and UF/DF simulations
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-600 font-bold">•</span>
                  Practice equipment setup with guided, scored games
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-600 font-bold">•</span>
                  Use scale-up calculators, formula tabs, and troubleshooting guides
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-600 font-bold">•</span>
                  Capture photos and auto-fill key BDR fields with smart OCR
                </li>
              </ul>
              <ul className="space-y-3 text-lg">
                <li className="flex items-start gap-3">
                  <span className="text-blue-600 font-bold">•</span>
                  Track readiness with learning paths, badges, and KPI dashboards
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-600 font-bold">•</span>
                  Support compliance with checklists, audit trails, and review flows
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-600 font-bold">•</span>
                  Virtual labs for safe practice before real processes
                </li>
              </ul>
            </div>
            <p className="text-slate-600 text-center mt-8 text-lg leading-relaxed">
              Purion helps teams train faster, reduce errors, and standardize best practices across departments—whether you&apos;re onboarding new operators or improving ongoing process performance.
            </p>
          </div>

          {/* Contact Section */}
          <div className="bg-blue-50 p-10 rounded-3xl border-2 border-blue-200">
            <h2 className="text-3xl font-bold text-blue-900 mb-8 text-center flex items-center justify-center gap-3">
              <Mail className="w-10 h-10 text-blue-600" />
              Get In Touch
            </h2>
            <p className="text-slate-600 text-center mb-8 text-lg">
              Have questions? Want to learn more? Reach out to us!
            </p>
            
            <div className="space-y-4 max-w-2xl mx-auto">
              <a 
                href="mailto:ryanfermoselle@outlook.com" 
                className="block bg-white hover:bg-blue-50 p-6 rounded-xl border-2 border-blue-200 hover:border-blue-400 transition-all duration-300 shadow-md hover:shadow-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Mail className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-blue-900 font-bold text-lg">Support & Inquiries</div>
                    <div className="text-slate-600">ryanfermoselle@outlook.com</div>
                  </div>
                </div>
              </a>

              <div className="text-center mt-6">
                <Link
                  href="/purion/support"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-300 shadow-md hover:shadow-lg"
                >
                  <HelpCircle className="w-5 h-5" />
                  Visit Support Center
                </Link>
              </div>
            </div>
          </div>

          {/* Back to Drop Dollar */}
          <div className="text-center mt-12">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              ← Back to Drop Dollar
            </Link>
          </div>
        </div>
      </section>

      {/* Footer Section */}
      <footer className="relative py-12 px-4 sm:px-6 lg:px-8 border-t border-blue-200 bg-blue-50/50">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-slate-600 mb-4">
            Purion is part of the Drop Dollar family of applications
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
            <Link
              href="/purion/support"
              className="text-blue-600 hover:text-blue-800 font-semibold text-lg transition-colors duration-300 hover:underline"
            >
              Support
            </Link>
            <span className="hidden sm:inline text-slate-400">•</span>
            <Link
              href="/purion/privacy-policy"
              className="text-blue-600 hover:text-blue-800 font-semibold text-lg transition-colors duration-300 hover:underline"
            >
              Privacy Policy
            </Link>
            <span className="hidden sm:inline text-slate-400">•</span>
            <Link
              href="/purion/terms-of-service"
              className="text-blue-600 hover:text-blue-800 font-semibold text-lg transition-colors duration-300 hover:underline"
            >
              Terms of Service
            </Link>
            <span className="hidden sm:inline text-slate-400">•</span>
            <a
              href="https://www.drop-dollar.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-semibold text-lg transition-colors duration-300 hover:underline"
            >
              Visit Drop Dollar
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
          <p className="text-slate-500 text-sm mt-2">
            <a href="https://www.drop-dollar.com" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors">
              https://www.drop-dollar.com
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
