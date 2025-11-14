'use client';

import { useEffect } from 'react';
import CategoryPageMarketplace from '@/components/CategoryPageMarketplace';
import { MusicAnimationWrapper } from '@/lib/AnimationEffects';
import SoundEffects from '@/lib/SoundEffects';

export default function MusicPage() {
  useEffect(() => {
    // Play music sound when page loads
    SoundEffects.playMusicSound();
  }, []);

  return (
    <MusicAnimationWrapper>
      <CategoryPageMarketplace categoryId="music-instruments" categoryIcon="🎵" />
    </MusicAnimationWrapper>
  );
}
