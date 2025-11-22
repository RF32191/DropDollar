'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase/client';

interface ShippoLabelGeneratorProps {
  sessionId: string;
  listingTitle: string;
  winnerUsername: string;
  winnerAddress: {
    name: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country?: string;
    phone?: string;
  };
  onSuccess?: () => void;
}

export default function ShippoLabelGenerator({
  sessionId,
  listingTitle,
  winnerUsername,
  winnerAddress,
  onSuccess
}: ShippoLabelGeneratorProps) {
  const [step, setStep] = useState<'input' | 'generating' | 'success'>('input');
  const [packageInfo, setPackageInfo] = useState({
    weight: 16, // ounces
    length: 12, // inches
    width: 9,
    height: 4
  });
  const [labelData, setLabelData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const generateLabel = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setStep('generating');

      // Step 1: Get Shippo config from backend
      const { data: config, error: configError } = await supabase.rpc(
        'generate_shipping_label_shippo',
        {
          p_session_id: sessionId,
          p_package_weight: packageInfo.weight,
          p_package_length: packageInfo.length,
          p_package_width: packageInfo.width,
          p_package_height: packageInfo.height
        }
      );

      if (configError) throw configError;

      console.log('📦 Shippo config received:', config);

      // Step 2: Call Shippo API to create shipment and get rates
      const shippoApiKey = config.shippo_api_key;
      
      const shipmentResponse = await fetch('https://api.goshippo.com/shipments/', {
        method: 'POST',
        headers: {
          'Authorization': `ShippoToken ${shippoApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          address_from: config.from_address,
          address_to: config.to_address,
          parcels: [config.parcel],
          async: false
        })
      });

      if (!shipmentResponse.ok) {
        const errorData = await shipmentResponse.json();
        throw new Error(`Shippo API error: ${JSON.stringify(errorData)}`);
      }

      const shipmentData = await shipmentResponse.json();
      console.log('📦 Shipment created:', shipmentData);

      // Step 3: Get the cheapest rate
      const rates = shipmentData.rates || [];
      if (rates.length === 0) {
        throw new Error('No shipping rates available');
      }

      // Sort by price and get cheapest
      const cheapestRate = rates.sort((a: any, b: any) => 
        parseFloat(a.amount) - parseFloat(b.amount)
      )[0];

      console.log('💰 Cheapest rate:', cheapestRate);

      // Step 4: Purchase the label
      const transactionResponse = await fetch('https://api.goshippo.com/transactions/', {
        method: 'POST',
        headers: {
          'Authorization': `ShippoToken ${shippoApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          rate: cheapestRate.object_id,
          label_file_type: 'PDF',
          async: false
        })
      });

      if (!transactionResponse.ok) {
        const errorData = await transactionResponse.json();
        throw new Error(`Label purchase error: ${JSON.stringify(errorData)}`);
      }

      const transactionData = await transactionResponse.json();
      console.log('📄 Label generated:', transactionData);

      if (transactionData.status !== 'SUCCESS') {
        throw new Error(`Label generation failed: ${transactionData.messages}`);
      }

      // Step 5: Validate tracking number destination matches winner address
      console.log('🔍 Validating tracking number destination...');
      
      // Get validation config
      const { data: validationConfig, error: validationConfigError } = await supabase.rpc(
        'validate_tracking_with_shippo',
        {
          p_session_id: sessionId,
          p_tracking_number: transactionData.tracking_number,
          p_carrier: cheapestRate.provider
        }
      );

      if (validationConfigError) {
        console.error('Validation config error:', validationConfigError);
        throw new Error('Failed to get tracking validation config');
      }

      // Call Shippo Tracking API to get destination address
      const trackingResponse = await fetch(
        `https://api.goshippo.com/tracks/${cheapestRate.provider}/${transactionData.tracking_number}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `ShippoToken ${config.shippo_api_key}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const trackingData = await trackingResponse.json();
      console.log('📍 Tracking data received:', trackingData);

      // Extract destination address from tracking
      const destinationZip = trackingData.address_to?.zip || trackingData.address_to?.zip_code || '';
      const destinationCity = trackingData.address_to?.city || '';
      const destinationState = trackingData.address_to?.state || '';
      const trackingStatus = trackingData.tracking_status?.status || 'unknown';

      console.log('📍 Destination:', { city: destinationCity, state: destinationState, zip: destinationZip });
      console.log('📍 Expected:', validationConfig.expected_address);

      // Step 6: Save validation result and conditionally release funds
      const { data: validationResult, error: validationError } = await supabase.rpc(
        'save_tracking_validation_result',
        {
          p_session_id: sessionId,
          p_tracking_number: transactionData.tracking_number,
          p_validation_status: 'valid',
          p_destination_zip: destinationZip,
          p_destination_city: destinationCity,
          p_destination_state: destinationState,
          p_tracking_status: trackingStatus,
          p_validation_details: trackingData
        }
      );

      if (validationError) throw validationError;

      console.log('✅ Validation result:', validationResult);

      // Step 7: Save to database (tracking info already saved by validation)
      const { data: saveResult, error: saveError } = await supabase.rpc(
        'save_shippo_label_and_submit_tracking',
        {
          p_session_id: sessionId,
          p_tracking_number: transactionData.tracking_number,
          p_tracking_provider: cheapestRate.provider,
          p_tracking_url: transactionData.tracking_url_provider,
          p_label_url: transactionData.label_url,
          p_shipping_cost: parseFloat(cheapestRate.amount),
          p_estimated_delivery: transactionData.eta || null
        }
      );

      if (saveError) throw saveError;

      console.log('💰 Earnings breakdown:', saveResult);

      setLabelData({
        label_url: transactionData.label_url,
        tracking_number: transactionData.tracking_number,
        tracking_url: transactionData.tracking_url_provider,
        carrier: cheapestRate.provider,
        cost: cheapestRate.amount,
        eta: transactionData.eta,
        gross_earnings: saveResult?.gross_earnings,
        net_earnings: saveResult?.net_earnings,
        validated: validationResult?.validated,
        address_matches: validationResult?.address_matches,
        funds_released: validationResult?.funds_released
      });

      setStep('success');
      
      // Open label in new tab
      window.open(transactionData.label_url, '_blank');

      // Show warning if address doesn't match
      if (!validationResult?.address_matches) {
        alert('⚠️ WARNING: Package destination does not match winner address!\n\nFunds will NOT be released until this is resolved.\n\nExpected: ' + 
              validationResult?.expected_address + 
              '\nActual: ' + 
              validationResult?.actual_address);
      }

      if (onSuccess) {
        setTimeout(onSuccess, 3000);
      }

    } catch (err: any) {
      console.error('❌ Error generating label:', err);
      setError(err.message || 'Failed to generate shipping label');
      setStep('input');
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'success' && labelData) {
    return (
      <div className="space-y-4">
        <div className="bg-green-900/30 border-2 border-green-500 rounded-xl p-6">
          <div className="text-center">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-2xl font-bold text-white mb-2">
              Shipping Label Generated!
            </h3>
            <p className="text-gray-300 mb-4">
              {labelData.funds_released 
                ? 'Your label has been created and funds have been released to your wallet.'
                : 'Your label has been created. Funds will be held pending until address verification.'}
            </p>
          </div>

          {/* Validation Status */}
          {labelData.validated !== undefined && (
            <div className={`border-2 rounded-lg p-4 mb-4 ${
              labelData.address_matches 
                ? 'bg-green-900/30 border-green-500' 
                : 'bg-red-900/30 border-red-500'
            }`}>
              <div className="flex items-center">
                <div className="text-3xl mr-3">
                  {labelData.address_matches ? '✅' : '⚠️'}
                </div>
                <div>
                  <div className={`font-semibold ${
                    labelData.address_matches ? 'text-green-300' : 'text-red-300'
                  }`}>
                    {labelData.address_matches 
                      ? 'Address Verified ✓' 
                      : 'Address Mismatch Warning'}
                  </div>
                  <div className={`text-sm ${
                    labelData.address_matches ? 'text-green-100' : 'text-red-100'
                  }`}>
                    {labelData.address_matches 
                      ? 'Package destination matches winner\'s address. Funds have been released to your wallet!' 
                      : 'Package destination does NOT match winner\'s address. Funds are being held pending. Please contact support.'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Earnings Breakdown */}
          {labelData.gross_earnings && labelData.net_earnings && (
            <div className="bg-blue-900/30 border border-blue-500 rounded-lg p-4 mb-4">
              <div className="text-sm font-semibold text-blue-300 mb-2">💰 Your Earnings</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-300">
                  <span>Gross Earnings (85%):</span>
                  <span className="font-mono">${Number(labelData.gross_earnings).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-yellow-300">
                  <span>Shipping Cost:</span>
                  <span className="font-mono">-${labelData.cost}</span>
                </div>
                <div className="border-t border-blue-700 pt-2"></div>
                <div className="flex justify-between text-green-300 font-semibold text-base">
                  <span>Net Earnings:</span>
                  <span className="font-mono">${Number(labelData.net_earnings).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3 mt-6">
            <div className="bg-black/30 rounded-lg p-4">
              <div className="text-sm text-gray-400">Tracking Number</div>
              <div className="text-lg font-mono text-white">
                {labelData.tracking_number}
              </div>
            </div>

            <div className="bg-black/30 rounded-lg p-4">
              <div className="text-sm text-gray-400">Carrier</div>
              <div className="text-lg text-white uppercase">
                {labelData.carrier}
              </div>
            </div>

            <div className="bg-black/30 rounded-lg p-4">
              <div className="text-sm text-gray-400">Shipping Label Cost</div>
              <div className="text-lg text-white">
                ${labelData.cost}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                (Deducted from your earnings)
              </div>
            </div>

            {labelData.eta && (
              <div className="bg-black/30 rounded-lg p-4">
                <div className="text-sm text-gray-400">Estimated Delivery</div>
                <div className="text-lg text-white">
                  {new Date(labelData.eta).toLocaleDateString()}
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 space-y-3">
            <a
              href={labelData.label_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg text-center transition-all"
            >
              📄 Download/Print Label
            </a>

            <a
              href={labelData.tracking_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg text-center transition-all"
            >
              📦 Track Package
            </a>
          </div>

          <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-600 rounded-lg">
            <p className="text-sm text-yellow-200">
              ⚠️ <strong>Important:</strong> Please affix the label to your package and drop it off
              at your carrier's location within 24 hours.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-2xl font-bold text-white mb-2">
          📦 Generate Shipping Label
        </h3>
        <p className="text-gray-300">
          Powered by Shippo - Instant label generation
        </p>
      </div>

      {/* Winner Info */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="text-sm text-gray-400 mb-2">Shipping To:</div>
        <div className="text-white">
          <div className="font-semibold">{winnerAddress.name}</div>
          <div>{winnerAddress.address_line1}</div>
          {winnerAddress.address_line2 && <div>{winnerAddress.address_line2}</div>}
          <div>
            {winnerAddress.city}, {winnerAddress.state} {winnerAddress.postal_code}
          </div>
          {winnerAddress.phone && <div>Phone: {winnerAddress.phone}</div>}
        </div>
      </div>

      {/* Package Dimensions */}
      <div className="space-y-4">
        <div className="text-lg font-semibold text-white">Package Information</div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Weight (oz)
            </label>
            <input
              type="number"
              value={packageInfo.weight}
              onChange={(e) => setPackageInfo({ ...packageInfo, weight: parseFloat(e.target.value) })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
              min="1"
              max="1120" // 70 lbs
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Length (in)
            </label>
            <input
              type="number"
              value={packageInfo.length}
              onChange={(e) => setPackageInfo({ ...packageInfo, length: parseFloat(e.target.value) })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
              min="1"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Width (in)
            </label>
            <input
              type="number"
              value={packageInfo.width}
              onChange={(e) => setPackageInfo({ ...packageInfo, width: parseFloat(e.target.value) })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
              min="1"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Height (in)
            </label>
            <input
              type="number"
              value={packageInfo.height}
              onChange={(e) => setPackageInfo({ ...packageInfo, height: parseFloat(e.target.value) })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
              min="1"
            />
          </div>
        </div>

        <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-4">
          <p className="text-sm text-blue-200">
            💡 <strong>Tip:</strong> Shippo will automatically select the cheapest shipping option.
            Your label will be generated instantly and you can print it right away.
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-900/30 border-2 border-red-500 rounded-lg p-4">
          <p className="text-red-200">❌ {error}</p>
        </div>
      )}

      {/* Cost Warning */}
      <div className="bg-orange-900/30 border border-orange-500 rounded-lg p-4">
        <div className="flex items-start">
          <div className="text-2xl mr-3">💰</div>
          <div>
            <div className="font-semibold text-orange-200 mb-1">About Shipping Costs</div>
            <p className="text-sm text-orange-100">
              Shipping labels cost money (typically $8-$20 depending on weight and destination).
              <strong className="text-white"> The actual shipping cost will be deducted from your earnings.</strong>
            </p>
            <p className="text-sm text-orange-100 mt-2">
              Estimated cost for this package: <span className="font-bold text-white">$10-$15</span>
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <button
          onClick={generateLabel}
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg"
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Generating Label...
            </span>
          ) : (
            '📦 Generate Shipping Label (Instant)'
          )}
        </button>

        <div className="text-center text-gray-400 text-sm">
          or
        </div>

        <button
          onClick={() => {/* Will be handled by parent component */}}
          className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-all"
        >
          📝 Enter Tracking Manually
        </button>
      </div>

      {/* Info Box */}
      <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-4">
        <p className="text-sm text-yellow-200">
          <strong>What happens next:</strong>
          <br />
          1. Label will be generated instantly (5 seconds)
          <br />
          2. Shipping cost will be deducted from your earnings
          <br />
          3. Net funds will be released to your wallet
          <br />
          4. Winner will be notified with tracking
          <br />
          5. Print the label and ship within 24 hours
        </p>
      </div>
    </div>
  );
}

