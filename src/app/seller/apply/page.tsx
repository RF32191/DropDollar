'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { sellerDatabase, SellerApplication } from '@/lib/sellerDatabase';
import Footer from '@/components/layout/Footer';
import { 
  BuildingOfficeIcon,
  DocumentTextIcon,
  CreditCardIcon,
  ShoppingBagIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

interface ApplicationFormData {
  // Business Information
  businessName: string;
  businessType: 'individual' | 'sole_proprietorship' | 'partnership' | 'llc' | 'corporation' | 'nonprofit';
  businessDescription: string;
  businessAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  businessPhone: string;
  businessEmail: string;
  website: string;
  
  // Tax Information
  taxId: string;
  taxIdType: 'ssn' | 'ein';
  
  // Banking Information
  bankAccount: {
    accountHolderName: string;
    bankName: string;
    accountType: 'checking' | 'savings';
    routingNumber: string;
    accountNumber: string;
  };
  
  // Product Information
  productCategories: string[];
  estimatedMonthlyVolume: string;
  productSources: string[];
  hasInventory: boolean;
  
  // Legal & Compliance
  hasBusinessLicense: boolean;
  businessLicenseNumber: string;
  hasInsurance: boolean;
  insuranceProvider: string;
  agreeToTerms: boolean;
  agreeToFees: boolean;
}

interface FormErrors {
  [key: string]: string;
}

export default function SellerApplicationPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [existingApplication, setExistingApplication] = useState<SellerApplication | null>(null);

  const [formData, setFormData] = useState<ApplicationFormData>({
    businessName: '',
    businessType: 'individual',
    businessDescription: '',
    businessAddress: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'United States'
    },
    businessPhone: '',
    businessEmail: '',
    website: '',
    taxId: '',
    taxIdType: 'ssn',
    bankAccount: {
      accountHolderName: '',
      bankName: '',
      accountType: 'checking',
      routingNumber: '',
      accountNumber: ''
    },
    productCategories: [],
    estimatedMonthlyVolume: '',
    productSources: [],
    hasInventory: false,
    hasBusinessLicense: false,
    businessLicenseNumber: '',
    hasInsurance: false,
    insuranceProvider: '',
    agreeToTerms: false,
    agreeToFees: false
  });

  const totalSteps = 5;
  const productCategoryOptions = [
    'Electronics & Technology',
    'Fashion & Apparel',
    'Home & Garden',
    'Health & Beauty',
    'Sports & Outdoors',
    'Toys & Games',
    'Books & Media',
    'Automotive',
    'Jewelry & Accessories',
    'Art & Crafts',
    'Food & Beverages',
    'Pet Supplies',
    'Office & Business',
    'Baby & Kids',
    'Other'
  ];

  const volumeOptions = [
    'Less than $1,000',
    '$1,000 - $5,000',
    '$5,000 - $10,000',
    '$10,000 - $25,000',
    '$25,000 - $50,000',
    '$50,000 - $100,000',
    'More than $100,000'
  ];

  const sourceOptions = [
    'I make the products myself',
    'I work with manufacturers',
    'I buy wholesale',
    'I dropship products',
    'I resell vintage/used items',
    'I offer digital products/services',
    'Other'
  ];

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/register?message=Create a buyer account first, then apply to become a seller');
      return;
    }

    if (user) {
      // Check if user already has an application
      checkExistingApplication();
    }
  }, [user, isLoading, router]);

  const checkExistingApplication = async () => {
    if (!user) return;
    
    try {
      const application = await sellerDatabase.getApplicationByUserId(user.id);
      if (application) {
        setExistingApplication(application);
      }
    } catch (error) {
      console.error('Error checking existing application:', error);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => {
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        return {
          ...prev,
          [parent]: {
            ...(prev[parent as keyof ApplicationFormData] as any),
            [child]: value
          }
        };
      }
      return { ...prev, [field]: value };
    });

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleArrayChange = (field: string, value: string, checked: boolean) => {
    setFormData(prev => {
      const currentArray = prev[field as keyof ApplicationFormData] as string[];
      if (checked) {
        return { ...prev, [field]: [...currentArray, value] };
      } else {
        return { ...prev, [field]: currentArray.filter(item => item !== value) };
      }
    });
  };

  const validateStep = (step: number): boolean => {
    const newErrors: FormErrors = {};

    switch (step) {
      case 1: // Business Information
        if (!formData.businessName.trim()) newErrors.businessName = 'Business name is required';
        if (!formData.businessDescription.trim()) newErrors.businessDescription = 'Business description is required';
        if (!formData.businessAddress.street.trim()) newErrors['businessAddress.street'] = 'Street address is required';
        if (!formData.businessAddress.city.trim()) newErrors['businessAddress.city'] = 'City is required';
        if (!formData.businessAddress.state.trim()) newErrors['businessAddress.state'] = 'State is required';
        if (!formData.businessAddress.zipCode.trim()) newErrors['businessAddress.zipCode'] = 'ZIP code is required';
        if (!formData.businessPhone.trim()) newErrors.businessPhone = 'Business phone is required';
        if (!formData.businessEmail.trim()) newErrors.businessEmail = 'Business email is required';
        break;

      case 2: // Tax Information
        if (!formData.taxId.trim()) newErrors.taxId = 'Tax ID is required';
        break;

      case 3: // Banking Information
        if (!formData.bankAccount.accountHolderName.trim()) newErrors['bankAccount.accountHolderName'] = 'Account holder name is required';
        if (!formData.bankAccount.bankName.trim()) newErrors['bankAccount.bankName'] = 'Bank name is required';
        if (!formData.bankAccount.routingNumber.trim()) newErrors['bankAccount.routingNumber'] = 'Routing number is required';
        if (!formData.bankAccount.accountNumber.trim()) newErrors['bankAccount.accountNumber'] = 'Account number is required';
        break;

      case 4: // Product Information
        if (formData.productCategories.length === 0) newErrors.productCategories = 'Select at least one product category';
        if (!formData.estimatedMonthlyVolume) newErrors.estimatedMonthlyVolume = 'Estimated monthly volume is required';
        if (formData.productSources.length === 0) newErrors.productSources = 'Select at least one product source';
        break;

      case 5: // Legal & Compliance
        if (!formData.agreeToTerms) newErrors.agreeToTerms = 'You must agree to the terms and conditions';
        if (!formData.agreeToFees) newErrors.agreeToFees = 'You must agree to the fee structure';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep) || !user) return;

    setIsSubmitting(true);
    
    try {
      const result = await sellerDatabase.submitApplication(user.id, {
        businessName: formData.businessName,
        businessType: formData.businessType,
        businessDescription: formData.businessDescription,
        businessAddress: formData.businessAddress,
        businessPhone: formData.businessPhone,
        businessEmail: formData.businessEmail,
        website: formData.website,
        taxId: formData.taxId,
        taxIdType: formData.taxIdType,
        bankAccount: formData.bankAccount,
        productCategories: formData.productCategories,
        estimatedMonthlyVolume: formData.estimatedMonthlyVolume,
        productSources: formData.productSources,
        hasInventory: formData.hasInventory,
        hasBusinessLicense: formData.hasBusinessLicense,
        businessLicenseNumber: formData.businessLicenseNumber,
        hasInsurance: formData.hasInsurance,
        insuranceProvider: formData.insuranceProvider,
        agreeToTerms: formData.agreeToTerms,
        agreeToFees: formData.agreeToFees,
        documents: [] // Will be added later with file upload
      });

      if (result.success) {
        router.push('/seller/apply/success');
      } else {
        setErrors({ submit: result.error || 'Failed to submit application' });
      }
    } catch (error) {
      console.error('Error submitting application:', error);
      setErrors({ submit: 'Failed to submit application. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  // Show existing application status
  if (existingApplication) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6">
                {existingApplication.status === 'approved' ? (
                  <CheckCircleIcon className="w-16 h-16 text-green-500" />
                ) : existingApplication.status === 'rejected' ? (
                  <ExclamationTriangleIcon className="w-16 h-16 text-red-500" />
                ) : (
                  <InformationCircleIcon className="w-16 h-16 text-blue-500" />
                )}
              </div>
              
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                Seller Application Status
              </h1>
              
              <div className="mb-6">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  existingApplication.status === 'approved' ? 'bg-green-100 text-green-800' :
                  existingApplication.status === 'rejected' ? 'bg-red-100 text-red-800' :
                  existingApplication.status === 'under_review' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {existingApplication.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>

              <p className="text-gray-600 dark:text-gray-300 mb-8">
                {existingApplication.status === 'approved' && 'Congratulations! Your seller application has been approved.'}
                {existingApplication.status === 'rejected' && 'Your seller application was not approved at this time.'}
                {existingApplication.status === 'under_review' && 'Your application is currently under review by our team.'}
                {existingApplication.status === 'pending' && 'Your application has been submitted and is pending review.'}
              </p>

              {existingApplication.reviewNotes && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Review Notes:</h3>
                  <p className="text-gray-600 dark:text-gray-300">{existingApplication.reviewNotes}</p>
                </div>
              )}

              <div className="flex justify-center space-x-4">
                {existingApplication.status === 'approved' && (
                  <button
                    onClick={() => router.push('/seller/dashboard')}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold"
                  >
                    Go to Seller Dashboard
                  </button>
                )}
                <button
                  onClick={() => router.push('/dashboard')}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-3 mb-6">
              <BuildingOfficeIcon className="h-8 w-8 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Business Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Business Name *
                </label>
                <input
                  type="text"
                  value={formData.businessName}
                  onChange={(e) => handleInputChange('businessName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Your business name"
                />
                {errors.businessName && <p className="mt-1 text-sm text-red-600">{errors.businessName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Business Type *
                </label>
                <select
                  value={formData.businessType}
                  onChange={(e) => handleInputChange('businessType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="individual">Individual</option>
                  <option value="sole_proprietorship">Sole Proprietorship</option>
                  <option value="partnership">Partnership</option>
                  <option value="llc">LLC</option>
                  <option value="corporation">Corporation</option>
                  <option value="nonprofit">Nonprofit</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Business Description *
              </label>
              <textarea
                value={formData.businessDescription}
                onChange={(e) => handleInputChange('businessDescription', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Describe your business and what you sell..."
              />
              {errors.businessDescription && <p className="mt-1 text-sm text-red-600">{errors.businessDescription}</p>}
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Business Address</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Street Address *
                </label>
                <input
                  type="text"
                  value={formData.businessAddress.street}
                  onChange={(e) => handleInputChange('businessAddress.street', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
                {errors['businessAddress.street'] && <p className="mt-1 text-sm text-red-600">{errors['businessAddress.street']}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    value={formData.businessAddress.city}
                    onChange={(e) => handleInputChange('businessAddress.city', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                  {errors['businessAddress.city'] && <p className="mt-1 text-sm text-red-600">{errors['businessAddress.city']}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    State *
                  </label>
                  <input
                    type="text"
                    value={formData.businessAddress.state}
                    onChange={(e) => handleInputChange('businessAddress.state', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                  {errors['businessAddress.state'] && <p className="mt-1 text-sm text-red-600">{errors['businessAddress.state']}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    ZIP Code *
                  </label>
                  <input
                    type="text"
                    value={formData.businessAddress.zipCode}
                    onChange={(e) => handleInputChange('businessAddress.zipCode', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                  {errors['businessAddress.zipCode'] && <p className="mt-1 text-sm text-red-600">{errors['businessAddress.zipCode']}</p>}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Business Phone *
                </label>
                <input
                  type="tel"
                  value={formData.businessPhone}
                  onChange={(e) => handleInputChange('businessPhone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
                {errors.businessPhone && <p className="mt-1 text-sm text-red-600">{errors.businessPhone}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Business Email *
                </label>
                <input
                  type="email"
                  value={formData.businessEmail}
                  onChange={(e) => handleInputChange('businessEmail', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
                {errors.businessEmail && <p className="mt-1 text-sm text-red-600">{errors.businessEmail}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Website (Optional)
              </label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="https://your-website.com"
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-3 mb-6">
              <DocumentTextIcon className="h-8 w-8 text-green-600" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Tax Information</h2>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
              <div className="flex">
                <InformationCircleIcon className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="ml-3">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    We need your tax information for IRS reporting purposes. This information is encrypted and secure.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tax ID Type *
                </label>
                <select
                  value={formData.taxIdType}
                  onChange={(e) => handleInputChange('taxIdType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="ssn">Social Security Number (SSN)</option>
                  <option value="ein">Employer Identification Number (EIN)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {formData.taxIdType === 'ssn' ? 'Social Security Number' : 'Employer Identification Number'} *
                </label>
                <input
                  type="text"
                  value={formData.taxId}
                  onChange={(e) => handleInputChange('taxId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder={formData.taxIdType === 'ssn' ? 'XXX-XX-XXXX' : 'XX-XXXXXXX'}
                />
                {errors.taxId && <p className="mt-1 text-sm text-red-600">{errors.taxId}</p>}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-3 mb-6">
              <CreditCardIcon className="h-8 w-8 text-purple-600" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Banking Information</h2>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="ml-3">
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Your banking information is used for payouts and is securely encrypted. We never store your full account details.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Account Holder Name *
                </label>
                <input
                  type="text"
                  value={formData.bankAccount.accountHolderName}
                  onChange={(e) => handleInputChange('bankAccount.accountHolderName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
                {errors['bankAccount.accountHolderName'] && <p className="mt-1 text-sm text-red-600">{errors['bankAccount.accountHolderName']}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bank Name *
                </label>
                <input
                  type="text"
                  value={formData.bankAccount.bankName}
                  onChange={(e) => handleInputChange('bankAccount.bankName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
                {errors['bankAccount.bankName'] && <p className="mt-1 text-sm text-red-600">{errors['bankAccount.bankName']}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Account Type *
                </label>
                <select
                  value={formData.bankAccount.accountType}
                  onChange={(e) => handleInputChange('bankAccount.accountType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="checking">Checking</option>
                  <option value="savings">Savings</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Routing Number *
                </label>
                <input
                  type="text"
                  value={formData.bankAccount.routingNumber}
                  onChange={(e) => handleInputChange('bankAccount.routingNumber', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="9 digits"
                />
                {errors['bankAccount.routingNumber'] && <p className="mt-1 text-sm text-red-600">{errors['bankAccount.routingNumber']}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Account Number *
                </label>
                <input
                  type="text"
                  value={formData.bankAccount.accountNumber}
                  onChange={(e) => handleInputChange('bankAccount.accountNumber', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
                {errors['bankAccount.accountNumber'] && <p className="mt-1 text-sm text-red-600">{errors['bankAccount.accountNumber']}</p>}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-3 mb-6">
              <ShoppingBagIcon className="h-8 w-8 text-orange-600" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Product Information</h2>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Product Categories * (Select all that apply)
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {productCategoryOptions.map((category) => (
                  <label key={category} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.productCategories.includes(category)}
                      onChange={(e) => handleArrayChange('productCategories', category, e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{category}</span>
                  </label>
                ))}
              </div>
              {errors.productCategories && <p className="mt-1 text-sm text-red-600">{errors.productCategories}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Estimated Monthly Sales Volume *
              </label>
              <select
                value={formData.estimatedMonthlyVolume}
                onChange={(e) => handleInputChange('estimatedMonthlyVolume', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Select volume range</option>
                {volumeOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              {errors.estimatedMonthlyVolume && <p className="mt-1 text-sm text-red-600">{errors.estimatedMonthlyVolume}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Product Sources * (Select all that apply)
              </label>
              <div className="space-y-2">
                {sourceOptions.map((source) => (
                  <label key={source} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.productSources.includes(source)}
                      onChange={(e) => handleArrayChange('productSources', source, e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{source}</span>
                  </label>
                ))}
              </div>
              {errors.productSources && <p className="mt-1 text-sm text-red-600">{errors.productSources}</p>}
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.hasInventory}
                  onChange={(e) => handleInputChange('hasInventory', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  I currently have inventory ready to sell
                </span>
              </label>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-3 mb-6">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Legal & Compliance</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.hasBusinessLicense}
                    onChange={(e) => handleInputChange('hasBusinessLicense', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    I have a business license (if required in my jurisdiction)
                  </span>
                </label>
                
                {formData.hasBusinessLicense && (
                  <div className="mt-3 ml-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Business License Number
                    </label>
                    <input
                      type="text"
                      value={formData.businessLicenseNumber}
                      onChange={(e) => handleInputChange('businessLicenseNumber', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.hasInsurance}
                    onChange={(e) => handleInputChange('hasInsurance', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    I have business insurance
                  </span>
                </label>
                
                {formData.hasInsurance && (
                  <div className="mt-3 ml-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Insurance Provider
                    </label>
                    <input
                      type="text"
                      value={formData.insuranceProvider}
                      onChange={(e) => handleInputChange('insuranceProvider', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Fee Structure</h3>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <div className="flex justify-between">
                  <span>Listing Fee (per listing):</span>
                  <span className="font-semibold">$0.20</span>
                </div>
                <div className="flex justify-between">
                  <span>Transaction Fee:</span>
                  <span className="font-semibold">12% of sale price</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Processing:</span>
                  <span className="font-semibold">2.9% + $0.30</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="flex items-start">
                <input
                  type="checkbox"
                  checked={formData.agreeToTerms}
                  onChange={(e) => handleInputChange('agreeToTerms', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  I agree to the <Link href="/terms" className="text-blue-600 hover:underline" target="_blank">Terms of Service</Link> and <Link href="/privacy" className="text-blue-600 hover:underline" target="_blank">Privacy Policy</Link> *
                </span>
              </label>
              {errors.agreeToTerms && <p className="mt-1 text-sm text-red-600">{errors.agreeToTerms}</p>}

              <label className="flex items-start">
                <input
                  type="checkbox"
                  checked={formData.agreeToFees}
                  onChange={(e) => handleInputChange('agreeToFees', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  I understand and agree to the fee structure outlined above *
                </span>
              </label>
              {errors.agreeToFees && <p className="mt-1 text-sm text-red-600">{errors.agreeToFees}</p>}
            </div>

            {errors.submit && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-sm text-red-700 dark:text-red-300">{errors.submit}</p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* PLATINUM SELLER Header */}
      <header className="bg-gradient-to-r from-slate-400 via-gray-300 to-zinc-400 dark:from-slate-600 dark:via-gray-500 dark:to-zinc-600 shadow-2xl border-b-4 border-slate-500 dark:border-slate-400">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            {/* Logo Section */}
            <Link href="/" className="flex items-center group">
              <div className="bg-gradient-to-br from-slate-200 to-zinc-400 dark:from-slate-300 dark:to-zinc-500 p-3 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105 mr-4">
                <img
                  src="/DropCoin.png"
                  alt="DropDollar Logo"
                  className="w-8 h-8 object-contain"
                />
              </div>
              <div className="text-2xl font-bold bg-gradient-to-r from-white to-slate-100 dark:from-slate-100 dark:to-white bg-clip-text text-transparent group-hover:from-slate-100 group-hover:to-white transition-all duration-300">
                DropDollar
              </div>
            </Link>

            {/* PLATINUM Navigation */}
            <nav className="flex-1 mx-4">
              <div className="flex items-center justify-center space-x-4">
                <Link href="/listings" className="text-slate-100 dark:text-slate-200 hover:text-white dark:hover:text-slate-100 font-medium transition-colors text-sm px-3 py-2 rounded-lg hover:bg-slate-500/30">Browse</Link>
                <Link href="/categories" className="text-slate-100 dark:text-slate-200 hover:text-white dark:hover:text-slate-100 font-medium transition-colors text-sm px-3 py-2 rounded-lg hover:bg-slate-500/30">Categories</Link>
                <Link href="/games" className="text-slate-100 dark:text-slate-200 hover:text-white dark:hover:text-slate-100 font-medium transition-colors text-sm px-3 py-2 rounded-lg hover:bg-slate-500/30">🎮 Games</Link>
                <Link href="/tournaments" className="text-slate-100 dark:text-slate-200 hover:text-white dark:hover:text-slate-100 font-medium transition-colors text-sm px-3 py-2 rounded-lg hover:bg-slate-500/30">🏆 Tournaments</Link>
                <Link href="/hot-sell" className="text-slate-100 dark:text-slate-200 hover:text-white dark:hover:text-slate-100 font-medium transition-colors text-sm px-3 py-2 rounded-lg hover:bg-slate-500/30">🔥 Hot Sell</Link>
                <Link href="/how-it-works" className="text-slate-100 dark:text-slate-200 hover:text-white dark:hover:text-slate-100 font-medium transition-colors text-sm px-3 py-2 rounded-lg hover:bg-slate-500/30">How It Works</Link>
              </div>
            </nav>

            {/* User Actions */}
            <div className="flex items-center space-x-2">
              <Link href="/auth/login" className="text-slate-100 dark:text-slate-200 hover:text-white dark:hover:text-slate-100 font-medium transition-colors text-sm px-3 py-2 rounded-lg hover:bg-slate-500/30">Sign In</Link>
              <Link href="/auth/register" className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border border-white/30">Sign Up</Link>
              
              {/* Active Seller Link */}
              <div className="bg-gradient-to-r from-slate-200 to-zinc-300 dark:from-slate-300 dark:to-zinc-400 px-4 py-2 rounded-xl shadow-lg">
                <Link href="/seller/apply" className="text-slate-900 dark:text-slate-800 hover:text-slate-800 dark:hover:text-slate-700 font-bold transition-colors text-sm">💼 Sell</Link>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Seller Application</h1>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Step {currentStep} of {totalSteps}
            </span>
          </div>
          
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Form Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          {renderStep()}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            {currentStep < totalSteps ? (
              <button
                onClick={handleNext}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Application'}
              </button>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}