'use client';

import { useEffect } from 'react';
import CategoryPageMarketplace from '@/components/CategoryPageMarketplace';
import { ElectronicsAnimationWrapper } from '@/lib/AnimationEffects';
import SoundEffects from '@/lib/SoundEffects';

export default function ElectronicsPage() {
  useEffect(() => {
    // Play electronics sound when page loads
    SoundEffects.playElectronicsSound();
  }, []);

  return (
    <ElectronicsAnimationWrapper>
      <CategoryPageMarketplace categoryId="electronics" categoryIcon="📱" />
    </ElectronicsAnimationWrapper>
  );
}