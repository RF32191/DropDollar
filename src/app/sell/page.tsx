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
  const [isSeller, setIsSeller] = useState(false);
  const [isCheckingSeller, setIsCheckingSeller] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'electronics',
    base_price: '',
    game_type: 'multi-target', // Default to first real game
    shipping_included: true,
    seller_contact: '',
    condition: 'new',
    brand: '',
    dimensions: '',
    weight: ''
  });
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);

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
    { id: 'multi-target', name: 'Multi-Target Reaction', description: 'Click targets quickly - Speed & accuracy', difficulty: 'Medium' },
    { id: 'falling-objects', name: 'Falling Object Catch', description: 'Catch coins and dollars', difficulty: 'Medium' },
    { id: 'color-sequence', name: 'Color Sequence Memory', description: 'Remember and repeat colors', difficulty: 'Hard' },
    { id: 'laser-dodge', name: 'Laser Dodge EXTREME', description: 'Pilot through laser grids', difficulty: 'Extreme' },
    { id: 'quick-click', name: 'QuickClick Challenge', description: 'Lightning-fast reactions', difficulty: 'Easy' },
    { id: 'sword-parry', name: 'Sword Slash', description: 'Destroy red attacks with sword', difficulty: 'Medium' },
    { id: 'blade-bounce', name: 'Blade Bounce: Mouseblade', description: 'Control sword with mouse', difficulty: 'Extreme' },
    { id: 'cash-stack', name: 'Cash Stack Challenge', description: 'Stack coins on falling cash', difficulty: 'Hard' }
  ];

  // Check seller status
  const checkSellerStatus = async () => {
    if (!user) return;
    
    try {
      setIsCheckingSeller(true);
      const { data, error } = await supabase.rpc('check_seller_status');
      
      if (error) throw error;
      
      // RPC returns an array, get first item
      const sellerData = Array.isArray(data) ? data[0] : data;
      console.log('✅ [Sell Page] Seller status:', sellerData);
      
      if (sellerData?.is_seller === true && sellerData?.status === 'approved') {
        setIsSeller(true);
        
        // Pre-fill seller contact
        if (sellerData.contact_email) {
          setFormData(prev => ({ ...prev, seller_contact: sellerData.contact_email }));
        }
      } else {
        setIsSeller(false);
      }
    } catch (error) {
      console.error('Error checking seller status:', error);
      setIsSeller(false);
    } finally {
      setIsCheckingSeller(false);
    }
  };

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
      checkSellerStatus();
      loadMyListings();
    }
  }, [isAuthenticated, user]);

  // Handle image file selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + imageFiles.length > 5) {
      setMessage({ type: 'error', text: 'Maximum 5 images allowed' });
      return;
    }
    setImageFiles(prev => [...prev, ...files]);
  };

  // Remove image from selection
  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Upload images to Supabase Storage
  const uploadImages = async (): Promise<string[]> => {
    if (imageFiles.length === 0) return [];
    
    setIsUploadingImages(true);
    const uploadedUrls: string[] = [];
    
    try {
      for (const file of imageFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user?.id}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `listings/${fileName}`;

        const { data, error } = await supabase.storage
          .from('marketplace-images')
          .upload(filePath, file);

        if (error) throw error;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('marketplace-images')
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      }
    } catch (error) {
      console.error('Error uploading images:', error);
      throw error;
    } finally {
      setIsUploadingImages(false);
    }
    
    return uploadedUrls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setMessage({ type: 'error', text: 'Please sign in to create a listing' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      // Upload images first
      const imageUrls = await uploadImages();

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
        console.log('✅ Listing created:', data);
        console.log('📸 Images uploaded:', imageUrls.length, 'URLs:', imageUrls);
        
        // If images were uploaded or additional data, update the listing
        if (imageUrls.length > 0 || formData.condition || formData.brand || formData.dimensions || formData.weight) {
          const updateData: any = {
            condition: formData.condition,
            brand: formData.brand || null,
            dimensions: formData.dimensions || null,
            weight: formData.weight || null
          };
          
          // Add image_urls as JSONB array if images were uploaded
          if (imageUrls.length > 0) {
            updateData.image_urls = imageUrls;
            console.log('💾 Saving image URLs to listing:', updateData.image_urls);
          }
          
          // FIX: Use listing_id not session_id to update the listing!
          const { error: updateError } = await supabase
            .from('marketplace_listings')
            .update(updateData)
            .eq('id', data.listing_id); // Changed from data.session_id to data.listing_id
          
          if (updateError) {
            console.error('❌ Error updating listing with images:', updateError);
            throw updateError;
          }
          
          console.log('✅ Listing updated with images and details');
        }

        setMessage({ type: 'success', text: 'Listing created successfully!' });
        
        // Reset form
        setFormData({
          title: '',
          description: '',
          category: 'electronics',
          base_price: '',
          game_type: 'multi-target', // Default to first real game
          shipping_included: true,
          seller_contact: '',
          condition: 'new',
          brand: '',
          dimensions: '',
          weight: ''
        });
        setImageFiles([]);

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
        {isSeller ? (
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
        ) : null}

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

        {/* Not a Seller - Redirect to Dashboard */}
        {!isSeller && !isCheckingSeller && (
          <div className="bg-gray-800 rounded-xl p-8 max-w-2xl mx-auto text-center">
            <XCircleIcon className="h-16 w-16 mx-auto mb-4 text-red-400" />
            <h2 className="text-3xl font-bold text-white mb-4">Seller Registration Required</h2>
            <p className="text-gray-300 mb-6">
              You need to be a registered seller to create marketplace listings.
            </p>
            <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-6 mb-6">
              <h3 className="font-bold text-blue-300 mb-3">How to become a seller:</h3>
              <ol className="text-left text-blue-200 space-y-2">
                <li>1️⃣ Go to your Dashboard</li>
                <li>2️⃣ Find the "Seller Status" section</li>
                <li>3️⃣ Click "Register as Seller"</li>
                <li>4️⃣ Fill in your contact information</li>
                <li>5️⃣ Start creating listings!</li>
              </ol>
            </div>
            <Link
              href="/dashboard"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-lg transition-colors"
            >
              🚀 Go to Dashboard to Register
            </Link>
          </div>
        )}

        {isCheckingSeller && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-white">Checking seller status...</p>
          </div>
        )}

        {/* Create Tab */}
        {isSeller && activeTab === 'create' && (
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

              {/* Product Images */}
              <div className="bg-gray-700/50 rounded-lg p-6">
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Product Images {imageFiles.length > 0 && `(${imageFiles.length}/5)`}
                </label>
                <div className="space-y-4">
                  {/* Image Preview Grid */}
                  {imageFiles.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                      {imageFiles.map((file, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border-2 border-gray-600"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <XCircleIcon className="h-5 w-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Upload Button */}
                  {imageFiles.length < 5 && (
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-600 rounded-lg p-8 cursor-pointer hover:border-blue-500 transition-colors">
                      <PlusIcon className="h-12 w-12 text-gray-400 mb-2" />
                      <span className="text-gray-300 mb-1">Click to upload images</span>
                      <span className="text-xs text-gray-500">PNG, JPG up to 5MB each</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Condition & Brand */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Condition *
                  </label>
                  <select
                    value={formData.condition}
                    onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="new">New</option>
                    <option value="like-new">Like New</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                    <option value="used">Used</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Brand
                  </label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g., Apple, Samsung, etc."
                  />
                </div>
              </div>

              {/* Dimensions & Weight */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Dimensions (optional)
                  </label>
                  <input
                    type="text"
                    value={formData.dimensions}
                    onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g., 6 x 3 x 0.3 inches"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Weight (optional)
                  </label>
                  <input
                    type="text"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g., 6.2 oz"
                  />
                </div>
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
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        formData.game_type === game.id
                          ? 'border-blue-500 bg-blue-900/30 shadow-lg'
                          : 'border-gray-600 bg-gray-700 hover:border-gray-500 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="font-bold text-white">{game.name}</div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          game.difficulty === 'Easy' ? 'bg-green-500/20 text-green-400' :
                          game.difficulty === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                          game.difficulty === 'Hard' ? 'bg-orange-500/20 text-orange-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {game.difficulty}
                        </span>
                      </div>
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
                disabled={isLoading || isUploadingImages}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-4 rounded-lg transition-colors"
              >
                {isUploadingImages ? '📤 Uploading Images...' : isLoading ? '⏳ Creating...' : '🎯 Create Listing'}
              </button>
            </form>
          </div>
        )}

        {/* Manage Tab */}
        {isSeller && activeTab === 'manage' && (
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

