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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  useEffect(() => {
    checkAdminStatus();
    loadListings();
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) return;
    
    try {
      // Check if user is rf32191@gmail.com (master admin)
      const isMasterAdmin = user.email === 'rf32191@gmail.com' || user.email === 'rf32191@yahoo.com';
      
      if (isMasterAdmin) {
        setIsAdmin(true);
        return;
      }
      
      // Check database role for other admins
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
      setIsLoading(true);
      const { data, error } = await supabase
        .from('rp_shop_listings')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setListings(data || []);
    } catch (error) {
      console.error('Error loading listings:', error);
      alert('Error loading listings: ' + (error as any).message);
    } finally {
      setIsLoading(false);
    }
  };

  const uploadImageToSupabase = async (file: File): Promise<string | null> => {
    try {
      setIsUploadingImage(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `rp-shop/${user?.id}/${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { data, error } = await supabase.storage
        .from('marketplace-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('marketplace-images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error uploading image: ' + (error as any).message);
      return null;
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    setImageFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      let imageUrl = formData.image_url;

      // Upload image if a new file was selected
      if (imageFile) {
        const uploadedUrl = await uploadImageToSupabase(imageFile);
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        } else {
          alert('Failed to upload image. Please try again.');
          return;
        }
      }

      const listingData = {
        ...formData,
        image_url: imageUrl || null
      };

      if (editingListing) {
        // Update existing listing
        const { error } = await supabase
          .from('rp_shop_listings')
          .update({
            ...listingData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingListing.id);

        if (error) throw error;
      } else {
        // Create new listing
        const { error } = await supabase
          .from('rp_shop_listings')
          .insert({
            ...listingData,
            created_by: user.id
          });

        if (error) throw error;
      }

      setShowCreateModal(false);
      setEditingListing(null);
      resetForm();
      await loadListings();
      alert('Listing saved successfully!');
    } catch (error: any) {
      console.error('Error saving listing:', error);
      alert('Error saving listing: ' + (error.message || 'Please try again.'));
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
    setImageFile(null);
    setImagePreview(listing.image_url || null);
    setShowCreateModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this listing? This action cannot be undone.')) return;

    try {
      const { error } = await supabase
        .from('rp_shop_listings')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Delete error:', error);
        throw error;
      }

      // Remove from local state immediately for better UX
      setListings(prev => prev.filter(listing => listing.id !== id));
      
      // Reload to ensure consistency
      await loadListings();
      
      alert('Listing deleted successfully!');
    } catch (error: any) {
      console.error('Error deleting listing:', error);
      alert('Error deleting listing: ' + (error.message || 'Please try again.'));
      // Reload listings even on error to refresh state
      await loadListings();
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
    setImageFile(null);
    setImagePreview(null);
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
                  <label className="block text-white mb-2">Image</label>
                  <div className="space-y-2">
                    {/* Image Upload */}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700"
                    />
                    {isUploadingImage && (
                      <p className="text-yellow-400 text-sm">Uploading image...</p>
                    )}
                    
                    {/* Image Preview */}
                    {(imagePreview || formData.image_url) && (
                      <div className="mt-2">
                        <img
                          src={imagePreview || formData.image_url || ''}
                          alt="Preview"
                          className="w-full h-48 object-cover rounded-lg border border-gray-600"
                        />
                        {imageFile && (
                          <button
                            type="button"
                            onClick={() => {
                              setImageFile(null);
                              setImagePreview(formData.image_url || null);
                            }}
                            className="mt-2 text-sm text-red-400 hover:text-red-300"
                          >
                            Remove uploaded image
                          </button>
                        )}
                      </div>
                    )}
                    
                    {/* Or use URL */}
                    <div className="text-sm text-gray-400 mt-2">OR</div>
                    <input
                      type="url"
                      value={formData.image_url}
                      onChange={(e) => {
                        setFormData({ ...formData, image_url: e.target.value });
                        if (!imageFile) {
                          setImagePreview(e.target.value || null);
                        }
                      }}
                      className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg"
                      placeholder="Enter image URL instead..."
                      disabled={!!imageFile}
                    />
                  </div>
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

