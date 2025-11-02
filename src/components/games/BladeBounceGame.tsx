'use client';

import React from 'react';
import dynamic from 'next/dynamic';

/**
 * BLADE BOUNCE - Professional 3D Sword Defense with WebGL
 * - Full 3D sword with smooth 45° rotation
 * - Red danger zones only on handle
 * - Realistic physics and animations
 * - 3 hearts system
 */

interface BladeBounceGameProps {
  onGameEnd: (result: { score: number; accuracy: number }) => void;
  onExit?: () => void; // Make optional to match other games
  listingId?: string;
  entryNumber?: number;
  isCompetitionMode?: boolean;
  gameId?: string;
}

// Dynamically import the 3D version to avoid SSR issues with Three.js
const BladeBounce3D = dynamic(
  () => import('./BladeBounce3D'),
  { ssr: false, loading: () => (
    <div className="w-full h-screen flex items-center justify-center bg-[#0a0e1a]">
      <div className="text-white text-4xl font-bold animate-pulse">
        Loading 3D Engine...
      </div>
    </div>
  )}
);

export default function BladeBounceGame(props: BladeBounceGameProps) {
  return <BladeBounce3D {...props} />;
}
