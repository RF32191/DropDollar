'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useGlobalLocation } from '@/hooks/useGlobalLocation';
import { useInactivityTimeout } from '@/hooks/useInactivityTimeout';
import { 
  ClockIcon, 
  FireIcon, 
  CurrencyDollarIcon, 
  UserGroupIcon,
  EyeSlashIcon,
  ArrowLeftIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { getCategoryProducts, getHotSaleProducts, getRegularProducts, categories } from '@/data/categoryProducts';
import { ListingStorageService, type StoredListing } from '@/lib/listingStorage';

interface CategoryPageProps {
  categoryId: string;
  categoryIcon: React.ReactNode;
}

export default function CategoryPage({ categoryId, categoryIcon }: CategoryPageProps) {
  const [selectedDollars, setSelectedDollars] = useState<{ [key: string]: number }>({});
  const [isProcessingEntry, setIsProcessingEntry] = useState(false);
  const [entryResult, setEntryResult] = useState<{ success: boolean; message: string } | null>(null);
  const [realListings, setRealListings] = useState<StoredListing[]>([]);
  const globalLocation = useGlobalLocation();
  
  // 10-minute inactivity timeout
  useInactivityTimeout({
    timeout: 10 * 60 * 1000, // 10 minutes
    onTimeout: () => {
      console.log('🕐 Category page timeout - reloading for fresh content');
      window.location.reload();
    },
    enabled: true
  });
  
  // Mock token price for display
  const tokenPrice = 2.45;
  
  const category = categories.find(cat => cat.id === categoryId);
  const hotSaleProducts = getHotSaleProducts(categoryId);
  const regularProducts = getRegularProducts(categoryId);

  // Load real listings for this category
  useEffect(() => {
    const listings = ListingStorageService.getListingsByCategory(categoryId);
    setRealListings(listings);
  }, [categoryId]);

  const handleGameEntry = async (productId: string) => {
    const dollarsToUse = selectedDollars[productId] || 1;
    
    setIsProcessingEntry(true);
    setEntryResult(null);

    try {
      // Check location verification using global location system
      if (globalLocation.status !== 'granted' || !globalLocation.isGamingAllowed) {
        setEntryResult({
          success: false,
          message: 'Location verification required. Please enable location to participate in competitions.'
        });
        return;
      }

      // Calculate tokens needed
      const tokensNeeded = (dollarsToUse / tokenPrice).toFixed(4);
      console.log(`🪙 Processing game entry: ${productId} - $${dollarsToUse} (${tokensNeeded} tokens)`);
      
      // Mock processing delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const tokensUsed = (dollarsToUse / tokenPrice).toFixed(4);
      setEntryResult({
        success: true,
        message: `Successfully entered game for ${productId} with $${dollarsToUse} (${tokensUsed} tokens)! Location verified: ${globalLocation.data?.city}, ${globalLocation.data?.state}`
      });
      
    } catch (error) {
      console.error('Game entry error:', error);
      setEntryResult({
        success: false,
        message: 'Entry failed. Please try again.'
      });
    } finally {
      setIsProcessingEntry(false);
    }
  };

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
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 shadow-2xl border-b-4 border-blue-400/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo Section */}
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

            {/* Navigation Links */}
            <nav className="hidden md:flex items-center space-x-6">
              <Link href="/listings" className="text-blue-200 hover:text-white font-medium transition-colors">Browse</Link>
              <Link href="/categories" className="text-purple-200 hover:text-white font-medium transition-colors">Categories</Link>
              <Link href="/games" className="text-pink-200 hover:text-white font-bold transition-colors">🎮 Games</Link>
              <Link href="/tournaments" className="text-yellow-200 hover:text-white font-bold transition-colors">🏆 Tournaments</Link>
              <Link href="/hot-sell" className="text-orange-200 hover:text-white font-bold transition-colors">🔥 Hot Sell</Link>
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
            Discover amazing {category.name.toLowerCase()} items and compete in skill-based gaming competitions to win incredible prizes!
          </p>
        </div>

        {/* Entry Result Notification */}
        {entryResult && (
          <div className="max-w-2xl mx-auto mb-8">
            <div className={`${
              entryResult.success 
                ? 'bg-green-900/20 border-green-700 text-green-300' 
                : 'bg-red-900/20 border-red-700 text-red-300'
            } border rounded-lg p-4`}>
              <div className="flex items-center">
                <div className={`mr-3 ${entryResult.success ? 'text-green-400' : 'text-red-400'}`}>
                  {entryResult.success ? '✅' : '❌'}
                </div>
                <div>{entryResult.message}</div>
              </div>
            </div>
          </div>
        )}

        {/* Real Listings Section */}
        {realListings.length > 0 && (
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-white mb-6">🔥 Live Listings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {realListings.map((listing) => (
                <div key={listing.id} className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-blue-500 transition-colors">
                  <div className="aspect-w-16 aspect-h-12 bg-gray-700 rounded-lg mb-4">
                    <div className="flex items-center justify-center text-gray-400">
                      {categoryIcon} {listing.title}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{listing.title}</h3>
                  <p className="text-gray-300 mb-4">{listing.description}</p>
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Price:</span>
                      <span className="font-bold text-white">${listing.price}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Category:</span>
                      <span className="font-bold text-blue-400">{listing.category}</span>
                    </div>
                  </div>
                  <Link 
                    href={`/listings/${listing.id}`}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors text-center block"
                  >
                    View Listing
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hot Sale Section */}
        {hotSaleProducts.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center space-x-3 mb-6">
              <FireIcon className="h-8 w-8 text-red-500" />
              <h2 className="text-3xl font-bold text-white">🔥 Hot Sale - 24 Hour Timer Active!</h2>
            </div>
            
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-6 mb-6">
              <div className="flex items-start">
                <EyeSlashIcon className="h-6 w-6 text-red-400 mr-3 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-red-300 mb-2">⏰ Active Gaming Competitions</h3>
                  <p className="text-red-200 text-sm">
                    These items have met their base price and are now in active 24-hour gaming competitions! 
                    Anyone can join to play the assigned skill game and compete for the prize.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {hotSaleProducts.map((product) => (
                <div key={product.id} className="bg-gradient-to-br from-red-900/30 to-orange-900/30 border-2 border-red-700 rounded-xl p-6">
                  <div className="relative mb-4">
                    <div className="aspect-w-16 aspect-h-12 bg-gray-700 rounded-lg mb-3">
                      <div className="flex items-center justify-center text-gray-400">
                        {categoryIcon} {product.title}
                      </div>
                    </div>
                    <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded-full text-xs font-bold">
                      🔥 HOT SALE
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-2">{product.title}</h3>
                  <p className="text-sm text-gray-300 mb-4">{product.description}</p>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Base Price:</span>
                      <span className="font-bold text-white">${product.basePrice.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Collected:</span>
                      <span className="font-bold text-green-400">${product.currentCollected.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Time Left:</span>
                      <span className="font-bold text-red-400">{product.timeRemaining}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Players:</span>
                      <span className="font-bold text-blue-400">{product.participantCount.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Dollar Amount Selector */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Entry Amount:</label>
                    <div className="flex space-x-2">
                      {[1, 2, 3].map(dollars => {
                        const tokensNeeded = (dollars / tokenPrice).toFixed(4);
                        return (
                          <button
                            key={dollars}
                            onClick={() => setSelectedDollars(prev => ({ ...prev, [product.id]: dollars }))}
                            className={`flex-1 py-2 px-3 rounded-lg font-medium transition-colors ${
                              (selectedDollars[product.id] || 1) === dollars
                                ? 'bg-red-600 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            <div className="text-center">
                              <div>${dollars}</div>
                              <div className="text-xs opacity-75">
                                {tokensNeeded} tokens
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {globalLocation.status === 'granted' && globalLocation.isGamingAllowed ? (
                    <button 
                      onClick={() => handleGameEntry(product.id)}
                      disabled={isProcessingEntry}
                      className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition-colors"
                    >
                      {isProcessingEntry ? '⏳ Processing...' : `🎮 Join Game Competition ($${selectedDollars[product.id] || 1})`}
                    </button>
                  ) : globalLocation.status === 'restricted' ? (
                    <div className="w-full py-3 px-4 rounded-lg bg-red-700 border border-red-600 text-center">
                      <div className="text-red-300 text-sm mb-2">
                        <ShieldCheckIcon className="h-5 w-5 inline mr-2" />
                        Gaming Not Allowed in Your Location
                      </div>
                      <div className="text-red-200 text-xs">
                        Skill-based gaming is restricted in your state
                      </div>
                    </div>
                  ) : (
                    <div className="w-full py-3 px-4 rounded-lg bg-gray-700 border border-gray-600 text-center">
                      <div className="text-gray-400 text-sm mb-2">
                        <ShieldCheckIcon className="h-5 w-5 inline mr-2" />
                        Location Verification Required
                      </div>
                      <button 
                        onClick={() => globalLocation.requestLocation()}
                        className="text-blue-400 hover:text-blue-300 font-medium text-sm"
                      >
                        Enable Location to Enter Competition
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Regular Listings Section */}
        <div>
          <h2 className="text-3xl font-bold text-white mb-6">{categoryIcon} All {category.name} Listings</h2>
          
          <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-6 mb-6">
            <div className="flex items-start">
              <CurrencyDollarIcon className="h-6 w-6 text-blue-400 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-blue-300 mb-2">💰 Building to Base Price</h3>
                <p className="text-blue-200 text-sm">
                  These listings are collecting entries toward their base price. Once the base price is met, 
                  a 24-hour timer starts and the gaming competition begins!
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {regularProducts.map((product) => {
              const progressPercentage = Math.min((product.currentCollected / product.basePrice) * 100, 100);
              
              return (
                <div key={product.id} className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-blue-500 transition-colors">
                  <div className="aspect-w-16 aspect-h-12 bg-gray-700 rounded-lg mb-4">
                    <div className="flex items-center justify-center text-gray-400">
                      {categoryIcon} {product.title}
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-2">{product.title}</h3>
                  <p className="text-sm text-gray-300 mb-4">{product.description}</p>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Base Price:</span>
                      <span className="font-bold text-white">${product.basePrice.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Collected:</span>
                      <span className="font-bold text-blue-400">${product.currentCollected.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Progress:</span>
                      <span className="font-bold text-white">{progressPercentage.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Participants:</span>
                      <span className="font-bold text-green-400">{product.participantCount.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${progressPercentage}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-400 mt-1 text-center">
                      ${(product.basePrice - product.currentCollected).toLocaleString()} needed to start timer
                    </div>
                  </div>

                  {/* Dollar Amount Selector */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Entry Amount:</label>
                    <div className="flex space-x-2">
                      {[1, 2, 3].map(dollars => {
                        const tokensNeeded = (dollars / tokenPrice).toFixed(4);
                        return (
                          <button
                            key={dollars}
                            onClick={() => setSelectedDollars(prev => ({ ...prev, [product.id]: dollars }))}
                            className={`flex-1 py-2 px-3 rounded-lg font-medium transition-colors ${
                              (selectedDollars[product.id] || 1) === dollars
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            <div className="text-center">
                              <div>${dollars}</div>
                              <div className="text-xs opacity-75">
                                {tokensNeeded} tokens
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {globalLocation.status === 'granted' && globalLocation.isGamingAllowed ? (
                    <button 
                      onClick={() => handleGameEntry(product.id)}
                      disabled={isProcessingEntry}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition-colors"
                    >
                      {isProcessingEntry ? '⏳ Processing...' : `🎯 Enter Competition ($${selectedDollars[product.id] || 1})`}
                    </button>
                  ) : globalLocation.status === 'restricted' ? (
                    <div className="w-full py-3 px-4 rounded-lg bg-red-700 border border-red-600 text-center">
                      <div className="text-red-300 text-sm mb-2">
                        <ShieldCheckIcon className="h-5 w-5 inline mr-2" />
                        Gaming Not Allowed in Your Location
                      </div>
                      <div className="text-red-200 text-xs">
                        Skill-based gaming is restricted in your state
                      </div>
                    </div>
                  ) : (
                    <div className="w-full py-3 px-4 rounded-lg bg-gray-700 border border-gray-600 text-center">
                      <div className="text-gray-400 text-sm mb-2">
                        <ShieldCheckIcon className="h-5 w-5 inline mr-2" />
                        Location Verification Required
                      </div>
                      <button 
                        onClick={() => globalLocation.requestLocation()}
                        className="text-blue-400 hover:text-blue-300 font-medium text-sm"
                      >
                        Enable Location to Enter Competition
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <img src="/DropCoin.png" alt="DropDollar" className="h-8 w-8" />
              <span className="text-xl font-bold">DropDollar</span>
            </div>
            <p className="text-gray-400 mb-4">
              Revolutionary gaming marketplace with fractional token technology
            </p>
            <div className="flex justify-center space-x-6 text-sm text-gray-400">
              <Link href="/how-it-works" className="hover:text-white">How It Works</Link>
              <Link href="/games" className="hover:text-white">Games</Link>
              <Link href="/categories" className="hover:text-white">Categories</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}