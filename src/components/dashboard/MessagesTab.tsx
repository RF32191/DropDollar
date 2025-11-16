'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  EnvelopeIcon, 
  EnvelopeOpenIcon,
  TruckIcon,
  MapPinIcon,
  PhoneIcon,
  UserIcon
} from '@heroicons/react/24/outline';

interface MarketplaceMessage {
  id: string;
  listing_id: string;
  session_id: string;
  sender_id: string;
  sender_username: string;
  recipient_id: string;
  recipient_username: string;
  message_type: 'winner_claim' | 'address_provided' | 'seller_message' | 'general';
  message_content: string;
  shipping_address: {
    name?: string;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
    phone?: string;
  } | null;
  read_at: string | null;
  created_at: string;
}

interface MessagesByListing {
  listing_id: string;
  listing_title: string;
  messages: MarketplaceMessage[];
}

export default function MessagesTab() {
  const { user } = useAuth();
  const [messagesByListing, setMessagesByListing] = useState<MessagesByListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedListings, setExpandedListings] = useState<{ [key: string]: boolean }>({});
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  useEffect(() => {
    if (user && !hasLoadedOnce) {
      loadMessages();
    }
  }, [user, hasLoadedOnce]);

  const loadMessages = async () => {
    if (!user?.id) {
      console.log('No user ID, skipping message load');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      console.log('🔍 Loading messages for user:', user.id);

      // Get all listings where user is seller or winner
      const { data: listings, error: listingsError } = await supabase
        .from('marketplace_listings')
        .select(`
          id,
          title,
          seller_id,
          marketplace_sessions!inner (
            winner_user_id
          )
        `)
        .or(`seller_id.eq.${user.id},marketplace_sessions.winner_user_id.eq.${user.id}`);

      if (listingsError) {
        console.error('❌ Error loading listings:', listingsError);
        setMessagesByListing([]);
        setIsLoading(false);
        setHasLoadedOnce(true);
        return;
      }

      console.log('📋 Found listings:', listings?.length || 0);

      if (!listings || listings.length === 0) {
        console.log('ℹ️ No listings found for user');
        setMessagesByListing([]);
        setIsLoading(false);
        setHasLoadedOnce(true);
        return;
      }

      // Get messages for each listing
      const messagesPromises = listings.map(async (listing) => {
        const { data: messages, error: messagesError } = await supabase
          .rpc('get_listing_messages', { listing_id_param: listing.id });

        if (messagesError) {
          console.error(`❌ Error loading messages for listing ${listing.id}:`, messagesError);
          return null;
        }

        console.log(`📬 Listing "${listing.title}": ${messages?.length || 0} messages`);

        return {
          listing_id: listing.id,
          listing_title: listing.title,
          messages: messages || []
        };
      });

      const results = await Promise.all(messagesPromises);
      const validResults = results.filter(r => r !== null && r.messages.length > 0) as MessagesByListing[];
      
      console.log('✅ Total listings with messages:', validResults.length);
      setMessagesByListing(validResults);
    } catch (error) {
      console.error('❌ Error in loadMessages:', error);
      setMessagesByListing([]);
    } finally {
      setIsLoading(false);
      setHasLoadedOnce(true);
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      const { error } = await supabase.rpc('mark_message_read', {
        message_id_param: messageId
      });

      if (error) {
        console.error('Error marking message as read:', error);
      } else {
        // Reload messages to update read status
        loadMessages();
      }
    } catch (error) {
      console.error('Error in markAsRead:', error);
    }
  };

  const toggleListing = (listingId: string) => {
    setExpandedListings(prev => ({
      ...prev,
      [listingId]: !prev[listingId]
    }));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'address_provided':
        return <MapPinIcon className="w-5 h-5 text-green-500" />;
      case 'winner_claim':
        return <TruckIcon className="w-5 h-5 text-blue-500" />;
      default:
        return <EnvelopeIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const renderShippingAddress = (address: any) => {
    if (!address) return null;

    return (
      <div className="mt-3 p-4 bg-gradient-to-br from-green-900/30 to-blue-900/30 rounded-lg border border-green-500/30">
        <div className="flex items-center mb-2">
          <TruckIcon className="w-5 h-5 text-green-400 mr-2" />
          <h4 className="font-semibold text-green-400">Shipping Address</h4>
        </div>
        <div className="space-y-1 text-sm text-gray-300">
          {address.name && (
            <p className="flex items-center">
              <UserIcon className="w-4 h-4 mr-2 text-gray-400" />
              {address.name}
            </p>
          )}
          {address.address_line1 && <p className="ml-6">{address.address_line1}</p>}
          {address.address_line2 && <p className="ml-6">{address.address_line2}</p>}
          {(address.city || address.state || address.postal_code) && (
            <p className="ml-6">
              {address.city}{address.city && address.state ? ', ' : ''}{address.state} {address.postal_code}
            </p>
          )}
          {address.country && <p className="ml-6">{address.country}</p>}
          {address.phone && (
            <p className="flex items-center mt-2">
              <PhoneIcon className="w-4 h-4 mr-2 text-gray-400" />
              {address.phone}
            </p>
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (messagesByListing.length === 0) {
    return (
      <div className="text-center py-12">
        <EnvelopeIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">No Messages Yet</h3>
        <p className="text-gray-400">
          Messages from winners and sellers will appear here.
        </p>
      </div>
    );
  }

  const totalUnread = messagesByListing.reduce(
    (acc, listing) => acc + listing.messages.filter(m => !m.read_at && m.recipient_id === user?.id).length,
    0
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center">
          <EnvelopeIcon className="w-7 h-7 mr-2 text-blue-500" />
          Messages
        </h2>
        {totalUnread > 0 && (
          <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">
            {totalUnread} Unread
          </span>
        )}
      </div>

      <div className="space-y-4">
        {messagesByListing.map((listingGroup) => {
          const isExpanded = expandedListings[listingGroup.listing_id];
          const unreadCount = listingGroup.messages.filter(
            m => !m.read_at && m.recipient_id === user?.id
          ).length;

          return (
            <div
              key={listingGroup.listing_id}
              className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden"
            >
              {/* Listing Header */}
              <button
                onClick={() => toggleListing(listingGroup.listing_id)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <TruckIcon className="w-6 h-6 text-blue-500" />
                  <div className="text-left">
                    <h3 className="font-semibold text-white">{listingGroup.listing_title}</h3>
                    <p className="text-sm text-gray-400">
                      {listingGroup.messages.length} message{listingGroup.messages.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                  <span className="text-gray-400">{isExpanded ? '▼' : '▶'}</span>
                </div>
              </button>

              {/* Messages */}
              {isExpanded && (
                <div className="border-t border-white/10">
                  {listingGroup.messages.map((message) => {
                    const isUnread = !message.read_at && message.recipient_id === user?.id;
                    const isSender = message.sender_id === user?.id;

                    return (
                      <div
                        key={message.id}
                        className={`px-6 py-4 border-b border-white/5 ${
                          isUnread ? 'bg-blue-900/20' : ''
                        }`}
                        onClick={() => {
                          if (isUnread) markAsRead(message.id);
                        }}
                      >
                        <div className="flex items-start space-x-3">
                          {getMessageIcon(message.message_type)}
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-semibold text-white">
                                  {isSender ? 'You' : message.sender_username}
                                </span>
                                {isUnread && (
                                  <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded">
                                    NEW
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-gray-400">
                                {formatDate(message.created_at)}
                              </span>
                            </div>
                            <p className="text-gray-300 text-sm mb-2">{message.message_content}</p>
                            {message.shipping_address && renderShippingAddress(message.shipping_address)}
                          </div>
                          {isUnread ? (
                            <EnvelopeIcon className="w-5 h-5 text-blue-400" />
                          ) : (
                            <EnvelopeOpenIcon className="w-5 h-5 text-gray-600" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

