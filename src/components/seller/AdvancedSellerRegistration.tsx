'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import LegalModal from '@/components/legal/LegalModal';
import {
  CheckCircleIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  BuildingStorefrontIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  CreditCardIcon,
  TruckIcon,
  DocumentTextIcon,
  IdentificationIcon,
  CameraIcon,
} from '@heroicons/react/24/outline';

interface RegistrationProgress {
  registered: boolean;
  current_step: number;
  registration_completed: boolean;
  status?: string;
  shop_name?: string;
  seller_id?: string;
}

const STEPS = [
  { number: 1, title: 'Shop Information', icon: BuildingStorefrontIcon },
  { number: 2, title: 'Business Details', icon: BuildingOfficeIcon },
  { number: 3, title: 'Identity Verification', icon: IdentificationIcon },
  { number: 4, title: 'Contact Information', icon: MapPinIcon },
  { number: 5, title: 'Banking & Payment', icon: CreditCardIcon },
  { number: 6, title: 'Shipping & Policies', icon: TruckIcon },
  { number: 7, title: 'Review & Submit', icon: DocumentTextIcon },
];

export default function AdvancedSellerRegistration({ onComplete }: { onComplete?: () => void }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Step 1: Shop Information
  const [shopName, setShopName] = useState('');
  const [shopDescription, setShopDescription] = useState('');
  const [shopTagline, setShopTagline] = useState('');
  
  // Step 2: Business Details
  const [businessType, setBusinessType] = useState('individual');
  const [businessName, setBusinessName] = useState('');
  const [taxId, setTaxId] = useState('');
  
  // Step 3: Identity Verification (NEW - Etsy Requirements)
  const [fullLegalName, setFullLegalName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [ssnLast4, setSsnLast4] = useState('');
  const [dlFront, setDlFront] = useState<File | null>(null);
  const [dlBack, setDlBack] = useState<File | null>(null);
  const [selfiePhoto, setSelfiePhoto] = useState<File | null>(null);
  const [dlFrontPreview, setDlFrontPreview] = useState<string>('');
  const [dlBackPreview, setDlBackPreview] = useState<string>('');
  const [selfiePreview, setSelfiePreview] = useState<string>('');
  
  // Step 4: Contact Information
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('US');
  
  // Step 4: Banking & Payment
  const [payoutMethod, setPayoutMethod] = useState('bank_transfer');
  const [bankHolderName, setBankHolderName] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountType, setBankAccountType] = useState('checking');
  const [bankRouting, setBankRouting] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [paypalEmail, setPaypalEmail] = useState('');
  const [cryptoWallet, setCryptoWallet] = useState('');
  
  // Step 5: Shipping & Policies
  const [shipsFrom, setShipsFrom] = useState('');
  const [shippingCountries, setShippingCountries] = useState<string[]>(['US']);
  const [processingMin, setProcessingMin] = useState(1);
  const [processingMax, setProcessingMax] = useState(3);
  const [returnPolicy, setReturnPolicy] = useState('');
  const [shippingPolicy, setShippingPolicy] = useState('');
  
  // Step 6: Legal Agreements
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [sellerAgreementAccepted, setSellerAgreementAccepted] = useState(false);
  
  // Legal modal state
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [legalModalType, setLegalModalType] = useState<'terms' | 'privacy' | 'seller'>('terms');

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    try {
      const { data, error } = await supabase.rpc('get_seller_registration_progress');
      
      if (error) throw error;
      
      if (data?.registered && data?.current_step) {
        setCurrentStep(data.current_step);
      }
    } catch (error) {
      console.error('Error loading progress:', error);
    }
  }

  const handleResetRegistration = async () => {
    if (!confirm('Are you sure you want to start over? All your progress will be deleted.')) {
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const { data, error } = await supabase.rpc('reset_seller_registration');
      
      if (error) throw error;

      // Reset all form state
      setShopName('');
      setShopDescription('');
      setShopTagline('');
      setBusinessType('individual');
      setBusinessName('');
      setTaxId('');
      setFullLegalName('');
      setDateOfBirth('');
      setSsnLast4('');
      setDlFront(null);
      setDlBack(null);
      setSelfiePhoto(null);
      setDlFrontPreview('');
      setDlBackPreview('');
      setSelfiePreview('');
      setContactEmail('');
      setContactPhone('');
      setAddressLine1('');
      setAddressLine2('');
      setCity('');
      setState('');
      setPostalCode('');
      setCountry('US');
      setPayoutMethod('bank_transfer');
      setBankHolderName('');
      setBankName('');
      setBankAccountType('checking');
      setBankRouting('');
      setBankAccountNumber('');
      setPaypalEmail('');
      setCryptoWallet('');
      setShipsFrom('');
      setShippingCountries(['US']);
      setProcessingMin(1);
      setProcessingMax(3);
      setReturnPolicy('');
      setShippingPolicy('');
      setTermsAccepted(false);
      setPrivacyAccepted(false);
      setSellerAgreementAccepted(false);

      setCurrentStep(1);
      setMessage({ type: 'success', text: 'Registration reset! You can start over.' });
    } catch (error: any) {
      console.error('Reset error:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to reset registration' });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleStep1Submit() {
    if (!shopName.trim()) {
      setMessage({ type: 'error', text: 'Shop name is required' });
      return;
    }
    
    setIsLoading(true);
    setMessage(null);
    
    try {
      const { data, error } = await supabase.rpc('start_seller_registration', {
        shop_name_param: shopName.trim(),
        shop_description_param: shopDescription.trim() || null,
        shop_tagline_param: shopTagline.trim() || null,
      });
      
      if (error) throw error;
      
      if (data?.success) {
        setMessage({ type: 'success', text: data.message });
        setCurrentStep(2);
      } else {
        setMessage({ type: 'error', text: data?.message || 'Failed to create shop' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to create shop' });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleStep2Submit() {
    if (!businessType) {
      setMessage({ type: 'error', text: 'Business type is required' });
      return;
    }
    
    // Check if EIN is required for this business type
    const requiresEIN = ['llc', 'corporation', 'partnership', 'non_profit'].includes(businessType);
    if (requiresEIN && !taxId.trim()) {
      setMessage({ type: 'error', text: 'Tax ID (EIN) is required for this business type' });
      return;
    }
    
    setIsLoading(true);
    setMessage(null);
    
    try {
      const { data, error } = await supabase.rpc('update_seller_registration_step2', {
        business_type_param: businessType,
        business_name_param: businessName.trim() || null,
        tax_id_param: taxId.trim() || null,
      });
      
      if (error) throw error;
      
      if (data?.success) {
        setMessage({ type: 'success', text: data.message });
        setCurrentStep(3);
      } else {
        setMessage({ type: 'error', text: data?.message || 'Failed to save business details' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save business details' });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleStep3Submit() {
    // Validate all required fields
    if (!fullLegalName.trim()) {
      setMessage({ type: 'error', text: 'Full legal name is required' });
      return;
    }
    if (!dateOfBirth) {
      setMessage({ type: 'error', text: 'Date of birth is required' });
      return;
    }
    if (!ssnLast4 || ssnLast4.length !== 4) {
      setMessage({ type: 'error', text: 'SSN last 4 digits are required' });
      return;
    }
    if (!dlFront) {
      setMessage({ type: 'error', text: 'Driver\'s license front photo is required' });
      return;
    }
    if (!dlBack) {
      setMessage({ type: 'error', text: 'Driver\'s license back photo is required' });
      return;
    }
    if (!selfiePhoto) {
      setMessage({ type: 'error', text: 'Selfie with ID is required' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload documents to Supabase Storage
      const uploadFile = async (file: File, type: string) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${type}_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('seller-documents')
          .upload(fileName, file);
        
        if (uploadError) throw uploadError;
        return fileName;
      };

      setMessage({ type: 'success', text: 'Uploading documents...' });

      const dlFrontPath = await uploadFile(dlFront, 'dl_front');
      const dlBackPath = await uploadFile(dlBack, 'dl_back');
      const selfiePath = await uploadFile(selfiePhoto, 'selfie');

      // Save identity verification data
      const { data, error } = await supabase.rpc('update_seller_registration_step3_identity', {
        full_legal_name_param: fullLegalName.trim(),
        date_of_birth_param: dateOfBirth,
        ssn_last4_param: ssnLast4,
        dl_front_path_param: dlFrontPath,
        dl_back_path_param: dlBackPath,
        selfie_path_param: selfiePath
      });

      if (error) throw error;

      if (data?.success) {
        setMessage({ type: 'success', text: 'Identity verification submitted! Moving to next step...' });
        setTimeout(() => setCurrentStep(4), 1500);
      } else {
        setMessage({ type: 'error', text: data?.message || 'Failed to save identity verification' });
      }
    } catch (error: any) {
      console.error('Step 3 error:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to upload documents' });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleStep4Submit() {
    // This is now for Contact Information (old step 3)
    
    // Validate required fields
    if (!contactEmail.trim()) {
      setMessage({ type: 'error', text: 'Contact email is required' });
      return;
    }
    if (!contactPhone.trim()) {
      setMessage({ type: 'error', text: 'Phone number is required' });
      return;
    }
    if (!addressLine1.trim()) {
      setMessage({ type: 'error', text: 'Address is required' });
      return;
    }
    if (!city.trim()) {
      setMessage({ type: 'error', text: 'City is required' });
      return;
    }
    if (!state.trim()) {
      setMessage({ type: 'error', text: 'State is required' });
      return;
    }
    if (!postalCode.trim()) {
      setMessage({ type: 'error', text: 'Postal code is required' });
      return;
    }
    
    setIsLoading(true);
    setMessage(null);
    
    try {
      const { data, error } = await supabase.rpc('update_seller_registration_step3', {
        contact_email_param: contactEmail.trim(),
        contact_phone_param: contactPhone.trim(),
        address_line1_param: addressLine1.trim(),
        address_line2_param: addressLine2.trim() || null,
        city_param: city.trim(),
        state_param: state.trim(),
        postal_code_param: postalCode.trim(),
        country_param: country,
      });
      
      if (error) throw error;
      
      if (data?.success) {
        setMessage({ type: 'success', text: data.message });
        setCurrentStep(5);
      } else {
        setMessage({ type: 'error', text: data?.message || 'Failed to save contact information' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save contact information' });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleStep5Submit() {
    // This is now for Banking & Payment (old step 4)
    setIsLoading(true);
    setMessage(null);
    
    try {
      // Get last 4 digits of bank account if provided
      const bankLast4 = bankAccountNumber ? bankAccountNumber.slice(-4) : null;
      
      const { data, error } = await supabase.rpc('update_seller_registration_step4', {
        payout_method_param: payoutMethod,
        bank_holder_name_param: bankHolderName.trim() || null,
        bank_name_param: bankName.trim() || null,
        bank_account_type_param: bankAccountType,
        bank_routing_param: bankRouting.trim() || null,
        bank_last4_param: bankLast4,
        paypal_email_param: paypalEmail.trim() || null,
        crypto_wallet_param: cryptoWallet.trim() || null,
      });
      
      if (error) throw error;
      
      if (data?.success) {
        setMessage({ type: 'success', text: data.message });
        setCurrentStep(6);
      } else {
        setMessage({ type: 'error', text: data?.message || 'Failed to save payment information' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save payment information' });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleStep6Submit() {
    // This is now for Shipping & Policies (old step 5)
    if (!shipsFrom) {
      setMessage({ type: 'error', text: 'Shipping location is required' });
      return;
    }
    
    setIsLoading(true);
    setMessage(null);
    
    try {
      const { data, error } = await supabase.rpc('update_seller_registration_step5', {
        ships_from_param: shipsFrom.trim(),
        shipping_countries_param: shippingCountries,
        processing_min_param: processingMin,
        processing_max_param: processingMax,
        return_policy_param: returnPolicy.trim() || null,
        shipping_policy_param: shippingPolicy.trim() || null,
      });
      
      if (error) throw error;
      
      if (data?.success) {
        setMessage({ type: 'success', text: data.message });
        setCurrentStep(7);
      } else {
        setMessage({ type: 'error', text: data?.message || 'Failed to save shipping information' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save shipping information' });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleStep7Submit() {
    // This is now for Review & Submit (old step 6)
    if (!termsAccepted || !privacyAccepted || !sellerAgreementAccepted) {
      setMessage({ type: 'error', text: 'You must accept all agreements to continue' });
      return;
    }
    
    setIsLoading(true);
    setMessage(null);
    
    try {
      const { data, error } = await supabase.rpc('complete_seller_registration', {
        terms_accepted_param: termsAccepted,
        privacy_accepted_param: privacyAccepted,
        seller_agreement_accepted_param: sellerAgreementAccepted,
      });
      
      if (error) throw error;
      
      if (data?.success) {
        setMessage({ type: 'success', text: data.message });
        if (onComplete) onComplete();
      } else {
        setMessage({ type: 'error', text: data?.message || 'Failed to complete registration' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to complete registration' });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header with Reset Button */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Seller Registration</h1>
          <p className="text-gray-400 mt-1">Complete all steps to become a verified seller</p>
        </div>
        {currentStep > 1 && (
          <button
            onClick={handleResetRegistration}
            disabled={isLoading}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Start Over
          </button>
        )}
      </div>

      {/* Progress Stepper */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => (
            <div key={step.number} className="flex-1">
              <div className="flex items-center">
                <button
                  onClick={() => {
                    // Allow navigation to completed steps or current step
                    if (step.number <= currentStep) {
                      setCurrentStep(step.number);
                      setMessage(null);
                    }
                  }}
                  disabled={step.number > currentStep}
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                    currentStep >= step.number
                      ? 'border-blue-500 bg-blue-500 text-white hover:bg-blue-600 cursor-pointer'
                      : 'border-gray-600 bg-gray-800 text-gray-400 cursor-not-allowed'
                  }`}>
                  {currentStep > step.number ? (
                    <CheckCircleIcon className="w-6 h-6" />
                  ) : (
                    <step.icon className="w-5 h-5" />
                  )}
                </button>
                <div className="ml-2 flex-1">
                  <div className={`text-sm font-medium ${
                    currentStep >= step.number ? 'text-blue-400' : 'text-gray-400'
                  }`}>
                    Step {step.number}
                  </div>
                  <div className={`text-xs ${
                    currentStep >= step.number ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </div>
                </div>
                {index < STEPS.length - 1 && (
                  <ChevronRightIcon className="w-5 h-5 text-gray-600 mx-2" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success'
            ? 'bg-green-900/20 border border-green-700 text-green-300'
            : 'bg-red-900/20 border border-red-700 text-red-300'
        }`}>
          {message.text}
        </div>
      )}

      {/* Step Content */}
      <div className="bg-gray-800 rounded-xl p-8 border border-gray-700">
        {currentStep === 1 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Create Your Shop</h2>
            <p className="text-gray-300 mb-6">
              Choose a memorable name and describe what makes your shop special.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Shop Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="e.g. VintageGems, TechInnovations"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  maxLength={50}
                />
                <p className="text-xs text-gray-400 mt-1">Choose a unique name for your shop (3-50 characters)</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Shop Tagline
                </label>
                <input
                  type="text"
                  value={shopTagline}
                  onChange={(e) => setShopTagline(e.target.value)}
                  placeholder="e.g. Quality vintage finds since 2020"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  maxLength={100}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Shop Description
                </label>
                <textarea
                  value={shopDescription}
                  onChange={(e) => setShopDescription(e.target.value)}
                  placeholder="Describe your shop, what you sell, and what makes you unique..."
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  maxLength={500}
                />
                <p className="text-xs text-gray-400 mt-1">{shopDescription.length}/500 characters</p>
              </div>
            </div>
            
            <button
              onClick={handleStep1Submit}
              disabled={isLoading}
              className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              {isLoading ? 'Creating Shop...' : 'Continue to Business Details'}
              <ChevronRightIcon className="w-5 h-5 ml-2" />
            </button>
          </div>
        )}

        {currentStep === 2 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Business Details</h2>
            <p className="text-gray-300 mb-6">
              Tell us about your business structure and tax information.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Business Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="individual">Individual</option>
                  <option value="sole_proprietorship">Sole Proprietorship</option>
                  <option value="partnership">Partnership</option>
                  <option value="llc">LLC</option>
                  <option value="corporation">Corporation</option>
                  <option value="non_profit">Non-Profit</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Legal Business Name
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Official registered business name"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">If different from your shop name</p>
              </div>
              
              {(businessType === 'llc' || businessType === 'corporation' || businessType === 'partnership' || businessType === 'non_profit') && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Tax ID (EIN) {(businessType === 'llc' || businessType === 'corporation' || businessType === 'partnership' || businessType === 'non_profit') ? '*' : ''}
                  </label>
                  <input
                    type="text"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    placeholder="XX-XXXXXXX"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {businessType === 'llc' || businessType === 'corporation' || businessType === 'partnership' || businessType === 'non_profit'
                      ? '🔒 EIN required for this business type (encrypted and secure)'
                      : '🔒 Optional for sole proprietors and individuals (encrypted and secure)'}
                  </p>
                </div>
              )}
              
              {(businessType === 'individual' || businessType === 'sole_proprietorship') && (
                <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                  <p className="text-blue-300 text-sm">
                    ℹ️ <strong>Tax ID Optional:</strong> As a {businessType === 'individual' ? 'individual' : 'sole proprietor'}, you can use your Social Security Number for tax purposes. You don't need to provide an EIN unless you prefer to keep your SSN private.
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex gap-4 mt-6">
              <button
                onClick={() => setCurrentStep(1)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-bold transition-colors flex items-center justify-center"
              >
                <ChevronLeftIcon className="w-5 h-5 mr-2" />
                Back
              </button>
              <button
                onClick={handleStep2Submit}
                disabled={isLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {isLoading ? 'Saving...' : 'Continue'}
                <ChevronRightIcon className="w-5 h-5 ml-2" />
              </button>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <IdentificationIcon className="w-8 h-8 mr-3 text-blue-400" />
              Identity Verification
            </h2>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
              <p className="text-yellow-200 text-sm">
                <strong>Required by Law:</strong> To comply with tax regulations and prevent fraud, we need to verify your identity.
                All information is encrypted and stored securely.
              </p>
            </div>
            
            <div className="space-y-6">
              {/* Full Legal Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Full Legal Name (as on Driver's License) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={fullLegalName}
                  onChange={(e) => setFullLegalName(e.target.value)}
                  placeholder="John Michael Smith"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Date of Birth & SSN */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Date of Birth <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    SSN Last 4 Digits <span className="text-red-500">*</span>
                    <span className="text-xs text-gray-400 ml-2">(for tax reporting)</span>
                  </label>
                  <input
                    type="text"
                    value={ssnLast4}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setSsnLast4(value);
                    }}
                    placeholder="1234"
                    maxLength={4}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Driver's License Front */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Driver's License (Front) <span className="text-red-500">*</span>
                </label>
                <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center">
                  {dlFrontPreview ? (
                    <div className="relative">
                      <img src={dlFrontPreview} alt="License Front" className="max-h-48 mx-auto rounded" />
                      <button
                        onClick={() => {
                          setDlFront(null);
                          setDlFrontPreview('');
                        }}
                        className="mt-2 text-red-400 hover:text-red-300 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div>
                      <CameraIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-400 mb-2">Upload front of your driver's license</p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setDlFront(file);
                            setDlFrontPreview(URL.createObjectURL(file));
                          }
                        }}
                        className="hidden"
                        id="dl-front"
                      />
                      <label
                        htmlFor="dl-front"
                        className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg cursor-pointer"
                      >
                        Choose File
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Driver's License Back */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Driver's License (Back) <span className="text-red-500">*</span>
                </label>
                <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center">
                  {dlBackPreview ? (
                    <div className="relative">
                      <img src={dlBackPreview} alt="License Back" className="max-h-48 mx-auto rounded" />
                      <button
                        onClick={() => {
                          setDlBack(null);
                          setDlBackPreview('');
                        }}
                        className="mt-2 text-red-400 hover:text-red-300 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div>
                      <CameraIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-400 mb-2">Upload back of your driver's license</p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setDlBack(file);
                            setDlBackPreview(URL.createObjectURL(file));
                          }
                        }}
                        className="hidden"
                        id="dl-back"
                      />
                      <label
                        htmlFor="dl-back"
                        className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg cursor-pointer"
                      >
                        Choose File
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Selfie with ID */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Selfie Holding Your ID <span className="text-red-500">*</span>
                </label>
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-2">
                  <p className="text-blue-200 text-xs">
                    📸 Take a photo of yourself holding your driver's license next to your face. 
                    Make sure your face and the ID are clearly visible.
                  </p>
                </div>
                <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center">
                  {selfiePreview ? (
                    <div className="relative">
                      <img src={selfiePreview} alt="Selfie" className="max-h-48 mx-auto rounded" />
                      <button
                        onClick={() => {
                          setSelfiePhoto(null);
                          setSelfiePreview('');
                        }}
                        className="mt-2 text-red-400 hover:text-red-300 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div>
                      <CameraIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-400 mb-2">Upload selfie with your ID</p>
                      <input
                        type="file"
                        accept="image/*"
                        capture="user"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setSelfiePhoto(file);
                            setSelfiePreview(URL.createObjectURL(file));
                          }
                        }}
                        className="hidden"
                        id="selfie"
                      />
                      <label
                        htmlFor="selfie"
                        className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg cursor-pointer"
                      >
                        Take/Upload Photo
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Navigation Buttons for Step 3 */}
            <div className="flex justify-between mt-8">
              <button
                onClick={() => setCurrentStep(2)}
                className="flex items-center px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
                disabled={isLoading}
              >
                <ChevronLeftIcon className="w-5 h-5 mr-2" />
                Back
              </button>
              <button
                onClick={handleStep3Submit}
                className="flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                {isLoading ? 'Uploading...' : 'Next: Contact Info'}
                {!isLoading && <ChevronRightIcon className="w-5 h-5 ml-2" />}
              </button>
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Contact Information</h2>
            <p className="text-gray-300 mb-6">
              Provide your business address and contact details.
            </p>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Contact Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="business@email.com"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Address Line 1 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  placeholder="Street address"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Address Line 2
                </label>
                <input
                  type="text"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  placeholder="Apartment, suite, etc. (optional)"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="City"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    State <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="State"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    ZIP Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="12345"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex gap-4 mt-6">
              <button
                onClick={() => setCurrentStep(2)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-bold transition-colors flex items-center justify-center"
              >
                <ChevronLeftIcon className="w-5 h-5 mr-2" />
                Back
              </button>
              <button
                onClick={handleStep3Submit}
                disabled={isLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {isLoading ? 'Saving...' : 'Continue'}
                <ChevronRightIcon className="w-5 h-5 ml-2" />
              </button>
            </div>
          </div>
        )}

        {currentStep === 5 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Banking & Payment</h2>
            <p className="text-gray-300 mb-6">
              Set up how you'll receive payments from sales.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Payout Method
                </label>
                <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4 mb-4">
                  <p className="text-blue-300 text-sm">
                    ✅ We use Stripe Connect for secure bank transfers. You'll connect your bank account after approval.
                  </p>
                </div>
                <input
                  type="text"
                  value="Bank Transfer (via Stripe)"
                  disabled
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>
              
              {payoutMethod === 'bank_transfer' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Account Holder Name
                    </label>
                    <input
                      type="text"
                      value={bankHolderName}
                      onChange={(e) => setBankHolderName(e.target.value)}
                      placeholder="Full name on account"
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g. Chase, Bank of America"
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Account Type
                      </label>
                      <select
                        value={bankAccountType}
                        onChange={(e) => setBankAccountType(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="checking">Checking</option>
                        <option value="savings">Savings</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Routing Number
                      </label>
                      <input
                        type="text"
                        value={bankRouting}
                        onChange={(e) => setBankRouting(e.target.value)}
                        placeholder="9 digits"
                        maxLength={9}
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Account Number
                    </label>
                    <input
                      type="password"
                      value={bankAccountNumber}
                      onChange={(e) => setBankAccountNumber(e.target.value)}
                      placeholder="Account number"
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-400 mt-1">🔒 Securely encrypted. Only last 4 digits stored.</p>
                  </div>
                </>
              )}
              
              <div className="bg-gray-700/30 border border-gray-600 rounded-lg p-4">
                <p className="text-gray-300 text-sm">
                  <strong>Note:</strong> After your seller application is approved, you'll be able to connect your bank account through Stripe Connect in your dashboard. This ensures secure and compliant payment processing.
                </p>
              </div>
            </div>
            
            <div className="flex gap-4 mt-6">
              <button
                onClick={() => setCurrentStep(3)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-bold transition-colors flex items-center justify-center"
              >
                <ChevronLeftIcon className="w-5 h-5 mr-2" />
                Back
              </button>
              <button
                onClick={handleStep4Submit}
                disabled={isLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {isLoading ? 'Saving...' : 'Continue'}
                <ChevronRightIcon className="w-5 h-5 ml-2" />
              </button>
            </div>
          </div>
        )}

        {currentStep === 6 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Shipping & Policies</h2>
            <p className="text-gray-300 mb-6">
              Define your shipping options and store policies.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Ships From <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={shipsFrom}
                  onChange={(e) => setShipsFrom(e.target.value)}
                  placeholder="City, State or City, Country"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Processing Time (Min Days)
                  </label>
                  <input
                    type="number"
                    value={processingMin}
                    onChange={(e) => setProcessingMin(parseInt(e.target.value))}
                    min={1}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Processing Time (Max Days)
                  </label>
                  <input
                    type="number"
                    value={processingMax}
                    onChange={(e) => setProcessingMax(parseInt(e.target.value))}
                    min={1}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Shipping Policy
                </label>
                <textarea
                  value={shippingPolicy}
                  onChange={(e) => setShippingPolicy(e.target.value)}
                  placeholder="Describe your shipping methods, rates, and delivery times..."
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Return Policy
                </label>
                <textarea
                  value={returnPolicy}
                  onChange={(e) => setReturnPolicy(e.target.value)}
                  placeholder="Describe your return and exchange policy..."
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="flex gap-4 mt-6">
              <button
                onClick={() => setCurrentStep(5)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-bold transition-colors flex items-center justify-center"
              >
                <ChevronLeftIcon className="w-5 h-5 mr-2" />
                Back
              </button>
              <button
                onClick={handleStep6Submit}
                disabled={isLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {isLoading ? 'Saving...' : 'Continue'}
                <ChevronRightIcon className="w-5 h-5 ml-2" />
              </button>
            </div>
          </div>
        )}

        {currentStep === 7 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Review & Submit</h2>
            <p className="text-gray-300 mb-6">
              Please review and accept our agreements to complete your registration.
            </p>
            
            <div className="space-y-4 mb-6">
              <div className="bg-gray-700 rounded-lg p-4">
                <label className="flex items-start">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-1 mr-3 w-5 h-5 cursor-pointer"
                  />
                  <div className="flex-1">
                    <span className="text-white font-medium">
                      I accept the{' '}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setLegalModalType('terms');
                          setLegalModalOpen(true);
                        }}
                        className="text-blue-400 hover:text-blue-300 underline"
                      >
                        Terms of Service
                      </button>
                    </span>
                    <p className="text-sm text-gray-400 mt-1">
                      By checking this box, you agree to our terms and conditions for using the platform.
                    </p>
                  </div>
                </label>
              </div>
              
              <div className="bg-gray-700 rounded-lg p-4">
                <label className="flex items-start">
                  <input
                    type="checkbox"
                    checked={privacyAccepted}
                    onChange={(e) => setPrivacyAccepted(e.target.checked)}
                    className="mt-1 mr-3 w-5 h-5 cursor-pointer"
                  />
                  <div className="flex-1">
                    <span className="text-white font-medium">
                      I accept the{' '}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setLegalModalType('privacy');
                          setLegalModalOpen(true);
                        }}
                        className="text-blue-400 hover:text-blue-300 underline"
                      >
                        Privacy Policy
                      </button>
                    </span>
                    <p className="text-sm text-gray-400 mt-1">
                      You understand how we collect, use, and protect your personal information.
                    </p>
                  </div>
                </label>
              </div>
              
              <div className="bg-gray-700 rounded-lg p-4">
                <label className="flex items-start">
                  <input
                    type="checkbox"
                    checked={sellerAgreementAccepted}
                    onChange={(e) => setSellerAgreementAccepted(e.target.checked)}
                    className="mt-1 mr-3 w-5 h-5 cursor-pointer"
                  />
                  <div className="flex-1">
                    <span className="text-white font-medium">
                      I accept the{' '}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setLegalModalType('seller');
                          setLegalModalOpen(true);
                        }}
                        className="text-blue-400 hover:text-blue-300 underline"
                      >
                        Seller Agreement
                      </button>
                    </span>
                    <p className="text-sm text-gray-400 mt-1">
                      You agree to our seller policies, fees (15%), and responsibilities as a marketplace seller.
                    </p>
                  </div>
                </label>
              </div>
            </div>
            
            <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4 mb-6">
              <p className="text-blue-300 text-sm">
                🎉 <strong>Almost there!</strong> Once you submit, your application will be reviewed by our admin team.
                You'll be notified via email when your shop is approved.
              </p>
            </div>
            
            <div className="flex gap-4">
              <button
                onClick={() => setCurrentStep(6)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-bold transition-colors flex items-center justify-center"
              >
                <ChevronLeftIcon className="w-5 h-5 mr-2" />
                Back
              </button>
              <button
                onClick={handleStep7Submit}
                disabled={isLoading || !termsAccepted || !privacyAccepted || !sellerAgreementAccepted}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isLoading ? 'Submitting...' : 'Submit Application'}
                <CheckCircleIcon className="w-5 h-5 ml-2" />
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Legal Documents Modal */}
      <LegalModal
        isOpen={legalModalOpen}
        onClose={() => setLegalModalOpen(false)}
        type={legalModalType}
      />
    </div>
  );
}

