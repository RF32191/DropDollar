'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import CleanNavigation from '@/components/navigation/CleanNavigation';
import Link from 'next/link';
import { ShoppingBagIcon, SparklesIcon, CheckCircleIcon, StarIcon } from '@heroicons/react/24/outline';
import { XPService } from '@/lib/supabase/xpService';

interface RPShopListing {
  id: string;
  title: string;
  description: string;
  rp_cost: number;
  item_type: string;
  item_value: number | null;
  image_url: string | null;
  can_purchase: boolean;
  purchase_count: number;
  stock_remaining: number | null;
  purchase_limit_per_user: number;
}

export default function RPShopPage() {
  const { user, isAuthenticated } = useAuth();
  const [listings, setListings] = useState<RPShopListing[]>([]);
  const [userRP, setUserRP] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadData();
    }
  }, [isAuthenticated, user]);

  // Generate animated floating coins/particles
  useEffect(() => {
    const particlesContainer = document.getElementById('rp-shop-particles');
    if (!particlesContainer) return;

    const particleCount = 40;
    const particles: HTMLDivElement[] = [];

    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'rp-shop-particle';
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.top = `${Math.random() * 100}%`;
      particle.style.animationDelay = `${Math.random() * 8}s`;
      particle.style.animationDuration = `${12 + Math.random() * 15}s`;
      particlesContainer.appendChild(particle);
      particles.push(particle);
    }

    return () => {
      particles.forEach(p => p.remove());
    };
  }, []);

  const loadData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const [xpData, listingsData] = await Promise.all([
        XPService.getUserXP(user.id),
        supabase.rpc('get_rp_shop_listings', { p_user_id: user.id })
      ]);

      if (xpData) {
        setUserRP(xpData.reward_points);
      }

      if (listingsData.error) {
        console.error('Error loading listings:', listingsData.error);
        alert('Error loading shop items: ' + listingsData.error.message);
      }

      if (listingsData.data) {
        console.log('Loaded listings:', listingsData.data);
        setListings(listingsData.data);
      } else {
        console.log('No listings data returned');
        setListings([]);
      }
    } catch (error: any) {
      console.error('Error loading RP shop data:', error);
      alert('Error loading shop: ' + (error.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchase = async (listingId: string) => {
    if (!user) return;
    
    setPurchasing(listingId);
    try {
      const { data, error } = await supabase.rpc('purchase_rp_shop_item', {
        p_user_id: user.id,
        p_listing_id: listingId
      });

      if (error) throw error;

      if (data?.success) {
        alert(`Successfully purchased ${listings.find(l => l.id === listingId)?.title}!`);
        loadData(); // Reload to update RP balance and listings
      } else {
        alert(data?.error || 'Purchase failed');
      }
    } catch (error: any) {
      console.error('Error purchasing item:', error);
      alert(error.message || 'Purchase failed. Please try again.');
    } finally {
      setPurchasing(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-cyan-900 relative overflow-hidden">
        {/* Animated background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-1/2 right-1/4 w-80 h-80 bg-cyan-500/25 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute bottom-1/4 left-1/2 w-72 h-72 bg-indigo-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>
        <CleanNavigation />
        <div className="container mx-auto px-4 py-8 relative z-10">
          <div className="text-center text-white">
            <h1 className="text-3xl font-bold mb-4">Please Sign In</h1>
            <p className="text-gray-300 mb-6">You need to be signed in to access the RP Shop.</p>
            <Link href="/auth/login" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg inline-block transition-all hover:scale-105">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 via-indigo-900 to-cyan-900 relative overflow-hidden">
      {/* Animated gradient background layers - Blue/Cyan theme */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Base gradient layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/80 via-indigo-900/60 to-cyan-900/80"></div>
        
        {/* Animated glowing orbs - Blue/Cyan theme */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-500/40 to-cyan-500/40 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 right-1/4 w-80 h-80 bg-gradient-to-r from-cyan-500/35 to-teal-500/35 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-1/4 left-1/2 w-72 h-72 bg-gradient-to-r from-indigo-500/40 to-blue-500/40 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/3 right-1/3 w-64 h-64 bg-gradient-to-r from-teal-500/30 to-cyan-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }}></div>
        <div className="absolute bottom-1/3 left-1/6 w-88 h-88 bg-gradient-to-r from-blue-500/35 to-indigo-500/35 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }}></div>
        
        {/* Floating coin particles */}
        <div id="rp-shop-particles" className="absolute inset-0"></div>
      </div>

      <CleanNavigation currentPage="/rp-shop" />
      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Header with animated glow */}
        <div className="mb-8 relative">
          <Link href="/rewards" className="inline-flex items-center text-blue-300 hover:text-white mb-4 transition-all hover:scale-105">
            ← Back to Rewards
          </Link>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 mb-2 flex items-center gap-3">
                <ShoppingBagIcon className="w-12 h-12 text-cyan-400 animate-bounce" />
                RP Shop
              </h1>
              <p className="text-blue-200 text-lg">Spend your Reward Points on exclusive items!</p>
            </div>
            <div className="bg-gradient-to-r from-blue-600/40 via-cyan-600/40 to-indigo-600/40 backdrop-blur-xl rounded-2xl p-6 text-center border-2 border-cyan-400/50 shadow-2xl hover:scale-105 transition-all">
              <div className="text-sm text-blue-200 mb-1 font-bold">Your Balance</div>
              <div className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 flex items-center justify-center gap-2">
                <SparklesIcon className="w-10 h-10 text-cyan-400 animate-spin-slow" />
                {userRP.toLocaleString()} RP
              </div>
            </div>
          </div>
        </div>

        {/* Listings Grid */}
        {isLoading ? (
          <div className="text-center text-white py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
            <p className="mt-4 text-blue-200">Loading shop items...</p>
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center text-white py-12 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl border-2 border-blue-400/30">
            <StarIcon className="w-16 h-16 mx-auto mb-4 text-blue-400 animate-pulse" />
            <p className="text-xl mb-4 font-bold">No items available</p>
            <p className="text-blue-200">Check back later for new items!</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing, index) => {
              const canPurchase = listing.can_purchase && 
                (listing.stock_remaining === null || listing.stock_remaining > 0) &&
                listing.purchase_count < listing.purchase_limit_per_user;
              
              return (
                <div
                  key={listing.id}
                  className={`bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-xl rounded-2xl p-6 border-2 transition-all hover:scale-105 shadow-xl relative overflow-hidden group ${
                    canPurchase ? 'border-cyan-400/50 hover:border-cyan-300 hover:shadow-2xl' : 'border-gray-500/30 opacity-75'
                  }`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {/* Animated border glow */}
                  <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl ${
                    canPurchase ? 'bg-gradient-to-r from-cyan-500/50 via-blue-500/50 to-cyan-500/50' : ''
                  }`}></div>
                  
                  {/* Sparkle effects */}
                  {canPurchase && (
                    <>
                      <div className="absolute top-4 right-4 w-2 h-2 bg-cyan-400 rounded-full animate-ping"></div>
                      <div className="absolute top-8 right-12 w-1.5 h-1.5 bg-blue-400 rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
                    </>
                  )}
                  
                  {listing.image_url && (
                    <div className="relative mb-4 rounded-xl overflow-hidden border-2 border-white/20">
                      <img
                        src={listing.image_url}
                        alt={listing.title}
                        className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                    </div>
                  )}
                  
                  <h3 className="text-2xl font-black text-white mb-2 relative z-10">{listing.title}</h3>
                  <p className="text-blue-200 text-sm mb-4 relative z-10">{listing.description}</p>
                  
                  <div className="flex items-center justify-between mb-4 relative z-10">
                    <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                      {listing.rp_cost} RP
                    </div>
                    <div className="text-sm text-blue-300 capitalize font-bold bg-blue-500/20 px-3 py-1 rounded-full">
                      {listing.item_type}
                    </div>
                  </div>

                  {listing.item_value && (
                    <div className="bg-gradient-to-r from-green-500/30 to-emerald-500/30 backdrop-blur-xl rounded-xl p-3 mb-4 text-center border border-green-400/30 relative z-10">
                      <div className="text-green-400 font-black text-xl">+{listing.item_value}</div>
                      <div className="text-xs text-green-200">
                        {listing.item_type === 'token_bonus' ? 'Tokens' : 'Value'}
                      </div>
                    </div>
                  )}

                  {listing.stock_remaining !== null && (
                    <div className="text-xs text-blue-300 mb-2 relative z-10 font-bold">
                      Stock: {listing.stock_remaining} remaining
                    </div>
                  )}

                  {listing.purchase_limit_per_user > 1 && (
                    <div className="text-xs text-blue-300 mb-2 relative z-10 font-bold">
                      Purchased: {listing.purchase_count} / {listing.purchase_limit_per_user}
                    </div>
                  )}

                  <button
                    onClick={() => handlePurchase(listing.id)}
                    disabled={!canPurchase || purchasing === listing.id}
                    className={`w-full py-4 rounded-xl font-black text-lg transition-all relative overflow-hidden group ${
                      canPurchase && purchasing !== listing.id
                        ? 'bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-700 hover:via-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-2xl'
                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                    {purchasing === listing.id ? (
                      <span className="relative z-10 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                        Processing...
                      </span>
                    ) : !listing.can_purchase ? (
                      <span className="relative z-10">Insufficient RP</span>
                    ) : listing.stock_remaining === 0 ? (
                      <span className="relative z-10">Out of Stock</span>
                    ) : listing.purchase_count >= listing.purchase_limit_per_user ? (
                      <span className="relative z-10">Purchase Limit Reached</span>
                    ) : (
                      <span className="relative z-10 flex items-center justify-center">
                        <CheckCircleIcon className="w-6 h-6 mr-2" />
                        Purchase
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
