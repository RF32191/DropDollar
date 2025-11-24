'use client';

/**
 * W-9 ONBOARDING MODAL
 * 
 * Interactive modal for collecting W-9 tax information from users.
 * Triggered when a user attempts to withdraw cash/prizes without completing W-9.
 * 
 * COMPLIANCE FEATURES:
 * - Electronic signature with consent checkbox
 * - IP address and user agent logging
 * - Secure transmission of tax data
 * - Client-side validation before submission
 */

import { useState, FormEvent } from 'react';
import { 
  W9SubmissionRequest, 
  TaxClassification 
} from '@/types/tax';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface W9OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  isBlocking?: boolean; // If true, shows as a blocker (no close button)
}

export default function W9OnboardingModal({
  isOpen,
  onClose,
  onSuccess,
  isBlocking = false,
}: W9OnboardingModalProps) {
  const [step, setStep] = useState<'intro' | 'form' | 'signature'>('intro');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<W9SubmissionRequest>>({
    tax_classification: 'individual',
    country: 'US',
  });

  const supabase = createClientComponentClient();

  if (!isOpen) return null;

  // ============================================================================
  // FORM VALIDATION
  // ============================================================================
  const validateForm = (): string | null => {
    if (!formData.full_name || formData.full_name.trim().length < 2) {
      return 'Please enter your full legal name';
    }

    if (!formData.tax_classification) {
      return 'Please select a tax classification';
    }

    if (!formData.ssn && !formData.ein) {
      return 'Please enter either SSN or EIN';
    }

    if (formData.ssn && formData.ssn.replace(/\D/g, '').length !== 9) {
      return 'SSN must be 9 digits';
    }

    if (formData.ein && formData.ein.replace(/\D/g, '').length !== 9) {
      return 'EIN must be 9 digits';
    }

    if (!formData.address_line1 || formData.address_line1.trim().length < 3) {
      return 'Please enter your street address';
    }

    if (!formData.city || formData.city.trim().length < 2) {
      return 'Please enter your city';
    }

    if (!formData.state || formData.state.length !== 2) {
      return 'Please enter a valid state code (e.g., "CA")';
    }

    if (!formData.postal_code || !formData.postal_code.match(/^\d{5}(-\d{4})?$/)) {
      return 'Please enter a valid postal code';
    }

    return null;
  };

  // ============================================================================
  // FORM SUBMISSION
  // ============================================================================
  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    try {
      // Validate signature
      if (!formData.electronic_signature || !formData.consent_given) {
        setError('Please sign and consent to electronic submission');
        setLoading(false);
        return;
      }

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Authentication required. Please log in.');
        setLoading(false);
        return;
      }

      // Submit W-9
      const response = await fetch('/api/tax/w9/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to submit W-9');
      }

      console.log('✅ W-9 submitted successfully');
      
      // Show success and close
      if (onSuccess) {
        onSuccess();
      } else {
        setTimeout(() => {
          onClose();
        }, 2000);
      }

    } catch (err) {
      console.error('W-9 submission error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // INTRO STEP
  // ============================================================================
  if (step === 'intro') {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl max-w-2xl w-full p-8 border border-white/10 shadow-2xl">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">📋</div>
            <h2 className="text-3xl font-bold text-white mb-2">Tax Information Required</h2>
            <p className="text-gray-300 text-lg">IRS Form W-9 Equivalent</p>
          </div>

          <div className="bg-black/30 rounded-2xl p-6 mb-6 space-y-4 text-white/90">
            <p className="text-sm leading-relaxed">
              <strong className="text-yellow-400">Why is this required?</strong><br />
              Under US tax law (26 U.S. Code § 6041), we must collect W-9 information before paying
              out cash prizes or winnings. This helps us:
            </p>
            <ul className="text-sm space-y-2 ml-6 list-disc">
              <li>Report earnings to the IRS if you win $600 or more in a calendar year</li>
              <li>Issue you a 1099-NEC form by January 31 (if applicable)</li>
              <li>Stay compliant with federal tax regulations</li>
            </ul>
            <p className="text-sm leading-relaxed">
              <strong className="text-green-400">Your privacy is protected:</strong><br />
              We only store the <strong>last 4 digits</strong> of your Social Security Number.
              Your information is encrypted and secure.
            </p>
          </div>

          <div className="flex gap-4">
            {!isBlocking && (
              <button
                onClick={onClose}
                className="flex-1 px-6 py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all duration-300"
              >
                Cancel
              </button>
            )}
            <button
              onClick={() => setStep('form')}
              className={`${isBlocking ? 'w-full' : 'flex-1'} px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl`}
            >
              Continue to Form →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // FORM STEP
  // ============================================================================
  if (step === 'form') {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto">
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl max-w-3xl w-full p-8 border border-white/10 shadow-2xl my-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">W-9 Tax Information</h2>
            <p className="text-gray-400 text-sm">Complete the form below. All fields are required unless marked optional.</p>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-xl mb-6">
              {error}
            </div>
          )}

          <form className="space-y-6">
            {/* Name Section */}
            <div className="bg-black/20 rounded-2xl p-6 space-y-4">
              <h3 className="text-white font-semibold text-lg mb-4">Personal/Business Information</h3>
              
              <div>
                <label className="block text-white mb-2 text-sm font-medium">
                  Full Legal Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.full_name || ''}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:border-blue-500 focus:outline-none"
                  placeholder="John Smith"
                />
                <p className="text-gray-400 text-xs mt-1">Enter name as shown on your income tax return</p>
              </div>

              <div>
                <label className="block text-white mb-2 text-sm font-medium">
                  Business Name <span className="text-gray-400">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={formData.business_name || ''}
                  onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                  className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:border-blue-500 focus:outline-none"
                  placeholder="Leave blank if not applicable"
                />
              </div>

              <div>
                <label className="block text-white mb-2 text-sm font-medium">
                  Federal Tax Classification <span className="text-red-400">*</span>
                </label>
                <select
                  value={formData.tax_classification || 'individual'}
                  onChange={(e) => setFormData({ ...formData, tax_classification: e.target.value as TaxClassification })}
                  className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="individual">Individual/Sole Proprietor</option>
                  <option value="c_corporation">C Corporation</option>
                  <option value="s_corporation">S Corporation</option>
                  <option value="partnership">Partnership</option>
                  <option value="trust_estate">Trust/Estate</option>
                  <option value="llc">LLC</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {/* Tax ID Section */}
            <div className="bg-black/20 rounded-2xl p-6 space-y-4">
              <h3 className="text-white font-semibold text-lg mb-4">Tax Identification Numbers</h3>
              <p className="text-yellow-400 text-sm mb-4">
                🔒 <strong>Security:</strong> Only the last 4 digits of your SSN will be stored.
              </p>
              
              <div>
                <label className="block text-white mb-2 text-sm font-medium">
                  Social Security Number (SSN)
                </label>
                <input
                  type="password"
                  value={formData.ssn || ''}
                  onChange={(e) => setFormData({ ...formData, ssn: e.target.value.replace(/\D/g, '') })}
                  className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:border-blue-500 focus:outline-none"
                  placeholder="123-45-6789"
                  maxLength={11}
                />
                <p className="text-gray-400 text-xs mt-1">Required for individuals</p>
              </div>

              <div className="text-center text-gray-400 text-sm">
                — OR —
              </div>

              <div>
                <label className="block text-white mb-2 text-sm font-medium">
                  Employer Identification Number (EIN)
                </label>
                <input
                  type="text"
                  value={formData.ein || ''}
                  onChange={(e) => setFormData({ ...formData, ein: e.target.value.replace(/\D/g, '') })}
                  className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:border-blue-500 focus:outline-none"
                  placeholder="12-3456789"
                  maxLength={10}
                />
                <p className="text-gray-400 text-xs mt-1">Required for businesses</p>
              </div>
            </div>

            {/* Address Section */}
            <div className="bg-black/20 rounded-2xl p-6 space-y-4">
              <h3 className="text-white font-semibold text-lg mb-4">Mailing Address</h3>
              
              <div>
                <label className="block text-white mb-2 text-sm font-medium">
                  Street Address <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.address_line1 || ''}
                  onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                  className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:border-blue-500 focus:outline-none"
                  placeholder="123 Main Street"
                />
              </div>

              <div>
                <label className="block text-white mb-2 text-sm font-medium">
                  Apt/Suite <span className="text-gray-400">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={formData.address_line2 || ''}
                  onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
                  className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:border-blue-500 focus:outline-none"
                  placeholder="Apt 4B"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white mb-2 text-sm font-medium">
                    City <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.city || ''}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:border-blue-500 focus:outline-none"
                    placeholder="San Francisco"
                  />
                </div>

                <div>
                  <label className="block text-white mb-2 text-sm font-medium">
                    State <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.state || ''}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:border-blue-500 focus:outline-none"
                    placeholder="CA"
                    maxLength={2}
                  />
                </div>
              </div>

              <div>
                <label className="block text-white mb-2 text-sm font-medium">
                  Postal Code <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.postal_code || ''}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value.replace(/\D/g, '') })}
                  className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:border-blue-500 focus:outline-none"
                  placeholder="94102"
                  maxLength={10}
                />
              </div>
            </div>
          </form>

          <div className="flex gap-4 mt-8">
            <button
              onClick={() => setStep('intro')}
              className="flex-1 px-6 py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all duration-300"
            >
              ← Back
            </button>
            <button
              onClick={() => {
                const validationError = validateForm();
                if (validationError) {
                  setError(validationError);
                } else {
                  setError(null);
                  setStep('signature');
                }
              }}
              className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Continue to Signature →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // SIGNATURE STEP
  // ============================================================================
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl max-w-2xl w-full p-8 border border-white/10 shadow-2xl my-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">Electronic Signature</h2>
          <p className="text-gray-400 text-sm">Review and sign your W-9 information</p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        <div className="bg-black/20 rounded-2xl p-6 mb-6 space-y-4">
          <h3 className="text-white font-semibold">Certification</h3>
          <p className="text-white/80 text-sm leading-relaxed">
            Under penalties of perjury, I certify that:
          </p>
          <ol className="text-white/70 text-sm space-y-2 ml-6 list-decimal">
            <li>The number shown on this form is my correct taxpayer identification number</li>
            <li>I am not subject to backup withholding</li>
            <li>I am a U.S. citizen or other U.S. person</li>
            <li>The information I have provided is true, correct, and complete</li>
          </ol>
        </div>

        <div className="bg-black/20 rounded-2xl p-6 mb-6 space-y-4">
          <div>
            <label className="block text-white mb-2 text-sm font-medium">
              Electronic Signature <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.electronic_signature || ''}
              onChange={(e) => setFormData({ ...formData, electronic_signature: e.target.value })}
              className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:border-blue-500 focus:outline-none"
              placeholder="Type your full legal name"
            />
            <p className="text-gray-400 text-xs mt-1">
              Type your full name exactly as shown above: <strong className="text-white">{formData.full_name}</strong>
            </p>
          </div>

          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="consent"
              checked={formData.consent_given || false}
              onChange={(e) => setFormData({ ...formData, consent_given: e.target.checked })}
              className="mt-1 w-5 h-5 rounded border-white/10 bg-black/30"
            />
            <label htmlFor="consent" className="text-white/80 text-sm leading-relaxed">
              I agree to electronically sign and submit this W-9 equivalent form. I understand that my
              electronic signature has the same legal effect as a handwritten signature.
            </label>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => setStep('form')}
            disabled={loading}
            className="flex-1 px-6 py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all duration-300 disabled:opacity-50"
          >
            ← Back
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !formData.consent_given || !formData.electronic_signature}
            className="flex-1 px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Submitting...' : '✓ Submit W-9'}
          </button>
        </div>

        <p className="text-gray-400 text-xs text-center mt-6">
          By submitting, you authorize us to use this information for tax reporting purposes as required by US law.
        </p>
      </div>
    </div>
  );
}

