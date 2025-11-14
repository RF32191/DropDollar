'use client';

import { useEffect } from 'react';
import CategoryPage from '@/components/CategoryPageMarketplace';
import { ArtAnimationWrapper } from '@/lib/AnimationEffects';
import SoundEffects from '@/lib/SoundEffects';

export default function ArtPage() {
  useEffect(() => {
    // Play art sound when page loads
    SoundEffects.playArtSound();
  }, []);

  return (
    <ArtAnimationWrapper>
      <CategoryPageMarketplace categoryId="art-crafts" categoryIcon="🎨" />
    </ArtAnimationWrapper>
  );
}
