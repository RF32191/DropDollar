'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function AdRegistrationPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    setTimeout(() => {
      setSubmitMessage('success');
      setIsSubmitting(false);
      setTimeout(() => {
        router.push('/advertising/dashboard');
      }, 2000);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-800 via-purple-800 to-pink-800 shadow-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-2xl font-bold text-white">💧</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">DropDollar</h1>
                <p className="text-blue-200 text-sm">Advertiser Portal</p>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link href="/advertising/dashboard" className="text-blue-200 hover:text-white transition-colors">
                Dashboard
              </Link>
              <Link href="/advertising/billing" className="text-blue-200 hover:text-white transition-colors">
                Billing
              </Link>
            </nav>

            {/* User Info */}
            <div className="flex items-center space-x-4">
              {user ? (
                <div className="text-white">
                  <span className="text-sm">Welcome, {user.email}</span>
                </div>
              ) : (
                <Link href="/auth/login" className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors">
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            🎯 Register Your Ad Campaign
          </h1>
          <p className="text-xl text-blue-200 max-w-2xl mx-auto">
            Reach thousands of engaged gamers on DropDollar with targeted advertising campaigns
          </p>
        </div>

        {/* Registration Notice */}
        <div className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border border-yellow-500/30 rounded-xl p-6 mb-8">
          <div className="flex items-start space-x-3">
            <span className="text-yellow-400 text-2xl">⚠️</span>
            <div>
              <h3 className="text-lg font-bold text-yellow-200 mb-2">Account Requirements Notice</h3>
              <div className="text-yellow-100 space-y-2">
                <p>To advertise on DropDollar, you must:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Register as both a <strong>buyer</strong> and <strong>seller</strong> account</li>
                  <li>Set up a valid payment method for ad campaign billing</li>
                  <li>Complete identity verification for advertiser protection</li>
                  <li>Agree to our advertising terms and content guidelines</li>
                </ul>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link href="/auth/register" className="bg-yellow-600 hover:bg-yellow-500 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                    Register Account
                  </Link>
                  <Link href="/seller/apply" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                    Become Seller
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-white font-medium mb-2">Campaign Name</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:border-blue-400"
                  placeholder="Enter campaign name"
                  required
                />
              </div>
              <div>
                <label className="block text-white font-medium mb-2">Advertiser Name</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:border-blue-400"
                  placeholder="Your company name"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-white font-medium mb-2">Contact Email</label>
                <input 
                  type="email" 
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:border-blue-400"
                  placeholder="contact@company.com"
                  defaultValue={user?.email || ''}
                  required
                />
              </div>
              <div>
                <label className="block text-white font-medium mb-2">Website</label>
                <input 
                  type="url" 
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:border-blue-400"
                  placeholder="https://yourwebsite.com"
                />
              </div>
            </div>

            {/* Campaign Details */}
            <div>
              <label className="block text-white font-medium mb-2">Ad Type</label>
              <select className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-400">
                <option value="practice_game">Practice Game Ads</option>
                <option value="banner">Banner Ads</option>
                <option value="both">Both Types</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-white font-medium mb-2">Budget ($)</label>
                <input 
                  type="number" 
                  min="500"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:border-blue-400"
                  placeholder="500"
                  defaultValue="500"
                  required
                />
              </div>
              <div>
                <label className="block text-white font-medium mb-2">Cost Per View ($)</label>
                <input 
                  type="number" 
                  step="0.001"
                  min="0.015"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:border-blue-400"
                  placeholder="0.02"
                  defaultValue="0.02"
                  required
                />
              </div>
            </div>

            {/* Ad Creative */}
            <div>
              <label className="block text-white font-medium mb-2">Ad Title</label>
              <input 
                type="text" 
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:border-blue-400"
                placeholder="Your compelling ad title"
                required
              />
            </div>

            <div>
              <label className="block text-white font-medium mb-2">Ad Description</label>
              <textarea 
                rows={4}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:border-blue-400"
                placeholder="Describe your product or service..."
                required
              />
            </div>

            {/* Terms Agreement */}
            <div className="flex items-start space-x-3">
              <input 
                type="checkbox" 
                id="terms"
                className="mt-1 h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                required
              />
              <label htmlFor="terms" className="text-white text-sm">
                I agree to the <Link href="/terms" className="text-blue-400 hover:text-blue-300 underline">Terms of Service</Link> and <Link href="/privacy" className="text-blue-400 hover:text-blue-300 underline">Privacy Policy</Link>. I understand that all ad content must comply with DropDollar's advertising guidelines.
              </label>
            </div>

            {/* Submit Button */}
            <div className="text-center">
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-4 px-8 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting Campaign...' : 'Submit Ad Campaign'}
              </button>
            </div>

            {/* Success/Error Messages */}
            {submitMessage === 'success' && (
              <div className="bg-green-600/20 border border-green-500/30 rounded-lg p-4 text-center">
                <p className="text-green-200 font-medium">
                  ✅ Campaign submitted successfully! Redirecting to dashboard...
                </p>
              </div>
            )}
            {submitMessage === 'error' && (
              <div className="bg-red-600/20 border border-red-500/30 rounded-lg p-4 text-center">
                <p className="text-red-200 font-medium">
                  ❌ Failed to submit campaign. Please try again.
                </p>
              </div>
            )}
          </form>
        </div>

        {/* Pricing Information */}
        <div className="mt-12 bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">💰 Advertising Pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-blue-600/20 rounded-lg p-6 border border-blue-500/30">
                <h3 className="text-lg font-bold text-blue-200 mb-2">Practice Game Ads</h3>
                <p className="text-3xl font-bold text-white mb-2">$0.02</p>
                <p className="text-blue-200 text-sm">per view</p>
                <p className="text-gray-300 text-sm mt-2">10-second ads before practice games</p>
              </div>
            </div>
            <div className="text-center">
              <div className="bg-purple-600/20 rounded-lg p-6 border border-purple-500/30">
                <h3 className="text-lg font-bold text-purple-200 mb-2">Banner Ads</h3>
                <p className="text-3xl font-bold text-white mb-2">$0.015</p>
                <p className="text-purple-200 text-sm">per view</p>
                <p className="text-gray-300 text-sm mt-2">Strategic banner placements</p>
              </div>
            </div>
            <div className="text-center">
              <div className="bg-green-600/20 rounded-lg p-6 border border-green-500/30">
                <h3 className="text-lg font-bold text-green-200 mb-2">Click-Through</h3>
                <p className="text-3xl font-bold text-white mb-2">$0.50</p>
                <p className="text-green-200 text-sm">per click</p>
                <p className="text-gray-300 text-sm mt-2">Performance-based pricing</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}