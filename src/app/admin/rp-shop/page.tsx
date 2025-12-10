'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import CleanNavigation from '@/components/navigation/CleanNavigation';
import Link from 'next/link';
import { ArrowLeftIcon, PlusIcon, PencilIcon, TrashIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface RPShopListing {
  id: string;
  title: string;
  description: string;
  rp_cost: number;
  item_type: string;
  item_value: number | null;
  image_url: string | null;
  is_active: boolean;
  stock_quantity: number | null;
  purchase_limit_per_user: number;
  sort_order: number;
  created_at: string;
}

export default function AdminRPShopPage() {
  const { user } = useAuth();
  const [listings, setListings] = useState<RPShopListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingListing, setEditingListing] = useState<RPShopListing | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    rp_cost: 100,
    item_type: 'cosmetic',
    item_value: null as number | null,
    image_url: '',
    is_active: true,
    stock_quantity: null as number | null,
    purchase_limit_per_user: 1,
    sort_order: 0
  });

  useEffect(() => {
    checkAdminStatus();
    loadListings();
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!error && data && data.role === 'admin') {
        setIsAdmin(true);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  const loadListings = async () => {
    try {
      const { data, error } = await supabase
        .from('rp_shop_listings')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setListings(data || []);
    } catch (error) {
      console.error('Error loading listings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (editingListing) {
        // Update existing listing
        const { error } = await supabase
          .from('rp_shop_listings')
          .update({
            ...formData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingListing.id);

        if (error) throw error;
      } else {
        // Create new listing
        const { error } = await supabase
          .from('rp_shop_listings')
          .insert({
            ...formData,
            created_by: user.id
          });

        if (error) throw error;
      }

      setShowCreateModal(false);
      setEditingListing(null);
      resetForm();
      loadListings();
    } catch (error) {
      console.error('Error saving listing:', error);
      alert('Error saving listing. Please try again.');
    }
  };

  const handleEdit = (listing: RPShopListing) => {
    setEditingListing(listing);
    setFormData({
      title: listing.title,
      description: listing.description,
      rp_cost: listing.rp_cost,
      item_type: listing.item_type,
      item_value: listing.item_value,
      image_url: listing.image_url || '',
      is_active: listing.is_active,
      stock_quantity: listing.stock_quantity,
      purchase_limit_per_user: listing.purchase_limit_per_user,
      sort_order: listing.sort_order
    });
    setShowCreateModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this listing?')) return;

    try {
      const { error } = await supabase
        .from('rp_shop_listings')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadListings();
    } catch (error) {
      console.error('Error deleting listing:', error);
      alert('Error deleting listing. Please try again.');
    }
  };

  const toggleActive = async (listing: RPShopListing) => {
    try {
      const { error } = await supabase
        .from('rp_shop_listings')
        .update({ is_active: !listing.is_active })
        .eq('id', listing.id);

      if (error) throw error;
      loadListings();
    } catch (error) {
      console.error('Error toggling listing status:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      rp_cost: 100,
      item_type: 'cosmetic',
      item_value: null,
      image_url: '',
      is_active: true,
      stock_quantity: null,
      purchase_limit_per_user: 1,
      sort_order: 0
    });
    setEditingListing(null);
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900">
        <CleanNavigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-white">
            <h1 className="text-3xl font-bold mb-4">Access Denied</h1>
            <p>You must be an admin to access this page.</p>
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
          <Link href="/admin/dashboard" className="inline-flex items-center text-purple-300 hover:text-white mb-4">
            <ArrowLeftIcon className="w-5 h-5 mr-2" />
            Back to Admin Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-black text-white mb-2">🛍️ RP Shop Management</h1>
              <p className="text-gray-300">Manage Reward Points shop listings</p>
            </div>
            <button
              onClick={() => {
                resetForm();
                setShowCreateModal(true);
              }}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg flex items-center gap-2 transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              Create Listing
            </button>
          </div>
        </div>

        {/* Listings Grid */}
        {isLoading ? (
          <div className="text-center text-white py-12">Loading listings...</div>
        ) : listings.length === 0 ? (
          <div className="text-center text-white py-12 bg-white/10 rounded-xl">
            <p className="text-xl mb-4">No listings yet</p>
            <p className="text-gray-300">Create your first RP shop listing!</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => (
              <div
                key={listing.id}
                className={`bg-white/10 backdrop-blur-xl rounded-xl p-6 border-2 ${
                  listing.is_active ? 'border-green-500/50' : 'border-gray-500/50'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">{listing.title}</h3>
                    <p className="text-gray-300 text-sm mb-2">{listing.description}</p>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-yellow-400 font-bold">{listing.rp_cost} RP</span>
                      <span className="text-gray-400 capitalize">{listing.item_type}</span>
                      {listing.item_value && (
                        <span className="text-green-400">Value: {listing.item_value}</span>
                      )}
                    </div>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${listing.is_active ? 'bg-green-500' : 'bg-gray-500'}`} />
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleEdit(listing)}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2"
                  >
                    <PencilIcon className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => toggleActive(listing)}
                    className={`flex-1 px-4 py-2 rounded-lg flex items-center justify-center gap-2 ${
                      listing.is_active
                        ? 'bg-yellow-600 hover:bg-yellow-700'
                        : 'bg-green-600 hover:bg-green-700'
                    } text-white`}
                  >
                    {listing.is_active ? (
                      <>
                        <XMarkIcon className="w-4 h-4" />
                        Deactivate
                      </>
                    ) : (
                      <>
                        <CheckIcon className="w-4 h-4" />
                        Activate
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(listing.id)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create/Edit Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-white mb-6">
                {editingListing ? 'Edit Listing' : 'Create New Listing'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-white mb-2">Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-white mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg"
                    rows={3}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white mb-2">RP Cost</label>
                    <input
                      type="number"
                      value={formData.rp_cost}
                      onChange={(e) => setFormData({ ...formData, rp_cost: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg"
                      min="1"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-white mb-2">Item Type</label>
                    <select
                      value={formData.item_type}
                      onChange={(e) => setFormData({ ...formData, item_type: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg"
                    >
                      <option value="cosmetic">Cosmetic</option>
                      <option value="boost">Boost</option>
                      <option value="badge">Badge</option>
                      <option value="token_bonus">Token Bonus</option>
                      <option value="special">Special</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white mb-2">Item Value (optional)</label>
                    <input
                      type="number"
                      value={formData.item_value || ''}
                      onChange={(e) => setFormData({ ...formData, item_value: e.target.value ? parseInt(e.target.value) : null })}
                      className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg"
                      placeholder="e.g., 50 for tokens"
                    />
                  </div>
                  <div>
                    <label className="block text-white mb-2">Sort Order</label>
                    <input
                      type="number"
                      value={formData.sort_order}
                      onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white mb-2">Stock Quantity (leave empty for unlimited)</label>
                    <input
                      type="number"
                      value={formData.stock_quantity || ''}
                      onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value ? parseInt(e.target.value) : null })}
                      className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-white mb-2">Purchase Limit Per User</label>
                    <input
                      type="number"
                      value={formData.purchase_limit_per_user}
                      onChange={(e) => setFormData({ ...formData, purchase_limit_per_user: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg"
                      min="1"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-white mb-2">Image URL (optional)</label>
                  <input
                    type="url"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg"
                    placeholder="https://..."
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label className="text-white">Active</label>
                </div>
                <div className="flex gap-4 mt-6">
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg"
                  >
                    {editingListing ? 'Update' : 'Create'} Listing
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    className="flex-1 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

