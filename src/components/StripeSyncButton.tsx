'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Admin/Debug component to sync Stripe purchases to database
 * Can be added to any page temporarily for testing
 */
export default function StripeSyncButton() {
  const { user } = useAuth();
  const [isChecking, setIsChecking] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [result, setResult] = useState<any>(null);

  const checkSyncStatus = async () => {
    if (!user?.id) return;

    setIsChecking(true);
    setResult(null);

    try {
      const response = await fetch(`/api/stripe/sync-purchases?userId=${user.id}`);
      const data = await response.json();
      
      console.log('🔍 [StripeSync] Status:', data);
      setResult({ type: 'check', data });
    } catch (error: any) {
      console.error('❌ [StripeSync] Check failed:', error);
      setResult({ type: 'error', message: error.message });
    } finally {
      setIsChecking(false);
    }
  };

  const syncPurchases = async () => {
    if (!user?.id) return;

    const confirm = window.confirm(
      'This will sync all your Stripe purchases to the database. Continue?'
    );

    if (!confirm) return;

    setIsSyncing(true);
    setResult(null);

    try {
      const response = await fetch('/api/stripe/sync-purchases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          userEmail: user.email
        })
      });

      const data = await response.json();
      
      console.log('✅ [StripeSync] Sync complete:', data);
      setResult({ type: 'sync', data });

      // Refresh the page to show updated data
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error: any) {
      console.error('❌ [StripeSync] Sync failed:', error);
      setResult({ type: 'error', message: error.message });
    } finally {
      setIsSyncing(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
      <h3 className="text-white font-bold mb-2">🔄 Stripe Purchase Sync</h3>
      <p className="text-gray-400 text-sm mb-4">
        Sync your Stripe payments to the database to ensure all purchases are tracked.
      </p>

      <div className="flex gap-3 mb-4">
        <button
          onClick={checkSyncStatus}
          disabled={isChecking || isSyncing}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-white font-semibold transition-colors"
        >
          {isChecking ? '🔍 Checking...' : '🔍 Check Status'}
        </button>

        <button
          onClick={syncPurchases}
          disabled={isChecking || isSyncing}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-white font-semibold transition-colors"
        >
          {isSyncing ? '🔄 Syncing...' : '🔄 Sync Now'}
        </button>
      </div>

      {result && (
        <div className={`p-3 rounded-lg ${
          result.type === 'error' 
            ? 'bg-red-500/20 border border-red-500/50' 
            : 'bg-green-500/20 border border-green-500/50'
        }`}>
          {result.type === 'check' && result.data && (
            <div className="text-sm">
              <p className="text-white font-semibold mb-2">📊 Sync Status:</p>
              <ul className="space-y-1 text-gray-300">
                <li>✅ Stripe Payments: {result.data.stripePayments}</li>
                <li>💾 Database Purchases: {result.data.databasePurchases}</li>
                <li className={result.data.needsSync ? 'text-yellow-400 font-bold' : 'text-green-400'}>
                  {result.data.needsSync 
                    ? `⚠️ Missing ${result.data.missingInDatabase} purchases - needs sync!`
                    : '✅ All synced - no action needed'}
                </li>
              </ul>
              {result.data.missingPaymentIds?.length > 0 && (
                <div className="mt-3 p-2 bg-black/30 rounded">
                  <p className="text-yellow-400 text-xs font-bold mb-1">Missing Payments:</p>
                  {result.data.missingPaymentIds.map((p: any) => (
                    <p key={p.id} className="text-xs text-gray-400">
                      ${p.amount} on {new Date(p.created).toLocaleDateString()}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {result.type === 'sync' && result.data && (
            <div className="text-sm">
              <p className="text-white font-semibold mb-2">✅ Sync Complete!</p>
              <ul className="space-y-1 text-gray-300">
                <li>📊 Stripe Payments: {result.data.stats.stripePayments}</li>
                <li>💾 Database Purchases: {result.data.stats.databasePurchases}</li>
                <li className="text-green-400 font-bold">
                  ➕ Newly Synced: {result.data.stats.newlySynced}
                </li>
                {result.data.stats.errors > 0 && (
                  <li className="text-red-400">
                    ❌ Errors: {result.data.stats.errors}
                  </li>
                )}
              </ul>
              <p className="text-yellow-400 text-xs mt-3">
                🔄 Page will refresh in 2 seconds...
              </p>
            </div>
          )}

          {result.type === 'error' && (
            <p className="text-red-400 text-sm">
              ❌ Error: {result.message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

