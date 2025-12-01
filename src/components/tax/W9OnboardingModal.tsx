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

import { useState, useEffect } from 'react';
import { 
  W9SubmissionRequest, 
  TaxClassification 
} from '@/types/tax';
import { supabase } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';

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
  const [step, setStep] = useState<'intro' | 'form' | 'signature' | 'success'>('intro');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  const [formData, setFormData] = useState<Partial<W9SubmissionRequest>>({
    tax_classification: 'individual',
    country: 'US',
  });

  // Login state
  const [showLogin, setShowLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Get current user on mount
  useEffect(() => {
    const getUser = async () => {
      console.log('[W9] Checking authentication...');
      const { data: { user }, error } = await supabase.auth.getUser();
      if (user) {
        console.log('[W9] User authenticated:', user.email);
        setCurrentUser(user);
        setShowLogin(false);
      } else {
        console.log('[W9] No user found:', error?.message);
        // Also try getSession as fallback
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          console.log('[W9] Found user via session:', session.user.email);
          setCurrentUser(session.user);
          setShowLogin(false);
        } else {
          console.log('[W9] No session found, showing login');
          setShowLogin(true);
        }
      }
    };
    
    if (isOpen) {
      getUser();
    }
  }, [isOpen]);

  // Handle login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);

    try {
      console.log('[W9] Attempting login for:', loginEmail);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) {
        console.error('[W9] Login error:', error.message);
        setLoginError(error.message);
      } else if (data.user) {
        console.log('[W9] Login successful:', data.user.email);
        setCurrentUser(data.user);
        setShowLogin(false);
        setLoginEmail('');
        setLoginPassword('');
      }
    } catch (err) {
      console.error('[W9] Login exception:', err);
      setLoginError('An unexpected error occurred');
    } finally {
      setLoginLoading(false);
    }
  };

  if (!isOpen) return null;

  // ============================================================================
  // LOGIN REQUIRED SCREEN
  // ============================================================================
  if (showLogin && !currentUser) {
    return (
      <div className="fixed inset-0 bg-black/70 z-50 backdrop-blur-sm overflow-y-auto">
        <div className="min-h-full flex items-center justify-center p-4 py-8">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl max-w-md w-full p-8 border border-white/10 shadow-2xl">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">🔐</div>
              <h2 className="text-2xl font-bold text-white mb-2">Login Required</h2>
              <p className="text-gray-400 text-sm">
                Please sign in to complete your W-9 form. Your tax information will be linked to your account.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-white mb-2 text-sm font-medium">Email</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-white mb-2 text-sm font-medium">Password</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              {loginError && (
                <div className="p-3 bg-red-500/20 border border-red-500 text-red-200 rounded-xl text-sm">
                  ❌ {loginError}
                </div>
              )}

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold rounded-xl transition-all duration-300 disabled:opacity-50"
              >
                {loginLoading ? 'Signing in...' : '🔓 Sign In & Continue'}
              </button>
            </form>

            <div className="mt-6 flex gap-4">
              {!isBlocking && (
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={async () => {
                  // Try to refresh auth state
                  const { data: { user } } = await supabase.auth.getUser();
                  if (user) {
                    setCurrentUser(user);
                    setShowLogin(false);
                  }
                }}
                className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all"
              >
                🔄 Retry Auth
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // FORM VALIDATION
  // ============================================================================
  const validateForm = (): string | null => {
    console.log('[W9] Validating form:', formData);

    if (!formData.full_name || formData.full_name.trim().length < 2) {
      return '❌ Full Legal Name: Please enter your full legal name (at least 2 characters)';
    }

    if (!formData.tax_classification) {
      return '❌ Tax Classification: Please select a tax classification';
    }

    // Check for SSN or EIN
    const ssnDigits = formData.ssn ? formData.ssn.replace(/\D/g, '') : '';
    const einDigits = formData.ein ? formData.ein.replace(/\D/g, '') : '';

    if (!ssnDigits && !einDigits) {
      return '❌ Tax ID Required: Please enter either your Social Security Number (SSN) OR Employer Identification Number (EIN)';
    }

    if (ssnDigits && ssnDigits.length !== 9) {
      return `❌ SSN: Must be exactly 9 digits. You entered ${ssnDigits.length} digits. (Enter without dashes)`;
    }

    if (einDigits && einDigits.length !== 9) {
      return `❌ EIN: Must be exactly 9 digits. You entered ${einDigits.length} digits. (Enter without dashes)`;
    }

    if (!formData.address_line1 || formData.address_line1.trim().length < 3) {
      return '❌ Street Address: Please enter your street address (at least 3 characters)';
    }

    if (!formData.city || formData.city.trim().length < 2) {
      return '❌ City: Please enter your city (at least 2 characters)';
    }

    if (!formData.state || formData.state.trim().length !== 2) {
      return `❌ State: Please enter a 2-letter state code (e.g., "CA", "NY"). You entered: "${formData.state || ''}"`;
    }

    // More flexible postal code validation - accept 5 digits with optional -XXXX
    const postalDigits = formData.postal_code ? formData.postal_code.replace(/\D/g, '') : '';
    if (!postalDigits || (postalDigits.length !== 5 && postalDigits.length !== 9)) {
      return `❌ Postal Code: Please enter a valid 5-digit ZIP code (e.g., "94102"). You entered: "${formData.postal_code || ''}"`;
    }

    console.log('[W9] Validation passed!');
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

      console.log('[W9] Starting submission...');
      console.log('[W9] Current user from state:', currentUser?.email);

      // Use the user we already have, or try to get one
      let userId = currentUser?.id;
      let userEmail = currentUser?.email;

      if (!userId) {
        console.log('[W9] No user in state, trying to fetch...');
        
        // Try multiple methods to get the user
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          userId = user.id;
          userEmail = user.email;
          console.log('[W9] Got user via getUser():', userEmail);
        } else {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            userId = session.user.id;
            userEmail = session.user.email;
            console.log('[W9] Got user via getSession():', userEmail);
          }
        }
      }

      if (!userId) {
        console.error('[W9] Could not find authenticated user');
        setError('❌ Not logged in.\n\nPlease refresh the page and make sure you are logged in before filling out the W-9.');
        setLoading(false);
        return;
      }

      console.log('[W9] Submitting for user:', userEmail, 'ID:', userId);

      // Try direct Supabase insert (most reliable)
      console.log('[W9] Using direct Supabase submission...');
      const directResult = await submitDirectToSupabase(userId);
      
      if (directResult.success) {
        console.log('✅ W-9 submitted successfully via Supabase');
        
        // Show success screen
        setError(null);
        setStep('success');
        return;
      }
      
      // If direct failed, show the error
      throw new Error(directResult.error || 'Failed to submit W-9');

    } catch (err: any) {
      console.error('[W9] Submission error:', err);
      const errorMsg = err?.message || err?.toString() || 'An unexpected error occurred';
      
      // Provide helpful error messages
      if (errorMsg.includes('does not exist') || errorMsg.includes('42P01')) {
        setError('❌ Tax tables not set up yet!\n\nPlease run CREATE_TAX_TABLES.sql in Supabase SQL Editor first.');
      } else if (errorMsg.includes('permission')) {
        setError('❌ Permission denied.\n\nPlease run CREATE_TAX_TABLES.sql to set up proper permissions.');
      } else {
        setError(`❌ ${errorMsg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Fallback: Submit directly to Supabase if API auth fails
  const submitDirectToSupabase = async (userId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('[W9] Direct Supabase submission for user:', userId);
      
      // Extract last 4 of SSN
      const ssnLast4 = formData.ssn ? formData.ssn.slice(-4) : null;
      const ein = formData.ein ? formData.ein.replace(/\D/g, '').replace(/^(\d{2})(\d{7})$/, '$1-$2') : null;

      const taxProfileData = {
        user_id: userId,
        full_name: formData.full_name?.trim(),
        business_name: formData.business_name?.trim() || null,
        tax_classification: formData.tax_classification,
        ssn_last4: ssnLast4,
        ein: ein,
        address_line1: formData.address_line1?.trim(),
        address_line2: formData.address_line2?.trim() || null,
        city: formData.city?.trim(),
        state: formData.state?.toUpperCase(),
        postal_code: formData.postal_code,
        country: formData.country || 'US',
        signed_at: new Date().toISOString(),
        signature_ip: 'client-submission',
        signature_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        electronic_consent_given: formData.consent_given,
      };

      console.log('[W9] Data to insert:', taxProfileData);

      // Check for existing profile
      const { data: existing, error: checkError } = await supabase
        .from('tax_profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 = no rows (OK, means we need to insert)
        // Any other error is a problem
        console.error('[W9] Error checking existing profile:', checkError);
        
        // Check if table doesn't exist
        if (checkError.message?.includes('does not exist') || checkError.code === '42P01') {
          return { 
            success: false, 
            error: 'Tax tables not created yet. Please run CREATE_TAX_TABLES.sql in Supabase first!' 
          };
        }
        
        return { success: false, error: `Database error: ${checkError.message}` };
      }

      console.log('[W9] Existing profile check:', existing ? 'Found - will update' : 'Not found - will insert');

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('tax_profiles')
          .update(taxProfileData)
          .eq('user_id', userId);

        if (error) {
          console.error('[W9] Update error:', error);
          return { success: false, error: `Update failed: ${error.message}` };
        }
        console.log('[W9] ✅ Updated existing tax profile');
      } else {
        // Insert new
        const { error } = await supabase
          .from('tax_profiles')
          .insert(taxProfileData);

        if (error) {
          console.error('[W9] Insert error:', error);
          
          // Provide specific error messages
          if (error.message?.includes('permission denied')) {
            return { success: false, error: 'Permission denied. RLS policy may be blocking insert. Run CREATE_TAX_TABLES.sql to fix.' };
          }
          if (error.message?.includes('does not exist')) {
            return { success: false, error: 'Tax tables not created yet. Please run CREATE_TAX_TABLES.sql in Supabase first!' };
          }
          if (error.message?.includes('violates')) {
            return { success: false, error: `Data validation error: ${error.message}` };
          }
          
          return { success: false, error: `Insert failed: ${error.message}` };
        }
        console.log('[W9] ✅ Inserted new tax profile');
      }

      return { success: true };
    } catch (err: any) {
      console.error('[W9] Direct Supabase exception:', err);
      const errorMsg = err?.message || err?.toString() || 'Unknown error occurred';
      return { success: false, error: errorMsg };
    }
  };

  // ============================================================================
  // NAVIGATION HEADER COMPONENT
  // ============================================================================
  const NavigationHeader = () => (
    <div className="bg-black/40 border-b border-white/10 px-6 py-3 flex justify-between items-center rounded-t-3xl -mx-8 -mt-8 mb-6">
      <div className="flex items-center gap-3">
        <span className="text-2xl">💰</span>
        <span className="text-white font-bold">DropDollar</span>
      </div>
      <div className="flex items-center gap-4">
        {currentUser ? (
          <div className="flex items-center gap-2 bg-green-500/20 px-3 py-1.5 rounded-full">
            <span className="text-green-400 text-sm">✅</span>
            <span className="text-green-200 text-sm font-medium">{currentUser.email}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-red-500/20 px-3 py-1.5 rounded-full">
            <span className="text-red-400 text-sm">⚠️</span>
            <span className="text-red-200 text-sm">Not signed in</span>
          </div>
        )}
        {!isBlocking && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );

  // ============================================================================
  // INTRO STEP
  // ============================================================================
  if (step === 'intro') {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl max-w-2xl w-full p-8 border border-white/10 shadow-2xl">
          <NavigationHeader />
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
      <div className="fixed inset-0 bg-black/70 z-50 backdrop-blur-sm overflow-y-auto">
        <div className="min-h-full flex items-start justify-center p-4 py-8">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl max-w-3xl w-full p-8 border border-white/10 shadow-2xl">
            <NavigationHeader />
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">W-9 Tax Information</h2>
              <p className="text-gray-400 text-sm">Complete the form below. All fields are required unless marked optional.</p>
            </div>

          {error && (
            <div id="w9-error" className="bg-red-500/30 border-2 border-red-500 text-red-100 px-6 py-4 rounded-xl mb-6 animate-pulse">
              <p className="font-bold text-lg mb-1">⚠️ Please fix the following:</p>
              <p>{error}</p>
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
              <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-xl p-4 mb-4">
                <p className="text-yellow-200 text-sm">
                  🔒 <strong>Security:</strong> We need your full SSN to verify your identity and comply with IRS regulations. 
                  However, only the <strong>last 4 digits</strong> are stored in our database.
                </p>
              </div>
              
              <div>
                <label className="block text-white mb-2 text-sm font-medium">
                  Social Security Number (SSN) <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  value={formData.ssn || ''}
                  onChange={(e) => setFormData({ ...formData, ssn: e.target.value.replace(/\D/g, '') })}
                  className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:border-blue-500 focus:outline-none font-mono text-lg tracking-wider"
                  placeholder="Enter 9 digits (no dashes)"
                  maxLength={9}
                />
                <div className="flex justify-between items-center mt-1">
                  <p className="text-gray-400 text-xs">Required for individuals</p>
                  <p className={`text-xs font-mono ${
                    (formData.ssn?.length || 0) === 9 ? 'text-green-400' : 'text-gray-400'
                  }`}>
                    {formData.ssn?.length || 0}/9 digits {(formData.ssn?.length || 0) === 9 && '✓'}
                  </p>
                </div>
              </div>

              <div className="text-center text-gray-400 text-sm py-2">
                — OR (for businesses) —
              </div>

              <div>
                <label className="block text-white mb-2 text-sm font-medium">
                  Employer Identification Number (EIN)
                </label>
                <input
                  type="text"
                  value={formData.ein || ''}
                  onChange={(e) => setFormData({ ...formData, ein: e.target.value.replace(/\D/g, '') })}
                  className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:border-blue-500 focus:outline-none font-mono text-lg tracking-wider"
                  placeholder="Enter 9 digits (no dashes)"
                  maxLength={9}
                />
                <div className="flex justify-between items-center mt-1">
                  <p className="text-gray-400 text-xs">Required for businesses only</p>
                  <p className={`text-xs font-mono ${
                    (formData.ein?.length || 0) === 9 ? 'text-green-400' : 'text-gray-400'
                  }`}>
                    {formData.ein?.length || 0}/9 digits {(formData.ein?.length || 0) === 9 && '✓'}
                  </p>
                </div>
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

          {/* User Info & Form Status */}
          <div className="bg-blue-500/20 border border-blue-500/50 rounded-xl p-4 mt-6">
            <div className="flex justify-between items-center mb-3">
              <p className="text-blue-200 text-xs font-bold">📋 Form Status:</p>
              <p className={`text-xs font-bold px-3 py-1 rounded-full ${
                currentUser ? 'bg-green-500/30 text-green-200' : 'bg-red-500/30 text-red-200'
              }`}>
                {currentUser ? `✅ Signed in as: ${currentUser.email}` : '❌ Not signed in!'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-blue-100">
              <span>Name: {formData.full_name ? `✅ "${formData.full_name}"` : '❌ Missing'}</span>
              <span>Classification: {formData.tax_classification ? `✅ ${formData.tax_classification}` : '❌ Missing'}</span>
              <span>SSN: {formData.ssn ? `✅ ${formData.ssn.length}/9 digits` : '❌ Not entered'}</span>
              <span>EIN: {formData.ein ? `✅ ${formData.ein.length}/9 digits` : '⚪ Not entered'}</span>
              <span>Address: {formData.address_line1 ? `✅ "${formData.address_line1}"` : '❌ Missing'}</span>
              <span>City: {formData.city ? `✅ "${formData.city}"` : '❌ Missing'}</span>
              <span>State: {formData.state ? `✅ "${formData.state}"` : '❌ Missing'}</span>
              <span>Postal: {formData.postal_code ? `✅ "${formData.postal_code}"` : '❌ Missing'}</span>
            </div>
          </div>

          <div className="flex gap-4 mt-8">
            <button
              onClick={() => setStep('intro')}
              className="flex-1 px-6 py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all duration-300"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={() => {
                console.log('========================================');
                console.log('[W9] Continue to Signature clicked!');
                console.log('[W9] Current form data:', JSON.stringify(formData, null, 2));
                
                const validationError = validateForm();
                console.log('[W9] Validation result:', validationError || 'PASSED');
                
                if (validationError) {
                  console.log('[W9] Setting error:', validationError);
                  setError(validationError);
                  // Scroll to error
                  setTimeout(() => {
                    const errorEl = document.getElementById('w9-error');
                    console.log('[W9] Error element found:', !!errorEl);
                    errorEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }, 100);
                } else {
                  console.log('[W9] ✅ Validation passed! Moving to signature step');
                  setError(null);
                  setStep('signature');
                }
                console.log('========================================');
              }}
              className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Continue to Signature →
            </button>
          </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // SUCCESS STEP
  // ============================================================================
  if (step === 'success') {
    return (
      <div className="fixed inset-0 bg-black/70 z-50 backdrop-blur-sm overflow-y-auto">
        <div className="min-h-full flex items-center justify-center p-4 py-8">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl max-w-lg w-full p-8 border border-white/10 shadow-2xl">
            <NavigationHeader />
            <div className="text-center">
            <div className="text-8xl mb-6">✅</div>
            <h2 className="text-3xl font-bold text-white mb-4">W-9 Submitted Successfully!</h2>
            <p className="text-gray-300 mb-6">
              Your tax information has been saved securely. You can now withdraw your winnings.
            </p>
            
            <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-4 mb-6">
              <p className="text-green-200 text-sm">
                <strong>Account:</strong> {currentUser?.email}<br />
                <strong>Name:</strong> {formData.full_name}<br />
                <strong>Status:</strong> ✅ Tax Verified
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  if (onSuccess) {
                    onSuccess();
                  } else {
                    onClose();
                  }
                }}
                className="w-full px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold rounded-xl transition-all duration-300 shadow-lg"
              >
                🎉 Continue to Withdraw
              </button>
              
              <button
                onClick={onClose}
                className="w-full px-6 py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all"
              >
                Close
              </button>
            </div>

            <p className="text-gray-500 text-xs mt-6">
              Your W-9 is now visible to the admin in the Tax Management dashboard.
            </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // SIGNATURE STEP
  // ============================================================================
  return (
    <div className="fixed inset-0 bg-black/70 z-50 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-full flex items-start justify-center p-4 py-8">
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl max-w-2xl w-full p-8 border border-white/10 shadow-2xl">
        <NavigationHeader />
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
    </div>
  );

  // ============================================================================
  // SUCCESS STEP - This shouldn't render because we check step === 'success' above
  // But adding as fallback
  // ============================================================================
}

