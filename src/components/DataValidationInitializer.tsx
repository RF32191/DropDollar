'use client';

import { useEffect } from 'react';
import { initializeDataValidation } from '@/lib/utils/clearCorruptedData';

/**
 * Component to validate and clean corrupted localStorage on app initialization
 * Runs once on mount to detect and fix old/invalid user data
 */
export default function DataValidationInitializer() {
  useEffect(() => {
    // Run validation once on mount
    initializeDataValidation();
  }, []);

  return null; // This component doesn't render anything
}

