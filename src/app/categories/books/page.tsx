'use client';

import { useEffect } from 'react';
import CategoryPageMarketplace from '@/components/CategoryPageMarketplace';
import { BooksAnimationWrapper } from '@/lib/AnimationEffects';
import SoundEffects from '@/lib/SoundEffects';

export default function BooksPage() {
  useEffect(() => {
    // Play books sound when page loads
    SoundEffects.playBooksSound();
  }, []);

  return (
    <BooksAnimationWrapper>
      <CategoryPageMarketplace categoryId="books-media" categoryIcon="📚" />
    </BooksAnimationWrapper>
  );
}
