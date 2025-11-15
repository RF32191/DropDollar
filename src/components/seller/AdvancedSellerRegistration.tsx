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
  { number: 3, title: 'Contact Information', icon: MapPinIcon },
  { number: 4, title: 'Banking & Payment', icon: CreditCardIcon },
  { number: 5, title: 'Shipping & Policies', icon: TruckIcon },
  { number: 6, title: 'Review & Submit', icon: DocumentTextIcon },
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
  
  // Step 3: Contact Information
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
    if (!contactEmail || !contactPhone || !addressLine1 || !city || !state || !postalCode) {
      setMessage({ type: 'error', text: 'All contact fields are required' });
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
        setCurrentStep(4);
      } else {
        setMessage({ type: 'error', text: data?.message || 'Failed to save contact information' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save contact information' });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleStep4Submit() {
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
        setCurrentStep(5);
      } else {
        setMessage({ type: 'error', text: data?.message || 'Failed to save payment information' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save payment information' });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleStep5Submit() {
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
        setCurrentStep(6);
      } else {
        setMessage({ type: 'error', text: data?.message || 'Failed to save shipping information' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save shipping information' });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleStep6Submit() {
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
      {/* Progress Stepper */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => (
            <div key={step.number} className="flex-1">
              <div className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  currentStep >= step.number
                    ? 'border-blue-500 bg-blue-500 text-white'
                    : 'border-gray-600 bg-gray-800 text-gray-400'
                }`}>
                  {currentStep > step.number ? (
                    <CheckCircleIcon className="w-6 h-6" />
                  ) : (
                    <step.icon className="w-5 h-5" />
                  )}
                </div>
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

        {currentStep === 4 && (
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

        {currentStep === 5 && (
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
                onClick={() => setCurrentStep(4)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-bold transition-colors flex items-center justify-center"
              >
                <ChevronLeftIcon className="w-5 h-5 mr-2" />
                Back
              </button>
              <button
                onClick={handleStep5Submit}
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
                onClick={() => setCurrentStep(5)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-bold transition-colors flex items-center justify-center"
              >
                <ChevronLeftIcon className="w-5 h-5 mr-2" />
                Back
              </button>
              <button
                onClick={handleStep6Submit}
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

