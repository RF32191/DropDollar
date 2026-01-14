'use client';

// Mobile version of Winner Takes All - redirects to main page for now
// TODO: Create full mobile competitive section

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function WinnerTakesAllMobilePage() {
  const router = useRouter();
  
  useEffect(() => {
    // For now, redirect to main page
    // In future, this will be a full mobile competitive section
    router.push('/winner-takes-all');
  }, [router]);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-800 via-amber-800 to-orange-800 text-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
        <p className="text-lg text-yellow-200">Loading mobile competitive games...</p>
      </div>
    </div>
  );
}

