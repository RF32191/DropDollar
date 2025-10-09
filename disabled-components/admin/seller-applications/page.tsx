'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { sellerDatabase, SellerApplication } from '@/lib/sellerDatabase';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { 
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  DocumentTextIcon,
  BuildingOfficeIcon,
  CreditCardIcon,
  ShoppingBagIcon
} from '@heroicons/react/24/outline';

interface ApplicationStats {
  total: number;
  pending: number;
  underReview: number;
  approved: number;
  rejected: number;
}

export default function AdminSellerApplicationsPage() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<SellerApplication[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<SellerApplication[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<SellerApplication | null>(null);
  const [stats, setStats] = useState<ApplicationStats>({ total: 0, pending: 0, underReview: 0, approved: 0, rejected: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | 'request_more_info'>('approve');
  const [reviewNotes, setReviewNotes] = useState('');

  // Mock admin check - in production, this would be a proper role check
  const isAdmin = user?.email === 'admin@dollardrop.com' || user?.id === 'admin_user';

  useEffect(() => {
    if (!isAdmin) {
      return;
    }
    loadApplications();
    loadStats();
  }, [isAdmin]);

  useEffect(() => {
    filterApplications();
  }, [applications, filterStatus, searchTerm]);

  const loadApplications = async () => {
    try {
      setIsLoading(true);
      const allApplications = await getAllApplicationsForAdmin();
      setApplications(allApplications);
    } catch (error) {
      console.error('Error loading applications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const applicationStats = await sellerDatabase.getApplicationStats();
      setStats(applicationStats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  // Helper function to get all applications (admin function)
  const getAllApplicationsForAdmin = async (): Promise<SellerApplication[]> => {
    const statuses: SellerApplication['status'][] = ['pending', 'under_review', 'approved', 'rejected'];
    const allApps: SellerApplication[] = [];
    
    for (const status of statuses) {
      const apps = await sellerDatabase.getApplicationsByStatus(status);
      allApps.push(...apps);
    }
    
    return allApps.sort((a, b) => new Date(b.applicationDate).getTime() - new Date(a.applicationDate).getTime());
  };

  const filterApplications = () => {
    let filtered = applications;

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(app => app.status === filterStatus);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(app => 
        app.businessName.toLowerCase().includes(term) ||
        app.businessEmail.toLowerCase().includes(term) ||
        app.businessType.toLowerCase().includes(term) ||
        app.id.toLowerCase().includes(term)
      );
    }

    setFilteredApplications(filtered);
  };

  const handleReviewApplication = async (applicationId: string) => {
    if (!user || !reviewNotes.trim()) return;

    setIsReviewing(true);
    try {
      const result = await sellerDatabase.reviewApplication(applicationId, {
        action: reviewAction,
        reviewerId: user.id,
        reviewerName: `${user.firstName} ${user.lastName}`,
        notes: reviewNotes,
        documentsReviewed: [] // In production, this would track which documents were reviewed
      });

      if (result.success) {
        // Refresh applications and stats
        await loadApplications();
        await loadStats();
        setSelectedApplication(null);
        setReviewNotes('');
        alert(`Application ${reviewAction}d successfully!`);
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error reviewing application:', error);
      alert('Failed to review application');
    } finally {
      setIsReviewing(false);
    }
  };

  const getStatusIcon = (status: SellerApplication['status']) => {
    switch (status) {
      case 'approved':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'under_review':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'pending':
        return <ExclamationTriangleIcon className="h-5 w-5 text-blue-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: SellerApplication['status']) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'under_review':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
            <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Access Denied</h1>
            <p className="text-gray-600 dark:text-gray-300">You don't have permission to access this page.</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Seller Applications</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">Review and manage seller applications</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DocumentTextIcon className="h-8 w-8 text-gray-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.pending}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Under Review</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.underReview}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Approved</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.approved}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <XCircleIcon className="h-8 w-8 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Rejected</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.rejected}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by business name, email, or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <FunnelIcon className="h-5 w-5 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="under_review">Under Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {/* Applications Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-300">Loading applications...</p>
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="p-8 text-center">
              <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-300">No applications found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Business
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Applied
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredApplications.map((application) => (
                    <tr key={application.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {application.businessName}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {application.businessEmail}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900 dark:text-white capitalize">
                          {application.businessType.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(application.applicationDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(application.status)}
                          <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(application.status)}`}>
                            {application.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => setSelectedApplication(application)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 flex items-center"
                        >
                          <EyeIcon className="h-4 w-4 mr-1" />
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Application Review Modal */}
      {selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Review Application
                </h2>
                <button
                  onClick={() => setSelectedApplication(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Application Details */}
              <div className="space-y-6">
                {/* Business Information */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <BuildingOfficeIcon className="h-5 w-5 text-blue-600 mr-2" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Business Information</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Business Name:</span>
                      <p className="text-gray-600 dark:text-gray-400">{selectedApplication.businessName}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Business Type:</span>
                      <p className="text-gray-600 dark:text-gray-400 capitalize">{selectedApplication.businessType.replace('_', ' ')}</p>
                    </div>
                    <div className="md:col-span-2">
                      <span className="font-medium text-gray-700 dark:text-gray-300">Description:</span>
                      <p className="text-gray-600 dark:text-gray-400">{selectedApplication.businessDescription}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Phone:</span>
                      <p className="text-gray-600 dark:text-gray-400">{selectedApplication.businessPhone}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Email:</span>
                      <p className="text-gray-600 dark:text-gray-400">{selectedApplication.businessEmail}</p>
                    </div>
                    <div className="md:col-span-2">
                      <span className="font-medium text-gray-700 dark:text-gray-300">Address:</span>
                      <p className="text-gray-600 dark:text-gray-400">
                        {selectedApplication.businessAddress.street}, {selectedApplication.businessAddress.city}, {selectedApplication.businessAddress.state} {selectedApplication.businessAddress.zipCode}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Product Information */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <ShoppingBagIcon className="h-5 w-5 text-orange-600 mr-2" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Product Information</h3>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Categories:</span>
                      <p className="text-gray-600 dark:text-gray-400">{selectedApplication.productCategories.join(', ')}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Estimated Monthly Volume:</span>
                      <p className="text-gray-600 dark:text-gray-400">{selectedApplication.estimatedMonthlyVolume}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Product Sources:</span>
                      <p className="text-gray-600 dark:text-gray-400">{selectedApplication.productSources.join(', ')}</p>
                    </div>
                  </div>
                </div>

                {/* Review Section */}
                {selectedApplication.status === 'pending' || selectedApplication.status === 'under_review' ? (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Review Application</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Review Action
                        </label>
                        <select
                          value={reviewAction}
                          onChange={(e) => setReviewAction(e.target.value as any)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        >
                          <option value="approve">Approve Application</option>
                          <option value="reject">Reject Application</option>
                          <option value="request_more_info">Request More Information</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Review Notes *
                        </label>
                        <textarea
                          value={reviewNotes}
                          onChange={(e) => setReviewNotes(e.target.value)}
                          rows={4}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                          placeholder="Enter your review notes..."
                        />
                      </div>

                      <div className="flex space-x-3">
                        <button
                          onClick={() => handleReviewApplication(selectedApplication.id)}
                          disabled={isReviewing || !reviewNotes.trim()}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isReviewing ? 'Processing...' : 'Submit Review'}
                        </button>
                        <button
                          onClick={() => setSelectedApplication(null)}
                          className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-md font-semibold"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Review Status</h3>
                    <div className="flex items-center mb-2">
                      {getStatusIcon(selectedApplication.status)}
                      <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedApplication.status)}`}>
                        {selectedApplication.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    {selectedApplication.reviewNotes && (
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">Review Notes:</span>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">{selectedApplication.reviewNotes}</p>
                      </div>
                    )}
                    {selectedApplication.reviewedAt && (
                      <div className="mt-2">
                        <span className="font-medium text-gray-700 dark:text-gray-300">Reviewed:</span>
                        <p className="text-gray-600 dark:text-gray-400">{new Date(selectedApplication.reviewedAt).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
