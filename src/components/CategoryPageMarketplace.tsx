'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useTokenSync } from '@/hooks/useTokenSync';
import { supabase } from '@/lib/supabase/client';
import { useLocationVerification } from '@/hooks/useLocationVerification';
// Individual game components for marketplace
import LaserDodgeGame from '@/components/games/LaserDodgeGame';
import MultiTargetGame from '@/components/games/MultiTargetGame';
import SwordParryGameSimple from '@/components/games/SwordParryGameSimple';
import QuickClickGame from '@/components/games/QuickClickGame';
import ColorSequenceGame from '@/components/games/ColorSequenceGame';
import BladeBounceGame from '@/components/games/BladeBounceGame';
import CashStackGame from '@/components/games/CashStackGame';
import CleanNavigation from '@/components/navigation/CleanNavigation';
import PageWalletDisplay from '@/components/wallet/PageWalletDisplay';
import LocationBanner from '@/components/location/LocationBanner';
import LocationVerificationModal from '@/components/modals/LocationVerificationModal';
import { 
  ClockIcon, 
  FireIcon, 
  CurrencyDollarIcon, 
  UserGroupIcon,
  ArrowLeftIcon,
  ShieldCheckIcon,
  TrophyIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';

interface CategoryPageProps {
  categoryId: string;
  categoryIcon: React.ReactNode;
}

interface MarketplaceListing {
  id: string;
  seller_id: string;
  seller_username: string;
  title: string;
  description: string;
  category: string;
  base_price: number;
  game_type: string;
  shipping_included: boolean;
  image_urls: any;
  condition?: string;
  brand?: string;
  dimensions?: string;
  weight?: string;
  status: string;
  created_at: string;
  session_id: string;
  prize_pool: number;
  participants_count: number;
  session_status: string;
  timer_started_at: string | null;
  timer_duration: number;
  winner_user_id: string | null;
  winner_username: string | null;
  winner_score: number | null;
  winner_contacted: boolean;
  rng_seed: number;
  participants: Array<{
    id: string;
    user_id: string;
    username: string;
    entry_amount: number;
    score: number | null;
    accuracy: number | null;
    joined_at: string;
    completed_at: string | null;
  }>;
}

const categories: { [key: string]: { name: string } } = {
  electronics: { name: 'Electronics' },
  dropafund: { name: 'Drop a Fund' },
  fun: { name: 'Fun Items' },
  tools: { name: 'Tools' },
  music: { name: 'Music' },
  books: { name: 'Books' },
  art: { name: 'Art' },
  cars: { name: 'Cars' },
  photos: { name: 'Photos' },
  sports: { name: 'Sports' },
  home: { name: 'Home' },
  fashion: { name: 'Fashion' },
  collectibles: { name: 'Collectibles' },
  automotive: { name: 'Automotive' },
  'tools-equipment': { name: 'Tools & Equipment' },
  'photography': { name: 'Photography' },
  'art-crafts': { name: 'Art & Crafts' },
  'music-instruments': { name: 'Music Instruments' },
  'books-media': { name: 'Books & Media' }
};

export default function CategoryPageMarketplace({ categoryId, categoryIcon }: CategoryPageProps) {
  const { user, isAuthenticated, authLoading } = useAuth();
  const { refreshUserTokens } = useTokenSync();
  
  // Location verification hook (same as WTA, Hot Sell, Games)
  const {
    locationVerified,
    improvedLocation,
    locationLoading,
    showLocationModal,
    handleLocationGranted,
    handleLocationDenied
  } = useLocationVerification(isAuthenticated);
  
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [currentView, setCurrentView] = useState<'list' | 'game'>('list');
  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null);
  const [entryAmount, setEntryAmount] = useState<{ [key: string]: number }>({});
  const [expandedScoreboards, setExpandedScoreboards] = useState<{ [key: string]: boolean }>({});
  const [showContactModal, setShowContactModal] = useState<MarketplaceListing | null>(null);
  const [sellerContact, setSellerContact] = useState<string>('');
  const [editingListing, setEditingListing] = useState<MarketplaceListing | null>(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    base_price: '',
    condition: 'new',
    brand: '',
    dimensions: '',
    weight: ''
  });
  const [editImageFiles, setEditImageFiles] = useState<File[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  const category = categories[categoryId];

  // Load marketplace listings
  const loadListings = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.rpc('get_all_marketplace_listings', {
        category_filter: categoryId
      });

      if (error) {
        console.error('❌ RPC Error:', error);
        throw error;
      }

      console.log('✅ Listings loaded:', data);
      
      // Ensure data is an array and has safe defaults
      const safeListings = (Array.isArray(data) ? data : []).map(listing => ({
        ...listing,
        participants: listing.participants || [],
        condition: listing.condition || 'new',
        brand: listing.brand || null,
        dimensions: listing.dimensions || null,
        weight: listing.weight || null,
        image_urls: listing.image_urls || [],
        session_id: listing.session_id || '',
        prize_pool: listing.prize_pool || 0,
        participants_count: listing.participants_count || 0
      }));
      
      setListings(safeListings);
    } catch (error) {
      console.error('❌ Error loading listings:', error);
      setMessage({ type: 'error', text: 'Failed to load listings: ' + (error as Error).message });
      setListings([]);
    } finally {
      setIsLoading(false);
    }
  }, [categoryId]);

  useEffect(() => {
    loadListings();
    const interval = setInterval(loadListings, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [loadListings]);

  // Calculate time remaining
  const calculateTimeRemaining = (listing: MarketplaceListing) => {
    if (!listing.timer_started_at) return null;
    
    const startedAt = new Date(listing.timer_started_at).getTime();
    const now = Date.now();
    const elapsed = (now - startedAt) / 1000;
    const remaining = listing.timer_duration - elapsed;
    
    if (remaining <= 0) return '⏰ Expired';
    
    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    const seconds = Math.floor(remaining % 60);
    
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  // Join listing
  const handleJoinListing = async (listing: MarketplaceListing) => {
    if (!user || !isAuthenticated) {
      setMessage({ type: 'error', text: 'Please sign in to join' });
      return;
    }

    // Check location verification (same as WTA, Hot Sell, Games)
    if (!locationVerified || !improvedLocation?.isGamingAllowed) {
      setMessage({ 
        type: 'error', 
        text: improvedLocation?.data?.restricted 
          ? `Gaming is not allowed in ${improvedLocation.data.state}` 
          : 'Location verification required. Please enable location to participate.' 
      });
      return;
    }

    const amount = entryAmount[listing.id] || 1;

    try {
      const { data, error } = await supabase.rpc('join_marketplace_session', {
        listing_id_param: listing.id,
        entry_amount_param: amount
      });

      if (error) throw error;

      if (data?.success) {
        setMessage({ type: 'success', text: `Joined successfully! Entry: ${amount} tokens` });
        
        // Set up game flow
        setSelectedListing({
          ...listing,
          rng_seed: data.rng_seed
        });
        setCurrentView('game');
        
        // Refresh tokens and listings
        await refreshUserTokens();
        await loadListings();
      } else {
        throw new Error(data?.message || 'Failed to join');
      }
    } catch (error: any) {
      console.error('Error joining listing:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to join listing' });
    }
  };

  // Handle game completion
  const handleGameComplete = async (result: { score: number; accuracy: number }) => {
    if (!selectedListing || !user) return;

    try {
      const { data, error } = await supabase.rpc('update_marketplace_score', {
        session_id_param: selectedListing.session_id,
        score_param: result.score,
        accuracy_param: result.accuracy
      });

      if (error) throw error;

      if (data?.success) {
        setMessage({ type: 'success', text: `Score saved! Score: ${result.score}` });
        setCurrentView('list');
        setSelectedListing(null);
        await loadListings();
      } else {
        throw new Error(data?.message || 'Failed to save score');
      }
    } catch (error: any) {
      console.error('Error saving score:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to save score' });
    }
  };

  // Contact seller
  const handleContactSeller = async (listing: MarketplaceListing) => {
    if (!user) {
      setMessage({ type: 'error', text: 'Please sign in' });
      return;
    }

    try {
      const { data, error } = await supabase.rpc('contact_seller', {
        listing_id_param: listing.id
      });

      if (error) throw error;

      if (data?.success) {
        setSellerContact(data.seller_contact || data.seller_username || 'Contact info not available');
        setShowContactModal(listing);
      } else {
        throw new Error(data?.message || 'Failed to get contact info');
      }
    } catch (error: any) {
      console.error('Error contacting seller:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to contact seller' });
    }
  };

  const handleEditListing = (listing: MarketplaceListing) => {
    setEditingListing(listing);
    setEditFormData({
      title: listing.title,
      description: listing.description,
      base_price: listing.base_price.toString(),
      condition: listing.condition || 'new',
      brand: listing.brand || '',
      dimensions: listing.dimensions || '',
      weight: listing.weight || ''
    });
    setEditImageFiles([]);
  };

  const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + editImageFiles.length > 5) {
      setMessage({ type: 'error', text: 'Maximum 5 images allowed' });
      return;
    }
    setEditImageFiles(prev => [...prev, ...files]);
  };

  const removeEditImage = (index: number) => {
    setEditImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateListing = async () => {
    if (!editingListing || !user) return;

    setIsUpdating(true);
    setMessage(null);

    try {
      // Upload new images if any
      let imageUrls: string[] = [];
      if (editImageFiles.length > 0) {
        for (const file of editImageFiles) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${user.id}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          const filePath = `listings/${fileName}`;

          const { data, error } = await supabase.storage
            .from('marketplace-images')
            .upload(filePath, file);

          if (error) throw error;

          const { data: { publicUrl } } = supabase.storage
            .from('marketplace-images')
            .getPublicUrl(filePath);

          imageUrls.push(publicUrl);
        }
      }

      // Update listing
      const updateData: any = {
        title: editFormData.title,
        description: editFormData.description,
        base_price: parseFloat(editFormData.base_price),
        condition: editFormData.condition,
        brand: editFormData.brand || null,
        dimensions: editFormData.dimensions || null,
        weight: editFormData.weight || null
      };

      if (imageUrls.length > 0) {
        updateData.image_urls = imageUrls;
      }

      const { error } = await supabase
        .from('marketplace_listings')
        .update(updateData)
        .eq('id', editingListing.id);

      if (error) throw error;

      // Also update the base_price in the session
      await supabase
        .from('marketplace_sessions')
        .update({ base_price: parseFloat(editFormData.base_price) })
        .eq('listing_id', editingListing.id);

      setMessage({ type: 'success', text: 'Listing updated successfully!' });
      setEditingListing(null);
      await loadListings();
    } catch (error: any) {
      console.error('Error updating listing:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to update listing' });
    } finally {
      setIsUpdating(false);
    }
  };

  if (currentView === 'game' && selectedListing) {
    const gameProps = {
      onGameEnd: handleGameComplete,
      onExit: () => {
        setCurrentView('list');
        setSelectedListing(null);
      },
      listingId: selectedListing.session_id,
      entryNumber: selectedListing.participants_count,
      isCompetitionMode: true,
      rngSeed: selectedListing.rng_seed || 1
    };

    // Render the appropriate game component based on game_type
    const renderGame = () => {
      switch (selectedListing.game_type) {
        case 'laser_dodge':
        case 'laser-dodge':
          return <LaserDodgeGame {...gameProps} />;
        case 'multi_target':
        case 'multi-target':
        case 'multi_target_reaction':
          return <MultiTargetGame {...gameProps} />;
        case 'sword_parry':
        case 'sword-parry':
          return <SwordParryGameSimple {...gameProps} />;
        case 'number_tap':
        case 'quick_click':
        case 'quick-click':
          return <QuickClickGame {...gameProps} />;
        case 'memory_color':
        case 'color_sequence':
        case 'color-sequence':
          return <ColorSequenceGame {...gameProps} />;
        case 'blade_bounce':
        case 'blade-bounce':
          return <BladeBounceGame {...gameProps} />;
        case 'cash_stack':
        case 'cash-stack':
        case 'falling_object':
        case 'falling-objects':
          return <CashStackGame {...gameProps} />;
        case 'crypto_match':
          return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
            <div className="text-center">
              <h2 className="text-2xl mb-4">Crypto Match game coming soon!</h2>
              <button 
                onClick={() => {
                  setCurrentView('list');
                  setSelectedListing(null);
                }}
                className="bg-blue-600 px-6 py-3 rounded-lg"
              >
                Back to Listings
              </button>
            </div>
          </div>;
        case 'alien_shooter':
          return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
            <div className="text-center">
              <h2 className="text-2xl mb-4">Alien Shooter game coming soon!</h2>
              <button 
                onClick={() => {
                  setCurrentView('list');
                  setSelectedListing(null);
                }}
                className="bg-blue-600 px-6 py-3 rounded-lg"
              >
                Back to Listings
              </button>
            </div>
          </div>;
        case 'brain_freeze':
          return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
            <div className="text-center">
              <h2 className="text-2xl mb-4">Brain Freeze game coming soon!</h2>
              <button 
                onClick={() => {
                  setCurrentView('list');
                  setSelectedListing(null);
                }}
                className="bg-blue-600 px-6 py-3 rounded-lg"
              >
                Back to Listings
              </button>
            </div>
          </div>;
        default:
          return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
            <div className="text-center">
              <h2 className="text-2xl mb-4">Unknown game type: {selectedListing.game_type}</h2>
              <button 
                onClick={() => {
                  setCurrentView('list');
                  setSelectedListing(null);
                }}
                className="bg-blue-600 px-6 py-3 rounded-lg"
              >
                Back to Listings
              </button>
            </div>
          </div>;
      }
    };

    return renderGame();
  }

  if (!category) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Category Not Found</h1>
          <p className="text-gray-300 mb-8">The category "{categoryId}" does not exist.</p>
          <Link 
            href="/categories" 
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold transition-colors"
          >
            ← Back to Categories
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Navigation */}
      <CleanNavigation />
      
      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Wallet Display */}
        <PageWalletDisplay />

        {/* Location Verification Banner (same as WTA) */}
        {isAuthenticated && (
          <LocationBanner
            isLoading={locationLoading}
            location={improvedLocation}
            isVerified={locationVerified}
          />
        )}
        
        {/* Location Verification Modal (same as WTA) */}
        {showLocationModal && (
          <LocationVerificationModal
            onGrant={handleLocationGranted}
            onDeny={handleLocationDenied}
          />
        )}

        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <span className="text-6xl mr-4">{categoryIcon}</span>
            <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent animate-pulse">
              {category.name.toUpperCase()}
            </h1>
          </div>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-4">
            Compete in skill-based games to win amazing {category.name.toLowerCase()} items!
          </p>
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-400">
            <Link href="/categories" className="hover:text-blue-400 flex items-center transition-colors">
              <ArrowLeftIcon className="h-4 w-4 mr-1" />
              Back to Categories
            </Link>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`max-w-2xl mx-auto mb-8 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-900/20 border border-green-700 text-green-300' 
              : 'bg-red-900/20 border border-red-700 text-red-300'
          }`}>
            {message.text}
          </div>
        )}


        {/* Listings */}
        {isLoading ? (
          <div className="text-center text-white py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>Loading listings...</p>
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <CurrencyDollarIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-xl mb-2">No listings in this category yet</p>
            <p className="mb-6">Be the first to create a listing!</p>
            <Link
              href="/sell"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold transition-colors inline-block"
            >
              Create Listing
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => {
              const progressPercent = Math.min((listing.prize_pool / listing.base_price) * 100, 100);
              const timeRemaining = calculateTimeRemaining(listing);
              const participants = listing.participants || [];
              const userParticipant = participants.find(p => p.user_id === user?.id);
              const isWinner = listing.winner_user_id === user?.id;
              const canJoin = listing.session_status !== 'completed' && !userParticipant;
              const playersWithScores = participants.filter(p => p.score !== null);
              const isScoreboardVisible = expandedScoreboards[listing.id] || false;

              // Check if user is the seller
              const isSeller = user && (listing.seller_id === user.id || listing.seller_id === user.id.toString());
              const canEdit = isSeller && listing.participants_count === 0 && listing.session_status !== 'completed';
              
              // Sellers cannot join their own listing
              const canJoinListing = !isSeller && canJoin;

              return (
                <div key={listing.id} className={`backdrop-blur-xl rounded-3xl p-6 border transition-all duration-300 hover:scale-105 hover:shadow-2xl ${
                  listing.session_status === 'active' 
                    ? 'bg-orange-500/10 border-orange-500/20 hover:bg-orange-500/15' 
                    : listing.session_status === 'completed'
                    ? 'bg-green-500/10 border-green-500/20 hover:bg-green-500/15'
                    : 'bg-yellow-500/10 border-yellow-500/20 hover:bg-yellow-500/15'
                }`}>
                  {/* Product Image or Category Icon */}
                  <div className="mb-4 rounded-2xl overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-gray-700/50">
                    {listing.image_urls && Array.isArray(listing.image_urls) && listing.image_urls.length > 0 ? (
                      <img 
                        src={listing.image_urls[0]} 
                        alt={listing.title}
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <div className="w-full h-48 flex items-center justify-center">
                        <div className="text-center">
                          <span className="text-6xl mb-2 block">{categoryIcon}</span>
                          <p className="text-gray-400 text-sm">No Image</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Product Info Header */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <span className="text-3xl mr-3">{categoryIcon}</span>
                        <h3 className="text-xl font-bold text-white">{listing.title}</h3>
                      </div>
                      <div className="flex items-center rounded-full px-3 py-1 bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        <TrophyIcon className="w-4 h-4 mr-1" />
                        <span className="text-xs font-semibold">MARKETPLACE</span>
                      </div>
                    </div>
                    
                    <p className="text-gray-300 mb-3">{listing.description}</p>
                    
                    {/* Product Details Row */}
                    <div className="flex flex-wrap gap-3 mb-2">
                      {listing.condition && (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          {listing.condition.toUpperCase()}
                        </span>
                      )}
                      {listing.brand && (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-700 text-gray-300">
                          {listing.brand}
                        </span>
                      )}
                      {listing.shipping_included && (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-300 border border-green-500/30">
                          ✓ FREE SHIPPING
                        </span>
                      )}
                    </div>
                    
                    <p className="text-xs text-gray-400">Seller: <span className="text-white font-semibold">{listing.seller_username}</span></p>
                  </div>

                  {/* Status Badge */}
                  {listing.session_status === 'active' && (
                    <div className="mb-4 rounded-2xl p-3 bg-gradient-to-r from-orange-500 to-red-500 text-center">
                      <span className="text-white font-bold flex items-center justify-center">
                        <FireIcon className="inline h-5 w-5 mr-2" />
                        ACTIVE COMPETITION
                      </span>
                    </div>
                  )}
                  
                  {listing.winner_username && (
                    <div className="mb-4 rounded-2xl p-3 bg-gradient-to-r from-green-500 to-emerald-500 text-center">
                      <span className="text-white font-bold flex items-center justify-center">
                        <TrophyIcon className="inline h-5 w-5 mr-2" />
                        Winner: {listing.winner_username}
                      </span>
                    </div>
                  )}

                  {/* Base Price */}
                  <div className="rounded-2xl p-4 mb-4 bg-gradient-to-r from-green-500 to-emerald-500">
                    <div className="text-center">
                      <p className="text-green-100 text-sm font-medium mb-1">ITEM VALUE</p>
                      <p className="text-3xl font-bold text-white">{listing.base_price} Tokens</p>
                    </div>
                  </div>

                  {/* Prize Pool */}
                  <div className="rounded-2xl p-4 mb-4 bg-gradient-to-r from-purple-500 to-pink-500">
                    <div className="text-center">
                      <p className="text-purple-100 text-sm font-medium mb-1">CURRENT POOL</p>
                      <p className="text-3xl font-bold text-white">{listing.prize_pool.toFixed(0)} Tokens</p>
                      <div className="mt-2 flex items-center justify-center text-sm text-purple-100">
                        <UserGroupIcon className="inline h-4 w-4 mr-1" />
                        {listing.participants_count} {listing.participants_count === 1 ? 'Player' : 'Players'}
                      </div>
                    </div>
                  </div>

                  {/* Game Type Badge */}
                  <div className="mb-4 rounded-2xl p-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-center">
                    <p className="text-blue-100 text-xs font-medium mb-1">COMPETITION GAME</p>
                    <p className="text-lg font-bold text-white">{listing.game_type.replace(/_/g, ' ').replace(/-/g, ' ').toUpperCase()}</p>
                  </div>

                  {/* Progress Bar */}
                  {listing.session_status !== 'completed' && (
                    <div className="mb-4 rounded-2xl p-4 bg-gray-800/50">
                      <div className="flex justify-between text-sm font-semibold text-white mb-2">
                        <span>🎯 FUNDING PROGRESS</span>
                        <span className="text-yellow-400">{progressPercent.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 h-3 rounded-full transition-all duration-300 animate-pulse"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <div className="mt-2 text-center text-xs text-gray-400">
                        {listing.prize_pool.toFixed(0)} / {listing.base_price} tokens
                      </div>
                    </div>
                  )}

                  {/* Timer */}
                  {timeRemaining && listing.session_status === 'active' && (
                    <div className="mb-4 rounded-2xl p-4 bg-gradient-to-r from-orange-600 to-red-600">
                      <div className="flex items-center justify-center">
                        <ClockIcon className="h-6 w-6 mr-2 text-white animate-pulse" />
                        <div className="text-center">
                          <p className="text-orange-100 text-xs font-medium">COMPETITION ENDS IN</p>
                          <p className="text-2xl font-bold text-white">{timeRemaining}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Entry Amount Selector */}
                  {canJoinListing && improvedLocation?.isGamingAllowed && (
                    <div className="mb-4">
                      <label className="block text-xs font-medium text-gray-400 mb-2">Entry Amount:</label>
                      <div className="flex space-x-2">
                        {[1, 5, 10].map(amount => (
                          <button
                            key={amount}
                            onClick={() => setEntryAmount(prev => ({ ...prev, [listing.id]: amount }))}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
                              (entryAmount[listing.id] || 1) === amount
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            {amount}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Scoreboard (hidden dropdown for participants) */}
                  {userParticipant && playersWithScores.length > 0 && (
                    <div className="mb-4">
                      <button
                        onClick={() => setExpandedScoreboards(prev => ({ ...prev, [listing.id]: !prev[listing.id] }))}
                        className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 rounded-lg transition-colors mb-2"
                      >
                        {isScoreboardVisible ? '▼' : '▶'} Scoreboard ({playersWithScores.length} players)
                      </button>
                      
                      {isScoreboardVisible && (
                        <div className="bg-gray-700 rounded-lg p-3 space-y-2">
                          {playersWithScores
                            .sort((a, b) => (b.score || 0) - (a.score || 0))
                            .map((participant, index) => (
                              <div 
                                key={participant.id}
                                className={`flex items-center justify-between p-2 rounded ${
                                  index === 0 ? 'bg-yellow-900/30 border border-yellow-700' :
                                  index === 1 ? 'bg-gray-600' : 'bg-gray-800'
                                }`}
                              >
                                <span className="text-white font-bold">
                                  {index === 0 && '👑 '}
                                  {participant.user_id === user?.id ? 'You' : participant.username}
                                </span>
                                <span className="text-green-400 font-bold">{participant.score}</span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  {/* Edit Button (seller only, no participants) */}
                  {canEdit && (
                    <button
                      onClick={() => handleEditListing(listing)}
                      className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 rounded-lg transition-colors mb-3"
                    >
                      ✏️ Edit Listing
                    </button>
                  )}
                  
                  {isWinner && !listing.winner_contacted ? (
                    <button
                      onClick={() => handleContactSeller(listing)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors"
                    >
                      <PhoneIcon className="inline h-5 w-5 mr-2" />
                      Contact Seller for Shipping
                    </button>
                  ) : isWinner && listing.winner_contacted ? (
                    <div className="w-full bg-green-900/30 border border-green-700 text-green-300 font-bold py-3 rounded-lg text-center">
                      ✅ Seller Contacted
                    </div>
                  ) : isSeller && listing.session_status !== 'completed' ? (
                    <div className="w-full bg-purple-900/30 border border-purple-700 text-purple-300 font-bold py-3 rounded-lg text-center">
                      📦 Your Listing - Cannot Join Own Competition
                    </div>
                  ) : canJoinListing ? (
                    improvedLocation?.data?.restricted ? (
                      <div className="w-full bg-red-900/30 border border-red-700 text-red-300 text-sm py-3 rounded-lg text-center">
                        <ShieldCheckIcon className="inline h-4 w-4 mr-1" />
                        Gaming Not Available in {improvedLocation.data.state}
                      </div>
                    ) : locationVerified && improvedLocation?.isGamingAllowed ? (
                      <button
                        onClick={() => handleJoinListing(listing)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors"
                      >
                        🎮 Join Competition ({entryAmount[listing.id] || 1} tokens)
                      </button>
                    ) : (
                      <div className="w-full bg-yellow-900/30 border border-yellow-700 text-yellow-300 text-sm py-3 rounded-lg text-center">
                        <MapPinIcon className="inline h-4 w-4 mr-1" />
                        Location Verification Required
                      </div>
                    )
                  ) : userParticipant && !userParticipant.score ? (
                    locationVerified && improvedLocation?.isGamingAllowed ? (
                      <button
                        onClick={() => {
                          setSelectedListing(listing);
                          setCurrentView('game');
                        }}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg transition-colors"
                      >
                        🎮 Play Game
                      </button>
                    ) : improvedLocation?.data?.restricted ? (
                      <div className="w-full bg-red-900/30 border border-red-700 text-red-300 text-sm py-3 rounded-lg text-center">
                        <ShieldCheckIcon className="inline h-4 w-4 mr-1" />
                        Gaming Not Available in {improvedLocation.data.state}
                      </div>
                    ) : (
                      <div className="w-full bg-yellow-900/30 border border-yellow-700 text-yellow-300 text-sm py-3 rounded-lg text-center">
                        <MapPinIcon className="inline h-4 w-4 mr-1" />
                        Location verification required to play
                      </div>
                    )
                  ) : userParticipant && userParticipant.score ? (
                    <div className="w-full bg-gray-700 text-gray-300 font-bold py-3 rounded-lg text-center">
                      ✅ Game Completed - Score: {userParticipant.score}
                    </div>
                  ) : listing.session_status === 'completed' ? (
                    <div className="w-full bg-green-900/30 border border-green-700 text-green-300 font-bold py-3 rounded-lg text-center">
                      Competition Ended
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}

        {/* Contact Modal */}
        {showContactModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-green-500">
              <h2 className="text-2xl font-bold text-white mb-4">
                <TrophyIcon className="inline h-6 w-6 mr-2 text-green-400" />
                Congratulations!
              </h2>
              <p className="text-gray-300 mb-4">
                You won <span className="font-bold text-green-400">{showContactModal.title}</span>!
              </p>
              <div className="bg-gray-700 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-400 mb-2">Seller Contact:</p>
                <p className="text-white font-bold break-all">
                  {sellerContact.includes('@') ? (
                    <EnvelopeIcon className="inline h-5 w-5 mr-2" />
                  ) : (
                    <PhoneIcon className="inline h-5 w-5 mr-2" />
                  )}
                  {sellerContact}
                </p>
              </div>
              <p className="text-sm text-gray-400 mb-6">
                Contact the seller to arrange shipping and receive your prize!
              </p>
              <button
                onClick={() => {
                  setShowContactModal(null);
                  setSellerContact('');
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Edit Listing Modal */}
        {editingListing && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full border border-yellow-500 my-8">
              <h2 className="text-2xl font-bold text-white mb-4">
                ✏️ Edit Listing
              </h2>
              
              <div className="space-y-4 mb-6">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Title *</label>
                  <input
                    type="text"
                    value={editFormData.title}
                    onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-yellow-500 outline-none"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Description *</label>
                  <textarea
                    value={editFormData.description}
                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                    rows={4}
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-yellow-500 outline-none"
                  />
                </div>

                {/* Base Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Base Price (Tokens) *</label>
                  <input
                    type="number"
                    value={editFormData.base_price}
                    onChange={(e) => setEditFormData({ ...editFormData, base_price: e.target.value })}
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-yellow-500 outline-none"
                  />
                </div>

                {/* Condition & Brand */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Condition</label>
                    <select
                      value={editFormData.condition}
                      onChange={(e) => setEditFormData({ ...editFormData, condition: e.target.value })}
                      className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-yellow-500 outline-none"
                    >
                      <option value="new">New</option>
                      <option value="like-new">Like New</option>
                      <option value="good">Good</option>
                      <option value="fair">Fair</option>
                      <option value="used">Used</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Brand</label>
                    <input
                      type="text"
                      value={editFormData.brand}
                      onChange={(e) => setEditFormData({ ...editFormData, brand: e.target.value })}
                      className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-yellow-500 outline-none"
                    />
                  </div>
                </div>

                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Add/Replace Images ({editImageFiles.length}/5)
                  </label>
                  {editImageFiles.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {editImageFiles.map((file, index) => (
                        <div key={index} className="relative">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-24 object-cover rounded"
                          />
                          <button
                            type="button"
                            onClick={() => removeEditImage(index)}
                            className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 text-xs"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {editImageFiles.length < 5 && (
                    <label className="block border-2 border-dashed border-gray-600 rounded-lg p-4 text-center cursor-pointer hover:border-yellow-500">
                      <span className="text-gray-400">Click to upload images</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleEditImageChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setEditingListing(null);
                    setEditImageFiles([]);
                  }}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg transition-colors"
                  disabled={isUpdating}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateListing}
                  disabled={isUpdating}
                  className="flex-1 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white font-bold py-3 rounded-lg transition-colors"
                >
                  {isUpdating ? '⏳ Updating...' : '✓ Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

