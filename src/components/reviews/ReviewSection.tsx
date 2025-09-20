'use client';

import React, { useState } from 'react';
import { StarIcon } from '@heroicons/react/20/solid';
import { StarIcon as StarOutlineIcon } from '@heroicons/react/24/outline';
import { HandThumbUpIcon, HandThumbDownIcon, UserCircleIcon } from '@heroicons/react/24/outline';

interface Review {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  title: string;
  content: string;
  date: string;
  verified: boolean;
  helpful: number;
  notHelpful: number;
  images?: string[];
}

interface ReviewSectionProps {
  listingId: string;
  reviews: Review[];
  averageRating: number;
  totalReviews: number;
}

const ReviewSection: React.FC<ReviewSectionProps> = ({
  listingId,
  reviews,
  averageRating,
  totalReviews
}) => {
  const [showWriteReview, setShowWriteReview] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [filterRating, setFilterRating] = useState('all');

  // Calculate rating distribution
  const ratingDistribution = {
    5: reviews.filter(r => r.rating === 5).length,
    4: reviews.filter(r => r.rating === 4).length,
    3: reviews.filter(r => r.rating === 3).length,
    2: reviews.filter(r => r.rating === 2).length,
    1: reviews.filter(r => r.rating === 1).length,
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="bg-white">
      {/* Review Summary */}
      <div className="border-b border-gray-200 pb-8 mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Customer Reviews</h2>
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <div className="flex items-center space-x-1">
                  {[...Array(5)].map((_, i) => (
                    <StarIcon
                      key={i}
                      className={`h-5 w-5 ${
                        i < Math.floor(averageRating || 0) ? 'text-yellow-400' : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="ml-2 text-lg font-semibold text-gray-900">
                  {(averageRating || 0).toFixed(1)} out of 5
                </span>
              </div>
              <span className="text-gray-500">
                {totalReviews} global ratings
              </span>
            </div>
          </div>
          <button
            onClick={() => setShowWriteReview(!showWriteReview)}
            className="mt-4 md:mt-0 bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors duration-200"
          >
            Write a Review
          </button>
        </div>

        {/* Rating Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Rating Breakdown</h3>
            {[5, 4, 3, 2, 1].map((rating) => (
              <div key={rating} className="flex items-center mb-2">
                <span className="text-sm text-gray-600 w-12">
                  {rating} star
                </span>
                <div className="flex-1 mx-4">
                  <div className="bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-yellow-400 h-2 rounded-full"
                      style={{
                        width: `${totalReviews > 0 ? (ratingDistribution[rating as keyof typeof ratingDistribution] / totalReviews) * 100 : 0}%`
                      }}
                    ></div>
                  </div>
                </div>
                <span className="text-sm text-gray-600 w-8">
                  {ratingDistribution[rating as keyof typeof ratingDistribution]}
                </span>
              </div>
            ))}
          </div>
          
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-800 mb-2">Winner Verified Reviews</h4>
              <p className="text-sm text-green-700">
                Reviews from customers who actually won this item through Dollar Drop bidding.
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-2">Every Dollar Drops the Price!</h4>
              <p className="text-sm text-blue-700">
                See what winners paid vs. retail price in their reviews.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Sorting */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex items-center space-x-4 mb-4 sm:mb-0">
          <label className="text-sm font-medium text-gray-700">Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1 text-sm"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="highest">Highest Rating</option>
            <option value="lowest">Lowest Rating</option>
            <option value="helpful">Most Helpful</option>
          </select>
        </div>
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Filter:</label>
          <select
            value={filterRating}
            onChange={(e) => setFilterRating(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1 text-sm"
          >
            <option value="all">All Stars</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-6">
        {reviews.map((review) => (
          <div key={review.id} className="border-b border-gray-200 pb-6">
            <div className="flex items-start space-x-4">
              <div className="bg-primary-100 rounded-full p-2">
                <UserCircleIcon className="h-8 w-8 text-primary-600" />
              </div>
              <div className="flex-1">
                {/* Review Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <span className="font-semibold text-gray-900">{review.userName}</span>
                    {review.verified && (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                        Verified Winner
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-gray-500">{formatDate(review.date)}</span>
                </div>

                {/* Rating */}
                <div className="flex items-center mb-2">
                  {[...Array(5)].map((_, i) => (
                    <StarIcon
                      key={i}
                      className={`h-4 w-4 ${
                        i < review.rating ? 'text-yellow-400' : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>

                {/* Review Title */}
                <h4 className="font-semibold text-gray-900 mb-2">{review.title}</h4>

                {/* Review Content */}
                <p className="text-gray-700 mb-4 leading-relaxed">{review.content}</p>

                {/* Review Images */}
                {review.images && review.images.length > 0 && (
                  <div className="flex space-x-2 mb-4">
                    {review.images.map((image, index) => (
                      <img
                        key={index}
                        src={image}
                        alt={`Review image ${index + 1}`}
                        className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                      />
                    ))}
                  </div>
                )}

                {/* Helpful Buttons */}
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600">Was this review helpful?</span>
                  <button className="flex items-center space-x-1 text-sm text-gray-600 hover:text-primary-600">
                    <HandThumbUpIcon className="h-4 w-4" />
                    <span>Yes ({review.helpful})</span>
                  </button>
                  <button className="flex items-center space-x-1 text-sm text-gray-600 hover:text-primary-600">
                    <HandThumbDownIcon className="h-4 w-4" />
                    <span>No ({review.notHelpful})</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Write Review Form */}
      {showWriteReview && (
        <div className="mt-8 p-6 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Write Your Review</h3>
          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Overall Rating
              </label>
              <div className="flex items-center space-x-1">
                {[...Array(5)].map((_, i) => (
                  <StarOutlineIcon
                    key={i}
                    className="h-6 w-6 text-gray-300 hover:text-yellow-400 cursor-pointer"
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Review Title
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Summarize your experience"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Written Review
              </label>
              <textarea
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Tell others about your experience with this product..."
              ></textarea>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowWriteReview(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors duration-200"
              >
                Submit Review
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ReviewSection;
