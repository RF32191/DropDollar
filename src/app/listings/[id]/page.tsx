'use client';

import { useState, useEffect } from 'react';

// Force dynamic rendering to prevent build timeouts
export const dynamic = 'force-dynamic';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BiddingInterface from '@/components/listing/BiddingInterface';
import ReviewSection from '@/components/reviews/ReviewSection';
import { 
  ClockIcon, 
  CurrencyDollarIcon, 
  UserGroupIcon, 
  StarIcon,
  ShareIcon,
  HeartIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FireIcon,
  EyeIcon,
  TagIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid, FireIcon as FireIconSolid } from '@heroicons/react/24/solid';
import { ListingStorageService, type StoredListing } from '@/lib/listingStorage';
import { listingPricingService } from '@/lib/listingPricing';
import { getReviewsForListing, getAverageRating, getTotalReviews } from '@/data/sampleReviews';


export default function ListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const listingId = params.id as string;
  
  const [listing, setListing] = useState<StoredListing | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [showBiddingModal, setShowBiddingModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pricingInfo, setPricingInfo] = useState<any>(null);

  useEffect(() => {
    const loadListing = async () => {
      try {
        setIsLoading(true);
        const foundListing = ListingStorageService.getListingById(listingId, true); // Track view
        if (!foundListing) {
          router.push('/listings');
          return;
        }
        setListing(foundListing);
        
        // Calculate current pricing based on game entries
        const pricing = listingPricingService.getFormattedPricing(foundListing);
        setPricingInfo(pricing);
        
      } catch (error) {
        console.error('Error loading listing:', error);
        router.push('/listings');
      } finally {
        setIsLoading(false);
      }
    };

    loadListing();
  }, [listingId, router]);

  useEffect(() => {
    if (!listing || listing.status !== 'timer_active' || !listing.endTime) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const endTime = new Date(listing.endTime!).getTime();
      const remaining = Math.max(0, Math.floor((endTime - now) / (1000 * 60))); // Minutes remaining
      setTimeRemaining(remaining);
      
      // Auto-update listing status if timer expired
      if (remaining <= 0 && listing.status === 'timer_active') {
        ListingStorageService.updateListingStatus(listing.id, 'ended');
        setListing(prev => prev ? { ...prev, status: 'ended' } : null);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [listing]);

  if (isLoading || !listing) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {isLoading ? 'Loading listing...' : 'Listing not found'}
            </h2>
          </div>
        </div>
      </div>
    );
  }

  const formatTimeRemaining = (minutes: number): string => {
    if (minutes <= 0) return 'Ended';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours < 24) return `${hours}h ${remainingMinutes}m`;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  };

  // Use the pricing service for all calculations
  const currentPrice = pricingInfo?.currentPrice || 0;
  const basePrice = pricingInfo?.basePrice || listing?.basePrice || 0;
  const progressPercentage = pricingInfo?.progressPercentage || 0;
  const remainingToActivate = pricingInfo?.remainingToActivate || 0;
  const isHot = listing.isHot || (listing.status === 'timer_active' && timeRemaining <= 120 && timeRemaining > 0);

  const nextImage = () => {
    setCurrentImageIndex((prev) => 
      prev === listing.images.length - 1 ? 0 : prev + 1
    );
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => 
      prev === 0 ? listing.images.length - 1 : prev - 1
    );
  };

  return (
    <div className="min-h-screen">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex mb-8" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              <a href="/listings" className="text-gray-700 hover:text-primary-600">
                Listings
              </a>
            </li>
            <li>
              <div className="flex items-center">
                <span className="mx-2 text-gray-400">/</span>
                <a href={`/listings?category=${listing.categoryId}`} className="text-gray-700 hover:text-primary-600">
                  {listing.categoryName}
                </a>
              </div>
            </li>
            <li aria-current="page">
              <div className="flex items-center">
                <span className="mx-2 text-gray-400">/</span>
                <span className="text-gray-500 truncate max-w-xs">
                  {listing.title}
                </span>
              </div>
            </li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="relative bg-gray-100 rounded-lg overflow-hidden aspect-square">
              {/* Hot listing indicator */}
              {isHot && (
                <div className="absolute top-4 left-4 z-10 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center">
                  <FireIconSolid className="h-4 w-4 mr-1" />
                  HOT
                </div>
              )}

              {/* Timer status indicator */}
              {listing.status === 'timer_active' && (
                <div className="absolute top-4 right-4 z-10 bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                  TIMER ACTIVE
                </div>
              )}

              {/* Actual listing image */}
              {listing.images && listing.images.length > 0 ? (
                <img
                  src={listing.images[currentImageIndex]}
                  alt={`${listing.title} - Image ${currentImageIndex + 1}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-200">
                  <span className="text-gray-400">No Image Available</span>
                </div>
              )}

              {/* Navigation arrows */}
              {listing.images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70"
                  >
                    <ChevronLeftIcon className="h-6 w-6" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70"
                  >
                    <ChevronRightIcon className="h-6 w-6" />
                  </button>
                </>
              )}

              {/* Image indicators */}
              {listing.images.length > 1 && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                  {listing.images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-3 h-3 rounded-full ${
                        index === currentImageIndex ? 'bg-white' : 'bg-white bg-opacity-50'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Thumbnail strip */}
            {listing.images.length > 1 && (
              <div className="flex space-x-2 overflow-x-auto">
                {listing.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`flex-shrink-0 w-20 h-20 bg-gray-200 rounded-lg overflow-hidden ${
                      index === currentImageIndex ? 'ring-2 ring-blue-500' : ''
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${listing.title} - Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Listing Details */}
          <div className="space-y-6">
            {/* Title and Actions */}
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <span className="inline-block bg-primary-100 text-primary-800 text-xs font-medium px-2 py-1 rounded-full">
                    {listing.categoryName}
                  </span>
                  <span className="inline-flex items-center bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                    <EyeIcon className="h-3 w-3 mr-1" />
                    {listing.viewCount} views
                  </span>
                  {listing.condition && (
                    <span className="inline-block bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                      {listing.condition}
                    </span>
                  )}
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {listing.title}
                </h1>
                {listing.tags.length > 0 && (
                  <div className="flex items-center space-x-1 mt-2">
                    <TagIcon className="h-4 w-4 text-gray-400" />
                    <div className="flex flex-wrap gap-1">
                      {listing.tags.map((tag, index) => (
                        <span key={index} className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => setIsWishlisted(!isWishlisted)}
                  className="p-2 rounded-full hover:bg-gray-100"
                >
                  {isWishlisted ? (
                    <HeartIconSolid className="h-6 w-6 text-red-500" />
                  ) : (
                    <HeartIcon className="h-6 w-6 text-gray-400" />
                  )}
                </button>
                <button className="p-2 rounded-full hover:bg-gray-100">
                  <ShareIcon className="h-6 w-6 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Seller Info */}
            <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-primary-600 font-bold">
                  {listing.sellerName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-semibold text-gray-900">{listing.sellerName}</p>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center">
                    <StarIcon className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="text-sm text-gray-600 ml-1">{(listing.sellerRating || 0).toFixed(1)}</span>
                  </div>
                  <span className="text-gray-400">•</span>
                  <span className="text-sm text-gray-600">{listing.sellerTotalSales} sales</span>
                </div>
              </div>
            </div>

            {/* Price Information */}
            <div className="space-y-4 p-6 bg-white border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-lg text-gray-600">Current Price:</span>
                <div className="flex items-center">
                  <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
                  <span className="text-3xl font-bold text-green-600">
                    ${currentPrice.toLocaleString()}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Base Price (Timer Activation):</span>
                <span className="text-orange-600 font-bold">
                  ${basePrice.toLocaleString()}
                </span>
              </div>

              {pricingInfo?.totalEntries > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Total Game Entries:</span>
                  <span className="text-blue-600 font-medium">
                    {pricingInfo.totalEntries} × $1 = ${pricingInfo.totalRevenue}
                  </span>
                </div>
              )}

              {/* Progress to timer activation */}
              <div>
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Progress to timer activation</span>
                  <span>
                    {remainingToActivate > 0 
                      ? `$${remainingToActivate.toLocaleString()} to go`
                      : 'Timer Active!'
                    }
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full transition-all duration-300 ${
                      progressPercentage >= 100 
                        ? 'bg-gradient-to-r from-green-400 to-green-600' 
                        : 'bg-gradient-to-r from-orange-400 to-red-500'
                    }`}
                    style={{ width: `${Math.min(100, progressPercentage)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>$0</span>
                  <span>${basePrice.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Timer or Bidding */}
            <div className="p-6 bg-white border border-gray-200 rounded-lg">
              {listing.status === 'timer_active' ? (
                <div className="text-center">
                  <div className="flex items-center justify-center text-red-600 mb-4">
                    <ClockIcon className="h-8 w-8 mr-2" />
                    <span className="text-4xl font-bold countdown-timer">
                      {formatTimeRemaining(timeRemaining)}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-4">Time remaining to place bids</p>
                  {timeRemaining > 0 && (
                    <button 
                      onClick={() => setShowBiddingModal(true)}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-lg text-lg transition-colors duration-200"
                    >
                      Place Your Guess Now!
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-center">
                  <div className="flex items-center justify-center text-gray-600 mb-4">
                    <ClockIcon className="h-6 w-6 mr-2" />
                    <span className="text-lg">
                      {listing.timerDuration >= 60 
                        ? `${Math.floor(listing.timerDuration / 60)} hour timer`
                        : `${listing.timerDuration} minute timer`
                      } when target reached
                    </span>
                  </div>
                  <button 
                    onClick={() => setShowBiddingModal(true)}
                    className="w-full btn-primary text-lg py-4"
                  >
                    Place Your Guess ($1 per guess)
                  </button>
                </div>
              )}
            </div>

            {/* Listing Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-center mb-2">
                  <CurrencyDollarIcon className="h-6 w-6 text-primary-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{listing.totalBids}</p>
                <p className="text-sm text-gray-600">Total Bids</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-center mb-2">
                  <UserGroupIcon className="h-6 w-6 text-primary-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{listing.uniqueBidders}</p>
                <p className="text-sm text-gray-600">Unique Bidders</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-center mb-2">
                  <EyeIcon className="h-6 w-6 text-primary-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{listing.viewCount}</p>
                <p className="text-sm text-gray-600">Views</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-center mb-2 text-2xl">
                  {(() => {
                    const gameEmojis = {
                      'multi-target': '🎯',
                      'falling-objects': '💼',
                      'color-sequence': '🌈'
                    };
                    return gameEmojis[listing.gameType as keyof typeof gameEmojis] || '🎮';
                  })()}
                </div>
                <p className="text-sm font-bold text-blue-900">
                  {(() => {
                    const gameNames = {
                      'multi-target': 'Multi-Target',
                      'falling-objects': 'Falling Objects',
                      'color-sequence': 'Color Sequence'
                    };
                    return gameNames[listing.gameType as keyof typeof gameNames] || listing.gameType;
                  })()}
                </p>
                <p className="text-xs text-blue-600">Competition Game</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="flex items-center justify-center mb-2">
                  <span className="text-2xl">📦</span>
                </div>
                <p className="text-2xl font-bold text-green-900">
                  {(listing.quantity - listing.quantitySold)} / {listing.quantity}
                </p>
                <p className="text-sm text-green-600">Available</p>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="mt-12 max-w-4xl">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Description</h2>
          <div className="prose max-w-none">
            <p className="text-gray-700 leading-relaxed">
              {listing.description}
            </p>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-12">
          <ReviewSection
            listingId={listingId}
            reviews={getReviewsForListing(listingId) || []}
            averageRating={getAverageRating(listingId) || 0}
            totalReviews={getTotalReviews(listingId) || 0}
          />
        </div>

        {/* How it Works */}
        <div className="mt-12 bg-blue-50 rounded-lg p-8">
          <h3 className="text-xl font-bold text-blue-900 mb-4">
            <strong>Every DropDollars the Price!</strong> - How This Works
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                <CurrencyDollarIcon className="h-6 w-6 text-blue-600" />
              </div>
              <h4 className="font-semibold text-blue-900 mb-2">1. Every DropDollars It</h4>
              <p className="text-blue-800 text-sm">
                Use 1 token ($1) to make a price guess. <strong>Every dollar drops the price by $1!</strong>
              </p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                <ClockIcon className="h-6 w-6 text-blue-600" />
              </div>
              <h4 className="font-semibold text-blue-900 mb-2">2. Timer Activates</h4>
              <p className="text-blue-800 text-sm">
                When the price hits the target, a countdown timer starts for final bids.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                <StarIcon className="h-6 w-6 text-blue-600" />
              </div>
              <h4 className="font-semibold text-blue-900 mb-2">3. Closest Wins</h4>
              <p className="text-blue-800 text-sm">
                The person with the closest guess to the final price wins the item at their guessed price!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bidding Modal */}
      {showBiddingModal && (
        <BiddingInterface 
          listing={listing}
          onClose={() => setShowBiddingModal(false)}
          onBidPlaced={(newBid) => {
            // Refresh pricing information after a bid is placed
            const updatedPricing = listingPricingService.getFormattedPricing(listing);
            setPricingInfo(updatedPricing);
            
            // Update listing with new bid stats
            const updatedListing = {
              ...listing,
              totalBids: listing.totalBids + 1,
              uniqueBidders: listing.uniqueBidders + (Math.random() > 0.3 ? 1 : 0), // Simulate unique bidders
              updatedAt: new Date().toISOString()
            };
            
            // Check if timer should be activated based on game entries reaching base price
            if (listingPricingService.shouldActivateTimer(listing)) {
              updatedListing.status = 'timer_active';
              updatedListing.isHot = true;
              const endTime = new Date();
              endTime.setMinutes(endTime.getMinutes() + updatedListing.timerDuration);
              updatedListing.endTime = endTime.toISOString();
            }
            
            // Update in storage and local state
            ListingStorageService.updateListing(updatedListing);
            setListing(updatedListing);
            setShowBiddingModal(false);
          }}
        />
      )}
      
      <Footer />
    </div>
  );
}
