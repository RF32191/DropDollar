'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function WalletPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect wallet page to dashboard since we removed crypto wallets
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-300">Redirecting to your money dashboard...</p>
      </div>
    </div>
  );
}