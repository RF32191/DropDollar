'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import StripeConnect from './StripeConnect';
import Link from 'next/link';
import {
  BellIcon,
  ShoppingBagIcon,
  PlusIcon,
  BanknotesIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ClockIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

interface SellerNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  action_required: boolean;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
}

interface SellerListing {
  id: string;
  title: string;
  price: number;
  status: string;
  participants_count: number;
  max_participants: number;
  created_at: string;
}

export default function SellerDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'listings' | 'wallet' | 'notifications'>('overview');
  const [notifications, setNotifications] = useState<SellerNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [listings, setListings] = useState<SellerListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadSellerData();
    }
  }, [user]);

  const loadSellerData = async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      await Promise.all([
        loadNotifications(),
        loadListings(),
      ]);
    } catch (error) {
      console.error('Error loading seller data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadNotifications = async () => {
    try {
      const { data, error } = await supabase.rpc('get_seller_notifications', {
        p_unread_only: false
      });

      if (error) throw error;

      if (data) {
        setNotifications(data);
        setUnreadCount(data.filter((n: SellerNotification) => !n.is_read).length);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const loadListings = async () => {
    try {
      if (!user?.id) {
        console.log('No user ID found');
        return;
      }

      console.log('🔍 Loading listings for seller:', user.id);
      
      // Query marketplace_listings directly using user.id
      // (marketplace_listings.seller_id = users.id, not seller_profiles.id)
      const { data, error } = await supabase
        .from('marketplace_listings')
        .select('*')
        .eq('seller_id', user.id)
        .neq('status', 'deleted')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error loading listings:', error);
        throw error;
      }

      console.log('✅ Loaded listings:', data?.length || 0);
      
      if (data) {
        setListings(data);
      }
    } catch (error) {
      console.error('Error loading listings:', error);
    }
  };

  const markNotificationRead = async (notificationId: string) => {
    try {
      await supabase.rpc('mark_notification_read', {
        p_notification_id: notificationId
      });
      await loadNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await supabase.rpc('mark_all_notifications_read');
      await loadNotifications();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Don't show loading spinner - render dashboard skeleton instead to prevent flashing
  // if (isLoading) {
  //   return (
  //     <div className="flex flex-col items-center justify-center py-16 min-h-[400px]">
  //       <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mb-4"></div>
  //       <p className="text-gray-400 text-lg">Loading seller dashboard...</p>
  //     </div>
  //   );
  // }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">Seller Dashboard</h1>
        <p className="text-purple-100">Manage your listings, track sales, and grow your business</p>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Total Listings</p>
                <p className="text-3xl font-bold">{listings.length}</p>
              </div>
              <ShoppingBagIcon className="w-10 h-10 text-purple-200" />
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Active Listings</p>
                <p className="text-3xl font-bold">
                  {listings.filter(l => l.status === 'active').length}
                </p>
              </div>
              <ChartBarIcon className="w-10 h-10 text-purple-200" />
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Notifications</p>
                <p className="text-3xl font-bold">{unreadCount}</p>
              </div>
              <BellIcon className="w-10 h-10 text-purple-200" />
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">This Month</p>
                <p className="text-3xl font-bold">$0</p>
              </div>
              <BanknotesIcon className="w-10 h-10 text-purple-200" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-gray-700">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'overview'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('listings')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'listings'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          My Listings ({listings.length})
        </button>
        <button
          onClick={() => setActiveTab('wallet')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'wallet'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Wallet & Payouts
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`px-6 py-3 font-medium transition-colors relative ${
            activeTab === 'notifications'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Notifications
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                href="/sell"
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white p-6 rounded-xl shadow-lg transition-all transform hover:scale-105"
              >
                <PlusIcon className="w-8 h-8 mb-3" />
                <h3 className="text-xl font-bold">Create New Listing</h3>
                <p className="text-green-100 text-sm mt-1">List a new item for players to compete for</p>
              </Link>
              
              <button
                onClick={() => setActiveTab('wallet')}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white p-6 rounded-xl shadow-lg transition-all transform hover:scale-105 text-left"
              >
                <BanknotesIcon className="w-8 h-8 mb-3" />
                <h3 className="text-xl font-bold">Manage Wallet</h3>
                <p className="text-blue-100 text-sm mt-1">View earnings and request payouts</p>
              </button>
              
              <button
                onClick={() => setActiveTab('notifications')}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white p-6 rounded-xl shadow-lg transition-all transform hover:scale-105 text-left"
              >
                <BellIcon className="w-8 h-8 mb-3" />
                <h3 className="text-xl font-bold">Notifications</h3>
                <p className="text-purple-100 text-sm mt-1">
                  {unreadCount > 0 ? `${unreadCount} unread messages` : 'All caught up!'}
                </p>
              </button>
            </div>

            {/* Recent Activity */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h2 className="text-xl font-bold text-white mb-4">Recent Activity</h2>
              {listings.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <ShoppingBagIcon className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                  <p>No listings yet</p>
                  <Link
                    href="/sell"
                    className="text-blue-400 hover:text-blue-300 inline-block mt-2"
                  >
                    Create your first listing →
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {listings.slice(0, 5).map((listing) => (
                    <div
                      key={listing.id}
                      className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex-1">
                        <h3 className="text-white font-medium">{listing.title}</h3>
                        <p className="text-gray-400 text-sm">
                          ${listing.price} • {listing.status} • {listing.participants_count}/{listing.max_participants} players
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {listing.status === 'active' && (
                          <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">
                            Active
                          </span>
                        )}
                        {listing.status === 'completed' && (
                          <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-medium">
                            Completed
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'listings' && (
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">My Listings</h2>
              <Link
                href="/sell"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <PlusIcon className="w-5 h-5" />
                Create Listing
              </Link>
            </div>

            {listings.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <ShoppingBagIcon className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                <p className="text-lg mb-2">No listings yet</p>
                <p className="text-sm mb-4">Create your first listing to start selling</p>
                <Link
                  href="/sell"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium inline-block"
                >
                  Create Listing
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {listings.map((listing) => (
                  <div
                    key={listing.id}
                    className="bg-gray-700/50 rounded-lg p-4 hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-white font-bold text-lg">{listing.title}</h3>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span className="text-gray-400">Price: ${listing.price}</span>
                          <span className="text-gray-400">
                            Players: {listing.participants_count}/{listing.max_participants}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            listing.status === 'active' ? 'bg-green-500/20 text-green-400' :
                            listing.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {listing.status}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-400 text-xs">
                          {new Date(listing.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'wallet' && (
          <div>
            <StripeConnect />
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Notifications</h2>
              {unreadCount > 0 && (
                <button
                  onClick={markAllNotificationsRead}
                  className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                >
                  Mark all as read
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <BellIcon className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                <p>No notifications yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 rounded-lg border transition-colors ${
                      notification.is_read
                        ? 'bg-gray-700/30 border-gray-700'
                        : 'bg-blue-900/20 border-blue-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {notification.type === 'application_approved' && (
                            <CheckCircleIcon className="w-5 h-5 text-green-500" />
                          )}
                          {notification.type === 'application_rejected' && (
                            <ExclamationCircleIcon className="w-5 h-5 text-red-500" />
                          )}
                          {notification.type === 'warning' && (
                            <ExclamationCircleIcon className="w-5 h-5 text-yellow-500" />
                          )}
                          <h3 className="text-white font-semibold">{notification.title}</h3>
                        </div>
                        <p className="text-gray-300 text-sm">{notification.message}</p>
                        <p className="text-gray-500 text-xs mt-2">
                          {new Date(notification.created_at).toLocaleString()}
                        </p>
                      </div>
                      {!notification.is_read && (
                        <button
                          onClick={() => markNotificationRead(notification.id)}
                          className="text-blue-400 hover:text-blue-300 text-sm"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                    {notification.action_required && notification.action_url && (
                      <Link
                        href={notification.action_url}
                        className="mt-3 inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                      >
                        Take Action
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

