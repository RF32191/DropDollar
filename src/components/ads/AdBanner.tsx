'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface Ad {
  id: string;
  campaign_name: string;
  headline: string;
  description: string;
  call_to_action: string;
  destination_url: string;
  image_url: string | null;
  seller_username: string;
}

interface AdBannerProps {
  pageLocation: string; // 'games', 'dashboard', 'tournaments', etc.
  position?: 'top' | 'sidebar' | 'bottom' | 'inline';
  maxAds?: number;
}

export default function AdBanner({ pageLocation, position = 'top', maxAds = 1 }: AdBannerProps) {
  const [ads, setAds] = useState<Ad[]>([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [impressionLogged, setImpressionLogged] = useState<Set<string>>(new Set());

  // Generate session ID for tracking
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

  useEffect(() => {
    loadAds();
  }, [pageLocation]);

  // Rotate ads every 10 seconds
  useEffect(() => {
    if (ads.length > 1) {
      const interval = setInterval(() => {
        setCurrentAdIndex((prev) => (prev + 1) % ads.length);
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [ads.length]);

  // Log impression when ad is viewed
  useEffect(() => {
    if (ads.length > 0 && !impressionLogged.has(currentAd.id)) {
      logImpression(currentAd);
      setImpressionLogged(new Set(impressionLogged).add(currentAd.id));
    }
  }, [currentAdIndex, ads]);

  const loadAds = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.rpc('get_active_ads_for_page', {
        p_page_location: pageLocation
      });

      if (error) {
        console.error('Error loading ads:', error);
        return;
      }

      if (data && data.length > 0) {
        setAds(data.slice(0, maxAds));
      }
    } catch (error) {
      console.error('Error loading ads:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const logImpression = async (ad: Ad) => {
    try {
      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
      const deviceType = /mobile/i.test(userAgent) ? 'mobile' : /tablet/i.test(userAgent) ? 'tablet' : 'desktop';

      await supabase.rpc('log_ad_impression', {
        p_campaign_id: ad.id,
        p_page_location: pageLocation,
        p_session_id: sessionId,
        p_user_agent: userAgent,
        p_device_type: deviceType
      });

      console.log('📊 Ad impression logged:', ad.headline);
    } catch (error) {
      console.error('Error logging impression:', error);
    }
  };

  const handleAdClick = async (ad: Ad, impressionId?: string) => {
    try {
      // Log click (backend will charge tokens)
      if (impressionId) {
        await supabase.rpc('log_ad_click', {
          p_campaign_id: ad.id,
          p_impression_id: impressionId
        });
      }

      // Open destination in new tab
      window.open(ad.destination_url, '_blank', 'noopener,noreferrer');
      
      console.log('🔗 Ad clicked:', ad.headline);
    } catch (error) {
      console.error('Error logging click:', error);
    }
  };

  if (isLoading || ads.length === 0 || dismissed) {
    return null;
  }

  const currentAd = ads[currentAdIndex];

  // Different layouts based on position
  if (position === 'sidebar') {
    return (
      <div className="sticky top-4 space-y-4">
        {ads.map((ad, idx) => (
          <div key={ad.id} className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 backdrop-blur-lg rounded-2xl p-4 border border-purple-500/20 relative group hover:border-purple-500/50 transition-all duration-300">
            <button
              onClick={() => setDismissed(true)}
              className="absolute top-2 right-2 text-gray-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
            
            <div className="text-xs text-purple-300 mb-2 font-semibold">SPONSORED</div>
            
            {ad.image_url && (
              <img
                src={ad.image_url}
                alt={ad.headline}
                className="w-full h-32 object-cover rounded-lg mb-3"
              />
            )}
            
            <h3 className="text-white font-bold text-sm mb-1">{ad.headline}</h3>
            <p className="text-gray-300 text-xs mb-3 line-clamp-2">{ad.description}</p>
            
            <button
              onClick={() => handleAdClick(ad)}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-sm font-bold py-2 rounded-lg transition-all duration-300"
            >
              {ad.call_to_action}
            </button>
            
            <div className="text-xs text-gray-500 mt-2">by {ad.seller_username}</div>
          </div>
        ))}
      </div>
    );
  }

  // Top/Bottom Banner (default)
  return (
    <div className={`w-full ${position === 'top' ? 'mb-6' : 'mt-6'}`}>
      <div className="bg-gradient-to-r from-purple-900/40 via-blue-900/40 to-purple-900/40 backdrop-blur-lg rounded-2xl p-6 border border-purple-500/30 relative group hover:border-purple-500/50 transition-all duration-300 shadow-2xl">
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100 z-10"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
        
        <div className="text-xs text-purple-300 mb-3 font-semibold uppercase tracking-wider">✨ Sponsored</div>
        
        <div className="flex flex-col md:flex-row gap-6 items-center">
          {currentAd.image_url && (
            <img
              src={currentAd.image_url}
              alt={currentAd.headline}
              className="w-full md:w-64 h-40 object-cover rounded-xl border-2 border-purple-500/30"
            />
          )}
          
          <div className="flex-1 flex flex-col justify-center">
            <h2 className="text-2xl md:text-3xl font-black text-white mb-2 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              {currentAd.headline}
            </h2>
            <p className="text-gray-300 text-sm md:text-base mb-4 line-clamp-2">
              {currentAd.description}
            </p>
            
            <div className="flex items-center gap-4">
              <button
                onClick={() => handleAdClick(currentAd)}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold px-8 py-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                {currentAd.call_to_action} →
              </button>
              
              <div className="text-xs text-gray-500">
                by <span className="text-purple-400 font-semibold">{currentAd.seller_username}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Ad rotation indicator */}
        {ads.length > 1 && (
          <div className="flex gap-2 justify-center mt-4">
            {ads.map((_, idx) => (
              <div
                key={idx}
                className={`h-1 rounded-full transition-all duration-300 ${
                  idx === currentAdIndex ? 'w-8 bg-purple-400' : 'w-1 bg-gray-600'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

