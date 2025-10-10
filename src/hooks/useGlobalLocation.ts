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
  status: 'unknown' | 'granted' | 'denied' | 'unavailable' | 'restricted';
  data: LocationData | null;
  isLoading: boolean;
  isGamingAllowed: boolean;
  requestLocation: () => void;
}

export function useGlobalLocation(): LocationStatus {
  const [status, setStatus] = useState<LocationStatus>({
    status: 'unknown',
    data: null,
    isLoading: true,
    isGamingAllowed: false,
    requestLocation: () => {}
  });

  // Check if gaming is allowed in the user's state
  const checkGamingAllowed = (state: string): boolean => {
    const stateLower = state.toLowerCase();
    
    // All US states are now allowed for skill-based gaming
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

    return allowedStates.includes(stateLower);
  };

  // Request location permission and get coordinates
  const requestLocation = () => {
    if (!('geolocation' in navigator)) {
      setStatus(prev => ({
        ...prev,
        status: 'unavailable',
        isLoading: false
      }));
      return;
    }

    setStatus(prev => ({ ...prev, isLoading: true }));

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          // Get location data using reverse geocoding
          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}&localityLanguage=en`
          );
          const data = await response.json();
          
          const locationData: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            city: data.city || data.locality || 'Unknown',
            state: data.principalSubdivision || 'Unknown',
            country: data.countryName || 'Unknown'
          };

          const isAllowed = checkGamingAllowed(locationData.state);
          
          // Cache location data for 4 hours
          const cacheData = {
            ...locationData,
            timestamp: Date.now(),
            isGamingAllowed: isAllowed
          };
          
          localStorage.setItem('userLocation', JSON.stringify(cacheData));
          localStorage.setItem('locationPermission', 'granted');
          localStorage.setItem('locationTimestamp', Date.now().toString());

          setStatus({
            status: isAllowed ? 'granted' : 'restricted',
            data: locationData,
            isLoading: false,
            isGamingAllowed: isAllowed,
            requestLocation
          });
        } catch (error) {
          console.error('Error getting location data:', error);
          setStatus(prev => ({
            ...prev,
            status: 'granted',
            data: null,
            isLoading: false,
            isGamingAllowed: false
          }));
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        setStatus(prev => ({
          ...prev,
          status: 'denied',
          isLoading: false
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  };

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
          // Try to get cached location data (4-hour cache)
          const cachedLocation = localStorage.getItem('userLocation');
          const cachedPermission = localStorage.getItem('locationPermission');
          const cachedTimestamp = localStorage.getItem('locationTimestamp');
          
          if (cachedLocation && cachedPermission === 'granted' && cachedTimestamp) {
            try {
              const locationData = JSON.parse(cachedLocation);
              const timestamp = parseInt(cachedTimestamp);
              const fourHours = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
              
              // Check if cache is still valid (within 4 hours)
              if (Date.now() - timestamp < fourHours) {
                const isAllowed = locationData.isGamingAllowed || checkGamingAllowed(locationData.state);
                setStatus({
                  status: isAllowed ? 'granted' : 'restricted',
                  data: locationData,
                  isLoading: false,
                  isGamingAllowed: isAllowed,
                  requestLocation
                });
                return;
              }
            } catch (error) {
              console.error('Error parsing cached location:', error);
            }
          }
          
          // No valid cache, but permission is granted - try to get location
          setStatus({
            status: 'granted',
            data: null,
            isLoading: true,
            isGamingAllowed: false,
            requestLocation
          });
          
          // Automatically request location if permission is granted but no cache
          requestLocation();
        } else if (permission.state === 'denied') {
          setStatus({
            status: 'denied',
            data: null,
            isLoading: false,
            isGamingAllowed: false,
            requestLocation
          });
        } else {
          setStatus({
            status: 'unknown',
            data: null,
            isLoading: false,
            isGamingAllowed: false,
            requestLocation
          });
        }
      } catch (error) {
        console.error('Error checking location status:', error);
        setStatus({
          status: 'unknown',
          data: null,
          isLoading: false,
          isGamingAllowed: false,
          requestLocation
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
