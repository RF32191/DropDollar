'use client';

import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { ExclamationTriangleIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { validateDateOfBirth, MINIMUM_AGE, LEGAL_MESSAGES } from '@/lib/legalConstants';

interface AgeVerificationModalProps {
  isOpen: boolean;
  onVerified: (dateOfBirth: string, age: number) => void;
  onDeclined: () => void;
  canClose?: boolean;
}

export default function AgeVerificationModal({
  isOpen,
  onVerified,
  onDeclined,
  canClose = false
}: AgeVerificationModalProps) {
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsVerifying(true);

    try {
      const validation = validateDateOfBirth(dateOfBirth);

      if (!validation.isValid) {
        setError(validation.error || 'Invalid date of birth');
        setIsVerifying(false);
        return;
      }

      // Log age verification attempt
      console.log('✅ Age verification passed:', {
        age: validation.age,
        timestamp: new Date().toISOString()
      });

      // Store verification in localStorage
      localStorage.setItem('age_verified', 'true');
      localStorage.setItem('age_verified_at', new Date().toISOString());
      localStorage.setItem('user_age', validation.age!.toString());

      // Call success callback
      onVerified(dateOfBirth, validation.age!);
    } catch (err) {
      console.error('Age verification error:', err);
      setError('An error occurred during verification. Please try again.');
      setIsVerifying(false);
    }
  };

  const handleDecline = () => {
    console.log('❌ Age verification declined');
    localStorage.setItem('age_verification_declined', 'true');
    onDeclined();
  };

  return (
    <Dialog 
      open={isOpen} 
      onClose={canClose ? () => {} : () => {}}
      className="relative z-50"
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" aria-hidden="true" />

      {/* Full-screen container */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-md w-full bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 rounded-2xl shadow-2xl border border-blue-500/30 overflow-hidden">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-center">
            <ShieldCheckIcon className="w-16 h-16 mx-auto mb-3 text-white" />
            <Dialog.Title className="text-2xl font-bold text-white">
              Age Verification Required
            </Dialog.Title>
            <p className="text-blue-100 text-sm mt-2">
              You must be {MINIMUM_AGE}+ to access DropDollar
            </p>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <ExclamationTriangleIcon className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-yellow-200 font-medium mb-1">
                    Legal Requirement
                  </p>
                  <p className="text-xs text-yellow-100/80">
                    {LEGAL_MESSAGES.AGE_REQUIREMENT}
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="dob" className="block text-sm font-medium text-gray-300 mb-2">
                  Date of Birth
                </label>
                <input
                  type="date"
                  id="dob"
                  value={dateOfBirth}
                  onChange={(e) => {
                    setDateOfBirth(e.target.value);
                    setError('');
                  }}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <p className="text-xs text-gray-400 mt-2">
                  Format: YYYY-MM-DD (e.g., 1990-01-15)
                </p>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  disabled={isVerifying || !dateOfBirth}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 disabled:cursor-not-allowed"
                >
                  {isVerifying ? 'Verifying...' : 'Verify Age'}
                </button>
                
                <button
                  type="button"
                  onClick={handleDecline}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200"
                >
                  Exit
                </button>
              </div>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-700">
              <p className="text-xs text-gray-400 text-center">
                Your date of birth is used solely for age verification and compliance with gaming regulations.
                We respect your privacy and will not share this information with third parties.
              </p>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}

