'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  UserIcon, 
  EnvelopeIcon, 
  PhoneIcon, 
  LockClosedIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  EyeSlashIcon,
  HomeIcon,
  BellIcon,
  HeartIcon,
  ShoppingBagIcon
} from '@heroicons/react/24/outline';
import UserManagementService from '@/lib/userManagement';
import LocationVerificationService from '@/lib/locationVerification';
import { UserDatabaseService } from '@/lib/userDatabase';

export default function BuyerSignupPage() {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'US'
    },
    marketingPreferences: {
      emailMarketing: false,
      smsMarketing: false,
      hotDealsAlerts: true,
      newProductAlerts: true,
      tournamentAlerts: true,
      weeklyNewsletter: false,
    },
    agreedToTerms: false,
    agreedToPrivacy: false
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationStep, setRegistrationStep] = useState<'form' | 'success'>('form');
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [locationVerification, setLocationVerification] = useState<any>(null);
  const [locationBlocked, setLocationBlocked] = useState<boolean>(false);

  // Location verification on component mount
  useEffect(() => {
    const verifyLocation = async () => {
      try {
        const verification = await LocationVerificationService.verifyDuringRegistration('temp_buyer', 'auto-detected');
        setLocationVerification(verification);
        setLocationBlocked(!verification.isAllowed);
      } catch (error) {
        console.error('Location verification error:', error);
      }
    };

    verifyLocation();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        address: { ...prev.address, [addressField]: value }
      }));
    } else if (name.startsWith('marketingPreferences.')) {
      const prefField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        marketingPreferences: { 
          ...prev.marketingPreferences, 
          [prefField]: (e.target as HTMLInputElement).checked 
        }
      }));
    } else if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};

    // Required fields
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
    if (!formData.password) newErrors.password = 'Password is required';
    if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    
    // Address validation
    if (!formData.address.street.trim()) newErrors['address.street'] = 'Street address is required';
    if (!formData.address.city.trim()) newErrors['address.city'] = 'City is required';
    if (!formData.address.state.trim()) newErrors['address.state'] = 'State is required';
    if (!formData.address.zipCode.trim()) newErrors['address.zipCode'] = 'ZIP code is required';
    
    // Agreement validation
    if (!formData.agreedToTerms) newErrors.agreedToTerms = 'You must agree to the Terms of Service';
    if (!formData.agreedToPrivacy) newErrors.agreedToPrivacy = 'You must agree to the Privacy Policy';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    if (locationBlocked) return;

    setIsSubmitting(true);

    try {
      // Register user with new database service
      const result = await UserDatabaseService.registerUser({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        accountType: 'buyer',
        marketingPreferences: formData.marketingPreferences,
        address: formData.address
      });

      if (result.success) {
        console.log('🎉 Buyer account created successfully!');
        
        // Automatically log in the user
        const loginResult = await UserDatabaseService.loginUser(
          formData.email, 
          formData.password, 
          'registration'
        );

        if (loginResult.success) {
          setRegistrationStep('success');
          
          // Redirect to dashboard after 3 seconds
          setTimeout(() => {
            router.push('/dashboard');
          }, 3000);
        } else {
          // Registration successful but login failed - redirect to login
          setTimeout(() => {
            router.push('/auth/login?message=Registration successful! Please log in.');
          }, 3000);
        }
      } else {
        setErrors({ general: result.message });
      }
    } catch (error) {
      console.error('Registration error:', error);
      setErrors({ general: 'Registration failed. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (registrationStep === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
            <CheckCircleIcon className="h-8 w-8 text-green-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome to DropDollar!</h2>
          <p className="text-gray-600 mb-6">
            Your buyer account has been created successfully. You're now logged in and ready to start competing!
          </p>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center text-green-800">
              <ShoppingBagIcon className="h-5 w-5 mr-2" />
              <span className="font-medium">100 Loyalty Points Added!</span>
            </div>
            <p className="text-green-700 text-sm mt-1">Welcome bonus for new members</p>
          </div>
          
          <p className="text-sm text-gray-500 mb-4">Redirecting to your dashboard...</p>
          
          <Link
            href="/dashboard"
            className="inline-block bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-3">
              <img src="/DropCoin.png" alt="DropDollar" className="h-8 w-8" />
              <span className="text-xl font-bold text-gray-900">DropDollar</span>
            </Link>
            <div className="flex items-center space-x-4">
              <Link href="/auth/login" className="text-gray-700 hover:text-green-600 font-medium">
                Already have an account? Sign In
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Location Verification Status */}
      {locationVerification && (
        <div className={`${locationBlocked ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'} border-b px-4 py-3`}>
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center">
              {locationBlocked ? (
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2" />
              ) : (
                <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
              )}
              <div className="flex-1">
                <p className={`text-sm font-medium ${locationBlocked ? 'text-red-800' : 'text-green-800'}`}>
                  {locationBlocked ? 'Registration Blocked' : 'Location Verified'}
                </p>
                <p className={`text-xs ${locationBlocked ? 'text-red-700' : 'text-green-700'}`}>
                  {locationVerification.reason}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <UserIcon className="h-10 w-10 text-green-600" />
              <h1 className="text-3xl font-bold text-gray-900">Create Your Buyer Account</h1>
            </div>
            <p className="text-gray-600">
              Join thousands of players competing for amazing prizes through skill-based gaming!
            </p>
          </div>

          {errors.general && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{errors.general}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                    errors.firstName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter your first name"
                />
                {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                    errors.lastName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter your last name"
                />
                {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <div className="relative">
                <EnvelopeIcon className="h-5 w-5 text-gray-400 absolute left-3 top-4" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter your email address"
                />
              </div>
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number *
              </label>
              <div className="relative">
                <PhoneIcon className="h-5 w-5 text-gray-400 absolute left-3 top-4" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                    errors.phone ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="(555) 123-4567"
                />
              </div>
              {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
            </div>

            {/* Password Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password *
                </label>
                <div className="relative">
                  <LockClosedIcon className="h-5 w-5 text-gray-400 absolute left-3 top-4" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                      errors.password ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Create a password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-4 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password *
                </label>
                <div className="relative">
                  <LockClosedIcon className="h-5 w-5 text-gray-400 absolute left-3 top-4" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                      errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Confirm your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-4 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
              </div>
            </div>

            {/* Address Information */}
            <div className="border-t pt-6">
              <div className="flex items-center mb-4">
                <HomeIcon className="h-5 w-5 text-gray-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">Address Information</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    name="address.street"
                    value={formData.address.street}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                      errors['address.street'] ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="123 Main Street"
                  />
                  {errors['address.street'] && <p className="text-red-500 text-sm mt-1">{errors['address.street']}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City *
                    </label>
                    <input
                      type="text"
                      name="address.city"
                      value={formData.address.city}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                        errors['address.city'] ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="New York"
                    />
                    {errors['address.city'] && <p className="text-red-500 text-sm mt-1">{errors['address.city']}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      State *
                    </label>
                    <input
                      type="text"
                      name="address.state"
                      value={formData.address.state}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                        errors['address.state'] ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="NY"
                    />
                    {errors['address.state'] && <p className="text-red-500 text-sm mt-1">{errors['address.state']}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ZIP Code *
                    </label>
                    <input
                      type="text"
                      name="address.zipCode"
                      value={formData.address.zipCode}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                        errors['address.zipCode'] ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="10001"
                    />
                    {errors['address.zipCode'] && <p className="text-red-500 text-sm mt-1">{errors['address.zipCode']}</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Marketing Preferences */}
            <div className="border-t pt-6">
              <div className="flex items-center mb-4">
                <BellIcon className="h-5 w-5 text-gray-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">Marketing Preferences</h3>
              </div>
              
              <div className="space-y-3">
                <label className="flex items-start">
                  <input
                    type="checkbox"
                    name="marketingPreferences.emailMarketing"
                    checked={formData.marketingPreferences.emailMarketing}
                    onChange={handleInputChange}
                    className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <div className="ml-3">
                    <span className="text-sm font-medium text-gray-700">Email Marketing</span>
                    <p className="text-xs text-gray-500">Receive promotional emails and special offers</p>
                  </div>
                </label>

                <label className="flex items-start">
                  <input
                    type="checkbox"
                    name="marketingPreferences.smsMarketing"
                    checked={formData.marketingPreferences.smsMarketing}
                    onChange={handleInputChange}
                    className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <div className="ml-3">
                    <span className="text-sm font-medium text-gray-700">SMS Marketing</span>
                    <p className="text-xs text-gray-500">Receive text messages about deals and updates</p>
                  </div>
                </label>

                <label className="flex items-start">
                  <input
                    type="checkbox"
                    name="marketingPreferences.hotDealsAlerts"
                    checked={formData.marketingPreferences.hotDealsAlerts}
                    onChange={handleInputChange}
                    className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <div className="ml-3">
                    <span className="text-sm font-medium text-gray-700">🔥 Hot Deals Alerts</span>
                    <p className="text-xs text-gray-500">Get notified when hot competitions are about to start</p>
                  </div>
                </label>

                <label className="flex items-start">
                  <input
                    type="checkbox"
                    name="marketingPreferences.newProductAlerts"
                    checked={formData.marketingPreferences.newProductAlerts}
                    onChange={handleInputChange}
                    className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <div className="ml-3">
                    <span className="text-sm font-medium text-gray-700">New Product Alerts</span>
                    <p className="text-xs text-gray-500">Be the first to know about new competitions</p>
                  </div>
                </label>

                <label className="flex items-start">
                  <input
                    type="checkbox"
                    name="marketingPreferences.tournamentAlerts"
                    checked={formData.marketingPreferences.tournamentAlerts}
                    onChange={handleInputChange}
                    className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <div className="ml-3">
                    <span className="text-sm font-medium text-gray-700">🏆 Tournament Alerts</span>
                    <p className="text-xs text-gray-500">Get notified about cash prize tournaments</p>
                  </div>
                </label>

                <label className="flex items-start">
                  <input
                    type="checkbox"
                    name="marketingPreferences.weeklyNewsletter"
                    checked={formData.marketingPreferences.weeklyNewsletter}
                    onChange={handleInputChange}
                    className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <div className="ml-3">
                    <span className="text-sm font-medium text-gray-700">Weekly Newsletter</span>
                    <p className="text-xs text-gray-500">Weekly roundup of competitions and platform updates</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Terms and Privacy */}
            <div className="border-t pt-6">
              <div className="space-y-3">
                <label className="flex items-start">
                  <input
                    type="checkbox"
                    name="agreedToTerms"
                    checked={formData.agreedToTerms}
                    onChange={handleInputChange}
                    className={`mt-1 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded ${
                      errors.agreedToTerms ? 'border-red-500' : ''
                    }`}
                  />
                  <div className="ml-3">
                    <span className="text-sm text-gray-700">
                      I agree to the{' '}
                      <Link href="/terms" className="text-green-600 hover:text-green-700 underline">
                        Terms of Service
                      </Link>{' '}
                      and understand the platform fees. *
                    </span>
                  </div>
                </label>
                {errors.agreedToTerms && <p className="text-red-500 text-sm">{errors.agreedToTerms}</p>}

                <label className="flex items-start">
                  <input
                    type="checkbox"
                    name="agreedToPrivacy"
                    checked={formData.agreedToPrivacy}
                    onChange={handleInputChange}
                    className={`mt-1 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded ${
                      errors.agreedToPrivacy ? 'border-red-500' : ''
                    }`}
                  />
                  <div className="ml-3">
                    <span className="text-sm text-gray-700">
                      I have read and agree to the{' '}
                      <Link href="/privacy" className="text-green-600 hover:text-green-700 underline">
                        Privacy Policy
                      </Link>{' '}
                      regarding the collection and use of my personal information. *
                    </span>
                  </div>
                </label>
                {errors.agreedToPrivacy && <p className="text-red-500 text-sm">{errors.agreedToPrivacy}</p>}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={isSubmitting || locationBlocked}
                className={`w-full py-4 px-6 rounded-lg font-semibold text-white transition-colors ${
                  isSubmitting || locationBlocked
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Creating Your Account...
                  </div>
                ) : locationBlocked ? (
                  'Registration Blocked - Invalid Location'
                ) : (
                  'Create My Buyer Account'
                )}
              </button>
            </div>
          </form>

          <div className="mt-8 text-center">
            <p className="text-gray-600">
              Want to sell items instead?{' '}
              <Link href="/seller/apply" className="text-green-600 hover:text-green-700 font-medium">
                Apply to become a seller
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}