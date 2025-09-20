'use client';

import React, { useState, useEffect } from 'react';
import { 
  TruckIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  PrinterIcon,
  EyeIcon,
  MapPinIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import ShippingService, { WinnerFulfillment, ShippingAddress, ShippingOption } from '@/lib/shippingService';

interface SellerFulfillmentDashboardProps {
  sellerId: string;
  sellerName: string;
}

export default function SellerFulfillmentDashboard({ 
  sellerId, 
  sellerName 
}: SellerFulfillmentDashboardProps) {
  const [fulfillments, setFulfillments] = useState<WinnerFulfillment[]>([]);
  const [selectedFulfillment, setSelectedFulfillment] = useState<WinnerFulfillment | null>(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showShippingModal, setShowShippingModal] = useState(false);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Shipping label form data
  const [shippingForm, setShippingForm] = useState({
    carrier: 'UPS' as 'UPS' | 'FedEx',
    service: 'Ground',
    weight: 1,
    dimensions: { length: 12, width: 8, height: 6 }
  });
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [sellerAddress] = useState<ShippingAddress>({
    firstName: 'Tech',
    lastName: 'Store',
    company: 'TechGear Pro',
    address1: '123 Business Ave',
    address2: 'Suite 100',
    city: 'San Francisco',
    state: 'CA',
    postalCode: '94105',
    country: 'US',
    phone: '(555) 123-4567',
    email: 'shipping@techgearpro.com'
  });

  useEffect(() => {
    loadFulfillments();
  }, [sellerId]);

  const loadFulfillments = () => {
    const sellerFulfillments = ShippingService.getSellerFulfillments(sellerId);
    setFulfillments(sellerFulfillments);
  };

  const handleVerifyWinner = async (fulfillmentId: string, verified: boolean) => {
    setIsProcessing(true);
    
    try {
      const success = ShippingService.sellerVerifyWinner(
        fulfillmentId, 
        sellerId, 
        verified, 
        verificationNotes
      );
      
      if (success) {
        loadFulfillments();
        setShowAddressModal(false);
        setVerificationNotes('');
      }
    } catch (error) {
      console.error('Error verifying winner:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const calculateShippingOptions = () => {
    if (!selectedFulfillment?.shippingAddress) return;

    const options = ShippingService.calculateShippingOptions(
      shippingForm.weight,
      shippingForm.dimensions,
      sellerAddress.postalCode,
      selectedFulfillment.shippingAddress.postalCode
    );
    setShippingOptions(options);
  };

  const handleGenerateLabel = async () => {
    if (!selectedFulfillment) return;

    setIsProcessing(true);
    
    try {
      const label = ShippingService.generateShippingLabel(
        selectedFulfillment.fulfillmentId,
        sellerId,
        shippingForm.carrier,
        shippingForm.service,
        shippingForm.weight,
        shippingForm.dimensions,
        sellerAddress
      );
      
      if (label) {
        loadFulfillments();
        setShowShippingModal(false);
        alert(`Shipping label generated! Tracking: ${label.trackingNumber}`);
      }
    } catch (error) {
      console.error('Error generating label:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMarkShipped = async (fulfillmentId: string) => {
    const success = ShippingService.markAsShipped(fulfillmentId, sellerId);
    if (success) {
      loadFulfillments();
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      'pending_address': { color: 'bg-yellow-100 text-yellow-800', text: 'Waiting for Address' },
      'address_submitted': { color: 'bg-blue-100 text-blue-800', text: 'Address Submitted' },
      'seller_review': { color: 'bg-orange-100 text-orange-800', text: 'Review Required' },
      'address_verified': { color: 'bg-green-100 text-green-800', text: 'Address Verified' },
      'label_generated': { color: 'bg-purple-100 text-purple-800', text: 'Label Generated' },
      'shipped': { color: 'bg-blue-100 text-blue-800', text: 'Shipped' },
      'delivered': { color: 'bg-green-100 text-green-800', text: 'Delivered' },
      'cash_paid': { color: 'bg-green-100 text-green-800', text: 'Cash Prize Paid' },
      'completed': { color: 'bg-gray-100 text-gray-800', text: 'Completed' }
    };
    
    const badge = badges[status as keyof typeof badges] || { color: 'bg-gray-100 text-gray-800', text: status };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">📦 Fulfillment Dashboard</h1>
        <p className="text-gray-600">Manage winner verification and shipping for {sellerName}</p>
      </div>

      {/* Fulfillments List */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Recent Winners</h2>
        </div>
        
        <div className="divide-y divide-gray-200">
          {fulfillments.map((fulfillment) => (
            <div key={fulfillment.fulfillmentId} className="p-6 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <h3 className="text-lg font-bold text-gray-900 mr-3">
                      {fulfillment.productName}
                    </h3>
                    {getStatusBadge(fulfillment.status)}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-4">
                    <div>
                      <strong>Winner:</strong> {fulfillment.winnerUsername}
                    </div>
                    <div>
                      <strong>Score:</strong> {fulfillment.winningScore}
                    </div>
                    <div>
                      <strong>Prize:</strong> {fulfillment.prizeType === 'cash_prize' ? 
                        `$${fulfillment.prizeValue} Cash` : 
                        `$${fulfillment.prizeValue} Item`}
                    </div>
                  </div>

                  {fulfillment.shippingLabel && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <strong className="text-blue-900">Tracking:</strong> 
                          <span className="ml-2 font-mono text-blue-800">
                            {fulfillment.shippingLabel.trackingNumber}
                          </span>
                        </div>
                        <div className="text-blue-700 text-sm">
                          {fulfillment.shippingLabel.carrier} {fulfillment.shippingLabel.service}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex space-x-2 ml-4">
                  {fulfillment.status === 'address_submitted' && (
                    <button
                      onClick={() => {
                        setSelectedFulfillment(fulfillment);
                        setShowAddressModal(true);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
                    >
                      <EyeIcon className="h-4 w-4 mr-1" />
                      Review Address
                    </button>
                  )}

                  {fulfillment.status === 'address_verified' && (
                    <button
                      onClick={() => {
                        setSelectedFulfillment(fulfillment);
                        setShowShippingModal(true);
                        calculateShippingOptions();
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
                    >
                      <TruckIcon className="h-4 w-4 mr-1" />
                      Generate Label
                    </button>
                  )}

                  {fulfillment.status === 'label_generated' && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => window.open(fulfillment.shippingLabel?.labelUrl, '_blank')}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
                      >
                        <PrinterIcon className="h-4 w-4 mr-1" />
                        Print Label
                      </button>
                      <button
                        onClick={() => handleMarkShipped(fulfillment.fulfillmentId)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        Mark Shipped
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {fulfillments.length === 0 && (
            <div className="p-12 text-center">
              <TruckIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No fulfillments yet</h3>
              <p className="text-gray-500">Winners will appear here when your items are won.</p>
            </div>
          )}
        </div>
      </div>

      {/* Address Review Modal */}
      {showAddressModal && selectedFulfillment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <div className="text-center mb-6">
                <MapPinIcon className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify Winner & Address</h2>
                <p className="text-gray-600">
                  Review the winner details and shipping address for {selectedFulfillment.productName}
                </p>
              </div>

              {/* Winner Info */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="font-bold text-gray-900 mb-3">Winner Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>Username:</strong> {selectedFulfillment.winnerUsername}</div>
                  <div><strong>Score:</strong> {selectedFulfillment.winningScore}</div>
                  <div><strong>Prize Value:</strong> ${selectedFulfillment.prizeValue}</div>
                  <div><strong>Won Date:</strong> {selectedFulfillment.createdAt.toLocaleDateString()}</div>
                </div>
              </div>

              {/* Shipping Address */}
              {selectedFulfillment.shippingAddress && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <h3 className="font-bold text-blue-900 mb-3">Shipping Address</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center">
                      <UserIcon className="h-4 w-4 text-blue-600 mr-2" />
                      {selectedFulfillment.shippingAddress.firstName} {selectedFulfillment.shippingAddress.lastName}
                      {selectedFulfillment.shippingAddress.company && (
                        <span className="ml-2 text-gray-600">({selectedFulfillment.shippingAddress.company})</span>
                      )}
                    </div>
                    <div className="flex items-center">
                      <MapPinIcon className="h-4 w-4 text-blue-600 mr-2" />
                      {selectedFulfillment.shippingAddress.address1}
                      {selectedFulfillment.shippingAddress.address2 && (
                        <span>, {selectedFulfillment.shippingAddress.address2}</span>
                      )}
                    </div>
                    <div className="ml-6">
                      {selectedFulfillment.shippingAddress.city}, {selectedFulfillment.shippingAddress.state} {selectedFulfillment.shippingAddress.postalCode}
                    </div>
                    <div className="flex items-center">
                      <PhoneIcon className="h-4 w-4 text-blue-600 mr-2" />
                      {selectedFulfillment.shippingAddress.phone}
                    </div>
                    <div className="flex items-center">
                      <EnvelopeIcon className="h-4 w-4 text-blue-600 mr-2" />
                      {selectedFulfillment.shippingAddress.email}
                    </div>
                  </div>
                </div>
              )}

              {/* Verification Notes */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Verification Notes (Optional)
                </label>
                <textarea
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Add any notes about the verification..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4">
                <button
                  onClick={() => setShowAddressModal(false)}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleVerifyWinner(selectedFulfillment.fulfillmentId, false)}
                  disabled={isProcessing}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
                >
                  <XCircleIcon className="h-5 w-5 mr-2" />
                  Reject
                </button>
                <button
                  onClick={() => handleVerifyWinner(selectedFulfillment.fulfillmentId, true)}
                  disabled={isProcessing}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
                >
                  {isProcessing ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  ) : (
                    <CheckCircleIcon className="h-5 w-5 mr-2" />
                  )}
                  Verify & Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shipping Label Modal */}
      {showShippingModal && selectedFulfillment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <div className="text-center mb-6">
                <TruckIcon className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Generate Shipping Label</h2>
                <p className="text-gray-600">
                  Create shipping label for {selectedFulfillment.productName}
                </p>
              </div>

              {/* Package Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Weight (lbs)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={shippingForm.weight}
                    onChange={(e) => setShippingForm(prev => ({ ...prev, weight: parseFloat(e.target.value) || 1 }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dimensions (inches)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      placeholder="L"
                      value={shippingForm.dimensions.length}
                      onChange={(e) => setShippingForm(prev => ({ 
                        ...prev, 
                        dimensions: { ...prev.dimensions, length: parseInt(e.target.value) || 12 }
                      }))}
                      className="p-2 border border-gray-300 rounded text-center"
                    />
                    <input
                      type="number"
                      placeholder="W"
                      value={shippingForm.dimensions.width}
                      onChange={(e) => setShippingForm(prev => ({ 
                        ...prev, 
                        dimensions: { ...prev.dimensions, width: parseInt(e.target.value) || 8 }
                      }))}
                      className="p-2 border border-gray-300 rounded text-center"
                    />
                    <input
                      type="number"
                      placeholder="H"
                      value={shippingForm.dimensions.height}
                      onChange={(e) => setShippingForm(prev => ({ 
                        ...prev, 
                        dimensions: { ...prev.dimensions, height: parseInt(e.target.value) || 6 }
                      }))}
                      className="p-2 border border-gray-300 rounded text-center"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={calculateShippingOptions}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors mb-6"
              >
                Calculate Shipping Options
              </button>

              {/* Shipping Options */}
              {shippingOptions.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-bold text-gray-900 mb-4">Select Shipping Option</h3>
                  <div className="space-y-3">
                    {shippingOptions.map((option, index) => {
                      const costBreakdown = ShippingService.getShippingCostBreakdown(option.cost);
                      return (
                        <div
                          key={index}
                          className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                            shippingForm.carrier === option.carrier && shippingForm.service === option.service
                              ? 'border-green-500 bg-green-50'
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                          onClick={() => setShippingForm(prev => ({ 
                            ...prev, 
                            carrier: option.carrier, 
                            service: option.service 
                          }))}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-bold text-gray-900">
                                {option.carrier} {option.service}
                              </div>
                              <div className="text-sm text-gray-600">
                                Estimated delivery: {option.estimatedDays}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Includes tracking and insurance
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-green-600">
                                ${costBreakdown.totalCost}
                              </div>
                              <div className="text-xs text-gray-500">
                                Base: ${costBreakdown.shippingCost}
                              </div>
                              <div className="text-xs text-gray-500">
                                Platform fee: ${costBreakdown.platformFee}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Fee Notice */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-yellow-900 mb-1">Shipping Fee Notice</h4>
                    <p className="text-yellow-800 text-sm">
                      A 3% platform fee is added to all shipping costs. This covers label generation, 
                      tracking, and customer support. The total cost will be deducted from your seller account.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4">
                <button
                  onClick={() => setShowShippingModal(false)}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateLabel}
                  disabled={isProcessing || shippingOptions.length === 0}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <DocumentTextIcon className="h-5 w-5 mr-2" />
                      Generate Label
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
