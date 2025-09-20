'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { 
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';

export default function SellerApplicationSuccessPage() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
    }
  }, [user, router]);

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 mx-auto mb-6">
            <CheckCircleIcon className="w-20 h-20 text-green-500" />
          </div>

          {/* Main Message */}
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            🎉 Congratulations! You're Now a Seller!
          </h1>
          
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
            Your seller application has been automatically approved! You can now start creating listings and selling your products on DollarDrop.
          </p>

          {/* What You Can Do Now */}
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">🚀 What You Can Do Now</h2>
            
            <div className="space-y-4 text-left">
              <div className="flex items-start space-x-3">
                <CheckCircleIcon className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Create Your First Listing</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Start selling immediately! Create listings for your products with our skill-based gaming competitions.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <DocumentTextIcon className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Access Seller Dashboard</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Manage your listings, track sales, and view analytics from your comprehensive seller dashboard.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <EnvelopeIcon className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Reach Thousands of Gamers</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Your products will be featured in engaging gaming competitions that attract skilled players daily.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Application Details */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Application Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="text-left">
                <span className="font-medium text-gray-700 dark:text-gray-300">Applicant:</span>
                <p className="text-gray-600 dark:text-gray-400">{user.firstName} {user.lastName}</p>
              </div>
              <div className="text-left">
                <span className="font-medium text-gray-700 dark:text-gray-300">Email:</span>
                <p className="text-gray-600 dark:text-gray-400">{user.email}</p>
              </div>
              <div className="text-left">
                <span className="font-medium text-gray-700 dark:text-gray-300">Application Date:</span>
                <p className="text-gray-600 dark:text-gray-400">{new Date().toLocaleDateString()}</p>
              </div>
              <div className="text-left">
                <span className="font-medium text-gray-700 dark:text-gray-300">Status:</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  ✅ Approved
                </span>
              </div>
            </div>
          </div>

          {/* Important Information */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Important Information</h3>
            <div className="text-left space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <p>• Keep your contact information up to date in case we need to reach you</p>
              <p>• Check your email regularly for updates on your application status</p>
              <p>• You can check your application status anytime from your dashboard</p>
              <p>• If approved, you'll gain access to our seller tools and can start listing products</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4">
            <Link
              href="/seller/dashboard"
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors inline-block text-center"
            >
              🚀 Go to Seller Dashboard
            </Link>
            
            <Link
              href="/seller/create-listing"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors inline-block text-center"
            >
              ➕ Create First Listing
            </Link>
          </div>

          {/* Contact Information */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Questions about your application? Contact us at{' '}
              <a href="mailto:sellers@dollardrop.com" className="text-blue-600 hover:underline">
                sellers@dollardrop.com
              </a>
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}