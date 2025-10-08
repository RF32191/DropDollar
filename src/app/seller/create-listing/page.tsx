'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import {
  PhotoIcon,
  CurrencyDollarIcon,
  ClockIcon,
  InformationCircleIcon,
  CreditCardIcon
} from '@heroicons/react/24/outline';
import { categories } from '@/data/categories';
import { PLATFORM_CONFIG, formatCurrency } from '@/utils/financial';
import { ListingStorageService } from '@/lib/listingStorage';
import { ListingManagementService } from '@/lib/listingManagement';
import type { CreateListingForm } from '@/types';

// Available games for listings
const AVAILABLE_GAMES = [
  {
    id: 'multi-target',
    name: 'Multi-Target Reaction',
    description: 'Click the correct highlighted target among multiple shapes',
    difficulty: 'Easy',
    avgTime: '60s',
    skills: ['Visual Processing', 'Speed', 'Accuracy']
  },
  {
    id: 'falling-objects',
    name: 'Falling Object Catch',
    description: 'Catch objects with realistic physics and bouncing',
    difficulty: 'Medium',
    avgTime: '60s',
    skills: ['Coordination', 'Physics', 'Prediction']
  },
  {
    id: 'color-sequence',
    name: 'Color Sequence Memory',
    description: 'Remember color sequences with unique audio cues',
    difficulty: 'Medium',
    avgTime: '60s',
    skills: ['Audio-Visual Memory', 'Sequential Processing', 'Multi-Sensory']
  }
];

export default function CreateListingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  
  const [formData, setFormData] = useState<CreateListingForm>({
    title: '',
    description: '',
    categoryId: '',
    basePrice: 0,
    timerDuration: 60, // Default 1 hour
    gameType: 'multi-target', // Default to first game
    quantity: 1, // Default to 1 item
    images: []
  });

  const [errors, setErrors] = useState<Partial<Record<keyof CreateListingForm, string>>>({});

  // Check if user is authenticated and is a seller
  useEffect(() => {
    if (!user) {
      router.push('/auth/login?message=Please login to create listings');
      return;
    }
  }, [user, router]);

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

  const validateStep = (step: number): boolean => {
    const newErrors: Partial<Record<keyof CreateListingForm, string>> = {};

    if (step === 1) {
      if (!formData.title) newErrors.title = 'Title is required';
      if (!formData.description) newErrors.description = 'Description is required';
      if (!formData.categoryId) newErrors.categoryId = 'Category is required';
    }

    if (step === 2) {
      if (formData.basePrice <= 0) newErrors.basePrice = 'Base price must be greater than 0';
      if (formData.timerDuration < 15 || formData.timerDuration > 1440) {
        newErrors.timerDuration = 'Timer must be between 15 minutes and 24 hours';
      }
      if (!formData.gameType) newErrors.gameType = 'Game type is required';
      if (formData.quantity < 1 || formData.quantity > 1000) {
        newErrors.quantity = 'Quantity must be between 1 and 1000';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(currentStep) || !user) return;

    setIsSubmitting(true);
    try {
      // Get category name
      const selectedCategory = categories.find(cat => cat.id === formData.categoryId);
      const categoryName = selectedCategory?.name || 'Unknown';

      // Create the listing
      const newListing = await ListingStorageService.createListing({
        title: formData.title,
        description: formData.description,
        categoryId: formData.categoryId,
        categoryName: categoryName,
        basePrice: formData.basePrice,
        timerDuration: formData.timerDuration,
        gameType: formData.gameType,
        quantity: formData.quantity,
        images: formData.images,
        sellerId: user.id,
        sellerName: `${user.firstName} ${user.lastName}`
      });

      // Initialize listing management (for timer logic)
      ListingManagementService.initializeListing(
        newListing.id,
        formData.basePrice,
        formData.timerDuration
      );

      console.log('✅ Listing created successfully:', newListing.id);
      
      router.push(`/seller/dashboard?created=true&listingId=${newListing.id}`);
    } catch (error) {
      console.error('Failed to create listing:', error);
      setErrors({ title: 'Failed to create listing. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCategory = categories.find(c => c.id === formData.categoryId);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create New Listing</h1>
          <p className="mt-2 text-gray-600">
            List your item on DropDollar - <strong>Every DropDollars the Price!</strong>
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`
                  flex items-center justify-center w-8 h-8 rounded-full border-2
                  ${currentStep >= step 
                    ? 'bg-primary-600 border-primary-600 text-white' 
                    : 'border-gray-300 text-gray-500'
                  }
                `}>
                  {step}
                </div>
                {step < 3 && (
                  <div className={`
                    w-16 h-0.5 
                    ${currentStep > step ? 'bg-primary-600' : 'bg-gray-300'}
                  `} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-sm">
            <span className={currentStep >= 1 ? 'text-primary-600' : 'text-gray-500'}>
              Item Details
            </span>
            <span className={currentStep >= 2 ? 'text-primary-600' : 'text-gray-500'}>
              Pricing & Timer
            </span>
            <span className={currentStep >= 3 ? 'text-primary-600' : 'text-gray-500'}>
              Review & Pay
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Item Details */}
          {currentStep === 1 && (
            <div className="bg-white shadow rounded-lg p-6 space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Item Details</h2>
              
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Item Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Enter a clear, descriptive title"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
              </div>

              {/* Images */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Images (Optional - Max 5)
                </label>
                
                {/* Image Upload Area */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-400 transition-colors">
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
                    <p className="text-gray-600">Click to upload or drag and drop</p>
                    <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF up to 10MB each</p>
                  </label>
                </div>

                {/* Image Preview */}
                {formData.images.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                    {formData.images.map((file, index) => (
                      <div key={index} className="relative">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Preview ${index + 1}`}
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

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={nextStep}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Next: Pricing
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Pricing & Timer */}
          {currentStep === 2 && (
            <div className="bg-white shadow rounded-lg p-6 space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Pricing & Timer Settings</h2>
              
              {/* DropDollar Explanation */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="text-sm">
                    <h4 className="font-semibold text-blue-800 mb-1">
                      How Gaming Competitions Work
                    </h4>
                    <p className="text-blue-700">
                      Set your base price - this is what users compete to win! When someone reaches this price through gaming competitions, the timer starts for final bidding.
                    </p>
                  </div>
                </div>
              </div>

              {/* Base Price */}
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
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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

              {/* Game Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Competition Game Type *
                </label>
                <select
                  name="gameType"
                  value={formData.gameType}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  {AVAILABLE_GAMES.map((game) => (
                    <option key={game.id} value={game.id}>
                      {game.name} - {game.difficulty} ({game.avgTime})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-sm text-gray-500">
                  Choose which game users will play to compete for your prize
                </p>
                {errors.gameType && <p className="mt-1 text-sm text-red-600">{errors.gameType}</p>}
                
                {/* Game Details */}
                {formData.gameType && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    {(() => {
                      const selectedGame = AVAILABLE_GAMES.find(g => g.id === formData.gameType);
                      return selectedGame ? (
                        <div>
                          <h5 className="font-semibold text-blue-800 mb-1">{selectedGame.name}</h5>
                          <p className="text-sm text-blue-700 mb-2">{selectedGame.description}</p>
                          <div className="flex flex-wrap gap-1">
                            {selectedGame.skills.map((skill, index) => (
                              <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity Available *
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity || ''}
                  onChange={handleInputChange}
                  placeholder="1"
                  min="1"
                  max="1000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <p className="mt-1 text-sm text-gray-500">
                  How many of this item are available? Each sale creates a new competition.
                </p>
                {errors.quantity && <p className="mt-1 text-sm text-red-600">{errors.quantity}</p>}
              </div>

              {/* Competition Preview */}
              {formData.basePrice > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Competition Preview</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Prize Value:</span>
                      <span className="font-medium text-green-600">${formData.basePrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Entry Cost:</span>
                      <span className="font-medium">$1-$3 per game</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Timer Duration:</span>
                      <span className="font-medium">{formData.timerDuration} minutes</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Game Type:</span>
                      <span className="font-medium">{AVAILABLE_GAMES.find(g => g.id === formData.gameType)?.name || 'Not selected'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Quantity Available:</span>
                      <span className="font-medium">{formData.quantity} item{formData.quantity !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={prevStep}
                  className="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={nextStep}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Next: Review
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Review & Payment */}
          {currentStep === 3 && (
            <div className="space-y-6">
              {/* Listing Fee Notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-start space-x-3">
                  <CreditCardIcon className="h-6 w-6 text-blue-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-blue-800 mb-2">Listing Fee Required</h3>
                    <p className="text-blue-700 mb-3">
                      To create your listing, a one-time fee of <strong>{formatCurrency(PLATFORM_CONFIG.LISTING_FEE_AMOUNT, 'usd')}</strong> is required. 
                      This fee covers your listing for <strong>{PLATFORM_CONFIG.LISTING_FEE_PERIOD_MONTHS} months</strong>.
                    </p>
                    <div className="text-sm text-blue-600 space-y-1">
                      <p>• Your listing will be active immediately after payment</p>
                      <p>• Fee automatically renews every 4 months</p>
                      <p>• You'll receive email reminders before renewal</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Review Summary */}
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Review Your Listing</h2>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-gray-900">{formData.title}</h3>
                    <p className="text-gray-600">{selectedCategory?.name}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Base Price:</span>
                      <p className="font-semibold text-lg">{formatCurrency(formData.basePrice, 'usd')}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Target Price:</span>
                      <p className="font-semibold text-lg">{formatCurrency(formData.targetPrice, 'usd')}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Timer:</span>
                      <p className="font-semibold text-lg">
                        {formData.timerDuration >= 60 
                          ? `${Math.floor(formData.timerDuration / 60)}h`
                          : `${formData.timerDuration}m`
                        }
                      </p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <p className="text-gray-700">{formData.description}</p>
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={prevStep}
                  className="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                  {isSubmitting ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating Listing...
                    </div>
                  ) : (
                    `Create Listing - Pay ${formatCurrency(PLATFORM_CONFIG.LISTING_FEE_AMOUNT, 'usd')}`
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
      
      <Footer />
    </div>
  );
}
