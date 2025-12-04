import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import useDeviceDetection, { getAdSize } from '@/hooks/useDeviceDetection';
import { supabase } from '@/lib/supabase/client';

interface Ad {
  id: string;
  headline: string;
  description: string;
  call_to_action: string;
  destination_url: string;
  image_url: string | null;
  seller_username: string;
  is_platform_ad?: boolean;
}

interface AdOverlayProps {
  onAdComplete: () => void;
  onSkip?: () => void;
  duration?: number;
  allowSkip?: boolean;
  skipAfter?: number;
}

export default function AdOverlay({ 
  onAdComplete, 
  onSkip, 
  duration = 10, 
  allowSkip = false, 
  skipAfter = 5 
}: AdOverlayProps) {
  const [timeRemaining, setTimeRemaining] = useState(duration);
  const [canSkip, setCanSkip] = useState(false);
  const [ad, setAd] = useState<Ad | null>(null);
  const [isLoadingAd, setIsLoadingAd] = useState(true);
  const [sessionId] = useState(() => {
    if (typeof window !== 'undefined') {
      let sid = sessionStorage.getItem('ad_session_id');
      if (!sid) {
        sid = Math.random().toString(36).substring(7) + Date.now().toString(36);
        sessionStorage.setItem('ad_session_id', sid);
      }
      return sid;
    }
    return 'server';
  });
  const deviceInfo = useDeviceDetection();
  const adSize = getAdSize(deviceInfo);

  // Fetch a random ad for the games page
  useEffect(() => {
    const fetchAd = async () => {
      try {
        const { data, error } = await supabase.rpc('get_active_ads_for_page', {
          p_page_location: 'games'
        });

        if (error) {
          console.error('❌ [AdOverlay] Error fetching ad:', error);
          setIsLoadingAd(false);
          return;
        }

        if (data && data.length > 0) {
          // Pick a random ad
          const randomAd = data[Math.floor(Math.random() * data.length)];
          setAd(randomAd);
          console.log('📺 [AdOverlay] Loaded ad:', randomAd.headline);

          // Log impression
          const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
          const deviceType = /mobile/i.test(userAgent) ? 'mobile' : /tablet/i.test(userAgent) ? 'tablet' : 'desktop';

          console.log('🎯 [AdOverlay] Logging impression for:', randomAd.id);
          const { data: impressionData, error: impressionError } = await supabase.rpc('log_ad_impression', {
            p_campaign_id: randomAd.id,
            p_page_location: 'games',
            p_session_id: sessionId,
            p_user_agent: userAgent,
            p_device_type: deviceType
          });

          if (impressionError) {
            console.error('❌ [AdOverlay] Error logging impression:', impressionError);
          } else {
            console.log('✅ [AdOverlay] Impression logged, ID:', impressionData);
          }
        } else {
          console.warn('⚠️ [AdOverlay] No ads available');
        }
      } catch (error) {
        console.error('❌ [AdOverlay] Exception fetching ad:', error);
      } finally {
        setIsLoadingAd(false);
      }
    };

    fetchAd();
  }, [sessionId]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onAdComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Enable skip button after specified time
    if (allowSkip && skipAfter < duration) {
      const skipTimer = setTimeout(() => {
        setCanSkip(true);
      }, skipAfter * 1000);

      return () => {
        clearInterval(timer);
        clearTimeout(skipTimer);
      };
    }

    return () => clearInterval(timer);
  }, [duration, allowSkip, skipAfter, onAdComplete]);

  const handleSkip = () => {
    if (canSkip && onSkip) {
      onSkip();
    }
  };

  const handleAdClick = async () => {
    if (!ad) return;

    try {
      console.log('🎯 [AdOverlay] Logging click for:', ad.id);
      
      // Log click
      const { data, error } = await supabase.rpc('log_ad_click', {
        p_campaign_id: ad.id,
        p_impression_id: null
      });

      if (error) {
        console.error('❌ [AdOverlay] RPC Error logging click:', error);
        console.error('❌ [AdOverlay] Error details:', JSON.stringify(error, null, 2));
      } else {
        console.log('✅ [AdOverlay] Click logged, ID:', data);
      }

      // Open destination in new tab
      window.open(ad.destination_url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('❌ [AdOverlay] Exception logging click:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div 
        className={`relative bg-gradient-to-br from-gray-800 via-gray-900 to-black rounded-2xl shadow-2xl border border-gray-700 ${
          deviceInfo.isMobile 
            ? 'w-full max-w-sm max-h-[85vh] p-3' 
            : deviceInfo.isTablet 
              ? 'w-full max-w-md max-h-[80vh] p-6' 
              : 'w-full max-w-2xl max-h-[75vh] p-8'
        } overflow-y-auto`}
      >
        
        {/* Ad Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-white font-medium text-sm sm:text-base">Advertisement</span>
          </div>
          
          {/* Skip Button */}
          {allowSkip && (
            <button
              onClick={handleSkip}
              disabled={!canSkip}
              className={`flex items-center px-2 sm:px-4 py-1 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                canSkip
                  ? 'bg-gray-600 hover:bg-gray-500 text-white cursor-pointer'
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed'
              }`}
            >
              <XMarkIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              <span className="hidden sm:inline">
                {canSkip ? 'Skip Ad' : `Skip in ${skipAfter - (duration - timeRemaining)}`}
              </span>
              <span className="sm:hidden">
                {canSkip ? 'Skip' : `${skipAfter - (duration - timeRemaining)}`}
              </span>
            </button>
          )}
        </div>

        {/* Ad Content - Responsive */}
        <div className="bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-pink-900/20 rounded-xl p-4 sm:p-8 lg:p-12 text-center border border-gray-600">
          
          {isLoadingAd ? (
            /* Loading State */
            <div className="space-y-6 animate-pulse">
              <div className="w-16 h-16 bg-white/10 rounded-lg mx-auto"></div>
              <div className="h-8 bg-white/10 rounded w-3/4 mx-auto"></div>
              <div className="h-4 bg-white/10 rounded w-full mx-auto"></div>
              <div className="h-10 bg-white/10 rounded w-1/2 mx-auto"></div>
            </div>
          ) : ad ? (
            /* Real Ad Content */
            <div className="space-y-3 sm:space-y-6">
              {ad.image_url && (
                <img
                  src={ad.image_url}
                  alt={ad.headline}
                  className="w-full max-h-48 sm:max-h-64 object-cover rounded-xl mb-4"
                />
              )}
              
              {!ad.image_url && (
                <div className="text-4xl sm:text-6xl mb-4">
                  {ad.is_platform_ad ? '🎮' : '🎯'}
                </div>
              )}
              
              <h2 className="text-xl sm:text-3xl lg:text-4xl font-black text-white mb-2 sm:mb-4 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                {ad.headline}
              </h2>
              
              <p className="text-sm sm:text-lg lg:text-xl text-gray-300 mb-4 sm:mb-6 line-clamp-3">
                {ad.description}
              </p>
              
              {/* Call to Action */}
              <div className="mt-6">
                <button
                  onClick={handleAdClick}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-3 px-8 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 text-base sm:text-lg"
                >
                  {ad.call_to_action} →
                </button>
                
                <p className="text-xs text-gray-500 mt-3">
                  by <span className="text-purple-400 font-semibold">{ad.seller_username}</span>
                  {ad.is_platform_ad && <span className="text-blue-400 ml-2">• Platform Ad</span>}
                </p>
              </div>
            </div>
          ) : (
            /* Fallback - No Ads Available */
            <div className="space-y-6">
              <div className="text-4xl sm:text-6xl">🎮</div>
              
              <h2 className="text-xl sm:text-3xl font-bold text-white">
                Ready to Play?
              </h2>
              
              <p className="text-sm sm:text-lg text-gray-300">
                Your game is about to start! Get ready to show your skills.
              </p>
            </div>
          )}
        </div>

        {/* Countdown Timer - Responsive */}
        <div className="mt-3 sm:mt-6 text-center">
          <div className="bg-gradient-to-r from-red-600 to-orange-600 rounded-full px-3 py-2 sm:px-6 sm:py-3 inline-flex items-center space-x-2 sm:space-x-3">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm sm:text-lg">{timeRemaining}</span>
            </div>
            <span className="text-white font-medium text-xs sm:text-base">
              {timeRemaining === 1 ? 'Starting game...' : `Game starts in ${timeRemaining}s`}
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-2 sm:mt-4 w-full max-w-xs sm:max-w-md mx-auto bg-gray-700 rounded-full h-1.5 sm:h-2">
            <div 
              className="bg-gradient-to-r from-red-500 to-orange-500 h-1.5 sm:h-2 rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${((duration - timeRemaining) / duration) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Ad Info - Responsive Text */}
        <div className="mt-2 sm:mt-4 text-center">
          <p className="text-gray-400 text-xs sm:text-sm">
            {deviceInfo.isMobile 
              ? 'Ads keep DropDollar free!' 
              : 'Ads help keep DropDollar free to play. Thank you for your patience!'
            }
          </p>
        </div>
      </div>
    </div>
  );
}
