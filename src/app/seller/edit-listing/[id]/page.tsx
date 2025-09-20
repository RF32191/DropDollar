'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ListingStorageService, type StoredListing } from '@/lib/listingStorage';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { categories } from '@/data/categories';
import {
  PhotoIcon,
  CurrencyDollarIcon,
  ClockIcon,
  ArrowLeftIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import type { CreateListingForm } from '@/types';

export default function EditListingPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const [listing, setListing] = useState<StoredListing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof CreateListingForm, string>>>({});

  const [formData, setFormData] = useState<CreateListingForm>({
    title: '',
    description: '',
    categoryId: '',
    basePrice: 0,
    timerDuration: 60,
    images: []
  });

  useEffect(() => {
    if (!user) {
      router.push('/auth/login?message=Please login to edit listings');
      return;
    }

    loadListing();
  }, [user, router, params.id]);

  const loadListing = () => {
    const listingId = params.id as string;
    const foundListing = ListingStorageService.getListingById(listingId);
    
    if (!foundListing) {
      router.push('/seller/dashboard?error=Listing not found');
      return;
    }

    if (foundListing.sellerId !== user?.id) {
      router.push('/seller/dashboard?error=You can only edit your own listings');
      return;
    }

    setListing(foundListing);
    setFormData({
      title: foundListing.title,
      description: foundListing.description,
      categoryId: foundListing.categoryId,
      basePrice: foundListing.basePrice,
      timerDuration: foundListing.timerDuration,
      images: [] // We'll handle existing images separately
    });
    setIsLoading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name.includes('Price') || name === 'timerDuration' ? parseFloat(value) || 0 : value
    }));
    
    // Clear error when user starts typing
    if (errors[name as keyof CreateListingForm]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...files].slice(0, 5) // Max 5 images
      }));
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof CreateListingForm, string>> = {};

    if (!formData.title) newErrors.title = 'Title is required';
    if (!formData.description) newErrors.description = 'Description is required';
    if (!formData.categoryId) newErrors.categoryId = 'Category is required';
    if (formData.basePrice <= 0) newErrors.basePrice = 'Prize value must be greater than 0';
    if (formData.timerDuration < 15 || formData.timerDuration > 1440) {
      newErrors.timerDuration = 'Timer must be between 15 minutes and 24 hours';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !listing || !user) return;

    setIsSaving(true);
    try {
      // Convert new images to base64
      const imagePromises = formData.images.map(file => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      });

      const newImageBase64Array = await Promise.all(imagePromises);

      // Update the listing in storage
      const allListings = ListingStorageService.getAllListings();
      const listingIndex = allListings.findIndex(l => l.id === listing.id);
      
      if (listingIndex !== -1) {
        allListings[listingIndex] = {
          ...listing,
          title: formData.title,
          description: formData.description,
          categoryId: formData.categoryId,
          basePrice: formData.basePrice,
          timerDuration: formData.timerDuration,
          images: formData.images.length > 0 ? newImageBase64Array : listing.images // Keep existing images if no new ones
        };
        
        localStorage.setItem('stored_listings', JSON.stringify(allListings));
      }

      console.log('✅ Listing updated successfully:', listing.id);
      router.push('/seller/dashboard?updated=true');
    } catch (error) {
      console.error('Failed to update listing:', error);
      setErrors({ title: 'Failed to update listing. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading listing...</p>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Listing not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Edit Listing</h1>
          <p className="mt-2 text-gray-600">
            Update your listing details. Changes will be reflected immediately.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6 space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Listing Details</h2>
            
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Enter a clear, descriptive title"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                name="categoryId"
                value={formData.categoryId}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {errors.categoryId && <p className="mt-1 text-sm text-red-600">{errors.categoryId}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                placeholder="Describe your item in detail..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
            </div>

            {/* Current Images */}
            {listing.images.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Images
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  {listing.images.map((image, index) => (
                    <div key={index} className="relative">
                      <img
                        src={image}
                        alt={`Current ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New Images */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add New Images (Optional - Max 5)
              </label>
              
              {/* Image Upload Area */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                />
                <label htmlFor="image-upload" className="cursor-pointer">
                  <PhotoIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Click to upload new images</p>
                  <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF up to 10MB each</p>
                </label>
              </div>

              {/* New Image Preview */}
              {formData.images.length > 0 && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                  {formData.images.map((file, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`New ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Pricing & Timer */}
          <div className="bg-white shadow rounded-lg p-6 space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Pricing & Timer Settings</h2>
            
            {/* Prize Value */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prize Value (What Users Compete For) *
              </label>
              <div className="relative">
                <CurrencyDollarIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <input
                  type="number"
                  name="basePrice"
                  value={formData.basePrice || ''}
                  onChange={handleInputChange}
                  placeholder="0"
                  min="1"
                  step="0.01"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <p className="mt-1 text-sm text-gray-500">
                This is the value users will compete to win through skill-based games
              </p>
              {errors.basePrice && <p className="mt-1 text-sm text-red-600">{errors.basePrice}</p>}
            </div>

            {/* Timer Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Final Bidding Timer Duration *
              </label>
              <div className="relative">
                <ClockIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <select
                  name="timerDuration"
                  value={formData.timerDuration}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={120}>2 hours</option>
                  <option value={240}>4 hours</option>
                  <option value={480}>8 hours</option>
                  <option value={720}>12 hours</option>
                  <option value={1440}>24 hours</option>
                </select>
              </div>
              {errors.timerDuration && <p className="mt-1 text-sm text-red-600">{errors.timerDuration}</p>}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="h-5 w-5 mr-2" />
                  Update Listing
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <Footer />
    </div>
  );
}
