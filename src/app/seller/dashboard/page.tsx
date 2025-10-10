'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  CurrencyDollarIcon,
  ClockIcon,
  UserGroupIcon,
  ChartBarIcon,
  ShoppingBagIcon,
  TagIcon,
  PhotoIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { ListingStorageService, type StoredListing } from '@/lib/listingStorage';
import { categories } from '@/data/categoryProducts';

interface ListingFormData {
  title: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  basePrice: number;
  gameType: string;
  sellerId: string;
  sellerName: string;
}

export default function SellerDashboard() {
  const router = useRouter();
  const [listings, setListings] = useState<StoredListing[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<ListingFormData>({
    title: '',
    description: '',
    price: 0,
    category: '',
    imageUrl: '',
    basePrice: 0,
    gameType: 'Multi-Target Reaction',
    sellerId: 'seller_001',
    sellerName: 'Demo Seller'
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [successMessage, setSuccessMessage] = useState('');

  // Game types available for listings
  const gameTypes = [
    'Multi-Target Reaction',
    'Falling Object Catch',
    'Color Sequence Memory',
    'Laser Dodge EXTREME',
    'Quick Click',
    'Sword Parry'
  ];

  useEffect(() => {
    loadListings();
  }, []);

  const loadListings = () => {
    try {
      const allListings = ListingStorageService.getAllListings();
      // Filter listings by current seller (in real app, this would be by authenticated user)
      const sellerListings = allListings.filter(listing => listing.sellerId === 'seller_001');
      setListings(sellerListings);
    } catch (error) {
      console.error('Error loading listings:', error);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.category) newErrors.category = 'Category is required';
    if (formData.price <= 0) newErrors.price = 'Price must be greater than 0';
    if (formData.basePrice <= 0) newErrors.basePrice = 'Base price must be greater than 0';
    if (!formData.imageUrl.trim()) newErrors.imageUrl = 'Image URL is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    setSuccessMessage('');

    try {
      // Save to localStorage and Supabase
      const createdListing = ListingStorageService.createListing({
        title: formData.title,
        description: formData.description,
        category: formData.category,
        price: formData.price,
        basePrice: formData.basePrice,
        gameType: formData.gameType,
        imageUrl: formData.imageUrl,
        sellerId: formData.sellerId,
        sellerName: formData.sellerName,
        sellerRating: 4.5,
        sellerTotalSales: 0,
        condition: 'new',
        tags: []
      });
      
      setSuccessMessage('Listing created successfully!');
      setShowCreateForm(false);
      setFormData({
        title: '',
        description: '',
        price: 0,
        category: '',
        imageUrl: '',
        basePrice: 0,
        gameType: 'Multi-Target Reaction',
        sellerId: 'seller_001',
        sellerName: 'Demo Seller'
      });
      
      // Reload listings
      loadListings();
      
    } catch (error) {
      console.error('Error creating listing:', error);
      setErrors({ submit: 'Failed to create listing. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteListing = (listingId: string) => {
    if (confirm('Are you sure you want to delete this listing?')) {
      try {
        ListingStorageService.deleteListing(listingId);
        loadListings();
        setSuccessMessage('Listing deleted successfully!');
      } catch (error) {
        console.error('Error deleting listing:', error);
      }
    }
  };

  const getCategoryIcon = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.icon || '📦';
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.name || 'Unknown';
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 shadow-2xl border-b-4 border-green-400/50">
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
                  💼 SELLER DASHBOARD
                </span>
              </div>
            </Link>

            {/* Navigation Links */}
            <nav className="hidden md:flex items-center space-x-6">
              <Link href="/listings" className="text-green-200 hover:text-white font-medium transition-colors">Browse</Link>
              <Link href="/categories" className="text-emerald-200 hover:text-white font-medium transition-colors">Categories</Link>
              <Link href="/games" className="text-teal-200 hover:text-white font-bold transition-colors">🎮 Games</Link>
              <Link href="/tournaments" className="text-yellow-200 hover:text-white font-bold transition-colors">🏆 Tournaments</Link>
              <Link href="/hot-sell" className="text-orange-200 hover:text-white font-bold transition-colors">🔥 Hot Sell</Link>
            </nav>

            {/* User Actions */}
            <div className="flex items-center space-x-2">
              <Link href="/dashboard" className="text-green-200 hover:text-white font-medium transition-colors">Dashboard</Link>
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white px-4 py-2 rounded-lg font-bold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 flex items-center space-x-2"
              >
                <PlusIcon className="h-5 w-5" />
                <span>New Listing</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Page Title */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-extrabold mb-6">
            <span className="bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500 bg-clip-text text-transparent animate-pulse">
              💼 Seller Dashboard
            </span>
          </h1>
          <div className="w-32 h-1 bg-gradient-to-r from-green-400 to-teal-500 mx-auto rounded-full animate-pulse mb-6"></div>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Manage your listings, track performance, and create new gaming competitions for your products!
          </p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="max-w-2xl mx-auto mb-8">
            <div className="bg-green-900/20 border border-green-700 text-green-300 border rounded-lg p-4">
              <div className="flex items-center">
                <CheckCircleIcon className="h-5 w-5 text-green-400 mr-3" />
                <div>{successMessage}</div>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center">
              <ShoppingBagIcon className="h-8 w-8 text-blue-400 mr-3" />
              <div>
                <p className="text-sm text-gray-400">Total Listings</p>
                <p className="text-2xl font-bold text-white">{listings.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center">
              <CurrencyDollarIcon className="h-8 w-8 text-green-400 mr-3" />
              <div>
                <p className="text-sm text-gray-400">Total Revenue</p>
                <p className="text-2xl font-bold text-white">${listings.reduce((sum, listing) => sum + listing.currentCollected, 0).toLocaleString()}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center">
              <UserGroupIcon className="h-8 w-8 text-purple-400 mr-3" />
              <div>
                <p className="text-sm text-gray-400">Total Participants</p>
                <p className="text-2xl font-bold text-white">{listings.reduce((sum, listing) => sum + listing.participantCount, 0).toLocaleString()}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center">
              <ChartBarIcon className="h-8 w-8 text-orange-400 mr-3" />
              <div>
                <p className="text-sm text-gray-400">Active Competitions</p>
                <p className="text-2xl font-bold text-white">{listings.filter(listing => listing.isHotSale).length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Create Listing Form */}
        {showCreateForm && (
          <div className="bg-gray-800 rounded-xl p-8 border border-gray-700 mb-12">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-white">Create New Listing</h2>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <ExclamationTriangleIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Product Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Enter product title"
                  />
                  {errors.title && <p className="mt-1 text-sm text-red-400">{errors.title}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Select a category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.icon} {category.name}
                      </option>
                    ))}
                  </select>
                  {errors.category && <p className="mt-1 text-sm text-red-400">{errors.category}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Product Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Describe your product in detail..."
                />
                {errors.description && <p className="mt-1 text-sm text-red-400">{errors.description}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Product Price *
                  </label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                  {errors.price && <p className="mt-1 text-sm text-red-400">{errors.price}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Base Price (Competition Goal) *
                  </label>
                  <input
                    type="number"
                    value={formData.basePrice}
                    onChange={(e) => handleInputChange('basePrice', parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                  {errors.basePrice && <p className="mt-1 text-sm text-red-400">{errors.basePrice}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Game Type *
                  </label>
                  <select
                    value={formData.gameType}
                    onChange={(e) => handleInputChange('gameType', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    {gameTypes.map((gameType) => (
                      <option key={gameType} value={gameType}>
                        {gameType}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Image URL *
                </label>
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => handleInputChange('imageUrl', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="https://example.com/image.jpg"
                />
                {errors.imageUrl && <p className="mt-1 text-sm text-red-400">{errors.imageUrl}</p>}
              </div>

              {errors.submit && (
                <div className="bg-red-900/20 border border-red-700 text-red-300 border rounded-lg p-4">
                  <div className="flex items-center">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-3" />
                    <div>{errors.submit}</div>
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-3 rounded-lg font-bold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Creating...' : 'Create Listing'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-bold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Listings Grid */}
        <div>
          <h2 className="text-3xl font-bold text-white mb-6">Your Listings</h2>
          
          {listings.length === 0 ? (
            <div className="text-center py-20 bg-gray-800 rounded-2xl border border-gray-700">
              <ShoppingBagIcon className="h-24 w-24 text-gray-400 mx-auto mb-6" />
              <h3 className="text-4xl font-bold text-white mb-4">No Listings Yet!</h3>
              <p className="text-xl text-gray-300 mb-8">
                Create your first listing to start selling and hosting gaming competitions.
              </p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 inline-flex items-center"
              >
                <PlusIcon className="h-6 w-6 mr-2" />
                Create Your First Listing
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map((listing) => (
                <div key={listing.id} className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-green-500 transition-colors">
                  <div className="aspect-w-16 aspect-h-12 bg-gray-700 rounded-lg mb-4">
                    <div className="flex items-center justify-center text-gray-400">
                      {getCategoryIcon(listing.category)} {listing.title}
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-bold text-white mb-2">{listing.title}</h3>
                  <p className="text-gray-300 mb-4 line-clamp-2">{listing.description}</p>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Category:</span>
                      <span className="font-bold text-green-400">{getCategoryName(listing.category)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Price:</span>
                      <span className="font-bold text-white">${listing.price}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Base Price:</span>
                      <span className="font-bold text-blue-400">${listing.basePrice}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Collected:</span>
                      <span className="font-bold text-green-400">${listing.currentCollected}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Participants:</span>
                      <span className="font-bold text-purple-400">{listing.participantCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Game:</span>
                      <span className="font-bold text-orange-400">{listing.gameType}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Link
                      href={`/categories/${listing.category}`}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg transition-colors text-center text-sm"
                    >
                      View Category
                    </Link>
                    <button
                      onClick={() => handleDeleteListing(listing.id)}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg transition-colors"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
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
              Professional seller dashboard with gaming competition integration
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