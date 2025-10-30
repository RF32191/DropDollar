'use client';

import React from 'react';
import dynamic from 'next/dynamic';

/**
 * CASH STACK - Professional 3D Stack Game with WebGL
 * - Full 3D graphics with Three.js
 * - Realistic physics and smooth animations
 * - Particle effects for falling pieces
 * - Sound effects
 * - Advanced lighting and materials
 */

interface CashStackGameProps {
  onGameEnd: (result: { score: number; accuracy: number }) => void;
  onExit: () => void;
  listingId?: string;
  entryNumber?: number;
  isCompetitionMode?: boolean;
  gameId?: string;
}

// Dynamically import the 3D version to avoid SSR issues with Three.js
const CashStackGame3D = dynamic(
  () => import('./CashStackGame3D'),
  { ssr: false, loading: () => (
    <div className="w-full h-screen flex items-center justify-center bg-[#0a1628]">
      <div className="text-white text-4xl font-bold animate-pulse">
        Loading 3D Engine...
      </div>
    </div>
  )}
);

export default function CashStackGame(props: CashStackGameProps) {
  return <CashStackGame3D {...props} />;
}
