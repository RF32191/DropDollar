'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import CleanNavigation from '@/components/navigation/CleanNavigation';
import Link from 'next/link';
import { ShoppingBagIcon, SparklesIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
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

      if (listingsData.data) {
        setListings(listingsData.data);
      }
    } catch (error) {
      console.error('Error loading RP shop data:', error);
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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900">
        <CleanNavigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-white">
            <h1 className="text-3xl font-bold mb-4">Please Sign In</h1>
            <p className="text-gray-300 mb-6">You need to be signed in to access the RP Shop.</p>
            <Link href="/auth/login" className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg inline-block">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900">
      <CleanNavigation />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard" className="inline-flex items-center text-purple-300 hover:text-white mb-4">
            ← Back to Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-black text-white mb-2 flex items-center gap-3">
                <ShoppingBagIcon className="w-10 h-10 text-purple-400" />
                RP Shop
              </h1>
              <p className="text-gray-300">Spend your Reward Points on exclusive items!</p>
            </div>
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-6 text-center">
              <div className="text-sm text-purple-200 mb-1">Your Balance</div>
              <div className="text-3xl font-black text-white flex items-center gap-2">
                <SparklesIcon className="w-8 h-8" />
                {userRP.toLocaleString()} RP
              </div>
            </div>
          </div>
        </div>

        {/* Listings Grid */}
        {isLoading ? (
          <div className="text-center text-white py-12">Loading shop items...</div>
        ) : listings.length === 0 ? (
          <div className="text-center text-white py-12 bg-white/10 rounded-xl">
            <p className="text-xl mb-4">No items available</p>
            <p className="text-gray-300">Check back later for new items!</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => {
              const canPurchase = listing.can_purchase && 
                (listing.stock_remaining === null || listing.stock_remaining > 0) &&
                listing.purchase_count < listing.purchase_limit_per_user;
              
              return (
                <div
                  key={listing.id}
                  className={`bg-white/10 backdrop-blur-xl rounded-xl p-6 border-2 transition-all ${
                    canPurchase ? 'border-purple-500/50 hover:border-purple-400' : 'border-gray-500/30 opacity-75'
                  }`}
                >
                  {listing.image_url && (
                    <img
                      src={listing.image_url}
                      alt={listing.title}
                      className="w-full h-48 object-cover rounded-lg mb-4"
                    />
                  )}
                  <h3 className="text-xl font-bold text-white mb-2">{listing.title}</h3>
                  <p className="text-gray-300 text-sm mb-4">{listing.description}</p>
                  
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-2xl font-black text-yellow-400">
                      {listing.rp_cost} RP
                    </div>
                    <div className="text-sm text-gray-400 capitalize">
                      {listing.item_type}
                    </div>
                  </div>

                  {listing.item_value && (
                    <div className="bg-green-500/20 rounded-lg p-2 mb-4 text-center">
                      <div className="text-green-400 font-bold">+{listing.item_value}</div>
                      <div className="text-xs text-gray-300">
                        {listing.item_type === 'token_bonus' ? 'Tokens' : 'Value'}
                      </div>
                    </div>
                  )}

                  {listing.stock_remaining !== null && (
                    <div className="text-xs text-gray-400 mb-2">
                      Stock: {listing.stock_remaining} remaining
                    </div>
                  )}

                  {listing.purchase_limit_per_user > 1 && (
                    <div className="text-xs text-gray-400 mb-2">
                      Purchased: {listing.purchase_count} / {listing.purchase_limit_per_user}
                    </div>
                  )}

                  <button
                    onClick={() => handlePurchase(listing.id)}
                    disabled={!canPurchase || purchasing === listing.id}
                    className={`w-full py-3 rounded-lg font-bold transition-all ${
                      canPurchase && purchasing !== listing.id
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white'
                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {purchasing === listing.id ? (
                      'Processing...'
                    ) : !listing.can_purchase ? (
                      'Insufficient RP'
                    ) : listing.stock_remaining === 0 ? (
                      'Out of Stock'
                    ) : listing.purchase_count >= listing.purchase_limit_per_user ? (
                      'Purchase Limit Reached'
                    ) : (
                      <>
                        <CheckCircleIcon className="w-5 h-5 inline mr-2" />
                        Purchase
                      </>
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

