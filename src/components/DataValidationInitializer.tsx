'use client';

import { useEffect } from 'react';
import { initializeDataValidation } from '@/lib/utils/clearCorruptedData';

/**
 * Component to validate and clean corrupted localStorage on app initialization
 * Runs once on mount to detect and fix old/invalid user data
 */
export default function DataValidationInitializer() {
  useEffect(() => {
    // Only run in browser (not during SSR)
    if (typeof window !== 'undefined') {
      try {
        initializeDataValidation();
      } catch (error) {
        console.error('❌ [DataValidationInitializer] Error:', error);
        // Don't let this break the app
      }
    }
  }, []); // Empty deps - run once on mount

  return null; // This component doesn't render anything
}

