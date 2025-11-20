'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { 
  TrashIcon,
  ShoppingBagIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  FunnelIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface AdminListing {
  listing_id: string;
  seller_username: string;
  seller_email: string;
  title: string;
  category: string;
  base_price: number;
  game_type: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  winner_username: string | null;
  winner_score: number | null;
  participants_count: number;
  tracking_number: string | null;
  shipping_status: string | null;
  funds_released: boolean;
}

export default function ListingManagementPanel() {
  const [listings, setListings] = useState<AdminListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'pending'>('all');
  const [deleteReason, setDeleteReason] = useState<{ [key: string]: string }>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState<AdminListing | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadListings();
  }, [filter]);

  const loadListings = async () => {
    try {
      setIsLoading(true);
      setMessage(null);

      const { data, error } = await supabase.rpc('admin_get_all_listings', {
        p_status_filter: filter
      });

      if (error) throw error;

      setListings(data || []);
    } catch (error: any) {
      console.error('Error loading listings:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to load listings' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = (listing: AdminListing) => {
    setSelectedListing(listing);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedListing) return;

    try {
      setDeletingId(selectedListing.listing_id);
      setMessage(null);

      const { data, error } = await supabase.rpc('admin_delete_listing', {
        p_listing_id: selectedListing.listing_id,
        p_reason: deleteReason[selectedListing.listing_id] || null
      });

      if (error) throw error;

      setMessage({ 
        type: 'success', 
        text: `Listing "${selectedListing.title}" deleted successfully. Seller notified.` 
      });

      // Reset and reload
      setShowDeleteModal(false);
      setSelectedListing(null);
      setDeleteReason({});
      await loadListings();
    } catch (error: any) {
      console.error('Error deleting listing:', error);
      setMessage({ 
        type: 'error', 
        text: error.message || 'Failed to delete listing' 
      });
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-900/20 text-green-400 border-green-700';
      case 'active':
        return 'bg-blue-900/20 text-blue-400 border-blue-700';
      case 'pending':
        return 'bg-yellow-900/20 text-yellow-400 border-yellow-700';
      default:
        return 'bg-gray-900/20 text-gray-400 border-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-4 h-4" />;
      case 'active':
        return <ArrowPathIcon className="w-4 h-4 animate-spin" />;
      case 'pending':
        return <ExclamationCircleIcon className="w-4 h-4" />;
      default:
        return <ShoppingBagIcon className="w-4 h-4" />;
    }
  };

  const filteredListings = listings;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <ArrowPathIcon className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center">
            <ShoppingBagIcon className="w-8 h-8 mr-3 text-blue-500" />
            Listing Management
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            View and manage all marketplace listings
          </p>
        </div>
        <button
          onClick={loadListings}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center"
        >
          <ArrowPathIcon className="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`rounded-lg p-4 ${
          message.type === 'success' 
            ? 'bg-green-900/20 border border-green-500/30' 
            : 'bg-red-900/20 border border-red-500/30'
        }`}>
          <p className={`text-sm ${
            message.type === 'success' ? 'text-green-400' : 'text-red-400'
          }`}>
            {message.text}
          </p>
        </div>
      )}

      {/* Filter Buttons */}
      <div className="flex gap-2 flex-wrap">
        {[
          { value: 'all', label: 'All Listings' },
          { value: 'completed', label: 'Completed' },
          { value: 'active', label: 'Active' },
          { value: 'pending', label: 'Pending' },
        ].map((btn) => (
          <button
            key={btn.value}
            onClick={() => setFilter(btn.value as any)}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
              filter === btn.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            <FunnelIcon className="w-4 h-4" />
            {btn.label}
          </button>
        ))}
      </div>

      {/* Listings Table */}
      {filteredListings.length === 0 ? (
        <div className="bg-gray-800 rounded-xl p-12 border border-gray-700 text-center">
          <ShoppingBagIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No listings found</p>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900/50 border-b border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Listing
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Seller
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Winner
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Shipping
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredListings.map((listing) => (
                  <tr key={listing.listing_id} className="hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-4">
                      <div>
                        <p className="text-white font-medium">{listing.title}</p>
                        <p className="text-xs text-gray-400">
                          {listing.category} • {listing.game_type}
                        </p>
                        <p className="text-xs text-gray-500">${listing.base_price.toFixed(2)}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <p className="text-white text-sm">{listing.seller_username}</p>
                        <p className="text-xs text-gray-500">{listing.seller_email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-medium ${getStatusColor(listing.status)}`}>
                        {getStatusIcon(listing.status)}
                        {listing.status}
                      </div>
                      {listing.participants_count > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          {listing.participants_count} participant{listing.participants_count !== 1 ? 's' : ''}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {listing.winner_username ? (
                        <div>
                          <p className="text-white text-sm">🏆 {listing.winner_username}</p>
                          {listing.winner_score && (
                            <p className="text-xs text-gray-500">Score: {listing.winner_score}</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">-</p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {listing.tracking_number ? (
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <CheckCircleIcon className="w-4 h-4 text-green-500" />
                            <span className="text-xs text-green-400">Shipped</span>
                          </div>
                          <p className="text-xs text-gray-500 font-mono">{listing.tracking_number.substring(0, 12)}...</p>
                          {listing.funds_released && (
                            <p className="text-xs text-green-500 mt-1">💰 Funds Released</p>
                          )}
                        </div>
                      ) : listing.status === 'completed' ? (
                        <div className="flex items-center gap-1">
                          <ExclamationCircleIcon className="w-4 h-4 text-yellow-500" />
                          <span className="text-xs text-yellow-400">Not Shipped</span>
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">-</p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-white text-sm">{new Date(listing.created_at).toLocaleDateString()}</p>
                      {listing.completed_at && (
                        <p className="text-xs text-gray-500">
                          Completed: {new Date(listing.completed_at).toLocaleDateString()}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        onClick={() => handleDeleteClick(listing)}
                        disabled={deletingId === listing.listing_id}
                        className="bg-red-600/20 hover:bg-red-600/30 text-red-400 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 ml-auto"
                      >
                        <TrashIcon className="w-4 h-4" />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 rounded-xl shadow-2xl max-w-lg w-full border-2 border-red-500/30">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="bg-red-600 p-3 rounded-lg">
                  <TrashIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Delete Listing</h2>
                  <p className="text-sm text-gray-400">This action cannot be undone</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedListing(null);
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Listing Details */}
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <h3 className="text-white font-semibold mb-2">Listing Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Title:</span>
                    <span className="text-white font-medium">{selectedListing.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Seller:</span>
                    <span className="text-white font-medium">{selectedListing.seller_username}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status:</span>
                    <span className={`font-medium ${
                      selectedListing.status === 'completed' ? 'text-green-400' :
                      selectedListing.status === 'active' ? 'text-blue-400' :
                      'text-yellow-400'
                    }`}>
                      {selectedListing.status}
                    </span>
                  </div>
                  {selectedListing.participants_count > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Participants:</span>
                      <span className="text-white font-medium">{selectedListing.participants_count}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Reason Input */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Reason for Deletion (Optional)
                </label>
                <textarea
                  value={deleteReason[selectedListing.listing_id] || ''}
                  onChange={(e) => setDeleteReason({ ...deleteReason, [selectedListing.listing_id]: e.target.value })}
                  placeholder="Enter reason for deleting this listing..."
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  The seller will be notified about this deletion.
                </p>
              </div>

              {/* Warning */}
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                <div className="flex items-start">
                  <ExclamationCircleIcon className="w-5 h-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-red-300">
                    <p className="font-semibold mb-1">⚠️ Warning</p>
                    <ul className="list-disc list-inside space-y-1 text-red-200/80">
                      <li>This listing will be permanently deleted</li>
                      <li>The seller will receive a notification</li>
                      <li>Any active session will be cancelled</li>
                      <li>This action will be logged in the audit trail</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 p-6 border-t border-gray-700">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedListing(null);
                }}
                disabled={!!deletingId}
                className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={!!deletingId}
                className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {deletingId ? (
                  <>
                    <ArrowPathIcon className="w-5 h-5 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <TrashIcon className="w-5 h-5 mr-2" />
                    Delete Listing
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

