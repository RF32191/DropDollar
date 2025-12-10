'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';

interface UsePageVisitTrackingOptions {
  pageType?: 'category' | 'game' | 'shop' | 'other';
  categoryId?: string;
  gameType?: string;
  enabled?: boolean;
}

/**
 * Hook to track page visits for RP challenges
 * Automatically tracks visits when user navigates to pages
 */
export function usePageVisitTracking(options: UsePageVisitTrackingOptions = {}) {
  const { user, isAuthenticated } = useAuth();
  const pathname = usePathname();
  const { pageType, categoryId, gameType, enabled = true } = options;

  useEffect(() => {
    if (!enabled || !isAuthenticated || !user) return;

    // Determine page type from pathname if not provided
    let detectedPageType = pageType;
    let detectedCategoryId = categoryId;
    let detectedGameType = gameType;

    if (!detectedPageType) {
      if (pathname?.includes('/categories') || pathname?.includes('/category/')) {
        detectedPageType = 'category';
        // Extract category ID from pathname if possible
        const categoryMatch = pathname.match(/\/category\/([^/]+)/);
        if (categoryMatch) {
          detectedCategoryId = categoryMatch[1];
        }
      } else if (pathname?.includes('/games') || pathname?.match(/\/game\//)) {
        detectedPageType = 'game';
        // Extract game type from pathname if possible
        const gameMatch = pathname.match(/\/game\/([^/]+)/);
        if (gameMatch) {
          detectedGameType = gameMatch[1];
        }
      } else if (pathname?.includes('/shop') || pathname?.includes('/rp-shop') || pathname?.includes('/buy-tokens')) {
        detectedPageType = 'shop';
      } else {
        detectedPageType = 'other';
      }
    }

    // Track the page visit
    const trackVisit = async () => {
      try {
        await supabase.rpc('track_page_visit', {
          p_user_id: user.id,
          p_page_path: pathname || '/',
          p_page_type: detectedPageType || 'other',
          p_category_id: detectedCategoryId || null,
          p_game_type: detectedGameType || null
        });
      } catch (error) {
        // Silently fail - don't interrupt user experience
        console.error('Error tracking page visit:', error);
      }
    };

    // Small delay to ensure page is loaded
    const timeoutId = setTimeout(trackVisit, 500);

    return () => clearTimeout(timeoutId);
  }, [pathname, user, isAuthenticated, pageType, categoryId, gameType, enabled]);
}

