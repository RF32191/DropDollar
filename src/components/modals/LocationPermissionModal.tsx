'use client';

import { useState, useEffect } from 'react';
import { 
  MapPinIcon, 
  ExclamationTriangleIcon, 
  CheckCircleIcon,
  ShieldCheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface LocationPermissionModalProps {
  isOpen: boolean;
  onLocationGranted: (location: any) => void;
  onLocationDenied: () => void;
}

export default function LocationPermissionModal({
  isOpen,
  onLocationGranted,
  onLocationDenied
}: LocationPermissionModalProps) {
  const [status, setStatus] = useState<'requesting' | 'checking' | 'error' | 'denied'>('requesting');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    // Auto-check permission status on mount
    if (isOpen && 'permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((result) => {
        if (result.state === 'granted') {
          // Permission already granted, get location immediately
          handleRequestLocation();
        } else if (result.state === 'denied') {
          setStatus('denied');
        }
      }).catch(() => {
        // Permissions API not supported, stay in requesting state
      });
    }
  }, [isOpen]);

  const handleRequestLocation = async () => {
    setIsChecking(true);
    setStatus('checking');
    setErrorMessage('');

    try {
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by your browser');
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude, accuracy } = position.coords;
            
            // Reverse geocode to get location details
            const response = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
            );
            
            if (!response.ok) {
              throw new Error('Unable to verify location');
            }

            const data = await response.json();
            
            const locationData = {
              city: data.city || data.locality || 'Unknown',
              state: data.principalSubdivision || 'Unknown',
              stateCode: data.principalSubdivisionCode || 'Unknown',
              country: data.countryName || 'Unknown',
              countryCode: data.countryCode || 'Unknown',
              latitude,
              longitude,
              accuracy,
              timestamp: Date.now()
            };

            console.log('📍 Location verified:', locationData);
            onLocationGranted(locationData);
          } catch (error) {
            console.error('❌ Reverse geocoding failed:', error);
            setStatus('error');
            setErrorMessage('Unable to verify your location. Please try again.');
          } finally {
            setIsChecking(false);
          }
        },
        (error) => {
          console.error('❌ Geolocation error:', error);
          setIsChecking(false);
          
          if (error.code === error.PERMISSION_DENIED) {
            setStatus('denied');
            setErrorMessage('Location permission denied. You must allow location access to play skill-based games.');
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            setStatus('error');
            setErrorMessage('Location information unavailable. Please check your device settings.');
          } else if (error.code === error.TIMEOUT) {
            setStatus('error');
            setErrorMessage('Location request timed out. Please try again.');
          } else {
            setStatus('error');
            setErrorMessage('Unable to determine your location. Please try again.');
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        }
      );
    } catch (error) {
      console.error('❌ Location request failed:', error);
      setIsChecking(false);
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unable to access location services');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
      
      {/* Modal */}
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl border border-gray-700 max-w-lg w-full p-8">
          
          {/* Header Icon */}
          <div className="flex justify-center mb-6">
            <div className="bg-blue-500/20 rounded-full p-4">
              <MapPinIcon className="w-16 h-16 text-blue-400" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-3xl font-bold text-center text-white mb-4">
            Location Verification Required
          </h2>

          {/* Status-based content */}
          {status === 'requesting' && (
            <>
              <p className="text-gray-300 text-center mb-6">
                To comply with skill-based gaming regulations, we need to verify your location.
              </p>

              {/* Legal Requirements */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6">
                <div className="flex items-start">
                  <ShieldCheckIcon className="w-6 h-6 text-blue-400 mr-3 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-blue-300 mb-2">Why We Need This:</h3>
                    <ul className="text-xs text-gray-300 space-y-1">
                      <li>• Verify you're located in the United States</li>
                      <li>• Ensure compliance with state gaming laws</li>
                      <li>• Confirm you're in an eligible state for skill-based contests</li>
                      <li>• Protect against fraud and unauthorized access</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Privacy Notice */}
              <div className="bg-gray-700/30 rounded-lg p-3 mb-6">
                <p className="text-xs text-gray-400 text-center">
                  🔒 Your location data is encrypted and used only for compliance verification. We do not sell or share your location information.
                </p>
              </div>

              {/* Action Button */}
              <button
                onClick={handleRequestLocation}
                disabled={isChecking}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isChecking ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                    <span>Verifying Location...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <MapPinIcon className="w-5 h-5 mr-2" />
                    <span>Allow Location Access</span>
                  </div>
                )}
              </button>
            </>
          )}

          {status === 'checking' && (
            <>
              <div className="flex flex-col items-center justify-center py-8">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-400 mb-4"></div>
                <p className="text-blue-300 text-lg font-semibold">Verifying Your Location...</p>
                <p className="text-gray-400 text-sm mt-2">This may take a few seconds</p>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="flex flex-col items-center justify-center py-6">
                <div className="bg-red-500/20 rounded-full p-4 mb-4">
                  <ExclamationTriangleIcon className="w-12 h-12 text-red-400" />
                </div>
                <p className="text-red-300 text-center font-semibold mb-2">Location Verification Failed</p>
                <p className="text-gray-400 text-sm text-center mb-6">{errorMessage}</p>
                
                <button
                  onClick={handleRequestLocation}
                  disabled={isChecking}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300"
                >
                  Try Again
                </button>
              </div>
            </>
          )}

          {status === 'denied' && (
            <>
              <div className="flex flex-col items-center justify-center py-6">
                <div className="bg-red-500/20 rounded-full p-4 mb-4">
                  <XMarkIcon className="w-12 h-12 text-red-400" />
                </div>
                <p className="text-red-300 text-center font-semibold mb-2">Location Permission Denied</p>
                <p className="text-gray-400 text-sm text-center mb-4">{errorMessage || 'You must allow location access to participate in skill-based gaming contests.'}</p>
                
                {/* Instructions */}
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6 w-full">
                  <h4 className="text-sm font-semibold text-yellow-300 mb-2">To Enable Location:</h4>
                  <ol className="text-xs text-gray-300 space-y-1 list-decimal list-inside">
                    <li>Click the lock icon in your browser's address bar</li>
                    <li>Find "Location" in the permissions list</li>
                    <li>Change it to "Allow"</li>
                    <li>Refresh the page and try again</li>
                  </ol>
                </div>

                <button
                  onClick={() => {
                    setStatus('requesting');
                    setErrorMessage('');
                  }}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300"
                >
                  Try Again
                </button>
              </div>
            </>
          )}

          {/* Excluded States Notice */}
          <div className="mt-6 pt-6 border-t border-gray-700">
            <p className="text-xs text-gray-500 text-center mb-2">
              ⚠️ Skill-based gaming is not available in: AZ, AR, CT, DE, LA, MT, SC, SD, TN, WA
            </p>
            <p className="text-xs text-gray-600 text-center">
              Must be 18+ and located in the United States
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
