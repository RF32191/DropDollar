'use client';

import { useEffect } from 'react';
import CategoryPageMarketplace from '@/components/CategoryPageMarketplace';
import { ToolsAnimationWrapper } from '@/lib/AnimationEffects';
import SoundEffects from '@/lib/SoundEffects';

export default function ToolsPage() {
  useEffect(() => {
    // Play tools sound when page loads
    SoundEffects.playToolsSound();
  }, []);

  return (
    <ToolsAnimationWrapper>
      <CategoryPageMarketplace categoryId="tools-equipment" categoryIcon="🔧" />
    </ToolsAnimationWrapper>
  );
}
