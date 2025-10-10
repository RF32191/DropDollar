'use client';

import React from 'react';
import { useGlobalLocation } from '@/hooks/useGlobalLocation';

interface LocationCheckProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireLocation?: boolean;
}

/**
 * LocationCheck component - Hardcoded for all future listings
 * 
 * This component ensures that users can only access listing features
 * when their location is verified via the global location system.
 * 
 * Usage:
 * <LocationCheck>
 *   <YourListingComponent />
 * </LocationCheck>
 */
export default function LocationCheck({ 
  children, 
  fallback = null, 
  requireLocation = true 
}: LocationCheckProps) {
  const globalLocation = useGlobalLocation();

  // If location is not required, always show children
  if (!requireLocation) {
    return <>{children}</>;
  }

  // If location is granted, show children
  if (globalLocation.status === 'granted') {
    return <>{children}</>;
  }

  // If location is denied or unknown, show fallback or nothing
  return <>{fallback}</>;
}

/**
 * Hook for checking location status in components
 * Hardcoded for all future listings
 */
export function useLocationCheck() {
  const globalLocation = useGlobalLocation();

  return {
    isLocationVerified: globalLocation.status === 'granted',
    locationData: globalLocation.data,
    locationStatus: globalLocation.status,
    isLoading: globalLocation.isLoading,
    canAccessListings: globalLocation.status === 'granted',
    canAccessGames: globalLocation.status === 'granted',
    canAccessTournaments: globalLocation.status === 'granted',
    canAccessHotSell: globalLocation.status === 'granted',
  };
}

/**
 * Higher-order component for protecting listing pages
 * Hardcoded for all future listings
 */
export function withLocationCheck<P extends object>(
  Component: React.ComponentType<P>,
  options: { requireLocation?: boolean; fallback?: React.ReactNode } = {}
) {
  const { requireLocation = true, fallback = null } = options;

  return function LocationCheckedComponent(props: P) {
    return (
      <LocationCheck requireLocation={requireLocation} fallback={fallback}>
        <Component {...props} />
      </LocationCheck>
    );
  };
}
