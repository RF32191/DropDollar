'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { 
  TruckIcon,
  MapPinIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface ShipmentTracking {
  session_id: string;
  listing_title: string;
  seller_username: string;
  winner_username: string;
  tracking_number: string;
  tracking_provider: string;
  tracking_url: string;
  shipping_status: string;
  shipped_at: string;
  estimated_delivery: string;
  delivered_at: string | null;
  funds_released: boolean;
  seller_earnings: number;
  winner_address: any;
}

export default function ShippingTrackingPanel() {
  const [shipments, setShipments] = useState<ShipmentTracking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'shipped' | 'in_transit' | 'delivered'>('all');

  useEffect(() => {
    loadShipments();
  }, []);

  const loadShipments = async () => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('marketplace_sessions')
        .select(`
          id,
          tracking_number,
          tracking_provider,
          tracking_url,
          shipping_status,
          shipped_at,
          estimated_delivery,
          delivered_at,
          funds_released,
          winner_prize,
          platform_fee,
          winner_shipping_address,
          marketplace_listings!inner (
            id,
            title,
            seller_id,
            users!marketplace_listings_seller_id_fkey (
              username
            )
          ),
          users!marketplace_sessions_winner_user_id_fkey (
            username
          )
        `)
        .not('tracking_number', 'is', null)
        .order('shipped_at', { ascending: false });

      if (error) throw error;

      // Transform data
      const transformedData: ShipmentTracking[] = (data || []).map((item: any) => ({
        session_id: item.id,
        listing_title: item.marketplace_listings.title,
        seller_username: item.marketplace_listings.users?.username || 'Unknown Seller',
        winner_username: item.users?.username || 'Unknown Winner',
        tracking_number: item.tracking_number,
        tracking_provider: item.tracking_provider,
        tracking_url: item.tracking_url,
        shipping_status: item.shipping_status,
        shipped_at: item.shipped_at,
        estimated_delivery: item.estimated_delivery,
        delivered_at: item.delivered_at,
        funds_released: item.funds_released,
        seller_earnings: item.winner_prize - (item.platform_fee || 0),
        winner_address: item.winner_shipping_address
      }));

      setShipments(transformedData);
    } catch (error) {
      console.error('Error loading shipments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'text-green-500 bg-green-900/20 border-green-700';
      case 'in_transit':
      case 'out_for_delivery':
        return 'text-blue-500 bg-blue-900/20 border-blue-700';
      case 'shipped':
        return 'text-yellow-500 bg-yellow-900/20 border-yellow-700';
      case 'delivery_failed':
      case 'returned':
        return 'text-red-500 bg-red-900/20 border-red-700';
      default:
        return 'text-gray-500 bg-gray-900/20 border-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'in_transit':
      case 'out_for_delivery':
        return <TruckIcon className="w-5 h-5 text-blue-500" />;
      case 'shipped':
        return <ClockIcon className="w-5 h-5 text-yellow-500" />;
      case 'delivery_failed':
      case 'returned':
        return <ExclamationCircleIcon className="w-5 h-5 text-red-500" />;
      default:
        return <MapPinIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatStatus = (status: string) => {
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const filteredShipments = shipments.filter(shipment => {
    if (filter === 'all') return true;
    return shipment.shipping_status === filter;
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <ArrowPathIcon className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center">
            <TruckIcon className="w-8 h-8 mr-3 text-blue-500" />
            Shipping Tracking
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Monitor all shipments and tracking numbers
          </p>
        </div>
        <button
          onClick={loadShipments}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center"
        >
          <ArrowPathIcon className="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2 flex-wrap">
        {[
          { value: 'all', label: 'All Shipments', count: shipments.length },
          { value: 'shipped', label: 'Shipped', count: shipments.filter(s => s.shipping_status === 'shipped').length },
          { value: 'in_transit', label: 'In Transit', count: shipments.filter(s => s.shipping_status === 'in_transit').length },
          { value: 'delivered', label: 'Delivered', count: shipments.filter(s => s.shipping_status === 'delivered').length },
        ].map((btn) => (
          <button
            key={btn.value}
            onClick={() => setFilter(btn.value as any)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === btn.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {btn.label} ({btn.count})
          </button>
        ))}
      </div>

      {/* Shipments List */}
      {filteredShipments.length === 0 ? (
        <div className="bg-gray-800 rounded-xl p-12 border border-gray-700 text-center">
          <TruckIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No shipments found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredShipments.map((shipment) => (
            <div
              key={shipment.session_id}
              className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-white font-bold text-lg">{shipment.listing_title}</h3>
                    <div className={`px-3 py-1 rounded-full border text-xs font-medium flex items-center gap-1 ${getStatusColor(shipment.shipping_status)}`}>
                      {getStatusIcon(shipment.shipping_status)}
                      {formatStatus(shipment.shipping_status)}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Seller</p>
                      <p className="text-white font-medium">{shipment.seller_username}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Winner</p>
                      <p className="text-white font-medium">{shipment.winner_username}</p>
                    </div>
                  </div>
                </div>
                {shipment.funds_released && (
                  <div className="bg-green-900/20 border border-green-700 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <CheckCircleIcon className="w-4 h-4 text-green-500" />
                      <span className="text-green-400 text-xs font-medium">Funds Released</span>
                    </div>
                    <p className="text-white font-bold text-sm mt-1">
                      ${shipment.seller_earnings.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>

              {/* Tracking Info */}
              <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Carrier</p>
                    <p className="text-white font-medium">{shipment.tracking_provider}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Tracking Number</p>
                    <div className="flex items-center gap-2">
                      <p className="text-white font-mono text-sm">{shipment.tracking_number}</p>
                      {shipment.tracking_url && (
                        <a
                          href={shipment.tracking_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 text-xs underline"
                        >
                          Track
                        </a>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Shipped Date</p>
                    <p className="text-white">{new Date(shipment.shipped_at).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Estimated Delivery</p>
                    <p className="text-white">{new Date(shipment.estimated_delivery).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Shipping Address */}
                {shipment.winner_address && (
                  <div className="mt-4 pt-4 border-t border-gray-700/50">
                    <p className="text-gray-500 text-xs mb-2">Shipping Address</p>
                    <div className="text-white text-sm">
                      <p>{shipment.winner_address.name}</p>
                      <p>{shipment.winner_address.address_line1}</p>
                      {shipment.winner_address.address_line2 && <p>{shipment.winner_address.address_line2}</p>}
                      <p>
                        {shipment.winner_address.city}, {shipment.winner_address.state} {shipment.winner_address.postal_code}
                      </p>
                      {shipment.winner_address.phone && <p className="text-gray-400 mt-1">📞 {shipment.winner_address.phone}</p>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

