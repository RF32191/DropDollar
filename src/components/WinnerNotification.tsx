'use client';

import React, { useState } from 'react';
import { ActivityService, WinnerRecord } from '@/lib/supabase/activityService';
import SoundEffects from '@/lib/SoundEffects';
import { TrophyIcon, CheckCircleIcon, MapPinIcon } from '@heroicons/react/24/outline';

interface WinnerNotificationProps {
  winnerRecord: WinnerRecord;
  onAddressSubmitted?: () => void;
}

export default function WinnerNotification({ winnerRecord, onAddressSubmitted }: WinnerNotificationProps) {
  const [showAddressForm, setShowAddressForm] = useState(!winnerRecord.prize_claimed);
  const [address, setAddress] = useState({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'USA',
    phone: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(winnerRecord.prize_claimed);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const fullAddress = `${address.street}, ${address.city}, ${address.state} ${address.zipCode}, ${address.country}\nPhone: ${address.phone}`;
      
      const success = await ActivityService.updateWinnerAddress(winnerRecord.id, fullAddress);
      
      if (success) {
        SoundEffects.playSuccess();
        setSubmitted(true);
        setShowAddressForm(false);
        if (onAddressSubmitted) {
          onAddressSubmitted();
        }
      } else {
        SoundEffects.playError();
        alert('Failed to submit address. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting address:', error);
      SoundEffects.playError();
      alert('Failed to submit address. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-yellow-600 via-orange-600 to-red-600 rounded-3xl p-1 max-w-2xl w-full">
        <div className="bg-gray-900 rounded-3xl p-8">
          {/* Winner Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <TrophyIcon className="h-24 w-24 text-yellow-400 animate-bounce" />
            </div>
            <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 mb-4">
              🎉 CONGRATULATIONS! 🎉
            </h1>
            <p className="text-2xl text-white font-bold mb-2">
              YOU WON THE PRIZE!
            </p>
            <div className="bg-gray-800 border-4 border-yellow-400 rounded-xl p-6 mt-6">
              <p className="text-gray-400 text-sm mb-2">Your Confirmation Code:</p>
              <p className="text-3xl font-mono font-bold text-yellow-400 tracking-wider">
                {winnerRecord.confirmation_code}
              </p>
              <p className="text-gray-400 text-xs mt-2">
                Save this code for your records
              </p>
            </div>
          </div>

          {/* Winner Details */}
          <div className="bg-gray-800 rounded-xl p-6 mb-6">
            <h3 className="text-xl font-bold text-white mb-4">🏆 Prize Details</h3>
            <div className="space-y-3 text-gray-300">
              <div className="flex justify-between">
                <span>Game Type:</span>
                <span className="font-bold text-white">{winnerRecord.game_type}</span>
              </div>
              <div className="flex justify-between">
                <span>Your Score:</span>
                <span className="font-bold text-green-400">{winnerRecord.score}</span>
              </div>
              <div className="flex justify-between">
                <span>Rank:</span>
                <span className="font-bold text-yellow-400">#{winnerRecord.rank}</span>
              </div>
            </div>
          </div>

          {/* Address Form or Confirmation */}
          {showAddressForm && !submitted ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-blue-900 bg-opacity-30 border-2 border-blue-500 rounded-xl p-4 mb-4">
                <div className="flex items-start space-x-3">
                  <MapPinIcon className="h-6 w-6 text-blue-400 flex-shrink-0 mt-1" />
                  <div>
                    <p className="text-white font-bold mb-1">Shipping Address Required</p>
                    <p className="text-gray-300 text-sm">
                      Please provide your shipping address so we can send you your prize!
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Street Address</label>
                <input
                  type="text"
                  required
                  value={address.street}
                  onChange={(e) => setAddress(prev => ({ ...prev, street: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  placeholder="123 Main Street"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">City</label>
                  <input
                    type="text"
                    required
                    value={address.city}
                    onChange={(e) => setAddress(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-yellow-500"
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">State</label>
                  <input
                    type="text"
                    required
                    value={address.state}
                    onChange={(e) => setAddress(prev => ({ ...prev, state: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-yellow-500"
                    placeholder="State"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">ZIP Code</label>
                  <input
                    type="text"
                    required
                    value={address.zipCode}
                    onChange={(e) => setAddress(prev => ({ ...prev, zipCode: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-yellow-500"
                    placeholder="12345"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Phone</label>
                  <input
                    type="tel"
                    required
                    value={address.phone}
                    onChange={(e) => setAddress(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-yellow-500"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-4 px-6 rounded-xl disabled:opacity-50 transition-all duration-300 shadow-lg hover:shadow-2xl"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </span>
                ) : (
                  '📦 Submit Shipping Address'
                )}
              </button>
            </form>
          ) : (
            <div className="bg-green-900 bg-opacity-30 border-2 border-green-500 rounded-xl p-6 text-center">
              <CheckCircleIcon className="h-16 w-16 text-green-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">Address Submitted!</h3>
              <p className="text-gray-300 mb-4">
                Your shipping address has been received. The seller will be notified and will ship your prize soon!
              </p>
              <p className="text-sm text-gray-400">
                You'll receive an email when your prize ships.
              </p>
            </div>
          )}

          {/* Important Note */}
          <div className="mt-6 bg-yellow-900 bg-opacity-20 border border-yellow-600 rounded-xl p-4">
            <p className="text-yellow-300 text-sm">
              <span className="font-bold">📧 Check your email</span> for additional details and tracking information.
              Keep your confirmation code <span className="font-mono font-bold">{winnerRecord.confirmation_code}</span> safe!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

