'use client';

import React, { useState } from 'react';
import { ImprovedLocationService } from '@/lib/improvedLocationService';
import {
  MapPinIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface LocationVerificationModalProps {
  isOpen: boolean;
  onLocationGranted: (location: any) => void;
  onLocationDenied: () => void;
}

export default function LocationVerificationModal({
  isOpen,
  onLocationGranted,
  onLocationDenied
}: LocationVerificationModalProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationResult, setLocationResult] = useState<any>(null);

  if (!isOpen) return null;

  const handleRequestLocation = async () => {
    setIsVerifying(true);
    setError(null);
    setLocationResult(null);

    try {
      console.log('🌍 Requesting location...');
      const location = await ImprovedLocationService.getCurrentLocation();
      console.log('✅ Location obtained:', location);
      
      setLocationResult(location);
      
      const isAllowed = ImprovedLocationService.isGamingAllowed(location);
      
      if (isAllowed) {
        onLocationGranted(location);
      } else {
        onLocationDenied();
      }
    } catch (err: any) {
      console.error('❌ Location error:', err);
      setError(err.message || 'Failed to get location');
      onLocationDenied();
    } finally {
      setIsVerifying(false);
    }
  };

  const isGamingAllowed = locationResult ? ImprovedLocationService.isGamingAllowed(locationResult) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-center mb-6">
          <div className="bg-blue-500/20 p-4 rounded-full">
            <MapPinIcon className="w-12 h-12 text-blue-400" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-white text-center mb-2">
          Location Verification Required
        </h2>
        <p className="text-gray-400 text-center mb-6">
          We need to verify your location to ensure gaming compliance with local laws.
        </p>

        {/* Location Result Display */}
        {locationResult && (
          <div className={`mb-6 p-4 rounded-xl border-2 ${
            isGamingAllowed 
              ? 'bg-green-500/10 border-green-500/50' 
              : 'bg-red-500/10 border-red-500/50'
          }`}>
            <div className="flex items-start">
              {isGamingAllowed ? (
                <CheckCircleIcon className="w-6 h-6 text-green-400 mr-3 flex-shrink-0 mt-1" />
              ) : (
                <XCircleIcon className="w-6 h-6 text-red-400 mr-3 flex-shrink-0 mt-1" />
              )}
              <div className="flex-1">
                <h3 className={`font-bold mb-2 ${
                  isGamingAllowed ? 'text-green-400' : 'text-red-400'
                }`}>
                  {isGamingAllowed ? 'Gaming Allowed' : 'Gaming Not Allowed'}
                </h3>
                <div className="text-sm text-gray-300 space-y-1">
                  <p><strong>Location:</strong> {locationResult.city}, {locationResult.state}</p>
                  <p><strong>Country:</strong> {locationResult.country}</p>
                  <p><strong>Postal Code:</strong> {locationResult.postalCode || 'N/A'}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    Coordinates: {locationResult.latitude.toFixed(4)}, {locationResult.longitude.toFixed(4)}
                  </p>
                </div>
                {!isGamingAllowed && (
                  <div className="mt-3 p-3 bg-red-900/30 rounded-lg">
                    <p className="text-xs text-red-300">
                      <ExclamationTriangleIcon className="w-4 h-4 inline mr-1" />
                      Gaming is restricted in your location due to local regulations.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border-2 border-red-500/50 rounded-xl">
            <div className="flex items-center text-red-400">
              <XCircleIcon className="w-5 h-5 mr-2" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {!locationResult && (
          <button
            onClick={handleRequestLocation}
            disabled={isVerifying}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isVerifying ? (
              <>
                <ArrowPathIcon className="w-5 h-5 mr-2 animate-spin" />
                Verifying Location...
              </>
            ) : (
              <>
                <MapPinIcon className="w-5 h-5 mr-2" />
                Verify My Location
              </>
            )}
          </button>
        )}

        {/* Retry Button (if failed) */}
        {error && (
          <button
            onClick={handleRequestLocation}
            disabled={isVerifying}
            className="w-full mt-3 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center"
          >
            <ArrowPathIcon className="w-5 h-5 mr-2" />
            Try Again
          </button>
        )}

        {/* Info */}
        <div className="mt-6 p-3 bg-blue-500/10 rounded-lg">
          <p className="text-xs text-blue-300 text-center">
            🔒 Your location data is used only for verification and is not stored.
          </p>
        </div>

        {/* Legal Notice */}
        <div className="mt-4 text-xs text-gray-500 text-center">
          By verifying your location, you agree to our{' '}
          <a href="/terms" className="text-blue-400 hover:underline">Terms of Service</a>
          {' '}and confirm you are of legal gaming age in your jurisdiction.
        </div>
      </div>
    </div>
  );
}

