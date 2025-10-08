'use client';

import React, { useState, useEffect } from 'react';
import { 
  TrophyIcon, 
  TruckIcon, 
  MapPinIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import ShippingService, { WinnerFulfillment } from '@/lib/shippingService';
import WinnerAddressForm from './WinnerAddressForm';

interface WinnerDashboardProps {
  winnerId: string;
  winnerUsername: string;
}

export default function WinnerDashboard({ 
  winnerId, 
  winnerUsername 
}: WinnerDashboardProps) {
  const [fulfillments, setFulfillments] = useState<WinnerFulfillment[]>([]);
  const [selectedFulfillment, setSelectedFulfillment] = useState<WinnerFulfillment | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [showTrackingModal, setShowTrackingModal] = useState(false);

  useEffect(() => {
    loadFulfillments();
    // Create sample fulfillments for demo
    ShippingService.createSampleFulfillments();
  }, [winnerId]);

  const loadFulfillments = () => {
    const winnerFulfillments = ShippingService.getWinnerFulfillments(winnerId);
    setFulfillments(winnerFulfillments);
  };

  const handleAddressSubmitted = () => {
    loadFulfillments();
    setShowAddressForm(false);
    setSelectedFulfillment(null);
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      'pending_address': { color: 'bg-yellow-100 text-yellow-800', text: 'Address Required', icon: MapPinIcon },
      'address_submitted': { color: 'bg-blue-100 text-blue-800', text: 'Address Submitted', icon: ClockIcon },
      'seller_review': { color: 'bg-orange-100 text-orange-800', text: 'Under Review', icon: EyeIcon },
      'address_verified': { color: 'bg-green-100 text-green-800', text: 'Address Verified', icon: CheckCircleIcon },
      'label_generated': { color: 'bg-purple-100 text-purple-800', text: 'Label Generated', icon: TruckIcon },
      'shipped': { color: 'bg-blue-100 text-blue-800', text: 'Shipped', icon: TruckIcon },
      'delivered': { color: 'bg-green-100 text-green-800', text: 'Delivered', icon: CheckCircleIcon },
      'cash_paid': { color: 'bg-green-100 text-green-800', text: 'Cash Paid', icon: CurrencyDollarIcon },
      'completed': { color: 'bg-gray-100 text-gray-800', text: 'Completed', icon: CheckCircleIcon }
    };
    
    const badge = badges[status as keyof typeof badges] || { 
      color: 'bg-gray-100 text-gray-800', 
      text: status,
      icon: ClockIcon
    };
    
    const IconComponent = badge.icon;
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
        <IconComponent className="h-4 w-4 mr-1" />
        {badge.text}
      </span>
    );
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">🏆 My Winnings</h1>
        <p className="text-gray-600">Track your prizes and shipping status, {winnerUsername}!</p>
      </div>

      {/* Winnings Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm">Total Winnings</p>
              <p className="text-3xl font-bold">
                {fulfillments.length}
              </p>
            </div>
            <TrophyIcon className="h-12 w-12 text-yellow-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-400 to-blue-500 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Cash Prizes</p>
              <p className="text-3xl font-bold">
                ${fulfillments
                  .filter(f => f.prizeType === 'cash_prize')
                  .reduce((sum, f) => sum + (f.netAmount || 0), 0)
                  .toFixed(2)}
              </p>
            </div>
            <CurrencyDollarIcon className="h-12 w-12 text-green-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-400 to-pink-500 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Items Won</p>
              <p className="text-3xl font-bold">
                {fulfillments.filter(f => f.prizeType === 'physical_item').length}
              </p>
            </div>
            <TruckIcon className="h-12 w-12 text-purple-200" />
          </div>
        </div>
      </div>

      {/* Fulfillments List */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Prize History</h2>
        </div>
        
        <div className="divide-y divide-gray-200">
          {fulfillments.map((fulfillment) => (
            <div key={fulfillment.fulfillmentId} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <h3 className="text-lg font-bold text-gray-900 mr-3">
                      {fulfillment.productName}
                    </h3>
                    {getStatusBadge(fulfillment.status)}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-4">
                    <div>
                      <strong>Won Date:</strong><br />
                      {formatDate(fulfillment.createdAt)}
                    </div>
                    <div>
                      <strong>Your Score:</strong><br />
                      {fulfillment.winningScore}
                    </div>
                    <div>
                      <strong>Prize Type:</strong><br />
                      {fulfillment.prizeType === 'cash_prize' ? 'Cash Prize' : 'Physical Item'}
                    </div>
                    <div>
                      <strong>Value:</strong><br />
                      {fulfillment.prizeType === 'cash_prize' ? 
                        `$${fulfillment.netAmount} (after fees)` : 
                        `$${fulfillment.prizeValue}`}
                    </div>
                  </div>

                  {/* Cash Prize Details */}
                  {fulfillment.prizeType === 'cash_prize' && fulfillment.paidToWallet && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center mb-2">
                        <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
                        <span className="font-bold text-green-900">Cash Prize Paid to Wallet</span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <strong>Prize Amount:</strong> ${fulfillment.cashAmount}
                        </div>
                        <div>
                          <strong>Platform Fee (15%):</strong> -${fulfillment.platformFee}
                        </div>
                        <div>
                          <strong>Net Amount:</strong> ${fulfillment.netAmount}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Shipping Information */}
                  {fulfillment.prizeType === 'physical_item' && fulfillment.shippingAddress && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <h4 className="font-bold text-blue-900 mb-2">Shipping Address</h4>
                      <div className="text-sm text-blue-800">
                        {fulfillment.shippingAddress.firstName} {fulfillment.shippingAddress.lastName}<br />
                        {fulfillment.shippingAddress.address1}
                        {fulfillment.shippingAddress.address2 && <>, {fulfillment.shippingAddress.address2}</>}<br />
                        {fulfillment.shippingAddress.city}, {fulfillment.shippingAddress.state} {fulfillment.shippingAddress.postalCode}
                      </div>
                    </div>
                  )}

                  {/* Tracking Information */}
                  {fulfillment.shippingLabel && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-purple-900 mb-1">Tracking Information</h4>
                          <div className="text-sm text-purple-800">
                            <strong>Carrier:</strong> {fulfillment.shippingLabel.carrier} {fulfillment.shippingLabel.service}<br />
                            <strong>Tracking:</strong> 
                            <span className="font-mono ml-1">{fulfillment.shippingLabel.trackingNumber}</span><br />
                            <strong>Est. Delivery:</strong> {fulfillment.shippingLabel.estimatedDelivery.toLocaleDateString()}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedFulfillment(fulfillment);
                            setShowTrackingModal(true);
                          }}
                          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          Track Package
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Messages */}
                  {fulfillment.messages.length > 0 && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <h4 className="font-bold text-gray-900 mb-2">Updates</h4>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {fulfillment.messages.slice(-3).map((message) => (
                          <div key={message.messageId} className="text-sm">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-gray-700">
                                {message.fromUserType === 'platform' ? 'System' : 
                                 message.fromUserType === 'seller' ? 'Seller' : 'You'}
                              </span>
                              <span className="text-gray-500 text-xs">
                                {message.timestamp.toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-gray-600">{message.message}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="ml-4">
                  {fulfillment.status === 'pending_address' && (
                    <button
                      onClick={() => {
                        setSelectedFulfillment(fulfillment);
                        setShowAddressForm(true);
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center"
                    >
                      <MapPinIcon className="h-4 w-4 mr-2" />
                      Add Address
                    </button>
                  )}

                  {fulfillment.status === 'address_submitted' && (
                    <div className="text-center">
                      <ClockIcon className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Awaiting seller verification</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {fulfillments.length === 0 && (
            <div className="p-12 text-center">
              <TrophyIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No winnings yet</h3>
              <p className="text-gray-500 mb-6">Start playing games to win amazing prizes!</p>
              <button className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors">
                Browse Competitions
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Address Form Modal */}
      {showAddressForm && selectedFulfillment && (
        <WinnerAddressForm
          fulfillmentId={selectedFulfillment.fulfillmentId}
          productName={selectedFulfillment.productName}
          winnerUsername={winnerUsername}
          onAddressSubmitted={handleAddressSubmitted}
          onCancel={() => {
            setShowAddressForm(false);
            setSelectedFulfillment(null);
          }}
        />
      )}

      {/* Tracking Modal */}
      {showTrackingModal && selectedFulfillment?.shippingLabel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
            <div className="p-8">
              <div className="text-center mb-6">
                <TruckIcon className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Package Tracking</h2>
                <p className="text-gray-600">{selectedFulfillment.productName}</p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Carrier:</strong> {selectedFulfillment.shippingLabel.carrier}
                  </div>
                  <div>
                    <strong>Service:</strong> {selectedFulfillment.shippingLabel.service}
                  </div>
                  <div>
                    <strong>Tracking Number:</strong><br />
                    <span className="font-mono text-blue-800">
                      {selectedFulfillment.shippingLabel.trackingNumber}
                    </span>
                  </div>
                  <div>
                    <strong>Est. Delivery:</strong><br />
                    {selectedFulfillment.shippingLabel.estimatedDelivery.toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-yellow-900 mb-1">Track Your Package</h4>
                    <p className="text-yellow-800 text-sm">
                      Use the tracking number above on the carrier's website for real-time updates.
                      You'll receive email notifications for major shipping milestones.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={() => setShowTrackingModal(false)}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    const carrier = selectedFulfillment.shippingLabel?.carrier;
                    const trackingNumber = selectedFulfillment.shippingLabel?.trackingNumber;
                    const url = carrier === 'UPS' ? 
                      `https://www.ups.com/track?tracknum=${trackingNumber}` :
                      `https://www.fedex.com/apps/fedextrack/?tracknumbers=${trackingNumber}`;
                    window.open(url, '_blank');
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                >
                  Track on {selectedFulfillment.shippingLabel.carrier}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
