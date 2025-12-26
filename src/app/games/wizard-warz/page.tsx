'use client';

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

const WizardWarzGame = dynamic(
  () => import('@/components/games/WizardWarzGame'),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl animate-bounce mb-4">🧙</div>
          <div className="text-purple-400 text-xl font-bold animate-pulse">Loading Wizard Warz...</div>
          <div className="text-gray-500 text-sm mt-2">Preparing the arena</div>
        </div>
      </div>
    )
  }
);

export default function WizardWarzPage() {
  const router = useRouter();

  const handleGameEnd = (result: { score: number; accuracy: number }) => {
    console.log('Game ended:', result);
  };

  const handleExit = () => {
    router.push('/games');
  };

  return (
    <div className="w-full h-screen bg-black">
      <Suspense fallback={
        <div className="w-full h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-black flex items-center justify-center">
          <div className="text-purple-400 text-xl">Loading...</div>
        </div>
      }>
        <WizardWarzGame 
          onGameEnd={handleGameEnd}
          onExit={handleExit}
        />
      </Suspense>
    </div>
  );
}

