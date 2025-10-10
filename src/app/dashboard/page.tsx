'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { 
  TrophyIcon, 
  StarIcon, 
  HeartIcon,
  XMarkIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

export default function SimpleDashboard() {
  const [showTestimonialForm, setShowTestimonialForm] = useState(false);
  const [testimonialData, setTestimonialData] = useState({
    title: '',
    story: '',
    gameType: '',
    prizeWon: '',
    rating: 5
  });
  const [user, setUser] = useState<{username: string} | null>(null);

  useEffect(() => {
    // Get user info from localStorage
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
      }
    } catch (error) {
      console.log('No user data found');
    }
  }, []);

  const handleTestimonialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!testimonialData.title || !testimonialData.story || !testimonialData.gameType || !testimonialData.prizeWon) {
      alert('Please fill in all fields');
      return;
    }

    // Create testimonial object
    const testimonial = {
      id: Date.now().toString(),
      username: user?.username || 'Anonymous',
      ...testimonialData,
      createdAt: new Date().toISOString()
    };

    // Save to localStorage
    try {
      const existingTestimonials = localStorage.getItem('victoryTestimonials');
      const testimonials = existingTestimonials ? JSON.parse(existingTestimonials) : [];
      testimonials.push(testimonial);
      localStorage.setItem('victoryTestimonials', JSON.stringify(testimonials));
      
      // Reset form
      setTestimonialData({
        title: '',
        story: '',
        gameType: '',
        prizeWon: '',
        rating: 5
      });
      setShowTestimonialForm(false);
      
      alert('Victory story submitted successfully!');
    } catch (error) {
      console.error('Error saving testimonial:', error);
      alert('Error saving testimonial. Please try again.');
    }
  };

  const renderStars = (rating: number, onRatingChange?: (rating: number) => void) => {
    return Array.from({ length: 5 }, (_, i) => (
      <button
        key={i}
        type="button"
        onClick={() => onRatingChange && onRatingChange(i + 1)}
        className={`h-6 w-6 ${
          i < rating ? 'text-yellow-400 fill-current' : 'text-gray-400'
        } ${onRatingChange ? 'hover:text-yellow-300 cursor-pointer' : ''}`}
      >
        <StarIcon className="h-full w-full" />
      </button>
    ));
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <header className="bg-gradient-to-r from-amber-600 via-orange-500 to-red-500 shadow-2xl border-b-4 border-amber-400">
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
                  ⚡ PROFESSIONAL GAMING MARKETPLACE ⚡
                </span>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="flex items-center space-x-8">
              <Link href="/listings" className="text-white hover:text-yellow-300 font-bold text-lg transition-all duration-300 hover:scale-105">Browse</Link>
              <Link href="/games" className="text-purple-300 hover:text-purple-200 font-bold text-lg transition-all duration-300 hover:scale-105">🎮 Games</Link>
              <Link href="/tournaments" className="text-yellow-300 hover:text-yellow-200 font-bold text-lg transition-all duration-300 hover:scale-105">🏆 Tournaments</Link>
              <Link href="/hot-sell" className="text-red-300 hover:text-red-200 font-bold text-lg transition-all duration-300 hover:scale-105">🔥 Hot Sell</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-extrabold mb-6">
            <span className="bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500 bg-clip-text text-transparent animate-pulse">
              🎯 Dashboard
            </span>
          </h1>
          <div className="w-32 h-1 bg-gradient-to-r from-green-400 to-teal-500 mx-auto rounded-full animate-pulse mb-6"></div>
          <p className="text-xl text-transparent bg-gradient-to-r from-green-300 to-blue-300 bg-clip-text animate-pulse">
            Welcome to your DropDollar dashboard!
          </p>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Games Card */}
          <div className="bg-gradient-to-br from-purple-800 to-pink-800 p-8 rounded-2xl border-2 border-purple-400 hover:border-purple-300 transition-all duration-300 hover:scale-105 shadow-2xl">
            <h3 className="text-3xl font-bold text-white mb-6">🎮 Play Games</h3>
            <p className="text-purple-200 mb-8 text-lg">Compete in tournaments and win prizes with our secure gaming platform</p>
            <Link href="/games" className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-300 font-bold text-lg shadow-lg hover:shadow-2xl hover:scale-105 inline-block">
              Start Playing
            </Link>
          </div>

          {/* Tokens Card */}
          <div className="bg-gradient-to-br from-green-800 to-emerald-800 p-8 rounded-2xl border-2 border-green-400 hover:border-green-300 transition-all duration-300 hover:scale-105 shadow-2xl">
            <h3 className="text-3xl font-bold text-white mb-6">💰 Buy Tokens</h3>
            <p className="text-green-200 mb-8 text-lg">Purchase tokens securely with our professional payment system</p>
            <Link href="/buy-tokens" className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-4 rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-300 font-bold text-lg shadow-lg hover:shadow-2xl hover:scale-105 inline-block">
              Buy Now
            </Link>
          </div>

          {/* Tournaments Card */}
          <div className="bg-gradient-to-br from-yellow-800 to-orange-800 p-8 rounded-2xl border-2 border-yellow-400 hover:border-yellow-300 transition-all duration-300 hover:scale-105 shadow-2xl">
            <h3 className="text-3xl font-bold text-white mb-6">🏆 Tournaments</h3>
            <p className="text-yellow-200 mb-8 text-lg">Join competitive tournaments with real-time leaderboards</p>
            <Link href="/tournaments" className="bg-gradient-to-r from-yellow-600 to-orange-600 text-white px-8 py-4 rounded-xl hover:from-yellow-700 hover:to-orange-700 transition-all duration-300 font-bold text-lg shadow-lg hover:shadow-2xl hover:scale-105 inline-block">
              View Tournaments
            </Link>
          </div>
        </div>

        {/* Victory Story Section */}
        <div className="mt-16 text-center">
          <h2 className="text-4xl font-bold text-transparent bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text mb-8">
            🏆 Share Your Victory Story
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Won a game? Got a prize? Tell us about your success and inspire other players!
          </p>
          
          {!showTestimonialForm ? (
            <button
              onClick={() => setShowTestimonialForm(true)}
              className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 inline-flex items-center"
            >
              <TrophyIcon className="h-6 w-6 mr-2" />
              Write Victory Story
            </button>
          ) : (
            <div className="max-w-2xl mx-auto bg-gray-800 rounded-2xl p-8 border border-gray-700">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-white">Your Victory Story</h3>
                <button
                  onClick={() => setShowTestimonialForm(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <form onSubmit={handleTestimonialSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Story Title
                  </label>
                  <input
                    type="text"
                    value={testimonialData.title}
                    onChange={(e) => setTestimonialData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., 'My First Big Win!'"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Game Type
                  </label>
                  <select
                    value={testimonialData.gameType}
                    onChange={(e) => setTestimonialData(prev => ({ ...prev, gameType: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select a game</option>
                    <option value="Multi-Target Reaction">Multi-Target Reaction</option>
                    <option value="Falling Object Catch">Falling Object Catch</option>
                    <option value="Color Sequence Memory">Color Sequence Memory</option>
                    <option value="Laser Dodge EXTREME">Laser Dodge EXTREME</option>
                    <option value="Quick Click">Quick Click</option>
                    <option value="Sword Parry">Sword Parry</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Prize Won
                  </label>
                  <input
                    type="text"
                    value={testimonialData.prizeWon}
                    onChange={(e) => setTestimonialData(prev => ({ ...prev, prizeWon: e.target.value }))}
                    placeholder="e.g., '$100 Cash Prize' or 'iPhone 15'"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Your Story
                  </label>
                  <textarea
                    value={testimonialData.story}
                    onChange={(e) => setTestimonialData(prev => ({ ...prev, story: e.target.value }))}
                    placeholder="Tell us about your victory! How did you feel? What was the experience like?"
                    rows={4}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Rating
                  </label>
                  <div className="flex items-center space-x-2">
                    {renderStars(testimonialData.rating, (rating) => setTestimonialData(prev => ({ ...prev, rating })))}
                    <span className="text-gray-400 ml-2">{testimonialData.rating}/5</span>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-3 rounded-lg font-bold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
                  >
                    <CheckIcon className="h-5 w-5 inline mr-2" />
                    Submit Story
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTestimonialForm(false)}
                    className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-bold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
          
          <div className="mt-8">
            <Link
              href="/victory-stories"
              className="text-yellow-400 hover:text-yellow-300 font-medium transition-colors"
            >
              View All Victory Stories →
            </Link>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-16 text-center">
          <h2 className="text-4xl font-bold text-transparent bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text mb-8">
            Quick Actions
          </h2>
          <div className="flex flex-wrap justify-center gap-6">
            <Link href="/listings" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 font-bold text-lg shadow-lg hover:shadow-2xl hover:scale-105">
              Browse Listings
            </Link>
            <Link href="/hot-sell" className="bg-gradient-to-r from-red-600 to-orange-600 text-white px-8 py-4 rounded-xl hover:from-red-700 hover:to-orange-700 transition-all duration-300 font-bold text-lg shadow-lg hover:shadow-2xl hover:scale-105">
              Hot Sell
            </Link>
            <Link href="/categories" className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-300 font-bold text-lg shadow-lg hover:shadow-2xl hover:scale-105">
              Categories
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}