'use client';

import { useState } from 'react';
import Link from 'next/link';
import { EyeIcon, EyeSlashIcon, ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { validateDateOfBirth, MINIMUM_AGE } from '@/lib/legalConstants';
import { formatPhoneNumber, validatePhoneNumber } from '@/lib/utils/phoneFormatter';

export default function SimpleRegisterPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    dateOfBirth: '', // REQUIRED: Age verification
    location: '',
    marketingConsent: false,
    agreeToTerms: false,
    agreeToPrivacy: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    
    // Format phone number on input
    if (name === 'phone' && type === 'tel') {
      // Allow user to type freely, but format on blur
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handlePhoneBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const phoneValue = e.target.value;
    if (phoneValue) {
      const formatted = formatPhoneNumber(phoneValue);
      if (formatted) {
        setFormData(prev => ({
          ...prev,
          phone: formatted
        }));
        // Reset verification when phone changes
        setPhoneVerified(false);
        setVerificationSent(false);
        setVerificationCode('');
        
        // Check if phone is already registered
        try {
          const response = await fetch('/api/auth/check-phone', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: formatted })
          });
          
          const data = await response.json();
          
          if (data.exists) {
            setError('❌ This phone number is already registered. Please use a different number or sign in.');
          } else {
            // Clear phone-related errors if phone is available
            if (error?.includes('phone number is already registered')) {
              setError(null);
            }
          }
        } catch (err) {
          console.error('Error checking phone:', err);
        }
      }
    }
  };

  const handleSendVerificationCode = async () => {
    if (!formData.phone || formData.phone.trim() === '') {
      setError('Please enter a phone number first.');
      return;
    }

    const phoneValidation = validatePhoneNumber(formData.phone);
    if (!phoneValidation.valid) {
      setError(phoneValidation.error || 'Invalid phone number format');
      return;
    }

    setIsSendingCode(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/send-phone-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: formData.phone }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error('❌ Phone verification failed:', data.message);
        throw new Error(data.message || 'Failed to send verification code');
      }

      console.log('✅ Verification code sent successfully');
      setVerificationSent(true);
      // In development, show the code
      if (data.code) {
        setError(`[DEV MODE] Verification code: ${data.code}`);
      } else {
        setError(null);
      }
    } catch (error: any) {
      console.error('❌ Send verification error:', error);
      setError(error.message || 'Failed to send verification code. Please try again.');
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a 6-digit verification code');
      return;
    }

    setIsVerifyingCode(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/verify-phone-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          phone: formData.phone,
          code: verificationCode 
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Invalid verification code');
      }

      setPhoneVerified(true);
      setError(null);
    } catch (error: any) {
      setError(error.message || 'Invalid verification code. Please try again.');
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Basic validation
    if (!formData.firstName || !formData.lastName || !formData.username || !formData.email || !formData.password) {
      setError('Please fill in all required fields.');
      setIsSubmitting(false);
      return;
    }

    if (!formData.email.includes('@')) {
      setError('Please enter a valid email address.');
      setIsSubmitting(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      setIsSubmitting(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setIsSubmitting(false);
      return;
    }

    // PHONE NUMBER VERIFICATION - Required for identity protection
    if (!formData.phone || formData.phone.trim() === '') {
      setError('Phone number is required for account security and identity verification.');
      setIsSubmitting(false);
      return;
    }

    // Validate phone number format using utility function
    const phoneValidation = validatePhoneNumber(formData.phone);
    if (!phoneValidation.valid) {
      setError(phoneValidation.error || 'Please enter a valid phone number (e.g., 555-123-4567 or (555) 123-4567).');
      setIsSubmitting(false);
      return;
    }
    
    // Update form data with formatted phone number
    if (phoneValidation.formatted) {
      setFormData(prev => ({
        ...prev,
        phone: phoneValidation.formatted!
      }));
    }

    // REQUIRE PHONE VERIFICATION before allowing registration
    if (!phoneVerified) {
      setError('Please verify your phone number before creating an account. Click "Send Verification Code" below.');
      setIsSubmitting(false);
      return;
    }

    // AGE VERIFICATION - Required for legal compliance
    if (!formData.dateOfBirth) {
      setError('Date of birth is required for age verification.');
      setIsSubmitting(false);
      return;
    }

    const ageValidation = validateDateOfBirth(formData.dateOfBirth);
    if (!ageValidation.isValid) {
      setError(ageValidation.error || 'Invalid date of birth');
      setIsSubmitting(false);
      return;
    }

    // Log age verification for compliance
    console.log('✅ Age verification passed during registration:', {
      age: ageValidation.age,
      timestamp: new Date().toISOString()
    });

    // Check if user agreed to terms and privacy
    if (!formData.agreeToTerms) {
      setError('You must agree to the Terms of Service to create an account.');
      setIsSubmitting(false);
      return;
    }

    if (!formData.agreeToPrivacy) {
      setError('You must agree to the Privacy Policy to create an account.');
      setIsSubmitting(false);
      return;
    }

    // Check for duplicate email and phone
    try {
      const emailCheckResponse = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: formData.email }),
      });

      if (emailCheckResponse.ok) {
        const emailCheckData = await emailCheckResponse.json();
        if (emailCheckData.exists) {
          setError('An account with this email address already exists. Please use a different email or try signing in.');
          setIsSubmitting(false);
          return;
        }
      }

      // Check phone number (REQUIRED for all new accounts)
      const phoneCheckResponse = await fetch('/api/auth/check-phone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: formData.phone }),
      });

      if (phoneCheckResponse.ok) {
        const phoneCheckData = await phoneCheckResponse.json();
        if (phoneCheckData.exists) {
          setError('❌ This phone number is already registered. Please use a different phone number or try signing in.');
          setIsSubmitting(false);
          return;
        }
      }
    } catch (error) {
      console.error('Validation check failed:', error);
      // Continue with registration if validation check fails
    }

    // Submit registration
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Registration API error:', errorData);
        setError(errorData.message || 'Registration failed. Please try again.');
        setIsSubmitting(false);
        return;
      }

      // Success - redirect to login
      alert('Account created successfully! Please sign in.');
      window.location.href = '/auth/login';
    } catch (error: any) {
      console.error('❌ Registration error:', error);
      setError(error.message || 'Registration failed. Please try again.');
    }
    
    setIsSubmitting(false);
  };

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex flex-col justify-center py-4 sm:py-12 px-4 sm:px-6 lg:px-8"
      style={{
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation'
      }}
    >
      <div className="mx-auto w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center group">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-full flex items-center justify-center mr-3 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
              <img
                src="/DropCoin.png"
                alt="DropDollar Logo"
                className="w-8 h-8 object-contain"
              />
            </div>
            <span className="text-3xl font-extrabold text-white group-hover:text-yellow-300 transition-colors drop-shadow-lg">DropDollar</span>
          </Link>
        </div>

        <div className="bg-gray-800 py-6 sm:py-8 px-4 sm:px-6 lg:px-10 shadow-2xl rounded-lg border border-gray-700">
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-white text-center">
              Create your account
            </h2>
            <p className="mt-2 text-sm text-gray-400 text-center">
              Or{' '}
              <Link href="/auth/login" className="font-medium text-blue-400 hover:text-blue-300">
                sign in to your existing account
              </Link>
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-md bg-red-900 p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mt-0.5" aria-hidden="true" />
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-sm font-medium text-red-200">Registration failed</h3>
                    <div className="mt-2 text-sm text-red-300 break-words">
                      <p>{error}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-300 mb-1">
                  First name *
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  autoComplete="given-name"
                  required
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className="mt-1 appearance-none block w-full px-4 py-3 text-base sm:text-sm border border-gray-600 rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white"
                  style={{ fontSize: '16px' }} // Prevent zoom on iOS
                  placeholder="John"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-300 mb-1">
                  Last name *
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  autoComplete="family-name"
                  required
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className="mt-1 appearance-none block w-full px-4 py-3 text-base sm:text-sm border border-gray-600 rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white"
                  style={{ fontSize: '16px' }} // Prevent zoom on iOS
                  placeholder="Doe"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-1">
                Username *
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={formData.username}
                onChange={handleInputChange}
                className="mt-1 appearance-none block w-full px-4 py-3 text-base sm:text-sm border border-gray-600 rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white"
                style={{ fontSize: '16px' }} // Prevent zoom on iOS
                placeholder="johndoe"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                Email address *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className="mt-1 appearance-none block w-full px-4 py-3 text-base sm:text-sm border border-gray-600 rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white"
                style={{ fontSize: '16px' }} // Prevent zoom on iOS
                placeholder="you@example.com"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                Password *
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="appearance-none block w-full px-4 py-3 pr-12 text-base sm:text-sm border border-gray-600 rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white"
                  style={{ fontSize: '16px' }} // Prevent zoom on iOS
                  placeholder="••••••••"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-200 touch-manipulation"
                  style={{ minWidth: '44px', minHeight: '44px' }} // Mobile touch target
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isSubmitting}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-6 w-6" />
                  ) : (
                    <EyeIcon className="h-6 w-6" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1">
                Confirm password *
              </label>
              <div className="mt-1 relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="appearance-none block w-full px-4 py-3 pr-12 text-base sm:text-sm border border-gray-600 rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white"
                  style={{ fontSize: '16px' }} // Prevent zoom on iOS
                  placeholder="••••••••"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-200 touch-manipulation"
                  style={{ minWidth: '44px', minHeight: '44px' }} // Mobile touch target
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isSubmitting}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon className="h-6 w-6" />
                  ) : (
                    <EyeIcon className="h-6 w-6" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-300">
                Phone number <span className="text-red-400">*</span>
                <span className="text-xs text-gray-400 ml-2">(Required for account security)</span>
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                value={formData.phone}
                onChange={handleInputChange}
                onBlur={handlePhoneBlur}
                required
                className="mt-1 appearance-none block w-full px-4 py-3 text-base sm:text-sm border border-gray-600 rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white"
                style={{ fontSize: '16px' }} // Prevent zoom on iOS
                placeholder="+1 (555) 123-4567"
                disabled={isSubmitting}
              />
              <p className="mt-1 text-xs text-gray-400">
                🔒 Your phone number is used for identity verification and account security
              </p>
              
              {/* Phone Verification Section */}
              {formData.phone && validatePhoneNumber(formData.phone).valid && (
                <div className="mt-4 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                  {!phoneVerified ? (
                    <>
                      {!verificationSent ? (
                        <div>
                          <button
                            type="button"
                            onClick={handleSendVerificationCode}
                            disabled={isSendingCode || isSubmitting}
                            className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md transition-colors touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ minHeight: '48px' }}
                          >
                            {isSendingCode ? (
                              <>
                                <ArrowPathIcon className="h-5 w-5 animate-spin inline mr-2" />
                                Sending...
                              </>
                            ) : (
                              '📱 Send Verification Code'
                            )}
                          </button>
                          <p className="mt-2 text-xs text-gray-400 text-center">
                            We'll send a 6-digit code via SMS to verify your phone number
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div>
                            <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-300 mb-1">
                              Enter Verification Code *
                            </label>
                            <input
                              id="verificationCode"
                              type="text"
                              inputMode="numeric"
                              maxLength={6}
                              value={verificationCode}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                                setVerificationCode(value);
                              }}
                              className="w-full px-4 py-3 text-base sm:text-sm border border-gray-600 rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white text-center text-2xl tracking-widest"
                              style={{ fontSize: '16px' }}
                              placeholder="000000"
                              disabled={isVerifyingCode || isSubmitting}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleVerifyCode}
                            disabled={isVerifyingCode || verificationCode.length !== 6 || isSubmitting}
                            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ minHeight: '48px' }}
                          >
                            {isVerifyingCode ? (
                              <>
                                <ArrowPathIcon className="h-5 w-5 animate-spin inline mr-2" />
                                Verifying...
                              </>
                            ) : (
                              '✓ Verify Code'
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setVerificationSent(false);
                              setVerificationCode('');
                            }}
                            className="w-full py-2 px-4 text-sm text-gray-400 hover:text-gray-300 transition-colors"
                            disabled={isVerifyingCode || isSubmitting}
                          >
                            Resend Code
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center justify-center p-2 bg-green-900/30 border border-green-700 rounded-md">
                      <span className="text-green-400 font-medium">✓ Phone Number Verified</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-300 mb-1">
                Date of Birth <span className="text-red-400">*</span>
                <span className="text-xs text-gray-400 ml-2">(Must be 18+ to participate)</span>
              </label>
              <input
                id="dateOfBirth"
                name="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={handleInputChange}
                required
                max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                className="mt-1 appearance-none block w-full px-4 py-3 text-base sm:text-sm border border-gray-600 rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white"
                style={{ fontSize: '16px' }} // Prevent zoom on iOS
                disabled={isSubmitting}
              />
              <p className="mt-1 text-xs text-gray-400">
                🔞 Age verification required for legal compliance with skill-based gaming laws
              </p>
            </div>

            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-300 mb-1">
                Location
              </label>
              <input
                id="location"
                name="location"
                type="text"
                autoComplete="address-level2"
                value={formData.location}
                onChange={handleInputChange}
                className="mt-1 appearance-none block w-full px-4 py-3 text-base sm:text-sm border border-gray-600 rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white"
                style={{ fontSize: '16px' }} // Prevent zoom on iOS
                placeholder="New York, NY"
                disabled={isSubmitting}
              />
            </div>

            <div className="flex items-start">
              <input
                id="marketingConsent"
                name="marketingConsent"
                type="checkbox"
                checked={formData.marketingConsent}
                onChange={handleInputChange}
                className="h-5 w-5 mt-0.5 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-700 flex-shrink-0"
                style={{ minWidth: '20px', minHeight: '20px' }} // Mobile touch target
                disabled={isSubmitting}
              />
              <label htmlFor="marketingConsent" className="ml-3 block text-sm text-gray-300">
                I agree to receive marketing emails and updates
              </label>
            </div>

            {/* Terms and Privacy Policy Checkboxes */}
            <div className="space-y-4">
              {/* Terms of Service */}
              <div className="border border-gray-600 rounded-lg p-4 bg-gray-800/50">
                <div className="flex items-start space-x-3">
                  <input
                    id="agreeToTerms"
                    name="agreeToTerms"
                    type="checkbox"
                    checked={formData.agreeToTerms}
                    onChange={handleInputChange}
                    className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-700 mt-1 flex-shrink-0"
                    style={{ minWidth: '20px', minHeight: '20px' }} // Mobile touch target
                    disabled={isSubmitting}
                    required
                  />
                  <div className="flex-1">
                    <label htmlFor="agreeToTerms" className="text-sm font-medium text-gray-300">
                      I agree to the Terms of Service *
                    </label>
                    <div className="mt-2 max-h-32 overflow-y-auto bg-gray-900/50 rounded p-3 text-xs text-gray-400 border border-gray-700">
                      <p className="mb-2">
                        <strong>Key Terms:</strong>
                      </p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>You must be 18+ and reside in a legal jurisdiction</li>
                        <li>Skill-based gaming platform with real money prizes</li>
                        <li>1 Token = $1 USD, tokens are non-refundable</li>
                        <li>Location verification required for legal compliance</li>
                        <li>Prohibited states: AL, AK, AZ, AR, CT, DE, HI, ID, LA, MT, NV, SC, SD, TN, UT, VT, WA, WI</li>
                        <li>No cheating, bots, or multiple accounts</li>
                        <li>Minimum withdrawal: $10, 3% transaction fee</li>
                        <li>Governing law: California, arbitration in Riverside County</li>
                      </ul>
                      <p className="mt-2">
                        <Link href="/terms" className="text-blue-400 hover:text-blue-300 underline">
                          Read full Terms of Service
                        </Link>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Privacy Policy */}
              <div className="border border-gray-600 rounded-lg p-4 bg-gray-800/50">
                <div className="flex items-start space-x-3">
                  <input
                    id="agreeToPrivacy"
                    name="agreeToPrivacy"
                    type="checkbox"
                    checked={formData.agreeToPrivacy}
                    onChange={handleInputChange}
                    className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-700 mt-1 flex-shrink-0"
                    style={{ minWidth: '20px', minHeight: '20px' }} // Mobile touch target
                    disabled={isSubmitting}
                    required
                  />
                  <div className="flex-1">
                    <label htmlFor="agreeToPrivacy" className="text-sm font-medium text-gray-300">
                      I agree to the Privacy Policy *
                    </label>
                    <div className="mt-2 max-h-32 overflow-y-auto bg-gray-900/50 rounded p-3 text-xs text-gray-400 border border-gray-700">
                      <p className="mb-2">
                        <strong>Data Collection:</strong>
                      </p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Personal info: name, email, username, age verification</li>
                        <li>Payment info: processed securely through Stripe</li>
                        <li>Location data: for legal compliance verification</li>
                        <li>Gameplay data: scores, performance, transaction history</li>
                        <li>Technical data: device info, IP addresses, cookies</li>
                        <li>Data shared with: Stripe, Supabase, Vercel, analytics providers</li>
                        <li>Data retention: 7 years after account closure</li>
                        <li>Your rights: access, correction, deletion, portability</li>
                      </ul>
                      <p className="mt-2">
                        <Link href="/privacy" className="text-blue-400 hover:text-blue-300 underline">
                          Read full Privacy Policy
                        </Link>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center items-center py-4 px-4 border border-transparent rounded-md shadow-sm text-base sm:text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors touch-manipulation"
                style={{ minHeight: '48px' }} // Mobile touch target (48px minimum)
              >
                {isSubmitting ? (
                  <ArrowPathIcon className="h-5 w-5 animate-spin mr-2" />
                ) : null}
                {isSubmitting ? 'Creating account...' : 'Create account'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}