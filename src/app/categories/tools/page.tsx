'use client';

import { useEffect } from 'react';
import CategoryPage from '@/components/CategoryPage';
import { ToolsAnimationWrapper } from '@/lib/AnimationEffects';
import SoundEffects from '@/lib/SoundEffects';

export default function ToolsPage() {
  useEffect(() => {
    // Play tools sound when page loads
    SoundEffects.playToolsSound();
  }, []);

  return (
    <ToolsAnimationWrapper>
      <CategoryPage categoryId="tools-equipment" categoryIcon="🔧" />
    </ToolsAnimationWrapper>
  );
}
