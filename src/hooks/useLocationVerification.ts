'use client';

import { useState, useEffect } from 'react';
import { ImprovedLocationService } from '@/lib/improvedLocationService';

export function useLocationVerification(isAuthenticated: boolean) {
  const [locationVerified, setLocationVerified] = useState(false);
  const [improvedLocation, setImprovedLocation] = useState<any>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);

  // Auto-check location on mount if authenticated
  useEffect(() => {
    if (isAuthenticated && !locationVerified && !improvedLocation) {
      // Check if permission is already granted
      if ('permissions' in navigator) {
        navigator.permissions.query({ name: 'geolocation' as PermissionName })
          .then((result) => {
            if (result.state === 'granted') {
              // Auto-verify if already granted
              setLocationLoading(true);
              ImprovedLocationService.getCurrentLocation()
                .then((location) => {
                  setImprovedLocation(location);
                  setLocationVerified(ImprovedLocationService.isGamingAllowed(location));
                  setShowLocationModal(false);
                  console.log('✅ Auto-verified location:', location);
                })
                .catch((error) => {
                  console.error('❌ Auto-verification failed:', error);
                  setShowLocationModal(true);
                })
                .finally(() => setLocationLoading(false));
            } else {
              // Show modal to request permission
              setShowLocationModal(true);
            }
          })
          .catch(() => {
            // Permissions API not supported, show modal
            setShowLocationModal(true);
          });
      } else {
        // Permissions API not supported, show modal
        setShowLocationModal(true);
      }
    }
  }, [isAuthenticated, locationVerified, improvedLocation]);

  // Handle location granted from modal
  const handleLocationGranted = (location: any) => {
    setImprovedLocation(location);
    setLocationVerified(ImprovedLocationService.isGamingAllowed(location));
    setShowLocationModal(false);
    console.log('✅ Location granted:', location);
  };

  // Handle location denied from modal
  const handleLocationDenied = () => {
    setLocationVerified(false);
    setShowLocationModal(true); // Keep modal open until approved
    console.log('❌ Location denied');
  };

  return {
    locationVerified,
    improvedLocation,
    locationLoading,
    showLocationModal,
    handleLocationGranted,
    handleLocationDenied
  };
}

