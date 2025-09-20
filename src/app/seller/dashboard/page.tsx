'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ListingStorageService, type StoredListing } from '@/lib/listingStorage';
import { sellerDatabase, SellerProfile } from '@/lib/sellerDatabase';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Link from 'next/link';
import { 
  PlusIcon,
  EyeIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
  ChartBarIcon,
  CogIcon,
  TruckIcon,
  StarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PencilIcon,
  TrashIcon,
  PlayIcon,
  PauseIcon
} from '@heroicons/react/24/outline';

interface DashboardStats {
  totalListings: number;
  activeListings: number;
  totalViews: number;
  totalRevenue: number;
}

export default function SellerDashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userListings, setUserListings] = useState<StoredListing[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalListings: 0,
    activeListings: 0,
    totalViews: 0,
    totalRevenue: 0
  });
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/auth/login?message=Please log in to access seller dashboard');
      return;
    }

    loadSellerData();
    
    // Check for success messages
    if (searchParams.get('created') === 'true') {
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 5000);
    } else if (searchParams.get('updated') === 'true') {
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 5000);
    }
  }, [user, router, searchParams]);

  const loadSellerData = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      // Load seller profile (optional - user can access dashboard without it)
      try {
        const profile = await sellerDatabase.getSellerProfileByUserId(user.id);
        if (profile) {
          setSellerProfile(profile);
        }
      } catch (profileError) {
        // Continue without seller profile - user can still access dashboard
      }

      // Load user's listings
      try {
        const listingsResult = ListingStorageService.getSellerListings(user.id, 0, 100); // Get first 100 listings
        const listings = listingsResult.listings || [];
        setUserListings(listings);

        // Calculate stats
        const activeListings = listings.filter(l => l.status === 'active' || l.status === 'timer_active');
        const totalViews = listings.reduce((sum, listing) => sum + (listing.viewCount || 0), 0);
        const totalRevenue = listings.filter(l => l.status === 'sold').reduce((sum, listing) => sum + listing.basePrice, 0);

        setStats({
          totalListings: listingsResult.total || listings.length,
          activeListings: activeListings.length,
          totalViews,
          totalRevenue
        });
      } catch (listingsError) {
        console.error('Error loading user listings:', listingsError);
        setUserListings([]);
        setStats({
          totalListings: 0,
          activeListings: 0,
          totalViews: 0,
          totalRevenue: 0
        });
      }

    } catch (error) {
      console.error('Error loading seller data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteListing = (listingId: string) => {
    if (confirm('Are you sure you want to delete this listing? This action cannot be undone.')) {
      const success = ListingStorageService.deleteListing(listingId);
      if (success) {
        // Reload data
        loadSellerData();
      } else {
        alert('Failed to delete listing. Please try again.');
      }
    }
  };

  const handleToggleListingStatus = (listingId: string, currentStatus: StoredListing['status']) => {
    const newStatus = currentStatus === 'active' ? 'ended' : 'active';
    ListingStorageService.updateListingStatus(listingId, newStatus);
    loadSellerData();
  };

  const createTestListing = async () => {
    if (!user) return;
    
    try {
      const testListing = await ListingStorageService.createListing({
        title: 'Test Gaming Headset',
        description: 'High-quality gaming headset for testing the seller dashboard functionality.',
        categoryId: 'electronics',
        categoryName: 'Electronics',
        basePrice: 150,
        timerDuration: 60,
        gameType: 'multi-target',
        quantity: 3,
        images: [],
        sellerId: user.id,
        sellerName: `${user.firstName} ${user.lastName}`,
        sellerRating: 4.5,
        sellerTotalSales: 0,
        condition: 'new',
        tags: ['gaming', 'headset', 'electronics', 'test']
      });
      
      // Test listing created successfully
      loadSellerData(); // Refresh the dashboard
    } catch (error) {
      console.error('❌ Error creating test listing:', error);
    }
  };

  const getStatusColor = (status: StoredListing['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'timer_active':
        return 'bg-blue-100 text-blue-800';
      case 'ended':
        return 'bg-gray-100 text-gray-800';
      case 'sold':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: StoredListing['status']) => {
    switch (status) {
      case 'active':
        return <PlayIcon className="h-4 w-4" />;
      case 'timer_active':
        return <ClockIcon className="h-4 w-4" />;
      case 'ended':
        return <PauseIcon className="h-4 w-4" />;
      case 'sold':
        return <CheckCircleIcon className="h-4 w-4" />;
      default:
        return <ExclamationTriangleIcon className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Test Listing (only show if no listings) */}
        {userListings.length === 0 && !isLoading && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-bold text-blue-800 mb-2">🚀 Get Started</h3>
            <p className="text-sm text-blue-700 mb-3">
              No listings yet? Create a test listing to see how the dashboard works!
            </p>
            <button
              onClick={createTestListing}
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition-colors"
            >
              🧪 Create Test Listing
            </button>
          </div>
        )}
        {/* Success Message */}
        {showSuccessMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex">
              <CheckCircleIcon className="h-5 w-5 text-green-400 mt-0.5" />
              <div className="ml-3">
                <p className="text-sm text-green-800">
                  {searchParams.get('created') === 'true' 
                    ? '🎉 Listing created successfully! It\'s now live and users can start competing.'
                    : '✅ Listing updated successfully! Changes are now live.'
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Seller Dashboard
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-300">
                Welcome back, {user?.firstName}! Manage your listings and track your performance.
              </p>
              {!sellerProfile && (
                <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    💡 <strong>New to selling?</strong> You can create listings right away! 
                    <Link href="/seller/apply" className="text-blue-600 hover:underline ml-1">
                      Apply to become a verified seller
                    </Link> for additional benefits.
                  </p>
                </div>
              )}
            </div>
            <Link
              href="/seller/create-listing"
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold inline-flex items-center transition-colors"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Create New Listing
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <ShoppingBagIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Listings</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalListings}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <PlayIcon className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Active Listings</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.activeListings}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <EyeIcon className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Views</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalViews}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <CurrencyDollarIcon className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">${stats.totalRevenue.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Listings Management */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Your Listings</h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {userListings.length} total listings
              </span>
            </div>
          </div>

          {userListings.length === 0 ? (
            <div className="p-8 text-center">
              <ShoppingBagIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No listings yet</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Create your first listing to start selling through skill-based competitions!
              </p>
              <Link
                href="/seller/create-listing"
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold inline-flex items-center transition-colors"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Create Your First Listing
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Prize Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Entries
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {(userListings || []).map((listing) => (
                    <tr key={listing.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {listing.images.length > 0 ? (
                            <img
                              src={listing.images[0]}
                              alt={listing.title}
                              className="h-10 w-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center">
                              <ShoppingBagIcon className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {listing.title}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                              {listing.description}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          ${listing.basePrice.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(listing.status)}`}>
                          {getStatusIcon(listing.status)}
                          <span className="ml-1 capitalize">{listing.status.replace('_', ' ')}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {listing.totalEntries}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(listing.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <Link
                            href={`/listings/${listing.id}`}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            title="View Listing"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </Link>
                          
                          <Link
                            href={`/seller/edit-listing/${listing.id}`}
                            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300"
                            title="Edit Listing"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Link>
                          
                          <button
                            onClick={() => handleToggleListingStatus(listing.id, listing.status)}
                            className={`${
                              listing.status === 'active' 
                                ? 'text-yellow-600 hover:text-yellow-900' 
                                : 'text-green-600 hover:text-green-900'
                            }`}
                            title={listing.status === 'active' ? 'Pause Listing' : 'Activate Listing'}
                          >
                            {listing.status === 'active' ? (
                              <PauseIcon className="h-4 w-4" />
                            ) : (
                              <PlayIcon className="h-4 w-4" />
                            )}
                          </button>
                          
                          <button
                            onClick={() => handleDeleteListing(listing.id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            title="Delete Listing"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href="/seller/create-listing"
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center">
              <PlusIcon className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Create Listing</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">Add a new product competition</p>
              </div>
            </div>
          </Link>

          <Link
            href="/analytics"
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center">
              <ChartBarIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">View Analytics</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">Track your performance</p>
              </div>
            </div>
          </Link>

          <Link
            href="/listings"
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center">
              <EyeIcon className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Browse All Listings</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">See what others are selling</p>
              </div>
            </div>
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}