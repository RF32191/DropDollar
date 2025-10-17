'use client';

import ProfessionalTokenWallet from '@/components/ProfessionalTokenWallet';
import MobileOptimizedTokenWallet from '@/components/MobileOptimizedTokenWallet';
import { isMobile } from '@/lib/utils/mobileOptimization';

export default function TokenWalletPage() {
  // Mobile detection and redirect with error handling
  try {
    if (typeof window !== 'undefined' && isMobile()) {
      return <MobileOptimizedTokenWallet />;
    }
  } catch (error) {
    console.error('Mobile detection failed in token wallet:', error);
    // Continue with desktop wallet on error
  }

  return <ProfessionalTokenWallet />;
}
