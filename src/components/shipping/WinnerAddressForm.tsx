'use client';

import React, { useState } from 'react';
import { 
  TruckIcon, 
  MapPinIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';
import ShippingService, { ShippingAddress } from '@/lib/shippingService';

interface WinnerAddressFormProps {
  fulfillmentId: string;
  productName: string;
  winnerUsername: string;
  onAddressSubmitted: () => void;
  onCancel: () => void;
}

export default function WinnerAddressForm({
  fulfillmentId,
  productName,
  winnerUsername,
  onAddressSubmitted,
  onCancel
}: WinnerAddressFormProps) {
  const [address, setAddress] = useState<ShippingAddress>({
    firstName: '',
    lastName: '',
    company: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US',
    phone: '',
    email: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const US_STATES = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ];

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!address.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!address.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!address.address1.trim()) newErrors.address1 = 'Address is required';
    if (!address.city.trim()) newErrors.city = 'City is required';
    if (!address.state) newErrors.state = 'State is required';
    if (!address.postalCode.trim()) newErrors.postalCode = 'ZIP code is required';
    if (!address.phone.trim()) newErrors.phone = 'Phone number is required';
    if (!address.email.trim()) newErrors.email = 'Email is required';

    // Validate ZIP code format
    if (address.postalCode && !/^\d{5}(-\d{4})?$/.test(address.postalCode)) {
      newErrors.postalCode = 'Invalid ZIP code format (12345 or 12345-6789)';
    }

    // Validate email format
    if (address.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address.email)) {
      newErrors.email = 'Invalid email format';
    }

    // Validate phone format
    if (address.phone && !/^[\+]?[1-9][\d]{0,15}$/.test(address.phone.replace(/[\s\-\(\)]/g, ''))) {
      newErrors.phone = 'Invalid phone number format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const success = ShippingService.submitShippingAddress(fulfillmentId, address);
      
      if (success) {
        onAddressSubmitted();
      } else {
        setErrors({ general: 'Failed to submit address. Please try again.' });
      }
    } catch (error) {
      setErrors({ general: 'An error occurred. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof ShippingAddress, value: string) => {
    setAddress(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <TruckIcon className="h-12 w-12 text-green-600 mr-3" />
              <CheckCircleIcon className="h-8 w-8 text-yellow-500" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">🎉 Congratulations!</h2>
            <p className="text-xl text-gray-600 mb-2">
              You won: <span className="font-bold text-green-600">{productName}</span>
            </p>
            <p className="text-gray-500">
              Winner: <span className="font-medium">{winnerUsername}</span>
            </p>
          </div>

          {/* Shipping Address Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <MapPinIcon className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-blue-900 mb-1">Shipping Address Required</h3>
                  <p className="text-blue-800 text-sm">
                    Please provide your shipping address so we can send you your prize. 
                    This information will be shared with the seller for fulfillment.
                  </p>
                </div>
              </div>
            </div>

            {errors.general && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2" />
                  <span className="text-red-800 text-sm">{errors.general}</span>
                </div>
              </div>
            )}

            {/* Name Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <UserIcon className="inline-block h-4 w-4 mr-1" />
                  First Name *
                </label>
                <input
                  type="text"
                  value={address.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    errors.firstName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="John"
                />
                {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  value={address.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    errors.lastName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Doe"
                />
                {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
              </div>
            </div>

            {/* Company (Optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company (Optional)
              </label>
              <input
                type="text"
                value={address.company}
                onChange={(e) => handleInputChange('company', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Company Name"
              />
            </div>

            {/* Address Fields */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPinIcon className="inline-block h-4 w-4 mr-1" />
                Address Line 1 *
              </label>
              <input
                type="text"
                value={address.address1}
                onChange={(e) => handleInputChange('address1', e.target.value)}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                  errors.address1 ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="123 Main Street"
              />
              {errors.address1 && <p className="text-red-500 text-sm mt-1">{errors.address1}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address Line 2 (Optional)
              </label>
              <input
                type="text"
                value={address.address2}
                onChange={(e) => handleInputChange('address2', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Apartment, suite, etc."
              />
            </div>

            {/* City, State, ZIP */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City *
                </label>
                <input
                  type="text"
                  value={address.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    errors.city ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="New York"
                />
                {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State *
                </label>
                <select
                  value={address.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    errors.state ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select State</option>
                  {US_STATES.map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
                {errors.state && <p className="text-red-500 text-sm mt-1">{errors.state}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ZIP Code *
                </label>
                <input
                  type="text"
                  value={address.postalCode}
                  onChange={(e) => handleInputChange('postalCode', e.target.value)}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    errors.postalCode ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="12345"
                />
                {errors.postalCode && <p className="text-red-500 text-sm mt-1">{errors.postalCode}</p>}
              </div>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <PhoneIcon className="inline-block h-4 w-4 mr-1" />
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={address.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    errors.phone ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="(555) 123-4567"
                />
                {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <EnvelopeIcon className="inline-block h-4 w-4 mr-1" />
                  Email Address *
                </label>
                <input
                  type="email"
                  value={address.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="john@example.com"
                />
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
              </div>
            </div>

            {/* Privacy Notice */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-gray-700 text-sm">
                <strong>Privacy Notice:</strong> Your shipping information will be shared with the seller 
                for fulfillment purposes only. We use industry-standard security measures to protect your data.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4 pt-6">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <TruckIcon className="h-5 w-5 mr-2" />
                    Submit Shipping Address
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
