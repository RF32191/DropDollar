'use client';

import React, { useState } from 'react';
import { ActivityService } from '@/lib/supabase/activityService';
import SoundEffects from '@/lib/SoundEffects';
import { PencilSquareIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface VictoryStoryFormProps {
  userId: string;
  username: string;
  prizeWon: string;
  amountWon: number;
  onSubmitted?: () => void;
  onClose?: () => void;
}

export default function VictoryStoryForm({
  userId,
  username,
  prizeWon,
  amountWon,
  onSubmitted,
  onClose
}: VictoryStoryFormProps) {
  const [title, setTitle] = useState('');
  const [story, setStory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await ActivityService.submitVictoryStory({
        user_id: userId,
        username,
        title,
        story,
        prize_won: prizeWon,
        amount_won: amountWon
      });

      if (result) {
        SoundEffects.playSuccess();
        setSubmitted(true);
        setTimeout(() => {
          if (onSubmitted) onSubmitted();
          if (onClose) onClose();
        }, 3000);
      } else {
        SoundEffects.playError();
        alert('Failed to submit story. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting story:', error);
      SoundEffects.playError();
      alert('Failed to submit story. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-gray-800 rounded-xl p-8 max-w-2xl mx-auto">
        <div className="text-center">
          <CheckCircleIcon className="h-20 w-20 text-green-400 mx-auto mb-4 animate-bounce" />
          <h3 className="text-3xl font-bold text-white mb-4">Story Submitted!</h3>
          <p className="text-gray-300 mb-2">
            Thank you for sharing your victory story!
          </p>
          <p className="text-gray-400 text-sm">
            Your story will be reviewed and may be featured on our testimonials page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl p-8 max-w-2xl mx-auto">
      <div className="flex items-center space-x-3 mb-6">
        <PencilSquareIcon className="h-8 w-8 text-yellow-400" />
        <h2 className="text-3xl font-bold text-white">Share Your Victory Story</h2>
      </div>

      <div className="bg-gradient-to-r from-yellow-600 via-orange-600 to-red-600 p-1 rounded-xl mb-6">
        <div className="bg-gray-900 rounded-xl p-4">
          <p className="text-white font-bold mb-2">🏆 Congratulations on your win!</p>
          <p className="text-gray-300 text-sm">
            Share your experience and inspire others. Your story may be featured on our testimonials page!
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Story Title <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            placeholder="e.g., I Won an iPhone 15 Pro!"
          />
          <p className="text-xs text-gray-400 mt-1">{title.length}/100 characters</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Your Story <span className="text-red-400">*</span>
          </label>
          <textarea
            required
            value={story}
            onChange={(e) => setStory(e.target.value)}
            maxLength={1000}
            rows={8}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent resize-none"
            placeholder="Share your experience... What game did you play? How did you feel when you won? What will you do with your prize?"
          />
          <p className="text-xs text-gray-400 mt-1">{story.length}/1000 characters</p>
        </div>

        <div className="bg-gray-700 rounded-xl p-4">
          <h4 className="font-bold text-white mb-2">Prize Details:</h4>
          <div className="text-gray-300 space-y-1">
            <p>🎁 Prize: <span className="font-bold text-yellow-400">{prizeWon}</span></p>
            <p>💰 Value: <span className="font-bold text-green-400">${amountWon.toFixed(2)}</span></p>
          </div>
        </div>

        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={isSubmitting || !title || !story}
            className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-4 px-6 rounded-xl disabled:opacity-50 transition-all duration-300 shadow-lg hover:shadow-2xl"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Submitting...
              </span>
            ) : (
              '✨ Submit Story'
            )}
          </button>
          
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-4 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl transition-all duration-300"
            >
              Maybe Later
            </button>
          )}
        </div>

        <p className="text-xs text-gray-400 text-center">
          By submitting, you agree to have your story potentially featured on our website.
          Your email will never be shared.
        </p>
      </form>
    </div>
  );
}

