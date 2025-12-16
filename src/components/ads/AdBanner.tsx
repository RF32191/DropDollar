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
  is_platform_ad?: boolean; // True for platform ads (free), false for paid seller ads
}

type AdBannerVariant = 'default' | 'hot-sell' | 'winner-takes-all' | '1v1' | 'coin-play' | 'rewards' | 'rp-shop';

interface AdBannerProps {
  pageLocation?: string; // 'games', 'dashboard', 'tournaments', etc.
  position?: 'top' | 'sidebar' | 'bottom' | 'inline';
  maxAds?: number;
  variant?: AdBannerVariant;
}

export default function AdBanner({ pageLocation, position = 'top', maxAds = 3, variant }: AdBannerProps) {
  // Determine variant from pageLocation if not provided
  const bannerVariant = variant || (pageLocation === 'hot-sell' ? 'hot-sell' :
    pageLocation === 'winner-takes-all' ? 'winner-takes-all' :
    pageLocation === '1v1' || pageLocation === 'tournaments/1v1' ? '1v1' :
    pageLocation === 'coin-play' ? 'coin-play' :
    pageLocation === 'rewards' ? 'rewards' :
    pageLocation === 'rp-shop' ? 'rp-shop' : 'default');
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
    const currentAd = ads[currentAdIndex];
    if (currentAd && !impressionLogged.has(currentAd.id)) {
      logImpression(currentAd);
      setImpressionLogged(new Set(impressionLogged).add(currentAd.id));
    }
  }, [currentAdIndex, ads, impressionLogged]);

  const loadAds = async () => {
    try {
      setIsLoading(true);
      console.log(`🎯 [AdBanner] Loading ads for page: ${pageLocation}`);
      
      const { data, error } = await supabase.rpc('get_active_ads_for_page', {
        p_page_location: pageLocation
      });

      if (error) {
        console.error('❌ [AdBanner] Error loading ads:', error);
        return;
      }

      console.log(`✅ [AdBanner] Received ${data?.length || 0} ads from database`);
      
      if (data && data.length > 0) {
        const adsToShow = data.slice(0, maxAds);
        setAds(adsToShow);
        
        const paidCount = adsToShow.filter((a: Ad) => !a.is_platform_ad).length;
        const platformCount = adsToShow.filter((a: Ad) => a.is_platform_ad).length;
        
        console.log(`📺 [AdBanner] Displaying ${adsToShow.length} ads (${paidCount} paid, ${platformCount} platform):`);
        adsToShow.forEach((a: Ad) => {
          console.log(`   ${a.is_platform_ad ? '🆓' : '💰'} ${a.headline}`);
        });
      } else {
        console.log('⚠️ [AdBanner] No ads available for this page');
      }
    } catch (error) {
      console.error('❌ [AdBanner] Exception loading ads:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const logImpression = async (ad: Ad) => {
    try {
      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
      const deviceType = /mobile/i.test(userAgent) ? 'mobile' : /tablet/i.test(userAgent) ? 'tablet' : 'desktop';
      const adType = ad.is_platform_ad ? '[PLATFORM]' : '[PAID]';

      console.log(`🎯 [AdBanner] Logging impression for campaign: ${ad.id}`);
      console.log(`🎯 [AdBanner] Page: ${pageLocation}, Session: ${sessionId}`);

      const { data, error } = await supabase.rpc('log_ad_impression', {
        p_campaign_id: ad.id,
        p_page_location: pageLocation,
        p_session_id: sessionId,
        p_user_agent: userAgent,
        p_device_type: deviceType
      });

      if (error) {
        console.error('❌ [AdBanner] RPC Error logging impression:', error);
        console.error('❌ [AdBanner] Error details:', JSON.stringify(error, null, 2));
        return;
      }

      console.log(`✅ ${adType} Ad impression logged successfully:`, ad.headline);
      console.log(`✅ Impression ID:`, data);
    } catch (error) {
      console.error('❌ [AdBanner] Exception logging impression:', error);
    }
  };

  const handleAdClick = async (ad: Ad, impressionId?: string) => {
    try {
      const adType = ad.is_platform_ad ? '[PLATFORM]' : '[PAID]';
      
      console.log(`🎯 [AdBanner] Logging click for campaign: ${ad.id}`);
      
      // Log click (backend will charge tokens for paid ads only)
      const { data, error } = await supabase.rpc('log_ad_click', {
        p_campaign_id: ad.id,
        p_impression_id: impressionId || null
      });

      if (error) {
        console.error('❌ [AdBanner] RPC Error logging click:', error);
        console.error('❌ [AdBanner] Error details:', JSON.stringify(error, null, 2));
      } else {
        console.log(`✅ ${adType} Ad click logged successfully:`, ad.headline);
        console.log(`✅ Click ID:`, data);
      }

      // Open destination in new tab
      window.open(ad.destination_url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('❌ [AdBanner] Exception logging click:', error);
    }
  };

  // If dismissed, don't show anything
  if (dismissed) {
    return null;
  }

  // Define color schemes for each variant
  const colorSchemes = {
    'default': {
      bg: 'from-purple-900/40 via-blue-900/40 to-purple-900/40',
      border: 'border-purple-500/30',
      text: 'text-purple-300',
      button: 'from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500',
      loading: 'from-purple-900/20 via-blue-900/20 to-purple-900/20'
    },
    'hot-sell': {
      bg: 'from-red-900/40 via-orange-900/40 to-red-900/40',
      border: 'border-red-500/40',
      text: 'text-red-300',
      button: 'from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500',
      loading: 'from-red-900/20 via-orange-900/20 to-red-900/20'
    },
    'winner-takes-all': {
      bg: 'from-yellow-900/40 via-amber-900/40 to-yellow-900/40',
      border: 'border-yellow-500/40',
      text: 'text-yellow-300',
      button: 'from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500',
      loading: 'from-yellow-900/20 via-amber-900/20 to-yellow-900/20'
    },
    '1v1': {
      bg: 'from-purple-900/40 via-indigo-900/40 to-purple-900/40',
      border: 'border-purple-500/40',
      text: 'text-purple-300',
      button: 'from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500',
      loading: 'from-purple-900/20 via-indigo-900/20 to-purple-900/20'
    },
    'coin-play': {
      bg: 'from-amber-900/40 via-yellow-900/40 to-amber-900/40',
      border: 'border-amber-500/40',
      text: 'text-amber-300',
      button: 'from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500',
      loading: 'from-amber-900/20 via-yellow-900/20 to-amber-900/20'
    },
    'rewards': {
      bg: 'from-purple-900/40 via-pink-900/40 to-indigo-900/40',
      border: 'border-purple-500/40',
      text: 'text-purple-300',
      button: 'from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500',
      loading: 'from-purple-900/20 via-pink-900/20 to-indigo-900/20'
    },
    'rp-shop': {
      bg: 'from-blue-900/40 via-cyan-900/40 to-indigo-900/40',
      border: 'border-blue-500/40',
      text: 'text-blue-300',
      button: 'from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500',
      loading: 'from-blue-900/20 via-cyan-900/20 to-indigo-900/20'
    }
  };

  const colors = colorSchemes[bannerVariant];

  // If loading, show a subtle loading state
  if (isLoading) {
    return (
      <div className={`w-full ${position === 'top' ? 'mb-6' : 'mt-6'}`}>
        <div className={`bg-gradient-to-r ${colors.loading} backdrop-blur-lg rounded-2xl p-6 border ${colors.border} animate-pulse`}>
          <div className="h-8 bg-white/10 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-white/10 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  // If no ads, show default "Become a Seller" banner
  if (ads.length === 0) {
    return (
      <div className={`w-full ${position === 'top' ? 'mb-6' : 'mt-6'}`}>
        <div className={`bg-gradient-to-r ${colors.bg} rounded-2xl p-6 border ${colors.border} shadow-2xl`}>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-left">
              <div className="text-4xl">🚀</div>
              <div>
                <h3 className="text-xl font-bold text-white mb-1">Advertise Your Brand Here!</h3>
                <p className="text-purple-100 text-sm">
                  Reach thousands of skilled gamers • Premium placement • High engagement
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <a
                href="/seller/apply"
                className="bg-white hover:bg-purple-50 text-purple-600 font-bold px-6 py-3 rounded-xl transition-all duration-300 shadow-lg whitespace-nowrap"
              >
                🏪 Become a Seller
              </a>
              <a
                href="/advertising/register"
                className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white font-bold px-6 py-3 rounded-xl transition-all duration-300 shadow-lg whitespace-nowrap"
              >
                📢 Create Ad
              </a>
            </div>
          </div>
        </div>
      </div>
    );
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
      <div className={`bg-gradient-to-r ${colors.bg} backdrop-blur-lg rounded-2xl p-6 border ${colors.border} relative group hover:${colors.border.replace('/30', '/50').replace('/40', '/60')} transition-all duration-300 shadow-2xl hover:scale-[1.01]`}>
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100 z-10"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
        
        <div className={`text-xs ${colors.text} mb-3 font-semibold uppercase tracking-wider`}>✨ Sponsored</div>
        
        <div className="flex flex-col md:flex-row gap-6 items-center">
          {currentAd.image_url && (
            <img
              src={currentAd.image_url}
              alt={currentAd.headline}
              className="w-full md:w-64 h-40 object-cover rounded-xl border-2 border-purple-500/30"
            />
          )}
          
          <div className="flex-1 flex flex-col justify-center">
            <h2 className={`text-2xl md:text-3xl font-black text-white mb-2 bg-gradient-to-r ${colors.button.replace('from-', 'from-').replace('to-', 'to-').replace('hover:', '')} bg-clip-text text-transparent`}>
              {currentAd.headline}
            </h2>
            <p className="text-gray-300 text-sm md:text-base mb-4 line-clamp-2">
              {currentAd.description}
            </p>
            
            <div className="flex items-center gap-4">
              <button
                onClick={() => handleAdClick(currentAd)}
                className={`bg-gradient-to-r ${colors.button} text-white font-bold px-8 py-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105`}
              >
                {currentAd.call_to_action} →
              </button>
              
              <div className="text-xs text-gray-500">
                by <span className={`${colors.text} font-semibold`}>{currentAd.seller_username}</span>
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
                  idx === currentAdIndex ? `w-8 ${colors.text.replace('text-', 'bg-')}` : 'w-1 bg-gray-600'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

