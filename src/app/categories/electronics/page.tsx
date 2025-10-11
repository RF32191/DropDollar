'use client';

import { useEffect } from 'react';
import CategoryPage from '@/components/CategoryPage';
import { ElectronicsAnimationWrapper } from '@/lib/AnimationEffects';
import SoundEffects from '@/lib/SoundEffects';

export default function ElectronicsPage() {
  useEffect(() => {
    // Play electronics sound when page loads
    SoundEffects.playElectronicsSound();
  }, []);

  return (
    <ElectronicsAnimationWrapper>
      <CategoryPage categoryId="electronics" categoryIcon="📱" />
    </ElectronicsAnimationWrapper>
  );
}