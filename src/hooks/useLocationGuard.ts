'use client';

import { useState, useEffect, useCallback } from 'react';
import { LocationService, type LocationData } from '@/lib/locationService';

export interface LocationGuardState {
  isLoading: boolean;
  isAllowed: boolean;
  location: LocationData | null;
  error: string | null;
  needsPermission: boolean;
  hasChecked: boolean;
}

export function useLocationGuard() {
  const [state, setState] = useState<LocationGuardState>({
    isLoading: false,
    isAllowed: false,
    location: null,
    error: null,
    needsPermission: true,
    hasChecked: false
  });

  // Check if location verification is needed
  const checkLocationStatus = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Check if we have stored location data
      const storedLocation = LocationService.getStoredLocation();
      const hasPermission = LocationService.hasLocationPermission();

      if (storedLocation && hasPermission) {
        // We have valid location data
        setState({
          isLoading: false,
          isAllowed: storedLocation.isAllowed,
          location: storedLocation,
          error: storedLocation.isAllowed ? null : storedLocation.restrictionReason || 'Location not allowed',
          needsPermission: false,
          hasChecked: true
        });
      } else {
        // Need to request permission
        setState(prev => ({
          ...prev,
          isLoading: false,
          needsPermission: true,
          hasChecked: true
        }));
      }
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to check location status',
        hasChecked: true
      }));
    }
  }, []);

  // Request location permission
  const requestPermission = useCallback(async (): Promise<{
    success: boolean;
    location?: LocationData;
    error?: string;
  }> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await LocationService.requestLocationPermission();

      if (result.granted && result.location) {
        setState({
          isLoading: false,
          isAllowed: result.location.isAllowed,
          location: result.location,
          error: result.location.isAllowed ? null : result.location.restrictionReason || 'Location not allowed',
          needsPermission: false,
          hasChecked: true
        });

        return {
          success: result.location.isAllowed,
          location: result.location,
          error: result.location.isAllowed ? undefined : result.location.restrictionReason
        };
      } else {
        const errorMessage = result.error || 'Location permission denied';
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
          needsPermission: true
        }));

        return {
          success: false,
          error: errorMessage
        };
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to request location permission';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        needsPermission: true
      }));

      return {
        success: false,
        error: errorMessage
      };
    }
  }, []);

  // Clear location data (for testing or privacy)
  const clearLocation = useCallback(() => {
    LocationService.clearStoredLocation();
    setState({
      isLoading: false,
      isAllowed: false,
      location: null,
      error: null,
      needsPermission: true,
      hasChecked: false
    });
  }, []);

  // Check if location needs reverification
  const needsReverification = useCallback((): boolean => {
    return LocationService.needsLocationReverification();
  }, []);

  // Get compliance message
  const getComplianceMessage = useCallback((): string => {
    return LocationService.getComplianceMessage(state.location || undefined);
  }, [state.location]);

  // Initialize location check on mount
  useEffect(() => {
    checkLocationStatus();
  }, [checkLocationStatus]);

  return {
    ...state,
    requestPermission,
    clearLocation,
    checkLocationStatus,
    needsReverification,
    getComplianceMessage
  };
}

// Hook specifically for game access control
export function useGameLocationGuard() {
  const locationGuard = useLocationGuard();
  
  // Check if user can access games
  const canAccessGames = useCallback((): boolean => {
    return locationGuard.hasChecked && 
           !locationGuard.needsPermission && 
           locationGuard.isAllowed;
  }, [locationGuard.hasChecked, locationGuard.needsPermission, locationGuard.isAllowed]);

  // Check if user needs location modal before game
  const needsLocationModal = useCallback((): boolean => {
    return !locationGuard.hasChecked || locationGuard.needsPermission;
  }, [locationGuard.hasChecked, locationGuard.needsPermission]);

  // Get blocking reason for games
  const getBlockingReason = useCallback((): string | null => {
    if (locationGuard.isLoading) return 'Checking location...';
    if (locationGuard.needsPermission) return 'Location verification required';
    if (!locationGuard.isAllowed) return locationGuard.error || 'Location not allowed';
    return null;
  }, [locationGuard.isLoading, locationGuard.needsPermission, locationGuard.isAllowed, locationGuard.error]);

  return {
    ...locationGuard,
    canAccessGames,
    needsLocationModal,
    getBlockingReason
  };
}
