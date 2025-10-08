'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import PageLayout from '@/components/layout/PageLayout';
import GameCard from '@/components/ui/GameCard';
import { 
  ClockIcon, 
  FireIcon, 
  CurrencyDollarIcon, 
  UserGroupIcon,
  EyeSlashIcon,
  DevicePhoneMobileIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import { getCategoryProducts, getHotSaleProducts, getRegularProducts } from '@/data/categoryProducts';
import { ListingStorageService, type StoredListing } from '@/lib/listingStorage';

export default function ElectronicsPage() {
  const [selectedDollars, setSelectedDollars] = useState<{ [key: string]: number }>({});
  const [isProcessingEntry, setIsProcessingEntry] = useState(false);
  const [entryResult, setEntryResult] = useState<{ success: boolean; message: string } | null>(null);
  const [realListings, setRealListings] = useState<StoredListing[]>([]);
  
  // Mock token price for display
  const tokenPrice = 2.45;
  
  const hotSaleProducts = getHotSaleProducts('electronics');
  const regularProducts = getRegularProducts('electronics');

  // Load real electronics listings
  useEffect(() => {
    const listings = ListingStorageService.getListingsByCategory('electronics');
    setRealListings(listings);
  }, []);

  const handleGameEntry = async (productId: string) => {
    const dollarsToUse = selectedDollars[productId] || 1;
    
    setIsProcessingEntry(true);
    setEntryResult(null);

    try {
      // Calculate tokens needed
      const tokensNeeded = (dollarsToUse / tokenPrice).toFixed(4);
      console.log(`🪙 Processing game entry: ${productId} - $${dollarsToUse} (${tokensNeeded} tokens)`);
      
      // Mock processing delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const tokensUsed = (dollarsToUse / tokenPrice).toFixed(4);
      setEntryResult({
        success: true,
        message: `Successfully entered game for ${productId} with $${dollarsToUse} (${tokensUsed} tokens)!`
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

  return (
    <PageLayout
      title="ELECTRONICS"
      subtitle="Latest tech gadgets and electronic devices - Enter skill-based gaming competitions to win incredible prizes!"
      icon="📱"
      gradient="blue"
      className="py-16 bg-gray-50 dark:bg-gray-800 transition-colors"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300 mb-8 transition-colors">
          <Link href="/categories" className="hover:text-blue-600 dark:hover:text-blue-400 flex items-center transition-colors">
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Categories
          </Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-white font-medium">📱 Electronics</span>
        </div>

        {/* Entry Result Notification */}
        {entryResult && (
          <div className="max-w-2xl mx-auto mb-8">
            <GameCard className={`${
              entryResult.success 
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-800 dark:text-green-300' 
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-800 dark:text-red-300'
            } transition-colors`}>
              <div className="flex items-center">
                <div className={`mr-3 ${entryResult.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {entryResult.success ? '✅' : '❌'}
                </div>
                <div>{entryResult.message}</div>
              </div>
            </GameCard>
          </div>
        )}

        {/* Hot Sale Section */}
        {hotSaleProducts.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center space-x-3 mb-6">
              <FireIcon className="h-8 w-8 text-red-600 dark:text-red-400" />
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white transition-colors">🔥 Hot Sale - 24 Hour Timer Active!</h2>
            </div>
            
            <GameCard className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 mb-6 transition-colors">
              <div className="flex items-start">
                <EyeSlashIcon className="h-6 w-6 text-red-600 dark:text-red-400 mr-3 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-red-800 dark:text-red-300 mb-2 transition-colors">⏰ Active Gaming Competitions</h3>
                  <p className="text-red-700 dark:text-red-300 text-sm transition-colors">
                    These items have met their base price and are now in active 24-hour gaming competitions! 
                    Anyone can join to play the assigned skill game and compete for the prize.
                  </p>
                </div>
              </div>
            </GameCard>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {hotSaleProducts.map((product) => (
                <GameCard key={product.id} className="bg-gradient-to-br from-red-50 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30 border-2 border-red-200 dark:border-red-700 transition-colors" gradient>
                  <div className="relative mb-4">
                    <div className="aspect-w-16 aspect-h-12 bg-gray-200 dark:bg-gray-700 rounded-lg mb-3 transition-colors">
                      <div className="flex items-center justify-center text-gray-500 dark:text-gray-400 transition-colors">
                        📱 {product.title}
                      </div>
                    </div>
                    <div className="absolute top-2 right-2 bg-red-600 dark:bg-red-700 text-white px-2 py-1 rounded-full text-xs font-bold transition-colors">
                      🔥 HOT SALE
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 transition-colors">{product.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 transition-colors">{product.description}</p>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300 transition-colors">Base Price:</span>
                      <span className="font-bold text-gray-900 dark:text-white transition-colors">${product.basePrice.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300 transition-colors">Collected:</span>
                      <span className="font-bold text-green-600 dark:text-green-400 transition-colors">${product.currentCollected.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300 transition-colors">Time Left:</span>
                      <span className="font-bold text-red-600 dark:text-red-400 transition-colors">{product.timeRemaining}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300 transition-colors">Game Type:</span>
                      <span className="font-bold text-purple-600 dark:text-purple-400 transition-colors">Multi-Target</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300 transition-colors">Players:</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400 transition-colors">{product.participantCount.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Dollar Amount Selector */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">Entry Amount:</label>
                    <div className="flex space-x-2">
                      {[1, 2, 3].map(dollars => {
                        const tokensNeeded = (dollars / tokenPrice).toFixed(4);
                        return (
                          <button
                            key={dollars}
                            onClick={() => setSelectedDollars(prev => ({ ...prev, [product.id]: dollars }))}
                            className={`flex-1 py-2 px-3 rounded-lg font-medium transition-colors ${
                              (selectedDollars[product.id] || 1) === dollars
                                ? 'bg-red-600 dark:bg-red-700 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
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

                  <button 
                    onClick={() => handleGameEntry(product.id)}
                    disabled={isProcessingEntry}
                    className="w-full bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 disabled:bg-gray-400 dark:disabled:bg-gray-600 text-white font-bold py-3 rounded-lg transition-colors"
                  >
                    {isProcessingEntry ? '⏳ Processing...' : `🎮 Join Game Competition ($${selectedDollars[product.id] || 1})`}
                  </button>
                </GameCard>
              ))}
            </div>
          </div>
        )}

        {/* Regular Listings Section */}
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 transition-colors">📱 All Electronics Listings</h2>
          
          <GameCard className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 mb-6 transition-colors">
            <div className="flex items-start">
              <CurrencyDollarIcon className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-blue-800 dark:text-blue-300 mb-2 transition-colors">💰 Building to Base Price</h3>
                <p className="text-blue-700 dark:text-blue-300 text-sm transition-colors">
                  These listings are collecting entries toward their base price. Once the base price is met, 
                  a 24-hour timer starts and the gaming competition begins!
                </p>
              </div>
            </div>
          </GameCard>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {regularProducts.map((product) => {
              const progressPercentage = Math.min((product.currentCollected / product.basePrice) * 100, 100);
              
              return (
                <GameCard key={product.id} gradient>
                  <div className="aspect-w-16 aspect-h-12 bg-gray-200 dark:bg-gray-700 rounded-lg mb-4 transition-colors">
                    <div className="flex items-center justify-center text-gray-500 dark:text-gray-400 transition-colors">
                      📱 {product.title}
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 transition-colors">{product.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 transition-colors">{product.description}</p>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300 transition-colors">Base Price:</span>
                      <span className="font-bold text-gray-900 dark:text-white transition-colors">${product.basePrice.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300 transition-colors">Collected:</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400 transition-colors">${product.currentCollected.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300 transition-colors">Progress:</span>
                      <span className="font-bold text-gray-900 dark:text-white transition-colors">{progressPercentage.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300 transition-colors">Participants:</span>
                      <span className="font-bold text-green-600 dark:text-green-400 transition-colors">{product.participantCount.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 transition-colors">
                      <div 
                        className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${progressPercentage}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 text-center transition-colors">
                      ${(product.basePrice - product.currentCollected).toLocaleString()} needed to start timer
                    </div>
                  </div>

                  {/* Dollar Amount Selector */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">Entry Amount:</label>
                    <div className="flex space-x-2">
                      {[1, 2, 3].map(dollars => {
                        const tokensNeeded = (dollars / tokenPrice).toFixed(4);
                        return (
                          <button
                            key={dollars}
                            onClick={() => setSelectedDollars(prev => ({ ...prev, [product.id]: dollars }))}
                            className={`flex-1 py-2 px-3 rounded-lg font-medium transition-colors ${
                              (selectedDollars[product.id] || 1) === dollars
                                ? 'bg-blue-600 dark:bg-blue-700 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
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

                  <button 
                    onClick={() => handleGameEntry(product.id)}
                    disabled={isProcessingEntry}
                    className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-400 dark:disabled:bg-gray-600 text-white font-bold py-3 rounded-lg transition-colors"
                  >
                    {isProcessingEntry ? '⏳ Processing...' : `🎯 Enter Competition ($${selectedDollars[product.id] || 1})`}
                  </button>
                </GameCard>
              );
            })}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
