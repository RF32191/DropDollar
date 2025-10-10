'use client';

import React from 'react';
import LocationCheck, { useLocationCheck } from '@/components/LocationCheck';

/**
 * TEMPLATE FOR FUTURE LISTING PAGES
 * 
 * This template ensures all future listing pages have proper location checking
 * hardcoded and integrated with the global location system.
 * 
 * Copy this template when creating new listing pages.
 */

// Example listing page component
export default function FutureListingPage() {
  const { isLocationVerified, canAccessListings } = useLocationCheck();

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Location Check Wrapper - Hardcoded for all future listings */}
      <LocationCheck
        requireLocation={true}
        fallback={
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center text-white">
              <h2 className="text-2xl font-bold mb-4">Location Verification Required</h2>
              <p className="text-gray-300 mb-6">
                Please enable location access to participate in this listing.
              </p>
              <p className="text-sm text-gray-400">
                Look for the location button in the top-right corner of the page.
              </p>
            </div>
          </div>
        }
      >
        {/* Your listing content goes here */}
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-white mb-8">
            Future Listing Page
          </h1>
          
          {/* Example: Show location status */}
          {isLocationVerified && (
            <div className="bg-green-600 text-white p-4 rounded-lg mb-6">
              ✅ Location verified - You can participate in this listing!
            </div>
          )}
          
          {/* Your listing components */}
          <div className="text-white">
            <p>This is where your listing content would go.</p>
            <p>Location check is automatically handled by the LocationCheck wrapper.</p>
          </div>
        </div>
      </LocationCheck>
    </div>
  );
}

/**
 * ALTERNATIVE: Using the hook directly in components
 */
export function AlternativeListingComponent() {
  const { 
    isLocationVerified, 
    canAccessListings, 
    locationData, 
    isLoading 
  } = useLocationCheck();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white">Loading location status...</div>
      </div>
    );
  }

  if (!isLocationVerified) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-white">
          <h2 className="text-2xl font-bold mb-4">Location Verification Required</h2>
          <p className="text-gray-300">
            Please enable location access to participate in this listing.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-8">
          Alternative Listing Component
        </h1>
        
        {/* Show location info */}
        {locationData && (
          <div className="bg-green-600 text-white p-4 rounded-lg mb-6">
            ✅ Location verified: {locationData.city}, {locationData.state}
          </div>
        )}
        
        {/* Your listing content */}
        <div className="text-white">
          <p>This component uses the hook directly for more control.</p>
          <p>Location check is handled manually in the component.</p>
        </div>
      </div>
    </div>
  );
}

/**
 * HIGHER-ORDER COMPONENT EXAMPLE
 */
export const ProtectedListingPage = withLocationCheck(
  function ListingContent() {
    return (
      <div className="min-h-screen bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-white mb-8">
            Protected Listing Page
          </h1>
          <div className="text-white">
            <p>This page is automatically protected by the HOC.</p>
            <p>No manual location checking needed!</p>
          </div>
        </div>
      </div>
    );
  },
  {
    requireLocation: true,
    fallback: (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-white">
          <h2 className="text-2xl font-bold mb-4">Location Required</h2>
          <p className="text-gray-300">Please enable location access.</p>
        </div>
      </div>
    )
  }
);
