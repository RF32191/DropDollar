'use client';

import React, { useState, useEffect } from 'react';
import { MapPinIcon, ShieldCheckIcon, ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface GlobalLocationCheckProps {
  onLocationVerified?: () => void;
  onLocationDenied?: () => void;
  className?: string;
}

export default function GlobalLocationCheck({ 
  onLocationVerified, 
  onLocationDenied,
  className = '' 
}: GlobalLocationCheckProps) {
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [isCheckingLocation, setIsCheckingLocation] = useState(false);
  const [locationStatus, setLocationStatus] = useState<'unknown' | 'granted' | 'denied' | 'unavailable'>('unknown');
  const [locationData, setLocationData] = useState<{
    latitude: number;
    longitude: number;
    city: string;
    state: string;
    country: string;
  } | null>(null);

  // 12-hour re-verification system
  const LOCATION_VERIFICATION_DURATION = 12 * 60 * 60 * 1000; // 12 hours in milliseconds
  const [needsReVerification, setNeedsReVerification] = useState(false);

  // Check if location verification has expired
  const checkLocationExpiry = () => {
    const lastVerification = localStorage.getItem('locationVerificationTime');
    if (lastVerification) {
      const verificationTime = parseInt(lastVerification);
      const now = Date.now();
      const timeSinceVerification = now - verificationTime;
      
      if (timeSinceVerification >= LOCATION_VERIFICATION_DURATION) {
        setNeedsReVerification(true);
        return true;
      }
    }
    return false;
  };

  // Set location verification timestamp
  const setLocationVerificationTime = () => {
    localStorage.setItem('locationVerificationTime', Date.now().toString());
    setNeedsReVerification(false);
  };

  // Check if gaming is allowed in the user's state
  const isGamingAllowed = (state: string): { allowed: boolean; message: string } => {
    const stateLower = state.toLowerCase();
    
    // States where skill-based gaming is generally allowed
    const allowedStates = [
      'california', 'texas', 'florida', 'new york', 'illinois', 'pennsylvania',
      'ohio', 'georgia', 'north carolina', 'michigan', 'new jersey', 'virginia',
      'washington', 'arizona', 'massachusetts', 'tennessee', 'indiana', 'missouri',
      'maryland', 'wisconsin', 'colorado', 'minnesota', 'south carolina', 'alabama',
      'louisiana', 'kentucky', 'oregon', 'oklahoma', 'connecticut', 'utah',
      'iowa', 'nevada', 'arkansas', 'mississippi', 'kansas', 'new mexico',
      'nebraska', 'west virginia', 'idaho', 'hawaii', 'new hampshire', 'maine',
      'montana', 'rhode island', 'delaware', 'south dakota', 'north dakota',
      'alaska', 'vermont', 'wyoming'
    ];

    if (allowedStates.includes(stateLower)) {
      return {
        allowed: true,
        message: `✅ Gaming allowed in ${state}! You can participate in skill-based competitions.`
      };
    } else {
      return {
        allowed: false,
        message: `⚠️ Gaming restrictions may apply in ${state}. Please check local regulations.`
      };
    }
  };

  // Update body class when location banner is shown
  useEffect(() => {
    if (locationStatus === 'granted' && locationData) {
      document.body.setAttribute('data-location-banner', 'true');
    } else {
      document.body.removeAttribute('data-location-banner');
    }
    
    return () => {
      document.body.removeAttribute('data-location-banner');
    };
  }, [locationStatus, locationData]);

  // Check if location permission is already granted
  useEffect(() => {
    const checkExistingPermission = async () => {
      try {
        if ('geolocation' in navigator) {
          const permission = await navigator.permissions.query({ name: 'geolocation' });
        if (permission.state === 'granted') {
          // Check if location verification has expired
          const hasExpired = checkLocationExpiry();
          
          if (hasExpired) {
            setLocationStatus('unknown');
            setNeedsReVerification(true);
          } else {
            setLocationStatus('granted');
            // Try to get cached location
            const cachedLocation = localStorage.getItem('userLocation');
            if (cachedLocation) {
              try {
                setLocationData(JSON.parse(cachedLocation));
              } catch (error) {
                console.error('Error parsing cached location:', error);
              }
            }
          }
        } else if (permission.state === 'denied') {
          setLocationStatus('denied');
        } else {
          setLocationStatus('unknown');
        }
        } else {
          setLocationStatus('unavailable');
        }
      } catch (error) {
        console.error('Error checking location permission:', error);
        setLocationStatus('unknown');
      }
    };

    checkExistingPermission();
  }, []);

  const requestLocationPermission = async () => {
    if (!('geolocation' in navigator)) {
      setLocationStatus('unavailable');
      onLocationDenied?.();
      return;
    }

    setIsCheckingLocation(true);
    setShowLocationPrompt(true);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes cache
        });
      });

      const { latitude, longitude } = position.coords;
      
      // Reverse geocoding to get city/state/country
      try {
        const response = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
        );
        const data = await response.json();
        
        const locationInfo = {
          latitude,
          longitude,
          city: data.city || 'Unknown',
          state: data.principalSubdivision || 'Unknown',
          country: data.countryName || 'Unknown'
        };

        setLocationData(locationInfo);
        setLocationStatus('granted');
        
        // Cache the location and set verification timestamp
        localStorage.setItem('userLocation', JSON.stringify(locationInfo));
        localStorage.setItem('locationPermission', 'granted');
        setLocationVerificationTime();
        
        console.log('Location verified:', locationInfo);
        onLocationVerified?.();
        
      } catch (geocodeError) {
        console.error('Geocoding error:', geocodeError);
        // Still grant permission even if geocoding fails
        setLocationStatus('granted');
        localStorage.setItem('locationPermission', 'granted');
        setLocationVerificationTime();
        onLocationVerified?.();
      }

    } catch (error: any) {
      console.error('Location error:', error);
      setLocationStatus('denied');
      localStorage.setItem('locationPermission', 'denied');
      onLocationDenied?.();
    } finally {
      setIsCheckingLocation(false);
      setTimeout(() => setShowLocationPrompt(false), 2000);
    }
  };

  const dismissPrompt = () => {
    setShowLocationPrompt(false);
    onLocationDenied?.();
  };

  // Don't show anything if location is already granted
  if (locationStatus === 'granted') {
    return null;
  }

  // Don't show if unavailable
  if (locationStatus === 'unavailable') {
    return null;
  }

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 ${className}`}>
      {/* Top Location Confirmation Banner */}
      {locationStatus === 'granted' && locationData && (
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg border-b-2 border-green-500">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <ShieldCheckIcon className="h-5 w-5 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold">
                    ✅ LOCATION VERIFIED: {locationData.city}, {locationData.state}
                  </span>
                  <span className="text-xs opacity-90">
                    {isGamingAllowed(locationData.state).message}
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs bg-white/20 px-2 py-1 rounded-full font-medium">
                  🎮 GAMING ENABLED
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Location Request Button - Only show when not granted */}
      {locationStatus !== 'granted' && (
        <div className="fixed top-4 right-4 z-50">
          {locationStatus === 'denied' && (
            <div className="bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg mb-2 flex items-center space-x-2">
              <ExclamationTriangleIcon className="h-5 w-5" />
              <span className="text-sm font-medium">Location access denied</span>
            </div>
          )}

          {(locationStatus === 'unknown' || needsReVerification) && (
            <button
              onClick={requestLocationPermission}
              disabled={isCheckingLocation}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white px-4 py-2 rounded-lg shadow-lg transition-all duration-300 hover:scale-105 disabled:scale-100 flex items-center space-x-2"
            >
              <MapPinIcon className="h-5 w-5" />
              <span className="text-sm font-medium">
                {isCheckingLocation ? 'Checking...' : needsReVerification ? 'Re-verify Location' : 'Enable Location'}
              </span>
            </button>
          )}
        </div>
      )}

      {/* Location Prompt Modal */}
      {showLocationPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <MapPinIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {needsReVerification ? 'Location Re-verification Required' : 'Location Access Required'}
                </h3>
              </div>
              <button
                onClick={dismissPrompt}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {needsReVerification 
                  ? 'Your location verification has expired (12 hours). Please re-verify your location to continue gaming.'
                  : 'DropDollar needs your location to verify compliance with gaming regulations and provide location-based features.'
                }
              </p>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-4">
                <div className="flex items-start space-x-3">
                  <ShieldCheckIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-1">
                      Why we need your location:
                    </h4>
                    <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                      <li>• Verify gaming compliance in your region</li>
                      <li>• Provide location-specific tournaments</li>
                      <li>• Ensure fair play and security</li>
                      <li>• Enable location-based features</li>
                    </ul>
                  </div>
                </div>
              </div>

              {isCheckingLocation && (
                <div className="text-center py-4">
                  <div className="inline-flex items-center space-x-2 text-blue-600 dark:text-blue-400">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 dark:border-blue-400"></div>
                    <span className="text-sm font-medium">Getting your location...</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={dismissPrompt}
                className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Not Now
              </button>
                <button
                  onClick={requestLocationPermission}
                  disabled={isCheckingLocation}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-300 hover:scale-105 disabled:scale-100"
                >
                  {isCheckingLocation ? 'Checking...' : needsReVerification ? 'Re-verify Location' : 'Allow Location'}
                </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
