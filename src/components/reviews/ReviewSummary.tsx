import React from 'react';
import { StarIcon } from '@heroicons/react/20/solid';

interface ReviewSummaryProps {
  averageRating: number;
  totalReviews: number;
  compact?: boolean;
}

const ReviewSummary: React.FC<ReviewSummaryProps> = ({ 
  averageRating, 
  totalReviews, 
  compact = false 
}) => {
  if (totalReviews === 0) {
    return (
      <div className={`flex items-center ${compact ? 'text-xs' : 'text-sm'} text-gray-500`}>
        <span>No reviews yet</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-1 ${compact ? 'text-xs' : 'text-sm'}`}>
      <div className="flex items-center space-x-1">
        {[...Array(5)].map((_, i) => (
          <StarIcon
            key={i}
            className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} ${
              i < Math.floor(averageRating || 0) ? 'text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
      <span className="font-medium text-gray-900">
        {(averageRating || 0).toFixed(1)}
      </span>
      <span className="text-gray-500">
        ({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})
      </span>
    </div>
  );
};

export default ReviewSummary;
