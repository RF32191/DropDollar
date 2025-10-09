'use client';

import { useState, useEffect } from 'react';

interface LocationData {
  latitude: number;
  longitude: number;
  city: string;
  state: string;
  country: string;
}

interface LocationStatus {
  status: 'unknown' | 'granted' | 'denied' | 'unavailable';
  data: LocationData | null;
  isLoading: boolean;
}

export function useGlobalLocation(): LocationStatus {
  const [status, setStatus] = useState<LocationStatus>({
    status: 'unknown',
    data: null,
    isLoading: true
  });

  useEffect(() => {
    const checkLocationStatus = async () => {
      try {
        // Check if geolocation is available
        if (!('geolocation' in navigator)) {
          setStatus({
            status: 'unavailable',
            data: null,
            isLoading: false
          });
          return;
        }

        // Check permission status
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        
        if (permission.state === 'granted') {
          // Try to get cached location data
          const cachedLocation = localStorage.getItem('userLocation');
          const cachedPermission = localStorage.getItem('locationPermission');
          
          if (cachedLocation && cachedPermission === 'granted') {
            try {
              const locationData = JSON.parse(cachedLocation);
              setStatus({
                status: 'granted',
                data: locationData,
                isLoading: false
              });
            } catch (error) {
              console.error('Error parsing cached location:', error);
              setStatus({
                status: 'granted',
                data: null,
                isLoading: false
              });
            }
          } else {
            setStatus({
              status: 'granted',
              data: null,
              isLoading: false
            });
          }
        } else if (permission.state === 'denied') {
          setStatus({
            status: 'denied',
            data: null,
            isLoading: false
          });
        } else {
          setStatus({
            status: 'unknown',
            data: null,
            isLoading: false
          });
        }
      } catch (error) {
        console.error('Error checking location status:', error);
        setStatus({
          status: 'unknown',
          data: null,
          isLoading: false
        });
      }
    };

    checkLocationStatus();

    // Listen for permission changes
    const handlePermissionChange = () => {
      checkLocationStatus();
    };

    // Listen for storage changes (when location is updated)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'userLocation' || e.key === 'locationPermission') {
        checkLocationStatus();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Check periodically for permission changes
    const interval = setInterval(checkLocationStatus, 5000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  return status;
}
