'use client';

import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { MapPinIcon, ShieldCheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { isStateBlocked, getStateName, LEGAL_MESSAGES } from '@/lib/legalConstants';

interface PersistentLocationGateProps {
  onLocationVerified: (location: LocationData) => void;
}

interface LocationData {
  latitude: number;
  longitude: number;
  city: string;
  state: string;
  stateCode: string;
  country: string;
  isAllowed: boolean;
}

export default function PersistentLocationGate({ onLocationVerified }: PersistentLocationGateProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deniedPermanently, setDeniedPermanently] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);

  // Check if location was already verified in this session
  useEffect(() => {
    const locationVerified = sessionStorage.getItem('location_verified');
    const locationData = sessionStorage.getItem('location_data');
    
    if (locationVerified === 'true' && locationData) {
      try {
        const parsed = JSON.parse(locationData);
        if (parsed.isAllowed) {
          setIsOpen(false);
          onLocationVerified(parsed);
        }
      } catch (e) {
        console.error('Failed to parse cached location', e);
      }
    }
  }, [onLocationVerified]);

  const handleRequestLocation = async () => {
    setIsVerifying(true);
    setError(null);
    setAttemptCount(prev => prev + 1);

    try {
      // Check if geolocation is available
      if (!('geolocation' in navigator)) {
        setError('❌ Location services are not available in your browser. Please use a modern browser like Chrome, Firefox, or Safari.');
        setIsVerifying(false);
        return;
      }

      console.log('🌍 Requesting location permission...');

      // Request location with high accuracy
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            console.log('📍 Location received:', position.coords);

            // Get location details using reverse geocoding
            const response = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}&localityLanguage=en`
            );

            if (!response.ok) {
              throw new Error('Failed to get location details');
            }

            const data = await response.json();
            console.log('🌍 Location data:', data);

            // Extract state code (e.g., "US-CA" -> "CA")
            let stateCode = data.principalSubdivisionCode || '';
            if (stateCode.includes('-')) {
              stateCode = stateCode.split('-')[1];
            }

            const locationData: LocationData = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              city: data.city || data.locality || 'Unknown',
              state: data.principalSubdivision || 'Unknown',
              stateCode: stateCode,
              country: data.countryCode || 'Unknown',
              isAllowed: true
            };

            // Check if state is blocked
            if (locationData.country !== 'US') {
              setError(`❌ Sorry, DropDollar is only available in the United States. Your location: ${data.countryName || locationData.country}`);
              locationData.isAllowed = false;
              setIsVerifying(false);
              return;
            }

            if (isStateBlocked(stateCode)) {
              const stateName = getStateName(stateCode);
              setError(`❌ ${LEGAL_MESSAGES.BLOCKED_STATE_NOTICE}\n\nYour location: ${stateName}`);
              locationData.isAllowed = false;
              setIsVerifying(false);
              return;
            }

            // Location is approved
            console.log('✅ Location verified:', locationData);

            // Store in session
            sessionStorage.setItem('location_verified', 'true');
            sessionStorage.setItem('location_data', JSON.stringify(locationData));
            sessionStorage.setItem('location_verified_at', new Date().toISOString());

            // Close modal and notify parent
            setIsOpen(false);
            onLocationVerified(locationData);
            setIsVerifying(false);
          } catch (err) {
            console.error('Geocoding error:', err);
            setError('❌ Failed to verify your location. Please check your internet connection and try again.');
            setIsVerifying(false);
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          
          if (error.code === 1) {
            // Permission denied
            setDeniedPermanently(true);
            setError('❌ Location permission denied. You must allow location access to use DropDollar.\n\n' +
              'To fix this:\n' +
              '1. Click the lock icon in your browser\'s address bar\n' +
              '2. Allow location permissions\n' +
              '3. Refresh this page');
          } else if (error.code === 2) {
            // Position unavailable
            setError('❌ Unable to determine your location. Please ensure:\n' +
              '• Location services are enabled on your device\n' +
              '• You have a stable internet connection\n' +
              '• GPS is working properly');
          } else if (error.code === 3) {
            // Timeout
            setError('❌ Location request timed out. Please try again.');
          } else {
            setError('❌ An error occurred while getting your location. Please try again.');
          }
          
          setIsVerifying(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } catch (err) {
      console.error('Location request error:', err);
      setError('❌ An unexpected error occurred. Please refresh the page and try again.');
      setIsVerifying(false);
    }
  };

  return (
    <Dialog 
      open={isOpen} 
      onClose={() => {}} // Cannot close - must verify location
      className="relative z-[9999]"
    >
      {/* Full-screen backdrop - blocks everything */}
      <div className="fixed inset-0 bg-black/95 backdrop-blur-md" aria-hidden="true" />

      {/* Full-screen container */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-md w-full bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 rounded-2xl shadow-2xl border-2 border-blue-500/50 overflow-hidden">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-center">
            <MapPinIcon className="w-20 h-20 mx-auto mb-4 text-white animate-bounce" />
            <Dialog.Title className="text-3xl font-bold text-white mb-2">
              Location Verification Required
            </Dialog.Title>
            <p className="text-blue-100 text-sm">
              Legal requirement for skill-based gaming
            </p>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Legal Notice */}
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <ShieldCheckIcon className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-yellow-200 font-medium mb-1">
                    Why We Need This
                  </p>
                  <p className="text-xs text-yellow-100/80">
                    Federal and state laws require us to verify you're in an approved location before you can access skill-based gaming competitions.
                  </p>
                </div>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <ExclamationTriangleIcon className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-red-200 font-medium mb-1">
                      Verification Failed
                    </p>
                    <p className="text-xs text-red-100/80 whitespace-pre-line">
                      {error}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-semibold text-blue-300 mb-3">How This Works:</h3>
              <ol className="space-y-2 text-xs text-blue-200">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-400">1.</span>
                  <span>Click "Allow Location" below</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-400">2.</span>
                  <span>Your browser will ask for permission</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-400">3.</span>
                  <span>Click "Allow" in the browser prompt</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-400">4.</span>
                  <span>We verify you're in an approved state</span>
                </li>
              </ol>
            </div>

            {/* Attempt Counter */}
            {attemptCount > 0 && (
              <div className="text-center text-xs text-gray-400 mb-4">
                Attempt {attemptCount} {attemptCount > 2 && '- Having trouble? Check browser settings'}
              </div>
            )}

            {/* Action Button */}
            <button
              onClick={handleRequestLocation}
              disabled={isVerifying}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-4 px-6 rounded-lg transition-all duration-200 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
            >
              {isVerifying ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Verifying Location...
                </>
              ) : (
                <>
                  <MapPinIcon className="w-6 h-6" />
                  Allow Location Access
                </>
              )}
            </button>

            {/* Denied Permanently Help */}
            {deniedPermanently && (
              <div className="mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                <p className="text-xs text-red-200 mb-2 font-semibold">
                  🔒 Location Blocked
                </p>
                <p className="text-xs text-red-100/80">
                  You previously blocked location access. To enable it:
                </p>
                <ul className="text-xs text-red-100/80 mt-2 space-y-1 ml-4">
                  <li>• Chrome: Click 🔒 in address bar → Site settings → Location</li>
                  <li>• Firefox: Click 🔒 → Connection secure → More information → Permissions</li>
                  <li>• Safari: Safari menu → Settings → Websites → Location</li>
                </ul>
              </div>
            )}

            {/* Privacy Notice */}
            <div className="mt-6 pt-6 border-t border-gray-700">
              <p className="text-xs text-gray-400 text-center">
                🔒 Your location is only used for legal compliance verification. We do not track or share your exact coordinates. This check is required each session.
              </p>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}

