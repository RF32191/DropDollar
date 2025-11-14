'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useTokenSync } from '@/hooks/useTokenSync';
import { supabase } from '@/lib/supabase/client';
import { useLocationVerification } from '@/hooks/useLocationVerification';
import CompetitionGameFlow from '@/components/games/CompetitionGameFlow';
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

  const category = categories[categoryId];

  // Load marketplace listings
  const loadListings = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.rpc('get_all_marketplace_listings', {
        category_filter: categoryId
      });

      if (error) throw error;
      setListings(data || []);
    } catch (error) {
      console.error('Error loading listings:', error);
      setMessage({ type: 'error', text: 'Failed to load listings' });
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

  if (currentView === 'game' && selectedListing) {
    return (
      <CompetitionGameFlow
        gameType={selectedListing.game_type}
        onGameEnd={handleGameComplete}
        onExit={() => {
          setCurrentView('list');
          setSelectedListing(null);
        }}
        listingId={selectedListing.id}
        entryNumber={selectedListing.participants_count}
        isCompetitionMode={true}
        rngSeed={selectedListing.rng_seed}
      />
    );
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
      {/* Navigation and Wallet */}
      <CleanNavigation />
      <PageWalletDisplay />
      
      {/* Location Banner (same as WTA, Hot Sell, Games) */}
      <LocationBanner 
        locationVerified={locationVerified}
        improvedLocation={improvedLocation}
        locationLoading={locationLoading}
      />
      
      {/* Location Verification Modal (same as WTA, Hot Sell, Games) */}
      {showLocationModal && (
        <LocationVerificationModal
          onGrant={handleLocationGranted}
          onDeny={handleLocationDenied}
        />
      )}

      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 shadow-2xl border-b-4 border-blue-400/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/" className="flex items-center space-x-4 group">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-xl group-hover:shadow-2xl transition-all duration-300 group-hover:scale-105">
                <img 
                  src="/DropCoin.png" 
                  alt="DropDollar Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-white drop-shadow-lg">DropDollar</span>
                <span className="text-xs text-gray-300 font-medium tracking-wide">
                  {categoryIcon} {category.name.toUpperCase()}
                </span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center space-x-6">
              <Link href="/categories" className="text-purple-200 hover:text-white font-medium transition-colors">Categories</Link>
              <Link href="/games" className="text-pink-200 hover:text-white font-bold transition-colors">🎮 Games</Link>
              <Link href="/tournaments" className="text-yellow-200 hover:text-white font-bold transition-colors">🏆 Tournaments</Link>
              <Link href="/sell" className="text-green-200 hover:text-white font-bold transition-colors">💰 Sell</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-sm text-gray-400 mb-8">
          <Link href="/categories" className="hover:text-blue-400 flex items-center transition-colors">
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Categories
          </Link>
          <span>/</span>
          <span className="text-white font-medium">{categoryIcon} {category.name}</span>
        </div>

        {/* Page Title */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-extrabold mb-6">
            <span className="bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent animate-pulse">
              {categoryIcon} {category.name.toUpperCase()}
            </span>
          </h1>
          <div className="w-32 h-1 bg-gradient-to-r from-blue-400 to-pink-500 mx-auto rounded-full animate-pulse mb-6"></div>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Compete in skill-based games to win amazing {category.name.toLowerCase()} items!
          </p>
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
              const userParticipant = listing.participants.find(p => p.user_id === user?.id);
              const isWinner = listing.winner_user_id === user?.id;
              const canJoin = listing.session_status !== 'completed' && !userParticipant;
              const playersWithScores = listing.participants.filter(p => p.score !== null);
              const isScoreboardVisible = expandedScoreboards[listing.id] || false;

              return (
                <div key={listing.id} className={`bg-gray-800 rounded-xl p-6 border ${
                  listing.session_status === 'active' 
                    ? 'border-orange-500 shadow-lg shadow-orange-500/20' 
                    : listing.session_status === 'completed'
                    ? 'border-green-500 shadow-lg shadow-green-500/20'
                    : 'border-gray-700'
                } hover:border-blue-500 transition-colors`}>
                  {/* Status Badge */}
                  {listing.session_status === 'active' && (
                    <div className="mb-4 bg-orange-900/30 border border-orange-700 rounded-lg p-2 text-center">
                      <span className="text-orange-300 font-bold">
                        <FireIcon className="inline h-5 w-5 mr-1" />
                        ACTIVE COMPETITION
                      </span>
                    </div>
                  )}
                  
                  {listing.winner_username && (
                    <div className="mb-4 bg-green-900/30 border border-green-700 rounded-lg p-2 text-center">
                      <span className="text-green-300 font-bold">
                        <TrophyIcon className="inline h-5 w-5 mr-1" />
                        Winner: {listing.winner_username}
                      </span>
                    </div>
                  )}

                  {/* Product Info */}
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-white mb-2">{listing.title}</h3>
                    <p className="text-gray-300 text-sm mb-2">{listing.description}</p>
                    <p className="text-xs text-gray-400">Seller: {listing.seller_username}</p>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-gray-700 rounded-lg p-2">
                      <div className="text-xs text-gray-400">Base Price</div>
                      <div className="text-lg font-bold text-white">{listing.base_price}</div>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-2">
                      <div className="text-xs text-gray-400">Prize Pool</div>
                      <div className="text-lg font-bold text-green-400">{listing.prize_pool.toFixed(0)}</div>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-2">
                      <div className="text-xs text-gray-400">Players</div>
                      <div className="text-lg font-bold text-blue-400">
                        <UserGroupIcon className="inline h-4 w-4 mr-1" />
                        {listing.participants_count}
                      </div>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-2">
                      <div className="text-xs text-gray-400">Game</div>
                      <div className="text-sm font-bold text-purple-400">{listing.game_type.replace('_', ' ')}</div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {listing.session_status !== 'completed' && (
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Progress</span>
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
                  {timeRemaining && listing.session_status === 'active' && (
                    <div className="mb-4 bg-orange-900/30 border border-orange-700 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-orange-300 font-bold text-sm">
                          <ClockIcon className="inline h-4 w-4 mr-1" />
                          Time Left:
                        </span>
                        <span className="text-orange-200 font-bold">{timeRemaining}</span>
                      </div>
                    </div>
                  )}

                  {/* Entry Amount Selector */}
                  {canJoin && globalLocation.isGamingAllowed && (
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
                  ) : canJoin ? (
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
                    <button
                      onClick={() => {
                        setSelectedListing(listing);
                        setCurrentView('game');
                      }}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg transition-colors"
                    >
                      🎮 Play Game
                    </button>
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
      </main>

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
    </div>
  );
}

