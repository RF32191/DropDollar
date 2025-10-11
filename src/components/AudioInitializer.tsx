'use client';

import { useEffect } from 'react';
import SoundEffects from '@/lib/SoundEffects';

/**
 * AudioInitializer Component
 * 
 * This component enables audio on first user interaction.
 * Browsers require user interaction before playing audio.
 */
export default function AudioInitializer() {
  useEffect(() => {
    const enableAudio = () => {
      console.log('🔊 User interaction detected, enabling audio...');
      SoundEffects.enableAudio();
      
      // Remove listeners after first interaction
      document.removeEventListener('click', enableAudio);
      document.removeEventListener('keydown', enableAudio);
      document.removeEventListener('touchstart', enableAudio);
    };

    // Listen for first user interaction
    document.addEventListener('click', enableAudio);
    document.addEventListener('keydown', enableAudio);
    document.addEventListener('touchstart', enableAudio);

    return () => {
      document.removeEventListener('click', enableAudio);
      document.removeEventListener('keydown', enableAudio);
      document.removeEventListener('touchstart', enableAudio);
    };
  }, []);

  return null; // This component doesn't render anything
}

