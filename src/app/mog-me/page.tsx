'use client';

import React from 'react';
import Link from 'next/link';
import CleanNavigation from '@/components/navigation/CleanNavigation';
import { Mail, Sparkles, TrendingUp, Users, Star } from 'lucide-react';

export default function MogMePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-yellow-900">
      <CleanNavigation variant="gradient" currentPage="/mog-me" />
      
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Logo/Icon Section */}
          <div className="flex justify-center mb-12">
            <div className="relative">
              {/* Green rounded square background */}
              <div className="w-48 h-48 sm:w-64 sm:h-64 bg-gradient-to-br from-green-700 to-green-800 rounded-3xl shadow-2xl flex items-center justify-center border-4 border-green-600/50 relative overflow-hidden">
                {/* Subtle vignette effect */}
                <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-green-900/50"></div>
                
                {/* Golden M Letter */}
                <div className="relative z-10">
                  <span className="text-8xl sm:text-9xl font-serif text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.8)]" style={{
                    textShadow: '0 0 30px rgba(250, 204, 21, 0.9), 0 0 60px rgba(250, 204, 21, 0.6)',
                    filter: 'drop-shadow(0 0 10px rgba(250, 204, 21, 0.8))'
                  }}>
                    M
                  </span>
                </div>
                
                {/* Glowing effect around M */}
                <div className="absolute inset-0 bg-yellow-400/20 blur-3xl animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-5xl sm:text-7xl font-black text-center mb-6">
            <span className="bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500 bg-clip-text text-transparent">
              Mog Me
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-2xl sm:text-3xl text-green-100 text-center mb-4 font-semibold">
            Your Ultimate Look Improvement & Lifestyle App
          </p>
          
          <p className="text-lg sm:text-xl text-green-200 text-center mb-16 max-w-3xl mx-auto">
            Transform your appearance and enhance your lifestyle with cutting-edge tools, 
            expert guidance, and a community dedicated to self-improvement and personal growth.
          </p>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <div className="bg-green-800/50 backdrop-blur-xl p-8 rounded-2xl border-2 border-yellow-400/30 hover:border-yellow-400 transition-all duration-300 transform hover:-translate-y-2">
              <div className="text-5xl mb-4 text-center">✨</div>
              <h3 className="text-2xl font-bold text-yellow-300 mb-3 text-center">Look Improvement</h3>
              <p className="text-green-100 text-center">
                Advanced tools and techniques to enhance your physical appearance, boost confidence, and improve your overall lifestyle.
              </p>
            </div>

            <div className="bg-green-800/50 backdrop-blur-xl p-8 rounded-2xl border-2 border-yellow-400/30 hover:border-yellow-400 transition-all duration-300 transform hover:-translate-y-2">
              <div className="text-5xl mb-4 text-center">📈</div>
              <h3 className="text-2xl font-bold text-yellow-300 mb-3 text-center">Progress Tracking</h3>
              <p className="text-green-100 text-center">
                Monitor your transformation journey with detailed analytics and milestone achievements.
              </p>
            </div>

            <div className="bg-green-800/50 backdrop-blur-xl p-8 rounded-2xl border-2 border-yellow-400/30 hover:border-yellow-400 transition-all duration-300 transform hover:-translate-y-2">
              <div className="text-5xl mb-4 text-center">👥</div>
              <h3 className="text-2xl font-bold text-yellow-300 mb-3 text-center">Community</h3>
              <p className="text-green-100 text-center">
                Connect with like-minded individuals on the same journey of self-improvement.
              </p>
            </div>
          </div>

          {/* Description Section */}
          <div className="bg-green-800/40 backdrop-blur-xl p-10 rounded-3xl border-2 border-yellow-400/40 mb-16">
            <h2 className="text-4xl font-bold text-yellow-300 mb-6 text-center">About Mog Me</h2>
            <div className="space-y-6 text-green-100 text-lg leading-relaxed">
              <p>
                <strong className="text-yellow-300">Mog Me</strong> is a revolutionary look improvement and lifestyle application designed 
                to help you unlock your full potential. Whether you're looking to improve your physical appearance, 
                enhance your style, boost your confidence, or make positive lifestyle changes, Mog Me provides the tools 
                and community support you need.
              </p>
              
              <div className="bg-green-900/40 p-6 rounded-2xl border border-yellow-400/20">
                <h3 className="text-2xl font-bold text-yellow-300 mb-4">What is Look Improvement?</h3>
                <p>
                  Look improvement is the practice of enhancing your physical appearance and lifestyle through various techniques, 
                  strategies, and positive changes. It encompasses everything from skincare routines and fitness 
                  programs to style optimization, confidence building, and overall wellness. Mog Me provides a comprehensive platform 
                  to guide you through every aspect of your personal growth and transformation journey.
                </p>
              </div>
              
              <p>
                Our platform combines cutting-edge technology with proven strategies from experts in the field. 
                Track your progress, set goals, and celebrate milestones as you transform into the best version of yourself 
                and build a healthier, more confident lifestyle.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="bg-green-900/30 p-5 rounded-xl border border-yellow-400/20">
                  <h4 className="text-xl font-bold text-yellow-300 mb-2">📱 App Features</h4>
                  <ul className="space-y-2 text-green-100">
                    <li>• Personalized transformation plans</li>
                    <li>• Progress photo tracking</li>
                    <li>• Expert tips and tutorials</li>
                    <li>• Community support and motivation</li>
                    <li>• Goal setting and achievement tracking</li>
                  </ul>
                </div>
                
                <div className="bg-green-900/30 p-5 rounded-xl border border-yellow-400/20">
                  <h4 className="text-xl font-bold text-yellow-300 mb-2">🎯 Key Benefits</h4>
                  <ul className="space-y-2 text-green-100">
                    <li>• Boost confidence and self-esteem</li>
                    <li>• Improve physical appearance</li>
                    <li>• Connect with a supportive community</li>
                    <li>• Track measurable progress</li>
                    <li>• Access expert guidance</li>
                  </ul>
                </div>
              </div>
              
              <p className="mt-6">
                Join thousands of users who are already on their journey to becoming their most confident selves. 
                With Mog Me, the transformation starts today. Download the app and begin your look improvement and lifestyle 
                journey with tools designed to help you achieve your goals.
              </p>
            </div>
          </div>

          {/* App Details Section */}
          <div className="bg-yellow-400/10 backdrop-blur-xl p-10 rounded-3xl border-2 border-yellow-400/30 mb-16">
            <h2 className="text-4xl font-bold text-yellow-300 mb-8 text-center">App Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-2xl font-bold text-yellow-300 mb-4">Platform Availability</h3>
                <div className="space-y-3 text-green-100">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📱</span>
                    <span>iOS App Store (Coming Soon)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🤖</span>
                    <span>Google Play Store (Coming Soon)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🌐</span>
                    <span>Web Application (Available Now)</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-2xl font-bold text-yellow-300 mb-4">What You'll Get</h3>
                <div className="space-y-3 text-green-100">
                  <div className="flex items-start gap-3">
                    <span className="text-xl">✓</span>
                    <span>Comprehensive look improvement and lifestyle guides and tutorials</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-xl">✓</span>
                    <span>Personalized transformation roadmap</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-xl">✓</span>
                    <span>Progress tracking with before/after photos</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-xl">✓</span>
                    <span>Community forum for support and motivation</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-xl">✓</span>
                    <span>Expert tips from look improvement and lifestyle professionals</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Section */}
          <div className="bg-yellow-400/20 backdrop-blur-xl p-10 rounded-3xl border-2 border-yellow-400/50">
            <h2 className="text-4xl font-bold text-yellow-300 mb-8 text-center flex items-center justify-center gap-3">
              <Mail className="w-10 h-10" />
              Get In Touch
            </h2>
            <p className="text-green-100 text-center mb-8 text-lg">
              Have questions? Want to learn more? Reach out to us!
            </p>
            
            <div className="space-y-4 max-w-2xl mx-auto">
              <a 
                href="mailto:info@mogme.app" 
                className="block bg-green-800/60 hover:bg-green-700/60 p-6 rounded-xl border-2 border-yellow-400/30 hover:border-yellow-400 transition-all duration-300 transform hover:scale-105"
              >
                <div className="flex items-center gap-4">
                  <Mail className="w-8 h-8 text-yellow-400" />
                  <div>
                    <div className="text-yellow-300 font-bold text-lg">General Inquiries</div>
                    <div className="text-green-100">info@mogme.app</div>
                  </div>
                </div>
              </a>

              <a 
                href="mailto:support@mogme.app" 
                className="block bg-green-800/60 hover:bg-green-700/60 p-6 rounded-xl border-2 border-yellow-400/30 hover:border-yellow-400 transition-all duration-300 transform hover:scale-105"
              >
                <div className="flex items-center gap-4">
                  <Mail className="w-8 h-8 text-yellow-400" />
                  <div>
                    <div className="text-yellow-300 font-bold text-lg">Support</div>
                    <div className="text-green-100">support@mogme.app</div>
                  </div>
                </div>
              </a>

              <a 
                href="mailto:partnerships@mogme.app" 
                className="block bg-green-800/60 hover:bg-green-700/60 p-6 rounded-xl border-2 border-yellow-400/30 hover:border-yellow-400 transition-all duration-300 transform hover:scale-105"
              >
                <div className="flex items-center gap-4">
                  <Mail className="w-8 h-8 text-yellow-400" />
                  <div>
                    <div className="text-yellow-300 font-bold text-lg">Partnerships</div>
                    <div className="text-green-100">partnerships@mogme.app</div>
                  </div>
                </div>
              </a>
            </div>
          </div>

          {/* Back to Drop Dollar */}
          <div className="text-center mt-12">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-green-600 to-yellow-500 text-white font-bold rounded-full hover:from-green-500 hover:to-yellow-400 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              ← Back to Drop Dollar
            </Link>
          </div>
        </div>
      </section>

      {/* Footer Section */}
      <footer className="relative py-12 px-4 sm:px-6 lg:px-8 border-t-2 border-yellow-400/30 bg-green-900/50">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-green-200 mb-4">
            Mog Me is part of the Drop Dollar family of applications
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
            <Link
              href="/mog-me/privacy-policy"
              className="text-yellow-400 hover:text-yellow-300 font-semibold text-lg transition-colors duration-300 hover:underline"
            >
              Privacy Policy
            </Link>
            <span className="hidden sm:inline text-green-300">•</span>
            <a
              href="https://www.drop-dollar.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-yellow-400 hover:text-yellow-300 font-semibold text-lg transition-colors duration-300 hover:underline"
            >
              Visit Drop Dollar
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
          <p className="text-green-300 text-sm mt-2">
            <a href="https://www.drop-dollar.com" target="_blank" rel="noopener noreferrer" className="hover:text-yellow-400 transition-colors">
              https://www.drop-dollar.com
            </a>
          </p>
        </div>
      </footer>

      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-yellow-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 right-1/4 w-80 h-80 bg-green-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-1/4 left-1/2 w-72 h-72 bg-yellow-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>
    </div>
  );
}

