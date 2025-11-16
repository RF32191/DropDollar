'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase/client';

interface ShippingAddressModalProps {
  listingId: string;
  listingTitle: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ShippingAddressModal({ 
  listingId, 
  listingTitle, 
  onClose, 
  onSuccess 
}: ShippingAddressModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'USA',
    phone: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    // Validation
    if (!formData.name || !formData.address_line1 || !formData.city || !formData.state || !formData.postal_code || !formData.phone) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      setIsSubmitting(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('winner_provide_address', {
        listing_id_param: listingId,
        shipping_address_param: formData
      });

      if (error) throw error;

      if (data?.success) {
        setMessage({ type: 'success', text: 'Shipping address sent to seller!' });
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      } else {
        throw new Error(data?.message || 'Failed to submit address');
      }
    } catch (error: any) {
      console.error('Error submitting address:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to submit address' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 max-w-2xl w-full border border-green-500/30 my-8">
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center">
          🎉 Congratulations! You Won!
        </h2>
        <p className="text-gray-300 mb-6">
          Provide your shipping address for: <span className="text-yellow-400 font-semibold">{listingTitle}</span>
        </p>

        {message && (
          <div className={`mb-4 p-3 rounded-lg ${
            message.type === 'success' ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Full Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
              placeholder="John Doe"
              required
            />
          </div>

          {/* Address Line 1 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Address Line 1 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="address_line1"
              value={formData.address_line1}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
              placeholder="123 Main Street"
              required
            />
          </div>

          {/* Address Line 2 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Address Line 2 (Optional)
            </label>
            <input
              type="text"
              name="address_line2"
              value={formData.address_line2}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
              placeholder="Apartment, suite, etc."
            />
          </div>

          {/* City, State, Zip */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                City <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                placeholder="New York"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                State <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                placeholder="NY"
                maxLength={2}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Zip Code <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="postal_code"
                value={formData.postal_code}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                placeholder="10001"
                required
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Phone Number <span className="text-red-400">*</span>
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
              placeholder="(555) 123-4567"
              required
            />
          </div>

          {/* Country */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Country
            </label>
            <input
              type="text"
              name="country"
              value={formData.country}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
              placeholder="USA"
            />
          </div>

          {/* Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold py-3 rounded-lg transition-all duration-300 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '⏳ Sending...' : '📦 Send Address to Seller'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white font-bold py-3 rounded-lg transition-colors disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </form>

        <p className="text-xs text-gray-400 mt-4 text-center">
          🔒 Your information is securely transmitted to the seller only
        </p>
      </div>
    </div>
  );
}

