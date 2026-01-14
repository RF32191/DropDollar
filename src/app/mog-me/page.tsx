'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import CleanNavigation from '@/components/navigation/CleanNavigation';
import { Mail, Sparkles, TrendingUp, Users, Star, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  {
    question: "How does the facial and body analysis work?",
    answer: "Our advanced AI-powered analysis uses your uploaded photos to assess various aspects of your appearance, including facial symmetry, skin condition, body proportions, and overall aesthetics. The analysis is completely private and provides detailed insights to help you understand your current state and identify areas for improvement. We use state-of-the-art computer vision technology to provide accurate, objective assessments."
  },
  {
    question: "Is my photo data secure and private?",
    answer: "Absolutely. Your privacy is our top priority. All photos are encrypted and stored securely. We never share your images with third parties, and you have complete control over your data. You can delete your photos and analysis results at any time. Our facial and body analysis is processed locally when possible, and all data transmission uses industry-standard encryption protocols."
  },
  {
    question: "How accurate is the facial and body analysis?",
    answer: "Our analysis uses advanced AI algorithms trained on extensive datasets to provide highly accurate assessments. However, it's important to remember that beauty and appearance are subjective. Our analysis provides objective measurements and insights based on scientific principles, but personal confidence and self-expression are equally important. The analysis is designed to be a helpful tool, not a definitive judgment."
  },
  {
    question: "What kind of recommendations does the app provide?",
    answer: "Based on your analysis, Mog Me provides personalized recommendations across multiple areas: skincare routines tailored to your skin type and concerns, fitness and nutrition plans for body composition goals, style and grooming tips to enhance your features, lifestyle changes to improve overall appearance, and confidence-building exercises. All recommendations are customized to your specific analysis results and personal goals."
  },
  {
    question: "How often should I use the analysis features?",
    answer: "We recommend using the facial analysis monthly to track progress on skincare and grooming improvements. For body analysis, monthly assessments work well for tracking fitness and body composition changes. However, you can use the app as often as you'd like - daily for progress photos, weekly for check-ins, or whenever you want to reassess your goals. The app tracks your progress over time, so regular use helps you see your transformation journey."
  },
  {
    question: "Do I need to pay for the analysis features?",
    answer: "Mog Me offers both free and premium features. Basic analysis and progress tracking are available in the free version. Premium features include advanced AI analysis, detailed personalized recommendations, priority support, exclusive content from experts, and advanced progress tracking with detailed analytics. Check our app for current pricing and subscription options."
  },
  {
    question: "Can I use the app without uploading photos?",
    answer: "While facial and body analysis requires photos for the most accurate results, Mog Me offers many features you can use without photos: lifestyle guides and tutorials, community forums, goal setting and tracking, expert tips and articles, and progress journaling. However, uploading photos enables the most personalized and effective experience."
  },
  {
    question: "What makes Mog Me different from other lifestyle apps?",
    answer: "Mog Me combines cutting-edge AI analysis with comprehensive lifestyle improvement tools. Unlike apps that focus on just one aspect, we provide a holistic approach covering facial analysis, body assessment, style optimization, confidence building, and community support. Our platform is specifically designed for look improvement and lifestyle enhancement, with expert-backed strategies and a supportive community of users on similar journeys."
  },
  {
    question: "How do I get started with Mog Me?",
    answer: "Getting started is easy! Simply download the app (or use our web version), create your account, and complete your initial profile. You can start by uploading your first photos for analysis, exploring our guides and tutorials, setting your personal goals, or joining the community. The app will guide you through each step, and you can use features at your own pace. No pressure - start wherever feels most comfortable for you."
  },
  {
    question: "Will my analysis results be visible to other users?",
    answer: "No, your analysis results are completely private. Only you can see your personal analysis, progress photos, and recommendations. The community features are separate - you choose what to share in forums or with other users. Your privacy settings give you complete control over what's visible to others. We believe in creating a safe, supportive environment where you can share as much or as little as you're comfortable with."
  },
  {
    question: "What if I disagree with the analysis results?",
    answer: "That's completely understandable! Remember that our analysis provides objective measurements and insights, but beauty and appearance are highly subjective. The analysis is meant to be a helpful tool, not a definitive judgment. If you disagree with results, you can always get a second analysis, consult with our community or experts, or simply focus on the aspects that resonate with you. The goal is self-improvement and confidence, not perfection according to any algorithm."
  },
  {
    question: "Does the app work on both mobile and desktop?",
    answer: "Yes! Mog Me is available as a web application (accessible now on desktop and mobile browsers) and native mobile apps are coming soon to iOS and Android. The web version works great on all devices, and the mobile apps will offer additional features like camera integration and push notifications. Your data syncs across all platforms, so you can access your progress anywhere."
  }
];

export default function MogMePage() {
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };

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

          {/* FAQ Section */}
          <div className="bg-green-800/40 backdrop-blur-xl p-10 rounded-3xl border-2 border-yellow-400/40 mb-16">
            <h2 className="text-4xl font-bold text-yellow-300 mb-8 text-center flex items-center justify-center gap-3">
              <Sparkles className="w-10 h-10" />
              Frequently Asked Questions
            </h2>
            <p className="text-green-100 text-center mb-6 text-lg max-w-3xl mx-auto">
              Have questions about Mog Me? Find answers to common questions about our facial and body analysis features, privacy, and how to get the most out of your look improvement journey.
            </p>
            <div className="text-center mb-10">
              <Link
                href="/mog-me/support"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-yellow-500 text-white font-semibold rounded-full hover:from-green-500 hover:to-yellow-400 transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                <HelpCircle className="w-5 h-5" />
                Visit Full Support Center
              </Link>
            </div>
            
            <div className="space-y-4 max-w-4xl mx-auto">
              {faqData.map((faq, index) => (
                <div
                  key={index}
                  className="bg-green-900/40 backdrop-blur-sm rounded-2xl border-2 border-yellow-400/30 hover:border-yellow-400/50 transition-all duration-300 overflow-hidden"
                >
                  <button
                    onClick={() => toggleFAQ(index)}
                    className="w-full p-6 text-left flex items-center justify-between gap-4 hover:bg-green-800/30 transition-colors duration-200"
                  >
                    <h3 className="text-xl font-bold text-yellow-300 flex-1 pr-4">
                      {faq.question}
                    </h3>
                    <div className="flex-shrink-0">
                      {openFAQ === index ? (
                        <ChevronUp className="w-6 h-6 text-yellow-400" />
                      ) : (
                        <ChevronDown className="w-6 h-6 text-yellow-400" />
                      )}
                    </div>
                  </button>
                  {openFAQ === index && (
                    <div className="px-6 pb-6 pt-2 border-t border-yellow-400/20">
                      <p className="text-green-100 leading-relaxed text-lg">
                        {faq.answer}
                      </p>
                    </div>
                  )}
                </div>
              ))}
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
                href="mailto:ryanfermoselle@outlook.com" 
                className="block bg-green-800/60 hover:bg-green-700/60 p-6 rounded-xl border-2 border-yellow-400/30 hover:border-yellow-400 transition-all duration-300 transform hover:scale-105"
              >
                <div className="flex items-center gap-4">
                  <Mail className="w-8 h-8 text-yellow-400" />
                  <div>
                    <div className="text-yellow-300 font-bold text-lg">General Inquiries</div>
                    <div className="text-green-100">ryanfermoselle@outlook.com</div>
                  </div>
                </div>
              </a>

              <a 
                href="mailto:ryanfermoselle@outlook.com" 
                className="block bg-green-800/60 hover:bg-green-700/60 p-6 rounded-xl border-2 border-yellow-400/30 hover:border-yellow-400 transition-all duration-300 transform hover:scale-105"
              >
                <div className="flex items-center gap-4">
                  <Mail className="w-8 h-8 text-yellow-400" />
                  <div>
                    <div className="text-yellow-300 font-bold text-lg">Support</div>
                    <div className="text-green-100">ryanfermoselle@outlook.com</div>
                  </div>
                </div>
              </a>

              <a 
                href="mailto:ryanfermoselle@outlook.com" 
                className="block bg-green-800/60 hover:bg-green-700/60 p-6 rounded-xl border-2 border-yellow-400/30 hover:border-yellow-400 transition-all duration-300 transform hover:scale-105"
              >
                <div className="flex items-center gap-4">
                  <Mail className="w-8 h-8 text-yellow-400" />
                  <div>
                    <div className="text-yellow-300 font-bold text-lg">Partnerships</div>
                    <div className="text-green-100">ryanfermoselle@outlook.com</div>
                  </div>
                </div>
              </a>

              <div className="text-center mt-6">
                <Link
                  href="/mog-me/support"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-green-700/60 hover:bg-green-600/60 text-yellow-300 font-semibold rounded-xl border-2 border-yellow-400/30 hover:border-yellow-400 transition-all duration-300"
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
              href="/mog-me/support"
              className="text-yellow-400 hover:text-yellow-300 font-semibold text-lg transition-colors duration-300 hover:underline"
            >
              Support
            </Link>
            <span className="hidden sm:inline text-green-300">•</span>
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

