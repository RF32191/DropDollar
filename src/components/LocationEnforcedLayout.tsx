'use client';

import React, { useState, useEffect } from 'react';
import PersistentLocationGate from './PersistentLocationGate';

interface LocationData {
  latitude: number;
  longitude: number;
  city: string;
  state: string;
  stateCode: string;
  country: string;
  isAllowed: boolean;
}

interface LocationEnforcedLayoutProps {
  children: React.ReactNode;
}

export default function LocationEnforcedLayout({ children }: LocationEnforcedLayoutProps) {
  const [locationVerified, setLocationVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check if location was already verified
  useEffect(() => {
    const verified = sessionStorage.getItem('location_verified');
    const locationData = sessionStorage.getItem('location_data');
    
    if (verified === 'true' && locationData) {
      try {
        const parsed = JSON.parse(locationData);
        if (parsed.isAllowed) {
          setLocationVerified(true);
        }
      } catch (e) {
        console.error('Failed to parse cached location', e);
      }
    }
    
    setIsLoading(false);
  }, []);

  const handleLocationVerified = (location: LocationData) => {
    console.log('✅ Location verified in layout:', location);
    setLocationVerified(true);
    
    // Dispatch custom event for other components
    window.dispatchEvent(new CustomEvent('locationVerified', { 
      detail: location 
    }));
  };

  // Show loading state briefly
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-400 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  // Show location gate if not verified
  if (!locationVerified) {
    return (
      <div className="min-h-screen">
        <PersistentLocationGate onLocationVerified={handleLocationVerified} />
      </div>
    );
  }

  // Location verified - show content
  return <>{children}</>;
}

