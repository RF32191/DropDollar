'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Trophy,
  Star,
  CheckCircle,
  AlertCircle,
  Send,
  Gamepad2,
  Target,
  Zap
} from 'lucide-react';

interface TestimonialFormData {
  title: string;
  content: string;
  gameType: string;
  gameScore: number;
  entryFee: number;
  prizeValue: number;
  location: string;
}

export default function TestimonialSubmissionForm() {
  const [formData, setFormData] = useState<TestimonialFormData>({
    title: '',
    content: '',
    gameType: '',
    gameScore: 0,
    entryFee: 0,
    prizeValue: 0,
    location: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const gameTypes = [
    { value: 'Multi-Target Reaction', label: 'Multi-Target Reaction', icon: Target },
    { value: 'Falling Object Catch', label: 'Falling Object Catch', icon: Gamepad2 },
    { value: 'Color Sequence Memory', label: 'Color Sequence Memory', icon: Zap },
    { value: 'Trading Game', label: 'Trading Game', icon: Trophy },
    { value: 'Prediction Game', label: 'Prediction Game', icon: Star }
  ];

  const handleInputChange = (field: keyof TestimonialFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.title || !formData.content || !formData.gameType) {
      setError('Please fill in all required fields');
      return false;
    }

    if (formData.gameScore <= 0) {
      setError('Please enter a valid game score');
      return false;
    }

    if (formData.prizeValue <= 0) {
      setError('Please enter a valid prize value');
      return false;
    }

    if (formData.content.length < 50) {
      setError('Please write at least 50 characters about your victory');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    setError('');

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setIsSubmitted(true);
      
      // Reset form after 3 seconds
      setTimeout(() => {
        setIsSubmitted(false);
        setFormData({
          title: '',
          content: '',
          gameType: '',
          gameScore: 0,
          entryFee: 0,
          prizeValue: 0,
          location: ''
        });
      }, 3000);
    } catch (err) {
      setError('Failed to submit testimonial. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <Card className="bg-green-50 border-green-200">
        <CardContent className="pt-6">
          <div className="text-center">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-green-900 mb-2">Testimonial Submitted!</h3>
            <p className="text-green-800">
              Your victory story has been submitted and will appear on the testimonials page after review.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-600" />
          Share Your Victory Story
        </CardTitle>
        <CardDescription>
          Tell the community about your tournament win and inspire other players!
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Victory Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Won iPhone 15 Pro with Multi-Target Skills!"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              required
            />
          </div>

          {/* Game Type */}
          <div className="space-y-2">
            <Label htmlFor="gameType">Game Type *</Label>
            <Select value={formData.gameType} onValueChange={(value) => handleInputChange('gameType', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select the game you won" />
              </SelectTrigger>
              <SelectContent>
                {gameTypes.map((game) => {
                  const IconComponent = game.icon;
                  return (
                    <SelectItem key={game.value} value={game.value}>
                      <div className="flex items-center gap-2">
                        <IconComponent className="h-4 w-4" />
                        {game.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Game Score */}
          <div className="space-y-2">
            <Label htmlFor="gameScore">Winning Score *</Label>
            <Input
              id="gameScore"
              type="number"
              placeholder="e.g., 47"
              value={formData.gameScore || ''}
              onChange={(e) => handleInputChange('gameScore', parseInt(e.target.value) || 0)}
              min="1"
              required
            />
          </div>

          {/* Entry Fee and Prize Value */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entryFee">Entry Fee ($)</Label>
              <Input
                id="entryFee"
                type="number"
                placeholder="1.00"
                value={formData.entryFee || ''}
                onChange={(e) => handleInputChange('entryFee', parseFloat(e.target.value) || 0)}
                min="0"
                step="0.01"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prizeValue">Prize Value ($) *</Label>
              <Input
                id="prizeValue"
                type="number"
                placeholder="1200.00"
                value={formData.prizeValue || ''}
                onChange={(e) => handleInputChange('prizeValue', parseFloat(e.target.value) || 0)}
                min="0"
                step="0.01"
                required
              />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Location (Optional)</Label>
            <Input
              id="location"
              placeholder="e.g., Seattle, WA"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
            />
          </div>

          {/* Victory Story */}
          <div className="space-y-2">
            <Label htmlFor="content">Your Victory Story *</Label>
            <Textarea
              id="content"
              placeholder="Tell us about your victory! How did you prepare? What was the competition like? How do you feel about winning? (Minimum 50 characters)"
              value={formData.content}
              onChange={(e) => handleInputChange('content', e.target.value)}
              rows={6}
              required
            />
            <div className="text-sm text-gray-500">
              {formData.content.length}/50 characters minimum
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-full h-12 text-lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Submitting...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                Share My Victory Story
              </div>
            )}
          </Button>
        </form>

        {/* Guidelines */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">Submission Guidelines:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Only submit stories about actual tournament wins</li>
            <li>• Be honest about your scores and prizes</li>
            <li>• Keep content appropriate and inspiring</li>
            <li>• Stories will be reviewed before appearing publicly</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
