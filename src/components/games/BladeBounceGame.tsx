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
  () => import('./BladeBounce3D').then(mod => {
    console.log('✅ [BladeBounce] 3D module loaded successfully');
    return mod;
  }).catch(err => {
    console.error('❌ [BladeBounce] Failed to load 3D module:', err);
    throw err;
  }),
  { 
    ssr: false, 
    loading: () => {
      console.log('⏳ [BladeBounce] Loading 3D Engine...');
      return (
        <div className="w-full h-screen flex items-center justify-center bg-[#0a0e1a]">
          <div className="text-white text-4xl font-bold animate-pulse">
            Loading 3D Engine...
          </div>
        </div>
      );
    }
  }
);

export default function BladeBounceGame(props: BladeBounceGameProps) {
  console.log('🎮 [BladeBounce] Rendering with props:', {
    isCompetitionMode: props.isCompetitionMode,
    hasOnGameEnd: !!props.onGameEnd,
    hasOnExit: !!props.onExit
  });
  
  try {
    return <BladeBounce3D {...props} />;
  } catch (error) {
    console.error('❌ [BladeBounce] Error rendering:', error);
    return (
      <div className="w-full h-screen flex items-center justify-center bg-red-900">
        <div className="text-white text-center">
          <div className="text-4xl font-bold mb-4">⚠️ Error Loading Game</div>
          <div className="text-xl">{String(error)}</div>
        </div>
      </div>
    );
  }
}
