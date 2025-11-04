'use client';

import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  MapPinIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

interface LocationBannerProps {
  isLoading: boolean;
  location: any;
  isVerified: boolean;
  className?: string;
}

export default function LocationBanner({ 
  isLoading, 
  location, 
  isVerified,
  className = ''
}: LocationBannerProps) {
  return (
    <div className={`mb-6 p-6 rounded-xl backdrop-blur-xl border ${
      isLoading
        ? 'bg-blue-500/20 border-blue-500/50'
        : location && isVerified
          ? 'bg-green-500/20 border-green-500/50' 
          : 'bg-red-500/20 border-red-500/50'
    } ${className}`}>
      <div className="flex items-center justify-center flex-wrap gap-2">
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
            <span className="text-blue-300 text-lg font-semibold">Verifying Location...</span>
          </>
        ) : location && isVerified ? (
          <>
            <CheckCircleIcon className="w-6 h-6 text-green-400 flex-shrink-0" />
            <span className="text-green-300 text-lg font-semibold">Location Verified - Gaming Allowed</span>
            <span className="text-green-200 text-sm">
              ({location.city}, {location.state})
            </span>
          </>
        ) : (
          <>
            <ExclamationTriangleIcon className="w-6 h-6 text-red-400 flex-shrink-0" />
            <span className="text-red-300 text-lg font-semibold">Gaming Not Allowed in Your Location</span>
            {location && (
              <span className="text-red-200 text-sm">
                ({location?.city || 'Unknown'}, {location?.state || 'Unknown'})
              </span>
            )}
          </>
        )}
      </div>
      
      {/* Terms Notice */}
      <div className="mt-3 pt-3 border-t border-white/10">
        <div className="flex items-start gap-2 text-xs text-gray-300">
          <ShieldCheckIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="mb-1">
              <strong>Legal Compliance:</strong> Location verification is required for all skill-based gaming contests.
            </p>
            <p className="text-gray-400">
              ⚠️ Not available in: AZ, AR, CT, DE, LA, MT, SC, SD, TN, WA • Must be 18+ and in the United States
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

