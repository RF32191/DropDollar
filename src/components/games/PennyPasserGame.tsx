'use client';

import React, { Suspense } from 'react';

const PennyPasserGame3D = React.lazy(() => import('./PennyPasserGame3D'));

interface PennyPasserGameProps {
  onGameEnd: (result: { score: number; accuracy: number }) => void;
  gameMode?: 'practice' | 'competition';
  rngSeed?: number;
  competitionId?: string;
}

export default function PennyPasserGame(props: PennyPasserGameProps) {
  return (
    <Suspense fallback={
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 to-blue-900 rounded-xl">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-400 mb-4"></div>
          <div className="text-white text-xl">Loading Penny Passer...</div>
          <div className="text-gray-400 text-sm mt-2">Initializing 3D graphics</div>
        </div>
      </div>
    }>
      <PennyPasserGame3D {...props} />
    </Suspense>
  );
}

