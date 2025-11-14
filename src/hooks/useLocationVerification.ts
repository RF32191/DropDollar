'use client';

import { useState, useEffect } from 'react';
import { ImprovedLocationService } from '@/lib/improvedLocationService';

export function useLocationVerification(isAuthenticated: boolean) {
  const [locationVerified, setLocationVerified] = useState(false);
  const [improvedLocation, setImprovedLocation] = useState<any>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  // Auto-check location when authenticated
  useEffect(() => {
    console.log('🔍 [Location Hook] Auth state:', { isAuthenticated, locationVerified, hasChecked });
    
    if (isAuthenticated && !locationVerified && !improvedLocation && !hasChecked) {
      setHasChecked(true);
      console.log('🌍 [Location Hook] Starting location check...');
      
      // Check if permission is already granted
      if ('permissions' in navigator) {
        navigator.permissions.query({ name: 'geolocation' as PermissionName })
          .then((result) => {
            console.log('📍 [Location Hook] Permission state:', result.state);
            
            if (result.state === 'granted') {
              // Auto-verify if already granted
              setLocationLoading(true);
              ImprovedLocationService.getCurrentLocation()
                .then((location) => {
                  setImprovedLocation(location);
                  setLocationVerified(ImprovedLocationService.isGamingAllowed(location));
                  setShowLocationModal(false);
                  console.log('✅ [Location Hook] Auto-verified location:', location);
                })
                .catch((error) => {
                  console.error('❌ [Location Hook] Auto-verification failed:', error);
                  setShowLocationModal(true);
                })
                .finally(() => setLocationLoading(false));
            } else {
              // Show modal to request permission
              console.log('🔔 [Location Hook] Showing location modal');
              setShowLocationModal(true);
            }
          })
          .catch(() => {
            // Permissions API not supported, show modal
            console.log('🔔 [Location Hook] Permissions API not supported, showing modal');
            setShowLocationModal(true);
          });
      } else {
        // Permissions API not supported, show modal
        console.log('🔔 [Location Hook] Navigator permissions not supported, showing modal');
        setShowLocationModal(true);
      }
    }
  }, [isAuthenticated, locationVerified, improvedLocation, hasChecked]);

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

