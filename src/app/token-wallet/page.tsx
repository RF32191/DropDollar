'use client';

import ProfessionalTokenWallet from '@/components/ProfessionalTokenWallet';
import MobileOptimizedTokenWallet from '@/components/MobileOptimizedTokenWallet';
import { isMobile } from '@/lib/utils/mobileOptimization';

export default function TokenWalletPage() {
  // Mobile detection and redirect
  if (typeof window !== 'undefined' && isMobile()) {
    return <MobileOptimizedTokenWallet />;
  }

  return <ProfessionalTokenWallet />;
}
