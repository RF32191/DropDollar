'use client';

import { useEffect } from 'react';
import CategoryPage from '@/components/CategoryPage';
import { MusicAnimationWrapper } from '@/lib/AnimationEffects';
import SoundEffects from '@/lib/SoundEffects';

export default function MusicPage() {
  useEffect(() => {
    // Play music sound when page loads
    SoundEffects.playMusicSound();
  }, []);

  return (
    <MusicAnimationWrapper>
      <CategoryPage categoryId="music-instruments" categoryIcon="🎵" />
    </MusicAnimationWrapper>
  );
}
