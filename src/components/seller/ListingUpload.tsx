'use client';

import React, { useState, useRef } from 'react';
import { 
  PhotoIcon, 
  XMarkIcon,
  StarIcon,
  CurrencyDollarIcon,
  TagIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  ArrowUpTrayIcon
} from '@heroicons/react/24/outline';
import ListingManagementService, { SellerListing, ListingImage } from '@/lib/listingManagementService';

interface ListingUploadProps {
  sellerId: string;
  sellerName: string;
  onListingCreated: (listing: SellerListing) => void;
  onCancel: () => void;
}

export default function ListingUpload({ 
  sellerId, 
  sellerName, 
  onListingCreated, 
  onCancel 
}: ListingUploadProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [listing, setListing] = useState<SellerListing | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  
  // Form data
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    subcategory: '',
    tags: [] as string[],
    basePrice: '',
    gameType: '',
    totalQuantity: '1',
    processingTime: '1-2 business days',
    shippingProfile: 'Standard Shipping',
    returnPolicy: '30-day return policy'
  });
  
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [primaryImageIndex, setPrimaryImageIndex] = useState(0);
  const [newTag, setNewTag] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const categories = ListingManagementService.getCategories();
  const gameTypes = [
    { id: 'multi-target', name: 'Multi-Target Reaction', emoji: '🎯', description: 'Click the correct target quickly' },
    { id: 'falling-objects', name: 'Falling Object Catch', emoji: '🏀', description: 'Catch objects with perfect timing' },
    { id: 'color-sequence', name: 'Color Sequence Memory', emoji: '🌈', description: 'Remember color sequences' },
    { id: 'quick-click', name: 'Quick Click Challenge', emoji: '⚡', description: 'Click as fast as you can' },
    { id: 'pattern-match', name: 'Pattern Matching', emoji: '🧩', description: 'Match patterns quickly' },
    { id: 'reflex-test', name: 'Reflex Test', emoji: '⏱️', description: 'Test your reaction time' },
    { id: 'laser-dodge', name: 'Laser Dodge', emoji: '🚀', description: 'Dodge lasers and obstacles' }
  ];

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Validate file types and sizes
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) return false;
      if (file.size > 10 * 1024 * 1024) return false; // 10MB limit
      return true;
    });

    if (validFiles.length !== files.length) {
      setErrors(prev => ({ ...prev, images: 'Some files were skipped (only images under 10MB allowed)' }));
    }

    // Limit total images to 10
    const totalImages = images.length + validFiles.length;
    const filesToAdd = totalImages > 10 ? validFiles.slice(0, 10 - images.length) : validFiles;

    if (filesToAdd.length < validFiles.length) {
      setErrors(prev => ({ ...prev, images: 'Maximum 10 images allowed' }));
    }

    // Add new images
    setImages(prev => [...prev, ...filesToAdd]);
    
    // Create previews
    const newPreviews = filesToAdd.map(file => URL.createObjectURL(file));
    setImagePreviews(prev => [...prev, ...newPreviews]);
    
    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    // Revoke object URL to prevent memory leaks
    URL.revokeObjectURL(imagePreviews[index]);
    
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    
    // Adjust primary image index
    if (primaryImageIndex === index) {
      setPrimaryImageIndex(0);
    } else if (primaryImageIndex > index) {
      setPrimaryImageIndex(prev => prev - 1);
    }
  };

  const addTag = () => {
    if (!newTag.trim()) return;
    if (formData.tags.includes(newTag.trim())) return;
    if (formData.tags.length >= 10) {
      setErrors(prev => ({ ...prev, tags: 'Maximum 10 tags allowed' }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      tags: [...prev.tags, newTag.trim()]
    }));
    setNewTag('');
    
    if (errors.tags) {
      setErrors(prev => ({ ...prev, tags: '' }));
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const validateStep = (step: number): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (step === 1) {
      // Basic Information
      if (!formData.title.trim()) newErrors.title = 'Title is required';
      if (formData.title.length > 100) newErrors.title = 'Title must be under 100 characters';
      if (!formData.description.trim()) newErrors.description = 'Description is required';
      if (formData.description.length < 50) newErrors.description = 'Description must be at least 50 characters';
      if (!formData.category) newErrors.category = 'Category is required';
    } else if (step === 2) {
      // Images
      if (images.length === 0) newErrors.images = 'At least one image is required';
    } else if (step === 3) {
      // Pricing & Game
      const price = parseFloat(formData.basePrice);
      if (!formData.basePrice || isNaN(price)) newErrors.basePrice = 'Base price is required';
      if (price < 1) newErrors.basePrice = 'Base price must be at least $1';
      if (price > 50000) newErrors.basePrice = 'Base price cannot exceed $50,000';
      if (!formData.gameType) newErrors.gameType = 'Game type is required';
      
      const quantity = parseInt(formData.totalQuantity);
      if (!formData.totalQuantity || isNaN(quantity)) newErrors.totalQuantity = 'Quantity is required';
      if (quantity < 1) newErrors.totalQuantity = 'Quantity must be at least 1';
      if (quantity > 100) newErrors.totalQuantity = 'Quantity cannot exceed 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSaveDraft = async () => {
    if (!validateStep(1)) return;

    setIsProcessing(true);
    
    try {
      const newListing = ListingManagementService.createListing(
        sellerId,
        sellerName,
        {
          title: formData.title,
          description: formData.description,
          category: formData.category,
          subcategory: formData.subcategory,
          tags: formData.tags,
          basePrice: parseFloat(formData.basePrice) || 0,
          gameType: formData.gameType || 'multi-target',
          totalQuantity: parseInt(formData.totalQuantity) || 1,
          processingTime: formData.processingTime,
          shippingProfile: formData.shippingProfile,
          returnPolicy: formData.returnPolicy
        }
      );

      if (images.length > 0) {
        await ListingManagementService.addImages(newListing.listingId, images);
      }

      setListing(newListing);
      alert('Draft saved successfully!');
    } catch (error) {
      setErrors({ general: 'Failed to save draft. Please try again.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePublish = async () => {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) return;

    setIsProcessing(true);
    
    try {
      let finalListing = listing;
      
      if (!finalListing) {
        // Create new listing
        finalListing = ListingManagementService.createListing(
          sellerId,
          sellerName,
          {
            title: formData.title,
            description: formData.description,
            category: formData.category,
            subcategory: formData.subcategory,
            tags: formData.tags,
            basePrice: parseFloat(formData.basePrice),
            gameType: formData.gameType,
            totalQuantity: parseInt(formData.totalQuantity),
            processingTime: formData.processingTime,
            shippingProfile: formData.shippingProfile,
            returnPolicy: formData.returnPolicy
          }
        );
      } else {
        // Update existing draft
        ListingManagementService.updateListing(finalListing.listingId, {
          title: formData.title,
          description: formData.description,
          category: formData.category,
          subcategory: formData.subcategory,
          tags: formData.tags,
          basePrice: parseFloat(formData.basePrice),
          gameType: formData.gameType,
          totalQuantity: parseInt(formData.totalQuantity),
          processingTime: formData.processingTime,
          shippingProfile: formData.shippingProfile,
          returnPolicy: formData.returnPolicy
        });
      }

      // Add images
      if (images.length > 0) {
        await ListingManagementService.addImages(finalListing.listingId, images);
      }

      // Publish listing
      const published = ListingManagementService.publishListing(finalListing.listingId);
      
      if (published) {
        onListingCreated(finalListing);
      } else {
        setErrors({ general: 'Failed to publish listing. Please check all required fields.' });
      }
    } catch (error) {
      setErrors({ general: 'Failed to publish listing. Please try again.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {[1, 2, 3, 4].map((step) => (
        <div key={step} className="flex items-center">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
            step <= currentStep ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'
          }`}>
            {step < currentStep ? <CheckCircleIcon className="h-6 w-6" /> : step}
          </div>
          {step < 4 && (
            <div className={`w-16 h-1 mx-2 ${
              step < currentStep ? 'bg-green-600' : 'bg-gray-300'
            }`} />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">📝 Create New Listing</h1>
            <p className="text-gray-600">List your item for skill-based gaming competitions</p>
          </div>

          {renderStepIndicator()}

          {errors.general && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2" />
                <span className="text-red-800">{errors.general}</span>
              </div>
            </div>
          )}

          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">📋 Basic Information</h2>
              
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    errors.title ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="e.g., iPhone 15 Pro Max - 1TB Titanium"
                  maxLength={100}
                />
                <div className="flex justify-between mt-1">
                  {errors.title && <p className="text-red-500 text-sm">{errors.title}</p>}
                  <p className="text-gray-500 text-sm ml-auto">{formData.title.length}/100</p>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    errors.description ? 'border-red-500' : 'border-gray-300'
                  }`}
                  rows={6}
                  placeholder="Describe your item in detail. Include condition, features, what's included, etc."
                />
                <div className="flex justify-between mt-1">
                  {errors.description && <p className="text-red-500 text-sm">{errors.description}</p>}
                  <p className="text-gray-500 text-sm ml-auto">{formData.description.length} characters</p>
                </div>
              </div>

              {/* Category */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => {
                      handleInputChange('category', e.target.value);
                      handleInputChange('subcategory', ''); // Reset subcategory
                    }}
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                      errors.category ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select Category</option>
                    {Object.keys(categories).map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                  {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subcategory
                  </label>
                  <select
                    value={formData.subcategory}
                    onChange={(e) => handleInputChange('subcategory', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    disabled={!formData.category}
                  >
                    <option value="">Select Subcategory</option>
                    {formData.category && categories[formData.category]?.map(subcategory => (
                      <option key={subcategory} value={subcategory}>{subcategory}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags (Help buyers find your item)
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {formData.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800"
                    >
                      <TagIcon className="h-4 w-4 mr-1" />
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="ml-2 text-green-600 hover:text-green-800"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    className="flex-1 p-3 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Add a tag..."
                    maxLength={20}
                  />
                  <button
                    onClick={addTag}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-r-lg transition-colors"
                  >
                    <PlusIcon className="h-5 w-5" />
                  </button>
                </div>
                {errors.tags && <p className="text-red-500 text-sm mt-1">{errors.tags}</p>}
                <p className="text-gray-500 text-sm mt-1">{formData.tags.length}/10 tags</p>
              </div>
            </div>
          )}

          {/* Step 2: Images */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">📸 Product Images</h2>
              
              {/* Image Upload Area */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <PhotoIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Product Images</h3>
                <p className="text-gray-600 mb-4">
                  Add up to 10 images. First image will be your main photo.
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors inline-flex items-center"
                >
                  <ArrowUpTrayIcon className="h-5 w-5 mr-2" />
                  Choose Images
                </button>
                <p className="text-gray-500 text-sm mt-2">
                  Supported: JPG, PNG, GIF (max 10MB each)
                </p>
              </div>

              {errors.images && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-800 text-sm">{errors.images}</p>
                </div>
              )}

              {/* Image Previews */}
              {images.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Your Images ({images.length}/10)
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <div className={`relative rounded-lg overflow-hidden ${
                          index === primaryImageIndex ? 'ring-4 ring-green-500' : ''
                        }`}>
                          <img
                            src={preview}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-32 object-cover"
                          />
                          {index === primaryImageIndex && (
                            <div className="absolute top-2 left-2">
                              <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center">
                                <StarIcon className="h-3 w-3 mr-1" />
                                Main
                              </span>
                            </div>
                          )}
                          <button
                            onClick={() => removeImage(index)}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </div>
                        <button
                          onClick={() => setPrimaryImageIndex(index)}
                          className="w-full mt-2 text-sm text-green-600 hover:text-green-800 font-medium"
                        >
                          {index === primaryImageIndex ? 'Main Photo' : 'Set as Main'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Pricing & Game */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">💰 Pricing & Game Selection</h2>
              
              {/* Base Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Base Price * (Amount needed to start competition)
                </label>
                <div className="relative">
                  <CurrencyDollarIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    max="50000"
                    value={formData.basePrice}
                    onChange={(e) => handleInputChange('basePrice', e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                      errors.basePrice ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                  />
                </div>
                {errors.basePrice && <p className="text-red-500 text-sm mt-1">{errors.basePrice}</p>}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
                  <p className="text-blue-800 text-sm">
                    <InformationCircleIcon className="inline h-4 w-4 mr-1" />
                    Users pay $1-$3 to enter. When total entries reach your base price, the 24-hour competition begins.
                  </p>
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity Available *
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.totalQuantity}
                  onChange={(e) => handleInputChange('totalQuantity', e.target.value)}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    errors.totalQuantity ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.totalQuantity && <p className="text-red-500 text-sm mt-1">{errors.totalQuantity}</p>}
                <p className="text-gray-500 text-sm mt-1">
                  Each quantity creates a separate competition. When one sells, the next automatically starts.
                </p>
              </div>

              {/* Game Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Competition Game Type *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {gameTypes.map((game) => (
                    <div
                      key={game.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        formData.gameType === game.id
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      onClick={() => handleInputChange('gameType', game.id)}
                    >
                      <div className="flex items-start">
                        <span className="text-2xl mr-3">{game.emoji}</span>
                        <div>
                          <h4 className="font-bold text-gray-900">{game.name}</h4>
                          <p className="text-gray-600 text-sm">{game.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {errors.gameType && <p className="text-red-500 text-sm mt-1">{errors.gameType}</p>}
              </div>

              {/* Fee Information */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-bold text-yellow-900 mb-2">💰 Platform Fees</h4>
                <div className="space-y-1 text-yellow-800 text-sm">
                  <p>• <strong>12% commission</strong> on final sale price</p>
                  <p>• <strong>$0.50 maintenance fee</strong> every 4 months to keep listing active</p>
                  <p>• <strong>3% shipping fee</strong> on shipping costs</p>
                </div>
                {formData.basePrice && (
                  <div className="mt-3 p-3 bg-white rounded border">
                    <p className="font-medium text-gray-900">Estimated earnings per sale:</p>
                    <div className="grid grid-cols-2 gap-2 text-sm mt-1">
                      <span>Sale price: ${parseFloat(formData.basePrice || '0').toFixed(2)}</span>
                      <span>Platform fee: -${(parseFloat(formData.basePrice || '0') * 0.12).toFixed(2)}</span>
                      <span className="font-bold">Net per sale: ${(parseFloat(formData.basePrice || '0') * 0.88).toFixed(2)}</span>
                    </div>
                    <div className="mt-2 pt-2 border-t text-xs text-gray-600">
                      <p><strong>Note:</strong> $0.50 maintenance fee charged every 4 months regardless of sales</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Shipping & Policies */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">🚚 Shipping & Policies</h2>
              
              {/* Processing Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Processing Time
                </label>
                <select
                  value={formData.processingTime}
                  onChange={(e) => handleInputChange('processingTime', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="1-2 business days">1-2 business days</option>
                  <option value="3-5 business days">3-5 business days</option>
                  <option value="1 week">1 week</option>
                  <option value="2 weeks">2 weeks</option>
                </select>
                <p className="text-gray-500 text-sm mt-1">
                  Time needed to prepare item for shipping after winner is determined
                </p>
              </div>

              {/* Shipping Profile */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Shipping Profile
                </label>
                <select
                  value={formData.shippingProfile}
                  onChange={(e) => handleInputChange('shippingProfile', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="Standard Shipping">Standard Shipping</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Fragile Items">Fragile Items</option>
                  <option value="Large Items">Large Items</option>
                  <option value="Express Shipping">Express Shipping</option>
                </select>
              </div>

              {/* Return Policy */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Return Policy
                </label>
                <select
                  value={formData.returnPolicy}
                  onChange={(e) => handleInputChange('returnPolicy', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="30-day return policy">30-day return policy</option>
                  <option value="14-day return policy">14-day return policy</option>
                  <option value="7-day return policy">7-day return policy</option>
                  <option value="No returns">No returns</option>
                  <option value="Exchanges only">Exchanges only</option>
                </select>
              </div>

              {/* Final Review */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h3 className="font-bold text-gray-900 mb-4">📋 Listing Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div><strong>Title:</strong> {formData.title}</div>
                  <div><strong>Category:</strong> {formData.category} {formData.subcategory && `> ${formData.subcategory}`}</div>
                  <div><strong>Base Price:</strong> ${formData.basePrice}</div>
                  <div><strong>Quantity:</strong> {formData.totalQuantity}</div>
                  <div><strong>Game:</strong> {gameTypes.find(g => g.id === formData.gameType)?.name}</div>
                  <div><strong>Images:</strong> {images.length}</div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-8 border-t border-gray-200">
            <div className="flex space-x-3">
              <button
                onClick={onCancel}
                className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              >
                Cancel
              </button>
              {currentStep > 1 && (
                <button
                  onClick={handleBack}
                  className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                >
                  Back
                </button>
              )}
            </div>

            <div className="flex space-x-3">
              {currentStep < 4 && (
                <>
                  <button
                    onClick={handleSaveDraft}
                    disabled={isProcessing}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                  >
                    Save Draft
                  </button>
                  <button
                    onClick={handleNext}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                  >
                    Next
                  </button>
                </>
              )}
              
              {currentStep === 4 && (
                <button
                  onClick={handlePublish}
                  disabled={isProcessing}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Publishing...
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="h-5 w-5 mr-2" />
                      Publish Listing
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
