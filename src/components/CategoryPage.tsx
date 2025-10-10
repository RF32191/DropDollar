'use client';

import React, { useState } from 'react';
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

interface CategoryPageProps {
  categoryId: string;
  categoryIcon: React.ReactNode;
}

export default function CategoryPage({ categoryId, categoryIcon }: CategoryPageProps) {
  const [selectedDollars, setSelectedDollars] = useState<{ [key: string]: number }>({});
  const [isProcessingEntry, setIsProcessingEntry] = useState(false);
  const [entryResult, setEntryResult] = useState<{ success: boolean; message: string } | null>(null);
  
  // Mock token price for display
  const tokenPrice = 2.45;
  
  const category = categories.find(cat => cat.id === categoryId);
  const hotSaleProducts = getHotSaleProducts(categoryId);
  const regularProducts = getRegularProducts(categoryId);

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

  if (!category) {
    return <div>Category not found</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-3">
              <img src="/DropCoin.png" alt="DropDollar" className="h-8 w-8" />
              <span className="text-xl font-bold text-gray-900">DropDollar</span>
            </Link>
            <nav className="flex space-x-8">
              <Link href="/" className="text-gray-600 hover:text-gray-900">Home</Link>
              <Link href="/how-it-works" className="text-gray-600 hover:text-gray-900">How It Works</Link>
              <Link href="/games" className="text-gray-600 hover:text-gray-900">🎮 Games</Link>
              <Link href="/hot-sell" className="text-gray-600 hover:text-gray-900">🔥 Hot Sell</Link>
              <Link href="/listings" className="text-gray-600 hover:text-gray-900">Listings</Link>
              <Link href="/categories" className="text-purple-600 hover:text-purple-700 font-bold">Categories</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
          <Link href="/categories" className="hover:text-gray-900 flex items-center">
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Categories
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">{category.icon} {category.name}</span>
        </div>

        {/* Page Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="text-6xl">{categoryIcon}</div>
            <h1 className="text-4xl font-bold text-gray-900">{category.name}</h1>
          </div>
          <p className="text-xl text-gray-600">
            Discover amazing {category.name.toLowerCase()} - Enter games to win at fractional token prices!
          </p>
        </div>

        {/* Entry Result Notification */}
        {entryResult && (
          <div className={`max-w-2xl mx-auto mb-8 p-4 rounded-lg ${
            entryResult.success 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            <div className="flex items-center">
              <div className={`mr-3 ${entryResult.success ? 'text-green-600' : 'text-red-600'}`}>
                {entryResult.success ? '✅' : '❌'}
              </div>
              <div>{entryResult.message}</div>
            </div>
          </div>
        )}

        {/* Hot Sale Section */}
        {hotSaleProducts.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center space-x-3 mb-6">
              <FireIcon className="h-8 w-8 text-red-600" />
              <h2 className="text-3xl font-bold text-gray-900">🔥 Hot Sale - 24 Hour Timer Active!</h2>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <div className="flex items-start">
                <EyeSlashIcon className="h-6 w-6 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-red-800 mb-2">⏰ Active Gaming Competitions</h3>
                  <p className="text-red-700 text-sm">
                    These items have met their base price and are now in active 24-hour gaming competitions! 
                    Anyone can join to play the assigned skill game and compete for the prize.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {hotSaleProducts.map((product) => (
                <div key={product.id} className="bg-gradient-to-br from-red-50 to-orange-100 rounded-2xl p-6 border-2 border-red-200 shadow-lg hover:shadow-xl transition-all">
                  <div className="relative mb-4">
                    <div className="aspect-w-16 aspect-h-12 bg-gray-200 rounded-lg mb-3">
                      <div className="flex items-center justify-center text-gray-500 text-4xl">
                        {category.icon}
                      </div>
                    </div>
                    <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded-full text-xs font-bold">
                      🔥 HOT SALE
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 mb-2">{product.title}</h3>
                  <p className="text-sm text-gray-600 mb-4">{product.description}</p>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Base Price:</span>
                      <span className="font-bold text-gray-900">${product.basePrice.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Collected:</span>
                      <span className="font-bold text-green-600">${product.currentCollected.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Time Left:</span>
                      <span className="font-bold text-red-600">{product.timeRemaining}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Game Type:</span>
                      <span className="font-bold text-purple-600">Multi-Target</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Players:</span>
                      <span className="font-bold text-blue-600">{product.participantCount.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Dollar Amount Selector */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Entry Amount:</label>
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
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                    className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition-colors"
                  >
                    {isProcessingEntry ? '⏳ Processing...' : `🎮 Join Game Competition ($${selectedDollars[product.id] || 1})`}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Regular Listings Section */}
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-6">{category.icon} All {category.name} Listings</h2>
          
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <div className="flex items-start">
              <CurrencyDollarIcon className="h-6 w-6 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-blue-800 mb-2">💰 Building to Base Price</h3>
                <p className="text-blue-700 text-sm">
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
                <div key={product.id} className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg hover:shadow-xl transition-all">
                  <div className="aspect-w-16 aspect-h-12 bg-gray-200 rounded-lg mb-4">
                    <div className="flex items-center justify-center text-gray-500 text-4xl">
                      {category.icon}
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 mb-2">{product.title}</h3>
                  <p className="text-sm text-gray-600 mb-4">{product.description}</p>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Base Price:</span>
                      <span className="font-bold text-gray-900">${product.basePrice.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Collected:</span>
                      <span className="font-bold text-blue-600">${product.currentCollected.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Progress:</span>
                      <span className="font-bold text-gray-900">{progressPercentage.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Participants:</span>
                      <span className="font-bold text-green-600">{product.participantCount.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${progressPercentage}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-600 mt-1 text-center">
                      ${(product.basePrice - product.currentCollected).toLocaleString()} needed to start timer
                    </div>
                  </div>

                  {/* Dollar Amount Selector */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Entry Amount:</label>
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
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition-colors"
                  >
                    {isProcessingEntry ? '⏳ Processing...' : `🎯 Enter Competition ($${selectedDollars[product.id] || 1})`}
                  </button>
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
