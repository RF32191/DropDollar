'use client';

import React, { useState } from 'react';
import { TrophyIcon, StarIcon } from '@heroicons/react/24/outline';

interface TestimonialFormData {
  title: string;
  gameType: string;
  score: number;
  prize: string;
  location: string;
  story: string;
}

export default function TestimonialSubmissionForm() {
  const [formData, setFormData] = useState<TestimonialFormData>({
    title: '',
    gameType: '',
    score: 0,
    prize: '',
    location: '',
    story: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const gameTypes = [
    'Multi-Target Reaction',
    'Falling Object Catch', 
    'Color Sequence Memory',
    'Laser Dodge EXTREME',
    'QuickClick Challenge',
    'Sword Slash'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // TODO: Implement actual submission to Supabase
      console.log('Submitting testimonial:', formData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setIsSubmitted(true);
      setFormData({
        title: '',
        gameType: '',
        score: 0,
        prize: '',
        location: '',
        story: ''
      });
    } catch (error) {
      console.error('Error submitting testimonial:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof TestimonialFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (isSubmitted) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-lg border border-green-200">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <TrophyIcon className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Victory Story Submitted!</h3>
          <p className="text-gray-600 mb-4">
            Your testimonial has been submitted for review. It will appear on the Victory Stories page once approved.
          </p>
          <button
            onClick={() => setIsSubmitted(false)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Submit Another Story
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-lg">
      <div className="flex items-center mb-6">
        <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mr-4">
          <TrophyIcon className="h-6 w-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">Share Your Victory Story</h3>
          <p className="text-gray-600">Tell the world about your gaming success!</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Victory Title *
          </label>
          <input
            type="text"
            id="title"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            placeholder="e.g., 'Won $500 in Multi-Target Reaction Tournament!'"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            required
          />
        </div>

        {/* Game Type */}
        <div>
          <label htmlFor="gameType" className="block text-sm font-medium text-gray-700 mb-2">
            Game Type *
          </label>
          <select
            id="gameType"
            value={formData.gameType}
            onChange={(e) => handleInputChange('gameType', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            required
          >
            <option value="">Select a game...</option>
            {gameTypes.map((game) => (
              <option key={game} value={game}>{game}</option>
            ))}
          </select>
        </div>

        {/* Score */}
        <div>
          <label htmlFor="score" className="block text-sm font-medium text-gray-700 mb-2">
            Winning Score *
          </label>
          <input
            type="number"
            id="score"
            value={formData.score}
            onChange={(e) => handleInputChange('score', parseInt(e.target.value) || 0)}
            placeholder="e.g., 95"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            required
            min="0"
          />
        </div>

        {/* Prize */}
        <div>
          <label htmlFor="prize" className="block text-sm font-medium text-gray-700 mb-2">
            Prize Won *
          </label>
          <input
            type="text"
            id="prize"
            value={formData.prize}
            onChange={(e) => handleInputChange('prize', e.target.value)}
            placeholder="e.g., '$500 Cash Prize' or 'iPhone 15 Pro'"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            required
          />
        </div>

        {/* Location */}
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
            Your Location
          </label>
          <input
            type="text"
            id="location"
            value={formData.location}
            onChange={(e) => handleInputChange('location', e.target.value)}
            placeholder="e.g., 'Los Angeles, CA' or 'New York'"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        {/* Story */}
        <div>
          <label htmlFor="story" className="block text-sm font-medium text-gray-700 mb-2">
            Your Victory Story *
          </label>
          <textarea
            id="story"
            value={formData.story}
            onChange={(e) => handleInputChange('story', e.target.value)}
            placeholder="Tell us about your victory! What was the experience like? How did you feel when you won? What strategies did you use?"
            rows={6}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            required
          />
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-between pt-4">
          <div className="text-sm text-gray-500">
            <StarIcon className="h-4 w-4 inline mr-1" />
            Your story will be reviewed before appearing on the Victory Stories page.
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-8 rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Submitting...
              </span>
            ) : (
              'Submit Victory Story'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
