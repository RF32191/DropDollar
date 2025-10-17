'use client';

import ProfessionalTokenWallet from '@/components/ProfessionalTokenWallet';
import MobileOptimizedTokenWallet from '@/components/MobileOptimizedTokenWallet';
import { useMobileDetection } from '@/lib/utils/mobileOptimization';
import ErrorBoundary from '@/components/ErrorBoundary';
import CleanNavigation from '@/components/navigation/CleanNavigation';

export default function TokenWalletPage() {
  const { isMobile, isLoading: mobileDetecting } = useMobileDetection();

  // Show loading state while detecting mobile
  if (mobileDetecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900">
        <CleanNavigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white">Loading wallet...</p>
          </div>
        </div>
      </div>
    );
  }

  // Mobile detection and redirect with error boundary
  if (isMobile) {
    return (
      <ErrorBoundary>
        <MobileOptimizedTokenWallet />
      </ErrorBoundary>
    );
  }

  return <ProfessionalTokenWallet />;
}
