'use client';

import React, { useState } from 'react';
import { XMarkIcon, MapPinIcon, ShieldCheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { LocationService, type LocationData, type LocationPermissionResult } from '@/lib/locationService';

interface LocationPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationVerified: (location: LocationData) => void;
  onLocationDenied: (reason: string) => void;
}

export default function LocationPermissionModal({
  isOpen,
  onClose,
  onLocationVerified,
  onLocationDenied
}: LocationPermissionModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'request' | 'verifying' | 'success' | 'denied'>('request');
  const [locationData, setLocationData] = useState<LocationData | null>(null);

  const handleRequestLocation = async () => {
    setIsLoading(true);
    setError(null);
    setStep('verifying');

    try {
      const result: LocationPermissionResult = await LocationService.requestLocationPermission();

      if (result.granted && result.location) {
        setLocationData(result.location);
        
        if (result.location.isAllowed) {
          setStep('success');
          setTimeout(() => {
            onLocationVerified(result.location!);
            onClose();
            // Set flag to indicate location was just verified
            sessionStorage.setItem('location_just_verified', 'true');
            // Reload the page to ensure the site recognizes the user's allowed location
            setTimeout(() => {
              window.location.reload();
            }, 500);
          }, 2000);
        } else {
          setStep('denied');
          onLocationDenied(result.location.restrictionReason || 'Location not allowed');
        }
      } else {
        setError(result.error || 'Unable to access location');
        setStep('request');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      setStep('request');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (step === 'denied') {
      onLocationDenied(locationData?.restrictionReason || 'Location access denied');
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 relative">
          <button
            onClick={handleClose}
            className="absolute right-4 top-4 text-white hover:text-gray-200 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
          <div className="flex items-center space-x-3">
            <div className="bg-white bg-opacity-20 rounded-full p-2">
              <MapPinIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Location Verification</h2>
              <p className="text-blue-100 text-sm">Required for legal compliance</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {step === 'request' && (
            <div className="text-center">
              <div className="mb-6">
                <div className="bg-blue-100 dark:bg-blue-900/30 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-4">
                  <ShieldCheckIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  Legal Compliance Required
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                  To ensure compliance with skill-based gaming regulations, we need to verify your location. 
                  This is a one-time verification required by law.
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm">Why we need this:</h4>
                <ul className="text-xs text-gray-600 dark:text-gray-300 space-y-1 text-left">
                  <li>• Comply with state gambling and gaming laws</li>
                  <li>• Ensure you're eligible to participate</li>
                  <li>• Protect both you and our platform legally</li>
                  <li>• Verify age and jurisdiction requirements</li>
                </ul>
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-4 mb-4">
                  <div className="flex items-start space-x-2">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
                  </div>
                </div>
              )}

              <button
                onClick={handleRequestLocation}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Requesting Permission...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <MapPinIcon className="h-5 w-5" />
                    <span>Allow Location Access</span>
                  </div>
                )}
              </button>

              <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                Your location data is stored locally and used only for legal compliance verification.
              </p>
            </div>
          )}

          {step === 'verifying' && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Verifying Location...
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Please wait while we verify your location for legal compliance.
              </p>
            </div>
          )}

          {step === 'success' && locationData && (
            <div className="text-center py-4">
              <div className="bg-green-100 dark:bg-green-900/30 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-4">
                <ShieldCheckIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-bold text-green-800 dark:text-green-300 mb-2">
                Location Verified!
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                {LocationService.getComplianceMessage(locationData)}
              </p>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 mb-4">
                <p className="text-green-700 dark:text-green-300 text-sm font-medium">
                  📍 {locationData.city}, {LocationService.getStateName(locationData.stateCode)}
                </p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-blue-700 dark:text-blue-300 text-sm font-medium">
                    Refreshing page...
                  </span>
                </div>
                <p className="text-blue-600 dark:text-blue-400 text-xs">
                  The page will reload to ensure all features are available in your location.
                </p>
              </div>
            </div>
          )}

          {step === 'denied' && locationData && (
            <div className="text-center py-4">
              <div className="bg-red-100 dark:bg-red-900/30 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-4">
                <ExclamationTriangleIcon className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-red-800 dark:text-red-300 mb-2">
                Location Restricted
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                {locationData.restrictionReason}
              </p>
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                <p className="text-red-700 dark:text-red-300 text-sm">
                  <strong>What you can still do:</strong>
                </p>
                <ul className="text-red-600 dark:text-red-400 text-xs mt-2 space-y-1 text-left">
                  <li>• Browse our marketplace</li>
                  <li>• View product listings</li>
                  <li>• Learn about our platform</li>
                  <li>• Contact customer support</li>
                </ul>
              </div>
              <button
                onClick={handleClose}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 mt-4"
              >
                I Understand
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
