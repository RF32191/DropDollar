'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  FireIcon, 
  ClockIcon, 
  CurrencyDollarIcon, 
  TrophyIcon,
  StarIcon,
  EyeIcon,
  CursorArrowRaysIcon,
  SparklesIcon,
  PlusIcon,
  ShoppingBagIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  HomeIcon,
  BeakerIcon,
  MusicalNoteIcon
} from '@heroicons/react/24/outline';
import { ListingStorageService, type StoredListing } from '@/lib/listingStorage';

interface ExampleListing {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  gameType: string;
  icon: React.ComponentType<any>;
  color: string;
  isExample: boolean;
}

export default function ListingsPage() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [realListings, setRealListings] = useState<StoredListing[]>([]);
  const [showExamples, setShowExamples] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [totalListings, setTotalListings] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'price_low' | 'price_high' | 'popular'>('newest');
  const LISTINGS_PER_PAGE = 12;

  // Example listings for each category
  const exampleListings: ExampleListing[] = [
    {
      id: 'example-1',
      title: 'iPhone 15 Pro Max Gaming Challenge',
      description: 'Win the latest iPhone 15 Pro Max by mastering our Multi-Target Reaction game. Highest score wins!',
      category: 'electronics',
      price: 1200,
      gameType: 'multi-target',
      icon: DevicePhoneMobileIcon,
      color: 'from-blue-500 to-purple-600',
      isExample: true
    },
    {
      id: 'example-2',
      title: 'Designer Sneaker Collection',
      description: 'Limited edition Nike Air Jordan collection. Test your reflexes in our Falling Objects game to win!',
      category: 'fashion',
      price: 350,
      gameType: 'falling-objects',
      icon: ShoppingBagIcon,
      color: 'from-pink-500 to-red-600',
      isExample: true
    },
    {
      id: 'example-3',
      title: 'Gaming Setup Complete Bundle',
      description: 'High-end gaming PC, monitor, and accessories. Prove your memory skills in Color Sequence Memory!',
      category: 'electronics',
      price: 2500,
      gameType: 'color-sequence',
      icon: ComputerDesktopIcon,
      color: 'from-green-500 to-blue-600',
      isExample: true
    },
    {
      id: 'example-4',
      title: 'Smart Home Starter Kit',
      description: 'Complete smart home setup with voice control. Win through skill-based gaming competitions!',
      category: 'home',
      price: 800,
      gameType: 'multi-target',
      icon: HomeIcon,
      color: 'from-yellow-500 to-orange-600',
      isExample: true
    },
    {
      id: 'example-5',
      title: 'Vintage Vinyl Record Collection',
      description: 'Rare vinyl collection from the 80s and 90s. Show your gaming prowess to claim this prize!',
      category: 'collectibles',
      price: 450,
      gameType: 'color-sequence',
      icon: MusicalNoteIcon,
      color: 'from-purple-500 to-pink-600',
      isExample: true
    }
  ];

  const categories = [
    { id: 'all', name: 'All Categories', icon: StarIcon },
    { id: 'electronics', name: 'Electronics', icon: DevicePhoneMobileIcon },
    { id: 'fashion', name: 'Fashion', icon: ShoppingBagIcon },
    { id: 'home', name: 'Home & Garden', icon: HomeIcon },
    { id: 'collectibles', name: 'Collectibles', icon: BeakerIcon },
  ];

  // Load real listings with enhanced features
  useEffect(() => {
    const loadListings = async () => {
      try {
        setIsLoading(true);
        
        let result;
        if (searchQuery.trim()) {
          // Search listings
          result = ListingStorageService.searchListings(
            searchQuery, 
            selectedCategory, 
            currentPage, 
            LISTINGS_PER_PAGE
          );
        } else {
          // Get listings by category with filters
          result = ListingStorageService.getListingsByCategory(
            selectedCategory, 
            currentPage, 
            LISTINGS_PER_PAGE,
            {
              status: ['active', 'timer_active'],
              sortBy: sortBy
            }
          );
        }
        
        setRealListings(result.listings);
        setTotalListings(result.total);
        setHasMore(result.hasMore);
        setShowExamples(result.listings.length === 0 && currentPage === 0);
      } catch (error) {
        console.error('Error loading listings:', error);
        setRealListings([]);
        setShowExamples(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadListings();
  }, [selectedCategory, currentPage, searchQuery, sortBy]);

  // Reset page when category or search changes
  useEffect(() => {
    setCurrentPage(0);
  }, [selectedCategory, searchQuery]);

  // Listen for listing changes (deletions, updates)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'stored_listings') {
        // Reload listings when storage changes
        const loadListings = async () => {
          setIsLoading(true);
          try {
            let result;
            if (searchQuery) {
              result = ListingStorageService.searchListings(searchQuery, selectedCategory === 'all' ? undefined : selectedCategory, currentPage, LISTINGS_PER_PAGE);
            } else {
              result = ListingStorageService.getListingsByCategory(selectedCategory, currentPage, LISTINGS_PER_PAGE, { sortBy });
            }
            
            setRealListings(result.listings);
            setHasMore(result.hasMore);
            setTotalListings(result.total);
            setShowExamples(result.listings.length === 0);
          } catch (error) {
            console.error('Error loading listings:', error);
            setRealListings([]);
            setShowExamples(true);
          } finally {
            setIsLoading(false);
          }
        };

        loadListings();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [selectedCategory, currentPage, searchQuery, sortBy]);

  const filteredExampleListings = selectedCategory === 'all' 
    ? exampleListings 
    : exampleListings.filter(listing => listing.category === selectedCategory);

  const getGameEmoji = (gameType: string) => {
    const emojis: { [key: string]: string } = {
      'multi-target': '🎯',
      'falling-objects': '💼',
      'color-sequence': '🌈'
    };
    return emojis[gameType] || '🎮';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Simple Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <div className="w-10 h-10 mr-3">
                <img
                  src="/DropCoin.png"
                  alt="Dollar Drop Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white transition-colors">Dollar Drop</span>
            </Link>
                   <nav className="flex items-center space-x-6">
                     <Link href="/listings" className="text-gray-700 hover:text-green-600 font-medium">Browse</Link>
                     <Link href="/categories" className="text-gray-700 hover:text-green-600 font-medium">Categories</Link>
                     <Link href="/games" className="text-purple-600 hover:text-purple-700 font-bold">🎮 Games</Link>
                     <Link href="/hot-sell" className="text-red-600 hover:text-red-700 font-bold">🔥 Hot Sell</Link>
                     <Link href="/how-it-works" className="text-gray-700 hover:text-green-600 font-medium">How It Works</Link>
                     <Link href="/buy-tokens" className="text-green-600 hover:text-green-700 font-bold">💰 Buy Tokens</Link>
                     <div className="flex items-center space-x-3 ml-4 pl-4 border-l border-gray-200">
                       <Link href="/wallet" className="text-green-600 hover:text-green-700 font-bold">👛 Wallet</Link>
                       <Link href="/auth/login" className="text-gray-700 hover:text-green-600 font-medium">Sign In</Link>
                       <Link href="/auth/register" className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">Sign Up</Link>
                       <Link href="/seller/apply" className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">Sell</Link>
                     </div>
                   </nav>
          </div>
        </div>
      </header>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🛍️ Browse Listings
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Discover amazing products and compete in skill-based games to win them! 
            Each competition uses our fair gaming system.
          </p>
        </div>

        {/* Seller Call-to-Action Banner */}
        <div className="bg-gradient-to-r from-green-500 to-blue-600 rounded-2xl p-8 mb-12 text-white text-center shadow-xl">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">🚀 Want to List Your Products?</h2>
            <p className="text-xl mb-6 text-green-100">
              Join our marketplace and reach thousands of skilled gamers! 
              Create competitions for your products and boost engagement.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <div className="bg-white bg-opacity-20 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold">$10/day</div>
                <div className="text-sm">Premium Listing</div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold">3</div>
                <div className="text-sm">Game Types</div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold">1000+</div>
                <div className="text-sm">Daily Players</div>
              </div>
            </div>
            <div className="mt-6">
              <Link 
                href="/seller/apply" 
                className="bg-white text-green-600 hover:bg-gray-100 font-bold py-3 px-8 rounded-lg transition-colors inline-flex items-center"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Become a Seller
              </Link>
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="mb-8">
          <div className="flex flex-wrap justify-center gap-4">
            {categories.map((category) => {
              const IconComponent = category.icon;
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <IconComponent className="h-5 w-5 mr-2" />
                  {category.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search and Sort Controls */}
        <div className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search listings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <CursorArrowRaysIcon className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </div>

            {/* Sort */}
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
                <option value="popular">Most Popular</option>
              </select>
            </div>

            {/* Results Count */}
            <div className="text-sm text-gray-600">
              {isLoading ? (
                <span>Loading...</span>
              ) : (
                <span>
                  {totalListings > 0 ? (
                    <>Showing {realListings.length} of {totalListings} listings</>
                  ) : searchQuery ? (
                    <>No results for "{searchQuery}"</>
                  ) : (
                    <>No listings found</>
                  )}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading listings...</p>
            </div>
          </div>
        )}

        {/* Real Listings */}
        {!isLoading && realListings.length > 0 && (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">🎯 Active Competitions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {realListings.map((listing, index) => (
                  <div 
                    key={listing.id}
                    className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all border border-gray-200 overflow-hidden relative"
                  >
                    {/* Active Badge */}
                    <div className="absolute top-4 left-4 z-10">
                      <span className="bg-gradient-to-r from-green-400 to-blue-500 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center shadow-lg">
                        <StarIcon className="h-4 w-4 mr-1" />
                        ACTIVE
                      </span>
                    </div>
                    
                    <div className="relative">
                      {listing.images.length > 0 ? (
                        <img 
                          src={listing.images[0]} 
                          alt={listing.title}
                          className="w-full h-48 object-cover"
                        />
                      ) : (
                        <div className="h-48 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                          <div className="text-white text-center">
                            <TrophyIcon className="h-16 w-16 mx-auto mb-2" />
                            <div className="text-lg font-bold">{listing.title}</div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xl font-bold text-gray-900">{listing.title}</h3>
                      </div>
                      <p className="text-gray-600 mb-4 line-clamp-2">{listing.description}</p>
                      
                      <div className="space-y-3 mb-6">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">Prize Value:</span>
                          <span className="font-bold text-gray-900">${listing.basePrice.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">Entry Cost:</span>
                          <span className="font-bold text-green-600">$1-$3</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">Game Type:</span>
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium flex items-center">
                            <span className="mr-1">{getGameEmoji(listing.gameType)}</span>
                            {(() => {
                              const gameNames = {
                                'multi-target': 'Multi-Target',
                                'falling-objects': 'Falling Objects',
                                'color-sequence': 'Color Sequence'
                              };
                              return gameNames[listing.gameType as keyof typeof gameNames] || listing.gameType;
                            })()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">Available:</span>
                          <span className="font-medium text-gray-900">
                            {(listing.quantity - listing.quantitySold)} of {listing.quantity}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">Status:</span>
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-medium capitalize">
                            {listing.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">Seller:</span>
                          <span className="text-gray-700 font-medium">{listing.sellerName}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <Link
                          href={`/listings/${listing.id}`}
                          className="block w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-bold py-3 px-4 rounded-xl text-center transition-all transform hover:scale-105"
                        >
                          <TrophyIcon className="h-5 w-5 inline mr-2" />
                          Enter Competition
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Pagination */}
              {(hasMore || currentPage > 0) && (
                <div className="flex justify-center items-center space-x-4 mt-8">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                    disabled={currentPage === 0}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  
                  <span className="text-sm text-gray-600">
                    Page {currentPage + 1} {totalListings > 0 && `of ${Math.ceil(totalListings / LISTINGS_PER_PAGE)}`}
                  </span>
                  
                  <button
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    disabled={!hasMore}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* Example Listings */}
        {!isLoading && showExamples && (
          <>
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">📋 Example Listings</h2>
              <p className="text-gray-600 mb-6">
                These are example competitions to show how the platform works. 
                <Link href="/seller/apply" className="text-blue-600 hover:underline ml-1">
                  Create your own listing to get started!
                </Link>
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredExampleListings.map((listing, index) => {
            const IconComponent = listing.icon;
            
            return (
              <div 
                key={listing.id}
                className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all border border-gray-200 overflow-hidden relative"
              >
                {/* Example Badge */}
                <div className="absolute top-4 left-4 z-10">
                  <span className="bg-gradient-to-r from-blue-400 to-purple-500 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center shadow-lg">
                    <StarIcon className="h-4 w-4 mr-1" />
                    EXAMPLE
                  </span>
                </div>
                
                <div className="relative">
                  <div className={`h-48 bg-gradient-to-br ${listing.color} flex items-center justify-center`}>
                    <div className="text-white text-center">
                      <IconComponent className="h-16 w-16 mx-auto mb-2" />
                      <div className="text-lg font-bold">{listing.title}</div>
                    </div>
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-bold text-gray-900">{listing.title}</h3>
                  </div>
                  <p className="text-gray-600 mb-4 line-clamp-2">{listing.description}</p>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Prize Value:</span>
                      <span className="font-bold text-gray-900">${listing.price.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Entry Cost:</span>
                      <span className="font-bold text-green-600">$1-$3</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Game Type:</span>
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium flex items-center">
                        <span className="mr-1">{getGameEmoji(listing.gameType)}</span>
                        {(() => {
                          const gameNames = {
                            'multi-target': 'Multi-Target',
                            'falling-objects': 'Falling Objects',
                            'color-sequence': 'Color Sequence'
                          };
                          return gameNames[listing.gameType as keyof typeof gameNames] || listing.gameType;
                        })()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Category:</span>
                      <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm font-medium capitalize">
                        {listing.category}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <button
                      disabled
                      className="block w-full bg-gray-300 text-gray-500 font-bold py-3 px-4 rounded-xl text-center cursor-not-allowed"
                    >
                      <TrophyIcon className="h-5 w-5 inline mr-2" />
                      Example Listing
                    </button>
                    
                    <div className="text-center text-sm text-gray-500">
                      This is an example. <Link href="/seller/apply" className="text-blue-600 hover:underline">Create your own listing!</Link>
                    </div>
                  </div>
                </div>
              </div>
            );
              })}
            </div>
          </>
        )}

        {/* Call to Action */}
        <div className="mt-16 text-center">
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200 max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Ready to Create Your Own Listing?</h3>
            <p className="text-gray-600 mb-6">
              Join our marketplace and start selling your products through engaging skill-based competitions. 
              Reach thousands of active gamers and boost your sales!
            </p>
            <Link 
              href="/seller/apply" 
              className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-colors inline-flex items-center"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Start Selling Today
            </Link>
          </div>
        </div>
      </div>
      
      {/* Simple Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">© 2024 Dollar Drop - Skill-Based Gaming Marketplace</p>
          <div className="mt-4 flex justify-center space-x-6">
            <Link href="/how-it-works" className="text-gray-400 hover:text-white">How It Works</Link>
            <Link href="/games" className="text-gray-400 hover:text-white">Practice Games</Link>
            <Link href="/seller/apply" className="text-gray-400 hover:text-white">Become a Seller</Link>
            <Link href="/hot-sell" className="text-gray-400 hover:text-white">Tournaments</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}