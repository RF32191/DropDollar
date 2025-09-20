'use client';

import React, { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  EyeIcon,
  PencilIcon,
  TrashIcon,
  PlayIcon,
  PauseIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  TrophyIcon,
  ClockIcon,
  UsersIcon,
  PhotoIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import ListingManagementService, { SellerListing } from '@/lib/listingManagementService';
import ListingUpload from './ListingUpload';

interface SellerListingDashboardProps {
  sellerId: string;
  sellerName: string;
}

export default function SellerListingDashboard({ 
  sellerId, 
  sellerName 
}: SellerListingDashboardProps) {
  const [listings, setListings] = useState<SellerListing[]>([]);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedListing, setSelectedListing] = useState<SellerListing | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'draft' | 'paused' | 'sold_out'>('all');

  useEffect(() => {
    loadListings();
    // Create sample listings for demo
    ListingManagementService.createSampleListings();
  }, [sellerId]);

  const loadListings = () => {
    const sellerListings = ListingManagementService.getSellerListings(sellerId);
    setListings(sellerListings);
  };

  const handleListingCreated = (listing: SellerListing) => {
    loadListings();
    setShowUploadForm(false);
  };

  const handleToggleStatus = (listingId: string) => {
    ListingManagementService.toggleListingStatus(listingId);
    loadListings();
  };

  const handleDeleteListing = (listingId: string) => {
    if (window.confirm('Are you sure you want to delete this listing?')) {
      const success = ListingManagementService.deleteListing(listingId, sellerId);
      if (success) {
        loadListings();
      } else {
        alert('Cannot delete listing with active participants');
      }
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      'draft': { color: 'bg-gray-100 text-gray-800', text: 'Draft' },
      'active': { color: 'bg-green-100 text-green-800', text: 'Active' },
      'paused': { color: 'bg-yellow-100 text-yellow-800', text: 'Paused' },
      'sold_out': { color: 'bg-blue-100 text-blue-800', text: 'Sold Out' },
      'ended': { color: 'bg-red-100 text-red-800', text: 'Ended' }
    };
    
    const badge = badges[status as keyof typeof badges] || { color: 'bg-gray-100 text-gray-800', text: status };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  const filteredListings = listings.filter(listing => {
    if (filter === 'all') return true;
    return listing.status === filter;
  });

  const totalEarnings = listings.reduce((sum, listing) => {
    const earnings = ListingManagementService.calculateSellerEarnings(listing.listingId);
    return sum + earnings.netEarnings;
  }, 0);

  const totalSold = listings.reduce((sum, listing) => sum + listing.soldQuantity, 0);
  const activeListings = listings.filter(l => l.status === 'active').length;

  if (showUploadForm) {
    return (
      <ListingUpload
        sellerId={sellerId}
        sellerName={sellerName}
        onListingCreated={handleListingCreated}
        onCancel={() => setShowUploadForm(false)}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">📦 My Listings</h1>
          <p className="text-gray-600">Manage your competition listings, {sellerName}</p>
        </div>
        <button
          onClick={() => setShowUploadForm(true)}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Create New Listing
        </button>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-r from-green-400 to-blue-500 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Total Earnings</p>
              <p className="text-3xl font-bold">${totalEarnings.toFixed(2)}</p>
            </div>
            <CurrencyDollarIcon className="h-12 w-12 text-green-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-400 to-pink-500 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Items Sold</p>
              <p className="text-3xl font-bold">{totalSold}</p>
            </div>
            <TrophyIcon className="h-12 w-12 text-purple-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm">Active Listings</p>
              <p className="text-3xl font-bold">{activeListings}</p>
            </div>
            <ChartBarIcon className="h-12 w-12 text-yellow-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-400 to-indigo-500 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Total Listings</p>
              <p className="text-3xl font-bold">{listings.length}</p>
            </div>
            <UsersIcon className="h-12 w-12 text-blue-200" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'all', label: 'All Listings' },
            { key: 'active', label: 'Active' },
            { key: 'draft', label: 'Drafts' },
            { key: 'paused', label: 'Paused' },
            { key: 'sold_out', label: 'Sold Out' }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key as any)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === key
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Listings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredListings.map((listing) => {
          const earnings = ListingManagementService.calculateSellerEarnings(listing.listingId);
          const primaryImage = listing.images.find(img => img.isPrimary) || listing.images[0];
          
          return (
            <div key={listing.listingId} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
              {/* Image */}
              <div className="relative h-48 bg-gray-200">
                {primaryImage ? (
                  <img
                    src={primaryImage.url}
                    alt={listing.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <PhotoIcon className="h-16 w-16 text-gray-400" />
                  </div>
                )}
                <div className="absolute top-4 left-4">
                  {getStatusBadge(listing.status)}
                </div>
                {listing.isSponsored && (
                  <div className="absolute top-4 right-4">
                    <span className="bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                      SPONSORED
                    </span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                  {listing.title}
                </h3>
                
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                  <div>
                    <strong>Base Price:</strong> ${listing.basePrice}
                  </div>
                  <div>
                    <strong>Quantity:</strong> {listing.availableQuantity}/{listing.totalQuantity}
                  </div>
                  <div>
                    <strong>Game:</strong> {listing.gameName}
                  </div>
                  <div>
                    <strong>Sold:</strong> {listing.soldQuantity}
                  </div>
                </div>

                {/* Current Competition Status */}
                {listing.status === 'active' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-blue-900">Current Competition:</span>
                      <span className="text-blue-700">
                        ${listing.currentBaseAmount}/${listing.basePrice}
                      </span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min((listing.currentBaseAmount / listing.basePrice) * 100, 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-blue-700 mt-1">
                      <span>{listing.participantCount} participants</span>
                      {listing.isBaseMetForCurrent && (
                        <span className="font-bold">🔥 LIVE!</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Performance Stats */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs text-gray-600 mb-4">
                  <div>
                    <div className="font-bold text-gray-900">{listing.views}</div>
                    <div>Views</div>
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">{listing.clicks}</div>
                    <div>Clicks</div>
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">{listing.conversions}</div>
                    <div>Entries</div>
                  </div>
                </div>

                {/* Earnings */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-900">
                      ${earnings.netEarnings.toFixed(2)}
                    </div>
                    <div className="text-green-700 text-sm">Net Earnings</div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setSelectedListing(listing);
                      setShowDetails(true);
                    }}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-3 rounded-lg text-sm transition-colors flex items-center justify-center"
                  >
                    <EyeIcon className="h-4 w-4 mr-1" />
                    View
                  </button>
                  
                  {listing.status === 'active' && (
                    <button
                      onClick={() => handleToggleStatus(listing.listingId)}
                      className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 px-3 rounded-lg text-sm transition-colors flex items-center justify-center"
                    >
                      <PauseIcon className="h-4 w-4 mr-1" />
                      Pause
                    </button>
                  )}
                  
                  {listing.status === 'paused' && (
                    <button
                      onClick={() => handleToggleStatus(listing.listingId)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-3 rounded-lg text-sm transition-colors flex items-center justify-center"
                    >
                      <PlayIcon className="h-4 w-4 mr-1" />
                      Resume
                    </button>
                  )}
                  
                  {(listing.status === 'draft' || listing.participantCount === 0) && (
                    <button
                      onClick={() => handleDeleteListing(listing.listingId)}
                      className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-3 rounded-lg text-sm transition-colors flex items-center justify-center"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredListings.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📦</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {filter === 'all' ? 'No listings yet' : `No ${filter} listings`}
          </h3>
          <p className="text-gray-600 mb-6">
            {filter === 'all' 
              ? 'Create your first listing to start selling!' 
              : `You don't have any ${filter} listings.`}
          </p>
          {filter === 'all' && (
            <button
              onClick={() => setShowUploadForm(true)}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              Create Your First Listing
            </button>
          )}
        </div>
      )}

      {/* Listing Details Modal */}
      {showDetails && selectedListing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedListing.title}</h2>
                  <div className="flex items-center space-x-3">
                    {getStatusBadge(selectedListing.status)}
                    <span className="text-gray-500">Created {selectedListing.createdAt.toLocaleDateString()}</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Images */}
              {selectedListing.images.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-bold text-gray-900 mb-3">Images</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {selectedListing.images.map((image, index) => (
                      <div key={image.imageId} className="relative">
                        <img
                          src={image.url}
                          alt={`${selectedListing.title} ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        {image.isPrimary && (
                          <div className="absolute top-1 left-1">
                            <span className="bg-green-500 text-white text-xs px-1 py-0.5 rounded">
                              Main
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="font-bold text-gray-900 mb-3">Listing Details</h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>Category:</strong> {selectedListing.category}</div>
                    <div><strong>Base Price:</strong> ${selectedListing.basePrice}</div>
                    <div><strong>Game Type:</strong> {selectedListing.gameName}</div>
                    <div><strong>Quantity:</strong> {selectedListing.availableQuantity}/{selectedListing.totalQuantity}</div>
                    <div><strong>Processing Time:</strong> {selectedListing.processingTime}</div>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-gray-900 mb-3">Performance</h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>Views:</strong> {selectedListing.views}</div>
                    <div><strong>Clicks:</strong> {selectedListing.clicks}</div>
                    <div><strong>Entries:</strong> {selectedListing.conversions}</div>
                    <div><strong>Items Sold:</strong> {selectedListing.soldQuantity}</div>
                    {selectedListing.lastSoldAt && (
                      <div><strong>Last Sale:</strong> {selectedListing.lastSoldAt.toLocaleDateString()}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="mb-6">
                <h3 className="font-bold text-gray-900 mb-3">Description</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{selectedListing.description}</p>
              </div>

              {/* Tags */}
              {selectedListing.tags.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-bold text-gray-900 mb-3">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedListing.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Earnings Breakdown */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-bold text-green-900 mb-3">💰 Earnings Breakdown</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                  {(() => {
                    const earnings = ListingManagementService.calculateSellerEarnings(selectedListing.listingId);
                    return (
                      <>
                        <div>
                          <div className="font-bold text-green-900">${earnings.grossRevenue.toFixed(2)}</div>
                          <div className="text-green-700">Gross Revenue</div>
                        </div>
                        <div>
                          <div className="font-bold text-red-600">-${earnings.platformFee.toFixed(2)}</div>
                          <div className="text-green-700">Platform Fee (12%)</div>
                        </div>
                        <div>
                          <div className="font-bold text-red-600">-${earnings.maintenanceFees.toFixed(2)}</div>
                          <div className="text-green-700">Maintenance Fees</div>
                        </div>
                        <div>
                          <div className="font-bold text-green-900">${earnings.netEarnings.toFixed(2)}</div>
                          <div className="text-green-700">Net Earnings</div>
                        </div>
                      </>
                    );
                  })()}
                </div>
                {/* Maintenance Fee Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="text-blue-800 text-sm">
                    <strong>📅 Maintenance Fee:</strong> $0.50 every 4 months to keep listing active
                    {(() => {
                      const earnings = ListingManagementService.calculateSellerEarnings(selectedListing.listingId);
                      return earnings.nextMaintenanceDue && (
                        <div className="mt-1">
                          <strong>Next Due:</strong> {earnings.nextMaintenanceDue.toLocaleDateString()}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
