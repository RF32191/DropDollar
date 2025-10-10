'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  TrophyIcon, 
  StarIcon, 
  HeartIcon,
  UserIcon,
  CalendarIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

interface Testimonial {
  id: string;
  username: string;
  title: string;
  story: string;
  gameType: string;
  prizeWon: string;
  createdAt: string;
  rating: number;
}

export default function VictoryStoriesPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load testimonials from localStorage
    const loadTestimonials = () => {
      try {
        const savedTestimonials = localStorage.getItem('victoryTestimonials');
        if (savedTestimonials) {
          const parsedTestimonials = JSON.parse(savedTestimonials);
          setTestimonials(parsedTestimonials);
        }
      } catch (error) {
        console.error('Error loading testimonials:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTestimonials();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <StarIcon
        key={i}
        className={`h-5 w-5 ${
          i < rating ? 'text-yellow-400 fill-current' : 'text-gray-400'
        }`}
      />
    ));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading victory stories...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <header className="bg-gradient-to-r from-yellow-600 via-orange-500 to-red-500 shadow-2xl border-b-4 border-yellow-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-4 group">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-full flex items-center justify-center overflow-hidden shadow-lg group-hover:shadow-2xl transition-all duration-300 group-hover:scale-110">
                <img 
                  src="/DropCoin.png" 
                  alt="DropDollar Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-3xl font-extrabold text-white drop-shadow-lg">DropDollar</span>
                <span className="text-sm text-yellow-200 font-bold tracking-wider animate-pulse">
                  ⚡ VICTORY STORIES ⚡
                </span>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="flex items-center space-x-8">
              <Link href="/games" className="text-white hover:text-yellow-300 font-bold text-lg transition-all duration-300 hover:scale-105">🎮 Games</Link>
              <Link href="/tournaments" className="text-white hover:text-yellow-300 font-bold text-lg transition-all duration-300 hover:scale-105">🏆 Tournaments</Link>
              <Link href="/hot-sell" className="text-white hover:text-yellow-300 font-bold text-lg transition-all duration-300 hover:scale-105">🔥 Hot Sell</Link>
              <Link href="/dashboard" className="text-white hover:text-yellow-300 font-bold text-lg transition-all duration-300 hover:scale-105">📊 Dashboard</Link>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Page Title */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-extrabold mb-6">
            <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent animate-pulse">
              🏆 Victory Stories 🏆
            </span>
          </h1>
          <div className="w-32 h-1 bg-gradient-to-r from-yellow-400 to-red-500 mx-auto rounded-full animate-pulse mb-6"></div>
          <p className="text-2xl text-transparent bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text animate-pulse max-w-3xl mx-auto mb-8">
            Real stories from real winners! See how our players turned skill into success.
          </p>
        </div>

        {/* Testimonials Grid */}
        {testimonials.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial) => (
              <div key={testimonial.id} className="bg-gray-800 rounded-2xl p-6 shadow-2xl border border-gray-700 hover:border-yellow-500 transition-all duration-300 transform hover:scale-105">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
                      <TrophyIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{testimonial.title}</h3>
                      <p className="text-gray-400 text-sm">by @{testimonial.username}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    {renderStars(testimonial.rating)}
                  </div>
                </div>

                {/* Story */}
                <div className="mb-4">
                  <p className="text-gray-300 leading-relaxed">{testimonial.story}</p>
                </div>

                {/* Game Info */}
                <div className="bg-gray-700 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-yellow-400 font-semibold">Game: {testimonial.gameType}</p>
                      <p className="text-green-400 font-bold">Prize: {testimonial.prizeWon}</p>
                    </div>
                    <SparklesIcon className="h-8 w-8 text-yellow-400" />
                  </div>
                </div>

                {/* Date */}
                <div className="flex items-center text-gray-400 text-sm">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  <span>{formatDate(testimonial.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-20">
            <div className="w-32 h-32 bg-gradient-to-br from-gray-700 to-gray-600 rounded-full flex items-center justify-center mx-auto mb-8">
              <TrophyIcon className="h-16 w-16 text-gray-400" />
            </div>
            <h2 className="text-4xl font-bold text-gray-400 mb-4">No Victory Stories Yet</h2>
            <p className="text-xl text-gray-500 mb-8 max-w-2xl mx-auto">
              Be the first to share your winning story! Play games, win prizes, and tell us about your victory.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/games"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300"
              >
                🎮 Start Playing
              </Link>
              <Link
                href="/dashboard"
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300"
              >
                📊 Go to Dashboard
              </Link>
            </div>
          </div>
        )}

        {/* Call to Action */}
        <div className="mt-16 text-center">
          <div className="bg-gradient-to-r from-yellow-900 to-orange-900 border-2 border-yellow-400 rounded-2xl p-8 max-w-4xl mx-auto shadow-2xl">
            <h2 className="text-3xl font-bold text-yellow-200 mb-4">Share Your Victory!</h2>
            <p className="text-yellow-300 mb-6 text-lg">
              Won a game? Got a prize? Tell us about your success story and inspire other players!
            </p>
            <Link
              href="/dashboard"
              className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 inline-flex items-center"
            >
              <HeartIcon className="h-6 w-6 mr-2" />
              Write Your Story
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
