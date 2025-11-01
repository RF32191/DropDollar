'use client';

import React, { useState, useEffect } from 'react';
import { MapPinIcon, ShieldCheckIcon, ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useGlobalLocation } from '@/hooks/useGlobalLocation';

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
  const globalLocation = useGlobalLocation();
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [isCheckingLocation, setIsCheckingLocation] = useState(false);
  const [showConfirmationBanner, setShowConfirmationBanner] = useState(false);
  const [confirmationType, setConfirmationType] = useState<'success' | 'denied' | null>(null);
  const [confirmationMessage, setConfirmationMessage] = useState('');

  // Debug logging
  useEffect(() => {
    console.log('🔍 GlobalLocationCheck - Status changed:', {
      status: globalLocation.status,
      data: globalLocation.data,
      isLoading: globalLocation.isLoading,
      isGamingAllowed: globalLocation.isGamingAllowed
    });
  }, [globalLocation.status, globalLocation.data, globalLocation.isLoading, globalLocation.isGamingAllowed]);

  // Update body class when location banner is shown
  useEffect(() => {
    if (globalLocation.status === 'granted' && globalLocation.data) {
      document.body.setAttribute('data-location-banner', 'true');
    } else {
      document.body.removeAttribute('data-location-banner');
    }
    
    return () => {
      document.body.removeAttribute('data-location-banner');
    };
  }, [globalLocation.status, globalLocation.data]);

  // Handle location verification success
  useEffect(() => {
    if (globalLocation.status === 'granted' && globalLocation.data) {
      if (globalLocation.isGamingAllowed) {
        // Show success banner for approved states
        setConfirmationType('success');
        setConfirmationMessage(`✅ Location verified! Gaming allowed in ${globalLocation.data.state}. You can now participate in competitions.`);
        setShowConfirmationBanner(true);
        
        // Hide banner after 30 seconds
        setTimeout(() => {
          setShowConfirmationBanner(false);
        }, 30000);
        
        onLocationVerified?.();
      } else {
        // Show denied banner for restricted states
        setConfirmationType('denied');
        setConfirmationMessage(`❌ Gaming not allowed in ${globalLocation.data.state}. Skill-based gaming is restricted in your location.`);
        setShowConfirmationBanner(true);
        
        // Hide banner after 30 seconds
        setTimeout(() => {
          setShowConfirmationBanner(false);
        }, 30000);
      }
    } else if (globalLocation.status === 'denied') {
      // Show denied banner for denied permission
      setConfirmationType('denied');
      setConfirmationMessage('❌ Location access denied. Some features may be unavailable.');
      setShowConfirmationBanner(true);
      
      // Hide banner after 30 seconds
      setTimeout(() => {
        setShowConfirmationBanner(false);
      }, 30000);
      
      onLocationDenied?.();
    }
  }, [globalLocation.status, globalLocation.isGamingAllowed, globalLocation.data, onLocationVerified, onLocationDenied]);

  const requestLocationPermission = async () => {
    setIsCheckingLocation(true);
    setShowLocationPrompt(true);
    
    try {
      await globalLocation.requestLocation();
    } catch (error) {
      console.error('Location request failed:', error);
    } finally {
      setIsCheckingLocation(false);
      setTimeout(() => setShowLocationPrompt(false), 2000);
    }
  };

  const dismissPrompt = () => {
    setShowLocationPrompt(false);
    onLocationDenied?.();
  };

  // Don't show anything if unavailable
  if (globalLocation.status === 'unavailable') {
    return null;
  }

  // Show banner when location is granted and we have data
  if (globalLocation.status === 'granted' && globalLocation.data) {
    return (
      <div className={`fixed top-0 left-0 right-0 z-50 ${className}`}>
        {/* Top Location Confirmation Banner */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg border-b-2 border-green-500">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <ShieldCheckIcon className="h-5 w-5 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold">
                    ✅ LOCATION VERIFIED: {globalLocation.data.city}, {globalLocation.data.state}
                  </span>
                  <span className="text-xs opacity-90">
                    {globalLocation.isGamingAllowed 
                      ? `✅ Gaming allowed in ${globalLocation.data.state}! You can participate in skill-based competitions.`
                      : `⚠️ Gaming restrictions may apply in ${globalLocation.data.state}. Please check local regulations.`
                    }
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs bg-white/20 px-2 py-1 rounded-full font-medium">
                  🎮 GAMING ENABLED
                </span>
                <button
                  onClick={() => {
                    // Hide the banner by updating the global location state
                    globalLocation.clearLocation();
                  }}
                  className="text-white/80 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
                  title="Hide location banner"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 ${className}`}>
      {/* 10-Second Confirmation Banner */}
      {showConfirmationBanner && (
        <div className={`${confirmationType === 'success' 
          ? 'bg-gradient-to-r from-green-600 to-emerald-600 border-green-500' 
          : 'bg-gradient-to-r from-red-600 to-red-700 border-red-500'
        } text-white shadow-lg border-b-2`}>
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  {confirmationType === 'success' ? (
                    <ShieldCheckIcon className="h-5 w-5 text-white" />
                  ) : (
                    <ExclamationTriangleIcon className="h-5 w-5 text-white" />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold">
                    {confirmationMessage}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowConfirmationBanner(false)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Location Request Button - Only show when not granted */}
      {globalLocation.status !== 'granted' && (
        <div className="fixed top-32 left-4 z-40">
          {globalLocation.status === 'denied' && (
            <div className="bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg mb-2 flex items-center space-x-2">
              <ExclamationTriangleIcon className="h-5 w-5" />
              <span className="text-sm font-medium">Location access denied</span>
            </div>
          )}

          {(globalLocation.status === 'unknown' || globalLocation.isLoading) && (
            <button
              onClick={requestLocationPermission}
              disabled={globalLocation.isLoading || isCheckingLocation}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white px-4 py-2 rounded-lg shadow-lg transition-all duration-300 hover:scale-105 disabled:scale-100 flex items-center space-x-2"
            >
              <MapPinIcon className="h-5 w-5" />
              <span className="text-sm font-medium">
                {globalLocation.isLoading || isCheckingLocation ? 'Checking...' : 'Enable Location'}
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
                  Location Access Required
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
                DropDollar needs your location to verify compliance with gaming regulations and provide location-based features. Your location will be cached for 4 hours.
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

              {(globalLocation.isLoading || isCheckingLocation) && (
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
                disabled={globalLocation.isLoading || isCheckingLocation}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-300 hover:scale-105 disabled:scale-100"
              >
                {globalLocation.isLoading || isCheckingLocation ? 'Checking...' : 'Allow Location'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
