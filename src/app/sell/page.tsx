'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import CleanNavigation from '@/components/navigation/CleanNavigation';
import PageWalletDisplay from '@/components/wallet/PageWalletDisplay';
import {
  PlusIcon,
  ShoppingBagIcon,
  TrophyIcon,
  ClockIcon,
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

interface MarketplaceListing {
  id: string;
  title: string;
  description: string;
  category: string;
  base_price: number;
  game_type: string;
  shipping_included: boolean;
  status: string;
  created_at: string;
  session_id: string;
  prize_pool: number;
  participants_count: number;
  session_status: string;
  timer_started_at: string | null;
  timer_duration: number;
  winner_username: string | null;
  winner_score: number | null;
  winner_contacted: boolean;
}

export default function SellPage() {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<'create' | 'manage'>('create');
  const [myListings, setMyListings] = useState<MarketplaceListing[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'electronics',
    base_price: '',
    game_type: 'crypto_match',
    shipping_included: true,
    seller_contact: ''
  });

  const categories = [
    { id: 'electronics', name: 'Electronics', icon: '📱' },
    { id: 'dropafund', name: 'Drop a Fund', icon: '💰' },
    { id: 'fun', name: 'Fun Items', icon: '🎉' },
    { id: 'tools', name: 'Tools', icon: '🔧' },
    { id: 'music', name: 'Music', icon: '🎵' },
    { id: 'books', name: 'Books', icon: '📚' },
    { id: 'art', name: 'Art', icon: '🎨' },
    { id: 'cars', name: 'Cars', icon: '🚗' },
    { id: 'sports', name: 'Sports', icon: '⚽' },
    { id: 'home', name: 'Home', icon: '🏠' },
    { id: 'fashion', name: 'Fashion', icon: '👗' },
    { id: 'collectibles', name: 'Collectibles', icon: '🏺' }
  ];

  const gameTypes = [
    { id: 'crypto_match', name: 'Crypto Match', description: 'Match cryptocurrency logos' },
    { id: 'laser_dodge', name: 'Laser Dodge', description: 'Dodge lasers and enemy ships' },
    { id: 'alien_shooter', name: 'Alien Shooter', description: 'Shoot invading aliens' },
    { id: 'brain_freeze', name: 'Brain Freeze', description: 'Memory challenge game' }
  ];

  // Load seller's listings
  const loadMyListings = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('get_all_marketplace_listings', { category_filter: 'all' });
      
      if (error) throw error;
      
      // Filter to only seller's listings
      const sellerListings = (data || []).filter((listing: any) => listing.seller_id === user.id);
      setMyListings(sellerListings);
    } catch (error) {
      console.error('Error loading listings:', error);
      setMessage({ type: 'error', text: 'Failed to load listings' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      loadMyListings();
    }
  }, [isAuthenticated, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setMessage({ type: 'error', text: 'Please sign in to create a listing' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const { data, error } = await supabase.rpc('create_marketplace_listing', {
        title_param: formData.title,
        description_param: formData.description,
        category_param: formData.category,
        base_price_param: parseFloat(formData.base_price),
        game_type_param: formData.game_type,
        shipping_included_param: formData.shipping_included,
        seller_contact_param: formData.seller_contact || null
      });

      if (error) throw error;

      if (data?.success) {
        setMessage({ type: 'success', text: 'Listing created successfully!' });
        
        // Reset form
        setFormData({
          title: '',
          description: '',
          category: 'electronics',
          base_price: '',
          game_type: 'crypto_match',
          shipping_included: true,
          seller_contact: ''
        });

        // Refresh listings
        await loadMyListings();
        
        // Switch to manage tab
        setActiveTab('manage');
      } else {
        throw new Error(data?.message || 'Failed to create listing');
      }
    } catch (error: any) {
      console.error('Error creating listing:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to create listing' });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTimeRemaining = (listing: MarketplaceListing) => {
    if (!listing.timer_started_at) return null;
    
    const startedAt = new Date(listing.timer_started_at).getTime();
    const now = Date.now();
    const elapsed = (now - startedAt) / 1000;
    const remaining = listing.timer_duration - elapsed;
    
    if (remaining <= 0) return '⏰ Expired';
    
    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="text-center text-white">
          <ShoppingBagIcon className="h-20 w-20 mx-auto mb-4 text-blue-400" />
          <h1 className="text-3xl font-bold mb-4">Sign In Required</h1>
          <p className="text-gray-300 mb-6">Please sign in to create marketplace listings</p>
          <Link
            href="/auth/signin"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <CleanNavigation />
      <PageWalletDisplay />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            <ShoppingBagIcon className="inline h-10 w-10 mr-3 text-blue-400" />
            Seller Dashboard
          </h1>
          <p className="text-gray-300">
            Create listings and let players compete for your items!
          </p>
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-3 px-6 rounded-lg font-bold transition-colors ${
              activeTab === 'create'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            <PlusIcon className="inline h-5 w-5 mr-2" />
            Create Listing
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`flex-1 py-3 px-6 rounded-lg font-bold transition-colors ${
              activeTab === 'manage'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            <ShoppingBagIcon className="inline h-5 w-5 mr-2" />
            My Listings ({myListings.length})
          </button>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-900/20 border border-green-700 text-green-300' 
              : 'bg-red-900/20 border border-red-700 text-red-300'
          }`}>
            {message.text}
          </div>
        )}

        {/* Create Tab */}
        {activeTab === 'create' && (
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Create New Listing</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Product Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g., iPhone 15 Pro Max 256GB"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description *
                </label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Describe your product in detail..."
                />
              </div>

              {/* Category & Base Price */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Base Price (Tokens) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="0.01"
                    value={formData.base_price}
                    onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g., 100"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Players must accumulate this amount for timer to start
                  </p>
                </div>
              </div>

              {/* Game Type */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Game Type * (Players will compete in this game)
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {gameTypes.map((game) => (
                    <button
                      key={game.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, game_type: game.id })}
                      className={`p-4 rounded-lg border-2 transition-colors text-left ${
                        formData.game_type === game.id
                          ? 'border-blue-500 bg-blue-900/20'
                          : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                      }`}
                    >
                      <div className="font-bold text-white mb-1">{game.name}</div>
                      <div className="text-sm text-gray-400">{game.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Contact Info */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Contact Information (Email or Phone)
                </label>
                <input
                  type="text"
                  value={formData.seller_contact}
                  onChange={(e) => setFormData({ ...formData, seller_contact: e.target.value })}
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="email@example.com or phone number"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Winner will see this to arrange shipping
                </p>
              </div>

              {/* Shipping */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="shipping"
                  checked={formData.shipping_included}
                  onChange={(e) => setFormData({ ...formData, shipping_included: e.target.checked })}
                  className="w-5 h-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="shipping" className="ml-3 text-gray-300">
                  Shipping included in base price
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-4 rounded-lg transition-colors"
              >
                {isLoading ? '⏳ Creating...' : '🎯 Create Listing'}
              </button>
            </form>
          </div>
        )}

        {/* Manage Tab */}
        {activeTab === 'manage' && (
          <div>
            {isLoading ? (
              <div className="text-center text-white py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p>Loading your listings...</p>
              </div>
            ) : myListings.length === 0 ? (
              <div className="text-center text-gray-400 py-12">
                <ShoppingBagIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-xl mb-2">No listings yet</p>
                <p className="mb-6">Create your first listing to get started!</p>
                <button
                  onClick={() => setActiveTab('create')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold transition-colors"
                >
                  <PlusIcon className="inline h-5 w-5 mr-2" />
                  Create Listing
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {myListings.map((listing) => {
                  const timeRemaining = calculateTimeRemaining(listing);
                  const progressPercent = Math.min((listing.prize_pool / listing.base_price) * 100, 100);
                  const category = categories.find(c => c.id === listing.category);
                  const game = gameTypes.find(g => g.id === listing.game_type);
                  
                  return (
                    <div key={listing.id} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-white mb-1">{listing.title}</h3>
                          <div className="flex items-center space-x-2 text-sm text-gray-400">
                            <span>{category?.icon} {category?.name}</span>
                            <span>•</span>
                            <span>{game?.name}</span>
                          </div>
                        </div>
                        {listing.session_status === 'completed' && listing.winner_username && (
                          <div className="bg-green-900/30 border border-green-700 rounded-lg px-3 py-1">
                            <TrophyIcon className="inline h-4 w-4 text-green-400 mr-1" />
                            <span className="text-green-300 text-sm font-bold">Winner!</span>
                          </div>
                        )}
                      </div>

                      <p className="text-gray-300 text-sm mb-4">{listing.description}</p>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-gray-700 rounded-lg p-3">
                          <div className="text-xs text-gray-400 mb-1">Base Price</div>
                          <div className="text-lg font-bold text-white">{listing.base_price} tokens</div>
                        </div>
                        <div className="bg-gray-700 rounded-lg p-3">
                          <div className="text-xs text-gray-400 mb-1">Collected</div>
                          <div className="text-lg font-bold text-green-400">{listing.prize_pool} tokens</div>
                        </div>
                        <div className="bg-gray-700 rounded-lg p-3">
                          <div className="text-xs text-gray-400 mb-1">Players</div>
                          <div className="text-lg font-bold text-blue-400">
                            <UserGroupIcon className="inline h-5 w-5 mr-1" />
                            {listing.participants_count}
                          </div>
                        </div>
                        <div className="bg-gray-700 rounded-lg p-3">
                          <div className="text-xs text-gray-400 mb-1">Status</div>
                          <div className="text-lg font-bold text-yellow-400">
                            {listing.session_status === 'completed' ? '✅ Done' : 
                             listing.session_status === 'active' ? '⚡ Active' : '⏳ Waiting'}
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      {listing.session_status !== 'completed' && (
                        <div className="mb-4">
                          <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span>Progress to Start</span>
                            <span>{progressPercent.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Timer */}
                      {listing.timer_started_at && listing.session_status === 'active' && (
                        <div className="bg-orange-900/30 border border-orange-700 rounded-lg p-3 mb-4">
                          <div className="flex items-center justify-between">
                            <span className="text-orange-300 font-bold">
                              <ClockIcon className="inline h-5 w-5 mr-2" />
                              Time Remaining:
                            </span>
                            <span className="text-orange-200 font-bold text-lg">
                              {timeRemaining}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Winner Info */}
                      {listing.winner_username && (
                        <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-green-300 font-bold">🏆 Winner:</span>
                            <span className="text-white font-bold">{listing.winner_username}</span>
                          </div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-green-300 font-bold">Score:</span>
                            <span className="text-white font-bold">{listing.winner_score}</span>
                          </div>
                          <div className="flex items-center">
                            {listing.winner_contacted ? (
                              <div className="flex items-center text-green-400">
                                <CheckCircleIcon className="h-5 w-5 mr-2" />
                                <span>Winner contacted you</span>
                              </div>
                            ) : (
                              <div className="flex items-center text-yellow-400">
                                <ClockIcon className="h-5 w-5 mr-2" />
                                <span>Waiting for winner to contact</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* View Details Button */}
                      <Link
                        href={`/categories/${listing.category}#${listing.id}`}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors text-center block"
                      >
                        View Listing Page
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

